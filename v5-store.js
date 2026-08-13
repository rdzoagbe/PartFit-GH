(() => {
  const C=window.PARTFIT_CONFIG||{};
  const prod=window.PartFitSupabaseStore, demo=window.PartFitDemoStore;
  const useProd=C.mode==='production'||(C.mode==='auto'&&prod?.configured?.());
  window.PartFitStore=useProd?prod:demo;
  window.PartFitUtil={
    money(v){return new Intl.NumberFormat(C.locale||'en-GH',{style:'currency',currency:C.currency||'GHS',maximumFractionDigits:2}).format(Number(v||0))},
    esc(v){return String(v??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]))},
    vehicleLabel(v){return v&&v.make?[v.make,v.model,v.year,v.engine].filter(Boolean).join(' · '):'No vehicle selected'},
    phoneForWhatsApp(v){let n=String(v||'').replace(/\D/g,'');if(n.startsWith('0'))n='233'+n.slice(1);if(!n.startsWith('233')&&n.length===9)n='233'+n;return n},
    whatsapp(number,text){const n=this.phoneForWhatsApp(number);window.open(`https://wa.me/${n}?text=${encodeURIComponent(text)}`,'_blank','noopener,noreferrer')},
    statusMeta(s){return ({submitted:['Submitted','blue'],reviewing:['Under review','amber'],approved:['Approved · Pay on Pickup','green'],ready_for_collection:['Ready for collection','green'],collected:['Collected','muted'],rejected:['Not approved','red'],cancelled:['Cancelled','red'],expired:['Approval expired','red']})[s]||[s,'muted']},
    fmtDate(d){return d?new Intl.DateTimeFormat('en-GB',{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'}).format(new Date(d)):''},
    clampText(v,n=180){return String(v||'').trim().slice(0,n)}
  };
})();