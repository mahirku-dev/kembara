"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { CalendarPlus, CaretRight, Plus } from "@phosphor-icons/react";
import type { Trip } from "@/types";
import { canEditTrip, isTripHost } from "@/types";
import AddPlaceModal from "./itinerary/AddPlaceModal";

interface TripPlanningCardProps {
  trip: Trip;
  currentUserId?: string;
}

export default function TripPlanningCard({ trip, currentUserId }: TripPlanningCardProps) {
  const router = useRouter();
  const isHost = isTripHost(trip.current_user_role, currentUserId, trip.user_id);
  const canEdit = canEditTrip(trip.current_user_role) || isHost;

  return (
    <div className="rounded-3xl bg-white/70 backdrop-blur-xl border border-white/80 p-4 sm:p-5 shadow-panel transition hover:bg-white/85">
      <div className="flex items-center justify-between gap-3">
        <Link
          href={`/dashboard/itinerary?tripId=${trip.id}`}
          className="flex items-center gap-3 min-w-0 flex-1 group"
        >
          <span className="grid h-10 w-10 place-items-center rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-200/50 shadow-xs shrink-0 group-hover:scale-105 transition">
            <CalendarPlus size={20} weight="fill" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1">
              <h3 className="text-[14px] sm:text-[15px] font-bold text-stone-900 group-hover:text-brand-700 transition truncate">
                Rencana perjalanan
              </h3>
            </div>
            <p className="text-[11px] sm:text-xs text-stone-500 mt-0.5 line-clamp-1">
              Susun agenda ziarah, jadwal ibadah, dan aktivitas harian.
            </p>
          </div>
          <CaretRight
            size={16}
            weight="bold"
            className="text-stone-400 group-hover:text-stone-700 group-hover:translate-x-0.5 transition shrink-0 ml-1"
          />
        </Link>
      </div>

      {canEdit && (
        <div className="mt-2.5 pt-2.5 border-t border-stone-100/80 flex items-center">
          <AddPlaceModal
            tripId={trip.id}
            dayNumber={1}
            onPlaceAdded={() => {
              router.push(`/dashboard/itinerary?tripId=${trip.id}`);
              router.refresh();
            }}
            buttonText="Tambah Agenda"
            buttonVariant="secondary"
            className="text-xs font-semibold text-brand-600 hover:text-brand-700 inline-flex items-center gap-1 transition active:scale-95"
          />
        </div>
      )}
    </div>
  );
}

