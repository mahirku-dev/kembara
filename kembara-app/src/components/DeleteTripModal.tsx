"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";
import { Warning, CircleNotch, Trash, X } from "@phosphor-icons/react";
import type { Trip } from "@/types";

interface DeleteTripModalProps {
  trip: Trip;
  isOpen: boolean;
  onClose: () => void;
  onDeleted?: () => void;
}

export default function DeleteTripModal({
  trip,
  isOpen,
  onClose,
  onDeleted,
}: DeleteTripModalProps) {
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleDelete = async () => {
    setLoading(true);
    setError(null);

    try {
      const supabase = createClient();
      const { error: delErr } = await supabase
        .from("trips")
        .delete()
        .eq("id", trip.id);

      if (delErr) {
        throw new Error(delErr.message || "Gagal menghapus perjalanan.");
      }

      onClose();
      if (onDeleted) {
        onDeleted();
      } else {
        router.push("/dashboard");
        router.refresh();
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Terjadi kesalahan.";
      setError(msg);
      setLoading(false);
    }
  };

  if (!isOpen || !mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] overflow-y-auto bg-stone-900/50 backdrop-blur-sm p-4 sm:p-6 flex items-start sm:items-center justify-center animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-md my-8 sm:my-auto rounded-3xl bg-white/95 backdrop-blur-2xl border border-white/60 p-6 shadow-2xl transition-all flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-3 border-b border-stone-100">
          <div className="flex items-center gap-2.5 text-red-600">
            <span className="p-2 rounded-xl bg-red-50">
              <Warning size={20} weight="fill" />
            </span>
            <h3 className="text-base font-bold text-stone-900">Hapus Perjalanan?</h3>
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

        <div className="mt-4 space-y-3">
          <p className="text-sm text-stone-600 leading-relaxed">
            Apakah Anda yakin ingin menghapus perjalanan{" "}
            <span className="font-semibold text-stone-900">&ldquo;{trip.title}&rdquo;</span>?
          </p>
          <div className="rounded-2xl bg-amber-50/80 border border-amber-200/80 p-3 text-xs text-amber-800 space-y-1">
            <p className="font-semibold">⚠️ Tindakan ini permanen:</p>
            <p>Seluruh agenda itinerary, catatan pengeluaran, dan daftar packing di trip ini akan terhapus.</p>
          </div>
        </div>

        {error && (
          <div className="mt-3 rounded-2xl bg-red-50 border border-red-200 px-3.5 py-2.5 text-xs text-red-600">
            {error}
          </div>
        )}

        <div className="mt-6 flex items-center justify-end gap-3 pt-3 border-t border-stone-100">
          <button
            type="button"
            disabled={loading}
            onClick={onClose}
            className="rounded-2xl px-4 py-2.5 text-xs font-medium text-stone-600 hover:bg-stone-100 disabled:opacity-50 transition"
          >
            Batal
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={handleDelete}
            className="inline-flex items-center gap-2 rounded-2xl bg-red-600 px-5 py-2.5 text-xs font-semibold text-white shadow-md hover:bg-red-700 active:scale-95 disabled:opacity-50 transition"
          >
            {loading ? (
              <>
                <CircleNotch size={14} className="animate-spin" />
                Menghapus...
              </>
            ) : (
              <>
                <Trash size={14} weight="bold" />
                Ya, Hapus Perjalanan
              </>
            )}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

