"use client";

import { useEffect, useState } from "react";
import { Hourglass, Sparkle, CheckCircle, CalendarBlank, MapPin, Clock } from "@phosphor-icons/react";
import type { UpcomingPlace } from "./UpcomingAgendaCard";

interface TripCountdownProps {
  startDate: string | null;
  endDate: string | null;
  targetAgenda?: UpcomingPlace | null;
  className?: string;
}

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  status: "agenda" | "future_trip" | "ongoing_trip" | "completed" | "no_date";
  label: string;
  sublabel?: string;
}

function computeTargetDate(
  startDate: string | null,
  endDate: string | null,
  targetAgenda?: UpcomingPlace | null
): { target: Date | null; status: TimeLeft["status"]; label: string; sublabel?: string } {
  const now = new Date();

  // 1. If there is a target agenda, calculate target timestamp to its start_time
  if (targetAgenda) {
    let dateStr = targetAgenda.day_date;
    if (!dateStr && startDate) {
      // Calculate date from trip startDate + (day_number - 1)
      const s = new Date(startDate);
      s.setDate(s.getDate() + Math.max(0, (targetAgenda.day_number || 1) - 1));
      dateStr = s.toISOString().split("T")[0];
    }

    if (dateStr) {
      const timeStr = targetAgenda.start_time || "08:00";
      const [h, m] = timeStr.split(":").map((v) => parseInt(v, 10) || 0);
      const agendaDate = new Date(dateStr);
      agendaDate.setHours(h, m, 0, 0);

      const diff = agendaDate.getTime() - now.getTime();
      if (diff > 0) {
        return {
          target: agendaDate,
          status: "agenda",
          label: `Menuju: ${targetAgenda.name}`,
          sublabel: `Hari ${targetAgenda.day_number || 1} • ${timeStr}`,
        };
      }
    }
  }

  // 2. Fallback to trip start date if in the future
  if (startDate) {
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    const end = endDate ? new Date(endDate) : new Date(startDate);
    end.setHours(23, 59, 59, 999);

    const diffToStart = start.getTime() - now.getTime();
    const diffToEnd = end.getTime() - now.getTime();

    if (diffToStart > 0) {
      return {
        target: start,
        status: "future_trip",
        label: "Menuju Keberangkatan Trip",
      };
    } else if (diffToEnd >= 0) {
      return {
        target: end,
        status: "ongoing_trip",
        label: "Perjalanan Sedang Berlangsung",
        sublabel: "Pantau agenda harian Anda",
      };
    } else {
      return {
        target: null,
        status: "completed",
        label: "Perjalanan Selesai",
      };
    }
  }

  return {
    target: null,
    status: "no_date",
    label: "Belum Ada Jadwal",
  };
}

function calculateTimeLeft(
  startDate: string | null,
  endDate: string | null,
  targetAgenda?: UpcomingPlace | null
): TimeLeft {
  const { target, status, label, sublabel } = computeTargetDate(
    startDate,
    endDate,
    targetAgenda
  );

  if (!target) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, status, label, sublabel };
  }

  const now = new Date();
  const diff = target.getTime() - now.getTime();

  if (diff <= 0) {
    return {
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 0,
      status: status === "agenda" ? "ongoing_trip" : status,
      label,
      sublabel,
    };
  }

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
  const minutes = Math.floor((diff / (1000 * 60)) % 60);
  const seconds = Math.floor((diff / 1000) % 60);

  return { days, hours, minutes, seconds, status, label, sublabel };
}

