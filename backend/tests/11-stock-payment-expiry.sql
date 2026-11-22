\set ON_ERROR_STOP on
insert into auth.users(id,email) values
  ('11111111-1111-1111-1111-111111111111','ama@example.gh'),
  ('22222222-2222-2222-2222-222222222222','staff@partfit.gh'),
  ('33333333-3333-3333-3333-333333333333','kofi@example.gh');
update public.profiles set full_name='Ama Mensah', phone='+233200000001' where id='11111111-1111-1111-1111-111111111111';
update public.profiles set full_name='Kofi Boateng', phone='+233200000003' where id='33333333-3333-3333-3333-333333333333';
insert into public.staff_roles(user_id,role) values ('22222222-2222-2222-2222-222222222222','staff');

create or replace function test_ok(label text, cond boolean, detail text default '') returns void language plpgsql as $$
begin if cond then raise notice 'PASS  %', label; else raise warning 'FAIL  % %', label, detail; end if; end $$;
create or replace function test_raises(label text, stmt text, want text) returns void language plpgsql as $$
begin execute stmt; raise warning 'FAIL  % (no error; expected %)', label, want;
exception when others then
  if position(lower(want) in lower(SQLERRM))>0 then raise notice 'PASS  % -> %', label, SQLERRM;
  else raise warning 'FAIL  % -> got "%" want "%"', label, SQLERRM, want; end if; end $$;

-- one unit of stock, two customers
create or replace function the_part() returns text language sql stable as $$ select id from public.products order by id limit 1 $$;
update public.products set stock_qty = 1, current_price = 200 where id = the_part();

create or replace function place(uid text, mode text, zone text) returns text language plpgsql as $$
declare r jsonb; begin
  perform set_config('request.jwt.claim.sub', uid, false);
  r := public.submit_order('Toyota Corolla 2012',
        jsonb_build_array(jsonb_build_object('product_id', the_part(),'quantity',1)),
        mode, zone, case when mode='delivery' then '14 Boundary Road, East Legon' end);
  return r->>'public_ref';
end $$;
create or replace function staffdo(ref text, st text, price numeric default null) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claim.sub','22222222-2222-2222-2222-222222222222', false);
  perform public.staff_set_order_status(ref, st, price, 'test');
end $$;

select place('11111111-1111-1111-1111-111111111111','delivery','spintex') as ref_a \gset
select place('33333333-3333-3333-3333-333333333333','pickup',null)        as ref_b \gset
select test_ok('both customers could submit for the last unit (no reservation at submit)',
  (select count(*)=2 from public.orders));

-- ---------- oversell prevention ----------
select staffdo(:'ref_a','reviewing');
select staffdo(:'ref_a','approved', 200);
select test_ok('first approval takes the last unit (1 -> 0)', (select stock_qty=0 from public.products where id=the_part()));
select staffdo(:'ref_b','reviewing');
select test_raises('second approval is refused — cannot oversell the last part',
  $$select staffdo('$$ || :'ref_b' || $$','approved', 200)$$, 'Insufficient stock');
select test_ok('refused approval left the order un-approved',
  (select status='reviewing' from public.orders where public_ref=:'ref_b'));
select test_ok('refused approval did not take stock negative', (select stock_qty=0 from public.products where id=the_part()));

-- ---------- Paystack would charge the delivery-inclusive amount ----------
select set_config('request.jwt.claim.sub','11111111-1111-1111-1111-111111111111', false);
select public.begin_paystack_payment(:'ref_a','PF_TEST_REF_1') as charged \gset
select test_ok('MoMo charge = parts 200 + spintex delivery 20 = 220', (:'charged')::numeric = 220);
select test_ok('order amount_due matches the charge', (select amount_due=220 from public.orders where public_ref=:'ref_a'));

-- ---------- expiry sweep: leaves paying/paid orders alone ----------
update public.orders set reservation_expires_at = now() - interval '1 hour' where public_ref=:'ref_a';
select test_ok('sweep skipped the order that is mid-payment (pending)', public.expire_partfit_approvals_system() = 0);
select test_ok('mid-payment order still approved', (select status='approved' from public.orders where public_ref=:'ref_a'));

-- settle it (as the webhook would), then re-run the sweep
select public.settle_paystack_payment('PF_TEST_REF_1','success',220,'mobile_money','{}'::jsonb);
select test_ok('webhook marked the order paid', (select payment_status='paid' from public.orders where public_ref=:'ref_a'));
select test_ok('sweep skipped the PAID order (stock stays held, order not expired)', public.expire_partfit_approvals_system() = 0);
select test_ok('paid order still approved after sweep', (select status='approved' from public.orders where public_ref=:'ref_a'));
select test_ok('paid order stock still reserved', (select stock_state='reserved' from public.orders where public_ref=:'ref_a'));

-- ---------- a paid order cannot be silently cancelled ----------
select test_raises('cancelling a PAID order is refused until the refund is recorded',
  $$select staffdo('$$ || :'ref_a' || $$','cancelled')$$, 'refund');

-- ---------- an unpaid expired order releases its stock ----------
select test_raises('control: approval still refused while stock is 0',
  $$select staffdo('$$ || :'ref_b' || $$','approved', 200)$$, 'Insufficient stock');
update public.orders set payment_status='unpaid', paystack_reference=null where public_ref=:'ref_a';
select test_ok('unpaid overdue order is expired by the sweep', public.expire_partfit_approvals_system() = 1);
select test_ok('expired order released its unit back to stock (0 -> 1)', (select stock_qty=1 from public.products where id=the_part()));
select test_ok('expired order status is expired', (select status='expired' from public.orders where public_ref=:'ref_a'));
