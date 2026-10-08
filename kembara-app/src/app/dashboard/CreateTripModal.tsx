"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";
import { Plus, X, CalendarBlank, MapPin, CurrencyDollar, CircleNotch } from "@phosphor-icons/react";
import { differenceInDays, addDays, format, parseISO } from "date-fns";
import TripCoverPicker from "@/components/TripCoverPicker";

interface CreateTripModalProps {
  buttonText?: string;
  variant?: "primary" | "secondary";
  isOpen?: boolean;
  onClose?: () => void;
  hideTriggerButton?: boolean;
}

export default function CreateTripModal({
  buttonText = "+ Buat Perjalanan",
  variant = "primary",
  isOpen: controlledIsOpen,
  onClose: controlledOnClose,
  hideTriggerButton = false,
}: CreateTripModalProps) {
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  const isOpen = controlledIsOpen !== undefined ? controlledIsOpen : internalIsOpen;

  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [destination, setDestination] = useState("Makkah & Madinah");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [totalBudget, setTotalBudget] = useState("");
  const [coverUrl, setCoverUrl] = useState("");

  const router = useRouter();

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleOpen = () => {
    setError(null);
    if (controlledIsOpen === undefined) {
      setInternalIsOpen(true);
    }
  };

  const handleClose = () => {
    if (loading) return;
    if (controlledOnClose) {
      controlledOnClose();
    }
    setInternalIsOpen(false);
  };

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
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setError("Sesi login telah berakhir. Silakan login kembali.");
        setLoading(false);
        return;
      }

      const budgetNum = totalBudget ? Number(totalBudget.replace(/\D/g, "")) : 0;

      // 1. Insert Trip
      const { data: trip, error: tripErr } = await supabase
        .from("trips")
        .insert({
          user_id: user.id,
          title: title.trim(),
          destination: destination.trim() || null,
          start_date: startDate || null,
          end_date: endDate || null,
          total_budget: budgetNum,
          cover_url: coverUrl.trim() || null,
        })
        .select()
        .single();

      if (tripErr || !trip) {
        throw new Error(tripErr?.message || "Gagal membuat perjalanan.");
      }

      // 2. Insert Trip Member (Owner)
      await supabase.from("trip_members").insert({
        trip_id: trip.id,
        user_id: user.id,
        name: user.user_metadata?.full_name || user.email?.split("@")[0] || "Owner",
        role: "owner",
        avatar_url: user.user_metadata?.avatar_url || null,
      });

      // 3. Automatically generate Itinerary Days if dates are provided
      if (startDate && endDate) {
        const start = parseISO(startDate);
        const end = parseISO(endDate);
        const diff = differenceInDays(end, start);
        const totalDays = Math.max(1, diff + 1);

        const daysToInsert = Array.from({ length: totalDays }, (_, i) => {
          const currentDate = addDays(start, i);
          return {
            trip_id: trip.id,
            day_number: i + 1,
            date: format(currentDate, "yyyy-MM-dd"),
            notes: `Hari ${i + 1} - Perjalanan ${destination || "Ibadah"}`,
          };
        });

        await supabase.from("itinerary_days").insert(daysToInsert);
      } else {
        // Create 1 default day
        await supabase.from("itinerary_days").insert({
          trip_id: trip.id,
          day_number: 1,
          date: startDate || null,
          notes: "Hari 1 - Persiapan & Keberangkatan",
        });
      }

      handleClose();
      setTitle("");
      setStartDate("");
      setEndDate("");
      setTotalBudget("");
      router.push(`/dashboard?tripId=${trip.id}`);
      router.refresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Terjadi kesalahan.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const modalContent = isOpen && mounted ? (
    <div className="fixed inset-0 z-[100000] overflow-y-auto bg-stone-900/50 backdrop-blur-sm p-4 sm:p-6 flex items-start sm:items-center justify-center animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-lg my-8 sm:my-auto rounded-3xl bg-white/95 backdrop-blur-2xl border border-white/60 p-6 shadow-2xl transition-all max-h-[88vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-stone-100 shrink-0">
          <div>
            <h3 className="text-lg font-bold text-stone-900">Buat Perjalanan Baru</h3>
            <p className="text-xs text-stone-500">Rencanakan agenda spiritual dan personal Anda</p>
          </div>
          <button
            type="button"
            onClick={handleClose}
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
                placeholder="Contoh: Umrah 9 Hari Musim Gugur"
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
              onClick={handleClose}
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
                "Simpan & Mulai Rencana"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  ) : null;

  return (
    <>
      {!hideTriggerButton && (
        <button
          type="button"
          onClick={handleOpen}
          className={
            variant === "primary"
              ? "inline-flex items-center gap-2 rounded-2xl bg-brand-600 px-5 py-2.5 text-[13px] font-semibold text-white shadow-cta transition hover:bg-brand-700 active:scale-95"
              : "inline-flex items-center gap-2 rounded-2xl bg-white/70 border border-white/80 px-4 py-2 text-[13px] font-medium text-brand-700 shadow-glass transition hover:bg-white active:scale-95"
          }
        >
          <Plus size={16} weight="bold" />
          {buttonText}
        </button>
      )}

      {mounted && modalContent && createPortal(modalContent, document.body)}
    </>
  );
}
