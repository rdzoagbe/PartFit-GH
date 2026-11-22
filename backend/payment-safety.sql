-- ============================================================================
-- PartFit Ghana — payment safety rails.
--
-- Run AFTER momo-paystack.sql and order-integrity.sql. Idempotent.
--
-- What this closes:
--   1. settle_paystack_payment would mark an order paid even if it had been
--      cancelled, rejected or expired in the meantime — money against a dead
--      order, with nobody told.
--   2. An underpaid charge was written to the ledger as 'success' while the
--      order stayed 'pending', so the books said paid and the order did not.
--   3. payment_status = 'pending' was a one-way door: an abandoned checkout
--      left the order permanently unpayable and unreleasable.
--   4. There was no way to record a payment the webhook never delivered, or
--      one taken in cash / direct MoMo at the counter.
--   5. There was no way to record a refund, so a paid order could never be
--      cancelled (order-integrity.sql rightly refuses that).
-- ============================================================================

-- 'partial' and 'refunded' are now possible ledger states.
alter table public.payments drop constraint if exists payments_status_check;
alter table public.payments add constraint payments_status_check
  check (status in ('pending','success','failed','partial','refunded'));

alter table public.payments
  add column if not exists settled_note text,
  add column if not exists recorded_by  uuid references auth.users(id);

-- ---- settle: never credit a dead order, never call a short payment success --
create or replace function public.settle_paystack_payment(
  p_reference text, p_status text, p_amount numeric, p_channel text, p_raw jsonb)
returns void language plpgsql security definer set search_path = public as $$
declare pmt public.payments; o public.orders; v_short boolean;
begin
  select * into pmt from public.payments where reference = p_reference;
  if not found then return; end if;                -- not one of ours: ignore quietly
  if pmt.status = 'success' then return; end if;   -- already settled: idempotent

  select * into o from public.orders where id = pmt.order_id;

  if p_status <> 'success' then
    update public.payments set status='failed', channel=p_channel, raw=p_raw,
           settled_note='Provider reported '||coalesce(p_status,'failure'), updated_at=now()
     where id = pmt.id;
    -- let the customer try again instead of stranding the order on 'pending'
    update public.orders set payment_status='unpaid', paystack_reference=null, updated_at=now()
     where id=o.id and payment_status='pending';
    insert into public.order_events(order_id,actor_id,event_type,from_status,to_status,note)
    values (o.id,null,'payment',o.status,o.status,'MoMo payment did not complete ('||p_reference||'). Customer can retry.');
    return;
  end if;

  v_short := o.amount_due is not null and p_amount < o.amount_due;

  if v_short then
    -- Money arrived, but not enough. Record it honestly and flag it; do NOT
    -- mark the order paid and do NOT silently swallow it as before.
    update public.payments set status='partial', channel=p_channel, raw=p_raw, amount=p_amount,
           settled_note='Underpaid: received '||p_amount||' of '||o.amount_due, updated_at=now()
     where id=pmt.id;
    insert into public.order_events(order_id,actor_id,event_type,from_status,to_status,note)
    values (o.id,null,'payment',o.status,o.status,
            'UNDERPAID: received '||p_amount||' of '||o.amount_due||' ('||p_reference||'). Staff must resolve.');
    return;
  end if;

  if o.status in ('cancelled','rejected','expired') then
    -- Paid against an order that is already dead. Keep the money recorded and
    -- shout about it in the timeline so staff refund it; never resurrect it.
    update public.payments set status='success', channel=p_channel, raw=p_raw,
           settled_note='Paid against a '||o.status||' order — refund required', updated_at=now()
     where id=pmt.id;
    update public.orders set payment_status='paid', paid_at=now(), updated_at=now() where id=o.id;
    insert into public.order_events(order_id,actor_id,event_type,from_status,to_status,note)
    values (o.id,null,'payment',o.status,o.status,
            'PAYMENT RECEIVED ON A '||upper(o.status)||' ORDER ('||p_reference||'). Refund required.');
    return;
  end if;

  update public.payments set status='success', channel=p_channel, raw=p_raw, updated_at=now() where id=pmt.id;
  update public.orders set payment_status='paid', paid_at=now(), updated_at=now() where id=o.id;
  insert into public.order_events(order_id,actor_id,event_type,from_status,to_status,note)
  values (o.id,null,'payment',o.status,o.status,'MoMo payment received via Paystack ('||p_reference||').');
end $$;

revoke all on function public.settle_paystack_payment(text,text,numeric,text,jsonb) from public, anon, authenticated;

