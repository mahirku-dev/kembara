"use client";

import { useState } from "react";
import type { Trip } from "@/types";
import {
  MapPin,
  CalendarBlank,
  CurrencyDollar,
  PencilSimple,
  Camera,
  SuitcaseRolling,
  Sparkle,
  Image as ImageIcon,
} from "@phosphor-icons/react";
import TripCountdown from "./TripCountdown";
import type { UpcomingPlace } from "./UpcomingAgendaCard";
import { formatMoney } from "@/lib/geo";
import EditTripModal from "@/components/EditTripModal";

interface ActiveTripHeroProps {
  trip: Trip;
  nextAgenda: UpcomingPlace | null;
}

export default function ActiveTripHero({ trip, nextAgenda }: ActiveTripHeroProps) {
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const formatDate = (d: string | null) =>
    d
      ? new Date(d).toLocaleDateString("id-ID", {
          day: "numeric",
          month: "short",
          year: "numeric",
        })
      : "—";

  return (
    <>
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-900 via-stone-900 to-brand-950 text-white shadow-xl border border-white/10 p-5 sm:p-7 lg:p-8">
        {/* Dynamic Ambient Background Glow from Cover */}
        {trip.cover_url ? (
          <>
            <img
              src={trip.cover_url}
              alt=""
              aria-hidden="true"
              className="absolute inset-0 w-full h-full object-cover opacity-20 filter blur-2xl scale-125 pointer-events-none transition-all duration-700"
            />
            <div className="absolute inset-0 bg-gradient-to-t sm:bg-gradient-to-r from-stone-950/95 via-brand-950/85 to-stone-900/90 pointer-events-none" />
          </>
        ) : (
          <>
            <div className="absolute -right-12 -bottom-12 w-64 h-64 bg-emerald-500/15 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -left-12 -top-12 w-60 h-60 bg-brand-500/20 rounded-full blur-3xl pointer-events-none" />
          </>
        )}

        {/* Content Container */}
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          {/* Left Column: Trip Details & Countdown */}
          <div className="flex-1 min-w-0 space-y-4">
            {/* Badges and Quick Action */}
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/20 px-3 py-1 text-[11px] font-bold text-emerald-300 uppercase tracking-wider backdrop-blur-md border border-emerald-400/25 shadow-xs">
                  <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                  Perjalanan Aktif
                </span>
                {trip.destination && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-medium text-stone-200 backdrop-blur-md border border-white/10">
                    <MapPin size={12} className="text-emerald-400" />
                    {trip.destination}
                  </span>
                )}
              </div>

              {/* Edit Trip Quick Button */}
              <button
                type="button"
                onClick={() => setIsEditModalOpen(true)}
                className="hidden sm:inline-flex items-center gap-1.5 rounded-full bg-white/10 hover:bg-white/20 active:scale-95 px-3 py-1 text-xs font-semibold text-stone-200 hover:text-white backdrop-blur-md border border-white/15 transition shadow-xs"
                title="Edit Rincian & Foto Sampul"
              >
                <PencilSimple size={13} weight="bold" />
                <span>Edit Trip</span>
              </button>
            </div>

            {/* Trip Title */}
            <div>
              <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white leading-tight drop-shadow-sm">
                {trip.title}
              </h2>
            </div>

            {/* Trip Meta Chips */}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-stone-300">
              <div className="inline-flex items-center gap-1.5 bg-white/5 border border-white/10 rounded-xl px-3 py-1.5 backdrop-blur-sm">
                <CalendarBlank size={15} className="text-emerald-400 shrink-0" />
                <span>
                  {formatDate(trip.start_date)} — {formatDate(trip.end_date)}
                </span>
              </div>

              {Number(trip.total_budget || 0) > 0 && (
                <div className="inline-flex items-center gap-1.5 bg-white/5 border border-white/10 rounded-xl px-3 py-1.5 backdrop-blur-sm">
                  <CurrencyDollar size={15} className="text-emerald-400 shrink-0" />
                  <span>Target: {formatMoney(Number(trip.total_budget), "IDR")}</span>
                </div>
              )}
            </div>

            {/* Countdown Component targeting the next agenda */}
            <div className="pt-1">
              <TripCountdown
                startDate={trip.start_date}
                endDate={trip.end_date}
                targetAgenda={nextAgenda}
              />
            </div>
          </div>

          {/* Right Column: Hero Thumbnail Showcase Card */}
          <div className="shrink-0 w-full lg:w-72 xl:w-80">
            <div
              onClick={() => setIsEditModalOpen(true)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  setIsEditModalOpen(true);
                }
              }}
              className="group relative h-44 sm:h-52 w-full rounded-2xl overflow-hidden bg-white/5 border border-white/20 shadow-2xl transition-all duration-300 hover:border-emerald-400/50 hover:shadow-emerald-950/40 hover:scale-[1.02] cursor-pointer focus:outline-hidden focus:ring-2 focus:ring-emerald-400"
            >
              {trip.cover_url ? (
                <>
                  <img
                    src={trip.cover_url}
                    alt={`Sampul ${trip.title}`}
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-108"
                  />
                  {/* Subtle Inner Gradient Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent" />

                  {/* Top Floating Badge on Mobile */}
                  <div className="absolute top-2.5 right-2.5 sm:hidden">
                    <span className="inline-flex items-center gap-1 rounded-full bg-black/60 px-2.5 py-1 text-[10px] font-semibold text-white backdrop-blur-md border border-white/20">
                      <PencilSimple size={11} weight="bold" />
                      Ubah
                    </span>
                  </div>

                  {/* Bottom Caption on Thumbnail */}
                  <div className="absolute bottom-2.5 left-2.5 right-2.5 flex items-center justify-between text-xs text-white">
                    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-stone-200 drop-shadow-md truncate max-w-[180px]">
                      <MapPin size={13} className="text-emerald-400 shrink-0" />
                      {trip.destination || "Foto Sampul"}
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-lg bg-black/50 px-2 py-0.5 text-[10px] font-semibold text-emerald-300 backdrop-blur-md border border-white/10 group-hover:bg-emerald-600 group-hover:text-white transition">
                      <Camera size={12} weight="bold" />
                      <span>Ubah</span>
                    </span>
                  </div>

                  {/* Hover Overlay Hint for Desktop */}
                  <div className="absolute inset-0 bg-brand-950/60 opacity-0 group-hover:opacity-100 transition-opacity duration-200 hidden lg:flex flex-col items-center justify-center gap-1.5 backdrop-blur-xs">
                    <span className="p-2 rounded-full bg-white/20 text-white shadow-md">
                      <PencilSimple size={18} weight="bold" />
                    </span>
                    <span className="text-xs font-bold text-white tracking-wide">
                      Ganti Foto Sampul
                    </span>
                  </div>
                </>
              ) : (
                /* Empty Placeholder State */
                <div className="h-full w-full flex flex-col items-center justify-center p-4 text-center bg-gradient-to-br from-white/10 to-white/5 hover:from-white/15 hover:to-white/10 transition">
                  <span className="grid h-12 w-12 place-items-center rounded-2xl bg-white/10 text-emerald-300 border border-white/15 shadow-inner mb-2 group-hover:scale-110 group-hover:bg-emerald-500/20 group-hover:text-emerald-200 transition duration-300">
                    <Camera size={24} weight="duotone" />
                  </span>
                  <p className="text-xs font-bold text-white">
                    + Tambah Foto Sampul
                  </p>
                  <p className="text-[11px] text-stone-300/80 mt-0.5">
                    Upload foto kenangan atau pilih tema
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Edit Trip Modal instance for this banner */}
      <EditTripModal
        trip={trip}
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
      />
    </>
  );
}

