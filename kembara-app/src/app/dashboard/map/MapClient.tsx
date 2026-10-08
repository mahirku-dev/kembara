"use client";

import dynamic from "next/dynamic";
import { CircleNotch } from "@phosphor-icons/react";
import type { Place, Trip } from "@/types";

export interface AgendaPlace extends Place {
  day_number?: number;
  day_date?: string | null;
}

const InteractiveMap = dynamic(() => import("./InteractiveMap"), {
  ssr: false,
  loading: () => (
    <div className="flex flex-1 items-center justify-center h-full min-h-[400px]">
      <div className="flex flex-col items-center gap-2 text-stone-400">
        <CircleNotch size={28} className="animate-spin text-brand-500" />
        <span className="text-xs">Memuat peta interaktif...</span>
      </div>
    </div>
  ),
});

interface MapClientProps {
  trip: Trip | null;
  places: AgendaPlace[];
}

export default function MapClient({ trip, places }: MapClientProps) {
  return <InteractiveMap trip={trip} places={places} />;
}