-- ---- let an abandoned checkout be retried ----------------------------------
-- The customer (or staff) can clear a stale 'pending' intent so the Pay button
-- comes back. Only clears intents older than 15 minutes that never succeeded.
create or replace function public.release_stale_payment_intent(p_public_ref text)
returns boolean language plpgsql security definer set search_path = public as $$
declare o public.orders; v_open int;
begin
  select * into o from public.orders
   where public_ref = upper(trim(p_public_ref))
     and (customer_id = auth.uid() or public.is_partfit_staff())
   for update;
  if not found then raise exception 'Order not found'; end if;
  if o.payment_status <> 'pending' then return false; end if;

  select count(*) into v_open from public.payments
   where order_id = o.id and status in ('success','partial');
  if v_open > 0 then return false; end if;     -- real money is attached: leave it

  if exists (select 1 from public.payments
              where order_id = o.id and status = 'pending' and created_at > now() - interval '15 minutes')
  then return false; end if;                   -- still plausibly in progress

  update public.payments set status='failed', settled_note='Abandoned checkout', updated_at=now()
   where order_id=o.id and status='pending';
  update public.orders set payment_status='unpaid', paystack_reference=null, updated_at=now() where id=o.id;
  insert into public.order_events(order_id,actor_id,event_type,from_status,to_status,note)
  values (o.id, auth.uid(), 'payment', o.status, o.status, 'Abandoned MoMo checkout cleared; customer can pay again.');
  return true;
end $$;

revoke all on function public.release_stale_payment_intent(text) from public, anon;
grant execute on function public.release_stale_payment_intent(text) to authenticated;

-- ---- record a payment taken outside the webhook ----------------------------
-- Cash or direct MoMo at the counter, or a Paystack charge whose webhook never
-- arrived. Staff only, amount must cover what is due, and it is written to the
-- same ledger so the books still reconcile.
create or replace function public.staff_record_manual_payment(
  p_public_ref text, p_amount numeric, p_channel text default 'cash', p_note text default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare o public.orders; v_due numeric(12,2); v_ref text;
begin
  if not public.is_partfit_staff() then raise exception 'Staff access required'; end if;
  if p_amount is null or p_amount <= 0 then raise exception 'Enter the amount received'; end if;

  select * into o from public.orders where public_ref = upper(trim(p_public_ref)) for update;
  if not found then raise exception 'Order not found'; end if;
  if o.payment_status = 'paid' then raise exception 'Order % is already paid', o.public_ref; end if;
  if o.status not in ('approved','ready_for_collection') then
    raise exception 'Order % is not awaiting payment', o.public_ref;
  end if;

  v_due := coalesce(o.amount_due, o.confirmed_total);
  if v_due is null or v_due <= 0 then raise exception 'Approve the order with a final price first'; end if;
  if p_amount < v_due then raise exception 'Received % but % is due', p_amount, v_due; end if;

  v_ref := 'MANUAL_' || o.public_ref || '_' || to_char(now(), 'YYYYMMDDHH24MISS');
  insert into public.payments(order_id, provider, reference, amount, channel, status, settled_note, recorded_by)
  values (o.id, 'manual', v_ref, p_amount, coalesce(nullif(trim(p_channel), ''), 'cash'), 'success',
          left(coalesce(p_note, 'Recorded at the counter'), 500), auth.uid());

  update public.orders set payment_status='paid', paid_at=now(), amount_due=v_due, updated_at=now() where id=o.id;
  insert into public.order_events(order_id, actor_id, event_type, from_status, to_status, note)
  values (o.id, auth.uid(), 'payment', o.status, o.status,
          'Payment of '||p_amount||' recorded by staff ('||coalesce(p_channel,'cash')||').');

  return jsonb_build_object('public_ref', o.public_ref, 'payment_status', 'paid', 'amount', p_amount, 'reference', v_ref);
end $$;

revoke all on function public.staff_record_manual_payment(text,numeric,text,text) from public, anon;
grant execute on function public.staff_record_manual_payment(text,numeric,text,text) to authenticated;

-- ---- record a refund, which also unblocks cancelling ------------------------
create or replace function public.staff_record_refund(
  p_public_ref text, p_amount numeric, p_note text default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare o public.orders;
begin
  if not public.is_partfit_staff() then raise exception 'Staff access required'; end if;
  select * into o from public.orders where public_ref = upper(trim(p_public_ref)) for update;
  if not found then raise exception 'Order not found'; end if;
  if o.payment_status <> 'paid' then raise exception 'Order % is not paid', o.public_ref; end if;
  if p_amount is null or p_amount <= 0 then raise exception 'Enter the refunded amount'; end if;

  insert into public.payments(order_id, provider, reference, amount, channel, status, settled_note, recorded_by)
  values (o.id, 'manual', 'REFUND_'||o.public_ref||'_'||to_char(now(),'YYYYMMDDHH24MISS'),
          p_amount, 'refund', 'refunded', left(coalesce(p_note,'Refund recorded by staff'), 500), auth.uid());

  update public.orders set payment_status='refunded', updated_at=now() where id=o.id;
  insert into public.order_events(order_id, actor_id, event_type, from_status, to_status, note)
  values (o.id, auth.uid(), 'refund', o.status, o.status, 'Refund of '||p_amount||' recorded. Order can now be cancelled.');

  return jsonb_build_object('public_ref', o.public_ref, 'payment_status', 'refunded', 'amount', p_amount);
end $$;

revoke all on function public.staff_record_refund(text,numeric,text) from public, anon;
grant execute on function public.staff_record_refund(text,numeric,text) to authenticated;
