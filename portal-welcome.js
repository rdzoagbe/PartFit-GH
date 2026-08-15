/* PartFit Ghana — V6 welcome / landing entry
   Vehicle-first splash → Create account / Sign in / Browse as guest.
   Catalogue stays open to everyone; the account gate lives at reserve/track
   (see portal-paypickup.js and portal-orders-page.js). Shows once per session
   for signed-out visitors. */
(() => {
  const P=window.PFV3;
  const SEEN='pfEnteredV6';
  let el;

  function build(){
    el=document.createElement('div');
    el.className='pfWelcome';
    el.setAttribute('role','dialog');
    el.setAttribute('aria-modal','true');
    el.setAttribute('aria-label','Welcome to PartFit');
    el.innerHTML=`
      <div class="wTop">
        <div class="wMark"><img class="wLogo" src="./logo.svg" alt="" width="70" height="40"><span class="wWord"><b>Part<span>Fit</span></b><span class="tb"></span></span></div>
        <button class="wSkip" data-w="signin">Sign in</button>
      </div>
      <div class="wBody">
        <span class="wTag"><span class="tri"></span> Accra · Spintex pickup</span>
        <h1>The right part<br>for <em>your exact car.</em></h1>
        <p class="wLede">Tell us what you drive — we confirm the exact fit and stock, then you pay only when you collect at Spintex.</p>
        <button class="wVehicle" data-w="vehicle">
          <span class="plate"><span>GR·24</span></span>
          <span class="vt"><b>Add your vehicle</b><small>Make · model · year — start here</small></span>
          <span class="chev">→</span>
        </button>
        <div class="wActions">
          <button class="btn red big" data-w="signup">Create free account</button>
          <button class="btn ghost big" data-w="signin" style="background:rgba(255,255,255,.12);color:#fff;border:1px solid rgba(255,255,255,.34)">Sign in</button>
        </div>
        <button class="wGuest" data-w="guest">Just browsing? Explore the catalogue →</button>
      </div>
      <div class="wPerks">
        <div><b>✓ Fitment</b><small>Checked, not guessed</small></div>
        <div><b>₵ Pay later</b><small>Only at pickup</small></div>
        <div><b>📍 Spintex</b><small>Local collection</small></div>
      </div>`;
    document.body.appendChild(el);
    document.body.style.overflow='hidden';   /* lock scroll behind the overlay */
    el.addEventListener('click',e=>{
      const b=e.target.closest('[data-w]');if(!b)return;
      const w=b.dataset.w;
      dismiss();
      if(w==='signup') render('signup');
      else if(w==='signin') render('login');
      else if(w==='vehicle') render('vehicle');
      /* guest → just dismiss and stay on home */
    });
    /* focus trap + Escape (Escape = browse as guest) */
    el.addEventListener('keydown',e=>{
      if(e.key==='Escape'){e.preventDefault();dismiss();return}
      if(e.key!=='Tab')return;
      const f=[...el.querySelectorAll('button,[href],[tabindex]:not([tabindex="-1"])')].filter(n=>!n.disabled&&n.offsetParent!==null);
      if(!f.length)return;
      const first=f[0],last=f[f.length-1];
      if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}
      else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}
    });
  }
  function focusFirst(){ if(el){const b=el.querySelector('.wVehicle')||el.querySelector('button'); if(b) try{b.focus();}catch{} } }

  function dismiss(){
    sessionStorage.setItem(SEEN,'1');
    if(el){el.classList.add('gone');}
    document.body.style.overflow='';   /* release the scroll lock */
  }
  function show(){
    if(P.signed())return;              /* signed-in users skip the splash */
    if(!el)build();
    sessionStorage.removeItem(SEEN);
    el.classList.remove('gone');
    document.body.style.overflow='hidden';  /* lock scroll behind the overlay */
    focusFirst();
  }
  P.showWelcome=show;

  // Don't cover a shared deep link (e.g. #product:…) with the welcome splash —
  // land the visitor on the content they were sent to.
  const deepLinked = (() => { const h = (location.hash || '').slice(1).split(':')[0]; return h && h !== 'home'; })();
  if(!P.signed() && sessionStorage.getItem(SEEN)!=='1' && !deepLinked){
    build();
    focusFirst();
  }
})();
