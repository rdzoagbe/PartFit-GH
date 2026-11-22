\set ON_ERROR_STOP on
\pset pager off
-- ---------- fixtures ----------
insert into auth.users(id,email) values
  ('11111111-1111-1111-1111-111111111111','ama@example.gh'),
  ('22222222-2222-2222-2222-222222222222','staff@partfit.gh'),
  ('33333333-3333-3333-3333-333333333333','kofi@example.gh');
insert into public.profiles(id,full_name,phone) values
  ('11111111-1111-1111-1111-111111111111','Ama Mensah','+233200000001'),
  ('22222222-2222-2222-2222-222222222222','Shop Staff','+233200000002'),
  ('33333333-3333-3333-3333-333333333333','Kofi Boateng','+233200000003')
on conflict(id) do update set full_name=excluded.full_name, phone=excluded.phone;
insert into public.staff_roles(user_id,role) values ('22222222-2222-2222-2222-222222222222','staff') on conflict(user_id) do nothing;
update public.products set stock_qty = 2, current_price = 100 where id = (select id from public.products order by id limit 1);

\set cust '11111111-1111-1111-1111-111111111111'
\set staff '22222222-2222-2222-2222-222222222222'
\set cust2 '33333333-3333-3333-3333-333333333333'

create or replace function test_ok(label text, cond boolean, detail text default '') returns void language plpgsql as $$
begin
  if cond then raise notice 'PASS  %', label;
  else raise warning 'FAIL  % %', label, detail; end if;
end $$;

create or replace function test_raises(label text, stmt text, want text) returns void language plpgsql as $$
begin
  execute stmt;
  raise warning 'FAIL  % (no error raised; expected %)', label, want;
exception when others then
  if position(lower(want) in lower(SQLERRM)) > 0 then raise notice 'PASS  % -> %', label, SQLERRM;
  else raise warning 'FAIL  % -> got "%" expected "%"', label, SQLERRM, want; end if;
end $$;

-- ---------- 1. delivery order persists everything, fee comes from the server ----------
set role authenticated; set request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
select public.submit_order(
  'Toyota Corolla 2012',
  jsonb_build_array(jsonb_build_object('product_id',(select id from public.products order by id limit 1),'quantity',1)),
  'delivery','eastlegon','14 Boundary Road, East Legon','Ama Mensah','+233200000001','VIN JTDBR32E030012345') as submit_result \gset
reset role; reset request.jwt.claim.sub;

select test_ok('delivery fulfilment persisted',   (select fulfilment_type='delivery' from public.orders));
select test_ok('delivery zone persisted',         (select delivery_zone_id='eastlegon' from public.orders));
select test_ok('fee came from the zone table (30, not the client)', (select delivery_fee=30 from public.orders));
select test_ok('delivery address persisted',      (select delivery_address like '14 Boundary Road%' from public.orders));
select test_ok('contact name snapshot',           (select contact_name='Ama Mensah' from public.orders));
select test_ok('contact phone snapshot',          (select contact_phone='+233200000001' from public.orders));
select test_ok('customer note persisted',         (select customer_note like 'VIN%' from public.orders));
select test_ok('parts total computed server-side',(select provisional_total=100 from public.orders));

-- ---------- 2. delivery validation ----------
set role authenticated; set request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
select test_raises('unknown delivery zone rejected',
  $$select public.submit_order('x', jsonb_build_array(jsonb_build_object('product_id',(select id from public.products order by id limit 1),'quantity',1)), 'delivery','mars','14 Boundary Road, East Legon')$$,
  'Choose a delivery area');
select test_raises('missing delivery address rejected',
  $$select public.submit_order('x', jsonb_build_array(jsonb_build_object('product_id',(select id from public.products order by id limit 1),'quantity',1)), 'delivery','tema','')$$,
  'Enter the delivery address');
select test_raises('bogus fulfilment type rejected',
  $$select public.submit_order('x', jsonb_build_array(jsonb_build_object('product_id',(select id from public.products order by id limit 1),'quantity',1)), 'teleport')$$,
  'Invalid fulfilment type');
reset role; reset request.jwt.claim.sub;

-- ---------- 3. approval: delivery-inclusive total + stock reservation ----------
set role authenticated; set request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';
select public.staff_set_order_status((select public_ref from public.orders),'reviewing');
select public.staff_set_order_status((select public_ref from public.orders),'approved', 100, 'Fitment confirmed');
reset role; reset request.jwt.claim.sub;

select test_ok('staff typed parts price stored as parts total', (select confirmed_parts_total=100 from public.orders));
select test_ok('confirmed_total = parts + delivery (130, owner does not eat the fee)', (select confirmed_total=130 from public.orders));
select test_ok('stock decremented on approval (2 -> 1)', (select stock_qty=1 from public.products order by id limit 1));
select test_ok('stock marked reserved', (select stock_state='reserved' from public.orders));

-- idempotent re-approval must not double-decrement
set role authenticated; set request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';
select public.staff_set_order_status((select public_ref from public.orders),'approved', 100, 'again');
reset role; reset request.jwt.claim.sub;
select test_ok('re-approving does not decrement stock twice', (select stock_qty=1 from public.products order by id limit 1));

-- ---------- 4. staff can actually read the customer's contact details ----------
set role authenticated; set request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';
select test_ok('staff can read contact name + phone + address under RLS',
  (select count(*)=1 from public.orders where contact_phone='+233200000001' and delivery_address is not null));
reset role; reset request.jwt.claim.sub;

-- ---------- 5. cancelling an approved order gives the stock back ----------
set role authenticated; set request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';
select public.staff_set_order_status((select public_ref from public.orders),'cancelled', null, 'customer changed mind');
reset role; reset request.jwt.claim.sub;
select test_ok('stock restored on cancel (1 -> 2)', (select stock_qty=2 from public.products order by id limit 1));
select test_ok('stock_state cleared on cancel', (select stock_state='none' from public.orders));
