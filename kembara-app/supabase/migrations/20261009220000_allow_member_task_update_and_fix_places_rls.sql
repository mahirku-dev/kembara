-- =========================================================
-- Migration: Ensure Places and Itinerary Days RLS Policies
-- Allows Hosts/Editors to fully manage places and itinerary days,
-- and allows all Trip Members (including Viewers) to update tasks_json on places.
-- =========================================================

-- 1. ITINERARY DAYS RLS
alter table itinerary_days enable row level security;

drop policy if exists "Users can view days of their trips" on itinerary_days;
drop policy if exists "Editors and hosts can manage days" on itinerary_days;
drop policy if exists "Users can manage days of their trips" on itinerary_days;

create policy "Users can view days of their trips"
  on itinerary_days for select
  using (has_trip_access(trip_id));

create policy "Editors and hosts can manage days"
  on itinerary_days for all
  using (is_trip_editor_or_host(trip_id))
  with check (is_trip_editor_or_host(trip_id));

-- 2. PLACES RLS
alter table places enable row level security;

drop policy if exists "Users can view places of their trips" on places;
drop policy if exists "Users can manage places of their trips" on places;
drop policy if exists "Editors and hosts can manage places" on places;
drop policy if exists "Members can update places tasks" on places;
drop policy if exists "Editors and hosts can insert places" on places;
drop policy if exists "Editors and hosts can delete places" on places;

-- View: Any member with access to trip can view places
create policy "Users can view places of their trips"
  on places for select
  using (
    exists (
      select 1 from itinerary_days
      where itinerary_days.id = places.day_id
        and has_trip_access(itinerary_days.trip_id)
    )
  );

-- Insert: Only Host and Editor can insert new places
create policy "Editors and hosts can insert places"
  on places for insert
  with check (
    exists (
      select 1 from itinerary_days
      where itinerary_days.id = places.day_id
        and is_trip_editor_or_host(itinerary_days.trip_id)
    )
  );

-- Update: Host, Editor, and Viewers with trip access can update (needed for checklist tasks)
create policy "Members can update places"
  on places for update
  using (
    exists (
      select 1 from itinerary_days
      where itinerary_days.id = places.day_id
        and has_trip_access(itinerary_days.trip_id)
    )
  )
  with check (
    exists (
      select 1 from itinerary_days
      where itinerary_days.id = places.day_id
        and has_trip_access(itinerary_days.trip_id)
    )
  );

-- Delete: Only Host and Editor can delete places
create policy "Editors and hosts can delete places"
  on places for delete
  using (
    exists (
      select 1 from itinerary_days
      where itinerary_days.id = places.day_id
        and is_trip_editor_or_host(itinerary_days.trip_id)
    )
  );

