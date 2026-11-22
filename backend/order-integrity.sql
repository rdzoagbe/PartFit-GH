-- ============================================================================
-- PartFit Ghana — order integrity: server-owned delivery, contact snapshot,
-- and a real stock reservation lifecycle.
--
-- WHY THIS EXISTS
--   1. Delivery was collected in the browser and never persisted. The fee the
--      customer saw came from data.js and reached nobody, so an approved order
--      could never charge for delivery and staff could not see where to take it.
--   2. Staff could not read the customer's name or phone (profiles RLS is
--      owner-only), which makes an order unfulfillable. Contact details are now
--      SNAPSHOT onto the order at submit time, so staff read them from a row
--      they are already allowed to see — no widening of the profiles policy.
--   3. submit_order only CHECKED stock; nothing ever decremented it, so the
--      same last part could be sold any number of times. Stock is now reserved
--      on approval, released on cancel/reject/expire, consumed on collection.
--
-- The delivery FEE is never taken from the client: the client sends a zone id
-- and the fee is looked up here. confirmed_total becomes the all-in amount
-- (parts + delivery), which is what begin_paystack_payment already charges.
--
-- Safe + idempotent. Run AFTER setup-all.sql and momo-paystack.sql.
-- ============================================================================

-- ---- Delivery zones (server-owned pricing) ---------------------------------
create table if not exists public.delivery_zones (
  id         text primary key,
  label      text not null,
  fee        numeric(12,2) not null check (fee >= 0),
  active     boolean not null default true,
  sort_order int not null default 0,
  updated_at timestamptz not null default now()
);

insert into public.delivery_zones(id,label,fee,sort_order) values
  ('spintex',     'Spintex / Baatsona / Coastal Estates', 20, 1),
  ('eastlegon',   'East Legon / Airport / Cantonments',   30, 2),
  ('central',     'Accra Central / Osu / Labadi',         35, 3),
  ('achimota',    'Achimota / Legon / Madina',            35, 4),
  ('tema',        'Tema / Communities',                   45, 5),
  ('kasoa',       'Kasoa / Weija / Mallam',               50, 6),
  ('accra-other', 'Other Greater Accra',                  60, 7),
  ('nationwide',  'Outside Accra (nationwide courier)',   90, 8)
on conflict(id) do update
  set label=excluded.label, fee=excluded.fee, sort_order=excluded.sort_order, updated_at=now();

alter table public.delivery_zones enable row level security;
drop policy if exists "delivery zones public read" on public.delivery_zones;
create policy "delivery zones public read" on public.delivery_zones for select using (active = true);
drop policy if exists "delivery zones staff write" on public.delivery_zones;
create policy "delivery zones staff write" on public.delivery_zones for update
  using (public.is_partfit_staff()) with check (public.is_partfit_staff());
revoke all on public.delivery_zones from anon, authenticated;
grant select on public.delivery_zones to anon, authenticated;
grant update on public.delivery_zones to authenticated;  -- gated by the policy above

-- ---- Order columns ----------------------------------------------------------
alter table public.orders
  add column if not exists delivery_zone_id      text references public.delivery_zones(id),
  add column if not exists contact_name          text,
  add column if not exists contact_phone         text,
  add column if not exists customer_note         text,
  add column if not exists confirmed_parts_total numeric(12,2),
  add column if not exists stock_state           text not null default 'none'
    check (stock_state in ('none','reserved','consumed'));

-- ---- Stock lifecycle helpers -----------------------------------------------
-- Reserve: decrement each line's product, failing loudly if it would go
-- negative. Only ever runs on an order whose stock is not already held.
create or replace function public.partfit_reserve_stock(p_order uuid)
returns void language plpgsql security definer set search_path = public as $$
declare it record; v_state text;
begin
  select stock_state into v_state from public.orders where id = p_order for update;
  if v_state is distinct from 'none' then return; end if;   -- already held/consumed

  for it in select product_id, product_name, quantity from public.order_items where order_id = p_order loop
    update public.products
       set stock_qty = stock_qty - it.quantity, updated_at = now()
     where id = it.product_id and stock_qty >= it.quantity;
    if not found then
      raise exception 'Insufficient stock for % — order cannot be approved', it.product_name;
    end if;
  end loop;

  update public.orders set stock_state = 'reserved', updated_at = now() where id = p_order;
end $$;

-- Release: give the held units back. No-op unless stock is currently reserved.
create or replace function public.partfit_release_stock(p_order uuid)
returns void language plpgsql security definer set search_path = public as $$
declare it record; v_state text;
begin
  select stock_state into v_state from public.orders where id = p_order for update;
  if v_state is distinct from 'reserved' then return; end if;

  for it in select product_id, quantity from public.order_items where order_id = p_order loop
    update public.products set stock_qty = stock_qty + it.quantity, updated_at = now()
     where id = it.product_id;
  end loop;

  update public.orders set stock_state = 'none', updated_at = now() where id = p_order;
