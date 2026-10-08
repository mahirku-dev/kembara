"use client";

import { useState } from "react";
import Link from "next/link";
import { Users, ListBullets, SuitcaseRolling, ArrowRight } from "@phosphor-icons/react";
import type { Trip } from "@/types";
import TripMembersModal from "@/components/TripMembersModal";

interface QuickInfoSummaryProps {
  trip: Trip;
  membersCount: number;
  placesCount: number;
  docsCount: number;
  currentUserId?: string;
  onOpenMembers?: () => void;
}

export default function QuickInfoSummary({
  trip,
  membersCount,
  placesCount,
  docsCount,
  currentUserId,
  onOpenMembers,
}: QuickInfoSummaryProps) {
  const [isMembersModalOpen, setIsMembersModalOpen] = useState(false);

  const handleOpenMembers = () => {
    if (onOpenMembers) {
      onOpenMembers();
    } else {
      setIsMembersModalOpen(true);
    }
  };

  return (
    <>
      <div className="grid grid-cols-3 gap-2.5 sm:gap-3.5">
        {/* 1. Anggota Card */}
        <button
          type="button"
          onClick={handleOpenMembers}
          className="group flex flex-col items-start justify-between rounded-2xl bg-white/70 hover:bg-white/95 backdrop-blur-xl border border-white/80 p-3 sm:p-4 text-left shadow-xs hover:shadow-md transition-all active:scale-[0.98] min-h-[72px]"
        >
          <div className="flex items-center justify-between w-full">
            <span className="grid h-7 w-7 place-items-center rounded-xl bg-amber-50 text-amber-600 border border-amber-200/50 group-hover:scale-105 transition shrink-0">
              <Users size={16} weight="fill" />
            </span>
            <ArrowRight
              size={13}
              className="text-stone-300 group-hover:text-stone-600 group-hover:translate-x-0.5 transition"
            />
          </div>
          <div className="mt-2">
            <p className="text-sm sm:text-base font-bold text-stone-900 leading-tight">
              {membersCount} <span className="text-xs font-normal text-stone-500">Anggota</span>
            </p>
          </div>
        </button>

        {/* 2. Agenda Card */}
        <Link
          href={`/dashboard/itinerary?tripId=${trip.id}`}
          className="group flex flex-col items-start justify-between rounded-2xl bg-white/70 hover:bg-white/95 backdrop-blur-xl border border-white/80 p-3 sm:p-4 text-left shadow-xs hover:shadow-md transition-all active:scale-[0.98] min-h-[72px]"
        >
          <div className="flex items-center justify-between w-full">
            <span className="grid h-7 w-7 place-items-center rounded-xl bg-brand-50 text-brand-600 border border-brand-200/50 group-hover:scale-105 transition shrink-0">
              <ListBullets size={16} weight="bold" />
            </span>
            <ArrowRight
              size={13}
              className="text-stone-300 group-hover:text-stone-600 group-hover:translate-x-0.5 transition"
            />
          </div>
          <div className="mt-2">
            <p className="text-sm sm:text-base font-bold text-stone-900 leading-tight">
              {placesCount} <span className="text-xs font-normal text-stone-500">Agenda</span>
            </p>
          </div>
        </Link>

        {/* 3. Dokumen Card */}
        <Link
          href={`/dashboard/vault?tripId=${trip.id}`}
          className="group flex flex-col items-start justify-between rounded-2xl bg-white/70 hover:bg-white/95 backdrop-blur-xl border border-white/80 p-3 sm:p-4 text-left shadow-xs hover:shadow-md transition-all active:scale-[0.98] min-h-[72px]"
        >
          <div className="flex items-center justify-between w-full">
            <span className="grid h-7 w-7 place-items-center rounded-xl bg-blue-50 text-blue-600 border border-blue-200/50 group-hover:scale-105 transition shrink-0">
              <SuitcaseRolling size={16} weight="fill" />
            </span>
            <ArrowRight
              size={13}
              className="text-stone-300 group-hover:text-stone-600 group-hover:translate-x-0.5 transition"
            />
          </div>
          <div className="mt-2">
            <p className="text-sm sm:text-base font-bold text-stone-900 leading-tight">
              {docsCount} <span className="text-xs font-normal text-stone-500">Berkas</span>
            </p>
          </div>
        </Link>
      </div>

      {/* Trip Members Modal */}
      {isMembersModalOpen && (
        <TripMembersModal
          trip={trip}
          isOpen={isMembersModalOpen}
          onClose={() => setIsMembersModalOpen(false)}
          currentUserId={currentUserId}
        />
      )}
    </>
  );
}
