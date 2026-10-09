-- =========================================================
-- Migration: Add subtasks_json and created_by to packing_lists
-- Allows Trip Members & Viewers to edit their created packing items,
-- add subtasks, and manage checklist items in Vault.
-- =========================================================

-- 1. Add subtasks_json, created_by, and created_by_name columns to packing_lists
alter table packing_lists add column if not exists subtasks_json jsonb default '[]'::jsonb;
alter table packing_lists add column if not exists created_by uuid references auth.users(id) on delete set null;
alter table packing_lists add column if not exists created_by_name text;

-- 2. Update RLS policies for packing_lists
alter table packing_lists enable row level security;

drop policy if exists "Users can view packing list of their trips" on packing_lists;
drop policy if exists "Users can manage packing list of their trips" on packing_lists;
drop policy if exists "Users can view packing lists of their trips" on packing_lists;
drop policy if exists "Editors and hosts can manage packing lists" on packing_lists;
drop policy if exists "Trip members can view packing lists" on packing_lists;
drop policy if exists "Trip members can insert packing lists" on packing_lists;
drop policy if exists "Trip members can update packing lists" on packing_lists;
drop policy if exists "Trip members can delete packing lists" on packing_lists;

-- Select: Any member with trip access can view packing list items
create policy "Trip members can view packing lists"
  on packing_lists for select
  using (has_trip_access(trip_id));

-- Insert: Any member with trip access can add packing list items
create policy "Trip members can insert packing lists"
  on packing_lists for insert
  with check (has_trip_access(trip_id));

-- Update: Any member with trip access can update checklist / subtasks
create policy "Trip members can update packing lists"
  on packing_lists for update
  using (has_trip_access(trip_id))
  with check (has_trip_access(trip_id));

-- Delete: Host/Editor can delete any item; Viewers can delete items they created
create policy "Trip members can delete packing lists"
  on packing_lists for delete
  using (
    is_trip_editor_or_host(trip_id)
    or (auth.uid() is not null and auth.uid() = created_by)
  );