end $$;

revoke all on function public.partfit_reserve_stock(uuid) from public, anon, authenticated;
revoke all on function public.partfit_release_stock(uuid) from public, anon, authenticated;

-- ---- submit_order: now carries fulfilment, delivery and contact -------------
-- The old two-argument function is dropped so the defaulted version below is
-- unambiguous for a two-argument call from an older cached client.
drop function if exists public.submit_order(text, jsonb);

create or replace function public.submit_order(
  p_vehicle_label   text,
  p_items           jsonb,
  p_fulfilment_type text default 'pickup',
  p_delivery_zone   text default null,
  p_delivery_address text default null,
  p_contact_name    text default null,
  p_contact_phone   text default null,
  p_note            text default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid(); v_order uuid; v_ref text; v_total numeric(12,2) := 0;
  v_item jsonb; v_product public.products%rowtype; v_qty int;
  v_mode text; v_zone public.delivery_zones; v_fee numeric(12,2) := 0; v_addr text;
  v_name text; v_phone text; v_profile public.profiles;
begin
  if v_uid is null then raise exception 'Authentication required'; end if;
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) < 1 or jsonb_array_length(p_items) > 50 then
    raise exception 'Invalid order items';
  end if;

  -- Fulfilment + delivery: the fee is OURS, never the client's.
  v_mode := lower(coalesce(nullif(trim(p_fulfilment_type), ''), 'pickup'));
  if v_mode not in ('pickup','delivery') then raise exception 'Invalid fulfilment type'; end if;

  if v_mode = 'delivery' then
    select * into v_zone from public.delivery_zones where id = p_delivery_zone and active = true;
    if not found then raise exception 'Choose a delivery area'; end if;
    v_addr := left(trim(coalesce(p_delivery_address, '')), 400);
    if length(v_addr) < 8 then raise exception 'Enter the delivery address'; end if;
    v_fee := v_zone.fee;
  end if;

  -- Contact snapshot, so staff can reach the customer without reading profiles.
  select * into v_profile from public.profiles where id = v_uid;
  v_name  := left(trim(coalesce(nullif(trim(p_contact_name), ''),  v_profile.full_name, '')), 120);
  v_phone := left(trim(coalesce(nullif(trim(p_contact_phone), ''), v_profile.phone, '')), 40);
  if v_name = '' or v_phone = '' then raise exception 'A contact name and phone are required'; end if;

  v_ref := public.make_partfit_ref();
  insert into public.orders(
      public_ref, customer_id, vehicle_label, status, payment_method, provisional_total,
      fulfilment_type, delivery_zone_id, delivery_fee, delivery_address,
      contact_name, contact_phone, customer_note)
  values (v_ref, v_uid, left(coalesce(p_vehicle_label, ''), 180), 'submitted', 'pay_on_pickup', 0,
      v_mode, case when v_mode = 'delivery' then v_zone.id end, v_fee,
      case when v_mode = 'delivery' then v_addr end,
      v_name, v_phone, left(trim(coalesce(p_note, '')), 500))
  returning id into v_order;

  for v_item in select * from jsonb_array_elements(p_items) loop
    v_qty := greatest(1, least(20, coalesce((v_item->>'quantity')::int, 1)));
    select * into v_product from public.products where id = v_item->>'product_id' and active = true for share;
    if not found then raise exception 'Product unavailable: %', v_item->>'product_id'; end if;
    if v_product.stock_qty < v_qty then raise exception 'Insufficient stock for %', v_product.name; end if;
    v_total := v_total + (v_product.current_price * v_qty);
    insert into public.order_items(order_id, product_id, product_name, part_number, quantity, provisional_unit_price, fitment_status)
    values (v_order, v_product.id, v_product.name, v_product.part_number, v_qty, v_product.current_price, 'pending');
  end loop;

  update public.orders set provisional_total = v_total, updated_at = now() where id = v_order;
  insert into public.order_events(order_id, actor_id, event_type, to_status, note)
  values (v_order, v_uid, 'submitted', 'submitted',
          'Customer submitted order (' || v_mode || '). No payment due yet.');

  return jsonb_build_object(
    'id', v_order, 'public_ref', v_ref,
    'provisional_total', v_total, 'delivery_fee', v_fee,
    'provisional_grand_total', v_total + v_fee,
    'fulfilment_type', v_mode, 'payment_method', 'pay_on_pickup');
end $$;

revoke all on function public.submit_order(text,jsonb,text,text,text,text,text,text) from public, anon;
grant execute on function public.submit_order(text,jsonb,text,text,text,text,text,text) to authenticated;

