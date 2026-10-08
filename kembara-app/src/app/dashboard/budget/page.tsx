import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import type { Expense, ItineraryDay, Trip } from "@/types";
import BudgetClient from "./BudgetClient";
import CreateTripModal from "../CreateTripModal";
import { fetchUserTrips } from "@/lib/serverTrips";

export default async function BudgetPage({
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
          <h2 className="text-[22px] font-medium text-brand-600">Keuangan & Budget</h2>
        </div>
        <div className="flex flex-1 flex-col items-center justify-center px-5 py-20 text-center">
          <p className="text-[15px] font-medium text-stone-500">Belum ada perjalanan</p>
          <p className="mt-1 text-[13px] text-stone-400">Buat perjalanan terlebih dahulu untuk mulai mencatat budget.</p>
          <div className="mt-4">
            <CreateTripModal buttonText="Buat Perjalanan Sekarang" variant="primary" />
          </div>
        </div>
      </div>
    );
  }

  // Fetch expenses and itinerary days concurrently
  const [{ data: expenses }, { data: days }] = await Promise.all([
    supabase
      .from("expenses")
      .select("*")
      .eq("trip_id", activeTrip.id)
      .order("created_at", { ascending: false })
      .returns<Expense[]>(),
    supabase
      .from("itinerary_days")
      .select("*")
      .eq("trip_id", activeTrip.id)
      .order("day_number", { ascending: true })
      .returns<ItineraryDay[]>(),
  ]);

  return (
    <BudgetClient
      key={activeTrip.id}
      trip={activeTrip}
      initialExpenses={expenses ?? []}
      days={days ?? []}
      allTrips={trips}
      user={user}
    />
  );
}
