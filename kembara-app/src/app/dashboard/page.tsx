import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import type { ItineraryDay, Place, Trip } from "@/types";
import {
  House,
  BookOpen,
  Quotes,
  ListBullets,
  Wallet,
  SuitcaseRolling,
  MapPin,
  CalendarBlank,
  CurrencyDollar,
  MapTrifold,
} from "@phosphor-icons/react/dist/ssr";
import { format, parseISO } from "date-fns";
import CreateTripModal from "./CreateTripModal";
import TripSwitcher from "@/components/TripSwitcher";
import UserProfileMenu from "@/components/UserProfileMenu";
import TripCountdown from "./TripCountdown";
import UpcomingAgendaCard, { type UpcomingPlace } from "./UpcomingAgendaCard";
import TodayTripSummaryCard, { type TodayPlace } from "./TodayTripSummaryCard";
import UmrahInspirationCard from "./UmrahInspirationCard";
import Link from "next/link";
import { formatMoney } from "@/lib/geo";

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

  // Fetch ALL trips of the user ordered by newest
  const { data: allTrips } = await supabase
    .from("trips")
    .select("*")
    .order("created_at", { ascending: false })
    .returns<Trip[]>();

  const trips = allTrips ?? [];
  const activeTrip = tripId
    ? trips.find((t) => t.id === tripId) ?? trips[0] ?? null
    : trips[0] ?? null;

  let nextAgenda: UpcomingPlace | null = null;
  let todayPlaces: TodayPlace[] = [];
  let todayDayNumber: number | null = null;
  let tripStatus: "future" | "ongoing" | "past" | "no_date" = "no_date";
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

    const { data: days } = await supabase
      .from("itinerary_days")
      .select("*, places(*)")
      .eq("trip_id", activeTrip.id)
      .order("day_number", { ascending: true })
      .returns<DayWithPlaces[]>();

    if (days && days.length > 0) {
      // 1. Resolve Today's day and places
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

      // 2. Resolve Next Upcoming Agenda
      const allPlaces: UpcomingPlace[] = days.flatMap((d) =>
        (d.places || []).map((p) => ({
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
          if (a.day_number !== b.day_number) return a.day_number - b.day_number;
          if (a.start_time && b.start_time)
            return a.start_time.localeCompare(b.start_time);
          return (a.sort_order || 0) - (b.sort_order || 0);
        });
        nextAgenda = allPlaces[0];
      }
    }
  }

  const formatDate = (d: string | null) =>
    d
      ? new Date(d).toLocaleDateString("id-ID", {
          day: "numeric",
          month: "short",
          year: "numeric",
        })
      : "—";

  const dashboardSubtitle = activeTrip
    ? `Ringkasan persiapan & rencana perjalanan ${activeTrip.destination || activeTrip.title}`
    : "Ringkasan panduan & persiapan perjalanan Anda";

  return (
    <div className="flex flex-col h-full overflow-y-auto pb-28 lg:pb-10">
      {/* Dynamic Header */}
      <header className="sticky top-0 z-30 bg-white/60 backdrop-blur-xl border-b border-white/60 px-5 pt-4 pb-3 lg:px-10 shrink-0">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div className="flex items-center gap-3">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-brand-50 text-brand-600 border border-brand-200/50 shadow-sm shrink-0">
              <House size={22} weight="fill" />
            </span>
            <div>
              <h2 className="text-[20px] font-bold text-brand-700 leading-tight">
                Beranda
              </h2>
              <p className="text-[12px] text-stone-500 mt-0.5 line-clamp-1">
                {dashboardSubtitle}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0 justify-between sm:justify-end">
            {trips.length > 0 && (
              <TripSwitcher trips={trips} activeTrip={activeTrip} />
            )}
            <UserProfileMenu user={user} />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="px-5 pt-6 lg:px-10 space-y-6">
        {/* Active Trip Banner with Agenda Countdown */}
        {activeTrip ? (
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-brand-700 via-brand-800 to-stone-900 p-6 lg:p-8 text-white shadow-xl space-y-6">
            {activeTrip.cover_url && (
              <>
                <img
                  src={activeTrip.cover_url}
                  alt={activeTrip.title}
                  className="absolute inset-0 w-full h-full object-cover object-center opacity-30 mix-blend-overlay pointer-events-none"
                />
                <div className="absolute inset-0 bg-gradient-to-r from-stone-950/85 via-brand-950/75 to-stone-900/85 pointer-events-none" />
              </>
            )}
            <div className="absolute -right-10 -bottom-10 w-56 h-56 bg-emerald-500/20 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -left-10 -top-10 w-48 h-48 bg-brand-500/20 rounded-full blur-3xl pointer-events-none" />

            <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
              {/* Trip Details */}
              <div className="space-y-2.5">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/20 px-3 py-1 text-[11px] font-bold text-emerald-300 uppercase tracking-wider backdrop-blur-sm border border-emerald-400/20">
                  Perjalanan Aktif
                </span>
                <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-white">
                  {activeTrip.title}
                </h2>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-emerald-100/80">
                  {activeTrip.destination && (
                    <span className="flex items-center gap-1">
                      <MapPin size={14} className="text-emerald-400" />
                      {activeTrip.destination}
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <CalendarBlank size={14} className="text-emerald-400" />
                    {formatDate(activeTrip.start_date)} — {formatDate(activeTrip.end_date)}
                  </span>
                  {Number(activeTrip.total_budget || 0) > 0 && (
                    <span className="flex items-center gap-1">
                      <CurrencyDollar size={14} className="text-emerald-400" />
                      Target: {formatMoney(Number(activeTrip.total_budget), "IDR")}
                    </span>
                  )}
                </div>
              </div>

              {/* Countdown Component targeting the next agenda */}
              <div className="shrink-0">
                <TripCountdown
                  startDate={activeTrip.start_date}
                  endDate={activeTrip.end_date}
                  targetAgenda={nextAgenda}
                />
              </div>
            </div>
          </div>
        ) : (
          /* Empty state — no trips yet */
          <div className="rounded-3xl border border-dashed border-brand-200 bg-brand-50/30 p-8 text-center">
            <p className="text-[15px] font-medium text-stone-700">
              Belum ada perjalanan
            </p>
            <p className="mt-1 text-[13px] text-stone-400">
              Buat perjalanan pertama Anda untuk mulai menyusun itinerary dan budget.
            </p>
            <div className="mt-4">
              <CreateTripModal buttonText="Buat Perjalanan Sekarang" variant="primary" />
            </div>
          </div>
        )}

        {/* Ringkasan Trip Hari Ini */}
        {activeTrip && (
          <TodayTripSummaryCard
            trip={activeTrip}
            todayDayNumber={todayDayNumber}
            todayDateStr={todayStr}
            places={todayPlaces}
            tripStatus={tripStatus}
          />
        )}

        {/* Single Next Agenda Card */}
        {activeTrip && (
          <UpcomingAgendaCard trip={activeTrip} place={nextAgenda} />
        )}

        {/* Inspirasi / Hadith Card (Only shown for Umrah trips and clickable to cycle) */}
        {activeTrip && <UmrahInspirationCard trip={activeTrip} />}
      </div>
    </div>
  );
}
