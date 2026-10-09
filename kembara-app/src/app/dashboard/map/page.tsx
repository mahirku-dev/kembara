import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { MapTrifold } from "@phosphor-icons/react/dist/ssr";
import type { ItineraryDay, Place, Trip } from "@/types";
import TripSwitcher from "@/components/TripSwitcher";
import MapClient, { type AgendaPlace } from "./MapClient";
import { fetchUserTrips } from "@/lib/serverTrips";
import { sortPlacesByTime } from "@/lib/geo";

import UserProfileMenu from "@/components/UserProfileMenu";

interface DayWithPlaces extends ItineraryDay {
  places: Place[];
}

export default async function MapPage({
  searchParams,
}: {
  searchParams: Promise<{ tripId?: string }>;
}) {
  const { tripId } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/");

  // Fetch all user trips (as host or member)
  const { trips, activeTrip } = await fetchUserTrips(supabase, user.id, tripId);

  let agendaPlaces: AgendaPlace[] = [];

  if (activeTrip) {
    const { data: days } = await supabase
      .from("itinerary_days")
      .select("*, places(*)")
      .eq("trip_id", activeTrip.id)
      .order("day_number", { ascending: true })
      .returns<DayWithPlaces[]>();

    if (days && days.length > 0) {
      agendaPlaces = days.flatMap((d) =>
        sortPlacesByTime(d.places || []).map((p) => ({
          ...p,
          day_number: d.day_number,
          day_date: d.date,
        }))
      );
    }
  }

  const subtitle = activeTrip
    ? `Eksplorasi agenda & titik lokasi ${activeTrip.destination || activeTrip.title}`
    : "Eksplorasi peta dan titik lokasi perjalanan";

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Compact Mobile-First Trip Header */}
      <header className="sticky top-0 z-[1100] bg-white/70 backdrop-blur-xl border-b border-white/70 px-4 py-2.5 sm:px-6 lg:px-10 shrink-0">
        <div className="flex items-center justify-between gap-3">
          {/* Trip Selector as Primary Header Focus */}
          <div className="min-w-0 flex-1">
            {trips.length > 0 ? (
              <TripSwitcher
                trips={trips}
                activeTrip={activeTrip}
                currentUserId={user.id}
                className="w-full sm:w-auto"
              />
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-base font-bold text-brand-700">Kembara</span>
              </div>
            )}
          </div>

          {/* User Profile Menu (Red Suitcase Button) */}
          <div className="shrink-0 flex items-center">
            <UserProfileMenu user={user} />
          </div>
        </div>
      </header>

      {/* Map Body */}
      <div className="flex-1 relative overflow-hidden">
        <MapClient
          key={activeTrip?.id ?? "empty-trip"}
          trip={activeTrip}
          places={agendaPlaces}
        />
      </div>
    </div>
  );
}
