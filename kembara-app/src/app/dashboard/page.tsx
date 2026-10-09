import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import type { ItineraryDay, PackingItem, Place, Trip } from "@/types";
import { format, parseISO } from "date-fns";
import CreateTripModal from "./CreateTripModal";
import TripSwitcher from "@/components/TripSwitcher";
import UserProfileMenu from "@/components/UserProfileMenu";
import DepartureCountdownCard from "./DepartureCountdownCard";
import PreparationProgressCard from "./PreparationProgressCard";
import TripPlanningCard from "./TripPlanningCard";
import ConsolidatedAgendaSection from "./ConsolidatedAgendaSection";
import UmrahInspirationCard from "./UmrahInspirationCard";
import { fetchUserTrips } from "@/lib/serverTrips";
import { comparePlacesByTime, sortPlacesByTime } from "@/lib/geo";
import type { UpcomingPlace } from "./UpcomingAgendaCard";
import type { TodayPlace } from "./TodayTripSummaryCard";

interface DayWithPlaces extends ItineraryDay {
  places: Place[];
}

export default async function DashboardPage({
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

  // Fetch ALL trips of the user (as host or member)
  const { trips, activeTrip } = await fetchUserTrips(supabase, user.id, tripId);

  let nextAgenda: UpcomingPlace | null = null;
  let todayPlaces: TodayPlace[] = [];
  let todayDayNumber: number | null = null;
  let packingItems: PackingItem[] = [];
  const now = new Date();
  const todayStr = format(now, "yyyy-MM-dd");

  if (activeTrip) {
    // 1. Fetch Days and Places
    const { data: days } = await supabase
      .from("itinerary_days")
      .select("*, places(*)")
      .eq("trip_id", activeTrip.id)
      .order("day_number", { ascending: true })
      .returns<DayWithPlaces[]>();

    if (days && days.length > 0) {
      // Resolve Today's day and places
      const matchedTodayDay = days.find((d) => {
        if (d.date) {
          try {
            return format(parseISO(d.date), "yyyy-MM-dd") === todayStr;
          } catch {
            return false;
          }
        }
        if (activeTrip.start_date) {
          const s = new Date(activeTrip.start_date);
          s.setDate(s.getDate() + (d.day_number - 1));
          return format(s, "yyyy-MM-dd") === todayStr;
        }
        return false;
      });

      if (matchedTodayDay) {
        todayDayNumber = matchedTodayDay.day_number;
        todayPlaces = sortPlacesByTime(
          (matchedTodayDay.places || []).map((p) => ({
            ...p,
            day_number: matchedTodayDay.day_number,
            day_date: matchedTodayDay.date,
          }))
        );
      }

      // Resolve Next Upcoming Agenda
      const allPlaces: UpcomingPlace[] = days.flatMap((d) =>
        sortPlacesByTime(d.places || []).map((p) => ({
          ...p,
          day_number: d.day_number,
          day_date: d.date,
        }))
      );

      const upcomingWithDateTime = allPlaces
        .map((p) => {
          let dateStr = p.day_date;
          if (!dateStr && activeTrip.start_date) {
            const s = new Date(activeTrip.start_date);
            s.setDate(s.getDate() + Math.max(0, (p.day_number || 1) - 1));
            dateStr = s.toISOString().split("T")[0];
          }

          let timestamp = 0;
          if (dateStr) {
            const timeStr = p.start_time || "08:00";
            const [h, m] = timeStr.split(":").map((v) => parseInt(v, 10) || 0);
            const dt = new Date(dateStr);
            dt.setHours(h, m, 0, 0);
            timestamp = dt.getTime();
          }
          return { place: p, timestamp };
        })
        .filter((item) => item.timestamp > 0 && item.timestamp >= now.getTime())
        .sort((a, b) => a.timestamp - b.timestamp);

      if (upcomingWithDateTime.length > 0) {
        nextAgenda = upcomingWithDateTime[0].place;
      } else if (allPlaces.length > 0) {
        allPlaces.sort((a, b) => {
          if (a.day_number !== b.day_number) return (a.day_number || 1) - (b.day_number || 1);
          return comparePlacesByTime(a, b);
        });
        nextAgenda = allPlaces[0];
      }
    }

    // 2. Fetch Packing List Items from Vault
    const { data: packItems } = await supabase
      .from("packing_lists")
      .select("*")
      .eq("trip_id", activeTrip.id)
      .order("created_at", { ascending: true })
      .returns<PackingItem[]>();
    packingItems = packItems ?? [];
  }

  return (
    <div className="flex flex-col h-full overflow-y-auto pb-28 lg:pb-10 hide-scroll">
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

      {/* Main Content Area */}
      <div className="px-4 sm:px-6 lg:px-10 pt-4 sm:pt-6 space-y-4 sm:space-y-5">
        {activeTrip ? (
          <>
            {/* 1. Departure Countdown Hero Card */}
            <DepartureCountdownCard trip={activeTrip} />

            {/* 2. Preparation Checklist Card */}
            <PreparationProgressCard
              trip={activeTrip}
              initialPackingItems={packingItems}
            />

            {/* 3. Compact Trip Planning Card */}
            <TripPlanningCard trip={activeTrip} currentUserId={user.id} />

            {/* 4. Consolidated "Agenda & Aktivitas" Section */}
            <ConsolidatedAgendaSection
              trip={activeTrip}
              todayPlaces={todayPlaces}
              todayDayNumber={todayDayNumber}
              nextAgenda={nextAgenda}
              currentUserId={user.id}
            />

            {/* 5. Compact "Inspirasi Umrah" Card */}
            <UmrahInspirationCard trip={activeTrip} />
          </>
        ) : (
          /* Empty State — No trips yet */
          <div className="rounded-3xl border border-dashed border-brand-200 bg-brand-50/30 p-8 text-center space-y-3 max-w-md mx-auto my-12">
            <p className="text-base font-bold text-stone-800">
              Belum ada perjalanan
            </p>
            <p className="text-xs text-stone-500 leading-relaxed">
              Mulai rencanakan perjalanan atau gabung dengan perjalanan teman menggunakan kode undangan.
            </p>
            <div className="pt-2">
              <CreateTripModal buttonText="Buat Perjalanan Sekarang" variant="primary" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
