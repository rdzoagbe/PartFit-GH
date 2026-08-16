/* PartFit Ghana V3 pay-on-pickup order flow */
(() => {
  const P=window.PFV3;
  P.steps=['Order submitted','Fitment & stock review','Approved — Pay on Pickup','Ready for collection','Collected'];
  const makeId=()=>`PF-${new Date().toISOString().slice(2,10).replaceAll('-','')}-${Math.floor(100+Math.random()*900)}`;
  function saveRequest(){
    if(!S.cart.length)return null;
    const nameEl=document.getElementById('name'), phoneEl=document.getElementById('phone');
    const name=(nameEl?.value||'').trim();
    let phone=(phoneEl?.value||'').trim();
    let firstBad=null;
    if(!name){ fieldError(nameEl,'Enter your full name'); firstBad=firstBad||nameEl; }
    if(!phone){ fieldError(phoneEl,'Enter your phone number'); firstBad=firstBad||phoneEl; }
    else if(!validPhone(phone)){ fieldError(phoneEl,'Enter a valid phone number'); firstBad=firstBad||phoneEl; }
    if(firstBad){ say('Please check the highlighted fields'); firstBad.focus(); firstBad.scrollIntoView({behavior:'smooth',block:'center'}); return null; }
    phone=formatGhPhone(phone); if(phoneEl) phoneEl.value=phone;
    const del=readDeliveryChoice();
    if(!del.valid){ const el=document.getElementById(del.field); if(el){fieldError(el,del.error);el.focus();el.scrollIntoView({behavior:'smooth',block:'center'});} say('Please check the highlighted fields'); return null; }
    const email=P.signed()?P.profile().email:(document.getElementById('email')?.value||'').trim();
    const items=S.cart.map(i=>{const p=parts.find(x=>x.id===i.id);return p?{id:p.id,name:p.name,short:p.short,price:Number(p.price),qty:i.qty}:null}).filter(Boolean);
    const provisional=items.reduce((s,i)=>s+i.price*i.qty,0);
    const list=P.orders();
    const o={id:makeId(),createdAt:new Date().toISOString(),stage:0,name,phone,email,vehicle:vehicleLabel(),fulfilment:del.fulfilment,deliveryFee:del.fee||0,deliveryAddress:del.address||'',payment:'Pay after approval',provisionalTotal:provisional,total:provisional+(del.fee||0),confirmedTotal:null,items};
    list.unshift(o);P.write(P.keys.orders,list.slice(0,100));return o;
  }
  function cartPayNotice(){
    const form=document.querySelector('.form');if(!form)return;
    form.insertAdjacentHTML('beforebegin',`<section class="v3PayNotice"><span>✓</span><div><b>No payment now</b><p>Submit your order. PartFit confirms exact fitment, stock and your final price — including delivery if you chose it — then you pay once it's approved.</p></div></section>`);
    const btn=form.querySelector('[data-submit]');if(btn)btn.textContent='Submit Order for Approval';
  }
  P.cartEnhance=cartPayNotice;
  const SB=()=>window.PFSB&&window.PFSB.configured();

  /* ---- order confirmation screen ---- */
  P.lastConfirmation=null;
  function confirmation(){
    const c=P.lastConfirmation;
    if(!c){render(P.signed()?'orders':'home');return}
    const isDelivery=(c.fee||0)>0;
    const flow=[['1','Submitted','No payment yet',1],['2','We verify','Fitment & stock',0],['3','Approved','Final price set',0],['4',isDelivery?'Pay & deliver':'Collect & pay',isDelivery?'To your address':'At Spintex',0]];
    app.innerHTML=appHeader('Order received',isDelivery?'Delivery':'Pay on pickup')+`<main class="page pfConfirm">
      <section class="pfConfirmHero">
        <div class="pfCheck">✓</div>
        <h1>Order received</h1>
        <p>No payment yet. PartFit confirms exact fitment, stock and your final price${isDelivery?' including delivery':''}, then you pay once it's approved.</p>
        <div class="pfRefBox"><div><small>Your reference</small><b class="mono">${P.esc(c.ref)}</b></div><button class="pfCopyRef" data-copy-ref="${P.esc(c.ref)}">Copy</button></div>
        <div class="pfRefMeta">${c.items} item${c.items===1?'':'s'} · ${P.esc(c.vehicle||'No vehicle')} · ${P.esc(c.fulfilment||'Pickup — Spintex')}</div>
        <div class="pfRefTotals">${isDelivery?`<span>Subtotal ${money(Number(c.subtotal||0))}</span><span>Delivery ${money(Number(c.fee||0))}</span>`:''}<b>Provisional total ${money(Number(c.total||0))}</b></div>
      </section>
      <section class="sec"><div class="head"><div><span class="sectionKicker">STATUS</span><h2>What happens next</h2></div></div>
        <div class="pfFlow">${flow.map((f,i)=>`<article class="${f[3]?'on':''}"><div class="n">${f[0]}</div><h3>${f[1]}</h3><p>${f[2]}</p>${i<3?'<span class="line">→</span>':''}</article>`).join('')}</div>
      </section>
      <div class="pfConfirmCta">
        <button class="btn red big" data-v3-track="${P.esc(c.ref)}">Track this order</button>
        <button class="btn outlineNavy big" data-page="catalogue">Continue shopping</button>
      </div>
      <p class="pfConfirmNote">${CFG.wa?'We’ll also confirm the details with you on WhatsApp.':'A WhatsApp summary was prepared — send it to us to speed up approval.'}</p>
      ${P.footer()}</main>${nav('orders')}`;
  }
  P.register('confirmation',confirmation);

  document.addEventListener('click',e=>{
    const cr=e.target.closest('[data-copy-ref]');if(!cr)return;
    const ref=cr.dataset.copyRef;
    if(navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(ref).then(()=>say('Reference copied')).catch(()=>say(ref))}else say(ref);
  },true);

  function fulfilLines(del){
    return del.mode==='delivery'
      ? `Fulfilment: DELIVERY — ${del.zoneLabel}\nAddress: ${del.address}\nDelivery fee: ${money(del.fee)}`
      : 'Fulfilment: PICKUP — Spintex';
  }
  function waSummary(ref,items,subtotal,del,vehicle,name){
    const lines=items.map(i=>`• ${i.name} (${i.short||''}) ×${i.qty}`);
    const total=subtotal+(del.fee||0);
    whatsapp(`Hello PartFit Ghana, I have submitted an order for approval.\n\nOrder: ${ref}\n${lines.join('\n')}\n\nSubtotal: ${money(subtotal)}\n${fulfilLines(del)}\nProvisional total: ${money(total)}\nVehicle: ${vehicle}${name?'\nName: '+name:''}\nPayment: PAY AFTER APPROVAL\n\nPlease confirm exact fitment, stock and the final amount to pay.`);
  }

  async function submitRemote(btn){
    if(!S.cart.length){say('Your order is empty');return}
    const del=readDeliveryChoice();
    if(!del.valid){ const el=document.getElementById(del.field); if(el){fieldError(el,del.error);el.focus();el.scrollIntoView({behavior:'smooth',block:'center'});} say('Please check the highlighted fields'); return; }
    const snapshot=S.cart.map(i=>{const p=parts.find(x=>x.id===i.id);return p?{name:p.name,short:p.short,qty:i.qty}:null}).filter(Boolean);
    const provisional=S.cart.reduce((s,i)=>{const p=parts.find(x=>x.id===i.id);return s+(p?Number(p.price)*i.qty:0)},0);
    const items=S.cart.map(i=>({product_id:i.id,quantity:i.qty}));
    const label=vehicleLabel();
    const orig=btn&&btn.textContent; if(btn){btn.disabled=true;btn.textContent='Submitting…';}
    try{
      const res=await window.PFSB.submitOrder(label,items);
      const ref=res&&res.public_ref;
      const subtotal=res&&res.provisional_total!=null?res.provisional_total:provisional;
      S.cart=[];save();
      waSummary(ref,snapshot,subtotal,del,label,(P.profile()||{}).name);
      P.lastConfirmation={ref,subtotal,fee:del.fee||0,total:subtotal+(del.fee||0),items:snapshot.length,vehicle:label,fulfilment:del.fulfilment};
      render('confirmation');
    }catch(err){
      if(btn){btn.disabled=false;btn.textContent=orig;}
      say(err.message||'Could not submit order. Please try again.');
    }
  }

  document.addEventListener('click',e=>{
    const btn=e.target.closest('[data-submit]');
    if(!btn)return;
    e.preventDefault();e.stopImmediatePropagation();
    if(!P.signed()){say('Create a free account to reserve for pickup');P.returnTo='order';render('signup');return}
    if(SB()&&window.PFSB.signedIn()){submitRemote(btn);return}
    const o=saveRequest();if(!o)return;
    const lines=o.items.map(i=>`• ${i.name} (${i.short||''}) ×${i.qty} — ${money(i.price*i.qty)}`);
    const fLine=o.deliveryFee>0
      ? `Fulfilment: DELIVERY — ${o.fulfilment.replace(/^Delivery — /,'')}\nAddress: ${o.deliveryAddress}\nDelivery fee: ${money(o.deliveryFee)}`
      : 'Fulfilment: PICKUP — Spintex';
    whatsapp(`Hello PartFit Ghana, I would like to submit this order for approval.\n\nOrder: ${o.id}\n${lines.join('\n')}\n\nSubtotal: ${money(o.provisionalTotal)}\n${fLine}\nProvisional total: ${money(o.total)}\nVehicle: ${o.vehicle}\nName: ${o.name}\nPhone: ${o.phone}\nPayment: PAY AFTER APPROVAL\n\nPlease confirm exact fitment, stock and the final amount to pay.`);
    P.lastConfirmation={ref:o.id,subtotal:o.provisionalTotal,fee:o.deliveryFee||0,total:o.total,items:o.items.length,vehicle:o.vehicle,fulfilment:o.fulfilment};
    S.cart=[];save();
    render('confirmation');
  },true);
})();
