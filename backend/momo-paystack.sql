-- ============================================================================
-- PartFit Ghana — Mobile Money payments via Paystack (pay-after-approval)
--
-- Model: customer orders -> staff confirm fitment/stock and set the final
-- price (confirmed_total, incl. delivery) -> customer pays MoMo via Paystack
-- -> Paystack webhook marks the order paid -> staff release for delivery/pickup.
--
-- SECURITY: the amount charged is ALWAYS derived server-side from the order's
-- confirmed_total (never trusted from the client). Payments are only marked
-- 'paid' by the webhook (service role), after Paystack's signature is verified
-- in the edge function, and only when the amount is not less than what is due.
--
-- Phase 1 (this file + the edge functions) is DORMANT until deployed with your
-- Paystack keys and wired to the client in Phase 2. Safe + idempotent to run.
-- Run once in the Supabase SQL editor. See SETUP-PAYMENTS.md.
-- ============================================================================

-- ---- Order columns for payment + delivery -----------------------------------
alter table public.orders
  add column if not exists fulfilment_type  text default 'pickup' check (fulfilment_type in ('pickup','delivery')),
  add column if not exists delivery_fee     numeric(12,2) not null default 0,
  add column if not exists delivery_address text,
  add column if not exists payment_status   text not null default 'unpaid' check (payment_status in ('unpaid','pending','paid','refunded')),
  add column if not exists amount_due        numeric(12,2),
  add column if not exists paid_at           timestamptz,
  add column if not exists paystack_reference text;

-- ---- Payments ledger --------------------------------------------------------
create table if not exists public.payments (
  id         uuid primary key default gen_random_uuid(),
  order_id   uuid not null references public.orders(id) on delete cascade,
  provider   text not null default 'paystack',
  reference  text not null unique,
  amount     numeric(12,2) not null,
  currency   text not null default 'GHS',
  channel    text,
  status     text not null default 'pending' check (status in ('pending','success','failed')),
  raw        jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_partfit_payments_order on public.payments(order_id, created_at desc);

alter table public.payments enable row level security;

-- Owner (or staff) may read their payment rows. Writes happen only via the
-- SECURITY DEFINER functions below / the service role — never direct client DML.
drop policy if exists "payment owner read" on public.payments;
create policy "payment owner read" on public.payments for select using (
  exists (select 1 from public.orders o where o.id = order_id and o.customer_id = auth.uid())
  or public.is_partfit_staff()
);
revoke all on public.payments from anon, authenticated;
grant select on public.payments to authenticated;

-- ---- Begin a payment (called as the customer via the edge function) ---------
-- Verifies ownership + that the order is approved and unpaid, then derives the
-- amount FROM confirmed_total (server-owned) and opens a pending payment.
create or replace function public.begin_paystack_payment(p_public_ref text, p_reference text)
returns numeric
language plpgsql
security definer
set search_path = public
as $$
declare o public.orders; v_amount numeric(12,2);
begin
  select * into o from public.orders where public_ref = p_public_ref and customer_id = auth.uid();
  if not found then raise exception 'Order not found'; end if;
  if o.status <> 'approved' then raise exception 'Order is not awaiting payment'; end if;
  if o.payment_status = 'paid' then raise exception 'Order is already paid'; end if;
  if o.confirmed_total is null or o.confirmed_total <= 0 then raise exception 'Final price has not been set yet'; end if;

  v_amount := o.confirmed_total;

  insert into public.payments(order_id, reference, amount, status)
  values (o.id, p_reference, v_amount, 'pending');

  update public.orders
     set payment_status = 'pending', paystack_reference = p_reference, amount_due = v_amount, updated_at = now()
   where id = o.id;

  return v_amount;
end $$;

revoke all on function public.begin_paystack_payment(text, text) from public, anon;
grant execute on function public.begin_paystack_payment(text, text) to authenticated;

-- ---- Settle a payment (called ONLY by the webhook / service role) -----------
-- Idempotent. Marks the order paid only on success AND when the amount paid is
-- not less than the amount due (guards underpayment).
create or replace function public.settle_paystack_payment(
  p_reference text, p_status text, p_amount numeric, p_channel text, p_raw jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare pmt public.payments; o public.orders;
begin
  select * into pmt from public.payments where reference = p_reference;
  if not found then return; end if;                 -- unknown reference: ignore
  if pmt.status = 'success' then return; end if;     -- already settled: idempotent

  update public.payments
     set status = case when p_status = 'success' then 'success' else 'failed' end,
         channel = p_channel, raw = p_raw, updated_at = now()
   where id = pmt.id;

  if p_status = 'success' then
    select * into o from public.orders where id = pmt.order_id;
    if o.amount_due is not null and p_amount < o.amount_due then
      return;                                        -- underpaid: do not mark paid
    end if;
    update public.orders
       set payment_status = 'paid', paid_at = now(), updated_at = now()
     where id = o.id;
    insert into public.order_events(order_id, actor_id, event_type, from_status, to_status, note)
    values (o.id, null, 'payment', o.status, o.status,
            'MoMo payment received via Paystack (' || p_reference || ').');
  end if;
end $$;

-- Service role / webhook only — never customers or staff clients.
revoke all on function public.settle_paystack_payment(text, text, numeric, text, jsonb) from public, anon, authenticated;
