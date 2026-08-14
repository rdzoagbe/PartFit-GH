/* PartFit Ghana — staff approval console
   Lets a staff account move orders through the pay-on-pickup workflow via the
   staff_set_order_status RPC. Visibility and every write are enforced server-side
   by is_partfit_staff() + row-level security; this UI only reveals the controls. */
(() => {
  const P = window.PFV3;
  const SB = () => window.PFSB && window.PFSB.configured() && window.PFSB.signedIn();
  const TABS = [['submitted', 'New'], ['reviewing', 'Reviewing'], ['approved', 'Approved'], ['ready_for_collection', 'Ready'], ['all', 'All']];
  const LABEL = { submitted: 'Submitted', reviewing: 'Reviewing', approved: 'Approved', ready_for_collection: 'Ready for collection', collected: 'Collected', rejected: 'Rejected', cancelled: 'Cancelled', expired: 'Expired' };
  const TONE = { submitted: 'new', reviewing: 'rev', approved: 'app', ready_for_collection: 'rdy', collected: 'done', rejected: 'bad', cancelled: 'bad', expired: 'bad' };
  let curTab = 'submitted';

  const gh = n => 'GH₵ ' + Number(n || 0).toLocaleString('en-GH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  function actionsFor(o) {
    const ref = P.esc(o.public_ref), s = o.status;
    const set = (st, label, cls) => `<button class="${cls}" data-staff-set="${ref}" data-status="${st}">${label}</button>`;
    if (s === 'submitted') return set('reviewing', 'Start review', 'btn dark') + set('rejected', 'Reject', 'btn danger');
    if (s === 'reviewing') return `<button class="btn red" data-staff-approve="${ref}" data-prov="${Number(o.provisional_total || 0)}">Approve…</button>` + set('rejected', 'Reject', 'btn danger');
    if (s === 'approved') return set('ready_for_collection', 'Mark ready', 'btn dark') + set('cancelled', 'Cancel', 'btn danger');
    if (s === 'ready_for_collection') return set('collected', 'Mark collected', 'btn wa') + set('cancelled', 'Cancel', 'btn danger');
    return '<span class="pfStaffTerminal">No further action</span>';
  }

  function card(o) {
    const ref = P.esc(o.public_ref);
    const items = (o.order_items || []).map(i => `<div class="pfSItem"><span>${P.esc(i.product_name)} <b class="mono">×${i.quantity}</b></span><span class="mono">${gh(i.provisional_unit_price)}</span></div>`).join('');
    const amount = o.confirmed_total != null
      ? `<div class="pfSAmt"><small>Approved</small><b class="mono">${gh(o.confirmed_total)}</b></div>`
      : `<div class="pfSAmt"><small>Provisional</small><b class="mono">${gh(o.provisional_total)}</b></div>`;
    return `<article class="card pfStaffCard">
      <div class="pfSHead">
        <div><span class="orderRef mono">${ref}</span><span class="pfSStatus ${TONE[o.status] || 'new'}">${LABEL[o.status] || o.status}</span></div>
        <div class="pfSDate mono">${P.fmt(o.created_at)}</div>
      </div>
      <div class="pfSVeh">${P.esc(o.vehicle_label || 'No vehicle given')}</div>
      <div class="pfSItems">${items || '<span class="pfSMuted">No line items</span>'}</div>
      <div class="pfSFoot">${amount}<div class="pfStaffActions">${actionsFor(o)}</div></div>
      <form class="pfApprove" data-approve-form="${ref}" hidden>
        <div class="pfApproveRow">
          <label>Confirmed total (GH₵)<input type="number" step="0.01" min="0" class="pfApprovePrice" value="${Number(o.provisional_total || 0)}" inputmode="decimal"></label>
          <label>Note <small>(optional)</small><input type="text" class="pfApproveNote" placeholder="Fitment confirmed, etc."></label>
        </div>
        <div class="pfApproveBtns"><button type="button" class="btn red" data-approve-confirm="${ref}">Confirm approval</button><button type="button" class="btn ghostLine" data-approve-cancel>Cancel</button></div>
      </form>
    </article>`;
  }

  function shell(bodyHTML) {
    app.innerHTML = appHeader('Staff console', 'Approvals · fitment · stock') + `<main class="page pfStaff">
      <section class="v3OrdersHero"><div><span class="sectionKicker">STAFF</span><h1>Order approvals</h1><p>Review fitment and stock, approve with the final price, then move each order to collection. Every change is logged server-side.</p></div></section>
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
    shell(list.length ? list.map(card).join('') : info('✓', 'Nothing here', 'No orders in this queue right now.'));
  }

  function load() {
    renderList('loading');
    window.PFSB.staffListOrders(curTab).then(a => renderList(a)).catch(e => renderList({ error: e.message || 'Network error' }));
  }

  function page() {
    if (!SB()) { shell(info('🔒', 'Sign in required', 'Sign in with your staff account to open the approvals console.', '<button class="btn red" data-page="login">Sign in</button>')); return; }
    shell(info('⏳', 'Checking access…', 'One moment.'));
    window.PFSB.isStaff().then(role => {
      if (!role) { shell(info('🔒', 'Staff only', 'This area is for PartFit staff. Ask an admin to grant your account a staff role.')); return; }
      load();
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
      if (!Number.isFinite(price) || price <= 0) { say('Enter the confirmed total'); return; }
      conf.disabled = true; conf.textContent = 'Approving…';
      window.PFSB.setOrderStatus(ref, 'approved', { confirmedTotal: price, note })
        .then(() => { say('Order ' + ref + ' approved'); load(); })
        .catch(err => { conf.disabled = false; conf.textContent = 'Confirm approval'; say(err.message || 'Could not approve'); });
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
