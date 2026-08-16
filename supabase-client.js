/* PartFit Ghana — minimal Supabase REST/Auth client.
   The page CSP (script-src 'self') forbids loading @supabase/supabase-js from a
   CDN, so this talks to Supabase's REST endpoints directly with fetch:
     Auth  → {url}/auth/v1/*        (signup, token, logout)
     Data  → {url}/rest/v1/*        (tables, RPC)
   Only the public anon key is used; every table is guarded by row-level
   security, and the signed-in user's JWT authorises their own rows. */
(function () {
  const CFG = window.PARTFIT_CONFIG || {};
  const BASE = String(CFG.supabaseUrl || '').replace(/\/+$/, '');
  const KEY = CFG.supabaseAnonKey || '';
  const SKEY = 'pfSbSessionV1';
  const PFSB = (window.PFSB = {});

  PFSB.configured = () => !!(BASE && KEY);

  const readSession = () => { try { return JSON.parse(localStorage.getItem(SKEY) || 'null'); } catch { return null; } };
  const writeSession = s => { s ? localStorage.setItem(SKEY, JSON.stringify(s)) : localStorage.removeItem(SKEY); };
  PFSB.session = readSession;
  PFSB.user = () => (readSession() || {}).user || null;
  PFSB.signedIn = () => !!(readSession() || {}).access_token;
  PFSB.profile = () => {
    const u = PFSB.user(); if (!u) return null;
    const m = u.user_metadata || {};
    return { name: m.full_name || m.name || 'PartFit Customer', email: u.email || '', phone: m.phone || '' };
  };

  function persist(data) {
    if (!data || !data.access_token) return null;
    const s = {
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      expires_at: Date.now() + ((data.expires_in || 3600) * 1000) - 30000,
      user: data.user || null
    };
    writeSession(s);
    return s;
  }

  async function parse(res) {
    const text = await res.text();
    let json = null; try { json = text ? JSON.parse(text) : null; } catch { /* non-JSON */ }
    if (!res.ok) {
      const msg = (json && (json.error_description || json.msg || json.message || json.hint || json.error)) ||
        ('Request failed (' + res.status + ')');
      const e = new Error(msg); e.status = res.status; e.body = json; throw e;
    }
    return json;
  }

  const authReq = (path, body, bearer) => fetch(BASE + path, {
    method: 'POST',
    headers: Object.assign({ apikey: KEY, 'Content-Type': 'application/json' }, bearer ? { Authorization: 'Bearer ' + bearer } : {}),
    body: body ? JSON.stringify(body) : undefined
  }).then(parse);

  async function refresh() {
    const s = readSession();
    if (!s || !s.refresh_token) throw new Error('Session expired — please sign in again.');
    return persist(await authReq('/auth/v1/token?grant_type=refresh_token', { refresh_token: s.refresh_token }));
  }

  async function token() {
    let s = readSession();
    if (!s) throw new Error('Please sign in.');
    if (s.expires_at && Date.now() > s.expires_at) s = await refresh();
    return s.access_token;
  }

  async function rest(path, { method = 'GET', body, prefer } = {}) {
    const call = tok => fetch(BASE + '/rest/v1' + path, {
      method,
      headers: Object.assign({ apikey: KEY, Authorization: 'Bearer ' + tok, 'Content-Type': 'application/json' }, prefer ? { Prefer: prefer } : {}),
      body: body ? JSON.stringify(body) : undefined
    });
    let res = await call(await token());
    if (res.status === 401) { res = await call((await refresh()).access_token); } // retry once after refresh
    return parse(res);
  }

  /* ---------- Auth ---------- */
  PFSB.signUp = async ({ email, password, full_name, phone }) => {
    const data = await authReq('/auth/v1/signup', { email, password, data: { full_name, phone } });
    if (data && data.access_token) { persist(data); return { session: true, user: data.user }; }
    return { session: false, user: (data && data.user) || null }; // email confirmation required
  };
  PFSB.signIn = async ({ email, password }) => {
    persist(await authReq('/auth/v1/token?grant_type=password', { email, password }));
    return { user: PFSB.user() };
  };
  PFSB.signOut = async () => {
    const s = readSession();
    writeSession(null); // clear locally first so signedIn() is false immediately (no async race)
    try { if (s && s.access_token) await authReq('/auth/v1/logout', {}, s.access_token); } catch { /* ignore */ }
  };

  /* ---------- Orders ---------- */
  const ORDER_COLS = 'id,public_ref,status,provisional_total,confirmed_total,created_at,vehicle_label,reservation_expires_at,' +
    'payment_status,amount_due,paid_at,fulfilment_type,' +
    'order_items(product_name,part_number,quantity,provisional_unit_price,confirmed_unit_price),' +
    'order_events(event_type,from_status,to_status,note,created_at)';

  PFSB.submitOrder = (vehicleLabel, items) =>
    rest('/rpc/submit_order', { method: 'POST', body: { p_vehicle_label: vehicleLabel || '', p_items: items } });
  PFSB.listOrders = () =>
    rest('/orders?select=' + ORDER_COLS + '&order=created_at.desc');
  PFSB.getOrder = ref =>
    rest('/orders?public_ref=eq.' + encodeURIComponent(String(ref || '').toUpperCase().trim()) + '&select=' + ORDER_COLS + '&limit=1')
      .then(a => (a && a[0]) || null);

  /* ---------- Payments (Paystack Mobile Money) ---------- */
  // Off by default; set PARTFIT_CONFIG.paymentsEnabled=true once the Paystack
  // edge functions are deployed (see SETUP-PAYMENTS.md).
  PFSB.paymentsEnabled = () => !!CFG.paymentsEnabled;
  // Ask the edge function to open a MoMo charge; returns { authorization_url, reference }.
  PFSB.startPayment = async (publicRef, email) => {
    const tok = await token();
    const res = await fetch(BASE + '/functions/v1/paystack-initialize', {
      method: 'POST',
      headers: { apikey: KEY, Authorization: 'Bearer ' + tok, 'Content-Type': 'application/json' },
      body: JSON.stringify({ public_ref: publicRef, email: email || (PFSB.profile() || {}).email || '' })
    });
    return parse(res);
  };

  /* ---------- Staff ---------- */
  PFSB.isStaff = () =>
    rest('/staff_roles?select=role&user_id=eq.' + encodeURIComponent((PFSB.user() || {}).id))
      .then(a => (a && a[0]) ? a[0].role : null).catch(() => null);
  PFSB.staffListOrders = status =>
    rest('/orders?select=' + ORDER_COLS + (status && status !== 'all' ? '&status=eq.' + status : '') + '&order=created_at.desc');
  PFSB.setOrderStatus = (ref, status, opts = {}) =>
    rest('/rpc/staff_set_order_status', { method: 'POST', body: {
      p_public_ref: ref, p_status: status,
      p_confirmed_total: opts.confirmedTotal ?? null, p_note: opts.note ?? null,
      p_reservation_hours: opts.reservationHours ?? 48
    } });

  /* ---------- Vehicles (My Garage) ---------- */
  PFSB.listVehicles = () => rest('/vehicles?select=id,make,model,model_year,engine&order=created_at.desc');
  PFSB.addVehicle = v => rest('/vehicles', {
    method: 'POST', prefer: 'return=representation',
    body: { owner_id: (PFSB.user() || {}).id, make: v.make, model: v.model, model_year: v.year ? parseInt(v.year, 10) : null, engine: v.engine || null }
  });
  PFSB.removeVehicle = id => rest('/vehicles?id=eq.' + encodeURIComponent(id), { method: 'DELETE' });

  /* customer-facing status → 0..4 step index for the tracker */
  PFSB.STATUS_STEP = { submitted: 0, reviewing: 1, approved: 2, ready_for_collection: 3, collected: 4 };
  PFSB.CLOSED = ['collected', 'rejected', 'cancelled', 'expired'];

  /* normalise a Supabase order into the shape the UI already renders locally */
  PFSB.normOrder = o => ({
    id: o.public_ref,
    createdAt: o.created_at,
    status: o.status,
    stage: PFSB.STATUS_STEP[o.status] ?? 0,
    provisionalTotal: Number(o.provisional_total || 0),
    confirmedTotal: o.confirmed_total == null ? null : Number(o.confirmed_total),
    total: Number(o.confirmed_total ?? o.provisional_total ?? 0),
    reservationExpiresAt: o.reservation_expires_at,
    paymentStatus: o.payment_status || 'unpaid',
    amountDue: o.amount_due == null ? null : Number(o.amount_due),
    paidAt: o.paid_at || null,
    fulfilmentType: o.fulfilment_type || 'pickup',
    items: (o.order_items || []).map(i => ({
      name: i.product_name, short: i.part_number, qty: i.quantity,
      price: Number(i.confirmed_unit_price ?? i.provisional_unit_price ?? 0)
    }))
  });
})();
