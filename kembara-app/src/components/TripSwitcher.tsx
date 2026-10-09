"use client";

import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import {
  CaretDown,
  Check,
  AirplaneTilt,
  Plus,
  PencilSimple,
  Trash,
  CalendarBlank,
  MapPin,
  SuitcaseRolling,
  Users,
  Key,
  Crown,
  X,
} from "@phosphor-icons/react";
import type { Trip } from "@/types";
import CreateTripModal from "@/app/dashboard/CreateTripModal";
import EditTripModal from "@/components/EditTripModal";
import DeleteTripModal from "@/components/DeleteTripModal";
import TripMembersModal from "@/components/TripMembersModal";
import JoinTripModal from "@/components/JoinTripModal";

interface TripSwitcherProps {
  trips: Trip[];
  activeTrip: Trip | null;
  className?: string;
  showCreateButton?: boolean;
  currentUserId?: string;
}

export default function TripSwitcher({
  trips,
  activeTrip,
  className = "",
  showCreateButton = true,
  currentUserId,
}: TripSwitcherProps) {
  const [mounted, setMounted] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [editingTrip, setEditingTrip] = useState<Trip | null>(null);
  const [deletingTrip, setDeletingTrip] = useState<Trip | null>(null);
  const [managingMembersTrip, setManagingMembersTrip] = useState<Trip | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Check if URL has joinCode or code query param to open Join modal automatically
  useEffect(() => {
    const joinCode = searchParams?.get("joinCode") || searchParams?.get("code");
    if (joinCode) {
      setShowJoinModal(true);
    }
  }, [searchParams]);

  // Handle escape key and body scroll lock
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setIsOpen(false);
    }

    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  const handleSelectTrip = (tripId: string) => {
    setIsOpen(false);
    const params = new URLSearchParams(searchParams ? searchParams.toString() : "");
    params.set("tripId", tripId);
    router.push(`${pathname}?${params.toString()}`);
    router.refresh();
  };

  const formatDateRange = (start: string | null, end: string | null) => {
    if (!start && !end) return "Waktu belum diatur";
    const opt: Intl.DateTimeFormatOptions = { day: "numeric", month: "short", year: "numeric" };
    const s = start ? new Date(start).toLocaleDateString("id-ID", opt) : "—";
    const e = end ? new Date(end).toLocaleDateString("id-ID", opt) : "—";
    return `${s} – ${e}`;
  };

  if (!activeTrip && trips.length === 0) {
    return (
      <div className="flex items-center gap-2">
        <CreateTripModal buttonText="Buat Perjalanan" variant="primary" />
        <button
          onClick={() => setShowJoinModal(true)}
          className="inline-flex items-center gap-1.5 rounded-2xl bg-white border border-stone-200 hover:bg-stone-50 px-3.5 py-2 text-xs font-semibold text-stone-700 shadow-xs transition active:scale-95"
        >
          <Key size={14} weight="bold" className="text-brand-600" />
          <span>Gabung dengan Kode</span>
        </button>
        {showJoinModal && (
          <JoinTripModal
            isOpen={showJoinModal}
            onClose={() => setShowJoinModal(false)}
          />
        )}
      </div>
    );
  }

  return (
    <div className={`relative inline-block text-left ${className}`}>
      {/* Enhanced Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        aria-label="Pilih Perjalanan Aktif"
        className="group inline-flex items-center gap-2 rounded-2xl bg-white/90 hover:bg-white border border-stone-200/90 px-3 py-1.5 sm:py-2 text-left shadow-xs transition-all backdrop-blur-md active:scale-95 hover:border-brand-400 min-h-[44px]"
      >
        {activeTrip?.cover_url ? (
          <div className="h-8 w-8 rounded-xl overflow-hidden border border-stone-200 shadow-xs shrink-0 group-hover:scale-105 transition">
            <img
              src={activeTrip.cover_url}
              alt={activeTrip.title}
              className="h-full w-full object-cover"
            />
          </div>
        ) : (
          <span className="grid h-8 w-8 place-items-center rounded-xl bg-brand-600 text-white shadow-xs group-hover:scale-105 transition shrink-0">
            <SuitcaseRolling size={17} weight="fill" />
          </span>
        )}
        <div className="flex flex-col min-w-0 pr-1 text-left">
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] uppercase font-bold tracking-wider text-brand-600">
              Perjalanan Saya
            </span>
            {trips.length > 1 && (
              <span className="rounded-full bg-brand-100 text-brand-700 font-bold px-1.5 py-0.2 text-[9px]">
                {trips.length}
              </span>
            )}
          </div>
          <span className="text-xs sm:text-[13px] font-bold text-stone-900 truncate max-w-[170px] sm:max-w-[260px] leading-tight">
            {activeTrip ? activeTrip.title : "Pilih Perjalanan"}
          </span>
        </div>
        <CaretDown
          size={14}
          weight="bold"
          className={`text-stone-400 group-hover:text-stone-700 transition-transform duration-200 ml-0.5 ${
            isOpen ? "rotate-180 text-brand-600" : ""
          }`}
        />
      </button>

      {/* Bottom Sheet on Mobile, Modal on Desktop */}
      {mounted &&
        isOpen &&
        createPortal(
          <div
            className="fixed inset-0 z-[100000] flex items-end sm:items-center justify-center bg-stone-950/65 backdrop-blur-xs p-0 sm:p-4 animate-in fade-in duration-200"
            onClick={() => setIsOpen(false)}
          >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="trip-switcher-title"
            onClick={(e) => e.stopPropagation()}
            className="w-full sm:max-w-lg bg-white rounded-t-[2rem] sm:rounded-3xl shadow-2xl border border-stone-200/80 p-5 sm:p-6 text-stone-800 animate-in slide-in-from-bottom-6 sm:zoom-in-95 duration-200 pb-[calc(env(safe-area-inset-bottom)+1.5rem)] sm:pb-6 max-h-[90vh] flex flex-col"
          >
            {/* Mobile Sheet Handle */}
            <div className="mx-auto w-12 h-1.5 rounded-full bg-stone-300 mb-3 sm:hidden shrink-0" />

            {/* Sheet Header */}
            <div className="flex items-center justify-between pb-3.5 border-b border-stone-100 shrink-0">
              <div className="flex items-center gap-2.5">
                <span className="grid h-9 w-9 place-items-center rounded-xl bg-brand-50 text-brand-700 border border-brand-200/50 shadow-xs">
                  <AirplaneTilt size={18} weight="duotone" />
                </span>
                <div>
                  <h3 id="trip-switcher-title" className="text-base font-bold text-stone-900 leading-tight">
                    Perjalanan Saya
                  </h3>
                  <p className="text-xs text-stone-500 mt-0.5">
                    Pilih perjalanan aktif atau kelola perjalanan
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                aria-label="Tutup"
                className="grid h-8 w-8 place-items-center rounded-full text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition"
              >
                <X size={18} weight="bold" />
              </button>
            </div>

            {/* Trips List Container */}
            <div className="flex-1 overflow-y-auto py-3 space-y-2.5 hide-scroll">
              {trips.map((t) => {
                const isCurrent = activeTrip?.id === t.id;
                const isHost =
                  t.current_user_role === "host" ||
                  t.current_user_role === "owner" ||
                  (currentUserId && t.user_id === currentUserId);

                return (
                  <div
                    key={t.id}
                    className={`group relative flex items-center justify-between rounded-2xl p-3 transition-all duration-150 ${
                      isCurrent
                        ? "bg-brand-50/80 border-2 border-brand-500 shadow-sm"
                        : "bg-stone-50/70 hover:bg-stone-100/90 border border-stone-200/70"
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => handleSelectTrip(t.id)}
                      className="flex-1 text-left min-w-0 pr-2 flex items-center gap-3"
                    >
                      {t.cover_url ? (
                        <div className="h-12 w-12 rounded-xl overflow-hidden border border-stone-200 shrink-0 bg-stone-100 shadow-xs">
                          <img
                            src={t.cover_url}
                            alt={t.title}
                            className="h-full w-full object-cover"
                          />
                        </div>
                      ) : (
                        <div className="h-12 w-12 rounded-xl bg-brand-50 text-brand-600 border border-brand-200/60 flex items-center justify-center shrink-0 shadow-xs">
                          <SuitcaseRolling size={22} weight="fill" />
                        </div>
                      )}

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <p
                            className={`text-[13px] font-bold truncate ${
                              isCurrent ? "text-brand-900" : "text-stone-900"
                            }`}
                          >
                            {t.title}
                          </p>
                          {isCurrent && (
                            <span className="inline-flex items-center gap-0.5 rounded-full bg-brand-600 px-2 py-0.5 text-[9px] font-bold text-white uppercase tracking-wider">
                              <Check size={10} weight="bold" /> Aktif
                            </span>
                          )}
                          {isHost ? (
                            <span className="inline-flex items-center gap-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 px-1.5 py-0.2 text-[9.5px] font-bold">
                              <Crown size={10} weight="fill" className="text-amber-500" /> Host
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-0.5 rounded-full bg-stone-200/80 text-stone-700 px-1.5 py-0.2 text-[9.5px] font-semibold">
                              {t.current_user_role === "editor" ? "Editor" : "Member"}
                            </span>
                          )}
                        </div>

                        <div className="mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-[11px] text-stone-500">
                          {t.destination && (
                            <span className="flex items-center gap-1 text-stone-600 font-medium">
                              <MapPin size={12} className="text-brand-600 shrink-0" />
                              <span className="truncate max-w-[140px]">{t.destination}</span>
                            </span>
                          )}
                          <span className="flex items-center gap-1">
                            <CalendarBlank size={12} className="text-stone-400 shrink-0" />
                            <span>{formatDateRange(t.start_date, t.end_date)}</span>
                          </span>
                        </div>
                      </div>
                    </button>

                    {/* Quick Action Icons */}
                    <div className="flex items-center gap-0.5 sm:gap-1 shrink-0">
                      {/* Members Button */}
                      <button
                        type="button"
                        title="Anggota Perjalanan"
                        onClick={(e) => {
                          e.stopPropagation();
                          setIsOpen(false);
                          setManagingMembersTrip(t);
                        }}
                        className="p-1.5 sm:p-2 rounded-xl text-stone-400 hover:text-brand-600 hover:bg-white shadow-xs transition min-h-[36px] min-w-[36px] flex items-center justify-center"
                      >
                        <Users size={16} weight="bold" />
                      </button>

                      {/* Edit Button (Host/Editor only) */}
                      {isHost && (
                        <button
                          type="button"
                          title="Edit Perjalanan"
                          onClick={(e) => {
                            e.stopPropagation();
                            setIsOpen(false);
                            setEditingTrip(t);
                          }}
                          className="p-1.5 sm:p-2 rounded-xl text-stone-400 hover:text-brand-600 hover:bg-white shadow-xs transition min-h-[36px] min-w-[36px] flex items-center justify-center"
                        >
                          <PencilSimple size={16} weight="bold" />
                        </button>
                      )}

                      {/* Delete Button (Host only) */}
                      {isHost && trips.length > 1 && (
                        <button
                          type="button"
                          title="Hapus Perjalanan"
                          onClick={(e) => {
                            e.stopPropagation();
                            setIsOpen(false);
                            setDeletingTrip(t);
                          }}
                          className="p-1.5 sm:p-2 rounded-xl text-stone-400 hover:text-red-600 hover:bg-white shadow-xs transition min-h-[36px] min-w-[36px] flex items-center justify-center"
                        >
                          <Trash size={16} weight="bold" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Bottom Actions Footer */}
            <div className="pt-3 border-t border-stone-100 flex flex-col sm:flex-row gap-2.5 shrink-0">
              {showCreateButton && (
                <button
                  type="button"
                  onClick={() => {
                    setIsOpen(false);
                    setShowCreateModal(true);
                  }}
                  className="flex-1 inline-flex items-center justify-center gap-2 rounded-2xl bg-brand-600 hover:bg-brand-700 py-3 px-4 text-xs font-bold text-white shadow-cta transition active:scale-95 min-h-[44px]"
                >
                  <Plus size={16} weight="bold" />
                  <span>Buat Perjalanan</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  setShowJoinModal(true);
                }}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-stone-100 hover:bg-stone-200/80 border border-stone-200/80 py-3 px-4 text-xs font-semibold text-stone-700 transition active:scale-95 min-h-[44px]"
              >
                <Key size={16} weight="bold" className="text-brand-600" />
                <span>Gabung dengan Kode</span>
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Modal for Creating New Trip */}
      {showCreateModal && (
        <CreateTripModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          hideTriggerButton={true}
        />
      )}

      {/* Modal for Joining Trip with Code */}
      {showJoinModal && (
        <JoinTripModal
          isOpen={showJoinModal}
          onClose={() => setShowJoinModal(false)}
        />
      )}

      {/* Modal for Managing Members & Invite Code */}
      {managingMembersTrip && (
        <TripMembersModal
          trip={managingMembersTrip}
          isOpen={!!managingMembersTrip}
          onClose={() => setManagingMembersTrip(null)}
          currentUserId={currentUserId}
          onMembersUpdated={() => router.refresh()}
        />
      )}

      {/* Modals for Edit and Delete */}
      {editingTrip && (
        <EditTripModal
          trip={editingTrip}
          isOpen={!!editingTrip}
          onClose={() => setEditingTrip(null)}
        />
      )}

      {deletingTrip && (
        <DeleteTripModal
          trip={deletingTrip}
          isOpen={!!deletingTrip}
          onClose={() => setDeletingTrip(null)}
          onDeleted={() => {
            setDeletingTrip(null);
            router.push("/dashboard");
            router.refresh();
          }}
        />
      )}
    </div>
  );
}
