-- =========================================================
-- Migration: Fix Join Trip by Invite Code, RLS, and RPC Function
-- =========================================================

-- 1. Update TRIPS RLS select policy to allow reading trip info if user knows the invite code
drop policy if exists "Users can view trips they own or belong to" on trips;
drop policy if exists "Users can lookup trip by invite code" on trips;

create policy "Users can view trips they own, belong to, or lookup by code"
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

-- 2. Update TRIP_MEMBERS insert policy to allow authenticated users to join
drop policy if exists "Users can join trip via code or host can add" on trip_members;

create policy "Users can join trip via code or host can add"
  on trip_members for insert
  with check (
    -- Authenticated user joining themselves
    (auth.uid() = user_id)
    -- Or host adding a member
    or exists (
      select 1 from trips
      where trips.id = trip_members.trip_id and trips.user_id = auth.uid()
    )
  );

-- 3. Create Security Definer RPC function for atomic, infallible trip joining
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
  -- 1. Check authenticated user
  v_user_id := auth.uid();
  if v_user_id is null then
    return jsonb_build_object(
      'success', false,
      'error', 'Silakan login terlebih dahulu untuk bergabung ke perjalanan.'
    );
  end if;

  -- 2. Clean invite code (trim whitespace, uppercase)
  v_clean_code := upper(trim(p_invite_code));
  if v_clean_code = '' or length(v_clean_code) < 3 then
    return jsonb_build_object(
      'success', false,
      'error', 'Kode undangan tidak boleh kosong atau terlalu pendek.'
    );
  end if;

  -- 3. Find trip by invite code
  select id, title, user_id
  into v_trip_id, v_trip_title, v_trip_owner
  from trips
  where upper(trim(invite_code)) = v_clean_code
  limit 1;

  if v_trip_id is null then
    return jsonb_build_object(
      'success', false,
      'error', 'Kode undangan tidak valid atau perjalanan tidak ditemukan.'
    );
  end if;

  -- 4. If user is the host/owner of the trip
  if v_trip_owner = v_user_id then
    return jsonb_build_object(
      'success', true,
      'tripId', v_trip_id,
      'title', v_trip_title,
      'message', 'Anda adalah Host perjalanan ini.'
    );
  end if;

  -- 5. Check if user is already a member
  select id into v_existing_member
  from trip_members
  where trip_id = v_trip_id and user_id = v_user_id
  limit 1;

  if v_existing_member is not null then
    return jsonb_build_object(
      'success', true,
      'tripId', v_trip_id,
      'title', v_trip_title,
      'message', 'Anda sudah menjadi anggota di perjalanan ini.'
    );
  end if;

  -- 6. Fetch user profile/name metadata
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

  -- 7. Insert new trip member with default 'viewer' role
  insert into trip_members (trip_id, user_id, name, role, avatar_url)
  values (v_trip_id, v_user_id, v_user_name, 'viewer', v_user_avatar);

  return jsonb_build_object(
    'success', true,
    'tripId', v_trip_id,
    'title', v_trip_title,
    'message', 'Berhasil bergabung ke perjalanan.'
  );
end;
$$;

