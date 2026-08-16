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
  P.footer=()=>`<footer class="v3Footer"><div class="v3FootGrid"><div><div class="v3FootBrand"><img class="v3FootMark" src="./logo.svg" alt="" width="80" height="46"><span class="v3FootWord">PartFit<b>Ghana</b></span></div><p>Fitment-first car parts ordering with human support.</p><button class="btn wa" data-help>WhatsApp Support</button></div><div><h4>Shop</h4><button data-page="catalogue">Browse Parts</button><button data-page="vehicle">Select My Car</button><button data-page="request">Request a Part</button></div><div><h4>Support</h4><button data-page="account">My Account</button><button data-page="orders">My Orders</button><button data-page="track">Track Order</button><button data-page="faq">FAQ</button><button data-page="contact">Contact</button></div><div><h4>Policies</h4><button data-page="privacy">Privacy</button><button data-page="terms">Terms</button><button data-page="returns">Returns</button><button data-page="delivery">Delivery</button><button data-page="fitment">Fitment Disclaimer</button></div></div><div class="v3FootBottom">© ${new Date().getFullYear()} PartFit Ghana · Prototype customer portal · Final business details to be confirmed before launch.</div></footer>`;
  P.addFooter=()=>{const m=document.querySelector('main.page');if(m&&!m.querySelector('.v3Footer'))m.insertAdjacentHTML('beforeend',P.footer())};
  P.setHash=(page,arg='')=>{const map={home:'home',vehicle:'vehicle',catalogue:'parts',request:'request',order:'cart',orders:'orders',account:'account',login:'login',signup:'signup',track:'track',contact:'contact',faq:'faq',privacy:'privacy',terms:'terms',returns:'returns',delivery:'delivery',fitment:'fitment',staff:'staff',product:'product',confirmation:'confirmation'};history.replaceState(null,'','#'+(map[page]||'home')+(arg?':'+encodeURIComponent(arg):''))};

  function accountTop(){const p=P.profile();return P.signed()?`<button class="v3AccountTop" data-page="account"><b>${P.initials(p.name)}</b><small>Account</small></button>`:`<button class="v3AccountTop" data-page="login"><b>👤</b><small>Sign in</small></button>`}
  // Map the current page to the primary-nav root it belongs under, mirroring
  // the active tab the bottom nav shows, so the desktop header highlights the
  // same section.
  const NAV_ROOT={home:'home',vehicle:'home',catalogue:'catalogue',product:'catalogue',request:'request',order:'orders',orders:'orders',track:'orders',confirmation:'orders',account:'account',login:'account',signup:'account',staff:'account',faq:'account',contact:'account',privacy:'account',terms:'account',returns:'account',delivery:'account',fitment:'account'};
  appHeader=function(title='PartFit Ghana',sub='Right Part. Right Car.'){
    const cur=NAV_ROOT[P.cur]||'';
    const items=[['home','Home'],['catalogue','Parts'],['request','Request'],['orders','Orders']];
    const topNav=`<nav class="v3Nav" aria-label="Primary">${items.map(x=>`<button class="${cur===x[0]?'on':''}" data-page="${x[0]}">${x[1]}</button>`).join('')}</nav>`;
    return `<header class="top v3Top"><button class="brandMark" data-page="home" aria-label="PartFit Ghana — home"><img class="brandLogo" src="./logo.svg" alt="" width="56" height="32"></button><div class="title">${P.esc(title)}<small>${P.esc(sub)}</small></div><div class="grow"></div>${topNav}<button class="topAction" data-help aria-label="Contact us on WhatsApp"><svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true"><path d="M12.04 2.01c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2 22l5.25-1.38a9.9 9.9 0 0 0 4.79 1.22h.01c5.46 0 9.91-4.45 9.91-9.91a9.85 9.85 0 0 0-2.9-7.01 9.82 9.82 0 0 0-7.02-2.91Zm0 1.67c2.2 0 4.27.86 5.83 2.42a8.2 8.2 0 0 1 2.41 5.82c0 4.54-3.7 8.24-8.24 8.24-1.48 0-2.93-.4-4.19-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.2 8.2 0 0 1-1.26-4.38c0-4.54 3.7-8.24 8.24-8.24Zm-3.51 3.32c-.16 0-.43.06-.66.31-.22.25-.86.85-.86 2.07 0 1.22.89 2.4 1.01 2.56.12.16 1.74 2.8 4.32 3.81 2.14.84 2.58.67 3.05.63.47-.04 1.5-.61 1.71-1.21.21-.6.21-1.1.15-1.21-.06-.11-.22-.17-.47-.29-.25-.12-1.5-.74-1.73-.82-.23-.09-.4-.13-.56.12-.16.25-.64.82-.79.99-.14.16-.29.18-.54.06-.25-.12-1.06-.39-2.02-1.25-.75-.67-1.25-1.49-1.4-1.74-.14-.25-.02-.38.11-.51.11-.11.25-.29.37-.43.12-.14.16-.25.25-.41.08-.17.04-.31-.02-.43-.06-.12-.55-1.35-.76-1.84-.2-.48-.4-.42-.55-.42h-.47Z"/></svg></button><button class="cartBtn" data-page="order">🛒 <b>${cartCount()}</b></button>${accountTop()}</header>`;
  };
  nav=function(active){const a=active==='order'?'orders':active,n=[['home','⌂','Home'],['catalogue','▦','Parts'],['request','⌕','Request'],['orders','◎','Orders'],['account','👤','Account']];return `<nav class="bottom">${n.map(x=>`<button class="${a===x[0]?'on':''}" data-page="${x[0]}"><span>${x[1]}</span>${x[2]}</button>`).join('')}</nav>`};
})();
