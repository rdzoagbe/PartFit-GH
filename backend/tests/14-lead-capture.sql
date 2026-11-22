\set ON_ERROR_STOP on
insert into auth.users(id,email) values
  ('11111111-1111-1111-1111-111111111111','ama@example.gh'),
  ('22222222-2222-2222-2222-222222222222','staff@partfit.gh');
insert into public.staff_roles(user_id,role) values ('22222222-2222-2222-2222-222222222222','staff');

create or replace function test_ok(label text, cond boolean, detail text default '') returns void language plpgsql as $$
begin if cond then raise notice 'PASS  %', label; else raise warning 'FAIL  % %', label, detail; end if; end $$;
create or replace function test_raises(label text, stmt text, want text) returns void language plpgsql as $$
begin execute stmt; raise warning 'FAIL  % (no error; expected %)', label, want;
exception when others then
  if position(lower(want) in lower(SQLERRM))>0 then raise notice 'PASS  % -> %', label, SQLERRM;
  else raise warning 'FAIL  % -> got "%" want "%"', label, SQLERRM, want; end if; end $$;

-- ---- a signed-OUT visitor can file a part request ----
select set_config('request.jwt.claim.sub','',false);
set role anon;
select public.submit_part_request('part_request','Kofi Boateng','+233200000003',null,
  'Front brake pads','Toyota Corolla 2012','BP-1234',
  '{"quantity":"2","vin":"JTDBR32E030012345","note":"Front, urgent"}'::jsonb) ->> 'id' as anon_id \gset
reset role;
select test_ok('signed-out visitor can submit a part request',
  (select count(*)=1 from public.part_requests where phone='+233200000003'));
select test_ok('the lead keeps what we need to answer it',
  (select name='Kofi Boateng' and subject='Front brake pads' and part_number='BP-1234'
      and vehicle_label='Toyota Corolla 2012' and details->>'vin'='JTDBR32E030012345'
      and status='new' and customer_id is null
   from public.part_requests where phone='+233200000003'));

-- ---- a signed-IN customer's lead is linked to their account ----
select set_config('request.jwt.claim.sub','11111111-1111-1111-1111-111111111111',false);
set role authenticated;
select public.submit_part_request('contact','Ama Mensah','+233200000001',null,'Existing order',null,null,
  '{"message":"Where is my order?"}'::jsonb);
reset role;
select test_ok('signed-in lead is attached to the account',
  (select customer_id='11111111-1111-1111-1111-111111111111' from public.part_requests where kind='contact'));

-- ---- validation ----
select set_config('request.jwt.claim.sub','',false);
set role anon;
select test_raises('a lead with no name is refused',
  $$select public.submit_part_request('part_request','','+233200000009')$$, 'Enter your name');
select test_raises('a lead with a junk phone is refused',
  $$select public.submit_part_request('part_request','Someone','123')$$, 'valid phone');
select test_raises('an unknown request type is refused',
  $$select public.submit_part_request('spam','Someone','+233200000009')$$, 'Invalid request type');

-- ---- flood guard ----
select public.submit_part_request('part_request','Flood','+233209999999',null,'a');
select public.submit_part_request('part_request','Flood','+233209999999',null,'b');
select public.submit_part_request('part_request','Flood','+233209999999',null,'c');
select public.submit_part_request('part_request','Flood','+233209999999',null,'d');
select public.submit_part_request('part_request','Flood','+233209999999',null,'e');
select test_raises('a 6th request from one number in 10 minutes is refused',
  $$select public.submit_part_request('part_request','Flood','+233209999999',null,'f')$$, 'Too many requests');
reset role;

-- ---- who can read what ----
select set_config('request.jwt.claim.sub','11111111-1111-1111-1111-111111111111',false);
set role authenticated;
select test_ok('a customer sees only their own leads',
  (select count(*)=1 from public.part_requests));
reset role;
select set_config('request.jwt.claim.sub','22222222-2222-2222-2222-222222222222',false);
set role authenticated;
select test_ok('staff see every lead', (select count(*)>=6 from public.part_requests));
reset role;

-- ---- staff workflow ----
select set_config('request.jwt.claim.sub','22222222-2222-2222-2222-222222222222',false);
select public.staff_set_request_status((:'anon_id')::uuid,'answered','Called and quoted');
select test_ok('staff can answer a request',
  (select status='answered' and staff_note='Called and quoted' from public.part_requests where id=(:'anon_id')::uuid));
select set_config('request.jwt.claim.sub','11111111-1111-1111-1111-111111111111',false);
select test_raises('a customer cannot change a request status',
  $$select public.staff_set_request_status('$$ || :'anon_id' || $$'::uuid,'closed')$$, 'Staff access required');
