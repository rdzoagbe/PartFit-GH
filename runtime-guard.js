(() => {
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