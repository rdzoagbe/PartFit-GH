-- PartFit Ghana production backend blueprint (Supabase/Postgres)
create extension if not exists pgcrypto;

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

alter table public.profiles enable row level security;
alter table public.staff_roles enable row level security;
alter table public.vehicles enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.order_events enable row level security;

create or replace function public.is_partfit_staff()
returns boolean language sql stable security definer set search_path=public as $$
  select exists(select 1 from public.staff_roles where user_id=auth.uid());
$$;

create policy "profile own read" on public.profiles for select using (id=auth.uid());
create policy "profile own update" on public.profiles for update using (id=auth.uid()) with check (id=auth.uid());
create policy "vehicle own read" on public.vehicles for select using (owner_id=auth.uid());
create policy "vehicle own insert" on public.vehicles for insert with check (owner_id=auth.uid());
create policy "vehicle own update" on public.vehicles for update using (owner_id=auth.uid()) with check (owner_id=auth.uid());
create policy "vehicle own delete" on public.vehicles for delete using (owner_id=auth.uid());

create policy "order customer read" on public.orders for select using (customer_id=auth.uid());
create policy "order customer submit" on public.orders for insert with check (customer_id=auth.uid() and status='submitted' and confirmed_total is null and approved_at is null and ready_at is null and collected_at is null);
create policy "order staff read" on public.orders for select using (public.is_partfit_staff());
create policy "order staff update" on public.orders for update using (public.is_partfit_staff()) with check (public.is_partfit_staff());

create policy "items customer read" on public.order_items for select using (exists(select 1 from public.orders o where o.id=order_id and o.customer_id=auth.uid()));
create policy "items staff read" on public.order_items for select using (public.is_partfit_staff());
create policy "items staff update" on public.order_items for update using (public.is_partfit_staff()) with check (public.is_partfit_staff());
create policy "events customer read" on public.order_events for select using (exists(select 1 from public.orders o where o.id=order_id and o.customer_id=auth.uid()));
create policy "events staff read" on public.order_events for select using (public.is_partfit_staff());
create policy "events staff insert" on public.order_events for insert with check (public.is_partfit_staff());

-- In production, create orders/items through a controlled RPC or server endpoint in one transaction.
-- Never expose the Supabase service-role key in browser code.
