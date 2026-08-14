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
  CFG.wa='';
  CFG.addr='Spintex Road, Accra — exact collection point confirmed with approved order';
  const baseWhatsapp=whatsapp;
  whatsapp=function(text){
    if(CFG.wa)return baseWhatsapp(text);
    if(navigator.clipboard?.writeText)navigator.clipboard.writeText(text).catch(()=>{});
    say('Test mode: WhatsApp message copied. Add the real business number before launch.');
    console.info('PartFit WhatsApp test message:',text);
  };
})();