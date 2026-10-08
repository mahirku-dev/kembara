import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import type { PackingItem, Trip } from "@/types";
import VaultClient from "./VaultClient";
import CreateTripModal from "../CreateTripModal";
import { fetchUserTrips } from "@/lib/serverTrips";

export default async function VaultPage({
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

  // Fetch all user's trips (as host or member)
  const { trips, activeTrip } = await fetchUserTrips(supabase, user.id, tripId);

  if (!activeTrip) {
    return (
      <div className="flex flex-col h-full overflow-y-auto pb-28 lg:pb-10">
        <div className="sticky top-0 z-30 bg-white/60 backdrop-blur-xl border-b border-white/60 px-5 pt-4 pb-4 lg:px-10">
          <h2 className="text-[22px] font-medium text-brand-600">Vault & Persiapan</h2>
        </div>
        <div className="flex flex-col items-center justify-center flex-1 px-5 py-20 text-center">
          <p className="text-[15px] font-medium text-stone-500">Belum ada perjalanan aktif</p>
          <p className="mt-1 text-[13px] text-stone-400">Buat perjalanan dari halaman Home terlebih dahulu untuk mengelola packing list & dokumen.</p>
          <div className="mt-4">
            <CreateTripModal buttonText="Buat Perjalanan Sekarang" variant="primary" />
          </div>
        </div>
      </div>
    );
  }

  // Fetch packing items
  const { data: packingItems } = await supabase
    .from("packing_lists")
    .select("*")
    .eq("trip_id", activeTrip.id)
    .order("created_at", { ascending: true })
    .returns<PackingItem[]>();

  return (
    <VaultClient
      key={activeTrip.id}
      trip={activeTrip}
      initialItems={packingItems ?? []}
      allTrips={trips}
      user={user}
    />
  );
}
