"use client";

import { useState } from "react";
import Link from "next/link";
import {
  CheckCircle,
  Circle,
  Sparkle,
  ArrowRight,
  ShieldCheck,
  AirplaneTilt,
  HouseLine,
  SuitcaseRolling,
  FileText,
} from "@phosphor-icons/react";
import type { Trip } from "@/types";

interface PreparationProgressCardProps {
  trip: Trip;
  packingDoneCount?: number;
  packingTotalCount?: number;
  docsCount?: number;
}

interface Milestone {
  id: string;
  label: string;
  defaultChecked?: boolean;
}

export default function PreparationProgressCard({
  trip,
  packingDoneCount = 0,
  packingTotalCount = 0,
  docsCount = 0,
}: PreparationProgressCardProps) {
  // Local togglable milestone state for interactive user checklist
  const [milestones, setMilestones] = useState<Milestone[]>(() => {
    return [
      { id: "tickets", label: "Tiket & Reservasi", defaultChecked: Boolean(trip.destination) },
      { id: "lodging", label: "Akomodasi / Penginapan", defaultChecked: Boolean(trip.start_date) },
      { id: "transport", label: "Transportasi", defaultChecked: false },
      { id: "docs", label: "Dokumen & Berkas", defaultChecked: docsCount > 0 },
      { id: "packing", label: "Perlengkapan & Logistik", defaultChecked: packingTotalCount > 0 && packingDoneCount === packingTotalCount },
    ];
  });

  const [checkedIds, setCheckedIds] = useState<Set<string>>(() => {
    const initial = new Set<string>();
    if (trip.destination) initial.add("tickets");
    if (trip.start_date) initial.add("lodging");
    if (docsCount > 0) initial.add("docs");
    if (packingTotalCount > 0 && packingDoneCount === packingTotalCount) initial.add("packing");
    return initial;
  });

  const toggleMilestone = (id: string) => {
    setCheckedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const progressPercentage = Math.round((checkedIds.size / milestones.length) * 100);

  return (
    <div className="rounded-3xl bg-white/70 backdrop-blur-xl border border-white/80 p-5 sm:p-6 shadow-panel space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="grid h-8 w-8 place-items-center rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200/50 shadow-xs shrink-0">
            <ShieldCheck size={18} weight="fill" />
          </span>
          <div>
            <h3 className="text-[15px] font-bold text-stone-900 leading-tight">
              Persiapan Perjalanan
            </h3>
            <p className="text-[11.5px] text-stone-500 mt-0.5">
              Kelola kesiapan &amp; checklist sebelum perjalanan
            </p>
          </div>
        </div>

        <Link
          href={`/dashboard/vault?tripId=${trip.id}`}
          className="group inline-flex items-center gap-1 text-xs font-semibold text-brand-600 hover:text-brand-700 transition"
        >
          <span>Vault &amp; Checklist</span>
          <ArrowRight
            size={13}
            weight="bold"
            className="transition-transform group-hover:translate-x-0.5"
          />
        </Link>
      </div>

      {/* Progress Bar with Percentage */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs font-semibold">
          <span className="text-stone-600">Status Kesiapan</span>
          <span className="text-emerald-700 font-bold">{progressPercentage}% Selesai</span>
        </div>
        <div className="w-full h-2 rounded-full bg-stone-100 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full transition-all duration-500 ease-out"
            style={{ width: `${Math.max(5, progressPercentage)}%` }}
          />
        </div>
      </div>

      {/* Compact Milestone Checklist Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1">
        {milestones.map((m) => {
          const isDone = checkedIds.has(m.id);
          return (
            <button
              key={m.id}
              type="button"
              onClick={() => toggleMilestone(m.id)}
              className={`flex items-center gap-2 rounded-xl p-2 sm:px-2.5 text-left text-xs transition border ${
                isDone
                  ? "bg-emerald-50/60 border-emerald-200/70 text-emerald-900 font-medium"
                  : "bg-stone-50/70 hover:bg-stone-100 border-stone-200/60 text-stone-600"
              }`}
            >
              {isDone ? (
                <CheckCircle size={15} weight="fill" className="text-emerald-600 shrink-0" />
              ) : (
                <Circle size={15} className="text-stone-400 shrink-0" />
              )}
              <span className="truncate">{m.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

