import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { MapTrifold } from "@phosphor-icons/react/dist/ssr";
import type { ItineraryDay, Place, Trip } from "@/types";
import TripSwitcher from "@/components/TripSwitcher";
import MapClient, { type AgendaPlace } from "./MapClient";
import { fetchUserTrips } from "@/lib/serverTrips";

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
        (d.places || []).map((p) => ({
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
      {/* Dynamic Header */}
      <div className="sticky top-0 z-[1100] bg-white/60 backdrop-blur-xl border-b border-white/60 px-5 pt-4 pb-3 lg:px-10 shrink-0">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div className="flex items-center gap-3">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-brand-50 text-brand-600 border border-brand-200/50 shadow-sm shrink-0">
              <MapTrifold size={22} weight="fill" />
            </span>
            <div>
              <h2 className="text-[20px] font-bold text-brand-700 leading-tight">
                Peta & Lokasi
              </h2>
              <p className="text-[12px] text-stone-500 mt-0.5 line-clamp-1">
                {subtitle}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0 justify-between sm:justify-end">
            {trips.length > 0 && (
              <TripSwitcher trips={trips} activeTrip={activeTrip} currentUserId={user.id} />
            )}
            <UserProfileMenu user={user} />
          </div>
        </div>
      </div>

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
