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

-- Bølge 1 (datatab & sync): additiv updated_at-kolonne, rent til fejlsøgning
-- ("hvornår blev denne nøgle sidst skrevet") — ingen klientkode kræver dette,
-- og ingen eksisterende læse-/skrivesti brydes. Grundlag for en evt. senere
-- last-write-wins-konfliktløsning, som bevidst IKKE er implementeret endnu.
alter table public.user_data
  add column if not exists updated_at timestamptz not null default now();

create or replace function public.set_user_data_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

drop trigger if exists trg_user_data_updated_at on public.user_data;
create trigger trg_user_data_updated_at
  before insert or update on public.user_data
  for each row execute function public.set_user_data_updated_at();
