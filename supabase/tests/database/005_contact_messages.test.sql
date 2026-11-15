begin;
select plan(11);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000d1', 'mgr@test.local'),
  ('00000000-0000-0000-0000-0000000000d2', 'cust@test.local'),
  ('00000000-0000-0000-0000-0000000000d3', 'cat@test.local');
update public.profiles set role = 'order_manager'   where id = '00000000-0000-0000-0000-0000000000d1';
update public.profiles set role = 'catalog_manager' where id = '00000000-0000-0000-0000-0000000000d3';

insert into public.contact_messages (name, email, subject, message)
values ('Test', 't@example.com', 'Hi', 'Hello');

-- Visitors
do $$ begin perform set_config('request.jwt.claims', '', true); end $$;
set local role anon;
select throws_ok($$ select * from public.contact_messages $$, '42501', null, 'visitors cannot read messages');
select throws_ok(
  $$ insert into public.contact_messages (name, email, subject, message) values ('a', 'a@b.co', 's', 'm') $$,
  '42501', null, 'visitors cannot insert directly (only the Edge Function can)');
reset role;

-- A customer
do $$ begin perform set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000000d2","role":"authenticated"}', true); end $$;
set local role authenticated;
select is((select count(*)::int from public.contact_messages), 0, 'customers see no messages');
select lives_ok($$ update public.contact_messages set status = 'archived' $$, 'customer update runs but matches no rows');
reset role;
select is((select status from public.contact_messages limit 1), 'new', 'customer update changed nothing');

-- Catalog manager (not support staff)
do $$ begin perform set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000000d3","role":"authenticated"}', true); end $$;
set local role authenticated;
select is((select count(*)::int from public.contact_messages), 0, 'catalog managers cannot read messages');
reset role;

-- Order manager
do $$ begin perform set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000000d1","role":"authenticated"}', true); end $$;
set local role authenticated;
select is((select count(*)::int from public.contact_messages), 1, 'order managers can read messages');
select lives_ok($$ update public.contact_messages set status = 'read' $$, 'order managers can change the status');
select throws_ok($$ update public.contact_messages set name = 'Changed' $$, '42501', null,
  'nobody can edit the customer’s own words');
select lives_ok($$ delete from public.contact_messages $$, 'delete runs but only the owner may delete');
reset role;
select is((select count(*)::int from public.contact_messages), 1, 'the message is still there');

select * from finish();
rollback;