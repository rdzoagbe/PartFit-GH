/* PartFit Ghana V3 pay-on-pickup order flow */
(() => {
  const P=window.PFV3;
  P.steps=['Order submitted','Fitment & stock review','Approved — Pay on Pickup','Ready for collection','Collected'];
  const makeId=()=>`PF-${new Date().toISOString().slice(2,10).replaceAll('-','')}-${Math.floor(100+Math.random()*900)}`;
  function saveRequest(){
    if(!S.cart.length)return null;
    const name=(document.getElementById('name')?.value||'').trim();
    const phone=(document.getElementById('phone')?.value||'').trim();
    if(!name||!phone){say('Enter your name and phone');return null}
    const email=P.signed()?P.profile().email:(document.getElementById('email')?.value||'').trim();
    const items=S.cart.map(i=>{const p=parts.find(x=>x.id===i.id);return p?{id:p.id,name:p.name,short:p.short,price:Number(p.price),qty:i.qty}:null}).filter(Boolean);
    const provisional=items.reduce((s,i)=>s+i.price*i.qty,0);
    const list=P.orders();
    const o={id:makeId(),createdAt:new Date().toISOString(),stage:0,name,phone,email,vehicle:vehicleLabel(),fulfilment:'Pickup — Spintex',payment:'Pay on Pickup',provisionalTotal:provisional,confirmedTotal:null,items};
    list.unshift(o);P.write(P.keys.orders,list.slice(0,100));return o;
  }
  function cartPayNotice(){
    const form=document.querySelector('.form');if(!form)return;
    document.querySelectorAll('input[name="fulfil"]').forEach(r=>{if(r.value!=='Pickup — Spintex')r.closest('.location')?.remove()});
    form.insertAdjacentHTML('beforebegin',`<section class="v3PayNotice"><span>✓</span><div><b>No payment now</b><p>Submit the order request. PartFit checks exact fitment and stock, then sends the approved final price. You pay when collecting at Spintex.</p></div></section>`);
    const btn=form.querySelector('[data-submit]');if(btn)btn.textContent='Submit Order for Approval on WhatsApp';
  }
  P.cartEnhance=cartPayNotice;
  const SB=()=>window.PFSB&&window.PFSB.configured();

  function waSummary(ref,items,total,vehicle,name){
    const lines=items.map(i=>`• ${i.name} (${i.short||''}) ×${i.qty}`);
    whatsapp(`Hello PartFit Ghana, I have submitted an order for approval.\n\nOrder: ${ref}\n${lines.join('\n')}\n\nProvisional basket total: ${money(total)}\nVehicle: ${vehicle}${name?'\nName: '+name:''}\nPickup: Spintex\nPayment: PAY ON PICKUP AFTER APPROVAL\n\nPlease check exact fitment and stock, then confirm the final amount to pay when I collect.`);
  }

  async function submitRemote(btn){
    if(!S.cart.length){say('Your order is empty');return}
    const snapshot=S.cart.map(i=>{const p=parts.find(x=>x.id===i.id);return p?{name:p.name,short:p.short,qty:i.qty}:null}).filter(Boolean);
    const provisional=S.cart.reduce((s,i)=>{const p=parts.find(x=>x.id===i.id);return s+(p?Number(p.price)*i.qty:0)},0);
    const items=S.cart.map(i=>({product_id:i.id,quantity:i.qty}));
    const label=vehicleLabel();
    const orig=btn&&btn.textContent; if(btn){btn.disabled=true;btn.textContent='Submitting…';}
    try{
      const res=await window.PFSB.submitOrder(label,items);
      const ref=res&&res.public_ref;
      S.cart=[];save();
      waSummary(ref,snapshot,res&&res.provisional_total!=null?res.provisional_total:provisional,label,(P.profile()||{}).name);
      say('Order '+ref+' submitted');
      render('track',ref);
    }catch(err){
      if(btn){btn.disabled=false;btn.textContent=orig;}
      say(err.message||'Could not submit order. Please try again.');
    }
  }

  document.addEventListener('click',e=>{
    const btn=e.target.closest('[data-submit]');
    if(!btn)return;
    e.preventDefault();e.stopImmediatePropagation();
    if(!P.signed()){say('Create a free account to reserve for pickup');render('signup');return}
    if(SB()&&window.PFSB.signedIn()){submitRemote(btn);return}
    const o=saveRequest();if(!o)return;
    const lines=o.items.map(i=>`• ${i.name} (${i.short||''}) ×${i.qty} — ${money(i.price*i.qty)}`);
    whatsapp(`Hello PartFit Ghana, I would like to submit this order for approval.\n\nOrder: ${o.id}\n${lines.join('\n')}\n\nProvisional basket total: ${money(o.provisionalTotal)}\nVehicle: ${o.vehicle}\nName: ${o.name}\nPhone: ${o.phone}\nPickup: Spintex\nPayment: PAY ON PICKUP AFTER APPROVAL\n\nPlease check exact fitment and stock, then confirm whether the order is approved and send me the final amount to pay when I collect.`);
    say(`Order ${o.id} saved`);
  },true);
})();
