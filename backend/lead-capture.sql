-- ============================================================================
-- PartFit Ghana — lead capture (Request a Part + Contact).
--
-- Run AFTER setup-all.sql. Idempotent.
--
-- Both of these forms used to do exactly one thing: build a WhatsApp message
-- and hand it to whatsapp(). Nothing was ever stored. So every enquiry for a
-- part outside the nine-item catalogue — which is the whole point of the
-- Request tab — depended on the customer completing a handoff to an app that
-- may not be installed, through a window.open() that Android frequently
-- blocks. If anything in that chain failed, the lead was gone and nobody knew
-- it had ever existed.
--
-- Now the lead is written here FIRST and the WhatsApp handoff is a bonus.
-- ============================================================================

create table if not exists public.part_requests (
  id          uuid primary key default gen_random_uuid(),
  kind        text not null default 'part_request' check (kind in ('part_request','contact')),
  customer_id uuid references auth.users(id),      -- null for a signed-out visitor
  name        text not null,
  phone       text not null,
  email       text,
  subject     text,                                 -- part needed / contact topic
  vehicle_label text,
  part_number text,
  details     jsonb not null default '{}'::jsonb,   -- OE, VIN, qty, notes, message
  status      text not null default 'new' check (status in ('new','in_progress','answered','closed')),
  staff_note  text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists idx_partfit_requests_queue on public.part_requests(status, created_at desc);
create index if not exists idx_partfit_requests_phone on public.part_requests(phone, created_at desc);

alter table public.part_requests enable row level security;

-- Customers see their own; staff see everything. Writes go through the RPC
-- below or the staff update policy — never direct client INSERT.
drop policy if exists "requests own read" on public.part_requests;
create policy "requests own read" on public.part_requests for select
  using ((customer_id is not null and customer_id = auth.uid()) or public.is_partfit_staff());
drop policy if exists "requests staff update" on public.part_requests;
create policy "requests staff update" on public.part_requests for update
  using (public.is_partfit_staff()) with check (public.is_partfit_staff());

revoke all on public.part_requests from anon, authenticated;
grant select on public.part_requests to authenticated;
grant update on public.part_requests to authenticated;   -- gated by the policy

-- ---- submit (open to signed-out visitors: this is a lead form) -------------
create or replace function public.submit_part_request(
  p_kind text, p_name text, p_phone text, p_email text default null,
  p_subject text default null, p_vehicle_label text default null,
  p_part_number text default null, p_details jsonb default '{}'::jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_kind text; v_name text; v_phone text; v_id uuid; v_recent int;
begin
  v_kind := lower(coalesce(nullif(trim(p_kind), ''), 'part_request'));
  if v_kind not in ('part_request','contact') then raise exception 'Invalid request type'; end if;

  v_name  := left(trim(coalesce(p_name, '')), 120);
  v_phone := left(trim(coalesce(p_phone, '')), 40);
  if v_name = '' then raise exception 'Enter your name'; end if;
  if length(regexp_replace(v_phone, '[^0-9]', '', 'g')) < 9 then raise exception 'Enter a valid phone number'; end if;

  -- Cheap flood guard. The form is open to anyone, so cap how fast one number
  -- can file enquiries; genuine customers never hit this.
  select count(*) into v_recent from public.part_requests
   where phone = v_phone and created_at > now() - interval '10 minutes';
  if v_recent >= 5 then raise exception 'Too many requests just now — please give us a few minutes'; end if;

  insert into public.part_requests(kind, customer_id, name, phone, email, subject, vehicle_label, part_number, details)
  values (v_kind, auth.uid(), v_name, v_phone,
          left(nullif(trim(coalesce(p_email, '')), ''), 160),
          left(nullif(trim(coalesce(p_subject, '')), ''), 200),
          left(nullif(trim(coalesce(p_vehicle_label, '')), ''), 180),
          left(nullif(trim(coalesce(p_part_number, '')), ''), 80),
          coalesce(p_details, '{}'::jsonb))
  returning id into v_id;

  return jsonb_build_object('id', v_id, 'kind', v_kind, 'status', 'new');
end $$;

revoke all on function public.submit_part_request(text,text,text,text,text,text,text,jsonb) from public;
grant execute on function public.submit_part_request(text,text,text,text,text,text,text,jsonb) to anon, authenticated;

-- ---- staff: move a request through the queue --------------------------------
create or replace function public.staff_set_request_status(p_id uuid, p_status text, p_note text default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare r public.part_requests;
begin
  if not public.is_partfit_staff() then raise exception 'Staff access required'; end if;
  if p_status not in ('new','in_progress','answered','closed') then raise exception 'Invalid status'; end if;
  update public.part_requests
     set status = p_status,
         staff_note = coalesce(left(nullif(trim(coalesce(p_note,'')),''), 500), staff_note),
         updated_at = now()
   where id = p_id returning * into r;
  if not found then raise exception 'Request not found'; end if;
  return jsonb_build_object('id', r.id, 'status', r.status);
end $$;

revoke all on function public.staff_set_request_status(uuid,text,text) from public, anon;
grant execute on function public.staff_set_request_status(uuid,text,text) to authenticated;
