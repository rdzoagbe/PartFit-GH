/* PartFit Ghana — staff approval console
   Lets a staff account move orders through the pay-on-pickup workflow via the
   staff_set_order_status RPC. Visibility and every write are enforced server-side
   by is_partfit_staff() + row-level security; this UI only reveals the controls. */
(() => {
  const P = window.PFV3;
  const SB = () => window.PFSB && window.PFSB.configured() && window.PFSB.signedIn();
  const TABS = [['submitted', 'New'], ['reviewing', 'Reviewing'], ['approved', 'Approved'], ['ready_for_collection', 'Ready'], ['all', 'All'], ['requests', 'Requests']];
  const REQ_LABEL = { new: 'New', in_progress: 'In progress', answered: 'Answered', closed: 'Closed' };
  const LABEL = { submitted: 'Submitted', reviewing: 'Reviewing', approved: 'Approved', ready_for_collection: 'Ready for collection', collected: 'Collected', rejected: 'Rejected', cancelled: 'Cancelled', expired: 'Expired' };
  const TONE = { submitted: 'new', reviewing: 'rev', approved: 'app', ready_for_collection: 'rdy', collected: 'done', rejected: 'bad', cancelled: 'bad', expired: 'bad' };
  let curTab = 'submitted';

  /* ---- new-order awareness ------------------------------------------------
     Before this, load() ran only on page render or a tab tap, so an order
     placed at 7pm sat unseen until the owner happened to sign in, open Account
     and tap Staff console — while the customer's tracker said "awaiting
     review" and the reservation clock had not started. Three things now:
       1. the console refreshes itself while it is the current page,
       2. an order that arrives while you are looking announces itself,
       3. orders that arrived while the console was closed are counted, so the
          Account dashboard can badge them.
     This is the no-setup layer; email and phone push are sent server-side. */
  const SEEN_KEY = 'pfStaffSeenV1';          // newest created_at the owner has looked at
  const SOUND_KEY = 'pfStaffSoundV1';
  const POLL_MS = 25000;
  let pollTimer = null, knownRefs = null, freshRefs = new Set();

  const seenAt = () => { try { return localStorage.getItem(SEEN_KEY) || ''; } catch { return ''; } };
  const soundOn = () => { try { return localStorage.getItem(SOUND_KEY) !== 'off'; } catch { return true; } };
  function markSeen(rows) {
    const newest = (rows || []).reduce((m, o) => (o.created_at > m ? o.created_at : m), '');
    try { if (newest && newest > seenAt()) localStorage.setItem(SEEN_KEY, newest); } catch { /* private mode */ }
  }
  // Orders that landed since the owner last had the queue open. Exported so the
  // Account dashboard can badge the Staff console button without duplicating it.
  P.staffUnseenCount = rows => { const s = seenAt(); return (rows || []).filter(o => o.created_at > s).length; };

  function ping() {
    if (!soundOn()) return;
    try { navigator.vibrate && navigator.vibrate(180); } catch { /* unsupported */ }
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext; if (!Ctx) return;
      const ctx = new Ctx(), osc = ctx.createOscillator(), gain = ctx.createGain();
      osc.type = 'sine'; osc.frequency.value = 880; gain.gain.value = 0.05;
      osc.connect(gain); gain.connect(ctx.destination); osc.start();
      setTimeout(() => { try { osc.stop(); ctx.close(); } catch { /* already closed */ } }, 170);
    } catch { /* autoplay policy — the toast and badge still fire */ }
  }

  // Announce anything that was not in the previous snapshot of this tab.
  function noticeArrivals(rows) {
    const refs = new Set((rows || []).map(o => o.public_ref));
    if (knownRefs === null) { knownRefs = refs; freshRefs = new Set(); return; }
    freshRefs = new Set([...refs].filter(r => !knownRefs.has(r)));
    knownRefs = refs;
    if (freshRefs.size) {
      say(freshRefs.size === 1 ? 'New order received' : freshRefs.size + ' new orders received');
      ping();
    }
  }

  function startPolling() {
    stopPolling();
    pollTimer = setInterval(() => {
      // Guard on the DOM, not on router state: if the console is no longer on
      // screen we have navigated away, whatever any bookkeeping says.
      if (!document.querySelector('.pfStaffLive')) { stopPolling(); return; }
      if (document.hidden) return;                        // backgrounded tab
      quietRefresh();
    }, POLL_MS);
  }
  function stopPolling() { if (pollTimer) { clearInterval(pollTimer); pollTimer = null; } }

  const gh = n => 'GH₵ ' + Number(n || 0).toLocaleString('en-GH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const payEnabled = () => !!(window.PFSB && window.PFSB.paymentsEnabled && window.PFSB.paymentsEnabled());

  function payBadge(o) {
    if (o.payment_status === 'paid') return `<span class="pfPay paid">✓ Paid ${gh(o.amount_due ?? o.confirmed_total)}</span>`;
    if (o.payment_status === 'pending') return `<span class="pfPay pend">● Payment pending</span>`;
    if (payEnabled() && o.status === 'approved') return `<span class="pfPay due">● Awaiting payment</span>`;
    return '';
  }

  function actionsFor(o) {
    const ref = P.esc(o.public_ref), s = o.status;
    const set = (st, label, cls) => `<button class="${cls}" data-staff-set="${ref}" data-status="${st}">${label}</button>`;
    if (s === 'submitted') return set('reviewing', 'Start review', 'btn dark') + set('rejected', 'Reject', 'btn danger');
    if (s === 'reviewing') return `<button class="btn red" data-staff-approve="${ref}" data-prov="${Number(o.provisional_total || 0)}">Approve…</button>` + set('rejected', 'Reject', 'btn danger');
    const due = Number(o.amount_due ?? o.confirmed_total ?? 0);
    const takePayment = `<button class="btn wa" data-take-payment="${ref}" data-due="${due}">Record payment</button>`;
    const refund = `<button class="btn ghostLine" data-refund="${ref}" data-due="${due}">Record refund</button>`;
    if (s === 'approved') {
      const readyLabel = o.fulfilment_type === 'delivery' ? 'Mark for delivery' : 'Mark ready';
      if (o.payment_status === 'paid')
        return set('ready_for_collection', readyLabel, 'btn dark') + refund + set('cancelled', 'Cancel', 'btn danger');
      // Only release goods after the money lands — but staff can record cash or
      // a direct MoMo transfer taken at the counter, and a charge whose webhook
      // never arrived, so a missed payment is never a dead end.
      if (payEnabled())
        return `<span class="pfStaffTerminal">Awaiting payment</span>` + takePayment + set('cancelled', 'Cancel', 'btn danger');
      return set('ready_for_collection', readyLabel, 'btn dark') + takePayment + set('cancelled', 'Cancel', 'btn danger');
    }
    if (s === 'ready_for_collection') return set('collected', o.fulfilment_type === 'delivery' ? 'Mark delivered' : 'Mark collected', 'btn wa') +
      (o.payment_status === 'paid' ? refund : takePayment) + set('cancelled', 'Cancel', 'btn danger');
    return '<span class="pfStaffTerminal">No further action</span>';
  }

  function card(o) {
    const ref = P.esc(o.public_ref);
    const items = (o.order_items || []).map(i => `<div class="pfSItem"><span>${P.esc(i.product_name)} <b class="mono">×${i.quantity}</b></span><span class="mono">${gh(i.provisional_unit_price)}</span></div>`).join('');
    const fee = Number(o.delivery_fee || 0);
    const amount = o.confirmed_total != null
      ? `<div class="pfSAmt"><small>Approved${fee > 0 ? ' · incl. delivery ' + gh(fee) : ''}</small><b class="mono">${gh(o.confirmed_total)}</b></div>`
      : `<div class="pfSAmt"><small>Provisional${fee > 0 ? ' + delivery ' + gh(fee) : ''}</small><b class="mono">${gh(Number(o.provisional_total || 0) + fee)}</b></div>`;
    // Staff need someone to call and somewhere to take it. These come from the
    // order row itself (snapshot at submit), not from the profiles table.
    const phone = o.contact_phone || '';
    const contact = `<div class="pfSContact">
      <span class="pfSWho"><b>${P.esc(o.contact_name || 'No name on this order')}</b>${phone
        ? ` · <a class="mono" href="tel:${P.esc(phone.replace(/[^+0-9]/g, ''))}">${P.esc(phone)}</a>` : ''}</span>
      ${o.fulfilment_type === 'delivery'
        ? `<span class="pfSDeliver"><b>Deliver</b> → ${P.esc(o.delivery_address || 'no address given')}${fee > 0 ? ' · fee ' + gh(fee) : ''}</span>`
        : '<span class="pfSPickup"><b>Pickup</b> → Spintex</span>'}
      ${o.customer_note ? `<span class="pfSNote">Note: ${P.esc(o.customer_note)}</span>` : ''}
    </div>`;
    return `<article class="card pfStaffCard${freshRefs.has(o.public_ref) ? ' isFresh' : ''}">
      <div class="pfSHead">
        <div><span class="orderRef mono">${ref}</span>${freshRefs.has(o.public_ref) ? '<span class="pfSNew">NEW</span>' : ''}<span class="pfSStatus ${TONE[o.status] || 'new'}">${LABEL[o.status] || o.status}</span>${payBadge(o)}</div>
        <div class="pfSDate mono">${P.fmt(o.created_at)}</div>
      </div>
      <div class="pfSVeh">${P.esc(o.vehicle_label || 'No vehicle given')}</div>
      ${contact}
      <div class="pfSItems">${items || '<span class="pfSMuted">No line items</span>'}</div>
      <div class="pfSFoot">${amount}<div class="pfStaffActions">${actionsFor(o)}</div></div>
      <form class="pfApprove" data-approve-form="${ref}" hidden>
        <div class="pfApproveRow">
          <label>Parts total (GH₵)<input type="number" step="0.01" min="0" class="pfApprovePrice" value="${Number(o.provisional_total || 0)}" inputmode="decimal"></label>
          <label>Note <small>(optional)</small><input type="text" class="pfApproveNote" placeholder="Fitment confirmed, etc."></label>
        </div>
        <p class="pfApproveHint">${fee > 0
          ? `Delivery <b class="mono">${gh(fee)}</b> is added by the server — the customer pays parts + delivery.`
          : 'Pickup order — no delivery fee is added.'}</p>
        <div class="pfApproveBtns"><button type="button" class="btn red" data-approve-confirm="${ref}">Confirm approval</button><button type="button" class="btn ghostLine" data-approve-cancel>Cancel</button></div>
      </form>
    </article>`;
  }

  // Part requests and contact messages — the enquiries that used to vanish into
  // an unsent WhatsApp message.
  function requestCard(r) {
    const d = r.details || {};
    const extra = [
      d.quantity ? 'Qty ' + P.esc(String(d.quantity)) : '',
      d.vin ? 'VIN ' + P.esc(d.vin) : '',
      r.part_number ? 'OE ' + P.esc(r.part_number) : ''
    ].filter(Boolean).join(' · ');
    const body = P.esc(d.note || d.message || '');
    const phone = r.phone || '';
    return `<article class="card pfStaffCard">
      <div class="pfSHead">
        <div><span class="pfSStatus ${r.status === 'new' ? 'new' : r.status === 'closed' ? 'done' : 'rev'}">${P.esc(REQ_LABEL[r.status] || r.status)}</span>
          <span class="pfReqKind">${r.kind === 'contact' ? 'Message' : 'Part request'}</span></div>
        <div class="pfSDate mono">${P.fmt(r.created_at)}</div>
      </div>
      <div class="pfSVeh">${P.esc(r.subject || '(no subject)')}</div>
      <div class="pfSContact">
        <span class="pfSWho"><b>${P.esc(r.name)}</b>${phone ? ` · <a class="mono" href="tel:${P.esc(phone.replace(/[^+0-9]/g, ''))}">${P.esc(phone)}</a>` : ''}</span>
        ${r.vehicle_label ? `<span>${P.esc(r.vehicle_label)}</span>` : ''}
        ${extra ? `<span class="pfSNote">${extra}</span>` : ''}
        ${body ? `<span class="pfSNote">${body}</span>` : ''}
      </div>
      <div class="pfSFoot"><div></div><div class="pfStaffActions">
        ${r.status !== 'answered' && r.status !== 'closed'
          ? `<button class="btn dark" data-req-set="${P.esc(r.id)}" data-status="answered">Mark answered</button>` : ''}
        ${r.status !== 'closed' ? `<button class="btn ghostLine" data-req-set="${P.esc(r.id)}" data-status="closed">Close</button>` : ''}
      </div></div>
    </article>`;
  }

  function shell(bodyHTML) {
    app.innerHTML = appHeader('Staff console', 'Approvals · fitment · stock') + `<main class="page pfStaff">
      <section class="v3OrdersHero"><div><span class="sectionKicker">STAFF</span><h1>Order approvals</h1><p>Review fitment and stock, approve with the final price, then move each order to collection. Every change is logged server-side.</p></div></section>
      <div class="pfStaffLive">
        <span class="pfLiveDot" aria-hidden="true"></span>
        <span>Checking for new orders every ${Math.round(POLL_MS / 1000)}s</span>
        <button class="pfSoundBtn" data-staff-sound aria-pressed="${soundOn()}">${soundOn() ? '🔔 Sound on' : '🔕 Sound off'}</button>
      </div>
      <div class="pfStaffTabs">${TABS.map(t => `<button class="chip ${curTab === t[0] ? 'on' : ''}" data-staff-tab="${t[0]}">${t[1]}</button>`).join('')}</div>
      <div id="pfStaffBody">${bodyHTML}</div>
      ${P.footer()}</main>${nav('account')}`;
  }
  const info = (icon, title, msg, extra = '') => `<div class="card noOrders"><span>${icon}</span><h2>${title}</h2><p>${msg}</p>${extra}</div>`;

  function renderList(state) {
    if (state === 'loading') {
      const sk = `<article class="card pfStaffCard skWrap"><span class="sk skLine" style="width:34%;height:12px"></span><span class="sk skLine" style="width:54%;height:15px;margin-top:11px"></span><span class="sk skLine" style="width:100%;height:46px;border-radius:12px;margin-top:12px"></span><span class="sk skLine" style="width:44%;height:15px;margin-top:12px"></span></article>`;
      return shell(sk + sk);
    }
    if (state && state.error) return shell(info('⚠️', 'Couldn’t load the queue', P.esc(state.error), '<button class="btn outlineNavy" data-staff-tab="' + curTab + '">Try again</button>'));
    const list = state || [];
    markSeen(list);
    shell(list.length ? list.map(card).join('') : info('✓', 'Nothing here', 'No orders in this queue right now.'));
  }

  function renderRequests(state) {
    if (state === 'loading') return shell(`<article class="card pfStaffCard skWrap"><span class="sk skLine" style="width:34%;height:12px"></span><span class="sk skLine" style="width:54%;height:15px;margin-top:11px"></span></article>`);
    if (state && state.error) return shell(info('⚠️', 'Couldn’t load requests', P.esc(state.error), '<button class="btn outlineNavy" data-staff-tab="requests">Try again</button>'));
    const list = state || [];
    shell(list.length ? list.map(requestCard).join('')
      : info('✓', 'No open requests', 'Part requests and contact messages land here.'));
  }

  // Poll result: re-render in place, with no loading skeleton, so the queue
  // updating under the owner is not mistaken for the page reloading.
  function quietRefresh() {
    const fetcher = curTab === 'requests'
      ? window.PFSB.staffListRequests('all').then(a => ({ kind: 'req', rows: a }))
      : window.PFSB.staffListOrders(curTab).then(a => ({ kind: 'ord', rows: a }));
    return fetcher.then(r => {
      if (!document.querySelector('.pfStaffLive')) return;   // navigated away mid-flight
      if (r.kind === 'req') { renderRequests(r.rows); return; }
      noticeArrivals(r.rows);
      renderList(r.rows);
    }).catch(() => { /* a failed poll is not worth interrupting anyone over */ });
  }

  function load() {
    if (curTab === 'requests') {
      renderRequests('loading');
      window.PFSB.staffListRequests('all').then(a => renderRequests(a)).catch(e => renderRequests({ error: e.message || 'Network error' }));
      return;
    }
    renderList('loading');
    window.PFSB.staffListOrders(curTab).then(a => { noticeArrivals(a); renderList(a); })
      .catch(e => renderList({ error: e.message || 'Network error' }));
  }

  function page() {
    stopPolling(); knownRefs = null; freshRefs = new Set();
    if (!SB()) { shell(info('🔒', 'Sign in required', 'Sign in with your staff account to open the approvals console.', '<button class="btn red" data-page="login">Sign in</button>')); return; }
    shell(info('⏳', 'Checking access…', 'One moment.'));
    window.PFSB.isStaff().then(role => {
      if (!role) { shell(info('🔒', 'Staff only', 'This area is for PartFit staff. Ask an admin to grant your account a staff role.')); return; }
      load();
      startPolling();
    }).catch(() => shell(info('⚠️', 'Access check failed', 'Please try again.', '<button class="btn outlineNavy" data-page="staff">Retry</button>')));
  }
  P.register('staff', page);

  document.addEventListener('click', e => {
    const tab = e.target.closest('[data-staff-tab]');
    if (tab) { curTab = tab.dataset.staffTab; load(); return; }

    const ap = e.target.closest('[data-staff-approve]');
    if (ap) { const f = document.querySelector('.pfApprove[data-approve-form="' + CSS.escape(ap.dataset.staffApprove) + '"]'); if (f) { f.hidden = !f.hidden; if (!f.hidden) f.querySelector('.pfApprovePrice')?.focus(); } return; }
    const apc = e.target.closest('[data-approve-cancel]');
    if (apc) { apc.closest('.pfApprove').hidden = true; return; }

    const conf = e.target.closest('[data-approve-confirm]');
    if (conf) {
      const ref = conf.dataset.approveConfirm, form = conf.closest('.pfApprove');
      const price = parseFloat(form.querySelector('.pfApprovePrice').value);
      const note = form.querySelector('.pfApproveNote').value.trim();
      if (!Number.isFinite(price) || price <= 0) { say('Enter the parts total'); return; }
      conf.disabled = true; conf.textContent = 'Approving…';
      window.PFSB.setOrderStatus(ref, 'approved', { confirmedTotal: price, note })
        .then(() => { say('Order ' + ref + ' approved'); load(); })
        .catch(err => { conf.disabled = false; conf.textContent = 'Confirm approval'; say(err.message || 'Could not approve'); });
      return;
    }

    if (e.target.closest('[data-staff-sound]')) {
      try { localStorage.setItem(SOUND_KEY, soundOn() ? 'off' : 'on'); } catch { /* private mode */ }
      const b = e.target.closest('[data-staff-sound]');
      b.setAttribute('aria-pressed', String(soundOn()));
      b.textContent = soundOn() ? '🔔 Sound on' : '🔕 Sound off';
      if (soundOn()) ping();
      return;
    }

    const rq = e.target.closest('[data-req-set]');
    if (rq) {
      const id = rq.dataset.reqSet, status = rq.dataset.status;
      rq.disabled = true;
      window.PFSB.staffSetRequestStatus(id, status)
        .then(() => { say('Request ' + (REQ_LABEL[status] || status).toLowerCase()); load(); })
        .catch(err => { rq.disabled = false; say(err.message || 'Could not update the request'); });
      return;
    }

    const take = e.target.closest('[data-take-payment]');
    if (take) {
      const ref = take.dataset.takePayment, due = Number(take.dataset.due || 0);
      const raw = prompt('Amount received for ' + ref + (due ? ' (GH\u20B5 ' + due.toFixed(2) + ' due)' : '') + ':', due ? due.toFixed(2) : '');
      if (raw === null) return;
      const amount = parseFloat(raw);
      if (!Number.isFinite(amount) || amount <= 0) { say('Enter the amount received'); return; }
      const channel = prompt('How was it paid? (cash, momo, bank)', 'cash');
      if (channel === null) return;
      take.disabled = true; take.textContent = 'Recording…';
      window.PFSB.recordManualPayment(ref, amount, channel, 'Recorded in the staff console')
        .then(() => { say('Payment recorded for ' + ref); load(); })
        .catch(err => { take.disabled = false; take.textContent = 'Record payment'; say(err.message || 'Could not record the payment'); });
      return;
    }

    const ref_ = e.target.closest('[data-refund]');
    if (ref_) {
      const ref = ref_.dataset.refund, due = Number(ref_.dataset.due || 0);
      const raw = prompt('Amount refunded for ' + ref + ' (refund it in Paystack or in cash first):', due ? due.toFixed(2) : '');
      if (raw === null) return;
      const amount = parseFloat(raw);
      if (!Number.isFinite(amount) || amount <= 0) { say('Enter the refunded amount'); return; }
      ref_.disabled = true; ref_.textContent = 'Recording…';
      window.PFSB.recordRefund(ref, amount, 'Recorded in the staff console')
        .then(() => { say('Refund recorded for ' + ref + ' — the order can now be cancelled'); load(); })
        .catch(err => { ref_.disabled = false; ref_.textContent = 'Record refund'; say(err.message || 'Could not record the refund'); });
      return;
    }

    const st = e.target.closest('[data-staff-set]');
    if (st) {
      const ref = st.dataset.staffSet, status = st.dataset.status;
      if ((status === 'rejected' || status === 'cancelled') && !confirm('Mark order ' + ref + ' as ' + status + '?')) return;
      st.disabled = true;
      window.PFSB.setOrderStatus(ref, status)
        .then(() => { say('Order ' + ref + ' → ' + (LABEL[status] || status)); load(); })
        .catch(err => { st.disabled = false; say(err.message || 'Could not update'); });
      return;
    }
  }, true);
})();
