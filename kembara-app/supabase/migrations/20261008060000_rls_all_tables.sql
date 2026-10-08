-- =============================================
-- Migration: Enable RLS on all tables
-- Run AFTER the init_schema migration
-- =============================================

-- TRIP MEMBERS
alter table trip_members enable row level security;

-- Users can see members of trips they own
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

-- ITINERARY DAYS
alter table itinerary_days enable row level security;

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

-- PLACES
alter table places enable row level security;

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

-- EXPENSES
alter table expenses enable row level security;

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

-- EXPENSE SPLITS
alter table expense_splits enable row level security;

create policy "Users can view splits of their expenses"
  on expense_splits for select
  using (
    exists (
      select 1 from expenses
      join trips on trips.id = expenses.trip_id
      where expenses.id = expense_splits.expense_id
        and trips.user_id = auth.uid()
    )
  );

create policy "Users can manage splits of their expenses"
  on expense_splits for all
  using (
    exists (
      select 1 from expenses
      join trips on trips.id = expenses.trip_id
      where expenses.id = expense_splits.expense_id
        and trips.user_id = auth.uid()
    )
  );

-- PACKING LISTS
alter table packing_lists enable row level security;

create policy "Users can view packing list of their trips"
  on packing_lists for select
  using (
    exists (
      select 1 from trips
      where trips.id = packing_lists.trip_id
        and trips.user_id = auth.uid()
    )
  );

create policy "Users can manage packing list of their trips"
  on packing_lists for all
  using (
    exists (
      select 1 from trips
      where trips.id = packing_lists.trip_id
        and trips.user_id = auth.uid()
    )
  );

