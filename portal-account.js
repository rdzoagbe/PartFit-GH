/* PartFit Ghana — V6 account portal
   Real (local-only, prototype) sign-up / sign-in + one-tap Demo Customer.
   Local accounts are a prototype convenience only. Production authentication
   must run through the Supabase/RLS backend described in BACKEND_SETUP.md —
   passwords here are lightly obfuscated for local storage, not secured. */
(() => {
  const P=window.PFV3;
  const K={accounts:'pfAccountsV6',session:'pfAuthV6'};
  const demo={name:'Demo Customer',email:'demo.customer@partfit.local',phone:'055 000 0000'};

  /* ---- local auth store ---- */
  const read=(k,f)=>{try{return JSON.parse(localStorage.getItem(k)||JSON.stringify(f))}catch{return f}};
  const accounts=()=>read(K.accounts,[]);
  const saveAccounts=a=>localStorage.setItem(K.accounts,JSON.stringify(a));
  const obfuscate=s=>{let h=5381;for(let i=0;i<s.length;i++)h=((h*33)^s.charCodeAt(i))>>>0;return h.toString(16)};
  const isDemo=()=>sessionStorage.getItem('pfSafeDemo')==='1';
  const sessionEmail=()=>localStorage.getItem(K.session);
  const realUser=()=>{const e=sessionEmail();return e?accounts().find(a=>a.email===e)||null:null};

  /* ---- override identity used across the app ---- */
  P.profile=()=>isDemo()?demo:realUser();
  P.signed=()=>isDemo()||!!realUser();

  const validEmail=e=>/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);

  function setError(msg){const el=document.querySelector('.pfErr');if(el)el.textContent=msg||''}

  /* ---- auth screen ---- */
  function authPage(mode){
    const signup=mode==='signup';
    app.innerHTML=appHeader('My PartFit',signup?'Create your free account':'Sign in to PartFit')+`<main class="page">
      <section class="pfAuth">
        <span class="pfFlag">🇬🇭 PartFit Ghana</span>
        <h1>${signup?'Create your<br>PartFit account.':'Welcome back.'}</h1>
        <p>${signup?'Save your vehicle, keep order history together and follow every approval to pickup.':'Sign in to see your orders, saved vehicles and pickup tracking.'}</p>
        <div class="pfAuthPerks"><span>🚗 My Garage</span><span>🧾 Order history</span><span>📦 Pickup tracking</span></div>
      </section>

      <div class="pfTabs">
        <button class="${signup?'':'on'}" data-page="login">Sign in</button>
        <button class="${signup?'on':''}" data-page="signup">Create account</button>
      </div>

      <section class="card pfAuthCard">
        ${signup?`<div class="field"><label>Full name</label><input id="auName" autocomplete="name" placeholder="e.g. Ama Mensah"></div>`:''}
        <div class="field"><label>Email</label><input id="auEmail" type="email" autocomplete="email" inputmode="email" placeholder="you@example.com"></div>
        ${signup?`<div class="field"><label>Phone / WhatsApp</label><input id="auPhone" type="tel" inputmode="tel" autocomplete="tel" placeholder="+233 …"></div>`:''}
        <div class="field"><label>Password</label><div class="pfPwField"><input id="auPass" type="password" autocomplete="${signup?'new-password':'current-password'}" placeholder="${signup?'At least 6 characters':'Your password'}"><button type="button" class="toggle" data-pw-toggle>Show</button></div></div>
        <div class="pfErr" role="alert"></div>
        <button class="btn red full big" data-auth-submit="${signup?'signup':'signin'}">${signup?'Create account':'Sign in'}</button>
        <p class="pfSwap">${signup?'Already have an account? <button data-page="login">Sign in</button>':'New to PartFit? <button data-page="signup">Create an account</button>'}</p>

        <div class="pfDivider">or</div>
        <button class="btn outlineNavy full" data-demo-customer>Continue as Demo Customer</button>

        <div class="pfProto"><span class="ico">🔒</span><div><b>Local prototype accounts</b><span>Details stay on this device only. Real authentication is enabled later through the secured Supabase backend.</span></div></div>
      </section>
      ${P.footer()}</main>${nav('account')}`;
  }

  /* ---- dashboard ---- */
  function orderRow(o){return `<div class="pfRow"><div class="ico">📦</div><div class="mid"><b>${P.esc(o.id)}</b><small>${P.fmt(o.createdAt)} · ${P.esc(P.steps[o.stage]||P.steps[0])}</small></div><div class="amt">${money(Number(o.total||0))}</div><button class="go" data-v3-track="${P.esc(o.id)}">Track</button></div>`}
  function carRow(c,i){return `<div class="pfRow"><div class="ico">🚗</div><div class="mid"><b>${P.esc(c.make+' '+c.model)}</b><small>${P.esc([c.year,c.engine].filter(Boolean).join(' · '))}</small></div><button class="go" data-garage-use="${i}">Shop</button><button class="rm" data-garage-remove="${i}" aria-label="Remove vehicle">×</button></div>`}

  function account(){
    if(!P.signed())return authPage('signin');
    const p=P.profile(),orders=P.userOrders(),cars=P.cars(),demoMode=isDemo();
    const open=orders.filter(x=>x.stage<4).length;
    app.innerHTML=appHeader('My PartFit','Profile · garage · orders')+`<main class="page">
      <section class="pfDashHero">
        <div class="av">${P.esc(P.initials(p.name))}</div>
        <div class="who"><span class="badge">${demoMode?'DEMO SESSION':'PARTFIT MEMBER'}</span><h1>${P.esc(p.name)}</h1><small>${P.esc(demoMode?'Safe test session · no real credentials':(p.email||''))}</small></div>
        <button class="pfSignout" data-signout>${demoMode?'Exit demo':'Sign out'}</button>
      </section>

      <section class="pfStats">
        <button data-page="orders"><b>${orders.length}</b><small>Orders</small></button>
        <button data-page="orders"><b>${open}</b><small>Open</small></button>
        <button data-page="account"><b>${cars.length}</b><small>Garage</small></button>
      </section>

      <div class="pfDashGrid">
        <section class="card pfPanel">
          <div class="head"><h2>Recent orders</h2><button class="link" data-page="orders">View all</button></div>
          ${orders.length?orders.slice(0,3).map(orderRow).join(''):`<div class="empty"><div class="ico">🧾</div><p>No orders yet.</p><button class="btn red" data-page="catalogue">Browse parts</button></div>`}
        </section>
        <section class="card pfPanel">
          <div class="head"><h2>My Garage</h2>${S.vehicle?`<button class="link" data-garage-save>+ Save current car</button>`:''}</div>
          ${cars.length?cars.map(carRow).join(''):`<div class="empty"><div class="ico">🚗</div><p>No vehicles saved yet.</p><button class="btn outlineNavy" data-page="vehicle">Select my car</button></div>`}
        </section>
      </div>

      <div class="pfQuick">
        <button data-page="catalogue"><span>▦</span>Browse parts</button>
        <button data-page="request"><span>⌕</span>Request a part</button>
        <button data-page="track"><span>📦</span>Track order</button>
        <button data-page="contact"><span>◉</span>Contact us</button>
      </div>
      ${P.footer()}</main>${nav('account')}`;
  }

  P.register('login',()=>authPage('signin'));
  P.register('signup',()=>authPage('signup'));
  P.register('account',account);

  /* ---- interactions ---- */
  document.addEventListener('click',e=>{
    const tog=e.target.closest('[data-pw-toggle]');
    if(tog){const inp=document.getElementById('auPass');if(inp){const show=inp.type==='password';inp.type=show?'text':'password';tog.textContent=show?'Hide':'Show'}return}

    const sub=e.target.closest('[data-auth-submit]');
    if(sub){
      const mode=sub.dataset.authSubmit;
      const val=id=>(document.getElementById(id)?.value||'').trim();
      const email=val('auEmail').toLowerCase(),pass=document.getElementById('auPass')?.value||'';
      if(mode==='signup'){
        const name=val('auName'),phone=val('auPhone');
        if(!name)return setError('Please enter your name.');
        if(!validEmail(email))return setError('Enter a valid email address.');
        if(!phone)return setError('Add a phone / WhatsApp number.');
        if(pass.length<6)return setError('Password must be at least 6 characters.');
        const list=accounts();
        if(list.some(a=>a.email===email))return setError('An account with that email already exists. Try signing in.');
        list.push({name,email,phone,ph:obfuscate(pass),createdAt:new Date().toISOString()});
        saveAccounts(list);localStorage.setItem(K.session,email);
        say('Account created');account();
      }else{
        if(!validEmail(email))return setError('Enter a valid email address.');
        const acc=accounts().find(a=>a.email===email);
        if(!acc||acc.ph!==obfuscate(pass))return setError('Email or password is incorrect.');
        localStorage.setItem(K.session,email);
        say('Signed in');account();
      }
      return;
    }

    if(e.target.closest('[data-demo-customer]')){sessionStorage.setItem('pfSafeDemo','1');say('Demo customer ready');account();return}

    if(e.target.closest('[data-signout]')){sessionStorage.removeItem('pfSafeDemo');localStorage.removeItem(K.session);say('Signed out');render('home');return}

    if(e.target.closest('[data-garage-save]')){
      if(!S.vehicle)return say('Select a vehicle first');
      const c=P.cars();
      if(!c.some(x=>JSON.stringify(x)===JSON.stringify(S.vehicle))){c.push(S.vehicle);P.write(P.keys.cars,c)}
      account();return;
    }
    const u=e.target.closest('[data-garage-use]');
    if(u){const c=P.cars()[Number(u.dataset.garageUse)];if(c){S.vehicle=c;save();render('catalogue')}return}
    const r=e.target.closest('[data-garage-remove]');
    if(r){const c=P.cars();c.splice(Number(r.dataset.garageRemove),1);P.write(P.keys.cars,c);account();return}
  },true);

  document.addEventListener('input',e=>{if(e.target.closest('.pfAuthCard'))setError('')});
})();
