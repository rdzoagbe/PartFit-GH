(() => {
  const P=window.PFV3;
  function homePage(){
    P.v2.home();
    const main=document.querySelector('main.page');
    const p=P.profile(),open=P.userOrders().filter(x=>x.stage<4).length;
    main?.insertAdjacentHTML('beforeend',`<section class="sec v3PayModel"><div><span>1</span><b>Submit order</b><small>No payment yet</small></div><div><span>2</span><b>PartFit checks</b><small>Fitment + stock</small></div><div><span>3</span><b>Approved</b><small>Final price confirmed</small></div><div><span>4</span><b>Collect & pay</b><small>Pay at Spintex</small></div></section><section class="sec v3AccountPromo"><div><span class="sectionKicker">${P.signed()?'YOUR PARTFIT':'FREE PARTFIT ACCOUNT'}</span><h2>${P.signed()?`Welcome back, ${P.esc(p.name.split(' ')[0])}.`:'Save vehicles, orders and tracking.'}</h2><p>${P.signed()?`${open} open order${open===1?'':'s'} · ${P.cars().length} saved vehicle${P.cars().length===1?'':'s'}`:'Create an account so repeat ordering is quicker and every approval stays visible.'}</p></div><button class="btn dark" data-page="${P.signed()?'account':'signup'}">${P.signed()?'Open My Account':'Create Account'}</button></section><section class="sec v3LandingSupport"><div><span class="sectionKicker">SUPPORT</span><h2>Orders, tracking, contact and policies.</h2><p>Everything a customer normally expects from a complete storefront is available from the portal and footer.</p></div><div class="row"><button class="btn red" data-page="orders">My Orders</button><button class="btn dark" data-page="contact">Contact</button><button class="btn outlineNavy" data-page="faq">FAQ</button></div></section>${P.footer()}`);
  }
  P.register('home',homePage);
})();
