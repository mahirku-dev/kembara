"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useRouter, useSearchParams } from "next/navigation";
import {
  X,
  UserPlus,
  ArrowRight,
  CircleNotch,
  CheckCircle,
  Key,
  ShieldCheck,
} from "@phosphor-icons/react";
import { joinTripByCode } from "@/lib/invite";

interface JoinTripModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialCode?: string;
  onJoined?: (tripId: string) => void;
}

export default function JoinTripModal({
  isOpen,
  onClose,
  initialCode = "",
  onJoined,
}: JoinTripModalProps) {
  const [mounted, setMounted] = useState(false);
  const [code, setCode] = useState(initialCode);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successTripId, setSuccessTripId] = useState<string | null>(null);

  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isOpen) {
      const urlCode = searchParams.get("joinCode");
      if (urlCode) {
        setCode(urlCode.toUpperCase());
      } else if (initialCode) {
        setCode(initialCode.toUpperCase());
      }
      setError(null);
      setSuccessTripId(null);
    }
  }, [isOpen, initialCode, searchParams]);

  if (!isOpen || !mounted) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = code.trim().toUpperCase();
    if (!cleanCode) {
      setError("Masukkan kode undangan 6 karakter.");
      return;
    }

    setLoading(true);
    setError(null);

    const res = await joinTripByCode(cleanCode);
    setLoading(false);

    if (res.success && res.tripId) {
      setSuccessTripId(res.tripId);
      onJoined?.(res.tripId);
      setTimeout(() => {
        onClose();
        router.push(`/dashboard?tripId=${res.tripId}`);
        router.refresh();
      }, 1200);
    } else {
      setError(res.error || "Gagal bergabung ke perjalanan.");
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[100000] flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-2xl border border-stone-100 flex flex-col animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-stone-100 px-6 py-4 bg-stone-50/80">
          <div className="flex items-center gap-2.5">
            <span className="grid h-10 w-10 place-items-center rounded-2xl bg-brand-50 text-brand-600 border border-brand-200/60 shadow-xs">
              <UserPlus size={20} weight="fill" />
            </span>
            <div>
              <h3 className="text-base font-bold text-stone-900">
                Gabung Perjalanan
              </h3>
              <p className="text-xs text-stone-500">
                Gunakan kode undangan dari Host
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-2 text-stone-400 hover:bg-stone-200/60 hover:text-stone-700 transition"
          >
            <X size={18} weight="bold" />
          </button>
        </div>

        {/* Content */}
        {successTripId ? (
          <div className="p-8 text-center space-y-3">
            <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 animate-bounce">
              <CheckCircle size={36} weight="fill" />
            </div>
            <h4 className="text-lg font-bold text-stone-900">
              Berhasil Bergabung!
            </h4>
            <p className="text-xs text-stone-500">
              Membuka detail perjalanan Anda...
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-5">
            {error && (
              <div className="rounded-2xl bg-red-50 border border-red-200 p-3 text-xs text-red-600 font-medium">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-stone-600 flex items-center gap-1.5">
                <Key size={14} weight="bold" className="text-brand-600" />
                Kode Undangan (6 Karakter)
              </label>
              <input
                type="text"
                maxLength={8}
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="Contoh: KMB7X9"
                autoFocus
                className="w-full rounded-2xl border-2 border-stone-200 bg-stone-50/60 px-4 py-3 text-center text-2xl font-black font-mono tracking-widest text-brand-900 uppercase placeholder:text-stone-300 placeholder:font-sans placeholder:tracking-normal focus:border-brand-500 focus:bg-white focus:outline-hidden transition shadow-inner"
              />
              <p className="text-[11px] text-stone-400 text-center">
                Minta kode undangan kepada pembuat perjalanan (Host).
              </p>
            </div>

            <div className="rounded-2xl bg-amber-50/70 border border-amber-200/60 p-3 flex items-start gap-2.5 text-[11px] text-amber-800">
              <ShieldCheck size={16} weight="fill" className="shrink-0 text-amber-600 mt-0.5" />
              <span>
                Setelah bergabung, Anda dapat melihat itinerary, rincian anggaran, dan peta perjalanan secara langsung.
              </span>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 rounded-2xl border border-stone-200 px-4 py-2.5 text-xs font-semibold text-stone-600 hover:bg-stone-50 active:scale-95 transition"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={loading || !code.trim()}
                className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-2xl bg-brand-600 hover:bg-brand-700 active:scale-95 px-4 py-2.5 text-xs font-bold text-white shadow-md transition disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <CircleNotch size={15} className="animate-spin" />
                    <span>Memeriksa...</span>
                  </>
                ) : (
                  <>
                    <span>Gabung Sekarang</span>
                    <ArrowRight size={14} weight="bold" />
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>,
    document.body
  );
}

