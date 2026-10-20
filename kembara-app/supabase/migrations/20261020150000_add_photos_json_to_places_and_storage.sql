-- =========================================================
-- Migration: Add photos_json to places and configure agenda-photos storage bucket
-- Allows all trip members to upload compressed photos, add captions,
-- like photos, and comment/reply Instagram-style on each agenda stop.
-- =========================================================

-- 1. Add photos_json column to places table
alter table places add column if not exists photos_json jsonb default '[]'::jsonb;

-- 2. Storage bucket for agenda photos
insert into storage.buckets (id, name, public)
values ('agenda-photos', 'agenda-photos', true)
on conflict (id) do nothing;

-- 3. Storage policies for agenda-photos bucket
drop policy if exists "Public Access for Agenda Photos" on storage.objects;
create policy "Public Access for Agenda Photos"
  on storage.objects for select
  using (bucket_id = 'agenda-photos');

drop policy if exists "Authenticated users can upload agenda photos" on storage.objects;
create policy "Authenticated users can upload agenda photos"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'agenda-photos');

drop policy if exists "Users can update their agenda photos" on storage.objects;
create policy "Users can update their agenda photos"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'agenda-photos');

drop policy if exists "Users can delete their agenda photos" on storage.objects;
create policy "Users can delete their agenda photos"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'agenda-photos');

