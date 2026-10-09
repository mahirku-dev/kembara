"use client";

import { useState, useCallback, useEffect } from "react";
import Link from "next/link";
import {
  CheckCircle,
  Circle,
  ArrowRight,
  ShieldCheck,
  Plus,
} from "@phosphor-icons/react";
import type { PackingItem, Trip } from "@/types";
import { createClient } from "@/utils/supabase/client";

interface PreparationProgressCardProps {
  trip: Trip;
  initialPackingItems?: PackingItem[];
}

export default function PreparationProgressCard({
  trip,
  initialPackingItems = [],
}: PreparationProgressCardProps) {
  const [items, setItems] = useState<PackingItem[]>(initialPackingItems);
  const [checkingId, setCheckingId] = useState<string | null>(null);

  useEffect(() => {
    setItems(initialPackingItems);
  }, [initialPackingItems]);

  const totalCount = items.length;
  const doneCount = items.filter((i) => i.is_checked).length;
  const progressPercentage =
    totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;

  // Unchecked items to do
  const uncheckedItems = items.filter((i) => !i.is_checked);

  // Toggle item from checklist on the card
  const handleCheckItem = useCallback(
    async (item: PackingItem) => {
      setCheckingId(item.id);

      // Optimistic update: mark as checked
      setItems((prev) =>
        prev.map((i) => (i.id === item.id ? { ...i, is_checked: true } : i))
      );

      try {
        const supabase = createClient();
        await supabase
          .from("packing_lists")
          .update({ is_checked: true })
          .eq("id", item.id);
      } catch (err) {
        console.error("Gagal memperbarui checklist persiapan:", err);
      } finally {
        setCheckingId(null);
      }
    },
    []
  );

  return (
    <div className="rounded-3xl bg-white/70 backdrop-blur-xl border border-white/80 p-5 sm:p-6 shadow-panel space-y-4">
      {/* Header */}
      <div className="flex items-start gap-3 min-w-0">
        <span className="grid h-10 w-10 place-items-center rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-200/50 shadow-xs shrink-0">
          <ShieldCheck size={20} weight="fill" />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="text-[14px] sm:text-[15px] font-bold text-stone-900 leading-tight">
            Persiapan keberangkatan
          </h3>
          <p className="text-[11px] sm:text-xs text-stone-500 mt-0.5">
            Periksa dokumen, perlengkapan, dan informasi perjalanan.
          </p>
        </div>
      </div>

      {/* Progress Bar with Percentage */}
      <div className="space-y-1.5 pt-1">
        <div className="flex items-center justify-between text-xs font-semibold">
          <span className="text-stone-500 text-[11px]">
            {totalCount > 0
              ? `${doneCount} dari ${totalCount} selesai`
              : "Belum ada item"}
          </span>
          <span className="text-emerald-700 font-bold text-xs">
            {progressPercentage}%
          </span>
        </div>
        <div className="w-full h-2 rounded-full bg-stone-100 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full transition-all duration-500 ease-out"
            style={{
              width: `${Math.max(
                totalCount > 0 && doneCount > 0 ? 5 : 0,
                progressPercentage
              )}%`,
            }}
          />
        </div>
      </div>

      {/* Quick Unchecked Preview (if any) */}
      {uncheckedItems.length > 0 && (
        <div className="space-y-1.5 pt-1">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
            {uncheckedItems.slice(0, 2).map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => handleCheckItem(item)}
                disabled={checkingId === item.id}
                className="group flex items-center justify-between gap-2 rounded-xl p-2 text-left text-xs bg-stone-50/80 hover:bg-emerald-50/50 border border-stone-200/70 hover:border-emerald-300/70 transition active:scale-[0.99]"
                title="Tandai selesai"
              >
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <div className="grid h-4 w-4 place-items-center rounded-full border border-stone-300 group-hover:border-emerald-500 group-hover:bg-emerald-50 transition shrink-0">
                    <Circle size={12} className="text-stone-300 group-hover:text-emerald-500" />
                  </div>
                  <span className="truncate font-medium text-stone-700 text-[11.5px]">
                    {item.item_name}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Primary CTA Button */}
      <div className="pt-1">
        <Link
          href={`/dashboard/vault?tripId=${trip.id}`}
          className="flex h-11 w-full items-center justify-center gap-2 rounded-2xl bg-brand-600 text-[13px] font-bold text-white shadow-cta hover:bg-brand-700 active:scale-95 transition"
        >
          <span>Buka checklist persiapan</span>
          <ArrowRight size={15} weight="bold" />
        </Link>
      </div>
    </div>
  );
}
