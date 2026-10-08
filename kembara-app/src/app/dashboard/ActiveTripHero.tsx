"use client";

import { useState } from "react";
import type { Trip, TripRole } from "@/types";
import { isTripHost, canEditTrip } from "@/types";
import {
  MapPin,
  CalendarBlank,
  CurrencyDollar,
  PencilSimple,
  Camera,
  SuitcaseRolling,
  Sparkle,
  Image as ImageIcon,
  Users,
  Crown,
  Eye,
  ShareNetwork,
  Key,
} from "@phosphor-icons/react";
import TripCountdown from "./TripCountdown";
import type { UpcomingPlace } from "./UpcomingAgendaCard";
import { formatMoney } from "@/lib/geo";
import EditTripModal from "@/components/EditTripModal";
import TripMembersModal from "@/components/TripMembersModal";
import JoinTripModal from "@/components/JoinTripModal";

interface ActiveTripHeroProps {
  trip: Trip;
  nextAgenda: UpcomingPlace | null;
  currentUserId?: string;
  onTripUpdated?: () => void;
}

export default function ActiveTripHero({
  trip,
  nextAgenda,
  currentUserId,
  onTripUpdated,
}: ActiveTripHeroProps) {
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isMembersModalOpen, setIsMembersModalOpen] = useState(false);
  const [isJoinModalOpen, setIsJoinModalOpen] = useState(false);

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

                {/* Role Pill */}
                {isHost ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/20 px-2.5 py-1 text-[11px] font-bold text-amber-300 backdrop-blur-md border border-amber-400/25 shadow-xs">
                    <Crown size={12} weight="fill" className="text-amber-400" />
                    Host (Pemilik)
                  </span>
                ) : trip.current_user_role === "editor" ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/20 px-2.5 py-1 text-[11px] font-bold text-blue-300 backdrop-blur-md border border-blue-400/25">
                    <PencilSimple size={12} weight="bold" />
                    Editor
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-medium text-stone-300 backdrop-blur-md border border-white/15">
                    <Eye size={12} weight="bold" />
                    Viewer (Lihat Saja)
                  </span>
                )}

                {trip.destination && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-medium text-stone-200 backdrop-blur-md border border-white/10">
                    <MapPin size={12} className="text-emerald-400" />
                    {trip.destination}
                  </span>
                )}
              </div>

              {/* Action Buttons: Members, Join, & Edit */}
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => setIsMembersModalOpen(true)}
                  className="inline-flex items-center gap-1.5 rounded-full bg-white/10 hover:bg-white/20 active:scale-95 px-3 py-1 text-xs font-semibold text-stone-200 hover:text-white backdrop-blur-md border border-white/15 transition shadow-xs"
                  title="Kelola Anggota & Bagikan Kode Undangan"
                >
                  <Users size={14} weight="bold" className="text-emerald-400" />
                  <span>Anggota & Undangan</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsJoinModalOpen(true)}
                  className="inline-flex items-center gap-1.5 rounded-full bg-white/10 hover:bg-white/20 active:scale-95 px-3 py-1 text-xs font-semibold text-stone-200 hover:text-white backdrop-blur-md border border-white/15 transition shadow-xs"
                  title="Gabung ke perjalanan lain dengan kode"
                >
                  <Key size={13} weight="bold" className="text-amber-300" />
                  <span>Gabung Trip</span>
                </button>

                {isHost && (
                  <button
                    type="button"
                    onClick={() => setIsEditModalOpen(true)}
                    className="hidden sm:inline-flex items-center gap-1.5 rounded-full bg-white/10 hover:bg-white/20 active:scale-95 px-3 py-1 text-xs font-semibold text-stone-200 hover:text-white backdrop-blur-md border border-white/15 transition shadow-xs"
                    title="Edit Rincian & Foto Sampul"
                  >
                    <PencilSimple size={13} weight="bold" />
                    <span>Edit Trip</span>
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

              {trip.invite_code && (
                <button
                  type="button"
                  onClick={() => setIsMembersModalOpen(true)}
                  className="inline-flex items-center gap-1.5 bg-white/5 hover:bg-white/15 border border-white/10 rounded-xl px-3 py-1.5 backdrop-blur-sm transition cursor-pointer"
                  title="Klik untuk melihat kode undangan"
                >
                  <ShareNetwork size={14} className="text-emerald-400 shrink-0" />
                  <span>Kode: <strong className="font-mono text-white">{trip.invite_code}</strong></span>
                </button>
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
              onClick={() => {
                if (canEdit) {
                  setIsEditModalOpen(true);
                } else {
                  setIsMembersModalOpen(true);
                }
              }}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  if (canEdit) setIsEditModalOpen(true);
                  else setIsMembersModalOpen(true);
                }
              }}
              className="group relative h-32 sm:h-44 lg:h-52 w-full rounded-2xl overflow-hidden bg-white/5 border border-white/20 shadow-xl transition-all duration-300 hover:border-emerald-400/50 hover:shadow-emerald-950/40 hover:scale-[1.01] cursor-pointer focus:outline-hidden focus:ring-2 focus:ring-emerald-400"
            >
              {trip.cover_url ? (
                <>
                  <img
                    src={trip.cover_url}
                    alt={`Sampul ${trip.title}`}
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  {/* Subtle Inner Gradient Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

                  {/* Bottom Action Pill on Thumbnail */}
                  <div className="absolute bottom-2.5 left-2.5 right-2.5 flex items-center justify-between text-xs text-white">
                    <span className="text-[11px] font-medium text-stone-200 drop-shadow-md truncate">
                      Foto Sampul
                    </span>
                    {canEdit && (
                      <span className="inline-flex items-center gap-1 rounded-lg bg-black/60 px-2.5 py-1 text-[10px] font-semibold text-emerald-300 backdrop-blur-md border border-white/10 group-hover:bg-emerald-600 group-hover:text-white transition">
                        <Camera size={12} weight="bold" />
                        <span>Ganti Foto</span>
                      </span>
                    )}
                  </div>

                  {/* Hover Overlay Hint for Desktop */}
                  <div className="absolute inset-0 bg-brand-950/60 opacity-0 group-hover:opacity-100 transition-opacity duration-200 hidden lg:flex flex-col items-center justify-center gap-1.5 backdrop-blur-xs">
                    <span className="p-2 rounded-full bg-white/20 text-white shadow-md">
                      {canEdit ? (
                        <PencilSimple size={18} weight="bold" />
                      ) : (
                        <Users size={18} weight="bold" />
                      )}
                    </span>
                    <span className="text-xs font-bold text-white tracking-wide">
                      {canEdit ? "Ganti Foto Sampul" : "Lihat Anggota Trip"}
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
                    {canEdit ? "+ Tambah Foto Sampul" : "Foto Belum Diatur"}
                  </p>
                  <p className="text-[11px] text-stone-300/80 mt-0.5">
                    {canEdit ? "Upload foto kenangan atau pilih tema" : "Hanya Host/Editor yang dapat mengubah"}
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

      {/* Join Trip Modal */}
      {isJoinModalOpen && (
        <JoinTripModal
          isOpen={isJoinModalOpen}
          onClose={() => setIsJoinModalOpen(false)}
        />
      )}
    </>
  );
}
