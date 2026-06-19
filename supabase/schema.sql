-- Kør denne SQL i Supabase SQL Editor:
-- https://app.supabase.com → dit projekt → SQL Editor

create table if not exists public.user_data (
  user_id    uuid references auth.users(id) on delete cascade not null,
  key        text not null,
  value      text,
  primary key (user_id, key)
);

alter table public.user_data enable row level security;

create policy "Brugere kan læse egne data"
  on public.user_data for select
  using (auth.uid() = user_id);

create policy "Brugere kan indsætte egne data"
  on public.user_data for insert
  with check (auth.uid() = user_id);

create policy "Brugere kan opdatere egne data"
  on public.user_data for update
  using (auth.uid() = user_id);

create policy "Brugere kan slette egne data"
  on public.user_data for delete
  using (auth.uid() = user_id);
