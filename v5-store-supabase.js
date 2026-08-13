(() => {
  const C=window.PARTFIT_CONFIG||{},SKEY='pf5_supabase_session';
  const url=()=>String(C.supabaseUrl||'').replace(/\/$/,'');
  const key=()=>String(C.supabaseAnonKey||'');
  const configured=()=>/^https:\/\/.+\.supabase\.co$/i.test(url())&&key().length>20;
  const readSession=()=>{try{return JSON.parse(localStorage.getItem(SKEY)||'null')}catch{return null}};
  const saveSession=s=>s?localStorage.setItem(SKEY,JSON.stringify(s)):localStorage.removeItem(SKEY);
  const headers=(token,extra={})=>({'apikey':key(),'Content-Type':'application/json',...(token?{'Authorization':'Bearer '+token}:{}),...extra});
  async function parse(r){const text=await r.text();let d=null;try{d=text?JSON.parse(text):null}catch{d=text}if(!r.ok)throw Error(d?.msg||d?.message||d?.error_description||d?.error||`Request failed (${r.status})`);return d}
  async function auth(path,opts={}){return parse(await fetch(url()+'/auth/v1'+path,{...opts,headers:headers(opts.token,opts.headers)}))}
  async function refresh(){const s=readSession();if(!s?.refresh_token)return null;try{const n=await auth('/token?grant_type=refresh_token',{method:'POST',body:JSON.stringify({refresh_token:s.refresh_token})});saveSession(n);return n}catch{saveSession(null);return null}}
  async function session(){let s=readSession();if(!s)return null;const exp=Number(s.expires_at||0)*1000;if(exp&&exp<Date.now()+60000)s=await refresh();return s}
  async function rest(path,opts={}){const s=await session();if(!s?.access_token)throw Error('Sign in first.');return parse(await fetch(url()+'/rest/v1'+path,{...opts,headers:headers(s.access_token,{Prefer:opts.prefer||'',...(opts.headers||{})})}))}
  const enc=v=>encodeURIComponent(v);
  const mapOrder=o=>({id:o.id,publicRef:o.public_ref,customerId:o.customer_id,vehicleLabel:o.vehicle_label,status:o.status,paymentMethod:o.payment_method,provisionalTotal:Number(o.provisional_total||0),confirmedTotal:o.confirmed_total==null?null:Number(o.confirmed_total),createdAt:o.created_at,updatedAt:o.updated_at,approvedAt:o.approved_at,readyAt:o.ready_at,collectedAt:o.collected_at,reservationExpiresAt:o.reservation_expires_at,items:(o.order_items||[]).map(i=>({productId:i.product_id,name:i.product_name,partNumber:i.part_number,quantity:i.quantity,provisionalUnitPrice:Number(i.provisional_unit_price),confirmedUnitPrice:i.confirmed_unit_price==null?null:Number(i.confirmed_unit_price),fitmentStatus:i.fitment_status})),events:(o.order_events||[]).map(e=>({at:e.created_at,type:e.event_type,from:e.from_status,to:e.to_status,note:e.note}))});
  window.PartFitSupabaseStore={
    mode:'production',
    async init(){return {mode:'production',configured:configured()}},
    configured,
    async signUp({name,phone,email,password}){if(!configured())throw Error('Supabase is not configured.');const d=await auth('/signup',{method:'POST',body:JSON.stringify({email:String(email).trim().toLowerCase(),password:String(password),data:{full_name:String(name).trim(),phone:String(phone).trim()}})});if(d?.access_token)saveSession(d);return d?.access_token?this.currentUser():{needsConfirmation:true,email:String(email).trim().toLowerCase()}},
    async signIn({email,password}){if(!configured())throw Error('Supabase is not configured.');const d=await auth('/token?grant_type=password',{method:'POST',body:JSON.stringify({email:String(email).trim().toLowerCase(),password:String(password)})});saveSession(d);return this.currentUser()},
    async signOut(){const s=readSession();if(s?.access_token){try{await auth('/logout',{method:'POST',token:s.access_token})}catch{}}saveSession(null)},
    async currentUser(){const s=await session();if(!s?.access_token)return null;const u=await auth('/user',{method:'GET',token:s.access_token});return {id:u.id,email:u.email,name:u.user_metadata?.full_name||u.email?.split('@')[0]||'Customer',phone:u.user_metadata?.phone||''}},
    async updateProfile({name,phone}){const s=await session();if(!s?.access_token)throw Error('Sign in first.');const d=await auth('/user',{method:'PUT',token:s.access_token,body:JSON.stringify({data:{full_name:String(name).trim(),phone:String(phone).trim()}})});await rest(`/profiles?id=eq.${enc(d.id)}`,{method:'PATCH',body:JSON.stringify({full_name:String(name).trim(),phone:String(phone).trim()}),prefer:'return=minimal'});return this.currentUser()},
    async getVehicles(){const d=await rest('/vehicles?select=*&order=created_at.desc',{method:'GET'});return d.map(v=>({id:v.id,make:v.make,model:v.model,year:String(v.model_year||''),engine:v.engine||'',vin:v.vin||'',createdAt:v.created_at}))},
    async saveVehicle(v){const u=await this.currentUser();if(!u)throw Error('Sign in first.');const body={owner_id:u.id,make:String(v.make||'').trim(),model:String(v.model||'').trim(),model_year:Number(v.year)||null,engine:String(v.engine||'').trim()||null,vin:String(v.vin||'').trim().toUpperCase()||null};const d=await rest('/vehicles',{method:'POST',body:JSON.stringify(body),prefer:'return=representation'});return d[0]},
    async deleteVehicle(id){await rest(`/vehicles?id=eq.${enc(id)}`,{method:'DELETE',prefer:'return=minimal'})},
    async createOrder({vehicleLabel,items}){const payload=items.map(i=>({product_id:i.productId,quantity:Math.max(1,Math.min(20,Number(i.quantity)||1))}));const d=await rest('/rpc/submit_order',{method:'POST',body:JSON.stringify({p_vehicle_label:String(vehicleLabel||'').slice(0,180),p_items:payload}),prefer:'return=representation'});return this.getOrder(d.public_ref||d?.[0]?.public_ref)},
    async getOrders(){const d=await rest('/orders?select=*,order_items(*),order_events(*)&order=created_at.desc',{method:'GET'});return d.map(mapOrder)},
    async getOrder(publicRef){const d=await rest(`/orders?public_ref=eq.${enc(String(publicRef||'').toUpperCase())}&select=*,order_items(*),order_events(*)`,{method:'GET'});return d[0]?mapOrder(d[0]):null},
    async isStaff(){try{const u=await this.currentUser();if(!u)return false;const d=await rest(`/staff_roles?user_id=eq.${enc(u.id)}&select=role`,{method:'GET'});return !!d.length}catch{return false}},
    async staffGetOrders(){if(!await this.isStaff())throw Error('Staff access required.');const d=await rest('/orders?select=*,order_items(*),order_events(*)&order=created_at.desc',{method:'GET'});return d.map(mapOrder)},
    async staffUpdateOrder({publicRef,status,confirmedTotal,note}){if(!await this.isStaff())throw Error('Staff access required.');const d=await rest('/rpc/staff_set_order_status',{method:'POST',body:JSON.stringify({p_public_ref:publicRef,p_status:status,p_confirmed_total:confirmedTotal==null?null:Number(confirmedTotal),p_note:String(note||'').slice(0,500),p_reservation_hours:Number(C.approvalReservationHours)||48}),prefer:'return=representation'});return mapOrder(d)},
    async resetDemo(){throw Error('Reset is only available in demo mode.')}
  };
})();