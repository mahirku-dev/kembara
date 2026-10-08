"use client";

import Link from "next/link";
import type { Place, Trip } from "@/types";
import {
  CalendarCheck,
  Clock,
  MapPin,
  ArrowRight,
  Sparkle,
  Compass,
  MapTrifold,
  Plus,
  NotePencil,
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
      return `Hari ${dayNum} • ${format(parseISO(dateStr), "EEEE, d MMMM yyyy", {
        locale: idLocale,
      })}`;
    } catch {
      return `Hari ${dayNum}`;
    }
  };

  return (
    <div className="rounded-3xl bg-white/70 backdrop-blur-xl border border-white/80 p-6 lg:p-7 shadow-panel space-y-4">
      {/* Card Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-brand-50 text-brand-600 border border-brand-200/50 shadow-sm shrink-0">
            <CalendarCheck size={20} weight="fill" />
          </span>
          <div>
            <h3 className="text-[17px] font-bold text-stone-900 leading-tight">
              Agenda Berikutnya
            </h3>
            <p className="text-[12px] text-stone-500 mt-0.5">
              Kegiatan terdekat yang akan dilaksanakan dalam {trip.title}
            </p>
          </div>
        </div>

        <Link
          href={`/dashboard/itinerary?tripId=${trip.id}`}
          className="group inline-flex items-center gap-1 text-xs font-semibold text-brand-600 hover:text-brand-700 transition"
        >
          <span>Semua Itinerary</span>
          <ArrowRight
            size={14}
            weight="bold"
            className="transition-transform group-hover:translate-x-0.5"
          />
        </Link>
      </div>

      {/* Single Prominent Next Agenda Card */}
      {place ? (
        <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-white via-white to-brand-50/40 border border-stone-200/80 p-5 shadow-sm hover:shadow-md transition duration-200">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-2 flex-1">
              {/* Badges */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[11px] font-bold px-3 py-1 rounded-full bg-brand-100 text-brand-700">
                  {formatDayDate(place.day_date, place.day_number)}
                </span>
                {place.category && (
                  <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-stone-100 text-stone-600 uppercase">
                    {place.category}
                  </span>
                )}
                {place.start_time && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                    <Clock size={13} weight="bold" />
                    <span>
                      {place.start_time}
                      {place.end_time ? ` — ${place.end_time}` : ""}
                    </span>
                  </span>
                )}
              </div>

              {/* Title */}
              <h4 className="text-lg md:text-xl font-bold text-stone-900 leading-snug group-hover:text-brand-700 transition">
                {place.name}
              </h4>

              {/* Address */}
              {place.address && (
                <p className="text-xs text-stone-500 flex items-start gap-1.5 line-clamp-2">
                  <MapPin size={15} className="shrink-0 text-brand-500 mt-0.5" />
                  <span>{place.address}</span>
                </p>
              )}

              {/* Notes */}
              {place.notes && (
                <p className="text-xs text-stone-600 italic bg-white/80 p-2.5 rounded-xl border border-stone-200/60 leading-relaxed">
                  "{place.notes}"
                </p>
              )}
            </div>

            {/* Actions on right */}
            <div className="flex md:flex-col items-center md:items-end gap-2 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-stone-100">
              {typeof place.lat === "number" && typeof place.lng === "number" && (
                <Link
                  href={`/dashboard/map?tripId=${trip.id}`}
                  className="w-full md:w-auto inline-flex items-center justify-center gap-1.5 text-xs font-semibold text-emerald-800 bg-emerald-100/80 hover:bg-emerald-200/80 border border-emerald-300/60 px-3.5 py-2 rounded-xl transition shadow-sm"
                >
                  <MapTrifold size={15} weight="bold" />
                  <span>Lihat di Peta</span>
                </Link>
              )}

              <Link
                href={`/dashboard/itinerary?tripId=${trip.id}`}
                className="w-full md:w-auto inline-flex items-center justify-center gap-1.5 text-xs font-semibold text-white bg-brand-600 hover:bg-brand-700 px-4 py-2 rounded-xl transition shadow-sm"
              >
                <span>Buka Itinerary</span>
                <ArrowRight size={13} weight="bold" />
              </Link>
            </div>
          </div>
        </div>
      ) : (
        /* Empty State */
        <div className="rounded-2xl border border-dashed border-stone-200 bg-stone-50/50 p-6 text-center">
          <p className="text-sm font-semibold text-stone-700">
            Belum ada agenda terdaftar
          </p>
          <p className="text-xs text-stone-400 mt-0.5">
            Mulai susun rencana tempat ziarah, jadwal ibadah, atau aktivitas harian di Itinerary.
          </p>
          <div className="mt-3">
            <Link
              href={`/dashboard/itinerary?tripId=${trip.id}`}
              className="inline-flex items-center gap-1.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white px-3.5 py-2 text-xs font-semibold shadow-sm transition"
            >
              <Plus size={14} weight="bold" />
              <span>Tambah Agenda di Itinerary</span>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
