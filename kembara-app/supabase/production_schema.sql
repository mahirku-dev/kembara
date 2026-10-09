-- =========================================================
-- KEMBARA APP — PRODUCTION DATABASE SCHEMA & SECURITY RULES
-- Target: Supabase Production Project (kembara)
-- =========================================================

-- 0. EXTENSIONS
create extension if not exists "uuid-ossp";

-- 1. TRIPS TABLE
create table if not exists trips (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users on delete cascade not null,
  title text not null,
  destination text,
  start_date date,
  end_date date,
  cover_url text,
  total_budget numeric default 0,
  budget_sar numeric default 0,
  category_budgets_json jsonb default '{}'::jsonb,
  exchange_records_json jsonb default '[]'::jsonb,
  invite_code text unique,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Index for trips by user_id and invite_code
create index if not exists idx_trips_user_id on trips(user_id);
create index if not exists idx_trips_invite_code on trips(invite_code);

-- Trigger to auto-generate 6-char unique invite code
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

-- 2. TRIP MEMBERS TABLE
create table if not exists trip_members (
  id uuid primary key default uuid_generate_v4(),
  trip_id uuid references trips(id) on delete cascade not null,
  user_id uuid references auth.users on delete set null,
  name text not null,
  role text default 'viewer', -- 'host' | 'editor' | 'viewer'
  avatar_url text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create index if not exists idx_trip_members_trip_id on trip_members(trip_id);
create index if not exists idx_trip_members_user_id on trip_members(user_id);

-- 3. ITINERARY DAYS TABLE
create table if not exists itinerary_days (
  id uuid primary key default uuid_generate_v4(),
  trip_id uuid references trips(id) on delete cascade not null,
  day_number integer not null,
  date date,
  notes text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create index if not exists idx_itinerary_days_trip_id on itinerary_days(trip_id);

-- 4. PLACES (Agendas) TABLE
create table if not exists places (
  id uuid primary key default uuid_generate_v4(),
  day_id uuid references itinerary_days(id) on delete cascade not null,
  name text not null,
  address text,
  lat numeric,
  lng numeric,
  start_time time,
  end_time time,
  category text,
  cost numeric default 0,
  thumbnail_url text,
  notes text,
  tasks_json jsonb default '[]'::jsonb,
  sort_order integer default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create index if not exists idx_places_day_id on places(day_id);

-- 5. EXPENSES TABLE
create table if not exists expenses (
  id uuid primary key default uuid_generate_v4(),
  trip_id uuid references trips(id) on delete cascade not null,
  place_id uuid references places(id) on delete cascade,
  category text,
  amount numeric not null,
  currency text default 'IDR',
  date date,
  description text,
  paid_by uuid references trip_members(id) on delete set null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create index if not exists idx_expenses_trip_id on expenses(trip_id);
create index if not exists idx_expenses_place_id on expenses(place_id);

-- 6. EXPENSE SPLITS TABLE
create table if not exists expense_splits (
  id uuid primary key default uuid_generate_v4(),
  expense_id uuid references expenses(id) on delete cascade not null,
  member_id uuid references trip_members(id) on delete cascade not null,
  amount_owed numeric not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create index if not exists idx_expense_splits_expense_id on expense_splits(expense_id);

-- 7. PACKING LISTS TABLE
create table if not exists packing_lists (
  id uuid primary key default uuid_generate_v4(),
  trip_id uuid references trips(id) on delete cascade not null,
  item_name text not null,
  category text,
  is_checked boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create index if not exists idx_packing_lists_trip_id on packing_lists(trip_id);

-- =========================================================
-- SECURITY HELPER FUNCTIONS
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

-- =========================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =========================================================

-- Enable RLS on all tables
alter table trips enable row level security;
alter table trip_members enable row level security;
alter table itinerary_days enable row level security;
alter table places enable row level security;
alter table expenses enable row level security;
alter table expense_splits enable row level security;
alter table packing_lists enable row level security;

-- 1. TRIPS POLICIES
drop policy if exists "Users can view their own trips" on trips;
drop policy if exists "Users can view trips they own or belong to" on trips;
drop policy if exists "Users can insert their own trips" on trips;
drop policy if exists "Users can update their own trips" on trips;
drop policy if exists "Editors and hosts can update trips" on trips;
drop policy if exists "Users can delete their own trips" on trips;

create policy "Users can view trips they own or belong to"
  on trips for select
  using (
    auth.uid() = user_id
    or exists (
      select 1 from trip_members
      where trip_members.trip_id = trips.id
        and trip_members.user_id = auth.uid()
    )
    or (invite_code is not null)
  );

create policy "Users can insert their own trips"
  on trips for insert
  with check (auth.uid() = user_id);

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

create policy "Users can delete their own trips"
  on trips for delete
  using (auth.uid() = user_id);

-- 2. TRIP MEMBERS POLICIES
drop policy if exists "Users can view members of their trips" on trip_members;
drop policy if exists "Users can manage members of their trips" on trip_members;
drop policy if exists "Users can view members" on trip_members;
drop policy if exists "Users can join trip via code or host can add" on trip_members;
drop policy if exists "Host can update members" on trip_members;
drop policy if exists "Host can delete members or member can leave" on trip_members;

create policy "Users can view members"
  on trip_members for select
  using (has_trip_access(trip_id));

create policy "Users can join trip via code or host can add"
  on trip_members for insert
  with check (
    (auth.uid() = user_id)
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

-- 3. ITINERARY DAYS POLICIES
drop policy if exists "Users can view days of their trips" on itinerary_days;
drop policy if exists "Users can manage days of their trips" on itinerary_days;
drop policy if exists "Editors and hosts can manage days" on itinerary_days;

create policy "Users can view days of their trips"
  on itinerary_days for select
  using (has_trip_access(trip_id));

create policy "Editors and hosts can manage days"
  on itinerary_days for all
  using (is_trip_editor_or_host(trip_id));

-- 4. PLACES POLICIES
drop policy if exists "Users can view places of their trips" on places;
drop policy if exists "Users can manage places of their trips" on places;
drop policy if exists "Editors and hosts can manage places" on places;

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

-- 5. EXPENSES POLICIES
drop policy if exists "Users can view expenses of their trips" on expenses;
drop policy if exists "Users can manage expenses of their trips" on expenses;
drop policy if exists "Editors and hosts can manage expenses" on expenses;

create policy "Users can view expenses of their trips"
  on expenses for select
  using (has_trip_access(trip_id));

create policy "Editors and hosts can manage expenses"
  on expenses for all
  using (is_trip_editor_or_host(trip_id));

-- 6. EXPENSE SPLITS POLICIES
drop policy if exists "Users can view splits of their trips" on expense_splits;
drop policy if exists "Users can manage splits of their trips" on expense_splits;
drop policy if exists "Editors and hosts can manage splits" on expense_splits;

create policy "Users can view splits of their trips"
  on expense_splits for select
  using (
    exists (
      select 1 from expenses
      where expenses.id = expense_splits.expense_id
        and has_trip_access(expenses.trip_id)
    )
  );

create policy "Editors and hosts can manage splits"
  on expense_splits for all
  using (
    exists (
      select 1 from expenses
      where expenses.id = expense_splits.expense_id
        and is_trip_editor_or_host(expenses.trip_id)
    )
  );

-- 7. PACKING LISTS POLICIES
drop policy if exists "Users can view packing lists of their trips" on packing_lists;
drop policy if exists "Users can manage packing lists of their trips" on packing_lists;
drop policy if exists "Editors and hosts can manage packing lists" on packing_lists;

create policy "Users can view packing lists of their trips"
  on packing_lists for select
  using (has_trip_access(trip_id));

create policy "Editors and hosts can manage packing lists"
  on packing_lists for all
  using (is_trip_editor_or_host(trip_id));

-- =========================================================
-- STORAGE BUCKETS SETUP (Public / Storage Policies)
-- =========================================================

-- Insert Storage bucket 'trip-covers' if not exists
insert into storage.buckets (id, name, public)
values ('trip-covers', 'trip-covers', true)
on conflict (id) do update set public = true;

-- Storage Policy: Anyone can view trip covers
drop policy if exists "Public Access to Trip Covers" on storage.objects;
create policy "Public Access to Trip Covers"
  on storage.objects for select
  using (bucket_id = 'trip-covers');

-- Storage Policy: Authenticated users can upload trip covers
drop policy if exists "Authenticated users can upload trip covers" on storage.objects;
create policy "Authenticated users can upload trip covers"
  on storage.objects for insert
  with check (bucket_id = 'trip-covers' and auth.role() = 'authenticated');

-- Storage Policy: Authenticated users can update/delete their uploaded trip covers
drop policy if exists "Authenticated users can update trip covers" on storage.objects;
create policy "Authenticated users can update trip covers"
  on storage.objects for update
  using (bucket_id = 'trip-covers' and auth.role() = 'authenticated');

drop policy if exists "Authenticated users can delete trip covers" on storage.objects;
create policy "Authenticated users can delete trip covers"
  on storage.objects for delete
  using (bucket_id = 'trip-covers' and auth.role() = 'authenticated');

-- =========================================================
-- ATOMIC JOIN TRIP RPC FUNCTION
-- =========================================================
create or replace function join_trip_by_code(p_invite_code text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_trip_id uuid;
  v_trip_title text;
  v_trip_owner uuid;
  v_user_name text;
  v_user_avatar text;
  v_clean_code text;
  v_existing_member uuid;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    return jsonb_build_object('success', false, 'error', 'Silakan login terlebih dahulu untuk bergabung ke perjalanan.');
  end if;

  v_clean_code := upper(trim(p_invite_code));
  if v_clean_code = '' or length(v_clean_code) < 3 then
    return jsonb_build_object('success', false, 'error', 'Kode undangan tidak boleh kosong.');
  end if;

  select id, title, user_id
  into v_trip_id, v_trip_title, v_trip_owner
  from trips
  where upper(trim(invite_code)) = v_clean_code
  limit 1;

  if v_trip_id is null then
    return jsonb_build_object('success', false, 'error', 'Kode undangan tidak valid atau perjalanan tidak ditemukan.');
  end if;

  if v_trip_owner = v_user_id then
    return jsonb_build_object('success', true, 'tripId', v_trip_id, 'title', v_trip_title, 'message', 'Anda adalah Host perjalanan ini.');
  end if;

  select id into v_existing_member
  from trip_members
  where trip_id = v_trip_id and user_id = v_user_id
  limit 1;

  if v_existing_member is not null then
    return jsonb_build_object('success', true, 'tripId', v_trip_id, 'title', v_trip_title, 'message', 'Anda sudah menjadi anggota di perjalanan ini.');
  end if;

  select
    coalesce(
      raw_user_meta_data->>'full_name',
      raw_user_meta_data->>'name',
      split_part(email, '@', 1),
      'Anggota'
    ),
    raw_user_meta_data->>'avatar_url'
  into v_user_name, v_user_avatar
  from auth.users
  where id = v_user_id;

  if v_user_name is null or trim(v_user_name) = '' then
    v_user_name := 'Anggota';
  end if;

  insert into trip_members (trip_id, user_id, name, role, avatar_url)
  values (v_trip_id, v_user_id, v_user_name, 'viewer', v_user_avatar);

  return jsonb_build_object('success', true, 'tripId', v_trip_id, 'title', v_trip_title, 'message', 'Berhasil bergabung ke perjalanan.');
end;
$$;
