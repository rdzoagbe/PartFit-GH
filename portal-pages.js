(() => {
  const P=window.PFV3;
  P.register('catalogue',()=>{P.v2.catalogue();P.addFooter()});
  P.register('product',id=>{P.v2.product(id);P.addFooter()});
  P.register('request',()=>{P.v2.request();P.addFooter()});
  P.register('vehicle',()=>P.v2.vehicle());
  P.register('order',()=>{
    P.v2.cart();
    const f=document.querySelector('.form'),p=P.profile();
    if(f&&P.signed()){
      for(const [id,val] of [['name',p.name],['phone',p.phone],['email',p.email]]){const el=document.getElementById(id);if(el&&!el.value)el.value=val||''}
      f.insertAdjacentHTML('beforebegin',`<div class="v3OrderLogin">✓ Ordering as <b>${P.esc(p.name)}</b>. Approval will appear in My Orders.</div>`);
    } else if(f){f.insertAdjacentHTML('beforebegin',`<div class="v3OrderLogin guest">Ordering as guest. <button data-page="signup">Create an account</button> to keep order history.</div>`)}
    P.cartEnhance?.();
  });
})();
