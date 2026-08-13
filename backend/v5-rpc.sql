-- PartFit Ghana V5: transactional order submission and controlled approval workflow
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

drop policy if exists "staff role self read" on public.staff_roles;
create policy "staff role self read" on public.staff_roles for select using (user_id=auth.uid());

create or replace function public.make_partfit_ref()
returns text language sql volatile set search_path=public as $$
  select 'PF-'||to_char(now(),'YYMMDD')||'-'||upper(substr(encode(gen_random_bytes(4),'hex'),1,6));
$$;

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