"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";
import { X, CalendarBlank, MapPin, CurrencyDollar, CircleNotch, PencilSimple } from "@phosphor-icons/react";
import type { Trip } from "@/types";
import TripCoverPicker from "./TripCoverPicker";

interface EditTripModalProps {
  trip: Trip;
  isOpen: boolean;
  onClose: () => void;
}

export default function EditTripModal({ trip, isOpen, onClose }: EditTripModalProps) {
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState(trip.title);
  const [destination, setDestination] = useState(trip.destination || "");
  const [startDate, setStartDate] = useState(trip.start_date || "");
  const [endDate, setEndDate] = useState(trip.end_date || "");
  const [totalBudget, setTotalBudget] = useState(trip.total_budget?.toString() || "");
  const [coverUrl, setCoverUrl] = useState(trip.cover_url || "");

  const router = useRouter();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isOpen) {
      setTitle(trip.title);
      setDestination(trip.destination || "");
      setStartDate(trip.start_date || "");
      setEndDate(trip.end_date || "");
      setTotalBudget(trip.total_budget ? trip.total_budget.toString() : "");
      setCoverUrl(trip.cover_url || "");
      setError(null);
    }
  }, [isOpen, trip]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError("Judul perjalanan wajib diisi.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const supabase = createClient();
      const budgetNum = totalBudget ? Number(totalBudget.replace(/\D/g, "")) : 0;

      const { error: updateErr } = await supabase
        .from("trips")
        .update({
          title: title.trim(),
          destination: destination.trim() || null,
          start_date: startDate || null,
          end_date: endDate || null,
          total_budget: budgetNum,
          cover_url: coverUrl.trim() || null,
        })
        .eq("id", trip.id);

      if (updateErr) {
        throw new Error(updateErr.message || "Gagal memperbarui perjalanan.");
      }

      onClose();
      router.refresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Terjadi kesalahan.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] overflow-y-auto bg-stone-900/50 backdrop-blur-sm p-4 sm:p-6 flex items-start sm:items-center justify-center animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-lg my-8 sm:my-auto rounded-3xl bg-white/95 backdrop-blur-2xl border border-white/60 p-6 shadow-2xl transition-all max-h-[88vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-stone-100 shrink-0">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-brand-50 text-brand-700">
              <PencilSimple size={18} weight="bold" />
            </span>
            <div>
              <h3 className="text-lg font-bold text-stone-900">Edit Info Perjalanan</h3>
              <p className="text-xs text-stone-500">Perbarui tanggal, nama, atau budget perjalanan</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="grid h-8 w-8 place-items-center rounded-full text-stone-400 hover:bg-stone-100 hover:text-stone-700 transition"
          >
            <X size={18} weight="bold" />
          </button>
        </div>

        {error && (
          <div className="mt-4 rounded-2xl bg-red-50 border border-red-200 px-4 py-3 text-xs text-red-600 shrink-0">
            {error}
          </div>
        )}

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="mt-4 flex flex-col flex-1 overflow-hidden">
          <div className="space-y-4 overflow-y-auto pr-1 pb-1 flex-1 hide-scroll">
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Nama Perjalanan <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="Contoh: Umrah 9 Hari Ramadhan"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full rounded-2xl border border-stone-200 bg-white/80 px-4 py-2.5 text-sm text-stone-900 placeholder:text-stone-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Destinasi
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-3 text-stone-400">
                  <MapPin size={16} />
                </span>
                <input
                  type="text"
                  placeholder="Contoh: Makkah & Madinah"
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                  className="w-full rounded-2xl border border-stone-200 bg-white/80 pl-10 pr-4 py-2.5 text-sm text-stone-900 placeholder:text-stone-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Tanggal Mulai
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-3 text-stone-400 pointer-events-none">
                    <CalendarBlank size={16} />
                  </span>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full rounded-2xl border border-stone-200 bg-white/80 pl-9 pr-3 py-2 text-sm text-stone-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Tanggal Selesai
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-3 text-stone-400 pointer-events-none">
                    <CalendarBlank size={16} />
                  </span>
                  <input
                    type="date"
                    value={endDate}
                    min={startDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full rounded-2xl border border-stone-200 bg-white/80 pl-9 pr-3 py-2 text-sm text-stone-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Target Total Budget (IDR)
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-3 text-stone-400">
                  <CurrencyDollar size={16} />
                </span>
                <input
                  type="number"
                  min="0"
                  step="50000"
                  placeholder="Contoh: 35000000"
                  value={totalBudget}
                  onChange={(e) => setTotalBudget(e.target.value)}
                  className="w-full rounded-2xl border border-stone-200 bg-white/80 pl-10 pr-4 py-2.5 text-sm text-stone-900 placeholder:text-stone-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
                />
              </div>
            </div>

            {/* Trip Cover / Thumbnail Picker */}
            <div className="pt-1">
              <TripCoverPicker coverUrl={coverUrl} onChange={setCoverUrl} />
            </div>
          </div>

          {/* Actions Footer */}
          <div className="mt-5 pt-4 border-t border-stone-100 flex items-center justify-end gap-3 shrink-0">
            <button
              type="button"
              disabled={loading}
              onClick={onClose}
              className="rounded-2xl px-4 py-2.5 text-xs font-medium text-stone-600 hover:bg-stone-100 disabled:opacity-50 transition"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-2xl bg-brand-600 px-6 py-2.5 text-xs font-semibold text-white shadow-cta transition hover:bg-brand-700 active:scale-95 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <CircleNotch size={14} className="animate-spin" />
                  Menyimpan...
                </>
              ) : (
                "Simpan Perubahan"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}

