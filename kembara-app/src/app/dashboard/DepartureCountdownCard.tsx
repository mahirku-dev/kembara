"use client";

import { useEffect, useState } from "react";
import type { Trip } from "@/types";
import { format, parseISO, differenceInDays, differenceInHours } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { CalendarBlank, Sparkle, CheckCircle, Clock } from "@phosphor-icons/react";

interface DepartureCountdownCardProps {
  trip: Trip;
}

export default function DepartureCountdownCard({ trip }: DepartureCountdownCardProps) {
  const [mounted, setMounted] = useState(false);
  const [now, setNow] = useState<Date>(() => new Date());

  useEffect(() => {
    setMounted(true);
    // Update every minute
    const timer = setInterval(() => {
      setNow(new Date());
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  if (!mounted) {
    // SSR skeleton placeholder with same height to prevent layout shift
    return (
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#1b3d22] via-[#16361d] to-[#0f2714] text-white p-5 sm:p-6 shadow-md min-h-[140px] animate-pulse" />
    );
  }

  // Calculate status and countdown from real trip data
  let daysDiff = 0;
  let hoursDiff = 0;
  let status: "future" | "today" | "ongoing" | "past" | "no_date" = "no_date";
  let formattedDepartureDate = "";

  if (trip.start_date) {
    try {
      const startDate = parseISO(trip.start_date);
      formattedDepartureDate = format(startDate, "d MMMM yyyy", { locale: idLocale });

      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);

      const end = trip.end_date ? parseISO(trip.end_date) : new Date(startDate);
      end.setHours(23, 59, 59, 999);

      const todayStart = new Date(now);
      todayStart.setHours(0, 0, 0, 0);

      if (todayStart.getTime() < start.getTime()) {
        status = "future";
        // Calculate full days difference
        daysDiff = differenceInDays(start, todayStart);
        if (daysDiff === 0) {
          hoursDiff = Math.max(1, differenceInHours(start, now));
        }
      } else if (now.getTime() <= end.getTime()) {
        if (todayStart.getTime() === start.getTime()) {
          status = "today";
        } else {
          status = "ongoing";
          daysDiff = differenceInDays(todayStart, start) + 1;
        }
      } else {
        status = "past";
      }
    } catch {
      status = "no_date";
    }
  }

  return (
    <div className="group relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#1d4527] via-[#16381e] to-[#0d2313] text-white p-5 sm:p-6 shadow-lg border border-emerald-500/20 transition-all duration-300">
      {/* Background Subtle Kaaba & Ambient Glow Illustration */}
      <div className="absolute right-0 top-0 bottom-0 w-1/2 sm:w-2/5 pointer-events-none opacity-25 overflow-hidden flex items-center justify-end">
        {trip.cover_url ? (
          <img
            src={trip.cover_url}
            alt=""
            aria-hidden="true"
            className="h-full w-full object-cover object-center filter blur-xs mask-image-radial"
          />
        ) : (
          <div className="relative w-full h-full flex items-center justify-end pr-2 sm:pr-4">
            {/* Architectural dome / Kaaba silhouette visual */}
            <svg
              viewBox="0 0 160 160"
              className="h-36 w-36 text-emerald-300/40 fill-current"
              xmlns="http://www.w3.org/2000/svg"
            >
              <rect x="50" y="55" width="60" height="65" rx="4" fill="currentColor" fillOpacity="0.4" />
              <rect x="50" y="70" width="60" height="6" fill="#fbbf24" fillOpacity="0.8" />
              <path d="M40 120 L120 120 L110 135 L50 135 Z" fill="currentColor" fillOpacity="0.25" />
              {/* Subtle Minaret silhouette */}
              <rect x="22" y="30" width="10" height="90" rx="2" fill="currentColor" fillOpacity="0.3" />
              <polygon points="27,15 22,30 32,30" fill="currentColor" fillOpacity="0.4" />
              <rect x="128" y="30" width="10" height="90" rx="2" fill="currentColor" fillOpacity="0.3" />
              <polygon points="133,15 128,30 138,30" fill="currentColor" fillOpacity="0.4" />
            </svg>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-l from-transparent via-[#16381e]/60 to-[#16381e]" />
      </div>

      {/* Main Content */}
      <div className="relative z-10 space-y-2">
        {/* Top Tag */}
        <div className="flex items-center gap-1.5">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 backdrop-blur-md px-2.5 py-0.5 text-[10.5px] font-bold tracking-wider uppercase text-emerald-200 border border-white/10">
            <CalendarBlank size={12} weight="bold" />
            <span>HITUNG MUNDUR</span>
          </span>
        </div>

        {/* Big Number / Status text */}
        <div>
          {status === "future" && (
            <div className="space-y-0.5">
              <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight leading-tight">
                {daysDiff > 0 ? `${daysDiff} hari lagi` : `${hoursDiff} jam lagi`}
              </h2>
              <p className="text-xs sm:text-[13px] text-emerald-200/90 font-medium">
                Keberangkatan {formattedDepartureDate || "segera"}
              </p>
            </div>
          )}

          {status === "today" && (
            <div className="space-y-0.5">
              <h2 className="text-2xl sm:text-3xl font-extrabold text-amber-300 tracking-tight leading-tight flex items-center gap-2">
                <Sparkle size={24} weight="fill" className="text-amber-300 animate-pulse" />
                <span>Hari Keberangkatan!</span>
              </h2>
              <p className="text-xs sm:text-[13px] text-emerald-100 font-medium">
                Bismillah, semoga perjalanan {trip.title} lancar &amp; mabrur.
              </p>
            </div>
          )}

          {status === "ongoing" && (
            <div className="space-y-0.5">
              <h2 className="text-2xl sm:text-3xl font-extrabold text-emerald-200 tracking-tight leading-tight">
                Hari ke-{daysDiff} Perjalanan
              </h2>
              <p className="text-xs sm:text-[13px] text-emerald-100/90 font-medium">
                Perjalanan sedang berlangsung &bull; Pantau agenda harian Anda
              </p>
            </div>
          )}

          {status === "past" && (
            <div className="space-y-0.5">
              <h2 className="text-xl sm:text-2xl font-bold text-emerald-200 tracking-tight leading-tight flex items-center gap-2">
                <CheckCircle size={22} weight="fill" className="text-emerald-300" />
                <span>Perjalanan Telah Selesai</span>
              </h2>
              <p className="text-xs text-emerald-200/80 font-medium">
                Alhamdulillah, kenangan {trip.title} tersimpan di Kembara.
              </p>
            </div>
          )}

          {status === "no_date" && (
            <div className="space-y-0.5">
              <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight leading-tight">
                Jadwal Belum Diatur
              </h2>
              <p className="text-xs text-emerald-200/80 font-medium">
                Atur tanggal keberangkatan melalui menu edit perjalanan.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

