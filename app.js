let S = {
  vehicle: JSON.parse(localStorage.getItem('pfVehicle') || 'null'),
  cart: JSON.parse(localStorage.getItem('pfCart') || '[]'),
  cat: 'All',
  selected: null,
  prompt: null,
  query: ''
};

const app = document.getElementById('app');
const toast = document.getElementById('toast');

const money = n => 'GH₵ ' + Number(n).toFixed(2);
const cartCount = () => S.cart.reduce((a,b)=>a+b.qty,0);
const save = () => {
  localStorage.setItem('pfVehicle', JSON.stringify(S.vehicle));
  localStorage.setItem('pfCart', JSON.stringify(S.cart));
};
const vehicleLabel = () => S.vehicle
  ? `${S.vehicle.make} ${S.vehicle.model} ${S.vehicle.year}${S.vehicle.engine ? ' · '+S.vehicle.engine : ''}`
  : 'No vehicle selected';

function safe(s='') {
  return String(s).replace(/[&<>"']/g, m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
}

function say(t){
  toast.textContent=t;
  toast.classList.add('show');
  clearTimeout(say._t);
  say._t=setTimeout(()=>toast.classList.remove('show'),1800);
}

function appHeader(title='PartFit Ghana', sub='Right Part. Right Car.'){
  return `<header class="top">
    <button class="brandMark" data-page="home" aria-label="Home"><span>PF</span><small>GH</small></button>
    <div class="title">${safe(title)}<small>${safe(sub)}</small></div>
    <div class="grow"></div>
    <button class="topAction" data-help aria-label="WhatsApp support">WA</button>
    <button class="cartBtn" data-page="order" aria-label="Order cart">🛒 <b>${cartCount()}</b></button>
  </header>`;
}

function nav(active){
  const items=[['home','⌂','Home'],['vehicle','🚗','My Car'],['catalogue','▦','Parts'],['order','🧾','Order']];
  return `<nav class="bottom">${items.map(x=>`<button class="${active===x[0]?'on':''}" data-page="${x[0]}"><span>${x[1]}</span>${x[2]}</button>`).join('')}<button data-help><span>◉</span>WhatsApp</button></nav>`;
}

function fitInfo(p){
  if(!S.vehicle) return {cls:'neutral',icon:'?',text:'Select your car to check fitment'};
  const key=`${S.vehicle.make} ${S.vehicle.model}`;
  const modelHit=p.fitModels.includes(key);
  const brandHit=p.fitBrands.includes(S.vehicle.make);
  if(modelHit) return {cls:p.fitLevel==='catalog'?'catalog':'check',icon:p.fitLevel==='catalog'?'✓':'!',text:p.fitLevel==='catalog'?'Manufacturer application match':'Potential match — confirm OE/VIN'};
  if(brandHit) return {cls:'check',icon:'!',text:'Brand/application family — confirm exact fit'};
  return {cls:'neutral',icon:'i',text:'No fitment claim for selected vehicle'};
}

function image(src, alt, extra=''){
  // No inline onerror handler: the page CSP (script-src 'self') blocks inline
  // event handlers, so the fallback is applied by a global listener in
  // runtime-guard.js instead.
  return `<img src="${src}" alt="${safe(alt)}" loading="lazy" ${extra}>`;
}

function fitPill(p){
  const f=fitInfo(p);
  return `<span class="fitPill ${f.cls}">${f.icon} ${safe(f.text)}</span>`;
}

function productCard(p){
  return `<article class="card product" data-product="${p.id}">
    <div class="productImg">${image(p.img,p.name)}</div>
    <div class="productInfo">
      <div class="eyebrow">${safe(p.brand)} · ${safe(p.short)}</div>
      <h3>${safe(p.name)}</h3>
      ${fitPill(p)}
      <div class="productMeta"><span class="price">${money(p.price)}</span><span class="stock">${p.stock>5?'● In stock':'● Low stock'} · ${p.stock}</span></div>
      <div class="micro">${safe(p.badge)}</div>
    </div>
    <button class="plus" data-add="${p.id}" aria-label="Add ${safe(p.name)} to order">+</button>
  </article>`;
}

function hero(){
  return `<section class="hero">
    <div class="heroCopy">
      <span class="heroTag">🇬🇭 Parts for Ghana · Pickup in Spintex</span>
      <h1>Find the right part.<br><em>Without guessing.</em></h1>
      <p>Choose your vehicle, compare parts and send your order directly to us on WhatsApp.</p>
      <div class="row">
        <button class="btn red" data-page="vehicle">Select My Car</button>
        <button class="btn ghost" data-page="catalogue">Browse Parts</button>
      </div>
    </div>
    <div class="heroPhotos">
      <div class="heroPhoto large">${image(IMG.spark,'Spark plugs')}</div>
      <div class="heroPhoto">${image(IMG.brake,'Brake pad')}</div>
      <div class="heroPhoto">${image(IMG.oil,'Oil filter')}</div>
    </div>
  </section>`;
}

function trustStrip(){
  return `<section class="trustStrip">
    <div><b>✓ Fitment first</b><small>OE/VIN check before sale</small></div>
    <div><b>◉ WhatsApp orders</b><small>Quick human confirmation</small></div>
    <div><b>📍 Spintex pickup</b><small>${safe(CFG.hours)}</small></div>
    <div><b>★ Quality sourcing</b><small>Brand & supplier traceability</small></div>
  </section>`;
}

function home(){
  const popular=parts.slice(0,6);
  app.innerHTML=appHeader()+`<main class="page homePage">
    <div class="search">
      <span>⌕</span><input id="homeSearch" placeholder="Search part, brand or part number…" value="${safe(S.query)}">
      <button data-search aria-label="Search">Search</button>
    </div>
    ${hero()}
    ${trustStrip()}
    ${S.vehicle?`<section class="selectedCar"><div><span class="okDot">✓</span><div><b>Your vehicle</b><small>${safe(vehicleLabel())}</small></div></div><button data-page="vehicle">Change</button></section>`:''}
    <section class="sec">
      <div class="head"><div><span class="sectionKicker">SHOP</span><h2>Shop by category</h2></div><button class="link" data-page="catalogue">View all</button></div>
      <div class="cats">${cats.slice(1).map(c=>`<button class="cat" data-cat="${c[0]}"><div class="catImg">${image(c[2],c[0])}</div><b>${c[0]}</b></button>`).join('')}</div>
    </section>
    <section class="sec">
      <div class="head"><div><span class="sectionKicker">POPULAR</span><h2>Parts customers ask for</h2></div><button class="link" data-page="catalogue">All products</button></div>
      <div class="products">${popular.map(productCard).join('')}</div>
    </section>
    <section class="sec fitmentPromise">
      <div class="promiseIcon">✓</div>
      <div><span class="sectionKicker">PARTFIT CHECK</span><h2>We verify before you collect.</h2>
      <p>For safety-critical or vehicle-specific parts, the order is not treated as confirmed until the exact OE reference, VIN or installed-part specification is checked.</p></div>
    </section>
    <section class="sec how">
      <div class="head"><div><span class="sectionKicker">SIMPLE</span><h2>How ordering works</h2></div></div>
      <div class="steps">
        <div><b>1</b><h3>Select your car</h3><p>Make, model, year and engine.</p></div>
        <div><b>2</b><h3>Choose your parts</h3><p>See price, stock and fitment status.</p></div>
        <div><b>3</b><h3>Send on WhatsApp</h3><p>We confirm fitment and pickup.</p></div>
      </div>
    </section>
    <section class="sec pickupCard">
      <div class="pin">📍</div>
      <div><span class="sectionKicker">COLLECTION</span><h2>${safe(CFG.pickup)}</h2><p>${safe(CFG.addr)}<br>${safe(CFG.hours)}</p></div>
      <button class="btn wa" data-help>Ask on WhatsApp</button>
    </section>
    <p class="imageCredit">Demo product imagery is category-accurate and CC-licensed from Wikimedia Commons. Before commercial launch, replace it with the exact supplier SKU photography for every sellable reference.</p>
  </main>
  <button class="installBtn" data-install>＋ Install PartFit</button>${nav('home')}`;
}

function vehicle(){
  app.innerHTML=appHeader('Find Parts for Your Car','Make · Model · Year · Engine')+`<main class="page">
    <section class="vehicleIntro">
      <span class="sectionKicker">FITMENT</span><h1>Tell us what you drive.</h1>
      <p>We use this to highlight likely matches. Exact fitment is still confirmed against the manufacturer/OE reference before sale.</p>
    </section>
    <section class="card form vehicleForm">
      <div class="field"><label>Make</label><select id="make">${Object.keys(cars).map(x=>`<option ${S.vehicle?.make===x?'selected':''}>${x}</option>`).join('')}</select></div>
      <div class="field"><label>Model</label><select id="model"></select></div>
      <div class="grid2">
        <div class="field"><label>Year</label><select id="year">${Array.from({length:2026-2005+1},(_,i)=>2026-i).map(x=>`<option ${String(S.vehicle?.year)===String(x)?'selected':''}>${x}</option>`).join('')}</select></div>
        <div class="field"><label>Engine / variant <small>(recommended)</small></label><select id="engine">
          ${['Not sure','1.0 Petrol','1.2 Petrol','1.3 Petrol','1.4 Petrol','1.6 Petrol','1.8 Petrol','2.0 Petrol','Diesel / other'].map(x=>`<option ${S.vehicle?.engine===x?'selected':''}>${x}</option>`).join('')}
        </select></div>
      </div>
      <button class="btn red full" data-save-car>Show Parts for My Car</button>
    </section>
    <section class="sec card whyCar"><b>Why we ask</b><p>Spark plugs, filters, belts and especially brake pads can look similar while having different dimensions or specifications. Selecting the vehicle reduces mistakes; OE/VIN confirmation closes the gap.</p></section>
    <section class="sec"><div class="head"><div><span class="sectionKicker">POPULAR</span><h2>Brands we are building around</h2></div></div>
      <div class="brandGrid">${Object.keys(cars).map(b=>`<button data-brand="${b}"><b>${b}</b><small>${cars[b].slice(0,3).join(' · ')}</small></button>`).join('')}</div>
    </section>
  </main>${nav('vehicle')}`;
  fillModels();
}

function fillModels(){
  const m=document.getElementById('make'), d=document.getElementById('model');
  if(!m||!d)return;
  const wanted=S.vehicle?.make===m.value?S.vehicle.model:null;
  d.innerHTML=cars[m.value].map(x=>`<option ${wanted===x?'selected':''}>${x}</option>`).join('');
}

function filteredParts(){
  let list=S.cat==='All'?parts:parts.filter(p=>p.cat===S.cat);
  const q=S.query.trim().toLowerCase();
  if(q) list=list.filter(p=>[p.name,p.short,p.brand,p.cat,p.summary].join(' ').toLowerCase().includes(q));
  return list;
}

function catalogue(){
  const list=filteredParts();
  app.innerHTML=appHeader('Parts Catalogue',S.vehicle?vehicleLabel():'Search · compare · order')+`<main class="page">
    <div class="catalogTools">
      <div class="search"><span>⌕</span><input id="catalogSearch" placeholder="Search parts or part number…" value="${safe(S.query)}"><button data-search>Search</button></div>
      <div class="chips">${['All',...cats.slice(1).map(x=>x[0])].map(x=>`<button class="chip ${S.cat===x?'on':''}" data-cat="${x}">${x}</button>`).join('')}</div>
    </div>
    ${S.vehicle?`<div class="selectedCar compact"><div><span class="okDot">✓</span><div><b>Checking against</b><small>${safe(vehicleLabel())}</small></div></div><button data-page="vehicle">Change</button></div>`:`<div class="fitCallout"><b>Want fitment guidance?</b><span>Select your car first.</span><button data-page="vehicle">Select vehicle</button></div>`}
    <div class="resultLine"><b>${list.length} products</b><span>Prices shown are current demo catalogue values.</span></div>
    <section class="products catalogueGrid">${list.length?list.map(productCard).join(''):'<div class="card empty"><h2>No results</h2><p>Try another part number or category.</p><button class="btn red" data-clear-search>Clear filters</button></div>'}</section>
  </main>${nav('catalogue')}`;
}

function product(id){
  const p=parts.find(x=>x.id===id)||parts[0];
  S.selected=p.id;
  const f=fitInfo(p);
  app.innerHTML=appHeader('Product Details',p.short)+`<main class="page">
    <article class="card detail">
      <div class="detailVisual">${image(p.img,p.name)}</div>
      <div class="detailBody">
        <div class="brandRow"><span>${safe(p.brand)}</span><span class="stock">${p.stock>5?'● In stock':'● Low stock'} · ${p.stock}</span></div>
        <h1>${safe(p.name)}</h1>
        <div class="detailNo">Part / Ref: <b>${safe(p.short)}</b></div>
        <div class="detailPrice">${money(p.price)}</div>
        <button class="detailShare" data-share-product="${p.id}" aria-label="Share this part">🔗 Share this part</button>
        <div class="fitBox ${f.cls}">
          <div class="fitIcon">${f.icon}</div><div><b>${safe(f.text)}</b><p>${safe(vehicleLabel())}</p><small>${safe(p.badge)} · ${safe(p.origin)}</small>${S.vehicle?`<button class="fitChangeCar" data-page="vehicle">Change vehicle</button>`:`<button class="btn red fitPickCar" data-page="vehicle">Select my car</button>`}</div>
        </div>
        <div class="specGrid">${p.specs.map(s=>`<div><small>${safe(s[0])}</small><b>${safe(s[1])}</b></div>`).join('')}</div>
        <section class="description"><h2>Product information</h2><p>${safe(p.summary)}</p></section>
        <section class="sourceBox"><b>Fitment / data source</b><p>${safe(p.origin)}</p><a href="${p.source}" target="_blank" rel="noopener">Open reference ↗</a></section>
        <section class="collectionMini"><span>📍</span><div><b>Available for collection</b><small>${safe(CFG.pickup)} · ${safe(CFG.hours)}</small></div></section>
        <div class="stickyActions"><button class="btn red" data-add="${p.id}" data-order>Add to Order</button><button class="btn wa" data-product-wa="${p.id}">WhatsApp</button></div>
        <p class="photoNote">${safe(p.imageNote)}. For launch, use the exact supplier image for this exact SKU.</p>
      </div>
    </article>
  </main>${nav('catalogue')}`;
}

function order(){
  const total=S.cart.reduce((a,i)=>a+(parts.find(p=>p.id===i.id)?.price||0)*i.qty,0);
  app.innerHTML=appHeader('Your Order','Review · details · WhatsApp')+`<main class="page">
    ${!S.cart.length?`<div class="card empty"><div class="emptyIcon">🛒</div><h2>Your order is empty</h2><p>Choose the parts you need and we will prepare a WhatsApp order summary.</p><button class="btn red" data-page="catalogue">Browse Parts</button></div>`:`
    <section class="card orderList">
      ${S.cart.map(i=>{const p=parts.find(x=>x.id===i.id);return `<div class="cartItem">
        <div class="cartImg">${image(p.img,p.name)}</div>
        <div><b>${safe(p.name)}</b><small>${safe(p.short)}</small><div class="qty"><button data-qty="-1" data-id="${p.id}">−</button><b>${i.qty}</b><button data-qty="1" data-id="${p.id}">+</button></div></div>
        <strong>${money(p.price*i.qty)}</strong>
      </div>`}).join('')}
    </section>
    <section class="sec card summary">
      <div class="sum"><span>Items</span><b>${cartCount()}</b></div>
      <div class="sum"><span>Delivery</span><b>Quoted if needed</b></div>
      <div class="sum total"><span>Order total</span><span class="price">${money(total)}</span></div>
      <small>Final availability and vehicle fitment are confirmed before collection/payment.</small>
    </section>
    <section class="sec card form">
      <div class="sectionKicker">CUSTOMER DETAILS</div>
      <div class="field"><label>Full name *</label><input id="name" autocomplete="name" placeholder="Your full name"></div>
      <div class="field"><label>Phone / WhatsApp *</label><input id="phone" inputmode="tel" autocomplete="tel" placeholder="+233 …"></div>
      <div class="field"><label>Email <small>(optional)</small></label><input id="email" type="email" autocomplete="email" placeholder="you@example.com"></div>
      <div class="field"><label>Vehicle</label><input value="${safe(vehicleLabel())}" readonly></div>
      <div class="field"><label>Order note <small>(optional)</small></label><textarea id="note" placeholder="VIN, engine code, urgency, special request…"></textarea></div>
      <div class="field"><label>Fulfilment</label>
        <label class="location selected"><input type="radio" name="fulfil" value="Pickup — Spintex" checked> <span><b>Pick up at Spintex</b><small>${safe(CFG.addr)}</small></span></label>
        <label class="location"><input type="radio" name="fulfil" value="Delivery quote"> <span><b>Request delivery quote</b><small>Accra / Tema — confirmed on WhatsApp</small></span></label>
      </div>
      <label class="confirmLine"><input id="confirmFit" type="checkbox" checked> <span>I understand final fitment is confirmed before the order is fulfilled.</span></label>
      <button class="btn wa full big" data-submit>Send Order on WhatsApp</button>
      <p class="secureNote">🔒 Your form stays on this device until you choose to send it through WhatsApp.</p>
    </section>`}
  </main>${nav('order')}`;
}

function add(id,toOrder=false){
  let i=S.cart.find(x=>x.id===id);
  i?i.qty++:S.cart.push({id,qty:1});
  save();
  say('Added to order');
  toOrder?order():catalogue();
}

function whatsapp(text){
  window.open('https://wa.me/'+CFG.wa+'?text='+encodeURIComponent(text),'_blank','noopener');
}

function shareProduct(id){
  const p=parts.find(x=>x.id===id); if(!p) return;
  const url=location.origin+location.pathname+'#product:'+encodeURIComponent(id);
  const data={title:'PartFit — '+p.name,text:p.name+' · PartFit Ghana',url};
  if(navigator.share){ navigator.share(data).catch(()=>{}); return; }
  if(navigator.clipboard&&navigator.clipboard.writeText){ navigator.clipboard.writeText(url).then(()=>say('Link copied')).catch(()=>say('Copy this link: '+url)); return; }
  say('Copy this link: '+url);
}

function render(page){
  ({home,vehicle,catalogue,order}[page]||home)();
  window.scrollTo({top:0,behavior:'instant'});
}

function doSearch(inputId){
  S.query=(document.getElementById(inputId)?.value||'').trim();
  S.cat='All';
  catalogue();
}

document.addEventListener('change',e=>{
  if(e.target.id==='make') fillModels();
  if(e.target.name==='fulfil'){
    document.querySelectorAll('.location').forEach(x=>x.classList.toggle('selected',x.contains(e.target)));
  }
});

document.addEventListener('keydown',e=>{
  if(e.key==='Enter' && e.target.id==='homeSearch') doSearch('homeSearch');
  if(e.key==='Enter' && e.target.id==='catalogSearch') doSearch('catalogSearch');
});

document.addEventListener('click',e=>{
  const pg=e.target.closest('[data-page]');
  if(pg){render(pg.dataset.page);return}

  const cat=e.target.closest('[data-cat]');
  if(cat){S.cat=cat.dataset.cat==='All Parts'?'All':cat.dataset.cat;S.query='';catalogue();return}

  const productEl=e.target.closest('[data-product]');
  if(productEl&&!e.target.closest('[data-add]')){product(productEl.dataset.product);return}

  const addBtn=e.target.closest('[data-add]');
  if(addBtn){add(addBtn.dataset.add,addBtn.hasAttribute('data-order'));return}

  const q=e.target.closest('[data-qty]');
  if(q){
    const i=S.cart.find(x=>x.id===q.dataset.id);
    if(i){i.qty+=Number(q.dataset.qty);if(i.qty<1)S.cart=S.cart.filter(x=>x.id!==q.dataset.id);save();order()}
    return;
  }

  if(e.target.closest('[data-save-car]')){
    S.vehicle={
      make:document.getElementById('make').value,
      model:document.getElementById('model').value,
      year:document.getElementById('year').value,
      engine:document.getElementById('engine').value
    };
    save();S.query='';S.cat='All';catalogue();return;
  }

  const b=e.target.closest('[data-brand]');
  if(b){
    document.getElementById('make').value=b.dataset.brand;
    fillModels();
    document.querySelector('.vehicleForm')?.scrollIntoView({behavior:'smooth'});
    return;
  }

  if(e.target.closest('[data-search]')){
    doSearch(document.getElementById('catalogSearch')?'catalogSearch':'homeSearch');return;
  }

  if(e.target.closest('[data-clear-search]')){S.query='';S.cat='All';catalogue();return}

  if(e.target.closest('[data-help]')){
    whatsapp('Hello PartFit Ghana, I need help finding the correct car part'+(S.vehicle?' for my '+vehicleLabel():'.')+' Please assist me.');
    return;
  }

  const pw=e.target.closest('[data-product-wa]');
  if(pw){
    const p=parts.find(x=>x.id===pw.dataset.productWa);
    whatsapp(`Hello PartFit Ghana, please confirm availability and fitment for ${p.name} (${p.short})${S.vehicle?' for my '+vehicleLabel():''}.`);
    return;
  }

  const sp=e.target.closest('[data-share-product]');
  if(sp){shareProduct(sp.dataset.shareProduct);return}

  if(e.target.closest('[data-submit]')){
    const name=document.getElementById('name').value.trim();
    const phone=document.getElementById('phone').value.trim();
    const email=document.getElementById('email').value.trim();
    const note=document.getElementById('note').value.trim();
    const fulfil=document.querySelector('input[name="fulfil"]:checked')?.value||'Pickup — Spintex';
    if(!name||!phone){say('Enter your name and phone');return}
    const lines=S.cart.map(i=>{const p=parts.find(x=>x.id===i.id);return `• ${p.name} (${p.short}) ×${i.qty} — ${money(p.price*i.qty)}`});
    const total=S.cart.reduce((a,i)=>a+parts.find(p=>p.id===i.id).price*i.qty,0);
    whatsapp(`Hello PartFit Ghana, I would like to place an order.\n\n${lines.join('\n')}\n\nTotal: ${money(total)}\nVehicle: ${vehicleLabel()}\nName: ${name}\nPhone: ${phone}${email?'\nEmail: '+email:''}\nFulfilment: ${fulfil}${note?'\nNote: '+note:''}\n\nPlease confirm final fitment, stock and collection/delivery details.`);
    return;
  }

  if(e.target.closest('[data-install]')){
    if(S.prompt){S.prompt.prompt()}
    else alert(/iphone|ipad|ipod/i.test(navigator.userAgent)?'On iPhone Safari: tap Share, then Add to Home Screen.':'Open your browser menu and choose Install app or Add to Home screen.');
  }
});

window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();S.prompt=e});
if('serviceWorker' in navigator){window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(()=>{}));}
home();
