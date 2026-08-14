/* PartFit Ghana — V6 landing page (rebuilt, cohesive mobile-first) */
(() => {
  const P=window.PFV3;

  function homePage(){
    const popular=parts.slice(0,6);
    const signed=P.signed(), p=signed?P.profile():null;
    const open=signed?P.userOrders().filter(x=>x.stage<4).length:0;
    const carCount=P.cars().length;

    const vehicleBlock=S.vehicle
      ? `<div class="pfCarDock"><div class="ico">🚗</div><div class="txt"><b>${safe(vehicleLabel())}</b><small>Fitment is checked against this vehicle</small></div><button data-page="catalogue">Shop parts</button></div>`
      : `<div class="pfCarPick"><div class="ico">🚗</div><div class="txt"><b>Add your vehicle</b><small>See likely-fit parts and reduce ordering mistakes</small></div><button data-page="vehicle">Select car</button></div>`;

    const flow=[
      ['1','Submit order','Add parts and send — no payment yet.'],
      ['2','We verify','Exact fitment &amp; stock are confirmed.'],
      ['3','Approved','You get the final price to pay.'],
      ['4','Collect &amp; pay','Pay when you pick up at Spintex.']
    ];

    const promo=signed
      ? `<section class="sec pfPromo"><div><span class="sectionKicker" style="color:#ffd0d3">YOUR PARTFIT</span><h2>Welcome back, ${safe((p.name||'there').split(' ')[0])}.</h2><p>${open} open order${open===1?'':'s'} · ${carCount} saved vehicle${carCount===1?'':'s'}</p></div><button class="btn dark" data-page="account">My account</button></section>`
      : `<section class="sec pfPromo"><div><span class="sectionKicker" style="color:#ffd0d3">FREE ACCOUNT</span><h2>Save your car, orders &amp; tracking.</h2><p>Create an account so repeat ordering is faster and every approval stays in one place.</p></div><button class="btn dark" data-page="signup">Create account</button></section>`;

    app.innerHTML=appHeader('PartFit Ghana','Right Part. Right Car.')+`<main class="page pfHome">
      <section class="pfHero">
        <span class="pfFlag">🇬🇭 PartFit Ghana · Spintex pickup</span>
        <h1>The right part.<br><em>For the right car.</em></h1>
        <p>Pick your vehicle, order in minutes, and pay only when you collect — after we confirm exact fitment, stock and the final price.</p>
        <div class="pfHeroCta">
          <button class="btn red big" data-page="vehicle">Select my vehicle</button>
          <button class="btn glass big" data-page="catalogue">Browse parts</button>
        </div>
        <div class="pfHeroStats">
          <div><b>OE / VIN</b><small>Fitment checked</small></div>
          <div><b>Pay later</b><small>Only at pickup</small></div>
          <div><b>Spintex</b><small>Local collection</small></div>
        </div>
      </section>

      <div class="search"><span>⌕</span><input id="homeSearch" placeholder="Search part, brand or part number…" value="${safe(S.query||'')}"><button data-search aria-label="Search">Search</button></div>

      ${vehicleBlock}

      <section class="sec">
        <div class="head"><div><span class="sectionKicker">HOW IT WORKS</span><h2>Order now, pay at pickup</h2></div></div>
        <div class="pfFlow">${flow.map((f,i)=>`<article><div class="n">${f[0]}</div><h3>${f[1]}</h3><p>${f[2]}</p>${i<3?'<span class="line">→</span>':''}</article>`).join('')}</div>
      </section>

      <section class="sec">
        <div class="head"><div><span class="sectionKicker">SHOP</span><h2>Shop by category</h2></div><button class="link" data-page="catalogue">View all</button></div>
        <div class="cats">${cats.slice(1).map(c=>`<button class="cat" data-cat="${c[0]}"><div class="catImg">${image(c[2],c[0])}</div><b>${c[0]}</b></button>`).join('')}</div>
      </section>

      <section class="sec">
        <div class="head"><div><span class="sectionKicker">POPULAR</span><h2>Parts customers ask for</h2></div><button class="link" data-page="catalogue">All products</button></div>
        <div class="products">${popular.map(productCard).join('')}</div>
      </section>

      <section class="sec pfPromise">
        <div class="ico">✓</div>
        <div><span class="sectionKicker">PARTFIT CHECK</span><h2>We verify before you collect.</h2><p>Brake pads, filters, belts and plugs are never approved on looks alone. We confirm the exact OE reference, VIN or installed-part spec before your order is released.</p></div>
      </section>

      ${promo}

      <section class="sec pfPickup">
        <div class="pin">📍</div>
        <div><span class="sectionKicker">COLLECTION</span><h2>${safe(CFG.pickup||'PartFit Ghana — Spintex Pickup')}</h2><p>${safe(CFG.addr||'Spintex Road, Accra')}<br>${safe(CFG.hours||'Mon–Sat · 8:30 AM–6:00 PM')}</p></div>
        <button class="btn wa" data-help>Ask on WhatsApp</button>
      </section>

      <p class="pfNote">Demo product imagery is category-accurate and CC-licensed from Wikimedia Commons. Before commercial launch, replace it with the exact supplier SKU photography for every sellable reference.</p>
      ${P.footer()}
    </main>
    <button class="installBtn" data-install>＋ Install PartFit</button>${nav('home')}`;
  }

  P.register('home',homePage);
})();
