-- Minimal stand-in for the parts of Supabase the migrations touch.
do $$ begin
  if not exists (select 1 from pg_roles where rolname='anon') then create role anon nologin; end if;
  if not exists (select 1 from pg_roles where rolname='authenticated') then create role authenticated nologin; end if;
  if not exists (select 1 from pg_roles where rolname='service_role') then create role service_role nologin; end if;
end $$;
grant usage on schema public to anon, authenticated, service_role;

create schema if not exists auth;
create table if not exists auth.users (
  id uuid primary key default gen_random_uuid(),
  email text unique,
  raw_user_meta_data jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);
-- Supabase reads the JWT sub; we read a settable GUC instead.
create or replace function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid;
$$;
grant usage on schema auth to anon, authenticated, service_role;
grant execute on function auth.uid() to anon, authenticated, service_role;
create schema if not exists cron;
-- Minimal pg_cron stand-in so backend/reservation-expiry-cron.sql applies here.
create table if not exists cron.job (
  jobid bigserial primary key, jobname text unique, schedule text, command text);
create or replace function cron.schedule(p_jobname text, p_schedule text, p_command text)
returns bigint language plpgsql as $$
declare id bigint; begin
  insert into cron.job(jobname, schedule, command) values (p_jobname, p_schedule, p_command)
  on conflict(jobname) do update set schedule=excluded.schedule, command=excluded.command
  returning jobid into id;
  return id; end $$;
create or replace function cron.unschedule(p_jobname text)
returns boolean language plpgsql as $$
begin delete from cron.job where jobname = p_jobname; return true; end $$;
