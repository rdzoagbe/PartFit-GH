-- =============================================================================
-- PartFit Ghana — one-shot Supabase setup (idempotent, safe to re-run).
-- Paste this whole file into the Supabase SQL Editor and press Run ONCE.
-- It creates every table, policy, function, index and seed in the right order.
-- (Equivalent to running supabase-schema.sql, v5-products.sql, v5-rpc.sql,
--  v5-indexes.sql and v5-grants.sql in order — combined here so ordering and
--  partial re-runs cannot break it.)
-- =============================================================================
create extension if not exists pgcrypto;

-- ---------- Tables ----------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  phone text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.staff_roles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('staff','manager','admin')),
  created_at timestamptz not null default now()
);

create table if not exists public.vehicles (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  make text not null, model text not null, model_year int,
  engine text, vin text,
  created_at timestamptz not null default now()
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  public_ref text not null unique,
  customer_id uuid not null references auth.users(id),
  vehicle_id uuid references public.vehicles(id),
  vehicle_label text,
  status text not null default 'submitted' check (status in ('submitted','reviewing','approved','ready_for_collection','collected','rejected','cancelled','expired')),
  payment_method text not null default 'pay_on_pickup' check (payment_method='pay_on_pickup'),
  provisional_total numeric(12,2) not null default 0,
  confirmed_total numeric(12,2),
  approved_at timestamptz, ready_at timestamptz, collected_at timestamptz,
  reservation_expires_at timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id text not null,
  product_name text not null,
  part_number text,
  quantity int not null check (quantity > 0 and quantity <= 100),
  provisional_unit_price numeric(12,2) not null,
  confirmed_unit_price numeric(12,2),
  fitment_status text not null default 'pending' check (fitment_status in ('pending','confirmed','rejected'))
);

create table if not exists public.order_events (
  id bigint generated always as identity primary key,
  order_id uuid not null references public.orders(id) on delete cascade,
  actor_id uuid references auth.users(id),
  event_type text not null,
  from_status text, to_status text,
  note text,
  created_at timestamptz not null default now()
);

create table if not exists public.products (
  id text primary key,
  brand text not null,
  name text not null,
  part_number text not null,
  category text not null,
  current_price numeric(12,2) not null check (current_price >= 0),
  stock_qty integer not null default 0 check (stock_qty >= 0),
  active boolean not null default true,
  fitment_level text not null default 'confirm' check (fitment_level in ('catalog','confirm','none')),
  updated_at timestamptz not null default now()
);

-- ---------- Row-level security ----------
alter table public.profiles      enable row level security;
alter table public.staff_roles   enable row level security;
alter table public.vehicles      enable row level security;
alter table public.orders        enable row level security;
alter table public.order_items   enable row level security;
alter table public.order_events  enable row level security;
alter table public.products      enable row level security;

-- ---------- Helper: is the caller PartFit staff? ----------
create or replace function public.is_partfit_staff()
returns boolean language sql stable security definer set search_path=public as $$
  select exists(select 1 from public.staff_roles where user_id=auth.uid());
$$;

-- ---------- Policies (dropped first so re-running is safe) ----------
drop policy if exists "profile own read"   on public.profiles;
drop policy if exists "profile own update" on public.profiles;
create policy "profile own read"   on public.profiles for select using (id=auth.uid());
create policy "profile own update" on public.profiles for update using (id=auth.uid()) with check (id=auth.uid());

drop policy if exists "staff role self read" on public.staff_roles;
create policy "staff role self read" on public.staff_roles for select using (user_id=auth.uid());

drop policy if exists "vehicle own read"   on public.vehicles;
drop policy if exists "vehicle own insert" on public.vehicles;
drop policy if exists "vehicle own update" on public.vehicles;
drop policy if exists "vehicle own delete" on public.vehicles;
create policy "vehicle own read"   on public.vehicles for select using (owner_id=auth.uid());
create policy "vehicle own insert" on public.vehicles for insert with check (owner_id=auth.uid());
create policy "vehicle own update" on public.vehicles for update using (owner_id=auth.uid()) with check (owner_id=auth.uid());
create policy "vehicle own delete" on public.vehicles for delete using (owner_id=auth.uid());

drop policy if exists "order customer read"   on public.orders;
drop policy if exists "order customer submit" on public.orders;
drop policy if exists "order staff read"       on public.orders;
drop policy if exists "order staff update"     on public.orders;
create policy "order customer read"   on public.orders for select using (customer_id=auth.uid());
create policy "order customer submit" on public.orders for insert with check (customer_id=auth.uid() and status='submitted' and confirmed_total is null and approved_at is null and ready_at is null and collected_at is null);
create policy "order staff read"       on public.orders for select using (public.is_partfit_staff());
create policy "order staff update"     on public.orders for update using (public.is_partfit_staff()) with check (public.is_partfit_staff());

