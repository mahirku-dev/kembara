import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import type { ItineraryDay, Place, Trip } from "@/types";
import { House } from "@phosphor-icons/react/dist/ssr";
import { format, parseISO } from "date-fns";
import CreateTripModal from "./CreateTripModal";
import TripSwitcher from "@/components/TripSwitcher";
import UserProfileMenu from "@/components/UserProfileMenu";
import ActiveTripHero from "./ActiveTripHero";
import QuickInfoSummary from "./QuickInfoSummary";
import PreparationProgressCard from "./PreparationProgressCard";
import { fetchUserTrips } from "@/lib/serverTrips";
import UpcomingAgendaCard, { type UpcomingPlace } from "./UpcomingAgendaCard";
import TodayTripSummaryCard, { type TodayPlace } from "./TodayTripSummaryCard";
import UmrahInspirationCard from "./UmrahInspirationCard";

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
  let tripStatus: "future" | "ongoing" | "past" | "no_date" = "no_date";
  let placesCount = 0;
  let membersCount = 1;
  let packingDoneCount = 0;
  let packingTotalCount = 0;
  const now = new Date();
  const todayStr = format(now, "yyyy-MM-dd");

  if (activeTrip) {
    if (activeTrip.start_date) {
      const s = new Date(activeTrip.start_date);
      s.setHours(0, 0, 0, 0);
      const e = activeTrip.end_date
        ? new Date(activeTrip.end_date)
        : new Date(activeTrip.start_date);
      e.setHours(23, 59, 59, 999);

      if (now.getTime() < s.getTime()) {
        tripStatus = "future";
      } else if (now.getTime() <= e.getTime()) {
        tripStatus = "ongoing";
      } else {
        tripStatus = "past";
      }
    }

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
        todayPlaces = (matchedTodayDay.places || [])
          .map((p) => ({
            ...p,
            day_number: matchedTodayDay.day_number,
            day_date: matchedTodayDay.date,
          }))
          .sort((a, b) => {
            if (a.start_time && b.start_time)
              return a.start_time.localeCompare(b.start_time);
            return (a.sort_order || 0) - (b.sort_order || 0);
          });
      }

      // Resolve Next Upcoming Agenda
      const allPlaces: UpcomingPlace[] = days.flatMap((d) =>
        (d.places || []).map((p) => ({
          ...p,
          day_number: d.day_number,
          day_date: d.date,
        }))
      );
      placesCount = allPlaces.length;

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
          if (a.day_number !== b.day_number) return a.day_number - b.day_number;
          if (a.start_time && b.start_time)
            return a.start_time.localeCompare(b.start_time);
          return (a.sort_order || 0) - (b.sort_order || 0);
        });
        nextAgenda = allPlaces[0];
      }
    }

    // 2. Fetch Members Count
    const { count: mCount } = await supabase
      .from("trip_members")
      .select("*", { count: "exact", head: true })
      .eq("trip_id", activeTrip.id);
    membersCount = (mCount || 0) + 1; // +1 for host

    // 3. Fetch Packing List Items
    const { data: packItems } = await supabase
      .from("packing_lists")
      .select("is_checked")
      .eq("trip_id", activeTrip.id);
    if (packItems) {
      packingTotalCount = packItems.length;
      packingDoneCount = packItems.filter((p) => p.is_checked).length;
    }
  }

  const dashboardSubtitle = activeTrip
    ? "Ringkasan persiapan & rencana perjalanan"
    : "Rencanakan perjalanan atau kegiatan Anda";

  return (
    <div className="flex flex-col h-full overflow-y-auto pb-28 lg:pb-10 hide-scroll">
      {/* Dynamic Header */}
      <header className="sticky top-0 z-[1100] bg-white/60 backdrop-blur-xl border-b border-white/60 px-4 py-3 sm:px-6 lg:px-10 shrink-0">
        <div className="flex items-center justify-between gap-2.5 sm:gap-4">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-brand-50 text-brand-600 border border-brand-200/50 shadow-sm shrink-0">
              <House size={20} weight="fill" />
            </span>
            <div className="min-w-0 flex-1">
              <h2 className="text-lg sm:text-[20px] font-bold text-brand-700 leading-tight truncate">
                Beranda
              </h2>
              <p className="text-[11px] sm:text-[12px] text-stone-500 mt-0.5 truncate">
                {dashboardSubtitle}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {trips.length > 0 && (
              <TripSwitcher trips={trips} activeTrip={activeTrip} currentUserId={user.id} />
            )}
            <UserProfileMenu user={user} />
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="px-4 sm:px-6 lg:px-10 pt-5 sm:pt-6 space-y-5 sm:space-y-6">
        {/* 1. Active Trip Hero Card (Overview, Dates, Status, Countdown, Photo) */}
        {activeTrip ? (
          <ActiveTripHero
            trip={activeTrip}
            nextAgenda={nextAgenda}
            currentUserId={user.id}
          />
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

        {/* 2. Quick Info Summary Grid (Anggota, Agenda, Dokumen) */}
        {activeTrip && (
          <QuickInfoSummary
            trip={activeTrip}
            membersCount={membersCount}
            placesCount={placesCount}
            docsCount={3}
            currentUserId={user.id}
          />
        )}

        {/* 3. Next Action / Next Agenda Card */}
        {activeTrip && (
          <UpcomingAgendaCard trip={activeTrip} place={nextAgenda} />
        )}

        {/* 4. Preparation Progress Card */}
        {activeTrip && (
          <PreparationProgressCard
            trip={activeTrip}
            packingDoneCount={packingDoneCount}
            packingTotalCount={packingTotalCount}
            docsCount={3}
          />
        )}

        {/* 5. Ringkasan Trip Hari Ini (When active today) */}
        {activeTrip && todayPlaces.length > 0 && (
          <TodayTripSummaryCard
            trip={activeTrip}
            todayDayNumber={todayDayNumber}
            todayDateStr={todayStr}
            places={todayPlaces}
            tripStatus={tripStatus}
          />
        )}

        {/* 6. Umrah Spiritual Inspiration Card (Only shown for Umrah trips) */}
        {activeTrip && <UmrahInspirationCard trip={activeTrip} />}
      </div>
    </div>
  );
}
