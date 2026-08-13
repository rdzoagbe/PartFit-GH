(() => {
 const P=window.PFV3;
 function customerWa(phone,text){
   let n=String(phone||'').replace(/\D/g,'');
   if(n.startsWith('0')) n='233'+n.slice(1);
   if(!n.startsWith('233')&&n.length===9) n='233'+n;
   window.open('https://wa.me/'+n+'?text='+encodeURIComponent(text),'_blank','noopener');
 }
 function page(){const list=P.orders();app.innerHTML=appHeader('Staff Approval Demo','Local prototype only')+`<main class="page"><section class="v3PayNotice"><b>Prototype staff screen</b><p>This page changes orders stored only in this browser. Production approval must be protected by staff authentication and a backend.</p></section><section class="v3OrderList">${list.length?list.map(o=>`<article class="card v3OrderCard"><div><span class="orderRef">${P.esc(o.id)}</span><h2>${P.esc(P.steps[o.stage]||P.steps[0])}</h2><p>${P.esc(o.name)} · ${P.esc(o.phone)} · ${P.esc(o.vehicle)}</p></div><div class="field"><label>Approved final price (GH₵)</label><input data-staff-price="${P.esc(o.id)}" inputmode="decimal" value="${o.confirmedTotal??o.provisionalTotal??''}"></div><div class="row"><button class="btn outlineNavy" data-staff-stage="1" data-id="${P.esc(o.id)}">Review</button><button class="btn red" data-staff-stage="2" data-id="${P.esc(o.id)}">Approve</button><button class="btn dark" data-staff-stage="3" data-id="${P.esc(o.id)}">Ready</button><button class="btn outlineNavy" data-staff-stage="4" data-id="${P.esc(o.id)}">Collected</button></div><button class="btn wa full" data-staff-message="${P.esc(o.id)}">Send Confirmation to Customer</button></article>`).join(''):`<div class="card empty"><h2>No local orders yet</h2><p>Submit a customer order first, then return here.</p></div>`}</section></main>`}
 P.register('staff',page);
 document.addEventListener('click',e=>{
   const s=e.target.closest('[data-staff-stage]');
   if(s){const list=P.orders(),o=list.find(x=>x.id===s.dataset.id);if(!o)return;o.stage=Number(s.dataset.staffStage);const input=document.querySelector(`[data-staff-price="${o.id}"]`),price=Number(input?.value);if(o.stage>=2&&Number.isFinite(price)&&price>0)o.confirmedTotal=price;P.write(P.keys.orders,list);say('Order status updated');page();return}
   const m=e.target.closest('[data-staff-message]');
   if(m){const o=P.orders().find(x=>x.id===m.dataset.staffMessage);if(!o)return;const amount=o.confirmedTotal??o.provisionalTotal;const approved=o.stage>=2;const text=approved?`Hello ${o.name}, your PartFit Ghana order ${o.id} has been approved.\n\nConfirmed amount: ${money(Number(amount))}\nPayment: PAY ON PICKUP\nCollection: Spintex\nStatus: ${P.steps[o.stage]}\n\nPlease keep this order number and confirmation. No online payment is required. You will pay when collecting your confirmed order.`:`Hello ${o.name}, update for PartFit Ghana order ${o.id}: ${P.steps[o.stage]}. We are checking exact fitment and stock. No payment is due yet.`;customerWa(o.phone,text)}
 },true);
})();
