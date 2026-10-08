"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  AirplaneTilt,
  CalendarBlank,
  MapPin,
  CurrencyDollar,
  ListBullets,
  Wallet,
  SuitcaseRolling,
  PencilSimple,
  Trash,
  Check,
  ArrowRight,
  Plus,
} from "@phosphor-icons/react";
import type { Trip } from "@/types";
import { formatMoney } from "@/lib/geo";
import EditTripModal from "@/components/EditTripModal";
import DeleteTripModal from "@/components/DeleteTripModal";
import CreateTripModal from "./CreateTripModal";

interface MyTripsSectionProps {
  trips: Trip[];
  activeTrip: Trip | null;
}

export default function MyTripsSection({ trips, activeTrip }: MyTripsSectionProps) {
  const [editingTrip, setEditingTrip] = useState<Trip | null>(null);
  const [deletingTrip, setDeletingTrip] = useState<Trip | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleSelectTrip = (tripId: string) => {
    const params = new URLSearchParams(searchParams ? searchParams.toString() : "");
    params.set("tripId", tripId);
    router.push(`/dashboard?${params.toString()}`);
    router.refresh();
  };

  const formatDate = (d: string | null) =>
    d
      ? new Date(d).toLocaleDateString("id-ID", {
          day: "numeric",
          month: "short",
          year: "numeric",
        })
      : "—";

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="p-1.5 rounded-xl bg-brand-50 text-brand-700">
            <AirplaneTilt size={18} weight="duotone" />
          </span>
          <div>
            <h3 className="text-base font-bold text-stone-900">Semua Perjalanan Saya</h3>
            <p className="text-xs text-stone-500">
              Total {trips.length} rencana perjalanan tersimpan
            </p>
          </div>
        </div>
        <CreateTripModal buttonText="Tambah Perjalanan" variant="secondary" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {trips.map((t) => {
          const isCurrent = activeTrip?.id === t.id;
          return (
            <div
              key={t.id}
              className={`group relative rounded-3xl p-5 transition-all duration-200 border flex flex-col justify-between ${
                isCurrent
                  ? "bg-white/95 border-brand-300 shadow-md ring-2 ring-brand-400/20"
                  : "bg-white/60 hover:bg-white border-white/80 shadow-glass hover:shadow-md"
              }`}
            >
              {/* Header Info */}
              <div>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-base font-bold text-stone-900 truncate">
                        {t.title}
                      </h4>
                      {isCurrent && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-brand-600 px-2.5 py-0.5 text-[10px] font-bold text-white shadow-xs">
                          <Check size={11} weight="bold" /> Aktif Saat Ini
                        </span>
                      )}
                    </div>

                    <div className="mt-2 space-y-1 text-xs text-stone-500">
                      {t.destination && (
                        <div className="flex items-center gap-1.5 text-stone-600 font-medium">
                          <MapPin size={14} className="text-brand-500 shrink-0" />
                          <span>{t.destination}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-1.5">
                        <CalendarBlank size={14} className="text-stone-400 shrink-0" />
                        <span>
                          {formatDate(t.start_date)} — {formatDate(t.end_date)}
                        </span>
                      </div>
                      {Number(t.total_budget || 0) > 0 && (
                        <div className="flex items-center gap-1.5">
                          <CurrencyDollar size={14} className="text-emerald-500 shrink-0" />
                          <span className="font-semibold text-emerald-700">
                            Budget: {formatMoney(Number(t.total_budget), "IDR")}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions Dropdown / Buttons */}
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      title="Edit Info Perjalanan"
                      onClick={() => setEditingTrip(t)}
                      className="p-2 rounded-xl text-stone-400 hover:text-brand-600 hover:bg-stone-100 transition"
                    >
                      <PencilSimple size={15} weight="bold" />
                    </button>
                    {trips.length > 1 && (
                      <button
                        type="button"
                        title="Hapus Perjalanan"
                        onClick={() => setDeletingTrip(t)}
                        className="p-2 rounded-xl text-stone-400 hover:text-red-600 hover:bg-red-50 transition"
                      >
                        <Trash size={15} weight="bold" />
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Bottom Navigation for This Trip */}
              <div className="mt-5 pt-3.5 border-t border-stone-100 flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => router.push(`/dashboard/itinerary?tripId=${t.id}`)}
                    className="inline-flex items-center gap-1 rounded-xl bg-stone-50 hover:bg-brand-50 px-2.5 py-1.5 text-xs font-medium text-stone-600 hover:text-brand-700 transition"
                    title="Buka Itinerary"
                  >
                    <ListBullets size={13} weight="bold" />
                    Itinerary
                  </button>
                  <button
                    type="button"
                    onClick={() => router.push(`/dashboard/budget?tripId=${t.id}`)}
                    className="inline-flex items-center gap-1 rounded-xl bg-stone-50 hover:bg-brand-50 px-2.5 py-1.5 text-xs font-medium text-stone-600 hover:text-brand-700 transition"
                    title="Buka Budget"
                  >
                    <Wallet size={13} weight="bold" />
                    Budget
                  </button>
                  <button
                    type="button"
                    onClick={() => router.push(`/dashboard/vault?tripId=${t.id}`)}
                    className="inline-flex items-center gap-1 rounded-xl bg-stone-50 hover:bg-brand-50 px-2.5 py-1.5 text-xs font-medium text-stone-600 hover:text-brand-700 transition"
                    title="Buka Vault"
                  >
                    <SuitcaseRolling size={13} weight="bold" />
                    Vault
                  </button>
                </div>

                {!isCurrent ? (
                  <button
                    type="button"
                    onClick={() => handleSelectTrip(t.id)}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-brand-50 hover:bg-brand-100 px-3 py-1.5 text-xs font-bold text-brand-700 transition active:scale-95"
                  >
                    Buka Trip
                    <ArrowRight size={12} weight="bold" />
                  </button>
                ) : (
                  <span className="text-[11px] font-medium text-brand-600">
                    Perjalanan Aktif
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

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

