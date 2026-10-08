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
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Index for trips by user_id
create index if not exists idx_trips_user_id on trips(user_id);

-- 2. TRIP MEMBERS TABLE
create table if not exists trip_members (
  id uuid primary key default uuid_generate_v4(),
  trip_id uuid references trips(id) on delete cascade not null,
  user_id uuid references auth.users on delete set null,
  name text not null,
  role text default 'member',
  avatar_url text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create index if not exists idx_trip_members_trip_id on trip_members(trip_id);

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

-- Drop existing policies if re-running to avoid duplicate errors
drop policy if exists "Users can view their own trips" on trips;
drop policy if exists "Users can insert their own trips" on trips;
drop policy if exists "Users can update their own trips" on trips;
drop policy if exists "Users can delete their own trips" on trips;

create policy "Users can view their own trips" on trips for select using (auth.uid() = user_id);
create policy "Users can insert their own trips" on trips for insert with check (auth.uid() = user_id);
create policy "Users can update their own trips" on trips for update using (auth.uid() = user_id);
create policy "Users can delete their own trips" on trips for delete using (auth.uid() = user_id);

-- TRIP MEMBERS POLICIES
drop policy if exists "Users can view members of their trips" on trip_members;
drop policy if exists "Users can manage members of their trips" on trip_members;

create policy "Users can view members of their trips"
  on trip_members for select
  using (
    exists (
      select 1 from trips
      where trips.id = trip_members.trip_id
        and trips.user_id = auth.uid()
    )
  );

create policy "Users can manage members of their trips"
  on trip_members for all
  using (
    exists (
      select 1 from trips
      where trips.id = trip_members.trip_id
        and trips.user_id = auth.uid()
    )
  );

-- ITINERARY DAYS POLICIES
drop policy if exists "Users can view days of their trips" on itinerary_days;
drop policy if exists "Users can manage days of their trips" on itinerary_days;

create policy "Users can view days of their trips"
  on itinerary_days for select
  using (
    exists (
      select 1 from trips
      where trips.id = itinerary_days.trip_id
        and trips.user_id = auth.uid()
    )
  );

create policy "Users can manage days of their trips"
  on itinerary_days for all
  using (
    exists (
      select 1 from trips
      where trips.id = itinerary_days.trip_id
        and trips.user_id = auth.uid()
    )
  );

-- PLACES POLICIES
drop policy if exists "Users can view places of their trips" on places;
drop policy if exists "Users can manage places of their trips" on places;

create policy "Users can view places of their trips"
  on places for select
  using (
    exists (
      select 1 from itinerary_days
      join trips on trips.id = itinerary_days.trip_id
      where itinerary_days.id = places.day_id
        and trips.user_id = auth.uid()
    )
  );

create policy "Users can manage places of their trips"
  on places for all
  using (
    exists (
      select 1 from itinerary_days
      join trips on trips.id = itinerary_days.trip_id
      where itinerary_days.id = places.day_id
        and trips.user_id = auth.uid()
    )
  );

-- EXPENSES POLICIES
drop policy if exists "Users can view expenses of their trips" on expenses;
drop policy if exists "Users can manage expenses of their trips" on expenses;

create policy "Users can view expenses of their trips"
  on expenses for select
  using (
    exists (
      select 1 from trips
      where trips.id = expenses.trip_id
        and trips.user_id = auth.uid()
    )
  );

create policy "Users can manage expenses of their trips"
  on expenses for all
  using (
    exists (
      select 1 from trips
      where trips.id = expenses.trip_id
        and trips.user_id = auth.uid()
    )
  );

-- EXPENSE SPLITS POLICIES
drop policy if exists "Users can view splits of their trips" on expense_splits;
drop policy if exists "Users can manage splits of their trips" on expense_splits;

create policy "Users can view splits of their trips"
  on expense_splits for select
  using (
    exists (
      select 1 from expenses
      join trips on trips.id = expenses.trip_id
      where expenses.id = expense_splits.expense_id
        and trips.user_id = auth.uid()
    )
  );

create policy "Users can manage splits of their trips"
  on expense_splits for all
  using (
    exists (
      select 1 from expenses
      join trips on trips.id = expenses.trip_id
      where expenses.id = expense_splits.expense_id
        and trips.user_id = auth.uid()
    )
  );

-- PACKING LISTS POLICIES
drop policy if exists "Users can view packing lists of their trips" on packing_lists;
drop policy if exists "Users can manage packing lists of their trips" on packing_lists;

create policy "Users can view packing lists of their trips"
  on packing_lists for select
  using (
    exists (
      select 1 from trips
      where trips.id = packing_lists.trip_id
        and trips.user_id = auth.uid()
    )
  );

create policy "Users can manage packing lists of their trips"
  on packing_lists for all
  using (
    exists (
      select 1 from trips
      where trips.id = packing_lists.trip_id
        and trips.user_id = auth.uid()
    )
  );

-- =========================================================
-- STORAGE BUCKETS SETUP (Public / Storage Policies)
-- =========================================================

-- Insert Storage bucket 'trip-covers' if not exists
insert into storage.buckets (id, name, public)
values ('trip-covers', 'trip-covers', true)
on conflict (id) do update set public = true;

-- Storage Policy: Anyone can view trip covers
create policy "Public Access to Trip Covers"
  on storage.objects for select
  using (bucket_id = 'trip-covers');

-- Storage Policy: Authenticated users can upload trip covers
create policy "Authenticated users can upload trip covers"
  on storage.objects for insert
  with check (bucket_id = 'trip-covers' and auth.role() = 'authenticated');

-- Storage Policy: Authenticated users can update/delete their uploaded trip covers
create policy "Authenticated users can update trip covers"
  on storage.objects for update
  using (bucket_id = 'trip-covers' and auth.role() = 'authenticated');

create policy "Authenticated users can delete trip covers"
  on storage.objects for delete
  using (bucket_id = 'trip-covers' and auth.role() = 'authenticated');
