"use client";

import Link from "next/link";
import type { Place, Trip } from "@/types";
import {
  CalendarCheck,
  Clock,
  MapPin,
  ArrowRight,
  MapTrifold,
  Plus,
} from "@phosphor-icons/react";
import { format, parseISO } from "date-fns";
import { id as idLocale } from "date-fns/locale";

export interface UpcomingPlace extends Place {
  day_number: number;
  day_date: string | null;
}

interface UpcomingAgendaCardProps {
  trip: Trip;
  place: UpcomingPlace | null;
}

export default function UpcomingAgendaCard({
  trip,
  place,
}: UpcomingAgendaCardProps) {
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
    <div className="rounded-3xl bg-white/70 backdrop-blur-xl border border-white/80 p-5 sm:p-6 shadow-panel space-y-3.5">
      {/* Card Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="grid h-8 w-8 place-items-center rounded-xl bg-brand-50 text-brand-600 border border-brand-200/50 shadow-xs shrink-0">
            <CalendarCheck size={18} weight="fill" />
          </span>
          <div>
            <h3 className="text-[15px] font-bold text-stone-900 leading-tight">
              Agenda Berikutnya
            </h3>
            <p className="text-[11.5px] text-stone-500 mt-0.5">
              Kegiatan terdekat dalam {trip.title}
            </p>
          </div>
        </div>

        <Link
          href={`/dashboard/itinerary?tripId=${trip.id}`}
          className="group inline-flex items-center gap-1 text-xs font-semibold text-brand-600 hover:text-brand-700 transition"
        >
          <span>Semua Agenda</span>
          <ArrowRight
            size={13}
            weight="bold"
            className="transition-transform group-hover:translate-x-0.5"
          />
        </Link>
      </div>

      {/* Prominent Next Agenda Card */}
      {place ? (
        <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-white via-white to-brand-50/40 border border-stone-200/80 p-4 sm:p-5 shadow-xs hover:shadow-md transition duration-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-2 flex-1 min-w-0">
              {/* Badges */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-brand-50 text-brand-700 border border-brand-200/60">
                  {formatDayDate(place.day_date, place.day_number)}
                </span>
                {place.start_time && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                    <Clock size={12} weight="bold" />
                    <span>
                      {place.start_time}
                      {place.end_time ? ` — ${place.end_time}` : ""}
                    </span>
                  </span>
                )}
                {place.category && (
                  <span className="text-[10.5px] font-medium px-2 py-0.5 rounded-full bg-stone-100 text-stone-600 capitalize">
                    {place.category}
                  </span>
                )}
              </div>

              {/* Title */}
              <h4 className="text-base sm:text-lg font-bold text-stone-900 leading-snug group-hover:text-brand-700 transition truncate">
                {place.name}
              </h4>

              {/* Address / Location */}
              {place.address && (
                <p className="text-xs text-stone-500 flex items-start gap-1.5 line-clamp-1">
                  <MapPin size={14} className="shrink-0 text-brand-600 mt-0.5" />
                  <span className="truncate">{place.address}</span>
                </p>
              )}

              {/* Notes */}
              {place.notes && (
                <p className="text-[11.5px] text-stone-600 italic bg-white/90 p-2 rounded-xl border border-stone-200/60 line-clamp-2 leading-relaxed">
                  "{place.notes}"
                </p>
              )}
            </div>

            {/* Actions on Right */}
            <div className="flex sm:flex-col items-center sm:items-end gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-stone-100">
              {typeof place.lat === "number" && typeof place.lng === "number" && (
                <Link
                  href={`/dashboard/map?tripId=${trip.id}`}
                  className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-3 py-2 rounded-xl transition min-h-[38px]"
                >
                  <MapTrifold size={14} weight="bold" />
                  <span>Peta</span>
                </Link>
              )}

              <Link
                href={`/dashboard/itinerary?tripId=${trip.id}`}
                className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 text-xs font-semibold text-white bg-brand-600 hover:bg-brand-700 px-3.5 py-2 rounded-xl transition shadow-cta min-h-[38px]"
              >
                <span>Lihat Agenda</span>
                <ArrowRight size={13} weight="bold" />
              </Link>
            </div>
          </div>
        </div>
      ) : (
        /* Empty State */
        <div className="rounded-2xl border border-dashed border-stone-200 bg-stone-50/50 p-6 text-center space-y-2">
          <p className="text-sm font-bold text-stone-800">
            Belum ada agenda berikutnya
          </p>
          <p className="text-xs text-stone-400 max-w-sm mx-auto">
            Tambahkan agenda kegiatan atau destinasi ke dalam jadwal perjalanan Anda.
          </p>
          <div className="pt-2">
            <Link
              href={`/dashboard/itinerary?tripId=${trip.id}`}
              className="inline-flex items-center gap-1.5 rounded-2xl bg-brand-600 hover:bg-brand-700 text-white px-4 py-2.5 text-xs font-bold shadow-cta transition active:scale-95 min-h-[44px]"
            >
              <Plus size={14} weight="bold" />
              <span>Tambah Agenda</span>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
