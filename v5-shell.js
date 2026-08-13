(() => {
 const U=PartFitUtil,C=PARTFIT_CONFIG,Store=PartFitStore;
 const read=(k,f)=>{try{return JSON.parse(localStorage.getItem(k)||JSON.stringify(f))}catch{return f}};
 const write=(k,v)=>localStorage.setItem(k,JSON.stringify(v));
 const A=window.PartFitApp={pages:{},user:null,vehicle:read('pf5_vehicle',null),cart:read('pf5_cart',[]),installPrompt:null,mode:Store.mode};
 A.register=(n,f)=>A.pages[n]=f;A.save=()=>{write('pf5_vehicle',A.vehicle);write('pf5_cart',A.cart)};
 A.cartCount=()=>A.cart.reduce((s,i)=>s+Number(i.quantity||0),0);
 A.cartTotal=()=>A.cart.reduce((s,i)=>{const p=parts.find(x=>x.id===i.productId);return s+(p?Number(p.price)*Number(i.quantity):0)},0);
 A.setVehicle=v=>{A.vehicle=v;A.save()};
 A.addCart=(id,q=1)=>{const p=parts.find(x=>x.id===id);if(!p)return;const i=A.cart.find(x=>x.productId===id);if(i)i.quantity=Math.min(20,i.quantity+q);else A.cart.push({productId:id,quantity:q});A.save();A.toast(`${p.name} added`)};
 A.setQty=(id,q)=>{const i=A.cart.find(x=>x.productId===id);if(!i)return;if(q<=0)A.cart=A.cart.filter(x=>x.productId!==id);else i.quantity=Math.min(20,q);A.save()};
 A.toast=msg=>{const el=document.getElementById('toast');if(!el)return;el.textContent=msg;el.classList.add('show');clearTimeout(A.toastTimer);A.toastTimer=setTimeout(()=>el.classList.remove('show'),2300)};
 A.header=(title='PartFit Ghana',sub='Right Part. Right Car.')=>`<header class="pfHeader"><button class="pfLogo" data-route="home"><span>PF</span><small>GH</small></button><div class="pfTitle"><b>${U.esc(title)}</b><small>${U.esc(sub)}</small></div><nav class="pfDesktop"><button data-route="catalogue">Parts</button><button data-route="request">Request</button><button data-route="track">Track</button><button data-route="contact">Contact</button></nav><div class="pfSpacer"></div><button class="pfIconBtn pfWa" data-help>WA</button><button class="pfIconBtn" data-route="cart">🛒<em>${A.cartCount()}</em></button><button class="pfAccountBtn" data-route="${A.user?'account':'login'}"><span>${A.user?U.esc((A.user.name||'P')[0].toUpperCase()):'👤'}</span><small>${A.user?'Account':'Sign in'}</small></button></header>`;
 A.nav=active=>`<nav class="pfBottom">${[['home','⌂','Home'],['catalogue','▦','Parts'],['garage','🚗','Garage'],['orders','◎','Orders'],['account','👤','Account']].map(([r,i,l])=>`<button class="${active===r?'active':''}" data-route="${r}"><span>${i}</span><small>${l}</small></button>`).join('')}</nav>`;
 A.vehicleDock=()=>A.vehicle?`<div class="pfVehicleDock"><span>🚗</span><div><b>${U.esc(A.vehicle.make+' '+A.vehicle.model)}</b><small>${U.esc([A.vehicle.year,A.vehicle.engine].filter(Boolean).join(' · '))}</small></div><button data-route="vehicle">Change</button></div>`:'';
})();