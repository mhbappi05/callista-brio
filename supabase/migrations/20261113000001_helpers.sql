-- 1. Shared helpers
-- Money is NUMERIC(10,2) everywhere. Timestamps are timestamptz (stored UTC);
-- the UI renders them in Asia/Dhaka.

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- Normalizes Bangladesh mobile numbers to +8801XXXXXXXXX.
-- Returns NULL when the input cannot be normalized.
create or replace function public.normalize_bd_phone(p text)
returns text
language plpgsql
immutable
as $$
declare
  d text;
begin
  if p is null then
    return null;
  end if;
  d := regexp_replace(p, '[^0-9]', '', 'g');
  if d ~ '^8801[0-9]{9}$' then
    return '+' || d;
  elsif d ~ '^01[0-9]{9}$' then
    return '+88' || d;
  end if;
  return null;
end;
$$;