drop policy if exists "items customer read" on public.order_items;
drop policy if exists "items staff read"    on public.order_items;
drop policy if exists "items staff update"  on public.order_items;
create policy "items customer read" on public.order_items for select using (exists(select 1 from public.orders o where o.id=order_id and o.customer_id=auth.uid()));
create policy "items staff read"    on public.order_items for select using (public.is_partfit_staff());
create policy "items staff update"  on public.order_items for update using (public.is_partfit_staff()) with check (public.is_partfit_staff());

drop policy if exists "events customer read" on public.order_events;
drop policy if exists "events staff read"    on public.order_events;
drop policy if exists "events staff insert"  on public.order_events;
create policy "events customer read" on public.order_events for select using (exists(select 1 from public.orders o where o.id=order_id and o.customer_id=auth.uid()));
create policy "events staff read"    on public.order_events for select using (public.is_partfit_staff());
create policy "events staff insert"  on public.order_events for insert with check (public.is_partfit_staff());

drop policy if exists "products public read" on public.products;
drop policy if exists "products staff update" on public.products;
create policy "products public read"  on public.products for select using (active=true);
create policy "products staff update" on public.products for update using (public.is_partfit_staff()) with check (public.is_partfit_staff());

-- ---------- New-user → profile trigger ----------
create or replace function public.handle_new_partfit_user()
returns trigger language plpgsql security definer set search_path=public as $$
begin
  insert into public.profiles(id,full_name,phone)
  values(new.id,coalesce(nullif(new.raw_user_meta_data->>'full_name',''),'PartFit Customer'),coalesce(new.raw_user_meta_data->>'phone',''))
  on conflict(id) do nothing;
  return new;
end $$;
drop trigger if exists on_auth_user_created_partfit on auth.users;
create trigger on_auth_user_created_partfit after insert on auth.users for each row execute procedure public.handle_new_partfit_user();

-- ---------- Order reference (no pgcrypto dependency) ----------
create or replace function public.make_partfit_ref()
returns text language sql volatile set search_path=public as $$
  select 'PF-'||to_char(now(),'YYMMDD')||'-'||upper(substr(md5(random()::text||clock_timestamp()::text),1,6));
$$;

-- ---------- Transactional order submission (server owns price & stock) ----------
create or replace function public.submit_order(p_vehicle_label text,p_items jsonb)
returns jsonb language plpgsql security definer set search_path=public as $$
declare
  v_uid uuid:=auth.uid(); v_order uuid; v_ref text; v_total numeric(12,2):=0;
  v_item jsonb; v_product public.products%rowtype; v_qty int;
begin
  if v_uid is null then raise exception 'Authentication required'; end if;
  if jsonb_typeof(p_items)<>'array' or jsonb_array_length(p_items)<1 or jsonb_array_length(p_items)>50 then raise exception 'Invalid order items'; end if;
  v_ref:=public.make_partfit_ref();
  insert into public.orders(public_ref,customer_id,vehicle_label,status,payment_method,provisional_total)
  values(v_ref,v_uid,left(coalesce(p_vehicle_label,''),180),'submitted','pay_on_pickup',0) returning id into v_order;
  for v_item in select * from jsonb_array_elements(p_items) loop
    v_qty:=greatest(1,least(20,coalesce((v_item->>'quantity')::int,1)));
    select * into v_product from public.products where id=v_item->>'product_id' and active=true for share;
    if not found then raise exception 'Product unavailable: %',v_item->>'product_id'; end if;
    if v_product.stock_qty<v_qty then raise exception 'Insufficient stock for %',v_product.name; end if;
    v_total:=v_total+(v_product.current_price*v_qty);
    insert into public.order_items(order_id,product_id,product_name,part_number,quantity,provisional_unit_price,fitment_status)
    values(v_order,v_product.id,v_product.name,v_product.part_number,v_qty,v_product.current_price,'pending');
  end loop;
  update public.orders set provisional_total=v_total,updated_at=now() where id=v_order;
  insert into public.order_events(order_id,actor_id,event_type,to_status,note) values(v_order,v_uid,'submitted','submitted','Customer submitted order. No payment due.');
  return jsonb_build_object('id',v_order,'public_ref',v_ref,'provisional_total',v_total,'payment_method','pay_on_pickup');
end $$;
revoke all on function public.submit_order(text,jsonb) from public;
grant execute on function public.submit_order(text,jsonb) to authenticated;

