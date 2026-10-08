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
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="grid h-8 w-8 place-items-center rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200/50 shadow-xs shrink-0">
            <ShieldCheck size={18} weight="fill" />
          </span>
          <div className="min-w-0">
            <h3 className="text-[15px] font-bold text-stone-900 leading-tight truncate">
              Persiapan &amp; Checklist
            </h3>
            <p className="text-[11.5px] text-stone-500 mt-0.5 truncate">
              Perlengkapan &amp; dokumen dari Vault
            </p>
          </div>
        </div>

        <Link
          href={`/dashboard/vault?tripId=${trip.id}`}
          className="group inline-flex items-center gap-1 text-xs font-semibold text-brand-600 hover:text-brand-700 transition shrink-0"
        >
          <span>Vault</span>
          <ArrowRight
            size={13}
            weight="bold"
            className="transition-transform group-hover:translate-x-0.5"
          />
        </Link>
      </div>

      {/* Progress Bar with Dynamic Stats */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs font-semibold">
          <span className="text-stone-600">Status Kesiapan</span>
          <span className="text-emerald-700 font-bold">
            {totalCount > 0
              ? `${doneCount}/${totalCount} Selesai (${progressPercentage}%)`
              : "0% Selesai"}
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

      {/* Unchecked Items List / Empty State */}
      {totalCount === 0 ? (
        <div className="rounded-2xl border border-dashed border-stone-200 bg-stone-50/50 p-4 text-center space-y-2">
          <p className="text-xs text-stone-500 font-medium">
            Belum ada checklist persiapan di Vault
          </p>
          <Link
            href={`/dashboard/vault?tripId=${trip.id}`}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-600 hover:text-brand-700 bg-brand-50 hover:bg-brand-100/80 px-3 py-1.5 rounded-xl border border-brand-200/60 transition"
          >
            <Plus size={13} weight="bold" />
            <span>Tambah di Vault</span>
          </Link>
        </div>
      ) : uncheckedItems.length === 0 ? (
        <div className="flex items-center gap-2.5 rounded-2xl bg-emerald-50/70 border border-emerald-200/60 p-3.5 text-xs text-emerald-800 font-medium">
          <CheckCircle size={20} weight="fill" className="text-emerald-600 shrink-0" />
          <p>Semua item persiapan ({totalCount} item) telah selesai diperiksa!</p>
        </div>
      ) : (
        <div className="space-y-2 pt-0.5">
          <p className="text-[11px] font-semibold text-stone-400 uppercase tracking-wider">
            Belum Disiapkan ({uncheckedItems.length})
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {uncheckedItems.slice(0, 4).map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => handleCheckItem(item)}
                disabled={checkingId === item.id}
                className="group flex items-center justify-between gap-2.5 rounded-xl p-2.5 text-left text-xs bg-stone-50/80 hover:bg-emerald-50/50 border border-stone-200/70 hover:border-emerald-300/70 transition active:scale-[0.99]"
                title="Klik untuk tandai selesai"
              >
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <div className="grid h-5 w-5 place-items-center rounded-full border border-stone-300 group-hover:border-emerald-500 group-hover:bg-emerald-50 transition shrink-0">
                    <Circle
                      size={14}
                      className="text-stone-300 group-hover:text-emerald-500"
                    />
                  </div>
                  <span className="truncate font-medium text-stone-700 group-hover:text-stone-900">
                    {item.item_name}
                  </span>
                </div>
                {item.category && (
                  <span className="text-[10px] font-medium text-stone-500 bg-white px-1.5 py-0.5 rounded-md border border-stone-200/60 shrink-0 truncate max-w-[90px]">
                    {item.category}
                  </span>
                )}
              </button>
            ))}
          </div>

          {uncheckedItems.length > 4 && (
            <div className="text-center pt-1">
              <Link
                href={`/dashboard/vault?tripId=${trip.id}`}
                className="inline-flex items-center gap-1 text-[11.5px] font-semibold text-brand-600 hover:text-brand-700"
              >
                <span>+{uncheckedItems.length - 4} item lainnya di Vault</span>
                <ArrowRight size={11} weight="bold" />
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
