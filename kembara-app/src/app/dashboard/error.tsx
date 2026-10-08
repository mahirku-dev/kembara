"use client";

import { useEffect } from "react";
import { WarningCircle } from "@phosphor-icons/react";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center h-full px-5 text-center py-20">
      <WarningCircle size={48} weight="light" className="text-red-400 mb-4" />
      <h3 className="text-[17px] font-semibold text-stone-700">
        Terjadi Kesalahan
      </h3>
      <p className="mt-2 text-[13px] text-stone-400 max-w-xs leading-relaxed">
        Gagal memuat halaman ini. Silakan coba lagi.
      </p>
      <button
        onClick={reset}
        className="mt-5 rounded-2xl bg-brand-600 px-5 py-2.5 text-[13px] font-semibold text-white shadow-cta transition hover:bg-brand-700"
      >
        Coba Lagi
      </button>
    </div>
  );
}

