"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Place, Trip } from "@/types";
import { canEditTrip, isTripHost } from "@/types";
import {
  CalendarBlank,
  Clock,
  MapPin,
  ArrowRight,
  ArrowSquareOut,
  Plus,
  Compass,
  CheckCircle,
} from "@phosphor-icons/react";
import { format, parseISO } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import {
  formatTimeRange,
  detectTimezoneFromLocation,
  getGoogleMapsDirectionsUrl,
} from "@/lib/geo";
import AddPlaceModal from "./itinerary/AddPlaceModal";
import type { UpcomingPlace } from "./UpcomingAgendaCard";
import type { TodayPlace } from "./TodayTripSummaryCard";

interface ConsolidatedAgendaSectionProps {
  trip: Trip;
  todayPlaces?: TodayPlace[];
  todayDayNumber?: number | null;
  nextAgenda?: UpcomingPlace | null;
  currentUserId?: string;
}

export default function ConsolidatedAgendaSection({
  trip,
  todayPlaces = [],
  todayDayNumber = null,
  nextAgenda = null,
  currentUserId,
}: ConsolidatedAgendaSectionProps) {
  const router = useRouter();
  const isHost = isTripHost(trip.current_user_role, currentUserId, trip.user_id);
  const canEdit = canEditTrip(trip.current_user_role) || isHost;

  const hasTodayPlaces = todayPlaces.length > 0;
  const hasNextAgenda = Boolean(nextAgenda);

  const formatDayDate = (dateStr: string | null, dayNum: number) => {
    if (!dateStr) return `Hari ${dayNum}`;
    try {
      return `Hari ${dayNum} • ${format(parseISO(dateStr), "EEEE, d MMM", {
        locale: idLocale,
      })}`;
    } catch {
      return `Hari ${dayNum}`;
    }
  };

  return (
    <div className="rounded-3xl bg-white/70 backdrop-blur-xl border border-white/80 p-5 sm:p-6 shadow-panel space-y-4">
      {/* Section Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="grid h-8 w-8 place-items-center rounded-xl bg-brand-50 text-brand-600 border border-brand-200/50 shadow-xs shrink-0">
            <CalendarBlank size={18} weight="fill" />
          </span>
          <h3 className="text-[15px] font-bold text-stone-900 leading-tight truncate">
            Agenda &amp; Aktivitas
          </h3>
        </div>

        <Link
          href={`/dashboard/itinerary?tripId=${trip.id}`}
          className="group inline-flex items-center gap-1 text-xs font-semibold text-brand-600 hover:text-brand-700 transition shrink-0"
        >
          <span>Lihat semua</span>
          <ArrowRight
            size={13}
            weight="bold"
            className="transition-transform group-hover:translate-x-0.5"
          />
        </Link>
      </div>

      {/* Case 1: Active Agenda for Today */}
      {hasTodayPlaces ? (
        <div className="space-y-2.5">
          <div className="flex items-center justify-between text-xs font-semibold text-stone-600">
            <span>Agenda Hari Ini (Hari ke-{todayDayNumber || 1})</span>
            <span className="text-brand-700 font-bold">{todayPlaces.length} Kegiatan</span>
          </div>

          <div className="space-y-2">
            {todayPlaces.map((place) => (
              <div
                key={place.id}
                className="flex items-start justify-between gap-3 rounded-2xl bg-white/90 border border-stone-200/80 p-3.5 shadow-xs hover:border-brand-300 transition"
              >
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    {place.start_time && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                        <Clock size={12} weight="bold" />
                        <span>{formatTimeRange(place.start_time, place.end_time)}</span>
                      </span>
                    )}
                    {place.category && (
                      <span className="text-[10.5px] font-medium px-2 py-0.5 rounded-full bg-stone-100 text-stone-600 capitalize">
                        {place.category}
                      </span>
                    )}
                  </div>
                  <h4 className="text-sm font-bold text-stone-900 leading-snug">
                    {place.name}
                  </h4>
                  {place.address && (
                    <a
                      href={getGoogleMapsDirectionsUrl(
                        place.lat,
                        place.lng,
                        place.address,
                        place.name,
                        trip.destination
                      )}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[11.5px] text-stone-500 hover:text-brand-600 flex items-start gap-1 group w-fit transition active:scale-95 break-words max-w-full"
                      title="Buka rute arah di Google Maps"
                    >
                      <MapPin size={12} className="shrink-0 text-rose-500 mt-0.5 group-hover:scale-110 transition-transform" />
                      <span className="group-hover:underline break-words">{place.address}</span>
                      <ArrowSquareOut size={11} className="shrink-0 text-stone-400 group-hover:text-brand-600 mt-0.5" />
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : hasNextAgenda && nextAgenda ? (
        /* Case 2: Next Upcoming Agenda */
        <div className="rounded-2xl bg-gradient-to-br from-white via-white to-brand-50/40 border border-stone-200/80 p-4 shadow-xs space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-brand-50 text-brand-700 border border-brand-200/60">
              {formatDayDate(nextAgenda.day_date, nextAgenda.day_number)}
            </span>
            {nextAgenda.start_time && (
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                <Clock size={12} weight="bold" />
                <span>{formatTimeRange(nextAgenda.start_time, nextAgenda.end_time)}</span>
              </span>
            )}
          </div>
          <h4 className="text-sm sm:text-base font-bold text-stone-900 leading-snug">
            {nextAgenda.name}
          </h4>
          {nextAgenda.address && (
            <a
              href={getGoogleMapsDirectionsUrl(
                nextAgenda.lat,
                nextAgenda.lng,
                nextAgenda.address,
                nextAgenda.name,
                trip.destination
              )}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-stone-500 hover:text-brand-600 flex items-start gap-1 group w-fit transition active:scale-95 break-words max-w-full"
              title="Buka rute arah di Google Maps"
            >
              <MapPin size={13} className="shrink-0 text-rose-500 mt-0.5 group-hover:scale-110 transition-transform" />
              <span className="group-hover:underline break-words">{nextAgenda.address}</span>
              <ArrowSquareOut size={12} className="shrink-0 text-stone-400 group-hover:text-brand-600 mt-0.5" />
            </a>
          )}
        </div>
      ) : (
        /* Case 3: Empty State (Clean consolidated empty card matching After mockup) */
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-stone-200 bg-stone-50/40 p-6 text-center space-y-3">
          <div className="grid h-12 w-12 place-items-center rounded-2xl bg-brand-50 text-brand-600 border border-brand-200/60 shadow-xs">
            <MapPin size={24} weight="duotone" />
          </div>
          <div className="max-w-xs space-y-1">
            <h4 className="text-[14px] font-bold text-stone-800">
              Belum ada agenda untuk saat ini
            </h4>
            <p className="text-xs text-stone-500 leading-relaxed">
              Tambahkan agenda perjalanan agar Anda selalu terarah selama di Tanah Suci.
            </p>
          </div>

          {canEdit && (
            <div className="pt-1">
              <AddPlaceModal
                tripId={trip.id}
                dayNumber={1}
                onPlaceAdded={() => {
                  router.push(`/dashboard/itinerary?tripId=${trip.id}`);
                  router.refresh();
                }}
                buttonText="Tambah Agenda"
                buttonVariant="secondary"
                className="inline-flex items-center justify-center gap-1.5 rounded-2xl border border-brand-200 bg-white hover:bg-brand-50 px-4 py-2 text-xs font-semibold text-brand-600 shadow-xs transition active:scale-95"
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

