\set ON_ERROR_STOP on
insert into auth.users(id,email) values
  ('11111111-1111-1111-1111-111111111111','ama@example.gh'),
  ('22222222-2222-2222-2222-222222222222','staff@partfit.gh');
update public.profiles set full_name='Ama Mensah', phone='+233200000001' where id='11111111-1111-1111-1111-111111111111';
insert into public.staff_roles(user_id,role) values ('22222222-2222-2222-2222-222222222222','staff');

create or replace function test_ok(label text, cond boolean, detail text default '') returns void language plpgsql as $$
begin if cond then raise notice 'PASS  %', label; else raise warning 'FAIL  % %', label, detail; end if; end $$;
create or replace function test_raises(label text, stmt text, want text) returns void language plpgsql as $$
begin execute stmt; raise warning 'FAIL  % (no error; expected %)', label, want;
exception when others then
  if position(lower(want) in lower(SQLERRM))>0 then raise notice 'PASS  % -> %', label, SQLERRM;
  else raise warning 'FAIL  % -> got "%" want "%"', label, SQLERRM, want; end if; end $$;

create or replace function the_part() returns text language sql stable as $$ select id from public.products order by id limit 1 $$;
update public.products set stock_qty=20, current_price=100 where id=the_part();

create or replace function place(mode text, zone text) returns text language plpgsql as $$
declare r jsonb; begin
  perform set_config('request.jwt.claim.sub','11111111-1111-1111-1111-111111111111',false);
  r := public.submit_order('Corolla', jsonb_build_array(jsonb_build_object('product_id',the_part(),'quantity',1)),
        mode, zone, case when mode='delivery' then '14 Boundary Road, East Legon' end);
  return r->>'public_ref'; end $$;
create or replace function staffdo(ref text, st text, price numeric default null) returns void language plpgsql as $$
begin perform set_config('request.jwt.claim.sub','22222222-2222-2222-2222-222222222222',false);
  perform public.staff_set_order_status(ref, st, price, 'test'); end $$;
create or replace function approve(ref text, price numeric) returns void language plpgsql as $$
begin perform staffdo(ref,'reviewing'); perform staffdo(ref,'approved',price); end $$;
create or replace function ascust() returns void language sql as $$ select set_config('request.jwt.claim.sub','11111111-1111-1111-1111-111111111111',false) $$;
create or replace function asstaff() returns void language sql as $$ select set_config('request.jwt.claim.sub','22222222-2222-2222-2222-222222222222',false) $$;

-- ========== 1. underpayment is recorded honestly, not swallowed ==========
select place('pickup',null) as r1 \gset
select approve(:'r1', 100);
select ascust(); select public.begin_paystack_payment(:'r1','REF_SHORT');
select public.settle_paystack_payment('REF_SHORT','success',60,'mobile_money','{}'::jsonb);
select test_ok('underpaid order is NOT marked paid', (select payment_status<>'paid' from public.orders where public_ref=:'r1'));
select test_ok('underpaid ledger row says partial, not success',
  (select status='partial' from public.payments where reference='REF_SHORT'));
select test_ok('underpaid amount recorded as what actually arrived',
  (select amount=60 from public.payments where reference='REF_SHORT'));
select test_ok('underpayment is visible in the order timeline',
  (select count(*)=1 from public.order_events where note like 'UNDERPAID%'));

-- ========== 2. a failed charge releases the order so it can be retried ==========
select place('pickup',null) as r2 \gset
select approve(:'r2', 100);
select ascust(); select public.begin_paystack_payment(:'r2','REF_FAIL');
select test_ok('order is pending while checkout is open', (select payment_status='pending' from public.orders where public_ref=:'r2'));
select public.settle_paystack_payment('REF_FAIL','failed',0,'mobile_money','{}'::jsonb);
select test_ok('charge.failed returns the order to unpaid (payable again)',
  (select payment_status='unpaid' from public.orders where public_ref=:'r2'));
select test_ok('failed ledger row marked failed', (select status='failed' from public.payments where reference='REF_FAIL'));
select ascust();
select test_ok('customer can start a fresh payment after a failure',
  public.begin_paystack_payment(:'r2','REF_FAIL_2') = 100);

