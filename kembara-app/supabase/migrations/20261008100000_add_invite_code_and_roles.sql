-- =========================================================
-- Migration: Add Invite Code, Collaborative Member Roles, & RLS Permissions
-- =========================================================

-- 1. Add invite_code to trips table
alter table trips add column if not exists invite_code text unique;

-- Backfill existing trips with 6-char random alphanumeric invite codes
update trips
set invite_code = upper(substring(md5(random()::text || id::text) from 1 for 6))
where invite_code is null;

-- Ensure default invite code generator for new rows
create or replace function generate_trip_invite_code()
returns trigger as $$
begin
  if new.invite_code is null or trim(new.invite_code) = '' then
    new.invite_code := upper(substring(md5(random()::text || clock_timestamp()::text) from 1 for 6));
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_generate_trip_invite_code on trips;
create trigger trg_generate_trip_invite_code
before insert on trips
for each row
execute function generate_trip_invite_code();

-- Ensure all current trip owners are in trip_members with 'host' role
insert into trip_members (trip_id, user_id, name, role)
select t.id, t.user_id, 'Host', 'host'
from trips t
where not exists (
  select 1 from trip_members tm
  where tm.trip_id = t.id and tm.user_id = t.user_id
);

-- Update existing 'owner' roles to 'host' for consistency
update trip_members set role = 'host' where role = 'owner';

-- =========================================================
-- UPDATE RLS POLICIES FOR COLLABORATIVE TRIPS
-- =========================================================

-- Helper function: Check if auth user is host or editor of a trip
create or replace function is_trip_editor_or_host(p_trip_id uuid)
returns boolean as $$
begin
  return exists (
    select 1 from trips
    where trips.id = p_trip_id and trips.user_id = auth.uid()
  ) or exists (
    select 1 from trip_members
    where trip_members.trip_id = p_trip_id
      and trip_members.user_id = auth.uid()
      and trip_members.role in ('host', 'owner', 'editor')
  );
end;
$$ language plpgsql security definer;

-- Helper function: Check if auth user has read access (host, editor, or viewer)
create or replace function has_trip_access(p_trip_id uuid)
returns boolean as $$
begin
  return exists (
    select 1 from trips
    where trips.id = p_trip_id and trips.user_id = auth.uid()
  ) or exists (
    select 1 from trip_members
    where trip_members.trip_id = p_trip_id
      and trip_members.user_id = auth.uid()
  );
end;
$$ language plpgsql security definer;

-- 1. TRIPS RLS
drop policy if exists "Users can view their own trips" on trips;
drop policy if exists "Users can view trips they own or belong to" on trips;
create policy "Users can view trips they own or belong to"
  on trips for select
  using (
    auth.uid() = user_id
    or exists (
      select 1 from trip_members
      where trip_members.trip_id = trips.id
        and trip_members.user_id = auth.uid()
    )
  );

drop policy if exists "Users can update their own trips" on trips;
drop policy if exists "Editors and hosts can update trips" on trips;
create policy "Editors and hosts can update trips"
  on trips for update
  using (
    auth.uid() = user_id
    or exists (
      select 1 from trip_members
      where trip_members.trip_id = trips.id
        and trip_members.user_id = auth.uid()
        and trip_members.role in ('host', 'owner', 'editor')
    )
  );

-- 2. TRIP MEMBERS RLS
drop policy if exists "Users can view members of their trips" on trip_members;
drop policy if exists "Users can manage members of their trips" on trip_members;
drop policy if exists "Users can view members" on trip_members;
drop policy if exists "Users can join trips or host can manage" on trip_members;

create policy "Users can view members"
  on trip_members for select
  using (
    has_trip_access(trip_id)
  );

create policy "Users can join trip via code or host can add"
  on trip_members for insert
  with check (
    -- User joining themselves
    (auth.uid() = user_id)
    -- Or host adding a member
    or exists (
      select 1 from trips
      where trips.id = trip_members.trip_id and trips.user_id = auth.uid()
    )
  );

create policy "Host can update members"
  on trip_members for update
  using (
    exists (
      select 1 from trips
      where trips.id = trip_members.trip_id and trips.user_id = auth.uid()
    )
  );

create policy "Host can delete members or member can leave"
  on trip_members for delete
  using (
    auth.uid() = user_id
    or exists (
      select 1 from trips
      where trips.id = trip_members.trip_id and trips.user_id = auth.uid()
    )
  );

-- 3. ITINERARY DAYS RLS
drop policy if exists "Users can view days of their trips" on itinerary_days;
drop policy if exists "Users can manage days of their trips" on itinerary_days;

create policy "Users can view days of their trips"
  on itinerary_days for select
  using (has_trip_access(trip_id));

create policy "Editors and hosts can manage days"
  on itinerary_days for all
  using (is_trip_editor_or_host(trip_id));

-- 4. PLACES RLS
drop policy if exists "Users can view places of their trips" on places;
drop policy if exists "Users can manage places of their trips" on places;

create policy "Users can view places of their trips"
  on places for select
  using (
    exists (
      select 1 from itinerary_days
      where itinerary_days.id = places.day_id
        and has_trip_access(itinerary_days.trip_id)
    )
  );

create policy "Editors and hosts can manage places"
  on places for all
  using (
    exists (
      select 1 from itinerary_days
      where itinerary_days.id = places.day_id
        and is_trip_editor_or_host(itinerary_days.trip_id)
    )
  );

-- 5. EXPENSES RLS
drop policy if exists "Users can view expenses of their trips" on expenses;
drop policy if exists "Users can manage expenses of their trips" on expenses;

create policy "Users can view expenses of their trips"
  on expenses for select
  using (has_trip_access(trip_id));

create policy "Editors and hosts can manage expenses"
  on expenses for all
  using (is_trip_editor_or_host(trip_id));

-- 6. PACKING LISTS RLS
drop policy if exists "Users can view packing lists of their trips" on packing_lists;
drop policy if exists "Users can manage packing lists of their trips" on packing_lists;

create policy "Users can view packing lists of their trips"
  on packing_lists for select
  using (has_trip_access(trip_id));

create policy "Editors and hosts can manage packing lists"
  on packing_lists for all
  using (is_trip_editor_or_host(trip_id));
