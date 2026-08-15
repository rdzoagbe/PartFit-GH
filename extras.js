/* PartFit Ghana production UX enhancements */
(() => {
  const baseNav = nav;
  const baseHome = home;
  const baseCatalogue = catalogue;
  const baseProduct = product;

  function routeHash(page){
    const hashes={home:'home',vehicle:'vehicle',catalogue:'parts',request:'request',order:'order'};
    const h=hashes[page]||'home';
    if(location.hash !== '#'+h) history.replaceState(null,'','#'+h);
  }

  nav = function(active){
    const items=[
      ['home','⌂','Home'],
      ['vehicle','🚗','My Car'],
      ['catalogue','▦','Parts'],
      ['request','⌕','Request'],
      ['order','🧾','Order']
    ];
    return `<nav class="bottom">${items.map(x=>`<button class="${active===x[0]?'on':''}" data-page="${x[0]}"><span>${x[1]}</span>${x[2]}</button>`).join('')}</nav>`;
  };

  const baseRender = render;
  render = function(page){
    const pages={home,vehicle,catalogue,request:requestPart,order};
    (pages[page]||home)();
    routeHash(page in pages?page:'home');
    window.scrollTo({top:0,behavior:'instant'});
  };

  function imageDisclosure(){
    return `<div class="referencePhotoBadge" title="The image shows the correct part type/category. Replace it with the supplier's exact SKU photo before commercial launch.">Reference photo</div>`;
  }

  function requestCard(context='general'){
    const copy=context==='catalogue'
      ? 'Can’t see the part you need? Send us the vehicle and any OE/part number you have.'
      : 'Not sure which reference you need? We can identify it from your vehicle, OE number or a photo.';
    return `<section class="sec requestCard">
      <div class="requestIcon">⌕</div>
      <div><span class="sectionKicker">PART REQUEST</span><h2>Can’t find it?</h2><p>${copy}</p></div>
      <button class="btn dark" data-page="request">Request a part</button>
    </section>`;
  }

  home = function(){
    baseHome();
    const anchor=document.querySelector('.imageCredit');
    if(anchor) anchor.insertAdjacentHTML('beforebegin', requestCard('home') + `<section class="sec businessStrip">
      <div><b>Clear pricing</b><small>GH₵ prices shown before WhatsApp confirmation.</small></div>
      <div><b>Human fitment check</b><small>OE/VIN confirmation where the part is vehicle-specific.</small></div>
      <div><b>Local collection</b><small>Spintex pickup with delivery quote available.</small></div>
    </section>`);
  };

  catalogue = function(){
    baseCatalogue();
    const result=document.querySelector('.resultLine');
    if(result){
      result.insertAdjacentHTML('afterend', `<section class="fitLegend">
        <b>Fitment status</b>
        <span class="fitPill catalog">✓ Manufacturer application match</span>
        <span class="fitPill check">! Confirm OE / VIN</span>
        <span class="fitPill neutral">i No fitment claim</span>
      </section>`);
    }
    const productsEl=document.querySelector('.catalogueGrid');
    if(productsEl) productsEl.insertAdjacentHTML('afterend', requestCard('catalogue'));
    document.querySelectorAll('.productImg').forEach(el=>{
      if(!el.querySelector('.referencePhotoBadge')) el.insertAdjacentHTML('beforeend',imageDisclosure());
    });
  };

  product = function(id){
    baseProduct(id);
    const visual=document.querySelector('.detailVisual');
    if(visual&&!visual.querySelector('.referencePhotoBadge')) visual.insertAdjacentHTML('beforeend',imageDisclosure());
    const actions=document.querySelector('.stickyActions');
    if(actions){
      actions.insertAdjacentHTML('beforebegin', `<section class="exactCheck">
        <div class="exactCheckIcon">✓</div>
        <div><b>Exact-fit confirmation before fulfilment</b><p>For brake pads, filters, belts and plugs, we verify the OE/manufacturer reference against your exact vehicle before the order is released.</p></div>
      </section>`);
      actions.insertAdjacentHTML('afterend', `<button class="linkBtn" data-page="request">Need us to identify a different part?</button>`);
    }
  };

  function requestPart(){
    const v=S.vehicle||{};
    const pf=(window.PFV3&&window.PFV3.prefillRequest)||{}; if(window.PFV3) window.PFV3.prefillRequest=null;
    app.innerHTML=appHeader('Request a Part','Vehicle · OE number · photo')+`<main class="page requestPage">
      <section class="vehicleIntro requestIntro">
        <span class="sectionKicker">PARTFIT ASSIST</span>
        <h1>Tell us what you need.</h1>
        <p>If the exact reference is not in the catalogue yet, send the details below. We’ll use the vehicle, OE/part number and any photo you have to identify the right item.</p>
      </section>
      <section class="card form requestForm">
        <div class="field"><label>Part needed *</label><input id="reqPart" value="${safe(pf.part||'')}" placeholder="e.g. front brake pads, oil filter, 6PK belt"></div>
        <div class="grid2">
          <div class="field"><label>Make</label><input id="reqMake" value="${safe(v.make||'')}" placeholder="Toyota"></div>
          <div class="field"><label>Model</label><input id="reqModel" value="${safe(v.model||'')}" placeholder="Corolla"></div>
        </div>
        <div class="grid2">
          <div class="field"><label>Year</label><input id="reqYear" inputmode="numeric" value="${safe(v.year||'')}" placeholder="2014"></div>
          <div class="field"><label>Engine / variant</label><input id="reqEngine" value="${safe(v.engine||'')}" placeholder="1.6 Petrol / engine code"></div>
        </div>
        <div class="field"><label>OE / part number <small>(if known)</small></label><input id="reqOE" placeholder="Number printed on the old part or box"></div>
        <div class="field"><label>VIN / chassis <small>(optional)</small></label><input id="reqVIN" placeholder="Useful for exact fitment"></div>
        <div class="field"><label>Quantity</label><select id="reqQty"><option>1</option><option>2</option><option>3</option><option>4</option><option>5+</option></select></div>
        <div class="field"><label>Notes</label><textarea id="reqNote" placeholder="Front/rear, dimensions, brand preference, urgency, anything printed on the old part…"></textarea></div>
        <div class="photoHelp"><span>📷</span><div><b>Have a photo?</b><p>After WhatsApp opens, attach clear photos of the old part, box label or VIN plate. This reduces identification mistakes.</p></div></div>
        ${honeypotField()}<button class="btn wa full big" data-request-submit>Send Request on WhatsApp</button>
        <p class="secureNote">No account required. The form is turned into a WhatsApp message only when you tap Send.</p>
      </section>
      <section class="sec card requestTips">
        <h2>Best information to send</h2>
        <div class="tipGrid">
          <div><b>1</b><span>Vehicle make, model & year</span></div>
          <div><b>2</b><span>Engine size/code if known</span></div>
          <div><b>3</b><span>OE or old-part number</span></div>
          <div><b>4</b><span>Clear photo / dimensions</span></div>
        </div>
      </section>
    </main>${nav('request')}`;
  }
  window.requestPart=requestPart;

  document.addEventListener('click',e=>{
    const btn=e.target.closest('[data-request-submit]');
    if(!btn) return;
    e.preventDefault();
    if(typeof honeypotTripped==='function'&&honeypotTripped()){say('Request sent');return}
    if(typeof submitAllowed==='function'&&!submitAllowed('request')){say('Please wait a moment before sending again');return}
    const val=id=>(document.getElementById(id)?.value||'').trim();
    const part=val('reqPart');
    if(!part){const el=document.getElementById('reqPart');if(typeof fieldError==='function'){fieldError(el,'Tell us which part you need');say('Please check the highlighted field');}else say('Tell us which part you need');if(el){el.focus();el.scrollIntoView({behavior:'smooth',block:'center'});}return}
    const make=val('reqMake'), model=val('reqModel'), year=val('reqYear'), engine=val('reqEngine');
    const oe=val('reqOE'), vin=val('reqVIN'), qty=val('reqQty')||'1', note=val('reqNote');
    const msg=[
      'Hello PartFit Ghana, I would like help identifying a part.',
      '',
      `Part needed: ${part}`,
      `Quantity: ${qty}`,
      `Vehicle: ${[make,model,year,engine].filter(Boolean).join(' · ')||'Not supplied'}`,
      `OE / part number: ${oe||'Not supplied'}`,
      `VIN / chassis: ${vin||'Not supplied'}`,
      note?`Notes: ${note}`:'',
      '',
      'I can attach photos in WhatsApp if needed. Please confirm the exact fitment, availability and price.'
    ].filter(Boolean).join('\n');
    whatsapp(msg);
  });

  document.addEventListener('click',e=>{
    if(!e.target.closest('[data-submit]')) return;
    const log=JSON.parse(localStorage.getItem('pfOrderLog')||'[]');
    log.unshift({at:new Date().toISOString(),items:cartCount(),vehicle:vehicleLabel()});
    localStorage.setItem('pfOrderLog',JSON.stringify(log.slice(0,5)));
  },true);

  const incoming=location.hash.replace('#','');
  const page={home:'home',vehicle:'vehicle',parts:'catalogue',request:'request',order:'order'}[incoming];
  if(page) render(page); else home();
})();