export default function TripCountdown({
  startDate,
  endDate,
  targetAgenda,
  className = "",
}: TripCountdownProps) {
  const [mounted, setMounted] = useState(false);
  const [timeLeft, setTimeLeft] = useState<TimeLeft>(() =>
    calculateTimeLeft(startDate, endDate, targetAgenda)
  );

  useEffect(() => {
    setMounted(true);
    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft(startDate, endDate, targetAgenda));
    }, 1000);

    return () => clearInterval(timer);
  }, [startDate, endDate, targetAgenda]);

  if (!mounted) {
    return (
      <div className={`grid grid-cols-4 gap-2 ${className}`}>
        {["HARI", "JAM", "MENIT", "DETIK"].map((l) => (
          <div
            key={l}
            className="flex flex-col items-center justify-center rounded-2xl bg-white/10 backdrop-blur-md border border-white/15 px-3 py-2 text-center"
          >
            <span className="text-xl md:text-2xl font-black font-mono text-white tracking-wider">
              --
            </span>
            <span className="text-[9px] font-bold text-emerald-200/80 uppercase tracking-wider mt-0.5">
              {l}
            </span>
          </div>
        ))}
      </div>
    );
  }

  if (timeLeft.status === "no_date") {
    return (
      <div className="inline-flex items-center gap-2 rounded-2xl bg-white/10 px-4 py-2.5 text-xs font-semibold text-white/90 backdrop-blur-md border border-white/15">
        <CalendarBlank size={16} className="text-emerald-300" />
        <span>Atur jadwal agenda atau tanggal keberangkatan untuk hitung mundur</span>
      </div>
    );
  }

  if (timeLeft.status === "completed") {
    return (
      <div className="inline-flex items-center gap-2 rounded-2xl bg-emerald-500/20 px-4 py-2.5 text-xs font-semibold text-emerald-200 backdrop-blur-md border border-emerald-400/30">
        <CheckCircle size={16} weight="fill" className="text-emerald-300" />
        <span>Perjalanan telah selesai dilaksanakan</span>
      </div>
    );
  }

  const pad = (n: number) => String(Math.max(0, n)).padStart(2, "0");

  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      {/* Dynamic Status Header */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {timeLeft.status === "agenda" ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-400/25 px-3 py-1 text-[11px] font-bold text-emerald-200 backdrop-blur-sm border border-emerald-400/30 shadow-sm">
            <Clock size={13} weight="fill" className="text-emerald-300 animate-spin" />
            <span className="truncate max-w-[220px]">{timeLeft.label}</span>
            {timeLeft.sublabel && (
              <span className="opacity-75 font-normal text-[10px]">({timeLeft.sublabel})</span>
            )}
          </span>
        ) : timeLeft.status === "ongoing_trip" ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-400/25 px-3 py-1 text-[11px] font-bold text-amber-200 uppercase tracking-wider backdrop-blur-sm border border-amber-300/30 animate-pulse">
            <Sparkle size={13} weight="fill" />
            Perjalanan Sedang Berlangsung
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-400/20 px-3 py-1 text-[11px] font-bold text-emerald-300 uppercase tracking-wider backdrop-blur-sm border border-emerald-400/30">
            <Hourglass size={13} weight="fill" />
            Menuju Keberangkatan Trip
          </span>
        )}
      </div>

      {/* Live Countdown Numbers Box Grid */}
      <div className="grid grid-cols-4 gap-2 max-w-sm">
        <div className="group relative overflow-hidden flex flex-col items-center justify-center rounded-2xl bg-white/15 hover:bg-white/20 backdrop-blur-md border border-white/20 px-2.5 py-2 text-center transition shadow-sm">
          <span className="text-xl md:text-2xl font-black font-mono text-white tracking-tight drop-shadow-sm">
            {pad(timeLeft.days)}
          </span>
          <span className="text-[9px] font-bold text-emerald-200/90 uppercase tracking-wider mt-0.5">
            Hari
          </span>
        </div>

        <div className="group relative overflow-hidden flex flex-col items-center justify-center rounded-2xl bg-white/15 hover:bg-white/20 backdrop-blur-md border border-white/20 px-2.5 py-2 text-center transition shadow-sm">
          <span className="text-xl md:text-2xl font-black font-mono text-white tracking-tight drop-shadow-sm">
            {pad(timeLeft.hours)}
          </span>
          <span className="text-[9px] font-bold text-emerald-200/90 uppercase tracking-wider mt-0.5">
            Jam
          </span>
        </div>

        <div className="group relative overflow-hidden flex flex-col items-center justify-center rounded-2xl bg-white/15 hover:bg-white/20 backdrop-blur-md border border-white/20 px-2.5 py-2 text-center transition shadow-sm">
          <span className="text-xl md:text-2xl font-black font-mono text-white tracking-tight drop-shadow-sm">
            {pad(timeLeft.minutes)}
          </span>
          <span className="text-[9px] font-bold text-emerald-200/90 uppercase tracking-wider mt-0.5">
            Menit
          </span>
        </div>

        <div className="group relative overflow-hidden flex flex-col items-center justify-center rounded-2xl bg-white/15 hover:bg-white/20 backdrop-blur-md border border-white/20 px-2.5 py-2 text-center transition shadow-sm">
          <span className="text-xl md:text-2xl font-black font-mono text-emerald-300 tracking-tight drop-shadow-sm animate-pulse">
            {pad(timeLeft.seconds)}
          </span>
          <span className="text-[9px] font-bold text-emerald-200/90 uppercase tracking-wider mt-0.5">
            Detik
          </span>
        </div>
      </div>
    </div>
  );
}
