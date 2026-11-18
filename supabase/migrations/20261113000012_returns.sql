-- 12. Returns and exchanges
-- * extra columns on return_requests
-- * return_policy setting (OFF until the owner configures a window)
-- * request_return(): customers file a request (server checks everything)
-- * admin_update_return(): staff move a request through its steps

alter table public.return_requests
  add column request_type  text  not null default 'return'
             check (request_type in ('return', 'exchange')),
  add column items         jsonb not null default '[]'::jsonb,
  add column response_note text  check (response_note is null or length(response_note) <= 500);

-- Off until the owner sets a window in Admin > Settings.
insert into public.store_settings (key, value, is_public)
values ('return_policy', '{"enabled": false, "window_days": null}'::jsonb, true)
on conflict (key) do nothing;

-- ------------------------------------------------------------------ request_return
-- Callable by signed-in customers. Checks ownership, delivery, the owner's
-- return window, and that no other request for the order is still open.
-- p_items: [{ "order_item_id": uuid, "quantity": int }]
create or replace function public.request_return(
  p_order_id uuid, p_type text, p_reason text, p_items jsonb)
returns public.return_requests
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid      uuid := auth.uid();
  v_order    public.orders;
  v_policy   jsonb;
  v_days     integer;
  v_reason   text := btrim(coalesce(p_reason, ''));
  v_item     record;
  v_ordered  integer;
  v_clean    jsonb := '[]'::jsonb;
  v_row      public.return_requests;
begin
  if v_uid is null then
    raise exception 'not_signed_in' using errcode = '42501';
  end if;

  select value into v_policy from public.store_settings where key = 'return_policy';
  v_days := nullif(v_policy ->> 'window_days', '')::integer;
  if coalesce((v_policy ->> 'enabled')::boolean, false) is not true or v_days is null or v_days < 1 then
    raise exception 'returns_unavailable' using errcode = 'P0001';
  end if;

  if p_type is null or p_type not in ('return', 'exchange') then
    raise exception 'invalid_type' using errcode = 'P0001';
  end if;
  if length(v_reason) not between 1 and 1000 then
    raise exception 'invalid_reason' using errcode = 'P0001';
  end if;

  select * into v_order from public.orders where id = p_order_id and user_id = v_uid;
  if not found then
    raise exception 'order_not_found' using errcode = 'P0002';
  end if;
  if v_order.order_status <> 'delivered' then
    raise exception 'order_not_delivered' using errcode = 'P0001';
  end if;
  if v_order.delivered_at is null or v_order.delivered_at < now() - make_interval(days => v_days) then
    raise exception 'return_window_closed' using errcode = 'P0001';
  end if;
  if exists (
    select 1 from public.return_requests
     where order_id = p_order_id and status in ('requested', 'approved', 'received')
  ) then
    raise exception 'return_already_open' using errcode = 'P0001';
  end if;

  if jsonb_typeof(p_items) is distinct from 'array' then
    raise exception 'invalid_items' using errcode = 'P0001';
  end if;
  if jsonb_array_length(p_items) not between 1 and 50 then
    raise exception 'invalid_items' using errcode = 'P0001';
  end if;

  for v_item in
    select x.order_item_id, sum(x.quantity)::integer as qty
      from jsonb_to_recordset(p_items) as x(order_item_id uuid, quantity integer)
     group by x.order_item_id
  loop
    select oi.quantity into v_ordered
      from public.order_items oi
     where oi.id = v_item.order_item_id and oi.order_id = p_order_id;
    if not found or coalesce(v_item.qty, 0) < 1 or v_item.qty > v_ordered then
      raise exception 'invalid_items' using errcode = 'P0001';
    end if;
    v_clean := v_clean || jsonb_build_object('order_item_id', v_item.order_item_id, 'quantity', v_item.qty);
  end loop;

  insert into public.return_requests (order_id, user_id, request_type, reason, items)
  values (p_order_id, v_uid, p_type, v_reason, v_clean)
  returning * into v_row;

  insert into public.notifications (user_id, type, title, data)
  values (v_uid, 'return_requested',
          'We received your ' || p_type || ' request for order ' || v_order.order_number,
          jsonb_build_object('order_id', p_order_id, 'return_id', v_row.id));

  return v_row;
end;
$$;

-- --------------------------------------------------------------- admin_update_return
-- requested -> approved | rejected;  approved -> received | rejected;  received -> completed
create or replace function public.admin_update_return(
  p_id uuid, p_status text, p_note text default null)
returns public.return_requests
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_ret    public.return_requests;
  v_number text;
begin
  if not public.has_role('owner', 'order_manager') then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  select * into v_ret from public.return_requests where id = p_id for update;
  if not found then
    raise exception 'return_not_found' using errcode = 'P0002';
  end if;

  if not (
       (v_ret.status = 'requested' and p_status in ('approved', 'rejected'))
    or (v_ret.status = 'approved'  and p_status in ('received', 'rejected'))
    or (v_ret.status = 'received'  and p_status = 'completed')
  ) then
    raise exception 'invalid_return_state' using errcode = 'P0001';
  end if;

  update public.return_requests
     set status = p_status,
         response_note = coalesce(nullif(left(btrim(coalesce(p_note, '')), 500), ''), response_note)
   where id = p_id
   returning * into v_ret;

  select order_number into v_number from public.orders where id = v_ret.order_id;

  if v_ret.user_id is not null then
    insert into public.notifications (user_id, type, title, data)
    values (v_ret.user_id, 'return_update',
            'Your ' || v_ret.request_type || ' request for order ' || v_number || ' is now ' || p_status,
            jsonb_build_object('order_id', v_ret.order_id, 'return_id', v_ret.id));
  end if;

  insert into public.admin_logs (actor_id, action, table_name, record_id, details)
  values (auth.uid(), 'update_return', 'return_requests', p_id::text,
          jsonb_build_object('status', p_status, 'note', p_note));
  return v_ret;
end;
$$;

revoke all on function public.request_return(uuid, text, text, jsonb) from public, anon;
revoke all on function public.admin_update_return(uuid, text, text) from public, anon;
grant execute on function public.request_return(uuid, text, text, jsonb) to authenticated;
grant execute on function public.admin_update_return(uuid, text, text) to authenticated;