-- ========== 3. abandoned checkout can be cleared ==========
select place('pickup',null) as r3 \gset
select approve(:'r3', 100);
select ascust(); select public.begin_paystack_payment(:'r3','REF_ABANDON');
select test_ok('a fresh pending intent is NOT cleared (payment may be in flight)',
  public.release_stale_payment_intent(:'r3') = false);
update public.payments set created_at = now() - interval '30 minutes' where reference='REF_ABANDON';
select test_ok('a stale pending intent IS cleared', public.release_stale_payment_intent(:'r3') = true);
select test_ok('order payable again after clearing', (select payment_status='unpaid' from public.orders where public_ref=:'r3'));

-- a stale intent with real money attached must never be cleared
select place('pickup',null) as r4 \gset
select approve(:'r4', 100);
select ascust(); select public.begin_paystack_payment(:'r4','REF_REAL');
select public.settle_paystack_payment('REF_REAL','success',100,'mobile_money','{}'::jsonb);
update public.payments set created_at = now() - interval '30 minutes' where reference='REF_REAL';
select test_ok('an intent with a successful payment is never cleared',
  public.release_stale_payment_intent(:'r4') = false);
select test_ok('that order is paid', (select payment_status='paid' from public.orders where public_ref=:'r4'));

-- ========== 4. money against a dead order is kept and flagged ==========
select place('pickup',null) as r5 \gset
select approve(:'r5', 100);
select ascust(); select public.begin_paystack_payment(:'r5','REF_DEAD');
select staffdo(:'r5','cancelled');
select public.settle_paystack_payment('REF_DEAD','success',100,'mobile_money','{}'::jsonb);
select test_ok('payment on a cancelled order is still recorded',
  (select status='success' from public.payments where reference='REF_DEAD'));
select test_ok('it does not resurrect the cancelled order',
  (select status='cancelled' from public.orders where public_ref=:'r5'));
select test_ok('a refund-required warning is in the timeline',
  (select count(*)=1 from public.order_events where note like 'PAYMENT RECEIVED ON A CANCELLED%'));

-- ========== 5. staff can record a payment the webhook missed ==========
select place('delivery','tema') as r6 \gset
select approve(:'r6', 100);   -- parts 100 + tema 45 = 145 due
select test_ok('amount due includes delivery (145)', (select confirmed_total=145 from public.orders where public_ref=:'r6'));
select asstaff();
select test_raises('staff cannot record less than is due',
  $$select public.staff_record_manual_payment('$$ || :'r6' || $$', 100, 'cash')$$, 'is due');
select public.staff_record_manual_payment(:'r6', 145, 'cash', 'Paid at the counter');
select test_ok('manual payment marks the order paid', (select payment_status='paid' from public.orders where public_ref=:'r6'));
select test_ok('manual payment is in the same ledger',
  (select count(*)=1 from public.payments p join public.orders o on o.id=p.order_id
    where o.public_ref=:'r6' and p.provider='manual' and p.status='success' and p.amount=145));
select test_ok('manual payment records who took it',
  (select recorded_by='22222222-2222-2222-2222-222222222222' from public.payments p
     join public.orders o on o.id=p.order_id where o.public_ref=:'r6'));
select test_raises('cannot double-record a payment',
  $$select public.staff_record_manual_payment('$$ || :'r6' || $$', 145, 'cash')$$, 'already paid');

-- a customer must not be able to mark their own order paid
select ascust();
select test_raises('customer cannot record a manual payment',
  $$select public.staff_record_manual_payment('$$ || :'r6' || $$', 145, 'cash')$$, 'Staff access required');
select test_raises('customer cannot record a refund',
  $$select public.staff_record_refund('$$ || :'r6' || $$', 145)$$, 'Staff access required');

-- ========== 6. refund unblocks cancelling a paid order ==========
select asstaff();
select test_raises('paid order still cannot be cancelled before a refund',
  $$select staffdo('$$ || :'r6' || $$','cancelled')$$, 'refund');
select public.staff_record_refund(:'r6', 145, 'Customer cancelled');
select test_ok('refund recorded on the order', (select payment_status='refunded' from public.orders where public_ref=:'r6'));
select staffdo(:'r6','cancelled');
select test_ok('order can be cancelled once the refund is recorded',
  (select status='cancelled' from public.orders where public_ref=:'r6'));
select test_ok('refunded stock went back', (select stock_qty=20 - 5 + 1 from public.products where id=the_part()), 'stock accounting');
