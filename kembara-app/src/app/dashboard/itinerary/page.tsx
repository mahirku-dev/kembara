import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import type { Expense, ItineraryDay, Place, Trip } from "@/types";
import ItineraryClient from "./ItineraryClient";
import CreateTripModal from "../CreateTripModal";
import { fetchUserTrips } from "@/lib/serverTrips";

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
        <div className="sticky top-0 z-30 bg-white/60 backdrop-blur-xl border-b border-white/60 px-5 pt-4 pb-4 lg:px-10">
          <h2 className="text-[22px] font-medium text-brand-600">Itinerary</h2>
        </div>
        <div className="flex flex-col items-center justify-center flex-1 px-5 py-20 text-center">
          <p className="text-[15px] font-medium text-stone-500">Belum ada perjalanan</p>
          <p className="mt-1 text-[13px] text-stone-400">Buat perjalanan dari halaman Home terlebih dahulu.</p>
          <div className="mt-4">
            <CreateTripModal buttonText="Buat Perjalanan Sekarang" variant="primary" />
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
