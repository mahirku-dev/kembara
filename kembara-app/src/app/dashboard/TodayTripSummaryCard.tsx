"use client";

import Link from "next/link";
import type { Place, Trip } from "@/types";
import {
  Sun,
  Clock,
  MapPin,
  ArrowRight,
  Plus,
  CheckCircle,
  Sparkle,
  CalendarBlank,
  MapTrifold,
  Wallet,
  AirplaneTilt,
} from "@phosphor-icons/react";
import { format, parseISO } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { formatMoney, sortPlacesByTime } from "@/lib/geo";

export interface TodayPlace extends Place {
  day_number: number;
  day_date: string | null;
}

interface TodayTripSummaryCardProps {
  trip: Trip;
  todayDayNumber: number | null;
  todayDateStr: string;
  places: TodayPlace[];
  tripStatus: "future" | "ongoing" | "past" | "no_date";
}

export default function TodayTripSummaryCard({
  trip,
  todayDayNumber,
  todayDateStr,
  places,
  tripStatus,
}: TodayTripSummaryCardProps) {
  const formattedToday = format(new Date(), "EEEE, d MMMM yyyy", {
    locale: idLocale,
  });

  const totalCostToday = places.reduce(
    (sum, p) => sum + (Number(p.cost) || 0),
    0
  );

  return (
    <div className="rounded-3xl bg-white/70 backdrop-blur-xl border border-white/80 p-6 lg:p-7 shadow-panel space-y-4">
      {/* Card Header */}
      <div className="flex items-center gap-2.5">
        <span className="grid h-9 w-9 place-items-center rounded-xl bg-amber-50 text-amber-600 border border-amber-200/60 shadow-sm shrink-0">
          <Sun size={20} weight="fill" />
        </span>
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-[17px] font-bold text-stone-900 leading-tight">
              Ringkasan Trip Hari Ini
            </h3>
            {todayDayNumber && (
              <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 uppercase">
                Hari ke-{todayDayNumber}
              </span>
            )}
          </div>
          <p className="text-[12px] text-stone-500 mt-0.5">{formattedToday}</p>
        </div>
      </div>

      {/* Body Section */}
      {places.length > 0 ? (
        <div className="space-y-3">
          {/* Quick Stats Banner for Today */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 p-3 rounded-2xl bg-amber-50/60 border border-amber-200/50 text-xs">
            <div>
              <span className="text-[10px] font-semibold text-amber-700 uppercase">
                Agenda Hari Ini
              </span>
              <p className="text-[15px] font-bold text-stone-900 mt-0.5">
                {places.length} Kegiatan
              </p>
            </div>
            {totalCostToday > 0 && (
              <div>
                <span className="text-[10px] font-semibold text-amber-700 uppercase">
                  Estimasi Biaya
                </span>
                <p className="text-[15px] font-bold text-stone-900 mt-0.5">
                  {formatMoney(totalCostToday, "IDR")}
                </p>
              </div>
            )}
            <div className="col-span-2 sm:col-span-1 flex items-center justify-start sm:justify-end">
              <Link
                href={`/dashboard/map?tripId=${trip.id}`}
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-800 bg-white/90 hover:bg-white border border-emerald-300 px-3 py-1.5 rounded-xl transition shadow-sm"
              >
                <MapTrifold size={14} weight="bold" />
                <span>Peta Hari Ini</span>
              </Link>
            </div>
          </div>

          {/* Today's Places List */}
          <div className="space-y-2">
            {sortPlacesByTime(places).map((place, idx) => (
              <div
                key={place.id || idx}
                className="group flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 p-3.5 rounded-2xl bg-white/90 border border-stone-200/70 hover:border-brand-300 transition shadow-sm"
              >
                <div className="space-y-1 min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    {place.start_time ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-brand-50 text-brand-700 border border-brand-200/60">
                        <Clock size={12} weight="bold" />
                        <span>
                          {place.start_time}
                          {place.end_time ? ` — ${place.end_time}` : ""}
                        </span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2.5 py-0.5 rounded-full bg-stone-100 text-stone-600 border border-stone-200/60">
                        <Clock size={12} weight="bold" className="text-stone-400" />
                        <span>Sepanjang hari</span>
                      </span>
                    )}
                    {place.category && (
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-stone-100 text-stone-600 uppercase">
                        {place.category}
                      </span>
                    )}
                  </div>

                  <h4 className="text-[14px] font-bold text-stone-900 group-hover:text-brand-700 transition truncate">
                    {place.name}
                  </h4>

                  {place.address && (
                    <p className="text-[11px] text-stone-500 flex items-center gap-1 truncate">
                      <MapPin size={13} className="shrink-0 text-brand-500" />
                      <span className="truncate">{place.address}</span>
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2 shrink-0 pt-1 sm:pt-0 border-t sm:border-t-0 border-stone-100">
                  <Link
                    href={`/dashboard/itinerary?tripId=${trip.id}`}
                    className="text-xs font-semibold text-brand-600 hover:text-brand-700 transition px-2 py-1"
                  >
                    Lihat Detail
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        /* Empty State: Belum ada agenda hari ini */
        <div className="rounded-2xl border border-dashed border-amber-200/80 bg-amber-50/40 p-6 text-center space-y-2">
          <div className="inline-grid h-12 w-12 place-items-center rounded-2xl bg-white text-amber-600 shadow-sm border border-amber-100">
            <CalendarBlank size={24} weight="light" />
          </div>
          <h4 className="text-sm font-bold text-stone-800">
            Belum ada agenda hari ini
          </h4>
          <p className="text-xs text-stone-500 max-w-md mx-auto">
            {tripStatus === "future"
              ? `Trip ${trip.title} baru akan dimulai pada ${
                  trip.start_date
                    ? format(parseISO(trip.start_date), "d MMMM yyyy", {
                        locale: idLocale,
                      })
                    : "jadwal mendatang"
                }. Belum ada agenda untuk hari ini.`
              : tripStatus === "past"
              ? `Perjalanan ${trip.title} telah selesai dilaksanakan.`
              : "Tidak ada jadwal kegiatan yang diagendakan untuk hari ini."}
          </p>

          <div className="pt-2">
            <Link
              href={`/dashboard/itinerary?tripId=${trip.id}`}
              className="inline-flex items-center gap-1.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white px-4 py-2 text-xs font-semibold shadow-sm transition active:scale-95"
            >
              {tripStatus === "ongoing" ? (
                <>
                  <Plus size={14} weight="bold" />
                  <span>Tambah Agenda Hari Ini</span>
                </>
              ) : (
                <>
                  <AirplaneTilt size={15} weight="fill" />
                  <span>Buka Itinerary</span>
                </>
              )}
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

