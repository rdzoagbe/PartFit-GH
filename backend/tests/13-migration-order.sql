\set ON_ERROR_STOP on
-- Guards the two ways this schema has silently reverted itself:
--   1. reservation-expiry-cron.sql used to redefine the expiry function.
--   2. re-running setup-all.sql reset live prices and stock to the demo seed.
insert into auth.users(id,email) values
  ('11111111-1111-1111-1111-111111111111','ama@example.gh'),
  ('22222222-2222-2222-2222-222222222222','staff@partfit.gh');
update public.profiles set full_name='Ama Mensah', phone='+233200000001' where id='11111111-1111-1111-1111-111111111111';
insert into public.staff_roles(user_id,role) values ('22222222-2222-2222-2222-222222222222','staff');

create or replace function test_ok(label text, cond boolean, detail text default '') returns void language plpgsql as $$
begin if cond then raise notice 'PASS  %', label; else raise warning 'FAIL  % %', label, detail; end if; end $$;
create or replace function the_part() returns text language sql stable as $$ select id from public.products order by id limit 1 $$;

-- ---- the cron job points at the guarded implementation ----
select test_ok('cron job is scheduled',
  (select count(*)=1 from cron.job where jobname='partfit-expire-approvals'));
select test_ok('cron job calls expire_partfit_approvals_system',
  (select command like '%expire_partfit_approvals_system%' from cron.job where jobname='partfit-expire-approvals'));
select test_ok('the cron file did NOT redefine the expiry function (still the stock-releasing one)',
  (select prosrc like '%partfit_release_stock%' from pg_proc where proname='expire_partfit_approvals_system'));
select test_ok('the expiry function still skips paid orders',
  (select prosrc like '%payment_status%' from pg_proc where proname='expire_partfit_approvals_system'));

-- ---- the staff-triggered sweep delegates to the same implementation ----
select test_ok('staff sweep delegates instead of duplicating',
  (select prosrc like '%expire_partfit_approvals_system%' from pg_proc where proname='expire_partfit_approvals'));

update public.products set stock_qty=4, current_price=100 where id=the_part();
select set_config('request.jwt.claim.sub','11111111-1111-1111-1111-111111111111',false);
select public.submit_order('Corolla', jsonb_build_array(jsonb_build_object('product_id',the_part(),'quantity',1)),'pickup') ->> 'public_ref' as ref \gset
select set_config('request.jwt.claim.sub','22222222-2222-2222-2222-222222222222',false);
select public.staff_set_order_status(:'ref','reviewing');
select public.staff_set_order_status(:'ref','approved',100,'ok');
select test_ok('stock reserved by approval (4 -> 3)', (select stock_qty=3 from public.products where id=the_part()));
update public.orders set reservation_expires_at = now() - interval '1 hour' where public_ref=:'ref';
select test_ok('staff sweep expires the overdue order', public.expire_partfit_approvals() = 1);
select test_ok('staff sweep released the reserved stock (3 -> 4)', (select stock_qty=4 from public.products where id=the_part()));

-- ---- re-running the seed must not touch a live shop's stock or prices ----
update public.products set stock_qty=7, current_price=999.99 where id=the_part();
\i :setup_all
select test_ok('re-running setup-all.sql keeps live stock (7)', (select stock_qty=7 from public.products where id=the_part()));
select test_ok('re-running setup-all.sql keeps live price (999.99)', (select current_price=999.99 from public.products where id=the_part()));
