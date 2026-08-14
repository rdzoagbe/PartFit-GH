(() => {
  const P=window.PFV3;
  function page(){
    if(!P.signed()){
      app.innerHTML=appHeader('My Orders','Approval · pickup · history')+`<main class="page"><section class="pfLock"><div class="lk"><svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="10" width="16" height="10" rx="2"/><path d="M8 10V7a4 4 0 018 0v3"/></svg></div><h2>Track your pay-on-pickup orders</h2><p>Create a free account to reserve parts, follow each approval and get the confirmed price to pay at Spintex.</p><button class="btn red big" data-page="signup">Create free account</button><button class="ln" data-page="login">I already have an account</button></section>${P.footer()}</main>${nav('orders')}`;
      return;
    }
    const list=P.userOrders();
    const cards=list.map(o=>`<article class="card v3OrderCard"><div><span class="orderRef">${P.esc(o.id)}</span><h2>${P.esc(P.steps[o.stage]||P.steps[0])}</h2><p>${P.fmt(o.createdAt)} · Pay on Pickup</p></div><div class="v3OrderItems">${o.items.slice(0,3).map(i=>`<span>${P.esc(i.name)} ×${i.qty}</span>`).join('')}</div><div class="v3OrderFoot"><b>${money(Number(o.confirmedTotal??o.provisionalTotal??0))}</b><button class="btn dark" data-v3-track="${P.esc(o.id)}">Track Order</button></div></article>`).join('');
    app.innerHTML=appHeader('My Orders','Approval · pickup · history')+`<main class="page"><section class="v3OrdersHero"><div><span class="sectionKicker">ORDER CENTRE</span><h1>From request to collection.</h1><p>PartFit checks fitment and stock first. When approved, we confirm the final amount and you pay when collecting.</p></div></section><section class="v3OrderList">${cards||`<div class="card noOrders"><span>📦</span><h2>No orders yet</h2><p>Submit an order or preview the flow.</p><button class="btn outlineNavy" data-v3-demo>View Demo Tracking</button></div>`}</section>${P.footer()}</main>${nav('orders')}`;
  }
  P.register('orders',page);
  document.addEventListener('click',e=>{const t=e.target.closest('[data-v3-track]');if(t)render('track',t.dataset.v3Track)},true);
})();
