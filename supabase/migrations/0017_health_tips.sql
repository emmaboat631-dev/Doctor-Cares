-- ============================================================================
-- Doctor Cares — 0017 · Health tips (admin broadcast)
-- ============================================================================
-- Short, admin-authored health posts shown to patients on the home screen.
-- Keep it minimal: title, body, optional image_url, published flag + at,
-- optional category. No comments / likes — that's a later feature.
-- ============================================================================

create table if not exists public.health_tips (
  id            uuid primary key default gen_random_uuid(),
  title         text not null check (char_length(title) between 2 and 160),
  body          text not null check (char_length(body) between 2 and 10000),
  image_url     text,
  category      text,            -- e.g. nutrition, mental-health, hygiene
  is_published  boolean not null default false,
  published_at  timestamptz,
  author_id     uuid references public.profiles(id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists health_tips_published_idx
  on public.health_tips(is_published, published_at desc);
create index if not exists health_tips_category_idx
  on public.health_tips(category);

drop trigger if exists health_tips_set_updated_at on public.health_tips;
create trigger health_tips_set_updated_at
  before update on public.health_tips
  for each row execute function public.set_updated_at();

-- RLS -------------------------------------------------------------------------
alter table public.health_tips enable row level security;

-- Any authenticated user reads PUBLISHED tips.
drop policy if exists "read published tips" on public.health_tips;
create policy "read published tips" on public.health_tips
  for select using (is_published = true and auth.role() = 'authenticated');

-- Admins can do everything.
drop policy if exists "admin reads all tips" on public.health_tips;
create policy "admin reads all tips" on public.health_tips
  for select using (public.is_admin());

drop policy if exists "admin writes tips" on public.health_tips;
create policy "admin writes tips" on public.health_tips
  for insert with check (public.is_admin());

drop policy if exists "admin updates tips" on public.health_tips;
create policy "admin updates tips" on public.health_tips
  for update using (public.is_admin()) with check (public.is_admin());

drop policy if exists "admin deletes tips" on public.health_tips;
create policy "admin deletes tips" on public.health_tips
  for delete using (public.is_admin());
