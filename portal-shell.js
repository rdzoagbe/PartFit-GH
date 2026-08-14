/* PartFit Ghana V3 shared shell */
(() => {
  const P=window.PFV3={};
  P.v2={home,catalogue,product,vehicle,cart:order,request:window.requestPart};
  P.keys={profile:'pfProfileV3',signed:'pfSignedInV3',orders:'pfOrdersV3',cars:'pfSavedCarsV3'};
  P.steps=['Order received','Fitment confirmed','Processing','Ready / dispatched','Delivered / collected'];
  P.read=(k,f)=>{try{return JSON.parse(localStorage.getItem(k)||JSON.stringify(f))}catch{return f}};
  P.write=(k,v)=>localStorage.setItem(k,JSON.stringify(v));
  P.profile=()=>P.read(P.keys.profile,null);
  P.signed=()=>localStorage.getItem(P.keys.signed)==='1'&&!!P.profile();
  P.orders=()=>P.read(P.keys.orders,[]);
  P.cars=()=>P.read(P.keys.cars,[]);
  P.esc=safe;
  P.fmt=d=>new Date(d).toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'});
  P.initials=n=>(n||'PF').split(/\s+/).slice(0,2).map(x=>x[0]?.toUpperCase()).join('');
  P.userOrders=()=>{const p=P.profile();return P.orders().filter(o=>P.signed()?o.email===p.email:!o.email)};
  P.pages={};
  P.register=(name,fn)=>P.pages[name]=fn;
  P.footer=()=>`<footer class="v3Footer"><div class="v3FootGrid"><div><div class="v3FootLogo">PF<small>GH</small></div><h3>PartFit Ghana</h3><p>Fitment-first car parts ordering with human support.</p><button class="btn wa" data-help>WhatsApp Support</button></div><div><h4>Shop</h4><button data-page="catalogue">Browse Parts</button><button data-page="vehicle">Select My Car</button><button data-page="request">Request a Part</button></div><div><h4>Support</h4><button data-page="account">My Account</button><button data-page="orders">My Orders</button><button data-page="track">Track Order</button><button data-page="faq">FAQ</button><button data-page="contact">Contact</button></div><div><h4>Policies</h4><button data-page="privacy">Privacy</button><button data-page="terms">Terms</button><button data-page="returns">Returns</button><button data-page="delivery">Delivery</button><button data-page="fitment">Fitment Disclaimer</button></div></div><div class="v3FootBottom">© ${new Date().getFullYear()} PartFit Ghana · Prototype customer portal · Final business details to be confirmed before launch.</div></footer>`;
  P.addFooter=()=>{const m=document.querySelector('main.page');if(m&&!m.querySelector('.v3Footer'))m.insertAdjacentHTML('beforeend',P.footer())};
  P.setHash=(page,arg='')=>{const map={home:'home',vehicle:'vehicle',catalogue:'parts',request:'request',order:'cart',orders:'orders',account:'account',login:'login',signup:'signup',track:'track',contact:'contact',faq:'faq',privacy:'privacy',terms:'terms',returns:'returns',delivery:'delivery',fitment:'fitment',staff:'staff',product:'product'};history.replaceState(null,'','#'+(map[page]||'home')+(arg?':'+encodeURIComponent(arg):''))};

  function accountTop(){const p=P.profile();return P.signed()?`<button class="v3AccountTop" data-page="account"><b>${P.initials(p.name)}</b><small>Account</small></button>`:`<button class="v3AccountTop" data-page="login"><b>👤</b><small>Sign in</small></button>`}
  appHeader=function(title='PartFit Ghana',sub='Right Part. Right Car.'){
    return `<header class="top v3Top"><button class="brandMark" data-page="home"><span>PF</span><small>GH</small></button><div class="title">${P.esc(title)}<small>${P.esc(sub)}</small></div><div class="v3Desktop"><button data-page="catalogue">Parts</button><button data-page="request">Request</button></div><div class="grow"></div><button class="topAction" data-help>WA</button><button class="cartBtn" data-page="order">🛒 <b>${cartCount()}</b></button>${accountTop()}</header>`;
  };
  nav=function(active){const a=active==='order'?'orders':active,n=[['home','⌂','Home'],['catalogue','▦','Parts'],['request','⌕','Request'],['orders','◎','Orders'],['account','👤','Account']];return `<nav class="bottom">${n.map(x=>`<button class="${a===x[0]?'on':''}" data-page="${x[0]}"><span>${x[1]}</span>${x[2]}</button>`).join('')}</nav>`};
})();
