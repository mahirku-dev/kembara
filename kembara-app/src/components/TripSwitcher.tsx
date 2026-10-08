"use client";

import { useState, useRef, useEffect } from "react";
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
  Sparkle,
} from "@phosphor-icons/react";
import type { Trip } from "@/types";
import CreateTripModal from "@/app/dashboard/CreateTripModal";
import EditTripModal from "@/components/EditTripModal";
import DeleteTripModal from "@/components/DeleteTripModal";

interface TripSwitcherProps {
  trips: Trip[];
  activeTrip: Trip | null;
  className?: string;
  showCreateButton?: boolean;
}

export default function TripSwitcher({
  trips,
  activeTrip,
  className = "",
  showCreateButton = true,
}: TripSwitcherProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingTrip, setEditingTrip] = useState<Trip | null>(null);
  const [deletingTrip, setDeletingTrip] = useState<Trip | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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
    return <CreateTripModal buttonText="Buat Perjalanan" variant="primary" />;
  }

  return (
    <div className={`relative inline-block text-left ${className}`} ref={dropdownRef}>
      {/* Enhanced Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="group inline-flex items-center gap-2.5 rounded-2xl bg-white/85 hover:bg-white border border-stone-200/90 px-3 py-1.5 sm:py-2 text-left shadow-xs transition-all backdrop-blur-md active:scale-95 hover:border-brand-300"
      >
        {activeTrip?.cover_url ? (
          <div className="h-8 w-8 rounded-xl overflow-hidden border border-brand-200 shadow-xs shrink-0 group-hover:scale-105 transition">
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
          <span className="text-xs font-bold text-stone-900 truncate max-w-[130px] sm:max-w-[200px] leading-tight">
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

      {/* Enhanced Dropdown Menu */}
      {isOpen && (
        <div className="absolute left-0 sm:right-0 sm:left-auto mt-2 w-80 sm:w-96 origin-top-right rounded-3xl bg-white/95 backdrop-blur-2xl border border-white/80 shadow-2xl ring-1 ring-black/5 z-[10000] p-2.5 animate-in fade-in zoom-in-95 duration-150">
          {/* Dropdown Header */}
          <div className="px-3 py-2 border-b border-stone-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="p-1 rounded-lg bg-brand-50 text-brand-700">
                <AirplaneTilt size={16} weight="duotone" />
              </span>
              <div>
                <p className="text-xs font-bold text-stone-900">Perjalanan Saya</p>
                <p className="text-[11px] text-stone-400">
                  Pilih perjalanan aktif atau kelola rencana
                </p>
              </div>
            </div>
            <span className="rounded-full bg-stone-100 text-stone-600 font-semibold px-2 py-0.5 text-[10.5px]">
              {trips.length} Trip
            </span>
          </div>

          {/* Trips List */}
          <div className="max-h-72 overflow-y-auto py-1.5 space-y-1.5 hide-scroll">
            {trips.map((t) => {
              const isCurrent = activeTrip?.id === t.id;
              return (
                <div
                  key={t.id}
                  className={`group relative flex items-center justify-between rounded-2xl p-2.5 transition-all duration-150 ${
                    isCurrent
                      ? "bg-brand-50/90 border border-brand-300/80 shadow-xs ring-1 ring-brand-300/40"
                      : "bg-white hover:bg-stone-50 border border-stone-100 hover:border-stone-200"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => handleSelectTrip(t.id)}
                    className="flex-1 text-left min-w-0 pr-2 flex items-center gap-2.5"
                  >
                    {t.cover_url ? (
                      <div className="h-10 w-10 rounded-xl overflow-hidden border border-stone-200 shrink-0 bg-stone-100">
                        <img
                          src={t.cover_url}
                          alt={t.title}
                          className="h-full w-full object-cover"
                        />
                      </div>
                    ) : (
                      <div className="h-10 w-10 rounded-xl bg-brand-50 text-brand-600 border border-brand-200/50 flex items-center justify-center shrink-0">
                        <SuitcaseRolling size={18} weight="fill" />
                      </div>
                    )}

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <p
                          className={`text-xs font-bold truncate ${
                            isCurrent ? "text-brand-900" : "text-stone-800 group-hover:text-brand-700"
                          }`}
                        >
                          {t.title}
                        </p>
                        {isCurrent && (
                          <span className="inline-flex items-center gap-0.5 rounded-full bg-brand-600 px-2 py-0.5 text-[9px] font-bold text-white uppercase tracking-wider">
                            <Check size={9} weight="bold" /> Aktif
                          </span>
                        )}
                      </div>

                      <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10.5px] text-stone-400">
                        {t.destination && (
                          <span className="flex items-center gap-1 text-stone-500 font-medium">
                            <MapPin size={11} className="text-brand-500" />
                            {t.destination}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <CalendarBlank size={11} className="text-stone-400" />
                          {formatDateRange(t.start_date, t.end_date)}
                        </span>
                      </div>
                    </div>
                  </button>

                  {/* Quick Action Icons */}
                  <div className="flex items-center gap-1 opacity-70 group-hover:opacity-100 shrink-0">
                    <button
                      type="button"
                      title="Edit Info Perjalanan"
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsOpen(false);
                        setEditingTrip(t);
                      }}
                      className="p-1.5 rounded-xl text-stone-400 hover:text-brand-600 hover:bg-white shadow-xs transition"
                    >
                      <PencilSimple size={14} weight="bold" />
                    </button>
                    {trips.length > 1 && (
                      <button
                        type="button"
                        title="Hapus Perjalanan"
                        onClick={(e) => {
                          e.stopPropagation();
                          setIsOpen(false);
                          setDeletingTrip(t);
                        }}
                        className="p-1.5 rounded-xl text-stone-400 hover:text-red-600 hover:bg-white shadow-xs transition"
                      >
                        <Trash size={14} weight="bold" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Dropdown Footer: Add Trip Action */}
          {showCreateButton && (
            <div className="pt-2 border-t border-stone-100">
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  setShowCreateModal(true);
                }}
                className="w-full inline-flex items-center justify-center gap-2 rounded-2xl bg-brand-600 px-4 py-2.5 text-[13px] font-semibold text-white shadow-cta transition hover:bg-brand-700 active:scale-95"
              >
                <Plus size={16} weight="bold" />
                <span>+ Tambah Perjalanan Baru</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* Modal for Creating New Trip */}
      {showCreateModal && (
        <CreateTripModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          hideTriggerButton={true}
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
