-- Futtasd a meglévő Supabase projekt SQL Editor felületén.
-- Nem módosítja a meglévő public.workouts táblát.
create table if not exists public.training_plans (
  user_id uuid not null references auth.users(id) on delete cascade,
  plan_key text not null default 'current',
  payload jsonb not null,
  updated_at timestamptz not null default now(),
  primary key(user_id,plan_key)
);
alter table public.training_plans enable row level security;
create policy "Users read own plans" on public.training_plans for select to authenticated using ((select auth.uid())=user_id);
create policy "Users insert own plans" on public.training_plans for insert to authenticated with check ((select auth.uid())=user_id);
create policy "Users update own plans" on public.training_plans for update to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
create policy "Users delete own plans" on public.training_plans for delete to authenticated using ((select auth.uid())=user_id);
