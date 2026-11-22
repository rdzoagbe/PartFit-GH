(() => {
  // Graceful image fallback. Inline onerror= handlers are blocked by the page
  // CSP (script-src 'self'), so failed images are caught here in the capture
  // phase (the error event does not bubble) and given a clean placeholder.
  document.addEventListener('error', e => {
    const t = e.target;
    if (t && t.tagName === 'IMG' && !t.classList.contains('imgError')) {
      t.classList.add('imgError');
      t.alt = 'Product image unavailable';
    }
  }, true);

  localStorage.removeItem('pfSignedInV3');

  // The shop's real contact details come from partfit-config.js, which is the
  // one file a deployment edits. data.js only holds the sample/demo values.
  // When PARTFIT_CONFIG.whatsapp is empty we stay in test mode, which copies
  // the message instead of sending it — so an unconfigured deployment cannot
  // silently drop customer enquiries while looking like it sent them.
  const DEPLOY = window.PARTFIT_CONFIG || {};
  CFG.wa = String(DEPLOY.whatsapp || '').replace(/[^0-9]/g, '');
  if (DEPLOY.pickupAddress) CFG.addr = DEPLOY.pickupAddress;

  const baseWhatsapp=whatsapp;
  whatsapp=function(text){
    if(CFG.wa)return baseWhatsapp(text);
    if(navigator.clipboard?.writeText)navigator.clipboard.writeText(text).catch(()=>{});
    say('Test mode: WhatsApp message copied. Add the business number in partfit-config.js before launch.');
    console.warn('PartFit is in WhatsApp TEST MODE (PARTFIT_CONFIG.whatsapp is empty). Message:',text);
  };

  // ---- Client-side error monitoring hook ----
  // No external calls in demo (CSP + no endpoint): captured errors go into a
  // capped in-memory ring buffer and an optional PFDIAG.report(entry) sink that
  // a real monitoring backend can plug into later. Inspect via window.PFDIAG.
  const DIAG = window.PFDIAG = window.PFDIAG || { errors: [], max: 50, report: null };
  function capture(kind, detail){
    const entry = { kind, at: new Date().toISOString(), page: location.hash || '#home', detail: String(detail == null ? '' : detail).slice(0, 500) };
    DIAG.errors.push(entry);
    while (DIAG.errors.length > DIAG.max) DIAG.errors.shift();
    try { if (typeof DIAG.report === 'function') DIAG.report(entry); } catch { /* a broken reporter must never throw */ }
  }
  // Image load failures are handled above; ignore them here.
  window.addEventListener('error', e => {
    if (e && e.target && e.target.tagName === 'IMG') return;
    capture('error', (e && (e.message || (e.error && e.error.message))) || 'script error');
  });
  window.addEventListener('unhandledrejection', e => {
    const r = e && e.reason;
    capture('unhandledrejection', (r && (r.message || r)) || 'unhandled promise rejection');
  });
})();