import type { SupabaseClient } from "@supabase/supabase-js";
import type { Trip, TripRole } from "@/types";

export async function fetchUserTrips(
  supabase: SupabaseClient,
  userId: string,
  activeTripId?: string
): Promise<{
  trips: Trip[];
  activeTrip: Trip | null;
}> {
  // 1. Fetch user memberships to know roles
  const { data: userMemberships } = await supabase
    .from("trip_members")
    .select("trip_id, role")
    .eq("user_id", userId);

  const memberRoleMap = new Map<string, TripRole>();
  (userMemberships || []).forEach((m: any) => {
    memberRoleMap.set(m.trip_id, (m.role as TripRole) || "viewer");
  });

  // 2. Fetch all trips
  const { data: allTrips } = await supabase
    .from("trips")
    .select("*")
    .order("created_at", { ascending: false })
    .returns<Trip[]>();

  const trips: Trip[] = (allTrips ?? []).map((t) => ({
    ...t,
    current_user_role:
      t.user_id === userId
        ? ("host" as TripRole)
        : memberRoleMap.get(t.id) || ("viewer" as TripRole),
  }));

  const activeTrip = activeTripId
    ? trips.find((t) => t.id === activeTripId) ?? trips[0] ?? null
    : trips[0] ?? null;

  return { trips, activeTrip };
}

