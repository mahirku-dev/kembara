import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import type { Expense, ItineraryDay, Place, Trip } from "@/types";
import ItineraryClient from "./ItineraryClient";
import CreateTripModal from "../CreateTripModal";
import { fetchUserTrips } from "@/lib/serverTrips";

import { ListBullets } from "@phosphor-icons/react/dist/ssr";
import TripSwitcher from "@/components/TripSwitcher";
import UserProfileMenu from "@/components/UserProfileMenu";

interface DayWithPlaces extends ItineraryDay {
  places: Place[];
}

export default async function ItineraryPage({
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

  // Fetch all trips of the user (as host or member)
  const { trips, activeTrip } = await fetchUserTrips(supabase, user.id, tripId);

  if (!activeTrip) {
    return (
      <div className="flex flex-col h-full overflow-y-auto pb-28 lg:pb-10">
        {/* Standard Dynamic Header */}
        <header className="sticky top-0 z-[1100] bg-white/60 backdrop-blur-xl border-b border-white/60 px-4 py-3 sm:px-6 lg:px-10 shrink-0">
          <div className="flex items-center justify-between gap-2.5 sm:gap-4">
            <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-brand-50 text-brand-600 border border-brand-200/50 shadow-sm shrink-0">
                <ListBullets size={20} weight="fill" />
              </span>
              <div className="min-w-0 flex-1">
                <h2 className="text-lg sm:text-[20px] font-bold text-brand-700 leading-tight truncate">
                  Agenda &amp; Rute
                </h2>
                <p className="text-[11px] sm:text-[12px] text-stone-500 mt-0.5 truncate">
                  Jadwal &amp; rencana kegiatan perjalanan Anda
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {trips.length > 0 && (
                <TripSwitcher trips={trips} activeTrip={activeTrip} currentUserId={user.id} />
              )}
              <UserProfileMenu user={user} className="hidden sm:block" />
            </div>
          </div>
        </header>

        {/* Empty State Card */}
        <div className="px-5 pt-6 lg:px-10 space-y-6">
          <div className="rounded-3xl border border-dashed border-brand-200 bg-brand-50/30 p-8 text-center max-w-md mx-auto my-12">
            <p className="text-[15px] font-medium text-stone-700">Belum ada perjalanan</p>
            <p className="mt-1 text-[13px] text-stone-400">
              Buat perjalanan pertama Anda untuk mulai menyusun itinerary dan agenda kegiatan.
            </p>
            <div className="mt-4">
              <CreateTripModal buttonText="Buat Perjalanan Sekarang" variant="primary" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Fetch itinerary days and expenses for the active trip concurrently
  const [{ data: days }, { data: allTripExpenses }] = await Promise.all([
    supabase
      .from("itinerary_days")
      .select("*, places(*)")
      .eq("trip_id", activeTrip.id)
      .order("day_number", { ascending: true })
      .returns<DayWithPlaces[]>(),
    supabase
      .from("expenses")
      .select("*")
      .eq("trip_id", activeTrip.id)
      .order("created_at", { ascending: true })
      .returns<Expense[]>(),
  ]);

  // Attach matching expenses to each place (by place_id or description matching)
  const orderedDays = (days ?? []).map((d) => ({
    ...d,
    places: (d.places ?? [])
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((p) => {
        const placeExpenses = (allTripExpenses ?? []).filter(
          (e) =>
            e.place_id === p.id ||
            (!e.place_id &&
              e.description &&
              e.description.toLowerCase().includes(p.name.toLowerCase()))
        );

        // Sum up total cost from expenses if expenses exist
        const totalCostFromExpenses = placeExpenses.reduce(
          (sum, exp) => sum + Number(exp.amount || 0),
          0
        );

        return {
          ...p,
          cost: totalCostFromExpenses > 0 ? totalCostFromExpenses : p.cost,
          expenses: placeExpenses,
        };
      }),
  }));

  return (
    <ItineraryClient
      key={activeTrip.id}
      trip={activeTrip}
      days={orderedDays}
      allTrips={trips}
      user={user}
    />
  );
}
