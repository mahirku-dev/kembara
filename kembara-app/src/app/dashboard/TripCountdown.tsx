"use client";

import { useEffect, useState } from "react";
import { Hourglass, Sparkle, CheckCircle, CalendarBlank, Clock } from "@phosphor-icons/react";
import type { UpcomingPlace } from "./UpcomingAgendaCard";
import { format, parseISO } from "date-fns";
import { id as idLocale } from "date-fns/locale";

interface TripCountdownProps {
  startDate: string | null;
  endDate: string | null;
  targetAgenda?: UpcomingPlace | null;
  className?: string;
}

interface TimeLeft {
  days: number;
  hours: number;
  status: "agenda" | "future_trip" | "ongoing_trip" | "completed" | "no_date";
  label: string;
  sublabel?: string;
  targetDateFormatted?: string;
}

function computeTargetDate(
  startDate: string | null,
  endDate: string | null,
  targetAgenda?: UpcomingPlace | null
): {
  target: Date | null;
  status: TimeLeft["status"];
  label: string;
  sublabel?: string;
  targetDateFormatted?: string;
} {
  const now = new Date();

  // 1. Target next upcoming agenda if available
  if (targetAgenda) {
    let dateStr = targetAgenda.day_date;
    if (!dateStr && startDate) {
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
        let formattedStr = timeStr;
        try {
          formattedStr = `${format(parseISO(dateStr), "d MMMM yyyy", { locale: idLocale })} · ${timeStr}`;
        } catch {}

        return {
          target: agendaDate,
          status: "agenda",
          label: targetAgenda.name,
          sublabel: `Hari ${targetAgenda.day_number || 1}`,
          targetDateFormatted: formattedStr,
        };
      }
    }
  }

  // 2. Future trip countdown to start date
  if (startDate) {
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    const end = endDate ? new Date(endDate) : new Date(startDate);
    end.setHours(23, 59, 59, 999);

    const diffToStart = start.getTime() - now.getTime();
    const diffToEnd = end.getTime() - now.getTime();

    let formattedDate = "";
    try {
      formattedDate = format(parseISO(startDate), "d MMMM yyyy", { locale: idLocale });
    } catch {}

    if (diffToStart > 0) {
      return {
        target: start,
        status: "future_trip",
        label: "Menuju keberangkatan",
        targetDateFormatted: formattedDate,
      };
    } else if (diffToEnd >= 0) {
      return {
        target: end,
        status: "ongoing_trip",
        label: "Perjalanan sedang berlangsung",
        sublabel: "Pantau agenda harian Anda",
      };
    } else {
      return {
        target: null,
        status: "completed",
        label: "Perjalanan selesai",
      };
    }
  }

  return {
    target: null,
    status: "no_date",
    label: "Belum ada jadwal",
  };
}

function calculateTimeLeft(
  startDate: string | null,
  endDate: string | null,
  targetAgenda?: UpcomingPlace | null
): TimeLeft {
  const { target, status, label, sublabel, targetDateFormatted } = computeTargetDate(
    startDate,
    endDate,
    targetAgenda
  );

  if (!target) {
    return { days: 0, hours: 0, status, label, sublabel, targetDateFormatted };
  }

  const now = new Date();
  const diff = target.getTime() - now.getTime();

  if (diff <= 0) {
    return {
      days: 0,
      hours: 0,
      status: status === "agenda" ? "ongoing_trip" : status,
      label,
      sublabel,
      targetDateFormatted,
    };
  }

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);

  return { days, hours, status, label, sublabel, targetDateFormatted };
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
    // Update every minute (no flickering seconds)
    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft(startDate, endDate, targetAgenda));
    }, 60000);

    return () => clearInterval(timer);
  }, [startDate, endDate, targetAgenda]);

  if (!mounted) {
    return null;
  }

  if (timeLeft.status === "no_date") {
    return null;
  }

  if (timeLeft.status === "completed") {
    return (
      <div className={`inline-flex items-center gap-2 text-xs text-emerald-300 ${className}`}>
        <CheckCircle size={15} weight="fill" className="text-emerald-400 shrink-0" />
        <span>Perjalanan telah selesai</span>
      </div>
    );
  }

  if (timeLeft.status === "ongoing_trip") {
    return (
      <div className={`inline-flex items-center gap-2 text-xs text-amber-300 font-medium ${className}`}>
        <Sparkle size={15} weight="fill" className="text-amber-400 shrink-0 animate-pulse" />
        <span>Perjalanan sedang berlangsung</span>
      </div>
    );
  }

  // Future trip / Agenda countdown in clean modern single-row / compact typography
  return (
    <div className={`flex items-baseline gap-2.5 flex-wrap ${className}`}>
      <span className="text-xl sm:text-2xl font-black text-emerald-300 tracking-tight">
        {timeLeft.days > 0 ? `${timeLeft.days} hari lagi` : `${timeLeft.hours} jam lagi`}
      </span>
      <span className="text-xs text-stone-300/90 font-medium flex items-center gap-1.5">
        <span>•</span>
        <span>{timeLeft.label}</span>
        {timeLeft.targetDateFormatted && (
          <span className="text-stone-400 hidden sm:inline">({timeLeft.targetDateFormatted})</span>
        )}
      </span>
    </div>
  );
}
