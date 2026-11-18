-- 11. Payments: gateway events, flagging, refunds
-- * payment_events: one row per gateway notification (idempotency)
-- * apply_gateway_result(): called only by the payment-webhook Edge Function
-- * admin_flag_payment / admin_request_refund / admin_process_refund

-- ---------------------------------------------------------- payment_events
-- One row per gateway notification. The unique key makes webhooks idempotent.
create table public.payment_events (
  id          bigint generated always as identity primary key,
  provider    text not null,
  event_id    text not null,
  payment_id  uuid references public.payments (id) on delete set null,
  outcome     text not null default 'received',
  payload     jsonb not null default '{}'::jsonb,   -- sanitized by the adapter; never store secrets
  created_at  timestamptz not null default now(),
  unique (provider, event_id)
);
create index payment_events_payment_idx on public.payment_events (payment_id);

alter table public.payment_events enable row level security;
create policy "payment_events: owner read"
  on public.payment_events for select using (public.has_role('owner'));
revoke all on public.payment_events from anon, authenticated;
grant select on public.payment_events to authenticated;

-- ------------------------------------------------------ apply_gateway_result
-- Called ONLY by the payment-webhook Edge Function (service role), after the
-- provider's signature has been verified there.
-- Input: { provider, event_id, provider_reference, status: 'paid'|'failed',
--          amount, currency, raw }
create or replace function public.apply_gateway_result(p jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_provider  text := nullif(btrim(p ->> 'provider'), '');
  v_event     text := nullif(btrim(p ->> 'event_id'), '');
  v_ref       text := nullif(btrim(p ->> 'provider_reference'), '');
  v_status    text := p ->> 'status';
  v_amount    numeric(10,2) := nullif(p ->> 'amount', '')::numeric(10,2);
  v_currency  text := upper(coalesce(nullif(p ->> 'currency', ''), 'BDT'));
  v_rows      integer;
  v_pay       public.payments;
  v_outcome   text;
begin
  if v_provider is null or v_event is null or v_ref is null
     or v_status is null or v_status not in ('paid', 'failed') then
    raise exception 'invalid_event' using errcode = 'P0001';
  end if;

  -- Idempotency: the first delivery of an event id wins; repeats do nothing.
  insert into public.payment_events (provider, event_id, payload)
  values (v_provider, v_event, coalesce(p -> 'raw', '{}'::jsonb))
  on conflict (provider, event_id) do nothing;
  get diagnostics v_rows = row_count;
  if v_rows = 0 then
    return jsonb_build_object('outcome', 'replayed');
  end if;

  select * into v_pay
    from public.payments
   where provider = v_provider and provider_reference = v_ref
   for update;
  if not found then
    update public.payment_events set outcome = 'unknown_payment'
     where provider = v_provider and event_id = v_event;
    return jsonb_build_object('outcome', 'unknown_payment');
  end if;

  if v_status = 'paid' then
    if v_amount is distinct from v_pay.amount or v_currency <> 'BDT' then
      v_outcome := 'amount_mismatch';
      if v_pay.status not in ('paid', 'partially_refunded', 'refunded') then
        update public.payments
           set status = 'requires_review',
               verification_metadata = verification_metadata
                 || jsonb_build_object('mismatch_event', v_event, 'reported_amount', v_amount,
                                       'reported_currency', v_currency)
         where id = v_pay.id;
      end if;
    elsif v_pay.status in ('paid', 'partially_refunded', 'refunded') then
      v_outcome := 'already_paid';
    else
      v_outcome := 'paid';
      update public.payments
         set status = 'paid',
             verified_at = now(),
             verification_metadata = verification_metadata || jsonb_build_object('gateway_event', v_event)
       where id = v_pay.id;
    end if;
  else
    -- A failure notice can never undo a payment that is already final.
    if v_pay.status in ('unpaid', 'pending') then
      v_outcome := 'failed';
      update public.payments
         set status = 'failed',
             verification_metadata = verification_metadata || jsonb_build_object('gateway_event', v_event)
       where id = v_pay.id;
    else
      v_outcome := 'ignored';
    end if;
  end if;

  update public.payment_events
     set payment_id = v_pay.id, outcome = v_outcome
   where provider = v_provider and event_id = v_event;

  return jsonb_build_object('outcome', v_outcome, 'payment_id', v_pay.id, 'order_id', v_pay.order_id);
end;
$$;

-- ----------------------------------------------------------- admin: flagging
create or replace function public.admin_flag_payment(p_payment_id uuid, p_note text default null)
returns public.payments
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_pay public.payments;
begin
  if not public.has_role('owner', 'order_manager') then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  select * into v_pay from public.payments where id = p_payment_id for update;
  if not found then
    raise exception 'payment_not_found' using errcode = 'P0002';
  end if;
  if v_pay.status in ('paid', 'partially_refunded', 'refunded') then
    raise exception 'payment_already_final' using errcode = 'P0001';
  end if;

  update public.payments
     set status = 'requires_review',
         verification_metadata = verification_metadata || jsonb_build_object('flag_note', p_note)
   where id = p_payment_id
   returning * into v_pay;

  insert into public.admin_logs (actor_id, action, table_name, record_id, details)
  values (auth.uid(), 'flag_payment', 'payments', p_payment_id::text, jsonb_build_object('note', p_note));
  return v_pay;
end;
$$;

-- ---------------------------------------------------------- admin: refunds
create or replace function public.admin_request_refund(
  p_payment_id uuid, p_amount numeric, p_reason text default null)
returns public.refunds
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_pay        public.payments;
  v_committed  numeric(10,2);
  v_ref        public.refunds;
begin
  if not public.has_role('owner', 'order_manager') then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if p_amount is null or p_amount <= 0 then
    raise exception 'invalid_amount' using errcode = 'P0001';
  end if;

  select * into v_pay from public.payments where id = p_payment_id for update;
  if not found then
    raise exception 'payment_not_found' using errcode = 'P0002';
  end if;
  if v_pay.status not in ('paid', 'partially_refunded') then
    raise exception 'payment_not_refundable' using errcode = 'P0001';
  end if;

  select coalesce(sum(amount), 0) into v_committed
    from public.refunds
   where payment_id = p_payment_id and status in ('requested', 'approved', 'processed');
  if p_amount > v_pay.amount - v_committed then
    raise exception 'refund_exceeds_payment' using errcode = 'P0001';
  end if;

  insert into public.refunds (payment_id, order_id, amount, reason)
  values (p_payment_id, v_pay.order_id, p_amount, nullif(btrim(p_reason), ''))
  returning * into v_ref;

  insert into public.admin_logs (actor_id, action, table_name, record_id, details)
  values (auth.uid(), 'request_refund', 'refunds', v_ref.id::text,
          jsonb_build_object('payment_id', p_payment_id, 'amount', p_amount, 'reason', p_reason));
  return v_ref;
end;
$$;

-- Owner only. 'mark_processed' records that the money was sent back (outside
-- the app) and updates the payment to partially_refunded / refunded.
create or replace function public.admin_process_refund(
  p_refund_id uuid, p_action text, p_note text default null)
returns public.refunds
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_ref        public.refunds;
  v_pay        public.payments;
  v_processed  numeric(10,2);
begin
  if not public.has_role('owner') then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  select * into v_ref from public.refunds where id = p_refund_id for update;
  if not found then
    raise exception 'refund_not_found' using errcode = 'P0002';
  end if;

  if p_action = 'approve' then
    if v_ref.status <> 'requested' then
      raise exception 'invalid_refund_state' using errcode = 'P0001';
    end if;
    update public.refunds set status = 'approved', processed_by = auth.uid()
     where id = p_refund_id returning * into v_ref;

  elsif p_action = 'reject' then
    if v_ref.status not in ('requested', 'approved') then
      raise exception 'invalid_refund_state' using errcode = 'P0001';
    end if;
    update public.refunds set status = 'rejected', processed_by = auth.uid()
     where id = p_refund_id returning * into v_ref;

  elsif p_action = 'mark_processed' then
    if v_ref.status <> 'approved' then
      raise exception 'invalid_refund_state' using errcode = 'P0001';
    end if;
    update public.refunds set status = 'processed', processed_by = auth.uid()
     where id = p_refund_id returning * into v_ref;

    select * into v_pay from public.payments where id = v_ref.payment_id for update;
    select coalesce(sum(amount), 0) into v_processed
      from public.refunds where payment_id = v_ref.payment_id and status = 'processed';
    update public.payments
       set status = case when v_processed >= v_pay.amount then 'refunded' else 'partially_refunded' end
     where id = v_ref.payment_id;

  else
    raise exception 'invalid_action' using errcode = 'P0001';
  end if;

  insert into public.admin_logs (actor_id, action, table_name, record_id, details)
  values (auth.uid(), 'refund_' || p_action, 'refunds', p_refund_id::text,
          jsonb_build_object('note', p_note, 'status', v_ref.status));
  return v_ref;
end;
$$;

-- -------------------------------------------------------------- privileges
revoke all on function public.apply_gateway_result(jsonb) from public, anon, authenticated;
grant execute on function public.apply_gateway_result(jsonb) to service_role;

revoke all on function public.admin_flag_payment(uuid, text) from public, anon;
revoke all on function public.admin_request_refund(uuid, numeric, text) from public, anon;
revoke all on function public.admin_process_refund(uuid, text, text) from public, anon;
grant execute on function public.admin_flag_payment(uuid, text) to authenticated;
grant execute on function public.admin_request_refund(uuid, numeric, text) to authenticated;
grant execute on function public.admin_process_refund(uuid, text, text) to authenticated;
