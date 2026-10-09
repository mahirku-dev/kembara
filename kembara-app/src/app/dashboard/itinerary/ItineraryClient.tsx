"use client";

import { useState, useCallback, useEffect } from "react";
import { createPortal } from "react-dom";
import { createClient } from "@/utils/supabase/client";
import type { Expense, ItineraryDay, Place, Task, Trip, TripMember } from "@/types";
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
  extractCityName,
  detectTimezoneFromLocation,
  formatTimeDisplay,
  formatTimeRange,
  getGoogleMapsDirectionsUrl,
} from "@/lib/geo";
import { useRouter } from "next/navigation";
import AddPlaceModal from "./AddPlaceModal";
import EditPlaceModal from "./EditPlaceModal";
import FreeMapLocationPicker, {
  type SelectedLocationResult,
} from "@/components/FreeMapLocationPicker";
import TripSwitcher from "@/components/TripSwitcher";
import UserProfileMenu from "@/components/UserProfileMenu";
import AiExtractItineraryModal from "@/components/AiExtractItineraryModal";

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
  members?: TripMember[];
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

export function extractCityFromPlace(place: Place): string | null {
  return extractCityName(place.address, place.name, place.lat, place.lng);
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

export function getIndonesianDayOrdinal(dayNum: number): string {
  const ordinals: Record<number, string> = {
    1: "Hari Pertama",
    2: "Hari Kedua",
    3: "Hari Ketiga",
    4: "Hari Keempat",
    5: "Hari Kelima",
    6: "Hari Keenam",
    7: "Hari Ketujuh",
    8: "Hari Kedelapan",
    9: "Hari Kesembilan",
    10: "Hari Kesepuluh",
    11: "Hari Kesebelas",
    12: "Hari Kedua Belas",
    13: "Hari Ketiga Belas",
    14: "Hari Keempat Belas",
    15: "Hari Kelima Belas",
    16: "Hari Keenam Belas",
    17: "Hari Ketujuh Belas",
    18: "Hari Kedelapan Belas",
    19: "Hari Kesembilan Belas",
    20: "Hari Kedua Puluh",
  };
  return ordinals[dayNum] || `Hari ke-${dayNum}`;
}

export default function ItineraryClient({
  trip,
  days: initialDays,
  allTrips = [],
  user,
  members = [],
}: Props) {
  const isHost = isTripHost(trip.current_user_role, user?.id, trip.user_id);
  const canEdit = canEditTrip(trip.current_user_role) || isHost;
  const router = useRouter();

  const [mounted, setMounted] = useState(false);
  const [isAiExtractModalOpen, setIsAiExtractModalOpen] = useState(false);
  const [days, setDays] = useState<DayWithPlaces[]>(initialDays);
  const [selectedDayIdx, setSelectedDayIdx] = useState<number>(() =>
    getInitialDayIndex(initialDays)
  );
  const [membersList, setMembersList] = useState<TripMember[]>(members || []);
  const [openTasks, setOpenTasks] = useState<Record<string, boolean>>({});
  const [savingTaskId, setSavingTaskId] = useState<string | null>(null);
  const [addingTaskForPlaceId, setAddingTaskForPlaceId] = useState<string | null>(null);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskAssigneeId, setNewTaskAssigneeId] = useState<string>(user?.id || "");
  const [addingSubtaskForTaskId, setAddingSubtaskForTaskId] = useState<string | null>(null);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState("");

  // Sync / fetch trip members
  useEffect(() => {
    if (members && members.length > 0) {
      setMembersList(members);
    } else if (trip.id) {
      const supabase = createClient();
      supabase
        .from("trip_members")
        .select("*")
        .eq("trip_id", trip.id)
        .order("created_at", { ascending: true })
        .returns<TripMember[]>()
        .then(({ data }) => {
          if (data) setMembersList(data);
        });
    }
  }, [trip.id, members]);

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

  // Edit Place (Agenda) Modal
  const [editingPlace, setEditingPlace] = useState<Place | null>(null);

  // Delete confirmation for an entire Place (Agenda)
  const [placeToDelete, setPlaceToDelete] = useState<Place | null>(null);
  const [isDeletingPlace, setIsDeletingPlace] = useState(false);

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

  // Permission helpers for tasks
  const canToggleTask = useCallback(
    (t: Task) => {
      if (isHost || canEdit) return true;
      if (user?.id && (t.assigned_to === user.id || t.created_by === user.id)) return true;
      if (!t.created_by && !t.assigned_to) return true; // Legacy tasks
      return false;
    },
    [isHost, canEdit, user?.id]
  );

  const canDeleteTask = useCallback(
    (t: Task) => {
      if (isHost) return true;
      if (user?.id && (t.created_by === user.id || t.assigned_to === user.id)) return true;
      return false;
    },
    [isHost, user?.id]
  );

  const canAddSubtask = useCallback(
    (t: Task) => {
      if (isHost || canEdit) return true;
      if (user?.id && (t.created_by === user.id || t.assigned_to === user.id)) return true;
      return false;
    },
    [isHost, canEdit, user?.id]
  );

  // Update a parent task checkbox (and all its subtasks if present)
  const handleTaskToggle = useCallback(
    async (place: Place, taskId: string, newDone: boolean) => {
      const task = (place.tasks_json || []).find((t) => t.id === taskId);
      if (!task || !canToggleTask(task)) return;
      setSavingTaskId(taskId);

      const updatedTasks: Task[] = (place.tasks_json || []).map((t) => {
        if (t.id !== taskId) return t;
        const subtasks = (t.subtasks || []).map((st) => ({
          ...st,
          done: newDone,
        }));
        return {
          ...t,
          done: newDone,
          subtasks,
        };
      });

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

      try {
        const supabase = createClient();
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
    [canToggleTask]
  );

  // Update a subtask checkbox with auto-completion of parent task
  const handleSubtaskToggle = useCallback(
    async (place: Place, taskId: string, subtaskId: string, newDone: boolean) => {
      const task = (place.tasks_json || []).find((t) => t.id === taskId);
      if (!task || !canToggleTask(task)) return;
      setSavingTaskId(subtaskId);

      const updatedTasks: Task[] = (place.tasks_json || []).map((t) => {
        if (t.id !== taskId) return t;
        const subtasks = (t.subtasks || []).map((st) =>
          st.id === subtaskId ? { ...st, done: newDone } : st
        );
        const allSubtasksDone = subtasks.length > 0 && subtasks.every((st) => st.done);
        return {
          ...t,
          subtasks,
          done: allSubtasksDone,
        };
      });

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

      try {
        const supabase = createClient();
        await supabase
          .from("places")
          .update({ tasks_json: updatedTasks })
          .eq("id", place.id);
      } catch (err) {
        console.error("Gagal memperbarui subtask:", err);
      } finally {
        setSavingTaskId(null);
      }
    },
    [canToggleTask]
  );

  // Add a new parent task to a place and persist to Supabase
  const handleAddTask = useCallback(
    async (place: Place) => {
      const title = newTaskTitle.trim();
      if (!title || !user) return;

      let assignedTo: string | null = null;
      let assignedName: string | null = null;
      let assignedAvatar: string | null = null;

      if (isHost) {
        if (newTaskAssigneeId === user.id) {
          // Default Host diri sendiri
          assignedTo = user.id;
          assignedName = user.user_metadata?.full_name || user.email?.split("@")[0] || "Host";
          assignedAvatar = user.user_metadata?.avatar_url || null;
        } else if (newTaskAssigneeId) {
          // Selected specific trip member
          const member = membersList.find(
            (m) => m.user_id === newTaskAssigneeId || m.id === newTaskAssigneeId
          );
          if (member) {
            assignedTo = member.user_id || member.id;
            assignedName = member.name;
            assignedAvatar = member.avatar_url;
          }
        } else {
          // "Semua / Umum"
          assignedTo = null;
          assignedName = null;
        }
      } else {
        // Viewer can only add tasks for themselves
        assignedTo = user.id;
        assignedName = user.user_metadata?.full_name || user.email?.split("@")[0] || "Saya";
        assignedAvatar = user.user_metadata?.avatar_url || null;
      }

      const newTask: Task = {
        id: `t_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        title,
        done: false,
        assigned_to: assignedTo,
        assigned_name: assignedName,
        assigned_avatar: assignedAvatar,
        created_by: user.id,
        created_by_name: user.user_metadata?.full_name || user.email?.split("@")[0] || null,
        subtasks: [],
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
      setNewTaskAssigneeId(user.id);

      try {
        const supabase = createClient();
        await supabase
          .from("places")
          .update({ tasks_json: updatedTasks })
          .eq("id", place.id);
        showToast("Tugas berhasil ditambahkan.");
      } catch (err) {
        console.error("Gagal menambahkan task:", err);
        showToast("Gagal menambahkan tugas.");
      }
    },
    [newTaskTitle, user, isHost, newTaskAssigneeId, membersList]
  );

  // Add a subtask to a specific parent task
  const handleAddSubtask = useCallback(
    async (place: Place, taskId: string) => {
      const task = (place.tasks_json || []).find((t) => t.id === taskId);
      if (!task || !canAddSubtask(task)) return;

      const title = newSubtaskTitle.trim();
      if (!title) return;

      const newSubtask = {
        id: `st_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        title,
        done: false,
      };

      const updatedTasks: Task[] = (place.tasks_json || []).map((t) => {
        if (t.id !== taskId) return t;
        const subtasks = [...(t.subtasks || []), newSubtask];
        return {
          ...t,
          done: subtasks.every((st) => st.done),
          subtasks,
        };
      });

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

      setNewSubtaskTitle("");
      setAddingSubtaskForTaskId(null);

      try {
        const supabase = createClient();
        await supabase
          .from("places")
          .update({ tasks_json: updatedTasks })
          .eq("id", place.id);
      } catch (err) {
        console.error("Gagal menambahkan subtask:", err);
      }
    },
    [canAddSubtask, newSubtaskTitle]
  );

  // Delete a parent task
  const handleDeleteTask = useCallback(
    async (place: Place, taskId: string) => {
      const task = (place.tasks_json || []).find((t) => t.id === taskId);
      if (!task || !canDeleteTask(task)) {
        showToast("Anda tidak memiliki izin untuk menghapus tugas ini.");
        return;
      }

      const updatedTasks = (place.tasks_json || []).filter((t) => t.id !== taskId);

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

      try {
        const supabase = createClient();
        await supabase
          .from("places")
          .update({ tasks_json: updatedTasks })
          .eq("id", place.id);
        showToast("Tugas berhasil dihapus.");
      } catch (err) {
        console.error("Gagal menghapus task:", err);
      }
    },
    [canDeleteTask]
  );

  // Delete a subtask
  const handleDeleteSubtask = useCallback(
    async (place: Place, taskId: string, subtaskId: string) => {
      const task = (place.tasks_json || []).find((t) => t.id === taskId);
      if (!task || !canDeleteTask(task)) {
        showToast("Anda tidak memiliki izin untuk menghapus sub-tugas ini.");
        return;
      }

      const updatedTasks: Task[] = (place.tasks_json || []).map((t) => {
        if (t.id !== taskId) return t;
        const subtasks = (t.subtasks || []).filter((st) => st.id !== subtaskId);
        const allDone = subtasks.length > 0 ? subtasks.every((st) => st.done) : t.done;
        return {
          ...t,
          subtasks,
          done: allDone,
        };
      });

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

      try {
        const supabase = createClient();
        await supabase
          .from("places")
          .update({ tasks_json: updatedTasks })
          .eq("id", place.id);
      } catch (err) {
        console.error("Gagal menghapus subtask:", err);
      }
    },
    [canDeleteTask]
  );

  // Start editing a note for a place
  const handleStartEditNote = (place: Place) => {
    if (!canEdit) return;
    setEditingNotePlaceId(place.id);
    setNoteDraft(place.notes || "");
  };

  // Save a note to Supabase and update state
  const handleSaveNote = async (place: Place) => {
    if (!canEdit) return;
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
    if (!canEdit || !noteToDelete) return;
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
    if (!canEdit) return;
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
    if (!canEdit || !expenseModalPlace) return;
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
    if (!canEdit || !expenseToDelete) return;
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

  // Delete an entire Place / Agenda
  const handleConfirmDeletePlace = async () => {
    if (!canEdit || !placeToDelete) return;
    const place = placeToDelete;
    setIsDeletingPlace(true);

    // Optimistically remove from local state
    setDays((prevDays) =>
      prevDays.map((d) => ({
        ...d,
        places: d.places.filter((p) => p.id !== place.id),
      }))
    );

    try {
      const supabase = createClient();
      // Remove child expenses first to prevent foreign key errors
      await supabase.from("expenses").delete().eq("place_id", place.id);
      const { error } = await supabase.from("places").delete().eq("id", place.id);
      if (error) throw error;
      showToast(`Agenda "${place.name}" berhasil dihapus.`);
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Gagal menghapus agenda.";
      console.error("Gagal menghapus agenda:", err);
      showToast(msg);
    } finally {
      setPlaceToDelete(null);
      setIsDeletingPlace(false);
    }
  };

  // Update Place Location from FreeMapLocationPicker
  const handleSavePlaceLocation = async (loc: SelectedLocationResult) => {
    if (!canEdit || !locationEditPlace) return;
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
    if (!canEdit) return;
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
          notes: null,
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

  const handlePlaceUpdated = useCallback(
    (updatedPlace: Place, previousDayId?: string) => {
      setDays((prevDays) => {
        // If day_id changed, remove from previousDayId and add to new day_id
        if (previousDayId && previousDayId !== updatedPlace.day_id) {
          return prevDays.map((d) => {
            if (d.id === previousDayId) {
              return {
                ...d,
                places: d.places.filter((p) => p.id !== updatedPlace.id),
              };
            }
            if (d.id === updatedPlace.day_id) {
              const exists = d.places.some((p) => p.id === updatedPlace.id);
              return {
                ...d,
                places: exists
                  ? d.places.map((p) => (p.id === updatedPlace.id ? updatedPlace : p))
                  : [...d.places, updatedPlace],
              };
            }
            return d;
          });
        }

        // Same day update
        return prevDays.map((d) => {
          if (d.id !== updatedPlace.day_id) return d;
          return {
            ...d,
            places: d.places.map((p) => (p.id === updatedPlace.id ? updatedPlace : p)),
          };
        });
      });
      setEditingPlace(null);
      showToast("Agenda berhasil diperbarui.");
    },
    []
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

    let text = `Hari ${dayNum}`;
    if (day.date) {
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

        {/* Compact Mobile-First Trip Header */}
        <header className="sticky top-0 z-[1100] bg-white/70 backdrop-blur-xl border-b border-white/70 px-4 py-2.5 sm:px-6 lg:px-10 shrink-0">
          <div className="flex items-center justify-between gap-3">
            {/* Trip Selector as Primary Header Focus */}
            <div className="min-w-0 flex-1">
              {allTrips && allTrips.length > 0 ? (
                <TripSwitcher
                  trips={allTrips}
                  activeTrip={trip}
                  currentUserId={user?.id}
                  className="w-full sm:w-auto"
                />
              ) : (
                <div className="flex items-center gap-2">
                  <span className="text-base font-bold text-brand-700">Kembara</span>
                </div>
              )}
            </div>

            {/* User Profile Menu (Red Suitcase Button) */}
            <div className="shrink-0 flex items-center">
              <UserProfileMenu user={user} />
            </div>
          </div>
        </header>

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
                  onClick={() => setIsAiExtractModalOpen(true)}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 rounded-2xl bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300/80 px-4 py-2.5 text-xs font-semibold transition active:scale-95 shadow-xs"
                >
                  <Icons.Sparkle size={15} weight="fill" className="text-amber-600" />
                  <span>AI Import</span>
                </button>
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

        {/* Modal: AI Extract Itinerary for empty state */}
        <AiExtractItineraryModal
          trip={trip}
          isOpen={isAiExtractModalOpen}
          onClose={() => setIsAiExtractModalOpen(false)}
          onImportSuccess={() => {
            showToast("Itinerary berhasil diimpor!");
            router.refresh();
          }}
        />
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

      {/* Compact Mobile-First Trip Header */}
      <header className="sticky top-0 z-[1100] bg-white/70 backdrop-blur-xl border-b border-white/70 px-4 py-2.5 sm:px-6 lg:px-10 shrink-0">
        <div className="flex items-center justify-between gap-3 mb-2.5">
          {/* Trip Selector as Primary Header Focus */}
          <div className="min-w-0 flex-1">
            {allTrips && allTrips.length > 0 ? (
              <TripSwitcher
                trips={allTrips}
                activeTrip={trip}
                currentUserId={user?.id}
                className="w-full sm:w-auto"
              />
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-base font-bold text-brand-700">Kembara</span>
              </div>
            )}
          </div>

          {/* Action Buttons & User Profile Menu */}
          <div className="shrink-0 flex items-center gap-2">
            {canEdit && (
              <button
                type="button"
                onClick={() => setIsAiExtractModalOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-2xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 border border-amber-300/60 px-3 py-1.5 sm:px-3.5 sm:py-2 text-xs font-bold shadow-xs transition active:scale-95"
                title="Ekstrak itinerary otomatis dengan AI"
              >
                <Icons.Sparkle size={15} weight="fill" className="text-amber-500" />
                <span className="hidden sm:inline">AI Import</span>
              </button>
            )}

            {!canEdit && (
              <span className="inline-flex items-center gap-1.5 rounded-2xl bg-stone-100 border border-stone-200 px-3 py-1.5 sm:px-3.5 sm:py-2 text-xs font-semibold text-stone-600 shadow-xs">
                <Icons.Eye size={15} weight="bold" />
                <span className="hidden sm:inline">Mode Lihat Saja</span>
              </span>
            )}

            <UserProfileMenu user={user} />
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

        {/* Frozen/Sticky Day Heading & Cities Route */}
        <div className="pt-2 pb-0.5 border-t border-stone-100/90 flex flex-col min-w-0">
          <h3 className="text-sm sm:text-base font-bold text-stone-900 tracking-tight leading-snug truncate">
            {(() => {
              const dayNum = day.day_number || selectedDayIdx + 1;
              const ordinalText = getIndonesianDayOrdinal(dayNum);
              if (day.date) {
                try {
                  const dateStr = format(parseISO(day.date), "EEEE, d MMMM yyyy", {
                    locale: idLocale,
                  });
                  return `${ordinalText} - ${dateStr}`;
                } catch {
                  return ordinalText;
                }
              }
              return ordinalText;
            })()}
          </h3>

          {/* Subtitle: Rute Kota (hanya tampil jika ada lokasi) */}
          {(() => {
            const route = getDayCitiesRoute(day.places);
            if (!route) return null;

            return (
              <p
                className="text-xs sm:text-[13px] text-brand-700 font-semibold leading-tight truncate sm:whitespace-normal mt-0.5"
                title={route}
              >
                {route}
              </p>
            );
          })()}
        </div>
      </header>

      {/* Main Timeline */}
      <div className="px-5 pt-4 lg:px-10">
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
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-[15px] font-bold text-stone-900 leading-snug">
                            {p.name}
                          </p>
                          {canEdit && (
                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                type="button"
                                onClick={() => setEditingPlace(p)}
                                className="text-stone-400 hover:text-brand-600 hover:bg-brand-50 p-1 rounded-lg transition active:scale-95 shrink-0"
                                title="Edit agenda ini"
                              >
                                <Icons.PencilSimple size={14} />
                              </button>
                              <button
                                type="button"
                                onClick={() => setPlaceToDelete(p)}
                                className="text-stone-400 hover:text-rose-600 hover:bg-rose-50 p-1 rounded-lg transition active:scale-95 shrink-0"
                                title="Hapus agenda ini"
                              >
                                <Icons.Trash size={14} />
                              </button>
                            </div>
                          )}
                        </div>
                        {/* Time & Timezone badge */}
                        {p.start_time || p.end_time ? (
                          <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                            <span className="inline-flex items-center gap-1 text-[12px] font-medium text-stone-600">
                              <Icons.Clock size={13} weight="bold" className="text-brand-600" />
                              {formatTimeRange(p.start_time, p.end_time)}
                            </span>
                            {(() => {
                              const tz = detectTimezoneFromLocation(p.lat, p.lng, p.address, p.name);
                              return (
                                <span className="inline-flex items-center text-[10px] font-bold text-brand-700 bg-brand-50 border border-brand-200/60 px-1.5 py-0.5 rounded-md uppercase tracking-wider">
                                  {tz}
                                </span>
                              );
                            })()}
                          </div>
                        ) : (
                          <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-stone-500 bg-stone-100/90 border border-stone-200/60 px-2 py-0.5 rounded-md">
                              <Icons.Clock size={12} weight="bold" className="text-stone-400" />
                              Sepanjang hari
                            </span>
                          </div>
                        )}

                        {/* Location Display & Google Maps Navigation */}
                        <div className="mt-2.5 flex items-start gap-1.5 flex-wrap">
                          {p.address ? (
                            <div className="flex items-start gap-1.5 flex-wrap max-w-full">
                              <a
                                href={getGoogleMapsDirectionsUrl(
                                  p.lat,
                                  p.lng,
                                  p.address,
                                  p.name,
                                  trip.destination
                                )}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 text-xs text-brand-700 bg-brand-50/90 hover:bg-brand-100 border border-brand-200 px-2.5 py-1.5 rounded-xl transition active:scale-95 group font-medium max-w-full break-words shadow-2xs"
                                title="Buka rute arah di Google Maps"
                              >
                                <Icons.MapPin
                                  size={13}
                                  weight="fill"
                                  className="text-rose-500 shrink-0 group-hover:scale-110 transition-transform mt-0.5 self-start"
                                />
                                <span className="break-words leading-relaxed">{p.address}</span>
                                <Icons.ArrowSquareOut
                                  size={12}
                                  weight="bold"
                                  className="text-brand-500 group-hover:text-brand-700 shrink-0 ml-0.5 self-center"
                                />
                              </a>

                              {canEdit && (
                                <button
                                  type="button"
                                  onClick={() => setLocationEditPlace(p)}
                                  className="grid h-7 w-7 place-items-center rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition shrink-0 mt-0.5"
                                  title="Ubah titik lokasi di peta"
                                >
                                  <Icons.PencilSimple size={13} />
                                </button>
                              )}
                            </div>
                          ) : (
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <a
                                href={getGoogleMapsDirectionsUrl(
                                  p.lat,
                                  p.lng,
                                  null,
                                  p.name,
                                  trip.destination
                                )}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-[11.5px] font-semibold text-brand-600 hover:text-brand-700 bg-brand-50/70 hover:bg-brand-100/70 px-2.5 py-1 rounded-xl border border-brand-200/70 transition active:scale-95 group"
                                title="Buka rute arah di Google Maps"
                              >
                                <Icons.MapPin size={12} weight="fill" className="text-rose-500" />
                                <span>Google Maps</span>
                                <Icons.ArrowSquareOut size={11} weight="bold" className="text-stone-400 group-hover:text-brand-600" />
                              </a>

                              {canEdit && (
                                <button
                                  type="button"
                                  onClick={() => setLocationEditPlace(p)}
                                  className="inline-flex items-center gap-1 text-[11.5px] font-semibold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 px-2.5 py-1 rounded-xl border border-rose-200 transition active:scale-95"
                                >
                                  <Icons.PencilSimple size={12} />
                                  <span>Set Peta</span>
                                </button>
                              )}
                            </div>
                          )}
                        </div>
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
                          {canEdit && (
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
                          )}
                        </div>
                      </div>
                    ) : null}

                    {/* ================= QUICK ADD ACTIONS: (+ Tambah Catatan / + Tambah Pengeluaran) ================= */}
                    {canEdit && (!p.notes || expensesList.length === 0) && !isEditingNote && (
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
                            tasks.map((t) => {
                              const canToggle = canToggleTask(t);
                              const canDelete = canDeleteTask(t);
                              const canSubtask = canAddSubtask(t);

                              return (
                                <div key={t.id} className="space-y-1.5 pt-1">
                                  {/* Parent Task Row */}
                                  <div className="flex items-center justify-between gap-2 group">
                                    <label
                                      className={clsx(
                                        "flex items-center gap-2 flex-1 min-w-0 flex-wrap sm:flex-nowrap",
                                        canToggle ? "cursor-pointer" : "cursor-default"
                                      )}
                                    >
                                      <input
                                        type="checkbox"
                                        checked={t.done}
                                        disabled={!canToggle || savingTaskId === t.id}
                                        onChange={(e) =>
                                          handleTaskToggle(p, t.id, e.target.checked)
                                        }
                                        className="rounded border-stone-300 text-brand-600 focus:ring-brand-500 disabled:opacity-50 shrink-0"
                                      />
                                      <span
                                        className={clsx(
                                          "text-[13px] font-medium leading-snug break-words",
                                          t.done
                                            ? "text-stone-400 line-through"
                                            : "text-stone-800"
                                        )}
                                      >
                                        {t.title}
                                      </span>

                                      {/* Assignee Badge */}
                                      {t.assigned_to === user?.id ? (
                                        <span className="inline-flex items-center gap-1 text-[10.5px] font-bold text-brand-700 bg-brand-50 border border-brand-200/80 px-2 py-0.5 rounded-full shrink-0">
                                          <Icons.User size={11} weight="bold" />
                                          <span>Saya</span>
                                        </span>
                                      ) : t.assigned_name ? (
                                        <span className="inline-flex items-center gap-1 text-[10.5px] font-medium text-stone-600 bg-stone-100 border border-stone-200/80 px-2 py-0.5 rounded-full shrink-0">
                                          <Icons.User size={11} />
                                          <span className="max-w-[110px] truncate">{t.assigned_name}</span>
                                        </span>
                                      ) : null}

                                      {/* Created by info if different */}
                                      {t.created_by && t.created_by !== t.assigned_to && t.created_by_name && (
                                        <span className="text-[10px] text-stone-400 italic hidden sm:inline truncate max-w-[100px]" title={`Dibuat oleh ${t.created_by_name}`}>
                                          (oleh {t.created_by === user?.id ? "Saya" : t.created_by_name})
                                        </span>
                                      )}
                                    </label>

                                    {/* Actions for parent task */}
                                    <div className="flex items-center gap-1 shrink-0 opacity-80 group-hover:opacity-100 transition">
                                      {canSubtask && (
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setAddingSubtaskForTaskId(
                                              addingSubtaskForTaskId === t.id ? null : t.id
                                            );
                                            setNewSubtaskTitle("");
                                          }}
                                          className="text-[10.5px] font-semibold text-brand-700 hover:text-brand-800 bg-brand-50 hover:bg-brand-100 px-2 py-0.5 rounded-lg border border-brand-200/60 transition active:scale-95"
                                          title="Tambah sub-tugas"
                                        >
                                          + Sub-tugas
                                        </button>
                                      )}
                                      {canDelete && (
                                        <button
                                          type="button"
                                          onClick={() => handleDeleteTask(p, t.id)}
                                          className="text-stone-300 hover:text-rose-600 p-1 rounded-md hover:bg-rose-50 transition active:scale-95"
                                          title="Hapus tugas"
                                        >
                                          <Icons.Trash size={13} />
                                        </button>
                                      )}
                                    </div>
                                  </div>

                                  {/* Subtasks List */}
                                  {((t.subtasks && t.subtasks.length > 0) || addingSubtaskForTaskId === t.id) && (
                                    <div className="pl-4 ml-2.5 border-l-2 border-stone-200/80 space-y-1.5 pt-0.5 pb-1">
                                      {(t.subtasks || []).map((st) => (
                                        <div
                                          key={st.id}
                                          className="flex items-center justify-between gap-2 group/st"
                                        >
                                          <label
                                            className={clsx(
                                              "flex items-center gap-2 flex-1 min-w-0",
                                              canToggle ? "cursor-pointer" : "cursor-default"
                                            )}
                                          >
                                            <input
                                              type="checkbox"
                                              checked={st.done}
                                              disabled={!canToggle || savingTaskId === st.id}
                                              onChange={(e) =>
                                                handleSubtaskToggle(p, t.id, st.id, e.target.checked)
                                              }
                                              className="rounded border-stone-300 text-brand-600 focus:ring-brand-500 disabled:opacity-50 h-3.5 w-3.5 shrink-0"
                                            />
                                            <span
                                              className={clsx(
                                                "text-[12px] leading-snug break-words",
                                                st.done
                                                  ? "text-stone-400 line-through"
                                                  : "text-stone-600"
                                              )}
                                            >
                                              {st.title}
                                            </span>
                                          </label>

                                          {canDelete && (
                                            <button
                                              type="button"
                                              onClick={() => handleDeleteSubtask(p, t.id, st.id)}
                                              className="text-stone-300 hover:text-rose-600 p-0.5 rounded transition opacity-50 group-hover/st:opacity-100"
                                              title="Hapus sub-tugas"
                                            >
                                              <Icons.Trash size={12} />
                                            </button>
                                          )}
                                        </div>
                                      ))}

                                      {/* Inline input to add a subtask */}
                                      {canSubtask && addingSubtaskForTaskId === t.id && (
                                        <div className="mt-1.5 flex items-center gap-1.5">
                                          <input
                                            type="text"
                                            value={newSubtaskTitle}
                                            onChange={(e) => setNewSubtaskTitle(e.target.value)}
                                            placeholder="Nama sub-tugas..."
                                            className="flex-1 rounded-lg border border-stone-200 bg-white px-2.5 py-1 text-[11.5px] text-stone-800 placeholder:text-stone-400 focus:border-brand-500 focus:outline-none"
                                            onKeyDown={(e) => {
                                              if (e.key === "Enter") {
                                                e.preventDefault();
                                                handleAddSubtask(p, t.id);
                                              } else if (e.key === "Escape") {
                                                setAddingSubtaskForTaskId(null);
                                                setNewSubtaskTitle("");
                                              }
                                            }}
                                            autoFocus
                                          />
                                          <button
                                            onClick={() => handleAddSubtask(p, t.id)}
                                            className="rounded-lg bg-brand-600 px-2.5 py-1 text-[11px] font-semibold text-white shadow-2xs hover:bg-brand-700"
                                          >
                                            Simpan
                                          </button>
                                          <button
                                            onClick={() => {
                                              setAddingSubtaskForTaskId(null);
                                              setNewSubtaskTitle("");
                                            }}
                                            className="rounded-lg px-1.5 py-1 text-[11px] text-stone-400 hover:text-stone-600"
                                          >
                                            Batal
                                          </button>
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>
                              );
                            })
                          )}

                          {/* Add task inline form (Available to Host, Editor, and Viewer) */}
                          {user && (
                            addingTaskForPlaceId === p.id ? (
                              <div className="mt-2.5 p-2.5 rounded-2xl bg-stone-50/90 border border-brand-200/80 space-y-2">
                                <input
                                  type="text"
                                  value={newTaskTitle}
                                  onChange={(e) => setNewTaskTitle(e.target.value)}
                                  placeholder={isHost ? "Nama tugas agenda..." : "Nama tugas pribadi Anda..."}
                                  className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-[12px] text-stone-800 placeholder:text-stone-400 focus:border-brand-500 focus:outline-none shadow-2xs"
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
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                  {isHost ? (
                                    <div className="flex items-center gap-1.5 min-w-0">
                                      <span className="text-[11px] text-stone-500 font-medium shrink-0">Tugaskan:</span>
                                      <select
                                        value={newTaskAssigneeId}
                                        onChange={(e) => setNewTaskAssigneeId(e.target.value)}
                                        className="rounded-xl border border-stone-200 bg-white px-2.5 py-1.5 text-[11.5px] font-semibold text-stone-700 focus:border-brand-500 focus:outline-none"
                                      >
                                        <option value={user.id}>👤 Diri sendiri (Host)</option>
                                        <option value="">🌐 Umum / Semua Anggota</option>
                                        {membersList
                                          .filter((m) => m.user_id !== user.id)
                                          .map((m) => (
                                            <option key={m.id} value={m.user_id || m.id}>
                                              👤 {m.name} ({m.role})
                                            </option>
                                          ))}
                                      </select>
                                    </div>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-brand-700 bg-brand-50 border border-brand-200/80 px-2.5 py-1 rounded-xl">
                                      <Icons.User size={12} weight="bold" />
                                      Tugas untuk: Diri Sendiri
                                    </span>
                                  )}

                                  <div className="flex items-center gap-1.5 ml-auto">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setAddingTaskForPlaceId(null);
                                        setNewTaskTitle("");
                                      }}
                                      className="rounded-xl px-2.5 py-1.5 text-[11.5px] font-medium text-stone-500 hover:text-stone-700"
                                    >
                                      Batal
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleAddTask(p)}
                                      className="rounded-xl bg-brand-600 px-3.5 py-1.5 text-[11.5px] font-bold text-white shadow-2xs hover:bg-brand-700 active:scale-95 transition"
                                    >
                                      Simpan
                                    </button>
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <button
                                onClick={() => {
                                  setAddingTaskForPlaceId(p.id);
                                  setNewTaskTitle("");
                                  setNewTaskAssigneeId(user?.id || "");
                                }}
                                className="text-[12px] text-brand-600 font-semibold hover:text-brand-700 hover:underline mt-2 flex items-center gap-1"
                              >
                                <Icons.Plus size={13} weight="bold" />
                                <span>{isHost ? "Tambah tugas" : "Tambah tugas saya"}</span>
                              </button>
                            )
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Inline timeline button to add place */}
            {canEdit && (
              <div className="relative pl-8 pt-1">
                <span className="absolute -left-[13px] top-2.5 grid h-6 w-6 place-items-center rounded-full bg-brand-100 text-brand-700 shadow-2xs ring-4 ring-white">
                  <Icons.Plus size={12} weight="bold" />
                </span>
                <AddPlaceModal
                  dayId={day.id}
                  dayNumber={selectedDayIdx + 1}
                  tripId={trip.id}
                  buttonVariant="dashed"
                  buttonText={`Tambah Agenda (Hari ke-${selectedDayIdx + 1})`}
                  onPlaceAdded={handlePlaceAdded}
                />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Floating Action Button (FAB) for quick 1-tap addition */}
      {canEdit && (
        <AddPlaceModal
          dayId={day.id}
          dayNumber={selectedDayIdx + 1}
          tripId={trip.id}
          buttonVariant="fab"
          buttonText="Tambah Agenda"
          onPlaceAdded={handlePlaceAdded}
        />
      )}

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
      {/* ================= MODAL: DELETE PLACE CONFIRMATION ================= */}
      {mounted &&
        placeToDelete &&
        createPortal(
          <div className="fixed inset-0 z-[10005] flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-sm animate-in fade-in duration-200">
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
                    Hapus Agenda?
                  </h3>
                  <p className="text-[12px] text-stone-500 mt-1 leading-relaxed">
                    Apakah Anda yakin ingin menghapus agenda{" "}
                    <span className="font-semibold text-stone-800">
                      "{placeToDelete.name}"
                    </span>
                    ? Seluruh catatan, tugas, dan pengeluaran terkait agenda ini akan ikut dihapus.
                  </p>
                </div>
              </div>

              <div className="mt-5 flex items-center justify-end gap-2">
                <button
                  type="button"
                  disabled={isDeletingPlace}
                  onClick={() => setPlaceToDelete(null)}
                  className="h-10 px-4 rounded-xl text-stone-600 text-xs font-semibold hover:bg-stone-100 transition disabled:opacity-50"
                >
                  Batal
                </button>
                <button
                  type="button"
                  disabled={isDeletingPlace}
                  onClick={handleConfirmDeletePlace}
                  className="h-10 px-4 rounded-xl bg-rose-600 text-white text-xs font-bold hover:bg-rose-700 shadow-sm transition flex items-center gap-1.5 active:scale-95 disabled:opacity-50"
                >
                  {isDeletingPlace ? (
                    <>
                      <Icons.CircleNotch size={14} className="animate-spin" />
                      <span>Menghapus...</span>
                    </>
                  ) : (
                    <>
                      <Icons.Trash size={14} weight="bold" />
                      <span>Hapus Agenda</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* ================= MODAL: EDIT PLACE / AGENDA ================= */}
      {editingPlace && (
        <EditPlaceModal
          place={editingPlace}
          isOpen={Boolean(editingPlace)}
          onClose={() => setEditingPlace(null)}
          tripId={trip.id}
          days={days}
          currentDayId={day.id}
          onPlaceUpdated={handlePlaceUpdated}
          members={membersList}
          currentUser={user}
        />
      )}

      {/* ================= MODAL: AI EXTRACT ITINERARY ================= */}
      <AiExtractItineraryModal
        trip={trip}
        isOpen={isAiExtractModalOpen}
        onClose={() => setIsAiExtractModalOpen(false)}
        onImportSuccess={() => {
          showToast("Itinerary berhasil diimpor!");
          router.refresh();
        }}
      />
    </div>
  );
}
