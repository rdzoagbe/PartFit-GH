(() => {
  const K={accounts:'pf5_accounts',session:'pf5_session',orders:'pf5_orders'};
  const read=(k,f)=>{try{return JSON.parse(localStorage.getItem(k)||JSON.stringify(f))}catch{return f}};
  const write=(k,v)=>localStorage.setItem(k,JSON.stringify(v));
  const escPhone=p=>String(p||'').replace(/[^0-9+]/g,'').slice(0,20);
  const now=()=>new Date().toISOString();
  const uid=()=>crypto.randomUUID?crypto.randomUUID():'id-'+Date.now()+'-'+Math.random().toString(16).slice(2);
  async function digest(v){const b=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(v));return [...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,'0')).join('')}
  function ref(){const d=new Date(),ds=d.toISOString().slice(2,10).replaceAll('-','');return `PF-${ds}-${Math.floor(1000+Math.random()*9000)}`}
  function accounts(){return read(K.accounts,{})}
  function orders(){return read(K.orders,[])}
  function sessionEmail(){return localStorage.getItem(K.session)||''}
  function current(){const a=accounts(),e=sessionEmail();return e&&a[e]?{id:a[e].id,email:e,name:a[e].name,phone:a[e].phone}:null}
  function expire(list){let dirty=false;for(const o of list){if(o.status==='approved'&&o.reservationExpiresAt&&Date.parse(o.reservationExpiresAt)<Date.now()){o.status='expired';o.events.push({at:now(),type:'expired',note:'Approval reservation expired automatically in demo mode.'});dirty=true}}if(dirty)write(K.orders,list);return list}
  const allowed={submitted:['reviewing','rejected','cancelled'],reviewing:['approved','rejected','cancelled'],approved:['ready_for_collection','expired','cancelled'],ready_for_collection:['collected','expired','cancelled'],collected:[],rejected:[],cancelled:[],expired:[]};
  window.PartFitDemoStore={
    mode:'demo',
    async init(){return {mode:'demo',configured:false}},
    async signUp({name,phone,email,password}){email=String(email||'').trim().toLowerCase();name=String(name||'').trim();phone=escPhone(phone);if(name.length<2||!email.includes('@')||phone.length<8)throw Error('Complete your name, email and phone.');if(String(password||'').length<8)throw Error('Use at least 8 characters for the password.');const a=accounts();if(a[email])throw Error('An account with this email already exists on this device.');a[email]={id:uid(),name,phone,passwordHash:await digest(password),vehicles:[],createdAt:now()};write(K.accounts,a);localStorage.setItem(K.session,email);return current()},
    async signIn({email,password}){email=String(email||'').trim().toLowerCase();const a=accounts(),u=a[email];if(!u||u.passwordHash!==await digest(String(password||'')))throw Error('Email or password is incorrect.');localStorage.setItem(K.session,email);return current()},
    async signOut(){localStorage.removeItem(K.session)},
    async currentUser(){return current()},
    async updateProfile({name,phone}){const e=sessionEmail(),a=accounts();if(!e||!a[e])throw Error('Sign in first.');a[e].name=String(name||'').trim().slice(0,80);a[e].phone=escPhone(phone);write(K.accounts,a);return current()},
    async getVehicles(){const e=sessionEmail(),a=accounts();return e&&a[e]?[...(a[e].vehicles||[])]:[]},
    async saveVehicle(v){const e=sessionEmail(),a=accounts();if(!e||!a[e])throw Error('Sign in to save a vehicle.');const car={id:uid(),make:String(v.make||'').slice(0,40),model:String(v.model||'').slice(0,60),year:String(v.year||'').slice(0,4),engine:String(v.engine||'').slice(0,80),vin:String(v.vin||'').toUpperCase().replace(/[^A-HJ-NPR-Z0-9]/g,'').slice(0,17),createdAt:now()};if(!car.make||!car.model)throw Error('Vehicle make and model are required.');a[e].vehicles=a[e].vehicles||[];a[e].vehicles.push(car);write(K.accounts,a);return car},
    async deleteVehicle(id){const e=sessionEmail(),a=accounts();if(!e||!a[e])return;a[e].vehicles=(a[e].vehicles||[]).filter(v=>v.id!==id);write(K.accounts,a)},
    async createOrder({vehicleLabel,items}){const u=current();if(!u)throw Error('Sign in before submitting a tracked order.');if(!Array.isArray(items)||!items.length)throw Error('Your basket is empty.');let total=0;const clean=[];for(const item of items){const p=parts.find(x=>x.id===item.productId);const q=Math.max(1,Math.min(20,Number(item.quantity)||1));if(!p||p.stock<q)throw Error(`Not enough stock for ${p?.name||'one item'}.`);total+=Number(p.price)*q;clean.push({productId:p.id,name:p.name,partNumber:p.short,quantity:q,provisionalUnitPrice:Number(p.price),confirmedUnitPrice:null,fitmentStatus:'pending'})}const o={id:uid(),publicRef:ref(),customerId:u.id,email:u.email,name:u.name,phone:u.phone,vehicleLabel:String(vehicleLabel||'Not supplied').slice(0,180),status:'submitted',paymentMethod:'pay_on_pickup',provisionalTotal:total,confirmedTotal:null,createdAt:now(),updatedAt:now(),approvedAt:null,readyAt:null,collectedAt:null,reservationExpiresAt:null,items:clean,events:[{at:now(),type:'submitted',note:'Order submitted. No payment due.'}]};const list=orders();list.unshift(o);write(K.orders,list);return structuredClone(o)},
    async getOrders(){const u=current();if(!u)return [];return expire(orders()).filter(o=>o.customerId===u.id).map(o=>structuredClone(o))},
    async getOrder(publicRef){const u=current();if(!u)return null;const o=expire(orders()).find(x=>x.publicRef===String(publicRef||'').toUpperCase()&&x.customerId===u.id);return o?structuredClone(o):null},
    async staffGetOrders(){return expire(orders()).map(o=>structuredClone(o))},
    async staffUpdateOrder({publicRef,status,confirmedTotal,note}){const list=expire(orders()),o=list.find(x=>x.publicRef===publicRef);if(!o)throw Error('Order not found.');if(status!==o.status&&!allowed[o.status]?.includes(status))throw Error(`Invalid transition from ${o.status}.`);if(status==='approved'){const amt=Number(confirmedTotal);if(!Number.isFinite(amt)||amt<=0)throw Error('Enter a valid confirmed amount.');o.confirmedTotal=Math.round(amt*100)/100;o.approvedAt=now();o.reservationExpiresAt=new Date(Date.now()+(Number(PARTFIT_CONFIG.approvalReservationHours)||48)*3600000).toISOString()}if(status==='ready_for_collection')o.readyAt=now();if(status==='collected')o.collectedAt=now();const before=o.status;o.status=status;o.updatedAt=now();o.events.push({at:now(),type:status,from:before,to:status,note:String(note||'').slice(0,500)});write(K.orders,list);return structuredClone(o)},
    async resetDemo(){localStorage.removeItem(K.accounts);localStorage.removeItem(K.session);localStorage.removeItem(K.orders)}
  };
})();