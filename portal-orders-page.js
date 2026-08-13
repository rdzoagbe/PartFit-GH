(() => {
  const P=window.PFV3;
  function page(){
    const list=P.userOrders();
    const cards=list.map(o=>`<article class="card v3OrderCard"><div><span class="orderRef">${P.esc(o.id)}</span><h2>${P.esc(P.steps[o.stage]||P.steps[0])}</h2><p>${P.fmt(o.createdAt)} · Pay on Pickup</p></div><div class="v3OrderItems">${o.items.slice(0,3).map(i=>`<span>${P.esc(i.name)} ×${i.qty}</span>`).join('')}</div><div class="v3OrderFoot"><b>${money(Number(o.confirmedTotal??o.provisionalTotal??0))}</b><button class="btn dark" data-v3-track="${P.esc(o.id)}">Track Order</button></div></article>`).join('');
    app.innerHTML=appHeader('My Orders','Approval · pickup · history')+`<main class="page"><section class="v3OrdersHero"><div><span class="sectionKicker">ORDER CENTRE</span><h1>From request to collection.</h1><p>PartFit checks fitment and stock first. When approved, we confirm the final amount and you pay when collecting.</p></div></section><section class="v3OrderList">${cards||`<div class="card noOrders"><span>📦</span><h2>No orders yet</h2><p>Submit an order or preview the flow.</p><button class="btn outlineNavy" data-v3-demo>View Demo Tracking</button></div>`}</section>${P.footer()}</main>${nav('orders')}`;
  }
  P.register('orders',page);
  document.addEventListener('click',e=>{const t=e.target.closest('[data-v3-track]');if(t)render('track',t.dataset.v3Track)},true);
})();
