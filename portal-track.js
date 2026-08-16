(() => {
  const P=window.PFV3;
  const SB=()=>window.PFSB&&window.PFSB.configured()&&window.PFSB.signedIn();

  const demo=()=>({id:'PF-DEMO-2048',createdAt:new Date(Date.now()-86400000).toISOString(),stage:Number(localStorage.getItem('pfDemoStageV3')||2),vehicle:'Toyota Corolla 2013 · 1.6 Petrol',provisionalTotal:295,confirmedTotal:285,items:[{name:'DENSO K16TT Spark Plug',qty:4},{name:'Spin-On Engine Oil Filter',qty:1},{name:'Engine Air Filter',qty:1}],demo:true});

  function lookup(){
    app.innerHTML=appHeader('Track an Order','Order reference · status')+`<main class="page"><section class="lookupHero"><span class="sectionKicker">TRACKING</span><h1>Where is my order?</h1><p>Enter your PartFit reference.</p></section><section class="card lookupCard"><div class="field"><label>Order reference</label><input id="v3TrackRef" placeholder="PF-260814-A1B2C3"></div><button class="btn red full" data-v3-track-submit>Track Order</button><button class="textAction" data-v3-demo>View demo tracking</button></section>${P.footer()}</main>${nav('orders')}`;
  }
  function loading(id){
    const skStep=`<div class="skRow skWrap"><span class="sk" style="width:34px;height:34px;border-radius:50%;flex:none"></span><span class="mid"><span class="sk skLine" style="width:55%"></span><span class="sk skLine" style="width:30%;height:10px;margin-top:6px"></span></span></div>`;
    app.innerHTML=appHeader('Track Order',id)+`<main class="page"><section class="v3TrackHero"><div><span class="sectionKicker">ORDER STATUS</span><h1>${P.esc(id)}</h1><p>Loading…</p></div></section><section class="card v3Timeline">${skStep+skStep+skStep+skStep+skStep}</section>${P.footer()}</main>${nav('orders')}`;
  }
  function errorState(id,msg){
    app.innerHTML=appHeader('Track Order',id)+`<main class="page"><section class="lookupHero"><span class="sectionKicker">TRACKING</span><h1>Couldn’t load that order</h1><p>${P.esc(msg||'')}</p></section><section class="card lookupCard"><button class="btn red full" data-v3-track="${P.esc(id)}">Try again</button><button class="textAction" data-page="orders">Back to my orders</button></section>${P.footer()}</main>${nav('orders')}`;
  }
  function paySection(o){
    if(o.demo) return '';
    const enabled=window.PFSB&&window.PFSB.paymentsEnabled&&window.PFSB.paymentsEnabled();
    const amt=Number(o.confirmedTotal??o.amountDue??0);
    const dest=o.fulfilmentType==='delivery'?'delivery':'collection';
    if(o.paymentStatus==='paid') return `<section class="v3PayBox paid"><span class="pOk">✓</span><div><b>Payment received</b><small>${money(amt)} paid · awaiting ${dest}</small></div></section>`;
    if(o.status!=='approved') return '';
    if(!enabled) return `<section class="v3PayBox soon"><div><b>Online payment coming soon</b><small>For now you pay on ${dest} once the order is approved.</small></div></section>`;
    if(o.paymentStatus==='pending') return `<section class="v3PayBox pending"><div><b>Confirming your payment…</b><small>This can take a few seconds after you approve on your phone.</small></div><button class="btn outlineNavy" data-v3-track="${P.esc(o.id)}">Refresh</button></section>`;
    return `<section class="v3PayBox"><div><b>Pay with Mobile Money</b><small>Approved total ${money(amt)} · MTN · Telecel · AirtelTigo</small></div><button class="btn red" data-pay-momo="${P.esc(o.id)}">Pay ${money(amt)}</button></section>`;
  }
  function renderTrack(o){
    const s=Math.min(4,Number(o.stage||0));
    app.innerHTML=appHeader('Track Order',o.id)+`<main class="page">
      <section class="v3TrackHero"><div><span class="sectionKicker">${o.demo?'DEMO TRACKING':'ORDER STATUS'}</span><h1>${P.esc(o.id)}</h1><p>${P.fmt(o.createdAt)} · Pay on Pickup</p></div><div><small>Current status</small><b>${P.esc(P.steps[s])}</b></div></section>
      <section class="card v3Timeline">${P.steps.map((x,i)=>`<div class="v3Step ${i<=s?'done':''} ${i===s?'current':''}"><span>${i<=s?'✓':i+1}</span><div><b>${P.esc(x)}</b><small>${i<s?'Completed':i===s?'Current':'Pending'}</small></div></div>`).join('')}</section>
      <section class="v3ApprovalAmount"><div><small>${o.confirmedTotal!=null?'Approved total':'Provisional basket total'}</small><b>${money(Number(o.confirmedTotal??o.provisionalTotal??o.total??0))}</b></div><p>${o.confirmedTotal!=null?'This is your final amount, including delivery if selected.':'No payment is due yet. Wait for PartFit approval and the confirmed price.'}</p></section>
      ${paySection(o)}
      ${o.demo?`<section class="prototypeControl"><div><b>Prototype preview</b><p>Advance the sample order to see each customer status.</p></div><button class="btn dark" data-v3-advance>Advance Status</button></section>`:''}
      ${P.footer()}</main>${nav('orders')}`;
  }
  function page(id=''){
    if(!id){lookup();return}
    id=String(id).toUpperCase().trim();
    if(id==='PF-DEMO-2048'){renderTrack(demo());return}
    if(SB()){
      loading(id);
      window.PFSB.getOrder(id).then(o=>{if(o)renderTrack(window.PFSB.normOrder(o));else{say('Order not found on your account');lookup()}}).catch(e=>errorState(id,e.message||'Network error'));
      return;
    }
    const o=P.orders().find(x=>x.id===id);
    if(!o){say('Order not found on this device');lookup();return}
    renderTrack(o);
  }
  P.register('track',page);
  document.addEventListener('click',e=>{
    if(e.target.closest('[data-v3-demo]')){render('track','PF-DEMO-2048');return}
    if(e.target.closest('[data-v3-track-submit]')){const id=(document.getElementById('v3TrackRef')?.value||'').trim().toUpperCase();id?render('track',id):say('Enter an order reference');return}
    if(e.target.closest('[data-v3-advance]')){localStorage.setItem('pfDemoStageV3',String((Number(localStorage.getItem('pfDemoStageV3')||2)+1)%5));renderTrack(demo());return}
    const pay=e.target.closest('[data-pay-momo]');
    if(pay){
      const ref=pay.dataset.payMomo; pay.disabled=true; const orig=pay.textContent; pay.textContent='Starting…';
      window.PFSB.startPayment(ref).then(r=>{
        if(r&&r.authorization_url){ location.href=r.authorization_url; }
        else { say('Could not start payment'); pay.disabled=false; pay.textContent=orig; }
      }).catch(err=>{ say(err.message||'Could not start payment'); pay.disabled=false; pay.textContent='Try again'; });
      return;
    }
  },true);
})();