-- ---------- Staff status workflow ----------
create or replace function public.staff_set_order_status(p_public_ref text,p_status text,p_confirmed_total numeric default null,p_note text default null,p_reservation_hours int default 48)
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_order public.orders%rowtype; v_old text; v_allowed boolean:=false;
begin
  if not public.is_partfit_staff() then raise exception 'Staff access required'; end if;
  select * into v_order from public.orders where public_ref=upper(trim(p_public_ref)) for update;
  if not found then raise exception 'Order not found'; end if;
  v_old:=v_order.status;
  v_allowed:=(v_old=p_status) or
    (v_old='submitted' and p_status in ('reviewing','rejected','cancelled')) or
    (v_old='reviewing' and p_status in ('approved','rejected','cancelled')) or
    (v_old='approved' and p_status in ('ready_for_collection','expired','cancelled')) or
    (v_old='ready_for_collection' and p_status in ('collected','expired','cancelled'));
  if not v_allowed then raise exception 'Invalid status transition % -> %',v_old,p_status; end if;
  if p_status='approved' and (p_confirmed_total is null or p_confirmed_total<=0) then raise exception 'Confirmed total is required for approval'; end if;
  update public.orders set status=p_status,
    confirmed_total=case when p_status='approved' then round(p_confirmed_total,2) else confirmed_total end,
    approved_at=case when p_status='approved' then now() else approved_at end,
    reservation_expires_at=case when p_status='approved' then now()+make_interval(hours=>greatest(1,least(168,p_reservation_hours))) else reservation_expires_at end,
    ready_at=case when p_status='ready_for_collection' then now() else ready_at end,
    collected_at=case when p_status='collected' then now() else collected_at end,
    updated_at=now()
  where id=v_order.id returning * into v_order;
  insert into public.order_events(order_id,actor_id,event_type,from_status,to_status,note)
  values(v_order.id,auth.uid(),p_status,v_old,p_status,left(coalesce(p_note,''),500));
  return to_jsonb(v_order);
end $$;
revoke all on function public.staff_set_order_status(text,text,numeric,text,int) from public;
grant execute on function public.staff_set_order_status(text,text,numeric,text,int) to authenticated;

create or replace function public.expire_partfit_approvals()
returns integer language plpgsql security definer set search_path=public as $$
declare n int;
begin
  if not public.is_partfit_staff() then raise exception 'Staff access required'; end if;
  with expired as (update public.orders set status='expired',updated_at=now() where status='approved' and reservation_expires_at<now() returning id)
  select count(*) into n from expired;
  return n;
end $$;
revoke all on function public.expire_partfit_approvals() from public;
grant execute on function public.expire_partfit_approvals() to authenticated;

-- ---------- Seed catalogue (ids/prices match data.js) ----------
insert into public.products(id,brand,name,part_number,category,current_price,stock_qty,fitment_level) values
('denso-k16tt','DENSO','DENSO K16TT Spark Plug','K16TT','Spark Plugs',35,24,'catalog'),
('air-1kr','Aftermarket','Engine Air Filter — Toyota 1KR-FE type','PF-AF-1KR','Air Filters',85,10,'confirm'),
('bosch-cabin-5002','Bosch','Bosch Cabin Filter 1987435002','1987435002','Cabin Filters',95,8,'catalog'),
('bosch-cabin-2113','Bosch','Bosch Cabin Filter M 2113','1987432113','Cabin Filters',90,7,'catalog'),
('oil-spin','Aftermarket','Spin-On Engine Oil Filter — Sample Line','PF-OF-01','Oil Filters',50,18,'confirm'),
('brake-front','Aftermarket','Front Brake Pad Set — Sample Application','PF-BP-101','Brake Pads',120,6,'confirm'),
('brake-rear','Aftermarket','Rear Brake Pad Set — Sample Application','PF-BP-201','Brake Pads',110,5,'confirm'),
('conti-6pk1029','Continental','Continental 6PK1029 ELAST Multi-V Belt','6PK1029 ELAST','Belts',140,9,'catalog'),
('conti-6pk1059','Continental','Continental 6PK1059 ELAST Multi-V Belt','6PK1059 ELAST','Belts',150,6,'catalog')
on conflict(id) do update set brand=excluded.brand,name=excluded.name,part_number=excluded.part_number,category=excluded.category,current_price=excluded.current_price,stock_qty=excluded.stock_qty,fitment_level=excluded.fitment_level,updated_at=now();

-- ---------- Indexes ----------
create index if not exists idx_partfit_vehicles_owner on public.vehicles(owner_id);
create index if not exists idx_partfit_orders_customer on public.orders(customer_id,created_at desc);
create index if not exists idx_partfit_orders_status on public.orders(status,updated_at desc);
create index if not exists idx_partfit_items_order on public.order_items(order_id);
create index if not exists idx_partfit_events_order on public.order_events(order_id,created_at);

-- ---------- Data API grants ----------
revoke all on public.profiles,public.staff_roles,public.vehicles,public.orders,public.order_items,public.order_events,public.products from anon,authenticated;
grant select,update on public.profiles to authenticated;
grant select on public.staff_roles to authenticated;
grant select,insert,update,delete on public.vehicles to authenticated;
grant select on public.orders,public.order_items,public.order_events to authenticated;
grant select on public.products to anon,authenticated;
grant update on public.products to authenticated;
revoke all on function public.is_partfit_staff() from public;
grant execute on function public.is_partfit_staff() to authenticated;

-- Done. Create an account in the app, place an order, and check My Orders.
