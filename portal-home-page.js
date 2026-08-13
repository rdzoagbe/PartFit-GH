(() => {
  const P=window.PFV3;
  function homePage(){
    P.v2.home();
    const oldHero=document.querySelector('.hero');
    if(oldHero) oldHero.innerHTML=`<div class="heroCopy"><span class="heroTag">🇬🇭 PARTFIT GHANA · SPINTEX</span><h1>The right part.<br><em>For the right car.</em></h1><p>Select your vehicle, submit your order, and let PartFit confirm exact fitment, stock and the final price. You pay only when collecting.</p><div class="row"><button class="btn red" data-page="vehicle">Select My Vehicle</button><button class="btn ghost" data-page="catalogue">Browse Parts</button></div></div><div class="heroPhotos"><div class="heroPhoto large">${image(IMG.spark,'Spark plugs')}</div><div class="heroPhoto">${image(IMG.brake,'Brake pad')}</div><div class="heroPhoto">${image(IMG.oil,'Oil filter')}</div></div>`;
    if(!document.querySelector('.v4Announcement')) document.querySelector('.top')?.insertAdjacentHTML('afterend','<div class="v4Announcement"><strong>✓ Pay only when collecting</strong><span>Fitment, stock and final price are confirmed first.</span></div>');
    const main=document.querySelector('main.page');
    const p=P.profile(),open=P.userOrders().filter(x=>x.stage<4).length;
    main?.insertAdjacentHTML('beforeend',`<section class="sec v3PayModel"><div><span>1</span><b>Submit order</b><small>No payment yet</small></div><div><span>2</span><b>PartFit checks</b><small>Fitment + stock</small></div><div><span>3</span><b>Approved</b><small>Final price confirmed</small></div><div><span>4</span><b>Collect & pay</b><small>Pay at Spintex</small></div></section><section class="sec v3AccountPromo"><div><span class="sectionKicker">${P.signed()?'YOUR PARTFIT':'FREE PARTFIT ACCOUNT'}</span><h2>${P.signed()?`Welcome back, ${P.esc(p.name.split(' ')[0])}.`:'Save vehicles, orders and tracking.'}</h2><p>${P.signed()?`${open} open order${open===1?'':'s'} · ${P.cars().length} saved vehicle${P.cars().length===1?'':'s'}`:'Create an account so repeat ordering is quicker and every approval stays visible.'}</p></div><button class="btn dark" data-page="${P.signed()?'account':'signup'}">${P.signed()?'Open My Account':'Create Account'}</button></section><section class="sec v4TrustPanel"><span class="sectionKicker">WHY PARTFIT</span><h2>Ordering parts should not feel like guessing.</h2><p>Vehicle context, fitment review, clear approval and pay-on-pickup keep the process simple.</p></section>${P.footer()}`);
  }
  P.register('home',homePage);
})();
