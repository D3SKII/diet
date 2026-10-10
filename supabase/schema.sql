-- Выполнить один раз в SQL Editor проекта Supabase.
create table if not exists public.household_state (
  owner_id uuid primary key references auth.users(id) on delete cascade,
  revision integer not null default 1,
  payload jsonb not null,
  updated_at timestamptz not null default now()
);
alter table public.household_state enable row level security;
create policy "Read own household" on public.household_state for select to authenticated using ((select auth.uid()) = owner_id);
-- Запись только через функцию с проверкой версии. Прямую запись клиентам не разрешаем.
revoke all on public.household_state from anon, authenticated;
grant select on public.household_state to authenticated;
create or replace function public.save_household(expected_revision integer, new_payload jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare saved public.household_state;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if jsonb_typeof(new_payload) <> 'object' or (new_payload->>'schema') is distinct from '1' or octet_length(new_payload::text) > 500000 then
    raise exception 'Invalid payload';
  end if;
  -- Сериализация записей одного аккаунта, включая первый INSERT.
  perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text, 0));
  if expected_revision = 0 then
    insert into public.household_state(owner_id, revision, payload)
    values(auth.uid(), 1, new_payload) on conflict do nothing returning * into saved;
  else
    update public.household_state set payload=new_payload, revision=revision+1, updated_at=now()
    where owner_id=auth.uid() and revision=expected_revision returning * into saved;
  end if;
  if saved.owner_id is null then return null; end if;
  return jsonb_build_object('revision',saved.revision,'payload',saved.payload);
end;
$$;
revoke all on function public.save_household(integer,jsonb) from public, anon;
grant execute on function public.save_household(integer,jsonb) to authenticated;
