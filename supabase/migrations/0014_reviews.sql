-- ============================================================================
-- Doctor Cares — 0014 · Ratings &amp; reviews
-- ============================================================================
-- A patient can leave exactly one review per completed appointment. The
-- doctor's aggregate rating + count on doctor_profiles are kept in sync by
-- an AFTER INSERT/UPDATE/DELETE trigger so the FindDoctors list + chat
-- cards can read it without a join.
-- ============================================================================

create table if not exists public.reviews (
  id              uuid primary key default gen_random_uuid(),
  appointment_id  uuid not null unique references public.appointments(id) on delete cascade,
  doctor_id       uuid not null references public.profiles(id) on delete cascade,
  patient_id      uuid not null references public.profiles(id) on delete cascade,
  rating          smallint not null check (rating between 1 and 5),
  body            text check (char_length(body) <= 2000),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists reviews_doctor_idx  on public.reviews(doctor_id, created_at desc);
create index if not exists reviews_patient_idx on public.reviews(patient_id);

drop trigger if exists reviews_set_updated_at on public.reviews;
create trigger reviews_set_updated_at
  before update on public.reviews
  for each row execute function public.set_updated_at();

-- Keep doctor_profiles.rating and rating_count in sync with real data.
create or replace function public.recalc_doctor_rating(_doctor uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update public.doctor_profiles
     set rating       = coalesce((select round(avg(rating)::numeric, 2) from public.reviews where doctor_id = _doctor), 0),
         rating_count = coalesce((select count(*) from public.reviews where doctor_id = _doctor), 0)
   where id = _doctor;
$$;

create or replace function public.on_review_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'DELETE' then
    perform public.recalc_doctor_rating(old.doctor_id);
    return old;
  end if;
  perform public.recalc_doctor_rating(new.doctor_id);
  return new;
end;
$$;

drop trigger if exists reviews_recalc on public.reviews;
create trigger reviews_recalc
  after insert or update or delete on public.reviews
  for each row execute function public.on_review_change();

-- RLS -------------------------------------------------------------------------
alter table public.reviews enable row level security;

-- Anyone authenticated can READ reviews (needed for the marketplace to show
-- a doctor's reviews publicly inside the app).
drop policy if exists "read reviews" on public.reviews;
create policy "read reviews" on public.reviews
  for select using (auth.role() = 'authenticated');

-- A patient inserts a review only for their own completed appointment.
drop policy if exists "patient writes own review" on public.reviews;
create policy "patient writes own review" on public.reviews
  for insert
  with check (
    patient_id = auth.uid()
    and exists (
      select 1 from public.appointments a
      where a.id = reviews.appointment_id
        and a.patient_id = auth.uid()
        and a.doctor_id  = reviews.doctor_id
        and a.status = 'completed'
    )
  );

-- A patient can edit/delete their own review.
drop policy if exists "patient updates own review" on public.reviews;
create policy "patient updates own review" on public.reviews
  for update using (patient_id = auth.uid())
  with check (patient_id = auth.uid());

drop policy if exists "patient deletes own review" on public.reviews;
create policy "patient deletes own review" on public.reviews
  for delete using (patient_id = auth.uid());

-- Admin reads all.
drop policy if exists "admin reads reviews" on public.reviews;
create policy "admin reads reviews" on public.reviews
  for select using (public.is_admin());
