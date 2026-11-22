/* PartFit Ghana — public landing page.
   Replaces the old one-shot welcome overlay (portal-welcome.js) with a real
   page a signed-out visitor can read, scroll, share and link to. It explains
   the fitment-first promise, what pickup and delivery actually cost, and
   finishes with account setup inline — the sign-up form posts through the same
   [data-auth-submit] handler and validation as the account page, so there is
   one auth implementation, not two.
   Signed-out visitors with no deep link land here; signed-in visitors go to
   their home feed as before. */
(() => {
  const P = window.PFV3; if (!P) return;
  const SB = () => window.PFSB && window.PFSB.configured();
  const signedIn = () => (SB() && window.PFSB.signedIn()) || P.signed();

  const STEPS = [
    ['Tell us your car', 'Make, model, year and engine. Everything you see is filtered to what fits it.'],
    ['Pick the part', 'Search by part name or OE / part number. Each item shows how confident the fit is.'],
    ['We confirm it', 'A person checks exact fitment and stock, then sends you the final price — including delivery if you chose it.'],
    ['Pay and get it', 'Pay by Mobile Money once approved, then collect at Spintex or have it delivered in Accra.']
  ];

  const WHY = [
    ['Fitment is checked, not guessed', 'Someone confirms the part against your vehicle before you pay anything.'],
    ['Nothing is charged up front', 'You only pay after we confirm the part is right and in stock.'],
    ['Mobile Money', 'MTN, Telecel and AirtelTigo, paid after approval — not on a promise.'],
    ['Local and reachable', 'Spintex collection, delivery across Greater Accra, and a real person on WhatsApp.']
  ];

  // The fees shown here are the same ones the server charges: the cart syncs
  // DELIVERY.zones from the delivery_zones table on load.
  function feeTable() {
    const zones = (typeof DELIVERY !== 'undefined' && DELIVERY.zones) || [];
    const rows = zones.slice(0, 4).map(z =>
      `<div class="lpFeeRow"><span>${P.esc(z.label)}</span><b class="mono">${money(z.fee)}</b></div>`).join('');
    const more = zones.length > 4 ? `<button class="lpFeeMore" data-page="delivery">See all ${zones.length} areas →</button>` : '';
    return `<div class="lpFees">
      <div class="lpFeeRow free"><span><b>Collect at Spintex</b><small>Mon–Sat, 8:30am–6pm</small></span><b class="mono">Free</b></div>
      ${rows}${more}</div>`;
  }

  function accountCard() {
    if (signedIn()) {
      const name = (P.profile() || {}).name || '';
      return `<section class="card lpAccount" id="lpAccount">
        <h2>You’re signed in${name ? ', ' + P.esc(name.split(' ')[0]) : ''}</h2>
        <p>Your garage and order history are ready.</p>
        <div class="lpAccBtns">
          <button class="btn red big" data-page="catalogue">Browse parts</button>
          <button class="btn outlineNavy big" data-page="orders">My orders</button>
        </div></section>`;
    }
    return `<section class="card lpAccount" id="lpAccount">
      <span class="sectionKicker">GET SET UP</span>
      <h2>Create your free account</h2>
      <p>It takes a minute and it is what lets us confirm fitment for <em>your</em> car, keep your order history, and tell you the moment a part is approved. No payment details needed.</p>
      <div class="field"><label for="auName">Full name</label><input id="auName" autocomplete="name" placeholder="e.g. Ama Mensah"></div>
      <div class="field"><label for="auPhone">Phone / WhatsApp</label><input id="auPhone" type="tel" inputmode="tel" autocomplete="tel" placeholder="+233 …"></div>
      <div class="field"><label for="auEmail">Email</label><input id="auEmail" type="email" inputmode="email" autocomplete="email" placeholder="you@example.com"></div>
      <div class="field"><label for="auPass">Password</label><div class="pfPwField"><input id="auPass" type="password" autocomplete="new-password" placeholder="At least 6 characters"><button type="button" class="toggle" data-pw-toggle>Show</button></div></div>
      <div class="pfErr" role="alert"></div>
      <button class="btn red full big" data-auth-submit="signup" data-landing-signup>Create account</button>
      <p class="pfSwap">Already have an account? <button data-page="login">Sign in</button></p>
      <p class="lpSmall">By creating an account you agree to our <button class="lpLink" data-page="terms">terms</button> and <button class="lpLink" data-page="privacy">privacy notice</button>.</p>
    </section>`;
  }

  function page() {
    app.innerHTML = appHeader('PartFit Ghana', 'Car parts that fit, in Accra') + `<main class="page lpPage">
      <section class="lpHero">
        <img class="lpLogo" src="./logo.svg" alt="PartFit Ghana" width="104" height="60">
        <span class="lpTag">Accra · Spintex pickup &amp; Greater Accra delivery</span>
        <h1>The right part for <em>your exact car.</em></h1>
        <p class="lpLede">Stop guessing from a photo. Tell us what you drive, we confirm the exact fit and stock, and you pay only once it is approved.</p>
        <div class="lpCtas">
          <button class="btn red big" data-landing-start>Create free account</button>
          <button class="btn outlineNavy big" data-page="catalogue">Browse parts first</button>
        </div>
        <button class="lpVehicle" data-page="vehicle">
          <span class="lpPlate"><span>GR·24</span></span>
          <span class="lpVt"><b>Add your vehicle</b><small>Make · model · year — start here</small></span>
          <span class="lpChev" aria-hidden="true">→</span>
        </button>
      </section>

      <section class="lpBlock">
        <span class="sectionKicker">HOW IT WORKS</span>
        <h2>Four steps, no surprises</h2>
        <ol class="lpSteps">${STEPS.map((s, i) => `<li><span class="lpNum">${i + 1}</span><div><b>${s[0]}</b><p>${s[1]}</p></div></li>`).join('')}</ol>
      </section>

      <section class="lpBlock">
        <span class="sectionKicker">WHAT IT COSTS TO GET IT</span>
        <h2>Collection is free. Delivery is by area.</h2>
        <p class="lpBlockLede">You see the delivery fee before you submit, and it is added to your final price — never a surprise at the door.</p>
        ${feeTable()}
      </section>

      <section class="lpBlock">
        <span class="sectionKicker">WHY PARTFIT</span>
        <h2>Built for how parts actually get bought here</h2>
        <div class="lpWhy">${WHY.map(w => `<div class="lpWhyCard"><b>${w[0]}</b><p>${w[1]}</p></div>`).join('')}</div>
      </section>

      ${accountCard()}

      <section class="lpBlock lpHelp">
        <h2>Questions first?</h2>
        <p>Read the <button class="lpLink" data-page="faq">common questions</button>, check <button class="lpLink" data-page="fitment">how fitment is confirmed</button>, or <button class="lpLink" data-page="contact">talk to us</button>.</p>
      </section>
      ${P.footer()}</main>${nav('home')}`;

    // Quote the fees the server will charge, not the data.js fallback. If they
    // differ, re-render so the page never shows a price we will not honour.
    if (P.syncZones) P.syncZones(changed => { if (changed && P.cur === 'landing') page(); });
  }
  P.register('landing', page);

  document.addEventListener('click', e => {
    // Hero CTA: jump to the sign-up card already on this page, or straight to
    // the catalogue for someone who is signed in.
    if (e.target.closest('[data-landing-start]')) {
      if (signedIn()) { render('catalogue'); return; }
      const card = document.getElementById('lpAccount');
      if (card) {
        card.scrollIntoView({ behavior: 'smooth', block: 'start' });
        setTimeout(() => document.getElementById('auName')?.focus(), 420);
      } else render('signup');
      return;
    }
    // A new account made here should finish setup by adding a vehicle, since
    // every fitment answer depends on it.
    if (e.target.closest('[data-landing-signup]')) { P.returnTo = 'vehicle'; return; }
  }, true);

  // Set the same intent as soon as the visitor starts filling the form, so it
  // does not depend on this listener running before portal-account.js's.
  document.addEventListener('focusin', e => {
    if (P.cur === 'landing' && e.target.closest('#lpAccount')) P.returnTo = 'vehicle';
  }, true);

  // First paint: a signed-out visitor who did not deep-link starts here.
  const h = (location.hash || '').slice(1).split(':')[0];
  if (!signedIn() && (!h || h === 'home' || h === 'start')) render('landing');
})();
