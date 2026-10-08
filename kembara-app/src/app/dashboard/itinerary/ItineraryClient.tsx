"use client";

import { useState, useCallback, useEffect } from "react";
import { createPortal } from "react-dom";
import { createClient } from "@/utils/supabase/client";
import type { Expense, ItineraryDay, Place, Task, Trip } from "@/types";
import { canEditTrip, isTripHost } from "@/types";
import * as Icons from "@phosphor-icons/react";
import { CATS } from "@/lib/dummyData";
import { clsx } from "clsx";
import { format, parseISO, addDays } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import {
  detectCurrencyFromLocation,
  formatMoney,
  AVAILABLE_CURRENCIES,
  EXPENSE_CATEGORIES,
} from "@/lib/geo";
import AddPlaceModal from "./AddPlaceModal";
import FreeMapLocationPicker, {
  type SelectedLocationResult,
} from "@/components/FreeMapLocationPicker";
import TripSwitcher from "@/components/TripSwitcher";
import UserProfileMenu from "@/components/UserProfileMenu";

// Dynamically resolve Phosphor icon by name
function PhIcon({
  name,
  size = 16,
  weight = "fill",
  className,
}: {
  name: string;
  size?: number;
  weight?: "fill" | "regular" | "light" | "bold";
  className?: string;
}) {
  const iconMap = Icons as unknown as Record<string, Icons.Icon>;
  const IconComp = iconMap[name];
  if (!IconComp) return null;
  return <IconComp size={size} weight={weight} className={className} />;
}

interface DayWithPlaces extends ItineraryDay {
  places: Place[];
}

interface Props {
  trip: Trip;
  days: DayWithPlaces[];
  allTrips?: Trip[];
  user?: any;
}

const getInitialDayIndex = (daysList: DayWithPlaces[]) => {
  if (!daysList || daysList.length === 0) return 0;

  const todayStr = format(new Date(), "yyyy-MM-dd");

  const todayIndex = daysList.findIndex((d) => {
    if (!d.date) return false;
    try {
      const dayDateStr = format(parseISO(d.date), "yyyy-MM-dd");
      return dayDateStr === todayStr;
    } catch {
      return false;
    }
  });

  return todayIndex !== -1 ? todayIndex : 0;
};

function formatTotalExpenses(expenses: Expense[], defaultCurrency = "IDR"): string {
  if (!expenses || expenses.length === 0) return formatMoney(0, defaultCurrency);

  const byCur: Record<string, number> = {};
  expenses.forEach((e) => {
    const c = e.currency || defaultCurrency;
    byCur[c] = (byCur[c] || 0) + Number(e.amount || 0);
  });

  const parts = Object.entries(byCur).map(([cur, total]) => formatMoney(total, cur));
  return parts.join(" + ");
}

const KNOWN_CITIES: { patterns: RegExp[]; name: string }[] = [
  { patterns: [/makkah/i, /mecca/i, /mekkah/i, /mekah/i], name: "Mekkah" },
  { patterns: [/madinah/i, /medina/i], name: "Madinah" },
  { patterns: [/jeddah/i, /jidda/i], name: "Jeddah" },
  { patterns: [/riyadh/i], name: "Riyadh" },
  { patterns: [/taif/i, /thaif/i], name: "Taif" },
  { patterns: [/jakarta/i, /soekarno[- ]hatta/i, /halim/i, /cengkareng/i], name: "Jakarta" },
  { patterns: [/surabaya/i, /juanda/i], name: "Surabaya" },
  { patterns: [/bandung/i, /kertajati/i], name: "Bandung" },
  { patterns: [/yogyakarta/i, /jogja/i, /kulon progo/i, /yia/i], name: "Yogyakarta" },
  { patterns: [/semarang/i, /ahmad yani/i], name: "Semarang" },
  { patterns: [/solo/i, /surakarta/i, /adi soemarmo/i], name: "Solo" },
  { patterns: [/denpasar/i, /bali/i, /ngurah rai/i], name: "Bali" },
  { patterns: [/lombok/i, /mataram/i, /praya/i], name: "Lombok" },
  { patterns: [/medan/i, /kualanamu/i], name: "Medan" },
  { patterns: [/padang/i, /minangkabau/i], name: "Padang" },
  { patterns: [/palembang/i, /sultan mahmud badaruddin/i], name: "Palembang" },
  { patterns: [/makassar/i, /hasanuddin/i], name: "Makassar" },
  { patterns: [/balikpapan/i, /sepinggan/i], name: "Balikpapan" },
  { patterns: [/banjarmasin/i, /syamsudin noor/i], name: "Banjarmasin" },
  { patterns: [/kuala lumpur/i, /klia/i], name: "Kuala Lumpur" },
  { patterns: [/penang/i], name: "Penang" },
  { patterns: [/singapore/i, /singapura/i, /changi/i], name: "Singapore" },
  { patterns: [/bangkok/i, /suvarnabhumi/i, /don mueang/i], name: "Bangkok" },
  { patterns: [/istanbul/i, /sabiha/i], name: "Istanbul" },
  { patterns: [/dubai/i, /dxb/i], name: "Dubai" },
  { patterns: [/abu dhabi/i], name: "Abu Dhabi" },
  { patterns: [/doha/i, /hamad/i], name: "Doha" },
  { patterns: [/cairo/i, /kairo/i], name: "Kairo" },
  { patterns: [/amman/i], name: "Amman" },
  { patterns: [/jerusalem/i, /yerusalem/i, /al-quds/i], name: "Yerusalem" },
  { patterns: [/tokyo/i, /haneda/i, /narita/i], name: "Tokyo" },
  { patterns: [/seoul/i, /incheon/i], name: "Seoul" },
  { patterns: [/london/i, /heathrow/i, /gatwick/i], name: "London" },
  { patterns: [/paris/i, /charles de gaulle/i], name: "Paris" },
];

export function extractCityFromPlace(place: Place): string | null {
  const fullText = `${place.address || ""} ${place.name || ""}`;
  
  // 1. Match against known cities first
  for (const city of KNOWN_CITIES) {
    if (city.patterns.some((p) => p.test(fullText))) {
      return city.name;
    }
  }

  // 2. Parse from address components if available
  if (place.address) {
    const parts = place.address
      .split(",")
      .map((p) => p.trim().replace(/\d+/g, "").trim())
      .filter(
        (p) =>
          p.length > 2 &&
          !/^(indonesia|saudi arabia|malaysia|singapore|thailand|turkey|uae|egypt|jordan|japan|south korea|uk|france)$/i.test(
            p
          )
      );

    if (parts.length > 0) {
      const candidate = parts[parts.length - 1];
      if (candidate && candidate.length <= 25) {
        return candidate;
      }
    }
  }

  return null;
}

export function getDayCitiesRoute(places: Place[]): string {
  if (!places || places.length === 0) return "";
  
  const cities: string[] = [];
  for (const p of places) {
    const city = extractCityFromPlace(p);
    if (city) {
      // Deduplicate consecutive identical cities
      if (cities.length === 0 || cities[cities.length - 1] !== city) {
        cities.push(city);
      }
    }
  }

  return cities.join(" - ");
}

