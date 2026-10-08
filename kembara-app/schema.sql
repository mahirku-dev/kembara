-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- 1. TRIPS
create table trips (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users not null,
  title text not null,
  destination text,
  start_date date,
  end_date date,
  cover_url text,
  total_budget numeric default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. TRIP MEMBERS
create table trip_members (
  id uuid primary key default uuid_generate_v4(),
  trip_id uuid references trips on delete cascade not null,
  user_id uuid references auth.users,
  name text not null,
  role text default 'member',
  avatar_url text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. ITINERARY DAYS
create table itinerary_days (
  id uuid primary key default uuid_generate_v4(),
  trip_id uuid references trips on delete cascade not null,
  day_number integer not null,
  date date,
  notes text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 4. PLACES (Agendas)
create table places (
  id uuid primary key default uuid_generate_v4(),
  day_id uuid references itinerary_days on delete cascade not null,
  name text not null,
  address text,
  lat numeric,
  lng numeric,
  start_time time,
  end_time time,
  category text,
  cost numeric default 0,
  thumbnail_url text,
  tasks_json jsonb default '[]'::jsonb,
  sort_order integer default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 5. EXPENSES
create table expenses (
  id uuid primary key default uuid_generate_v4(),
  trip_id uuid references trips on delete cascade not null,
  category text,
  amount numeric not null,
  currency text default 'IDR',
  date date,
  description text,
  paid_by uuid references trip_members on delete set null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 6. EXPENSE SPLITS
create table expense_splits (
  id uuid primary key default uuid_generate_v4(),
  expense_id uuid references expenses on delete cascade not null,
  member_id uuid references trip_members on delete cascade not null,
  amount_owed numeric not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 7. PACKING LISTS
create table packing_lists (
  id uuid primary key default uuid_generate_v4(),
  trip_id uuid references trips on delete cascade not null,
  item_name text not null,
  category text,
  is_checked boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Set Row Level Security (RLS) policies
alter table trips enable row level security;
create policy "Users can view their own trips" on trips for select using (auth.uid() = user_id);
create policy "Users can insert their own trips" on trips for insert with check (auth.uid() = user_id);
create policy "Users can update their own trips" on trips for update using (auth.uid() = user_id);
create policy "Users can delete their own trips" on trips for delete using (auth.uid() = user_id);