-- ---- staff_set_order_status: delivery-inclusive total + stock lifecycle -----
-- p_confirmed_total is the PARTS price the staff types. The server adds the
-- order's own delivery fee, so confirmed_total (what Paystack charges) is the
-- all-in amount and the owner never absorbs the delivery cost.
create or replace function public.staff_set_order_status(
  p_public_ref text, p_status text, p_confirmed_total numeric default null,
  p_note text default null, p_reservation_hours int default 48)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_order public.orders%rowtype; v_old text; v_allowed boolean := false; v_parts numeric(12,2);
begin
  if not public.is_partfit_staff() then raise exception 'Staff access required'; end if;
  select * into v_order from public.orders where public_ref = upper(trim(p_public_ref)) for update;
  if not found then raise exception 'Order not found'; end if;
  v_old := v_order.status;

  v_allowed := (v_old = p_status) or
    (v_old = 'submitted' and p_status in ('reviewing','rejected','cancelled')) or
    (v_old = 'reviewing' and p_status in ('approved','rejected','cancelled')) or
    (v_old = 'approved' and p_status in ('ready_for_collection','expired','cancelled')) or
    (v_old = 'ready_for_collection' and p_status in ('collected','expired','cancelled'));
  if not v_allowed then raise exception 'Invalid status transition % -> %', v_old, p_status; end if;

  if p_status = 'approved' and (p_confirmed_total is null or p_confirmed_total <= 0) then
    raise exception 'Confirmed parts total is required for approval';
  end if;

  -- Never strand money: an order that has been paid cannot be quietly dropped.
  if p_status in ('cancelled','rejected','expired') and v_order.payment_status = 'paid' then
    raise exception 'Order % is paid — refund it in Paystack and record the refund before cancelling', v_order.public_ref;
  end if;

  -- Stock: hold on approval, give back when the order dies, keep on collection.
  if p_status = 'approved' and v_old <> 'approved' then
    perform public.partfit_reserve_stock(v_order.id);
  elsif p_status in ('cancelled','rejected','expired') then
    perform public.partfit_release_stock(v_order.id);
  elsif p_status = 'collected' then
    update public.orders set stock_state = 'consumed' where id = v_order.id and stock_state = 'reserved';
  end if;

  v_parts := case when p_status = 'approved' then round(p_confirmed_total, 2) else v_order.confirmed_parts_total end;

  update public.orders set status = p_status,
    confirmed_parts_total = v_parts,
    confirmed_total = case when v_parts is null then confirmed_total
                           else round(v_parts + coalesce(delivery_fee, 0), 2) end,
    approved_at = case when p_status = 'approved' then now() else approved_at end,
    reservation_expires_at = case when p_status = 'approved'
      then now() + make_interval(hours => greatest(1, least(168, p_reservation_hours))) else reservation_expires_at end,
    ready_at = case when p_status = 'ready_for_collection' then now() else ready_at end,
    collected_at = case when p_status = 'collected' then now() else collected_at end,
    updated_at = now()
  where id = v_order.id returning * into v_order;

  insert into public.order_events(order_id, actor_id, event_type, from_status, to_status, note)
  values (v_order.id, auth.uid(), p_status, v_old, p_status, left(coalesce(p_note, ''), 500));

  return jsonb_build_object('public_ref', v_order.public_ref, 'status', v_order.status,
    'confirmed_parts_total', v_order.confirmed_parts_total,
    'delivery_fee', v_order.delivery_fee, 'confirmed_total', v_order.confirmed_total);
end $$;

revoke all on function public.staff_set_order_status(text,text,numeric,text,int) from public, anon;
grant execute on function public.staff_set_order_status(text,text,numeric,text,int) to authenticated;

-- ---- Expiry sweep: never expire money, and give the stock back -------------
create or replace function public.expire_partfit_approvals_system()
returns integer language plpgsql security definer set search_path = public as $$
declare n int := 0; r record;
begin
  for r in
    select id, public_ref from public.orders
     where status = 'approved'
       and reservation_expires_at is not null
       and reservation_expires_at < now()
       and coalesce(payment_status, 'unpaid') not in ('paid','pending')   -- leave paid/paying orders alone
     for update
  loop
    perform public.partfit_release_stock(r.id);
    update public.orders set status = 'expired', updated_at = now() where id = r.id;
    insert into public.order_events(order_id, actor_id, event_type, from_status, to_status, note)
    values (r.id, null, 'expired', 'approved', 'expired',
            'Reservation window elapsed; order expired automatically and reserved stock released.');
    n := n + 1;
  end loop;
  return n;
end $$;

-- Done. Existing rows keep working: fulfilment_type defaults to 'pickup' and
-- delivery_fee to 0, so confirmed_total is unchanged for every pickup order.
