"use client";

import { useState } from "react";
import type { Trip } from "@/types";
import { isTripHost, canEditTrip } from "@/types";
import {
  MapPin,
  CalendarBlank,
  CurrencyDollar,
  PencilSimple,
  Camera,
  SuitcaseRolling,
  Users,
  Crown,
  DotsThreeVertical,
} from "@phosphor-icons/react";
import TripCountdown from "./TripCountdown";
import type { UpcomingPlace } from "./UpcomingAgendaCard";
import { formatMoney } from "@/lib/geo";
import EditTripModal from "@/components/EditTripModal";
import TripMembersModal from "@/components/TripMembersModal";

interface ActiveTripHeroProps {
  trip: Trip;
  nextAgenda: UpcomingPlace | null;
  currentUserId?: string;
  onTripUpdated?: () => void;
  onOpenMembers?: () => void;
}

export default function ActiveTripHero({
  trip,
  nextAgenda,
  currentUserId,
  onTripUpdated,
  onOpenMembers,
}: ActiveTripHeroProps) {
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isMembersModalOpen, setIsMembersModalOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const isHost = isTripHost(trip.current_user_role, currentUserId, trip.user_id);
  const canEdit = canEditTrip(trip.current_user_role) || isHost;

  const formatDate = (d: string | null) =>
    d
      ? new Date(d).toLocaleDateString("id-ID", {
          day: "numeric",
          month: "short",
          year: "numeric",
        })
      : "—";

  const handleOpenMembers = () => {
    if (onOpenMembers) {
      onOpenMembers();
    } else {
      setIsMembersModalOpen(true);
    }
  };

  return (
    <>
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-stone-900 via-brand-950 to-stone-950 text-white shadow-xl border border-white/10 p-5 sm:p-7">
        {/* Ambient Glow / Cover Backdrop */}
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
          <div className="absolute -right-12 -bottom-12 w-64 h-64 bg-emerald-500/15 rounded-full blur-3xl pointer-events-none" />
        )}

        {/* Main Content Container */}
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5">
          {/* Left Column: Trip Overview & Countdown */}
          <div className="flex-1 min-w-0 space-y-3.5">
            {/* Status & Role Row */}
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2 flex-wrap">
                {/* Status Indicator */}
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-400">
                  <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span>Aktif</span>
                </span>

                <span className="text-stone-600 text-xs">•</span>

                {/* Role Badge (Gold for Host, Subtle for Member) */}
                {isHost ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-400/30 px-2.5 py-0.5 text-[11px] font-bold">
                    <Crown size={12} weight="fill" className="text-amber-400" />
                    <span>Host</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full bg-white/10 text-stone-300 border border-white/15 px-2.5 py-0.5 text-[11px] font-medium">
                    <span>{trip.current_user_role === "editor" ? "Editor" : "Member"}</span>
                  </span>
                )}
              </div>

              {/* Quick Actions (Members & Edit) */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleOpenMembers}
                  className="inline-flex items-center gap-1.5 rounded-full bg-white/10 hover:bg-white/20 active:scale-95 px-3 py-1 text-xs font-semibold text-stone-200 hover:text-white backdrop-blur-md border border-white/15 transition shadow-xs min-h-[32px]"
                  title="Anggota Perjalanan"
                >
                  <Users size={14} weight="bold" className="text-emerald-400" />
                  <span>Anggota</span>
                </button>

                {canEdit && (
                  <button
                    type="button"
                    onClick={() => setIsEditModalOpen(true)}
                    className="inline-flex items-center gap-1.5 rounded-full bg-white/10 hover:bg-white/20 active:scale-95 px-3 py-1 text-xs font-semibold text-stone-200 hover:text-white backdrop-blur-md border border-white/15 transition shadow-xs min-h-[32px]"
                    title="Edit Perjalanan"
                  >
                    <PencilSimple size={13} weight="bold" />
                    <span className="hidden sm:inline">Edit</span>
                  </button>
                )}
              </div>
            </div>

            {/* Trip Title */}
            <div>
              <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white leading-tight drop-shadow-sm">
                {trip.title}
              </h2>
            </div>

            {/* Metadata (Clean typography with icons, NOT heavy pills) */}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-stone-300">
              {trip.destination && (
                <div className="flex items-center gap-1.5">
                  <MapPin size={14} className="text-emerald-400 shrink-0" />
                  <span className="font-medium text-stone-200">{trip.destination}</span>
                </div>
              )}

              <div className="flex items-center gap-1.5">
                <CalendarBlank size={14} className="text-emerald-400 shrink-0" />
                <span>
                  {formatDate(trip.start_date)} — {formatDate(trip.end_date)}
                </span>
              </div>

              {Number(trip.total_budget || 0) > 0 && (
                <div className="flex items-center gap-1.5 text-stone-300/90">
                  <CurrencyDollar size={14} className="text-emerald-400 shrink-0" />
                  <span>Budget: {formatMoney(Number(trip.total_budget), "IDR")}</span>
                </div>
              )}
            </div>

            {/* Integrated Countdown */}
            <div className="pt-1">
              <TripCountdown
                startDate={trip.start_date}
                endDate={trip.end_date}
                targetAgenda={nextAgenda}
              />
            </div>
          </div>

          {/* Right Column: Travel Photo Showcase (Secondary Action) */}
          <div className="shrink-0 w-full md:w-56 lg:w-64">
            <div
              onClick={() => {
                if (canEdit) setIsEditModalOpen(true);
                else handleOpenMembers();
              }}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  if (canEdit) setIsEditModalOpen(true);
                  else handleOpenMembers();
                }
              }}
              aria-label={canEdit ? "Ubah foto sampul perjalanan" : "Lihat info perjalanan"}
              className="group relative h-28 sm:h-36 md:h-40 w-full rounded-2xl overflow-hidden bg-white/5 border border-white/20 shadow-lg transition-all duration-300 hover:border-emerald-400/50 hover:shadow-emerald-950/40 hover:scale-[1.01] cursor-pointer focus:outline-none focus:ring-2 focus:ring-emerald-400"
            >
              {trip.cover_url ? (
                <>
                  <img
                    src={trip.cover_url}
                    alt={`Sampul ${trip.title}`}
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent" />

                  {/* Secondary Subtle Photo Action in Corner */}
                  {canEdit && (
                    <div className="absolute bottom-2 right-2">
                      <span className="inline-flex items-center gap-1 rounded-lg bg-black/60 px-2 py-1 text-[10px] font-semibold text-stone-200 backdrop-blur-md border border-white/10 group-hover:bg-emerald-600 group-hover:text-white transition">
                        <Camera size={11} weight="bold" />
                        <span>Ganti Foto</span>
                      </span>
                    </div>
                  )}
                </>
              ) : (
                <div className="h-full w-full flex flex-col items-center justify-center p-3 text-center bg-gradient-to-br from-white/10 to-white/5 hover:from-white/15 transition">
                  <span className="grid h-10 w-10 place-items-center rounded-xl bg-white/10 text-emerald-300 border border-white/15 mb-1.5 group-hover:scale-105 transition">
                    <Camera size={20} weight="duotone" />
                  </span>
                  <p className="text-xs font-bold text-white">
                    {canEdit ? "Tambah Foto Sampul" : "Foto Belum Diatur"}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Edit Trip Modal */}
      {isEditModalOpen && (
        <EditTripModal
          trip={trip}
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
        />
      )}

      {/* Trip Members Modal */}
      {isMembersModalOpen && (
        <TripMembersModal
          trip={trip}
          isOpen={isMembersModalOpen}
          onClose={() => setIsMembersModalOpen(false)}
          currentUserId={currentUserId}
          onMembersUpdated={onTripUpdated}
        />
      )}
    </>
  );
}