export default function ItineraryClient({
  trip,
  days: initialDays,
  allTrips = [],
  user,
}: Props) {
  const isHost = isTripHost(trip.current_user_role, user?.id, trip.user_id);
  const canEdit = canEditTrip(trip.current_user_role) || isHost;

  const [mounted, setMounted] = useState(false);
  const [days, setDays] = useState<DayWithPlaces[]>(initialDays);
  const [selectedDayIdx, setSelectedDayIdx] = useState<number>(() =>
    getInitialDayIndex(initialDays)
  );
  const [openTasks, setOpenTasks] = useState<Record<string, boolean>>({});
  const [savingTaskId, setSavingTaskId] = useState<string | null>(null);
  const [addingTaskForPlaceId, setAddingTaskForPlaceId] = useState<string | null>(null);
  const [newTaskTitle, setNewTaskTitle] = useState("");

  // Notes state
  const [editingNotePlaceId, setEditingNotePlaceId] = useState<string | null>(null);
  const [noteDraft, setNoteDraft] = useState("");
  const [savingNotePlaceId, setSavingNotePlaceId] = useState<string | null>(null);
  const [noteToDelete, setNoteToDelete] = useState<Place | null>(null);

  // Location edit modal state
  const [locationEditPlace, setLocationEditPlace] = useState<Place | null>(null);

  // Pop-up Detail Pengeluaran Agenda (View all expenses modal)
  const [viewingExpensesPlaceId, setViewingExpensesPlaceId] = useState<string | null>(null);

  // Modal Add / Edit individual expense
  const [expenseModalPlace, setExpenseModalPlace] = useState<Place | null>(null);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [expenseDesc, setExpenseDesc] = useState("");
  const [expenseAmount, setExpenseAmount] = useState("");
  const [expenseCat, setExpenseCat] = useState("food");
  const [expenseCur, setExpenseCur] = useState("IDR");
  const [savingExpense, setSavingExpense] = useState(false);

  // Delete confirmation for an individual expense
  const [expenseToDelete, setExpenseToDelete] = useState<{
    expense: Expense;
    placeId: string;
  } | null>(null);

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((cur) => (cur === msg ? null : cur));
    }, 3500);
  };

  const toggleTask = useCallback((id: string) => {
    setOpenTasks((prev) => ({ ...prev, [id]: !prev[id] }));
  }, []);

  // Update a task checkbox and persist to Supabase
  const handleTaskToggle = useCallback(
    async (place: Place, taskId: string, newDone: boolean) => {
      setSavingTaskId(taskId);

      setDays((prevDays) =>
        prevDays.map((d) => ({
          ...d,
          places: d.places.map((p) => {
            if (p.id !== place.id) return p;
            return {
              ...p,
              tasks_json: (p.tasks_json || []).map((t) =>
                t.id === taskId ? { ...t, done: newDone } : t
              ),
            };
          }),
        }))
      );

      try {
        const supabase = createClient();
        const updatedTasks: Task[] = (place.tasks_json || []).map((t) =>
          t.id === taskId ? { ...t, done: newDone } : t
        );
        await supabase
          .from("places")
          .update({ tasks_json: updatedTasks })
          .eq("id", place.id);
      } catch (err) {
        console.error("Gagal memperbarui task:", err);
      } finally {
        setSavingTaskId(null);
      }
    },
    []
  );

  // Add a new task to a place and persist to Supabase
  const handleAddTask = useCallback(
    async (place: Place) => {
      const title = newTaskTitle.trim();
      if (!title) return;

      const newTask: Task = {
        id: `t_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        title,
        done: false,
      };

      const updatedTasks = [...(place.tasks_json || []), newTask];

      setDays((prevDays) =>
        prevDays.map((d) => ({
          ...d,
          places: d.places.map((p) => {
            if (p.id !== place.id) return p;
            return {
              ...p,
              tasks_json: updatedTasks,
            };
          }),
        }))
      );

      setNewTaskTitle("");
      setAddingTaskForPlaceId(null);

      try {
        const supabase = createClient();
        await supabase
          .from("places")
          .update({ tasks_json: updatedTasks })
          .eq("id", place.id);
      } catch (err) {
        console.error("Gagal menambahkan task:", err);
      }
    },
    [newTaskTitle]
  );

  // Start editing a note for a place
  const handleStartEditNote = (place: Place) => {
    setEditingNotePlaceId(place.id);
    setNoteDraft(place.notes || "");
  };

  // Save a note to Supabase and update state
  const handleSaveNote = async (place: Place) => {
    const text = noteDraft.trim();
    setSavingNotePlaceId(place.id);

    setDays((prevDays) =>
      prevDays.map((d) => ({
        ...d,
        places: d.places.map((p) =>
          p.id === place.id ? { ...p, notes: text || null } : p
        ),
      }))
    );

    setEditingNotePlaceId(null);

    try {
      const supabase = createClient();
      await supabase
        .from("places")
        .update({ notes: text || null })
        .eq("id", place.id);
      showToast(text ? "Catatan agenda berhasil disimpan." : "Catatan dihapus.");
    } catch (err) {
      console.error("Gagal menyimpan catatan agenda:", err);
    } finally {
      setSavingNotePlaceId(null);
    }
  };

  // Confirm delete note handler
  const handleConfirmDeleteNote = async () => {
    if (!noteToDelete) return;
    const place = noteToDelete;

    setDays((prevDays) =>
      prevDays.map((d) => ({
        ...d,
        places: d.places.map((p) =>
          p.id === place.id ? { ...p, notes: null } : p
        ),
      }))
    );

    setNoteToDelete(null);

    try {
      const supabase = createClient();
      await supabase
        .from("places")
        .update({ notes: null })
        .eq("id", place.id);
      showToast("Catatan berhasil dihapus.");
    } catch (err) {
      console.error("Gagal menghapus catatan agenda:", err);
    }
  };

  // Open Expense Form Modal for adding new or editing existing expense
  const handleOpenExpenseModal = (place: Place, existingExp?: Expense) => {
    setExpenseModalPlace(place);
    setEditingExpense(existingExp || null);

    if (existingExp) {
      setExpenseDesc(existingExp.description || "");
      setExpenseAmount(
        existingExp.amount ? existingExp.amount.toString() : ""
      );
      setExpenseCat(existingExp.category || "food");
      setExpenseCur(existingExp.currency || "IDR");
    } else {
      const autoCur = detectCurrencyFromLocation(
        place.lat,
        place.lng,
        place.address
      );
      setExpenseDesc("");
      setExpenseAmount("");
      setExpenseCat("food");
      setExpenseCur(autoCur);
    }
  };

  // Save Expense (Insert / Update)
  const handleSaveExpense = async () => {
    if (!expenseModalPlace) return;
    const place = expenseModalPlace;
    const cleanAmount = Number(expenseAmount.replace(/[^0-9]/g, "")) || 0;
    if (cleanAmount <= 0) {
      alert("Nominal biaya harus lebih dari 0.");
      return;
    }

    setSavingExpense(true);

    try {
      const supabase = createClient();
      const desc =
        expenseDesc.trim() || `Agenda: ${place.name.trim()}`;
      
      let safeDate: string | null = null;
      if (days[selectedDayIdx]?.date) {
        try {
          safeDate = format(parseISO(days[selectedDayIdx].date), "yyyy-MM-dd");
        } catch {
          safeDate = null;
        }
      }

      if (editingExpense) {
        // UPDATE existing expense
        const { data: updated, error } = await supabase
          .from("expenses")
          .update({
            description: desc,
            amount: cleanAmount,
            category: expenseCat,
            currency: expenseCur,
            date: safeDate,
          })
          .eq("id", editingExpense.id)
          .select()
          .single();

        if (error) {
          console.error("Error updating expense:", error.message || error);
          throw new Error(error.message || "Gagal memperbarui pengeluaran.");
        }

        const newExpenses = (place.expenses || []).map((exp) =>
          exp.id === editingExpense.id ? (updated as Expense) : exp
        );
        const totalCost = newExpenses.reduce(
          (sum, e) => sum + Number(e.amount || 0),
          0
        );

        // Update local state
        setDays((prevDays) =>
          prevDays.map((d) => ({
            ...d,
            places: d.places.map((p) =>
              p.id === place.id
                ? { ...p, expenses: newExpenses, cost: totalCost }
                : p
            ),
          }))
        );

        // Update places.cost in DB
        await supabase
          .from("places")
          .update({ cost: totalCost })
          .eq("id", place.id);

        showToast("Pengeluaran berhasil diperbarui.");
      } else {
        // INSERT new expense
        const insertPayload: Record<string, any> = {
          trip_id: trip.id,
          place_id: place.id,
          description: desc,
          amount: cleanAmount,
          category: expenseCat,
          currency: expenseCur,
          date: safeDate,
        };

        let insertedExpense: Expense | null = null;

        const resWithPlaceId = await supabase
          .from("expenses")
          .insert(insertPayload)
          .select()
          .single();

        if (resWithPlaceId.error) {
          console.warn(
            "Insert with place_id failed, trying fallback without place_id:",
            resWithPlaceId.error.message || resWithPlaceId.error
          );
          delete insertPayload.place_id;
          insertPayload.description = desc;

          const fallbackRes = await supabase
            .from("expenses")
            .insert(insertPayload)
            .select()
            .single();

          if (fallbackRes.error) {
            console.error("Fallback insert failed:", fallbackRes.error.message || fallbackRes.error);
            throw new Error(fallbackRes.error.message || "Gagal menyimpan pengeluaran.");
          }
          insertedExpense = fallbackRes.data as Expense;
        } else {
          insertedExpense = resWithPlaceId.data as Expense;
        }

        const newExpenses = [
          ...(place.expenses || []),
          insertedExpense as Expense,
        ];
        const totalCost = newExpenses.reduce(
          (sum, e) => sum + Number(e.amount || 0),
          0
        );

        // Update local state
        setDays((prevDays) =>
          prevDays.map((d) => ({
            ...d,
            places: d.places.map((p) =>
              p.id === place.id
                ? { ...p, expenses: newExpenses, cost: totalCost }
                : p
            ),
          }))
        );

        // Update places.cost in DB
        await supabase
          .from("places")
          .update({ cost: totalCost })
          .eq("id", place.id);

        showToast("Pengeluaran agenda ditambahkan.");
      }

      setExpenseModalPlace(null);
      setEditingExpense(null);
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : (err as any)?.message || "Gagal menyimpan pengeluaran.";
      console.error("Gagal menyimpan pengeluaran agenda:", msg, err);
      showToast(msg);
    } finally {
      setSavingExpense(false);
    }
  };

  // Delete Expense
  const handleConfirmDeleteExpense = async () => {
    if (!expenseToDelete) return;
    const { expense, placeId } = expenseToDelete;

    const currentPlace = days
      .flatMap((d) => d.places)
      .find((p) => p.id === placeId);
    const newExpenses = (currentPlace?.expenses || []).filter(
      (e) => e.id !== expense.id
    );
    const totalCost = newExpenses.reduce(
      (sum, e) => sum + Number(e.amount || 0),
      0
    );

    // Optimistic update in state
    setDays((prevDays) =>
      prevDays.map((d) => ({
        ...d,
        places: d.places.map((p) => {
          if (p.id !== placeId) return p;
          return { ...p, expenses: newExpenses, cost: totalCost };
        }),
      }))
    );

    setExpenseToDelete(null);

    try {
      const supabase = createClient();
      await supabase.from("expenses").delete().eq("id", expense.id);
      await supabase
        .from("places")
        .update({ cost: totalCost })
        .eq("id", placeId);
      showToast("Pengeluaran agenda dihapus.");
    } catch (err) {
      console.error("Gagal menghapus pengeluaran:", err);
      showToast("Gagal menghapus pengeluaran.");
    }
  };

  // Update Place Location from FreeMapLocationPicker
  const handleSavePlaceLocation = async (loc: SelectedLocationResult) => {
    if (!locationEditPlace) return;
    const placeId = locationEditPlace.id;

    setDays((prevDays) =>
      prevDays.map((d) => ({
        ...d,
        places: d.places.map((p) =>
          p.id === placeId
            ? { ...p, address: loc.address, lat: loc.lat, lng: loc.lng }
            : p
        ),
      }))
    );

    setLocationEditPlace(null);

    try {
      const supabase = createClient();
      await supabase
        .from("places")
        .update({
          address: loc.address,
          lat: loc.lat,
          lng: loc.lng,
        })
        .eq("id", placeId);
      showToast(`Lokasi agenda diperbarui (${loc.defaultCurrency}).`);
    } catch (err) {
      console.error("Gagal memperbarui lokasi agenda:", err);
      showToast("Gagal memperbarui lokasi.");
    }
  };

  // Handle adding a new itinerary day
  const handleAddDay = async () => {
    try {
      const supabase = createClient();
      const newDayNumber = days.length + 1;

      let nextDate: string | null = null;
      if (days.length > 0 && days[days.length - 1]?.date) {
        try {
          const lastDate = parseISO(days[days.length - 1].date!);
          nextDate = format(addDays(lastDate, 1), "yyyy-MM-dd");
        } catch {
          nextDate = null;
        }
      } else if (trip.start_date) {
        nextDate = trip.start_date;
      }

      const { data: newDay, error } = await supabase
        .from("itinerary_days")
        .insert({
          trip_id: trip.id,
          day_number: newDayNumber,
          date: nextDate,
          notes: `Hari ${newDayNumber} - Agenda Kegiatan`,
        })
        .select()
        .single();

      if (error || !newDay) {
        throw new Error(error?.message || "Gagal menambahkan hari baru.");
      }

      const dayWithPlaces: DayWithPlaces = {
        ...newDay,
        places: [],
      };

      setDays((prev) => [...prev, dayWithPlaces]);
      setSelectedDayIdx(days.length);
      showToast(`Hari ke-${newDayNumber} berhasil ditambahkan.`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Gagal menambahkan hari.";
      console.error("Gagal menambahkan hari:", err);
      showToast(msg);
    }
  };

  const handlePlaceAdded = useCallback(
    async (newPlace: Place) => {
      // If days is empty or day does not exist in state, fetch the day from DB
      const dayExists = days.some((d) => d.id === newPlace.day_id);
      if (!dayExists) {
        try {
          const supabase = createClient();
          const { data: dayData } = await supabase
            .from("itinerary_days")
            .select("*, places(*)")
            .eq("id", newPlace.day_id)
            .single();

          if (dayData) {
            const newDayWithPlace: DayWithPlaces = {
              ...dayData,
              places: [newPlace],
            };
            setDays((prev) => [...prev, newDayWithPlace]);
            setSelectedDayIdx(days.length);
            showToast("Agenda berhasil ditambahkan.");
            return;
          }
        } catch (err) {
          console.error("Error refreshing day for newly added place:", err);
        }
      }

      setDays((prevDays) =>
        prevDays.map((d) => {
          if (d.id !== newPlace.day_id) return d;
          return {
            ...d,
            places: [...d.places, newPlace],
          };
        })
      );
      showToast("Agenda berhasil ditambahkan.");
    },
    [days]
  );

  const isTodayDay = (day: DayWithPlaces) => {
    if (!day.date) return false;
    try {
      return (
        format(parseISO(day.date), "yyyy-MM-dd") ===
        format(new Date(), "yyyy-MM-dd")
      );
    } catch {
      return false;
    }
  };

  const formatDayLabel = (day: DayWithPlaces, idx: number) => {
    const isToday = isTodayDay(day);
    const dayNum = day.day_number || idx + 1;
    const route = getDayCitiesRoute(day.places);

    let text = `Hari ${dayNum}`;
    if (route) {
      text = `Hari ${dayNum} | ${route}`;
    } else if (day.date) {
      try {
        const dateStr = format(parseISO(day.date), "d MMM", { locale: idLocale });
        text = `Hari ${dayNum} • ${dateStr}`;
      } catch {
        text = `Hari ${dayNum}`;
      }
    }

    return {
      text,
      isToday,
    };
  };

  // If no days yet, show a rich welcoming setup screen with dynamic AddPlaceModal trigger
  if (days.length === 0) {
    return (
      <div className="flex flex-col h-full overflow-y-auto pb-28 lg:pb-10 hide-scroll">
        {/* Toast Notification */}
        {toastMessage && (
          <div className="fixed top-5 right-5 z-[999999] flex items-center gap-2 rounded-2xl bg-stone-900/90 text-white px-4 py-3 text-xs shadow-2xl backdrop-blur-md animate-in fade-in slide-in-from-top-4 duration-300">
            <Icons.CheckCircle size={18} weight="fill" className="text-emerald-400" />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* Sticky Header */}
        <div className="sticky top-0 z-[1100] bg-white/60 backdrop-blur-xl border-b border-white/60 px-5 pt-4 pb-3 lg:px-10">
          <div className="flex items-center justify-between gap-2.5 sm:gap-4 mb-2.5">
            <div className="flex items-center gap-3 min-w-0">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-brand-50 text-brand-600 border border-brand-200/50 shadow-sm shrink-0">
                <Icons.ListBullets size={22} weight="fill" />
              </span>
              <div className="min-w-0">
                <h2 className="text-[18px] sm:text-[20px] font-bold text-brand-700 leading-tight truncate">
                  Itinerary & Agenda
                </h2>
                <p className="text-[12px] text-stone-500 mt-0.5 line-clamp-1 truncate">
                  {`Jadwal kegiatan & ziarah ${trip.destination || trip.title}`}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
              {allTrips && allTrips.length > 0 && (
                <TripSwitcher trips={allTrips} activeTrip={trip} currentUserId={user?.id} />
              )}
              {canEdit ? (
                <AddPlaceModal
                  tripId={trip.id}
                  dayNumber={1}
                  onPlaceAdded={handlePlaceAdded}
                  buttonText="Tambah Agenda"
                />
              ) : (
                <span className="inline-flex items-center gap-1.5 rounded-2xl bg-stone-100 border border-stone-200 px-3 py-1.5 sm:px-3.5 sm:py-2 text-xs font-semibold text-stone-600 shadow-xs">
                  <Icons.Eye size={15} weight="bold" />
                  <span className="hidden sm:inline">Mode Lihat Saja</span>
                </span>
              )}
              {user && <UserProfileMenu user={user} />}
            </div>
          </div>
        </div>

        {/* Empty State Card */}
        <div className="flex flex-col items-center justify-center flex-1 px-5 py-20 text-center">
          <div className="w-full max-w-md rounded-3xl bg-white/80 backdrop-blur-xl border border-white/80 p-8 shadow-panel text-center space-y-4">
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-brand-50 text-brand-600 border border-brand-200/60 shadow-xs">
              <Icons.CalendarPlus size={28} weight="light" />
            </div>
            <div>
              <h3 className="text-base font-bold text-stone-900">
                Mulai Rencana Itinerary
              </h3>
              <p className="mt-1 text-xs text-stone-500 leading-relaxed">
                Belum ada hari atau jadwal kegiatan yang terdaftar untuk {trip.title}.
                {canEdit ? " Tambahkan agenda pertama atau buat hari baru untuk memulai." : " Menunggu Host atau Editor menambahkan agenda."}
              </p>
            </div>

            {canEdit && (
              <div className="flex flex-col sm:flex-row items-center justify-center gap-2.5 pt-2">
                <AddPlaceModal
                  tripId={trip.id}
                  dayNumber={1}
                  onPlaceAdded={handlePlaceAdded}
                  buttonText="Tambah Agenda Pertama"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-2xl bg-brand-600 px-5 py-2.5 text-xs font-semibold text-white shadow-cta transition hover:bg-brand-700 active:scale-95"
                />
                <button
                  type="button"
                  onClick={handleAddDay}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 rounded-2xl bg-stone-100 hover:bg-stone-200 px-4 py-2.5 text-xs font-semibold text-stone-700 transition active:scale-95"
                >
                  <Icons.Plus size={14} weight="bold" />
                  <span>Inisialisasi Hari 1</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  const day = days[selectedDayIdx] || days[0];

  // Resolve active place being viewed in the Pop-up Detail Pengeluaran
  const activeViewingPlace = viewingExpensesPlaceId
    ? days.flatMap((d) => d.places).find((p) => p.id === viewingExpensesPlaceId) || null
    : null;

  return (
    <div className="flex flex-col h-full overflow-y-auto pb-28 lg:pb-10 hide-scroll">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-[999999] flex items-center gap-2 rounded-2xl bg-stone-900/90 text-white px-4 py-3 text-xs shadow-2xl backdrop-blur-md animate-in fade-in slide-in-from-top-4 duration-300">
          <Icons.CheckCircle size={18} weight="fill" className="text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Sticky Header */}
      <div className="sticky top-0 z-[1100] bg-white/60 backdrop-blur-xl border-b border-white/60 px-5 pt-4 pb-3 lg:px-10">
        <div className="flex items-center justify-between gap-2.5 sm:gap-4 mb-2.5">
          <div className="flex items-center gap-3 min-w-0">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-brand-50 text-brand-600 border border-brand-200/50 shadow-sm shrink-0">
              <Icons.ListBullets size={22} weight="fill" />
            </span>
            <div className="min-w-0">
              <h2 className="text-[18px] sm:text-[20px] font-bold text-brand-700 leading-tight truncate">
                Itinerary & Agenda
              </h2>
              <p className="text-[12px] text-stone-500 mt-0.5 line-clamp-1 truncate">
                {`Jadwal kegiatan & ziarah ${trip.destination || trip.title}`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
            {allTrips && allTrips.length > 0 && (
              <TripSwitcher trips={allTrips} activeTrip={trip} currentUserId={user?.id} />
            )}
            {canEdit ? (
              <AddPlaceModal
                dayId={day.id}
                dayNumber={selectedDayIdx + 1}
                tripId={trip.id}
                onPlaceAdded={handlePlaceAdded}
              />
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-2xl bg-stone-100 border border-stone-200 px-3 py-1.5 sm:px-3.5 sm:py-2 text-xs font-semibold text-stone-600 shadow-xs">
                <Icons.Eye size={15} weight="bold" />
                <span className="hidden sm:inline">Mode Lihat Saja</span>
              </span>
            )}
            {user && <UserProfileMenu user={user} />}
          </div>
        </div>

        {/* Day Filters */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 hide-scroll">
          {days.map((d, i) => {
            const { text, isToday } = formatDayLabel(d, i);
            const isSelected = i === selectedDayIdx;

            return (
              <button
                key={d.id}
                onClick={() => setSelectedDayIdx(i)}
                className={clsx(
                  "shrink-0 rounded-full px-4 py-1.5 text-[13px] font-medium transition whitespace-nowrap flex items-center gap-1.5",
                  isSelected
                    ? "bg-brand-600 text-white shadow-md"
                    : "bg-white/60 border border-brand-200 text-stone-600 hover:bg-brand-50"
                )}
              >
                <span>{text}</span>
                {isToday && (
                  <span
                    className={clsx(
                      "text-[10px] px-1.5 py-0.5 rounded-full font-bold",
                      isSelected
                        ? "bg-white/20 text-white"
                        : "bg-emerald-100 text-emerald-800"
                    )}
                  >
                    Hari Ini
                  </span>
                )}
              </button>
            );
          })}

          {/* Quick Add Day Button (Host/Editor only) */}
          {canEdit && (
            <button
              type="button"
              onClick={handleAddDay}
              className="shrink-0 inline-flex items-center gap-1 rounded-full bg-brand-50 hover:bg-brand-100 text-brand-700 border border-brand-200/80 px-3.5 py-1.5 text-[12px] font-bold transition active:scale-95 shadow-xs whitespace-nowrap"
              title="Tambah hari baru ke itinerary"
            >
              <Icons.Plus size={13} weight="bold" />
              <span>Tambah Hari</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Timeline */}
      <div className="px-5 pt-6 lg:px-10">
        {day.notes && (
          <p className="text-[14px] font-medium text-stone-500 mb-6">
            {day.notes}
          </p>
        )}

        {day.places.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-stone-200 py-14 text-center my-4">
            <p className="text-[14px] font-medium text-stone-500">
              Belum ada agenda untuk hari ini
            </p>
            <p className="mt-1 text-[12px] text-stone-400 mb-4">
              Tambahkan tempat ziarah, jadwal ibadah, atau penerbangan.
            </p>
            <AddPlaceModal
              dayId={day.id}
              dayNumber={selectedDayIdx + 1}
              tripId={trip.id}
              onPlaceAdded={handlePlaceAdded}
            />
          </div>
        ) : (
          <div className="relative border-l-2 border-stone-100 ml-4 space-y-8 pb-10">
            {day.places.map((p) => {
              const cat = CATS[p.category ?? ""] ?? {
                label: "Lainnya",
                iconName: "MapPin",
                color: "bg-stone-100 text-stone-600",
              };
              const isOpen = openTasks[p.id];
              const tasks = p.tasks_json || [];
              const completedCount = tasks.filter((t) => t.done).length;
              const isEditingNote = editingNotePlaceId === p.id;
              const expensesList = p.expenses || [];
              const detectedCur = detectCurrencyFromLocation(
                p.lat,
                p.lng,
                p.address
              );

              return (
                <div key={p.id} className="relative pl-8">
                  {/* Timeline Dot */}
                  <span
                    className={clsx(
                      "absolute -left-[17px] top-1 grid h-8 w-8 place-items-center rounded-full shadow-sm ring-4 ring-white/60",
                      cat.color
                    )}
                  >
                    <PhIcon name={cat.iconName} size={15} weight="fill" />
                  </span>

                  {/* Card */}
                  <div className="rounded-2xl bg-white/60 backdrop-blur-md border border-white/60 px-4 py-3.5 shadow-glass transition hover:bg-white/80">
                    <div className="flex justify-between items-start gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-[15px] font-bold text-stone-900 leading-snug">
                          {p.name}
                        </p>
                        <p className="mt-1 flex items-center gap-1.5 text-[12px] text-stone-500">
                          <Icons.Clock size={13} weight="light" aria-hidden />
                          {p.start_time ?? "—"} — {p.end_time ?? "—"}
                        </p>

                        {/* Location Display (Mandatory feature) */}
                        {p.address ? (
                          <button
                            type="button"
                            onClick={() => setLocationEditPlace(p)}
                            className="mt-1.5 flex items-center gap-1.5 text-xs text-stone-600 hover:text-brand-600 font-medium truncate max-w-full text-left group py-1 active:scale-98 transition"
                            title="Klik untuk ubah lokasi di peta"
                          >
                            <Icons.MapPin
                              size={14}
                              weight="fill"
                              className="text-rose-500 shrink-0"
                            />
                            <span className="truncate group-hover:underline">
                              {p.address}
                            </span>
                            <Icons.PencilSimple
                              size={12}
                              className="opacity-60 group-hover:opacity-100 transition shrink-0 ml-0.5 text-stone-400"
                            />
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setLocationEditPlace(p)}
                            className="mt-1.5 inline-flex items-center gap-1.5 text-xs text-rose-600 hover:text-rose-700 font-semibold bg-rose-50 hover:bg-rose-100 px-3 py-1.5 rounded-xl border border-rose-200 transition active:scale-95"
                          >
                            <Icons.MapPin size={13} weight="fill" />
                            <span>Set Lokasi Peta (Wajib)</span>
                          </button>
                        )}
                      </div>

                      {p.thumbnail_url && (
                        <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-white/60 shadow-sm">
                          <img
                            src={p.thumbnail_url}
                            alt={p.name}
                            className="h-full w-full object-cover"
                          />
                        </div>
                      )}
                    </div>

                    {/* ================= TOTAL EXPENSE SUMMARY (ONLY WHEN > 0) ================= */}
                    {expensesList.length > 0 && (
                      <div className="mt-3 flex items-center justify-between rounded-xl bg-emerald-50/80 border border-emerald-200/80 px-3 py-2 group">
                        <div className="flex items-center gap-2 min-w-0">
                          <Icons.Wallet size={16} weight="fill" className="text-emerald-600 shrink-0" />
                          <div className="flex items-baseline gap-1.5 truncate">
                            <span className="text-[11px] font-medium text-emerald-800">
                              Total Pengeluaran:
                            </span>
                            <span className="text-[13px] font-bold text-emerald-700">
                              {formatTotalExpenses(expensesList, detectedCur)}
                            </span>
                          </div>
                          <span className="text-[10px] px-1.5 py-0.2 bg-emerald-100 text-emerald-800 font-bold rounded shrink-0 hidden sm:inline-block">
                            {expensesList.length} item
                          </span>
                        </div>

                        {/* Button: Pop-up Detail Pengeluaran */}
                        <button
                          type="button"
                          onClick={() => setViewingExpensesPlaceId(p.id)}
                          className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 hover:text-emerald-900 bg-white px-3 py-1.5 rounded-xl border border-emerald-300 shadow-sm transition hover:bg-emerald-100 active:scale-95 shrink-0 ml-2"
                        >
                          <Icons.Receipt size={14} weight="bold" />
                          <span>Lihat Pengeluaran</span>
                        </button>
                      </div>
                    )}

                    {/* ================= NOTES SECTION (VIEW / EDIT) ================= */}
                    {isEditingNote ? (
                      <div className="mt-3 rounded-xl border border-brand-200 bg-brand-50/70 p-3 animate-in fade-in duration-200">
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-brand-700 mb-1.5">
                          <Icons.NotePencil size={15} weight="bold" />
                          <span>{p.notes ? "Edit Catatan Agenda" : "Tambah Catatan Agenda"}</span>
                        </div>
                        <textarea
                          autoFocus
                          rows={2}
                          value={noteDraft}
                          onChange={(e) => setNoteDraft(e.target.value)}
                          placeholder="Tulis catatan penting, tips, atau kontak Muthawif..."
                          className="w-full rounded-xl border border-brand-200 bg-white p-2.5 text-xs text-stone-800 placeholder:text-stone-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200 resize-none"
                        />
                        <div className="mt-2 flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => setEditingNotePlaceId(null)}
                            className="px-3 py-1.5 text-xs font-medium text-stone-500 hover:text-stone-700"
                          >
                            Batal
                          </button>
                          <button
                            type="button"
                            disabled={savingNotePlaceId === p.id}
                            onClick={() => handleSaveNote(p)}
                            className="inline-flex items-center gap-1 rounded-xl bg-brand-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-brand-700 disabled:opacity-50"
                          >
                            <Icons.Check size={14} weight="bold" />
                            Simpan
                          </button>
                        </div>
                      </div>
                    ) : p.notes ? (
                      <div className="mt-3 rounded-xl bg-amber-50/80 border border-amber-200/70 p-3 text-xs text-stone-700 leading-relaxed group relative">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-start gap-2 min-w-0 flex-1">
                            <Icons.NotePencil
                              size={16}
                              className="text-amber-600 shrink-0 mt-0.5"
                              weight="fill"
                            />
                            <p className="whitespace-pre-line text-xs text-stone-800 leading-snug">
                              {p.notes}
                            </p>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={() => handleStartEditNote(p)}
                              className="grid h-8 w-8 place-items-center rounded-lg text-stone-500 hover:text-amber-700 hover:bg-amber-100/70 active:scale-95 transition"
                              title="Edit Catatan"
                            >
                              <Icons.PencilSimple size={14} />
                            </button>
                            <button
                              type="button"
                              onClick={() => setNoteToDelete(p)}
                              className="grid h-8 w-8 place-items-center rounded-lg text-stone-400 hover:text-rose-600 hover:bg-rose-50 active:scale-95 transition"
                              title="Hapus Catatan"
                            >
                              <Icons.Trash size={14} />
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : null}

                    {/* ================= QUICK ADD ACTIONS: (+ Tambah Catatan / + Tambah Pengeluaran) ================= */}
                    {(!p.notes || expensesList.length === 0) && !isEditingNote && (
                      <div className="mt-3 flex items-center gap-2 flex-wrap">
                        {!p.notes && (
                          <button
                            type="button"
                            onClick={() => handleStartEditNote(p)}
                            className="inline-flex items-center gap-1.5 text-xs font-medium text-stone-600 hover:text-brand-600 bg-stone-50 hover:bg-brand-50 border border-stone-200/70 hover:border-brand-200 px-3 py-1.5 rounded-xl transition active:scale-95"
                          >
                            <Icons.NotePencil size={13} className="text-brand-600" />
                            <span>+ Catatan</span>
                          </button>
                        )}
                        {expensesList.length === 0 && (
                          <button
                            type="button"
                            onClick={() => handleOpenExpenseModal(p)}
                            className="inline-flex items-center gap-1.5 text-xs font-medium text-stone-600 hover:text-emerald-700 bg-stone-50 hover:bg-emerald-50 border border-stone-200/70 hover:border-emerald-200 px-3 py-1.5 rounded-xl transition active:scale-95"
                          >
                            <Icons.Wallet size={13} className="text-emerald-600" />
                            <span>+ Pengeluaran</span>
                          </button>
                        )}
                      </div>
                    )}

                    {/* Task Toggle & Management */}
                    <div className="mt-3 border-t border-stone-100 pt-3">
                      <button
                        onClick={() => toggleTask(p.id)}
                        className="flex w-full items-center justify-between rounded-lg bg-stone-50 px-3 py-2 text-[13px] font-medium text-stone-600 transition hover:bg-stone-100"
                      >
                        <span className="flex items-center gap-2">
                          <Icons.CheckSquareOffset
                            size={16}
                            weight="light"
                            className="text-brand-500"
                            aria-hidden
                          />
                          {completedCount}/{tasks.length} Tugas
                        </span>
                        <Icons.CaretDown
                          size={14}
                          weight="bold"
                          className={clsx(
                            "text-stone-400 transition-transform",
                            isOpen && "rotate-180"
                          )}
                          aria-hidden
                        />
                      </button>

                      {isOpen && (
                        <div className="mt-2 space-y-2 pl-1 pb-1">
                          {tasks.length === 0 ? (
                            <p className="text-[12px] text-stone-400 italic">
                              Belum ada catatan tugas.
                            </p>
                          ) : (
                            tasks.map((t) => (
                              <label
                                key={t.id}
                                className="flex items-start gap-2 cursor-pointer group"
                              >
                                <input
                                  type="checkbox"
                                  checked={t.done}
                                  disabled={savingTaskId === t.id}
                                  onChange={(e) =>
                                    handleTaskToggle(p, t.id, e.target.checked)
                                  }
                                  className="mt-0.5 rounded border-stone-300 text-brand-600 focus:ring-brand-500 disabled:opacity-50"
                                />
                                <span
                                  className={clsx(
                                    "text-[13px]",
                                    t.done
                                      ? "text-stone-400 line-through"
                                      : "text-stone-700"
                                  )}
                                >
                                  {t.title}
                                </span>
                              </label>
                            ))
                          )}

                          {/* Add task inline form */}
                          {addingTaskForPlaceId === p.id ? (
                            <div className="mt-2 flex items-center gap-2">
                              <input
                                type="text"
                                value={newTaskTitle}
                                onChange={(e) => setNewTaskTitle(e.target.value)}
                                placeholder="Nama tugas..."
                                className="flex-1 rounded-xl border border-stone-200 bg-white px-3 py-1.5 text-[12px] text-stone-800 placeholder:text-stone-400 focus:border-brand-500 focus:outline-none"
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") {
                                    e.preventDefault();
                                    handleAddTask(p);
                                  } else if (e.key === "Escape") {
                                    setAddingTaskForPlaceId(null);
                                    setNewTaskTitle("");
                                  }
                                }}
                                autoFocus
                              />
                              <button
                                onClick={() => handleAddTask(p)}
                                className="rounded-xl bg-brand-600 px-3 py-1.5 text-[12px] font-medium text-white shadow-sm hover:bg-brand-700"
                              >
                                Simpan
                              </button>
                              <button
                                onClick={() => {
                                  setAddingTaskForPlaceId(null);
                                  setNewTaskTitle("");
                                }}
                                className="rounded-xl px-2 py-1.5 text-[12px] text-stone-400 hover:text-stone-600"
                              >
                                Batal
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => {
                                setAddingTaskForPlaceId(p.id);
                                setNewTaskTitle("");
                              }}
                              className="text-[12px] text-brand-600 font-medium hover:underline mt-2 flex items-center gap-1"
                            >
                              <Icons.Plus size={13} weight="bold" />
                              Tambah tugas
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ================= POP-UP MODAL: DETAIL PENGELUARAN AGENDA ================= */}
      {mounted &&
        activeViewingPlace &&
        createPortal(
          <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div
              className="relative w-full max-w-lg rounded-3xl bg-white border border-stone-100 p-6 shadow-2xl flex flex-col max-h-[88vh] animate-in zoom-in-95 duration-150"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-start justify-between pb-3.5 border-b border-stone-100 shrink-0">
                <div className="flex items-center gap-2.5">
                  <div className="grid h-10 w-10 place-items-center rounded-2xl bg-emerald-100 text-emerald-700 shrink-0">
                    <Icons.Receipt size={22} weight="fill" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-stone-900 leading-tight">
                      Rincian Pengeluaran Agenda
                    </h3>
                    <p className="text-xs text-stone-500 mt-0.5 truncate">
                      {activeViewingPlace.name}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setViewingExpensesPlaceId(null)}
                  className="grid h-8 w-8 place-items-center rounded-full text-stone-400 hover:bg-stone-100 hover:text-stone-700 transition"
                >
                  <Icons.X size={17} weight="bold" />
                </button>
              </div>

              {/* Total Banner Summary */}
              <div className="mt-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-700 p-4 text-white shadow-sm shrink-0 flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-emerald-100">
                    Total Pengeluaran Agenda
                  </p>
                  <p className="text-[20px] font-bold mt-0.5">
                    {formatTotalExpenses(
                      activeViewingPlace.expenses || [],
                      detectCurrencyFromLocation(
                        activeViewingPlace.lat,
                        activeViewingPlace.lng,
                        activeViewingPlace.address
                      )
                    )}
                  </p>
                </div>
                <div className="rounded-xl bg-white/20 px-3 py-1 text-center backdrop-blur-md">
                  <span className="text-xs font-bold">
                    {(activeViewingPlace.expenses || []).length} Item
                  </span>
                </div>
              </div>

              {/* Expenses List */}
              <div className="flex-1 overflow-y-auto space-y-2 mt-4 pr-1 hide-scroll">
                {(activeViewingPlace.expenses || []).length === 0 ? (
                  <div className="py-8 text-center bg-stone-50 rounded-2xl border border-dashed border-stone-200">
                    <p className="text-xs text-stone-500">
                      Belum ada pengeluaran pada agenda ini.
                    </p>
                  </div>
                ) : (
                  (activeViewingPlace.expenses || []).map((exp) => {
                    const catObj =
                      EXPENSE_CATEGORIES.find((c) => c.id === exp.category) ||
                      EXPENSE_CATEGORIES[6];

                    return (
                      <div
                        key={exp.id}
                        className="flex items-center justify-between rounded-2xl bg-stone-50 border border-stone-200/80 p-3 hover:border-emerald-200 transition group"
                      >
                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                          <span
                            className={`shrink-0 rounded-lg px-2 py-0.5 text-[10px] font-bold ${catObj.color}`}
                          >
                            {catObj.label}
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-bold text-stone-800 truncate">
                              {exp.description}
                            </p>
                            {exp.date && (
                              <p className="text-[10px] text-stone-400">
                                {format(parseISO(exp.date), "d MMM yyyy", {
                                  locale: idLocale,
                                })}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2.5 shrink-0 ml-3">
                          <span className="text-sm font-bold text-emerald-700">
                            {formatMoney(
                              Number(exp.amount),
                              exp.currency || "IDR"
                            )}
                          </span>

                          <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition">
                            <button
                              type="button"
                              onClick={() => {
                                handleOpenExpenseModal(
                                  activeViewingPlace,
                                  exp
                                );
                              }}
                              className="grid h-7 w-7 place-items-center text-stone-500 hover:text-emerald-700 hover:bg-white rounded-lg border border-stone-200 shadow-2xs transition"
                              title="Edit Pengeluaran"
                            >
                              <Icons.PencilSimple size={13} />
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setExpenseToDelete({
                                  expense: exp,
                                  placeId: activeViewingPlace.id,
                                });
                              }}
                              className="grid h-7 w-7 place-items-center text-stone-400 hover:text-rose-600 hover:bg-white rounded-lg border border-stone-200 shadow-2xs transition"
                              title="Hapus Pengeluaran"
                            >
                              <Icons.Trash size={13} />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Action Footer */}
              <div className="mt-4 pt-3.5 border-t border-stone-100 flex items-center justify-between shrink-0">
                <button
                  type="button"
                  onClick={() => handleOpenExpenseModal(activeViewingPlace)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-emerald-50 text-emerald-700 border border-emerald-300 text-xs font-bold hover:bg-emerald-100 transition"
                >
                  <Icons.Plus size={14} weight="bold" />
                  Tambah Item Pengeluaran
                </button>

                <button
                  type="button"
                  onClick={() => setViewingExpensesPlaceId(null)}
                  className="px-4 py-2 rounded-2xl bg-stone-100 text-stone-700 text-xs font-semibold hover:bg-stone-200 transition"
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* ================= MODAL: ADD / EDIT INDIVIDUAL EXPENSE ================= */}
      {mounted &&
        expenseModalPlace &&
        createPortal(
          <div className="fixed inset-0 z-[10001] flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div
              className="relative w-full max-w-md rounded-3xl bg-white border border-stone-100 p-6 shadow-2xl flex flex-col animate-in zoom-in-95 duration-150"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between pb-3 border-b border-stone-100">
                <div>
                  <h3 className="text-base font-bold text-stone-900">
                    {editingExpense ? "Edit Pengeluaran" : "Tambah Pengeluaran"}
                  </h3>
                  <p className="text-xs text-stone-500">
                    Agenda: {expenseModalPlace.name}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setExpenseModalPlace(null);
                    setEditingExpense(null);
                  }}
                  className="grid h-8 w-8 place-items-center rounded-full text-stone-400 hover:bg-stone-100"
                >
                  <Icons.X size={16} />
                </button>
              </div>

              <div className="mt-4 space-y-3.5">
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Nama / Keterangan Pengeluaran <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Makan Siang Nasi Mandhi, Sewa Taksi..."
                    value={expenseDesc}
                    onChange={(e) => setExpenseDesc(e.target.value)}
                    className="w-full rounded-2xl border border-stone-200 bg-white px-3.5 py-2 text-xs text-stone-900 placeholder:text-stone-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-100"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Kategori Pengeluaran
                  </label>
                  <select
                    value={expenseCat}
                    onChange={(e) => setExpenseCat(e.target.value)}
                    className="w-full rounded-2xl border border-stone-200 bg-white px-3.5 py-2 text-xs font-medium text-stone-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-100"
                  >
                    {EXPENSE_CATEGORIES.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-12 gap-2">
                  <div className="col-span-7">
                    <label className="block text-xs font-semibold text-stone-700 mb-1">
                      Nominal <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-stone-400">
                        {expenseCur === "SAR" ? "﷼" : "Rp"}
                      </span>
                      <input
                        type="text"
                        placeholder="0"
                        value={expenseAmount}
                        onChange={(e) => {
                          const val = e.target.value.replace(/[^0-9]/g, "");
                          setExpenseAmount(
                            val ? Number(val).toLocaleString("id-ID") : ""
                          );
                        }}
                        className="w-full rounded-2xl border border-stone-200 bg-white py-2 pl-8 pr-3 text-xs text-stone-900 placeholder:text-stone-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-100"
                      />
                    </div>
                  </div>

                  <div className="col-span-5">
                    <label className="block text-xs font-semibold text-stone-700 mb-1">
                      Mata Uang
                    </label>
                    <select
                      value={expenseCur}
                      onChange={(e) => setExpenseCur(e.target.value)}
                      className="w-full rounded-2xl border border-stone-200 bg-white px-3 py-2 text-xs font-bold text-stone-800 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-100"
                    >
                      {AVAILABLE_CURRENCIES.map((c) => (
                        <option key={c.code} value={c.code}>
                          {c.code} ({c.symbol})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div className="mt-5 pt-3 border-t border-stone-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setExpenseModalPlace(null);
                    setEditingExpense(null);
                  }}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-stone-600 hover:bg-stone-100 transition"
                >
                  Batal
                </button>
                <button
                  type="button"
                  disabled={savingExpense}
                  onClick={handleSaveExpense}
                  className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 shadow-sm transition disabled:opacity-50"
                >
                  {savingExpense && (
                    <Icons.CircleNotch size={14} className="animate-spin" />
                  )}
                  <span>Simpan Pengeluaran</span>
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* ================= MODAL: DELETE EXPENSE CONFIRMATION ================= */}
      {mounted &&
        expenseToDelete &&
        createPortal(
          <div className="fixed inset-0 z-[10002] flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div
              className="relative w-full max-w-sm rounded-[2rem] bg-white border border-white/80 p-6 shadow-2xl flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start gap-3.5">
                <div className="grid h-11 w-11 place-items-center rounded-2xl bg-rose-100 text-rose-600 shrink-0">
                  <Icons.Warning size={24} weight="fill" />
                </div>
                <div>
                  <h3 className="text-[15px] font-bold text-stone-900">
                    Hapus Pengeluaran?
                  </h3>
                  <p className="text-[12px] text-stone-500 mt-1 leading-relaxed">
                    Hapus pengeluaran{" "}
                    <span className="font-semibold text-stone-800">
                      "{expenseToDelete.expense.description}"
                    </span>{" "}
                    sebesar{" "}
                    <span className="font-bold text-emerald-700">
                      {formatMoney(
                        Number(expenseToDelete.expense.amount),
                        expenseToDelete.expense.currency
                      )}
                    </span>
                    ?
                  </p>
                </div>
              </div>

              <div className="mt-5 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setExpenseToDelete(null)}
                  className="h-10 px-4 rounded-xl text-stone-600 text-xs font-semibold hover:bg-stone-100 transition"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDeleteExpense}
                  className="h-10 px-4 rounded-xl bg-rose-600 text-white text-xs font-bold hover:bg-rose-700 shadow-sm transition flex items-center gap-1.5"
                >
                  <Icons.Trash size={14} weight="bold" />
                  Hapus Pengeluaran
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* ================= MODAL: EDIT LOCATION VIA FREE MAP ================= */}
      {locationEditPlace && (
        <FreeMapLocationPicker
          isOpen={true}
          onClose={() => setLocationEditPlace(null)}
          onSelectLocation={handleSavePlaceLocation}
          initialLat={locationEditPlace.lat}
          initialLng={locationEditPlace.lng}
          initialAddress={locationEditPlace.address}
          initialName={locationEditPlace.name}
        />
      )}

      {/* ================= MODAL: DELETE NOTE CONFIRMATION ================= */}
      {mounted &&
        noteToDelete &&
        createPortal(
          <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div
              className="relative w-full max-w-sm rounded-[2rem] bg-white border border-white/80 p-6 shadow-2xl flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start gap-3.5">
                <div className="grid h-11 w-11 place-items-center rounded-2xl bg-rose-100 text-rose-600 shrink-0">
                  <Icons.Warning size={24} weight="fill" />
                </div>
                <div>
                  <h3 className="text-[15px] font-bold text-stone-900">Hapus Catatan?</h3>
                  <p className="text-[12px] text-stone-500 mt-1 leading-relaxed">
                    Hapus catatan pada agenda <span className="font-semibold text-stone-800">"{noteToDelete.name}"</span>?
                  </p>
                  {noteToDelete.notes && (
                    <p className="mt-2 text-[11.5px] italic text-stone-600 bg-stone-50 p-2.5 rounded-xl border border-stone-200 line-clamp-3">
                      "{noteToDelete.notes}"
                    </p>
                  )}
                </div>
              </div>

              <div className="mt-5 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setNoteToDelete(null)}
                  className="h-10 px-4 rounded-xl text-stone-600 text-xs font-semibold hover:bg-stone-100 transition"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDeleteNote}
                  className="h-10 px-4 rounded-xl bg-rose-600 text-white text-xs font-bold hover:bg-rose-700 shadow-sm transition flex items-center gap-1.5"
                >
                  <Icons.Trash size={14} weight="bold" />
                  Hapus Catatan
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
