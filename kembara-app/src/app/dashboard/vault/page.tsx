import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import type { PackingItem, Trip } from "@/types";
import VaultClient from "./VaultClient";
import CreateTripModal from "../CreateTripModal";
import { fetchUserTrips } from "@/lib/serverTrips";

import { SuitcaseRolling } from "@phosphor-icons/react/dist/ssr";
import TripSwitcher from "@/components/TripSwitcher";
import UserProfileMenu from "@/components/UserProfileMenu";

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
        {/* Standard Dynamic Header */}
        <header className="sticky top-0 z-[1100] bg-white/60 backdrop-blur-xl border-b border-white/60 px-5 pt-4 pb-3 lg:px-10 shrink-0">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div className="flex items-center gap-3">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-brand-50 text-brand-600 border border-brand-200/50 shadow-sm shrink-0">
                <SuitcaseRolling size={22} weight="fill" />
              </span>
              <div>
                <h2 className="text-[20px] font-bold text-brand-700 leading-tight">
                  Vault &amp; Dokumen
                </h2>
                <p className="text-[12px] text-stone-500 mt-0.5 line-clamp-1">
                  Kelola checklist perlengkapan &amp; berkas perjalanan Anda
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
        </header>

        {/* Empty State Card */}
        <div className="px-5 pt-6 lg:px-10 space-y-6">
          <div className="rounded-3xl border border-dashed border-brand-200 bg-brand-50/30 p-8 text-center max-w-md mx-auto my-12">
            <p className="text-[15px] font-medium text-stone-700">Belum ada perjalanan</p>
            <p className="mt-1 text-[13px] text-stone-400">
              Buat perjalanan terlebih dahulu untuk mulai mengelola checklist perlengkapan &amp; dokumen perjalanan.
            </p>
            <div className="mt-4">
              <CreateTripModal buttonText="Buat Perjalanan Sekarang" variant="primary" />
            </div>
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
