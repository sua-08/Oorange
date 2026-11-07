create table if not exists public.goal_records (
  user_id uuid not null references auth.users(id) on delete cascade,
  id uuid not null,
  record jsonb not null,
  updated_at bigint not null,
  primary key (user_id, id),
  constraint goal_record_id_matches check (record ->> 'id' = id::text)
);

create index if not exists goal_records_user_updated_idx on public.goal_records (user_id, updated_at desc);
alter table public.goal_records enable row level security;
revoke all on public.goal_records from anon;
grant select, insert, update on public.goal_records to authenticated;

create or replace function public.keep_final_goal_snapshot() returns trigger
language plpgsql as $$
begin
  if old.record ->> 'status' = 'harvested' then return old; end if;
  if new.record ->> 'status' <> 'harvested' and new.updated_at < old.updated_at then return old; end if;
  return new;
end;
$$;
create trigger keep_final_goal_snapshot before update on public.goal_records
  for each row execute function public.keep_final_goal_snapshot();

create policy "read own goals" on public.goal_records for select to authenticated
  using ((select auth.uid()) = user_id and (select auth.jwt() ->> 'is_anonymous') = 'false');
create policy "insert own goals" on public.goal_records for insert to authenticated
  with check ((select auth.uid()) = user_id and (select auth.jwt() ->> 'is_anonymous') = 'false');
create policy "update own goals" on public.goal_records for update to authenticated
  using ((select auth.uid()) = user_id and (select auth.jwt() ->> 'is_anonymous') = 'false')
  with check ((select auth.uid()) = user_id and (select auth.jwt() ->> 'is_anonymous') = 'false');
