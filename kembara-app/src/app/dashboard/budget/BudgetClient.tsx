"use client";

import { useState, useCallback, useMemo, useEffect } from "react";
import type { Expense, ItineraryDay, Trip, ExchangeRecord } from "@/types";
import {
  Wallet,
  Coins,
  ArrowsLeftRight,
  PencilSimple,
  Plus,
  Trash,
  CalendarBlank,
  ChartPieSlice,
  Receipt,
  CheckCircle,
  Warning,
  X,
  CircleNotch,
  MagnifyingGlass,
  ArrowRight,
  Globe,
  Sparkle,
  Eye,
} from "@phosphor-icons/react";
import { canEditTrip, isTripHost } from "@/types";
import { createClient } from "@/utils/supabase/client";
import { createPortal } from "react-dom";
import {
  formatMoney,
  EXPENSE_CATEGORIES,
  AVAILABLE_CURRENCIES,
  detectDestinationCurrencies,
} from "@/lib/geo";
import { format, parseISO } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import AddExpenseModal from "./AddExpenseModal";
import TripSwitcher from "@/components/TripSwitcher";
import UserProfileMenu from "@/components/UserProfileMenu";

interface Props {
  trip: Trip;
  initialExpenses: Expense[];
  days: ItineraryDay[];
  allTrips?: Trip[];
  user?: any;
}

// Default benchmark exchange rates against IDR for common travel currencies
const DEFAULT_RATES: Record<string, string> = {
  SAR: "4250",
  TRY: "450",
  AED: "4350",
  EGP: "330",
  JOD: "22500",
  USD: "16000",
  EUR: "17200",
  MYR: "3600",
  SGD: "12000",
  GBP: "20500",
  JPY: "105",
  QAR: "4400",
  OMR: "41500",
  KWD: "52000",
  AUD: "10400",
  CNY: "2200",
};

export default function BudgetClient({
  trip: initialTrip,
  initialExpenses,
  days,
  allTrips = [],
  user,
}: Props) {
  const [trip, setTrip] = useState<Trip>(initialTrip);
  const isHost = isTripHost(trip.current_user_role, user?.id, trip.user_id);
  const canEdit = canEditTrip(trip.current_user_role) || isHost;
  const [expenses, setExpenses] = useState<Expense[]>(initialExpenses);
  const [activeTab, setActiveTab] = useState<
    "overview" | "categories" | "daily" | "transactions" | "exchange"
  >("overview");

  // Filter & Search state in transactions view
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState("all");

  // Modals state
  const [isEditBudgetOpen, setIsEditBudgetOpen] = useState(false);
  const [isExchangeModalOpen, setIsExchangeModalOpen] = useState(false);
  const [expenseToDelete, setExpenseToDelete] = useState<Expense | null>(null);
  const [exchangeToDelete, setExchangeToDelete] = useState<ExchangeRecord | null>(null);

  // Dynamic Destination Currencies
  const destinationCurrencies = useMemo(() => {
    const expenseCurrencies = expenses
      .map((e) => e.currency || "IDR")
      .filter((c) => c !== "IDR");
    const savedCustom = (trip.category_budgets_json?.currencies as string[]) || [];
    return detectDestinationCurrencies(trip.destination, expenseCurrencies, savedCustom);
  }, [trip.destination, trip.category_budgets_json, expenses]);

  // Foreign Pocket Budgets map
  const foreignBudgetsMap: Record<string, number> = useMemo(() => {
    const map = (trip.category_budgets_json?.foreign_budgets as Record<string, number>) || {};
    if (trip.budget_sar && !map["SAR"]) {
      map["SAR"] = Number(trip.budget_sar);
    }
    return map;
  }, [trip.category_budgets_json, trip.budget_sar]);

  // Edit Budget Form State
  const [budgetIDRDraft, setBudgetIDRDraft] = useState(
    trip.total_budget ? trip.total_budget.toString() : "0"
  );
  const [foreignBudgetsDraft, setForeignBudgetsDraft] = useState<Record<string, string>>({});
  const [activeCurrenciesDraft, setActiveCurrenciesDraft] = useState<string[]>([]);
  const [selectedNewCurrency, setSelectedNewCurrency] = useState<string>("");

  const [categoryBudgetsDraft, setCategoryBudgetsDraft] = useState<Record<string, string>>({});
  const [savingBudget, setSavingBudget] = useState(false);

  // Money Exchange Form State
  const [exchangeFromCurrency, setExchangeFromCurrency] = useState("IDR");
  const [exchangeToCurrency, setExchangeToCurrency] = useState("SAR");
  const [exchangeFromAmount, setExchangeFromAmount] = useState("");
  const [exchangeRate, setExchangeRate] = useState("4250");
  const [exchangeDate, setExchangeDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [exchangeNotes, setExchangeNotes] = useState("");
  const [savingExchange, setSavingExchange] = useState(false);

  // Toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Sync state when initialTrip or initialExpenses prop changes (e.g., via trip switcher)
  useEffect(() => {
    setTrip(initialTrip);
    setExpenses(initialExpenses);
    setBudgetIDRDraft(initialTrip.total_budget ? initialTrip.total_budget.toString() : "0");

    const destCurrs = detectDestinationCurrencies(
      initialTrip.destination,
      initialExpenses.map((e) => e.currency || "IDR").filter((c) => c !== "IDR"),
      (initialTrip.category_budgets_json?.currencies as string[]) || []
    );
    setActiveCurrenciesDraft(destCurrs);

    const fMap = (initialTrip.category_budgets_json?.foreign_budgets as Record<string, number>) || {};
    if (initialTrip.budget_sar && !fMap["SAR"]) {
      fMap["SAR"] = Number(initialTrip.budget_sar);
    }

    const fDraft: Record<string, string> = {};
    destCurrs.forEach((c) => {
      fDraft[c] = fMap[c] ? fMap[c].toString() : "0";
    });
    setForeignBudgetsDraft(fDraft);

    // Initial exchange to currency
    if (destCurrs.length > 0) {
      setExchangeToCurrency(destCurrs[0]);
      setExchangeRate(DEFAULT_RATES[destCurrs[0]] || "1");
    }

    const existing = initialTrip.category_budgets_json || {};
    const init: Record<string, string> = {};
    EXPENSE_CATEGORIES.forEach((cat) => {
      init[cat.id] = existing[cat.id] ? existing[cat.id].toString() : "";
    });
    setCategoryBudgetsDraft(init);
  }, [initialTrip, initialExpenses]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((cur) => (cur === msg ? null : cur));
    }, 3500);
  };

  const handleExpenseAdded = useCallback((newExpense: Expense) => {
    setExpenses((prev) => [newExpense, ...prev]);
    showToast("Pengeluaran berhasil dicatat.");
  }, []);

  // Exchange Records
  const exchangeRecords = useMemo(
    () => trip.exchange_records_json || [],
    [trip.exchange_records_json]
  );

  // Total IDR exchanged to ANY foreign currency
  const totalIDRExchanged = useMemo(() => {
    return exchangeRecords
      .filter((r) => r.fromCurrency === "IDR")
      .reduce((sum, r) => sum + Number(r.fromAmount || 0), 0);
  }, [exchangeRecords]);

  // Helper: Total received for a specific currency
  const getForeignReceivedFromExchange = useCallback(
    (currencyCode: string) => {
      return exchangeRecords
        .filter((r) => r.toCurrency === currencyCode)
        .reduce((sum, r) => sum + Number(r.toAmount || 0), 0);
    },
    [exchangeRecords]
  );

  // Helper: Total spent in a specific currency
  const getSpentInCurrency = useCallback(
    (currencyCode: string) => {
      return expenses
        .filter((e) => (e.currency || "IDR") === currencyCode)
        .reduce((sum, e) => sum + Number(e.amount || 0), 0);
    },
    [expenses]
  );

  // Calculations for Primary IDR Wallet
  const budgetIDR = Number(trip.total_budget || 0);
  const spentIDR = getSpentInCurrency("IDR");
  const totalDeductedIDR = spentIDR + totalIDRExchanged;
  const remainingIDR = budgetIDR - totalDeductedIDR;
  const usedPctIDR =
    budgetIDR > 0 ? Math.min((totalDeductedIDR / budgetIDR) * 100, 100) : 0;

  // Save Budget Allocations
  const handleSaveBudget = async () => {
    setSavingBudget(true);
    const numIDR = Number(budgetIDRDraft.replace(/[^0-9]/g, "")) || 0;

    const foreignNums: Record<string, number> = {};
    Object.entries(foreignBudgetsDraft).forEach(([cur, val]) => {
      const num = Number(val.replace(/[^0-9]/g, "")) || 0;
      foreignNums[cur] = num;
    });

    const catBudgets: Record<string, number> = {};
    Object.entries(categoryBudgetsDraft).forEach(([k, v]) => {
      const num = Number(v.replace(/[^0-9]/g, "")) || 0;
      if (num > 0) catBudgets[k] = num;
    });

    try {
      const supabase = createClient();
      const payloadCategoryBudgets = {
        ...catBudgets,
        foreign_budgets: foreignNums,
        currencies: activeCurrenciesDraft,
      };

      const { error } = await supabase
        .from("trips")
        .update({
          total_budget: numIDR,
          budget_sar: foreignNums["SAR"] || 0,
          category_budgets_json: payloadCategoryBudgets,
        })
        .eq("id", trip.id);

      if (error) {
        await supabase
          .from("trips")
          .update({ total_budget: numIDR })
          .eq("id", trip.id);
      }

      setTrip((prev) => ({
        ...prev,
        total_budget: numIDR,
        budget_sar: foreignNums["SAR"] || 0,
        category_budgets_json: payloadCategoryBudgets,
      }));

      setIsEditBudgetOpen(false);
      showToast("Alokasi target budget berhasil disimpan.");
    } catch (err) {
      console.error("Gagal menyimpan target budget:", err);
      showToast("Gagal menyimpan target budget.");
    } finally {
      setSavingBudget(false);
    }
  };

  // Save Money Exchange Record
  const handleSaveExchange = async () => {
    const fromClean = Number(exchangeFromAmount.replace(/[^0-9]/g, "")) || 0;
    const rateClean = Number(exchangeRate) || 1;

    if (!fromClean || fromClean <= 0) {
      showToast("Nominal penukaran harus lebih dari 0.");
      return;
    }

    setSavingExchange(true);
    const toAmountClean = fromClean / rateClean;

    const newRecord: ExchangeRecord = {
      id: `exc_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      fromCurrency: exchangeFromCurrency,
      toCurrency: exchangeToCurrency,
      fromAmount: fromClean,
      toAmount: toAmountClean,
      rate: rateClean,
      date: exchangeDate,
      notes: exchangeNotes.trim() || undefined,
    };

    const updatedRecords = [newRecord, ...exchangeRecords];

    try {
      const supabase = createClient();
      const { error } = await supabase
        .from("trips")
        .update({ exchange_records_json: updatedRecords })
        .eq("id", trip.id);

      if (error) throw error;

      setTrip((prev) => ({
        ...prev,
        exchange_records_json: updatedRecords,
      }));

      setIsExchangeModalOpen(false);
      setExchangeFromAmount("");
      setExchangeNotes("");
      showToast(`Penukaran uang ${exchangeFromCurrency} ➔ ${exchangeToCurrency} berhasil dicatat.`);
    } catch (err) {
      console.error("Gagal mencatat penukaran uang:", err);
      showToast("Gagal menyimpan penukaran uang.");
    } finally {
      setSavingExchange(false);
    }
  };

  // Delete Expense
  const handleConfirmDeleteExpense = async () => {
    if (!expenseToDelete) return;
    const expId = expenseToDelete.id;

    setExpenses((prev) => prev.filter((e) => e.id !== expId));
    setExpenseToDelete(null);

    try {
      const supabase = createClient();
      await supabase.from("expenses").delete().eq("id", expId);
      showToast("Pengeluaran berhasil dihapus.");
    } catch (err) {
      console.error("Gagal menghapus pengeluaran:", err);
      showToast("Gagal menghapus pengeluaran.");
    }
  };

  // Delete Exchange Record
  const handleConfirmDeleteExchange = async () => {
    if (!exchangeToDelete) return;
    const excId = exchangeToDelete.id;

    const updated = exchangeRecords.filter((r) => r.id !== excId);
    setTrip((prev) => ({
      ...prev,
      exchange_records_json: updated,
    }));
    setExchangeToDelete(null);

    try {
      const supabase = createClient();
      await supabase
        .from("trips")
        .update({ exchange_records_json: updated })
        .eq("id", trip.id);
      showToast("Catatan penukaran uang dihapus.");
    } catch (err) {
      console.error("Gagal menghapus penukaran:", err);
      showToast("Gagal menghapus penukaran.");
    }
  };

  // Category breakdown calculation
  const categoryBreakdown = useMemo(() => {
    const catBudgets = trip.category_budgets_json || {};
    return EXPENSE_CATEGORIES.map((cat) => {
      const target = Number(catBudgets[cat.id] || 0);
      const catExpenses = expenses.filter((e) => e.category === cat.id);

      // Group spent by currency in this category
      const spentByCurrency: Record<string, number> = {};
      catExpenses.forEach((e) => {
        const c = e.currency || "IDR";
        spentByCurrency[c] = (spentByCurrency[c] || 0) + Number(e.amount || 0);
      });

      return {
        ...cat,
        target,
        spentByCurrency,
        count: catExpenses.length,
      };
    });
  }, [trip.category_budgets_json, expenses]);

  // Daily Expense grouping
  const dailyExpenses = useMemo(() => {
    return days.map((d) => {
      const dayDate = d.date ? format(parseISO(d.date), "yyyy-MM-dd") : null;
      const dayExps = expenses.filter((e) => {
        if (!e.date || !dayDate) return false;
        return e.date === dayDate;
      });

      // Sum spent across each currency
      const sumByCurrency: Record<string, number> = {};
      dayExps.forEach((e) => {
        const cur = e.currency || "IDR";
        sumByCurrency[cur] = (sumByCurrency[cur] || 0) + Number(e.amount || 0);
      });

      return {
        ...d,
        expenses: dayExps,
        sumByCurrency,
      };
    });
  }, [days, expenses]);

  // Filtered transactions
  const filteredExpenses = useMemo(() => {
    return expenses.filter((e) => {
      const matchCat =
        selectedCategoryFilter === "all" || e.category === selectedCategoryFilter;
      const matchQuery =
        !searchQuery.trim() ||
        (e.description &&
          e.description.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchCat && matchQuery;
    });
  }, [expenses, searchQuery, selectedCategoryFilter]);

  // Add a new currency to the draft list
  const handleAddNewCurrency = () => {
    if (!selectedNewCurrency || activeCurrenciesDraft.includes(selectedNewCurrency)) return;
    setActiveCurrenciesDraft((prev) => [...prev, selectedNewCurrency]);
    setForeignBudgetsDraft((prev) => ({ ...prev, [selectedNewCurrency]: "0" }));
    setSelectedNewCurrency("");
  };

  const handleRemoveCurrency = (cur: string) => {
    setActiveCurrenciesDraft((prev) => prev.filter((c) => c !== cur));
    setForeignBudgetsDraft((prev) => {
      const updated = { ...prev };
      delete updated[cur];
      return updated;
    });
  };

  return (
    <div className="flex flex-col h-full overflow-y-auto pb-28 lg:pb-10 hide-scroll">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-[99999] flex items-center gap-2 rounded-2xl bg-stone-900/90 text-white px-4 py-3 text-xs shadow-2xl backdrop-blur-md animate-in fade-in slide-in-from-top-4 duration-300">
          <CheckCircle size={18} weight="fill" className="text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Compact Mobile-First Trip Header */}
      <header className="sticky top-0 z-[1100] bg-white/70 backdrop-blur-xl border-b border-white/70 px-4 py-2.5 sm:px-6 lg:px-10 shrink-0">
        <div className="flex items-center justify-between gap-3 mb-2">
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

          {/* Quick Actions & User Profile Menu */}
          <div className="shrink-0 flex items-center gap-2">
            {canEdit ? (
              <>
                <button
                  type="button"
                  onClick={() => setIsExchangeModalOpen(true)}
                  className="hidden sm:inline-flex items-center gap-1.5 rounded-xl bg-white border border-brand-200 px-3 py-1.5 text-xs font-bold text-brand-700 shadow-xs transition hover:bg-brand-50 active:scale-95"
                >
                  <ArrowsLeftRight size={14} weight="bold" />
                  <span>Tukar Uang</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setBudgetIDRDraft(trip.total_budget ? trip.total_budget.toString() : "0");
                    const fMap = (trip.category_budgets_json?.foreign_budgets as Record<string, number>) || {};
                    const fDraft: Record<string, string> = {};
                    destinationCurrencies.forEach((c) => {
                      fDraft[c] = fMap[c] ? fMap[c].toString() : (c === "SAR" && trip.budget_sar ? trip.budget_sar.toString() : "0");
                    });
                    setForeignBudgetsDraft(fDraft);
                    setActiveCurrenciesDraft(destinationCurrencies);
                    setIsEditBudgetOpen(true);
                  }}
                  className="hidden md:inline-flex items-center gap-1.5 rounded-xl bg-white border border-stone-200 px-3 py-1.5 text-xs font-bold text-stone-700 shadow-xs transition hover:bg-stone-50 active:scale-95"
                >
                  <PencilSimple size={14} weight="bold" />
                  <span>Target Budget</span>
                </button>

                <AddExpenseModal
                  tripId={trip.id}
                  onExpenseAdded={handleExpenseAdded}
                />
              </>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-xl bg-stone-100 border border-stone-200 px-3 py-1.5 text-xs font-semibold text-stone-600 shadow-xs">
                <Eye size={14} weight="bold" />
                <span className="hidden sm:inline">Mode Lihat Saja</span>
              </span>
            )}

            <UserProfileMenu user={user} />
          </div>
        </div>

        {/* Navigation Tabs with scroll hint */}
        <div className="relative mt-2.5 border-t border-stone-100 pt-2.5">
          <div className="flex gap-1.5 overflow-x-auto pb-1 hide-scroll">
            {[
              { id: "overview", label: "Dompet & Ringkasan", icon: Wallet },
              { id: "categories", label: "Pos Kategori", icon: ChartPieSlice },
              { id: "daily", label: "Laporan Harian", icon: CalendarBlank },
              { id: "transactions", label: `Transaksi (${expenses.length})`, icon: Receipt },
              { id: "exchange", label: `Tukar Uang (${exchangeRecords.length})`, icon: ArrowsLeftRight },
            ].map((tab) => {
              const IconComp = tab.icon;
              const isSelected = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-bold transition whitespace-nowrap flex items-center gap-1.5 ${
                    isSelected
                      ? "bg-brand-600 text-white shadow-sm"
                      : "bg-white/80 border border-stone-200 text-stone-600 hover:bg-brand-50 active:scale-95"
                  }`}
                >
                  <IconComp size={14} weight={isSelected ? "bold" : "regular"} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="px-5 pt-6 lg:px-10 space-y-6 pb-12">
        {/* ================= SECTION: DYNAMIC MULTI-WALLET CARDS ================= */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* 1. Dompet Utama (IDR Wallet) */}
          <div className="rounded-3xl bg-gradient-to-br from-indigo-700 via-indigo-800 to-indigo-950 p-5 sm:p-6 text-white shadow-xl relative overflow-hidden flex flex-col justify-between">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-lg">🇮🇩</span>
                  <span className="text-xs font-bold uppercase tracking-wider text-indigo-200">
                    Dompet Utama (IDR)
                  </span>
                </div>
                <p className="text-[26px] sm:text-[30px] font-extrabold mt-1 tracking-tight">
                  {formatMoney(remainingIDR, "IDR")}
                </p>
                <p className="text-[11px] text-indigo-200">
                  Sisa Saldo Rupiah Tersedia
                </p>
              </div>

              <span
                className={`text-[11px] px-2.5 py-1 rounded-full font-bold shadow-sm ${
                  remainingIDR < 0
                    ? "bg-rose-500/90 text-white"
                    : usedPctIDR > 80
                    ? "bg-amber-400 text-amber-950"
                    : "bg-emerald-400/30 text-emerald-200 border border-emerald-400/40"
                }`}
              >
                {remainingIDR < 0
                  ? "Overbudget ⚠️"
                  : usedPctIDR > 80
                  ? "Waspada (>80%)"
                  : "Aman 🟢"}
              </span>
            </div>

            {/* Progress Bar IDR */}
            <div className="mt-5">
              <div className="h-2 rounded-full bg-white/20 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    remainingIDR < 0 ? "bg-rose-400" : "bg-emerald-300"
                  }`}
                  style={{ width: `${usedPctIDR}%` }}
                />
              </div>

              <div className="mt-2.5 flex items-center justify-between text-xs text-indigo-100">
                <span>
                  Alokasi:{" "}
                  <strong className="text-white">
                    {formatMoney(budgetIDR, "IDR")}
                  </strong>
                </span>
                <span>
                  Terpakai:{" "}
                  <strong className="text-white">
                    {formatMoney(totalDeductedIDR, "IDR")} ({Math.round(usedPctIDR)}%)
                  </strong>
                </span>
              </div>

              {totalIDRExchanged > 0 && (
                <p className="text-[10.5px] text-indigo-300 mt-1">
                  * Termasuk {formatMoney(totalIDRExchanged, "IDR")} yang ditukar ke mata uang asing.
                </p>
              )}
            </div>
          </div>

          {/* 2. Dynamic Destination Currency Wallets (SAR, TRY, USD, AED, EGP, etc.) */}
          {destinationCurrencies.map((currCode) => {
            const currMeta =
              AVAILABLE_CURRENCIES.find((c) => c.code === currCode) || {
                code: currCode,
                label: currCode,
                symbol: currCode,
                country: currCode,
                flag: "🌍",
              };

            const initialPocketBudget = foreignBudgetsMap[currCode] || 0;
            const receivedFromExchange = getForeignReceivedFromExchange(currCode);
            const totalAvailable = initialPocketBudget + receivedFromExchange;
            const spent = getSpentInCurrency(currCode);
            const remaining = totalAvailable - spent;
            const usedPct =
              totalAvailable > 0 ? Math.min((spent / totalAvailable) * 100, 100) : 0;

            // Palette per currency
            const isSAR = currCode === "SAR";
            const isTRY = currCode === "TRY";
            const isAED = currCode === "AED";

            const bgGradient = isSAR
              ? "from-emerald-700 via-emerald-800 to-teal-950"
              : isTRY
              ? "from-rose-700 via-rose-800 to-stone-900"
              : isAED
              ? "from-amber-700 via-amber-800 to-stone-900"
              : "from-teal-700 via-teal-800 to-stone-900";

            return (
              <div
                key={currCode}
                className={`rounded-3xl bg-gradient-to-br ${bgGradient} p-5 sm:p-6 text-white shadow-xl relative overflow-hidden flex flex-col justify-between`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-lg">{currMeta.flag}</span>
                      <span className="text-xs font-bold uppercase tracking-wider text-white/80">
                        Dompet {currMeta.country} ({currCode})
                      </span>
                    </div>
                    <p className="text-[26px] sm:text-[30px] font-extrabold mt-1 tracking-tight">
                      {formatMoney(remaining, currCode)}
                    </p>
                    <p className="text-[11px] text-white/70">
                      Sisa Saldo Kas / Uang Saku {currCode}
                    </p>
                  </div>

                  <span
                    className={`text-[11px] px-2.5 py-1 rounded-full font-bold shadow-sm ${
                      remaining < 0
                        ? "bg-rose-500/90 text-white"
                        : usedPct > 80
                        ? "bg-amber-400 text-amber-950"
                        : "bg-white/20 text-white border border-white/30"
                    }`}
                  >
                    {remaining < 0
                      ? "Overbudget ⚠️"
                      : usedPct > 80
                      ? "Waspada (>80%)"
                      : "Aman 🟢"}
                  </span>
                </div>

                {/* Progress Bar */}
                <div className="mt-5">
                  <div className="h-2 rounded-full bg-white/20 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        remaining < 0 ? "bg-rose-400" : "bg-emerald-300"
                      }`}
                      style={{ width: `${usedPct}%` }}
                    />
                  </div>

                  <div className="mt-2.5 flex items-center justify-between text-xs text-white/80">
                    <span>
                      Total Kas {currCode}:{" "}
                      <strong className="text-white">
                        {formatMoney(totalAvailable, currCode)}
                      </strong>
                    </span>
                    <span>
                      Terpakai:{" "}
                      <strong className="text-white">
                        {formatMoney(spent, currCode)} ({Math.round(usedPct)}%)
                      </strong>
                    </span>
                  </div>

                  {receivedFromExchange > 0 && (
                    <p className="text-[10.5px] text-emerald-200 mt-1">
                      * Termasuk +{formatMoney(receivedFromExchange, currCode)} dari hasil penukaran rupiah.
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* ================= VIEW 1: OVERVIEW & RINGKASAN POS KATEGORI ================= */}
        {activeTab === "overview" && (
          <div className="space-y-6">
            {/* Quick Summary Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="rounded-2xl bg-white border border-stone-200/80 p-4 shadow-sm">
                <span className="text-[11px] font-bold text-stone-400 uppercase">
                  Total Transaksi
                </span>
                <p className="text-xl font-bold text-stone-900 mt-1">
                  {expenses.length} Transaksi
                </p>
              </div>

              <div className="rounded-2xl bg-white border border-stone-200/80 p-4 shadow-sm">
                <span className="text-[11px] font-bold text-stone-400 uppercase">
                  Realisasi IDR
                </span>
                <p className="text-xl font-bold text-indigo-700 mt-1 truncate">
                  {formatMoney(spentIDR, "IDR")}
                </p>
              </div>

              {destinationCurrencies.slice(0, 2).map((c) => (
                <div key={c} className="rounded-2xl bg-white border border-stone-200/80 p-4 shadow-sm">
                  <span className="text-[11px] font-bold text-stone-400 uppercase">
                    Realisasi {c}
                  </span>
                  <p className="text-xl font-bold text-emerald-700 mt-1 truncate">
                    {formatMoney(getSpentInCurrency(c), c)}
                  </p>
                </div>
              ))}
            </div>

            {/* Quick Categories Preview */}
            <div className="rounded-3xl bg-white border border-stone-200/80 p-5 sm:p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-base font-bold text-stone-900">
                    Pos Alokasi &amp; Pengeluaran per Kategori
                  </h3>
                  <p className="text-xs text-stone-500">
                    Target plafon vs realisasi belanja
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab("categories")}
                  className="text-xs font-bold text-brand-600 hover:text-brand-700 transition"
                >
                  Lihat Detail Kategori →
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {categoryBreakdown.map((cat) => {
                  const hasSpent = Object.keys(cat.spentByCurrency).length > 0;
                  const spentFormatted = Object.entries(cat.spentByCurrency)
                    .map(([cur, amt]) => formatMoney(amt, cur))
                    .join(" + ") || "Rp 0";

                  return (
                    <div
                      key={cat.id}
                      className="rounded-2xl bg-stone-50/70 border border-stone-200/80 p-3.5 space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2 py-0.5 rounded-lg text-[11px] font-bold ${cat.color}`}
                          >
                            {cat.label}
                          </span>
                          <span className="text-[11px] text-stone-400">
                            {cat.count} transaksi
                          </span>
                        </div>
                        <span className="text-xs font-bold text-stone-800">
                          {spentFormatted}
                        </span>
                      </div>

                      {cat.target > 0 && (
                        <div className="text-[11px] text-stone-500 flex items-center justify-between pt-1 border-t border-stone-200/60">
                          <span>Target: {formatMoney(cat.target, "IDR")}</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ================= VIEW 2: POS KATEGORI LENGKAP ================= */}
        {activeTab === "categories" && (
          <div className="rounded-3xl bg-white border border-stone-200/80 p-5 sm:p-6 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-bold text-stone-900">
                  Target Pos Kategori vs Realisasi Pengeluaran
                </h3>
                <p className="text-xs text-stone-500">
                  Pantau batas anggaran per kategori kegiatan
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsEditBudgetOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-xl bg-brand-50 hover:bg-brand-100 text-brand-700 px-3.5 py-1.5 text-xs font-bold transition"
              >
                <PencilSimple size={14} weight="bold" />
                Atur Target Pos
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
              {categoryBreakdown.map((cat) => {
                const spentFormatted = Object.entries(cat.spentByCurrency)
                  .map(([cur, amt]) => formatMoney(amt, cur))
                  .join(" + ") || "Rp 0";

                return (
                  <div
                    key={cat.id}
                    className="rounded-2xl border border-stone-200 bg-stone-50/50 p-4 space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className={`w-3 h-3 rounded-full ${cat.dotColor}`} />
                        <span className="text-sm font-bold text-stone-900">
                          {cat.label}
                        </span>
                      </div>
                      <span className="text-xs font-semibold text-stone-500">
                        {cat.count} Transaksi
                      </span>
                    </div>

                    <div className="rounded-xl bg-white p-3 border border-stone-200/80 space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-stone-500">Total Realisasi:</span>
                        <span className="font-bold text-emerald-700">
                          {spentFormatted}
                        </span>
                      </div>
                      {cat.target > 0 && (
                        <div className="flex items-center justify-between text-xs pt-1 border-t border-stone-100">
                          <span className="text-stone-500">Plafon Target:</span>
                          <span className="font-bold text-stone-800">
                            {formatMoney(cat.target, "IDR")}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ================= VIEW 3: LAPORAN PENGELUARAN HARIAN ================= */}
        {activeTab === "daily" && (
          <div className="rounded-3xl bg-white border border-stone-200/80 p-5 sm:p-6 shadow-sm space-y-4">
            <div>
              <h3 className="text-base font-bold text-stone-900">
                Laporan Pengeluaran Harian
              </h3>
              <p className="text-xs text-stone-500">
                Rincian transaksi yang dikelompokkan per hari itinerary
              </p>
            </div>

            {dailyExpenses.length === 0 ? (
              <div className="py-12 text-center text-stone-400 text-xs">
                Belum ada hari itinerary yang ditambahkan ke perjalanan ini.
              </div>
            ) : (
              <div className="space-y-4">
                {dailyExpenses.map((d) => {
                  const dayDateFormatted = d.date
                    ? format(parseISO(d.date), "EEEE, d MMMM yyyy", {
                        locale: idLocale,
                      })
                    : "Tanggal belum diatur";

                  const sumFormatted = Object.entries(d.sumByCurrency)
                    .map(([cur, amt]) => formatMoney(amt, cur))
                    .join(" + ");

                  return (
                    <div
                      key={d.id}
                      className="rounded-2xl border border-stone-200 bg-stone-50/60 p-4 space-y-3"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 pb-2 border-b border-stone-200/70">
                        <div>
                          <span className="text-xs font-bold text-brand-700 uppercase tracking-wider">
                            Hari ke-{d.day_number}
                          </span>
                          <h4 className="text-sm font-bold text-stone-900 mt-0.5">
                            {dayDateFormatted}
                          </h4>
                          {d.notes && (
                            <p className="text-[11px] text-stone-500 mt-0.5">
                              {d.notes}
                            </p>
                          )}
                        </div>

                        <div className="text-left sm:text-right mt-1 sm:mt-0">
                          <span className="text-[10.5px] font-semibold text-stone-400 block">
                            Subtotal Hari Ini:
                          </span>
                          <span className="text-xs font-bold text-emerald-700">
                            {sumFormatted || "Rp 0"}
                          </span>
                        </div>
                      </div>

                      {/* Day's Expenses List */}
                      {d.expenses.length === 0 ? (
                        <p className="text-xs text-stone-400 italic py-1">
                          Tidak ada pengeluaran pada tanggal ini.
                        </p>
                      ) : (
                        <div className="space-y-1.5">
                          {d.expenses.map((exp) => {
                            const catObj =
                              EXPENSE_CATEGORIES.find((c) => c.id === exp.category) ||
                              EXPENSE_CATEGORIES[6];

                            return (
                              <div
                                key={exp.id}
                                className="flex items-center justify-between rounded-xl bg-white border border-stone-200/80 p-2.5 text-xs hover:border-brand-200 transition group"
                              >
                                <div className="flex items-center gap-2 min-w-0 flex-1">
                                  <span
                                    className={`shrink-0 rounded-md px-2 py-0.5 text-[9.5px] font-bold ${catObj.color}`}
                                  >
                                    {catObj.label}
                                  </span>
                                  <span className="font-semibold text-stone-800 truncate">
                                    {exp.description}
                                  </span>
                                </div>

                                <div className="flex items-center gap-2 shrink-0 ml-2">
                                  <span className="font-bold text-emerald-700">
                                    {formatMoney(
                                      Number(exp.amount),
                                      exp.currency || "IDR"
                                    )}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => setExpenseToDelete(exp)}
                                    className="opacity-0 group-hover:opacity-100 text-stone-400 hover:text-rose-600 transition"
                                  >
                                    <Trash size={13} />
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ================= VIEW 4: SEMUA TRANSAKSI (EXPENSE LEDGER) ================= */}
        {activeTab === "transactions" && (
          <div className="rounded-3xl bg-white border border-stone-200/80 p-5 sm:p-6 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-bold text-stone-900">
                  Buku Kas &amp; Riwayat Semua Transaksi
                </h3>
                <p className="text-xs text-stone-500">
                  Total {expenses.length} pengeluaran tersimpan
                </p>
              </div>

              {/* Filters */}
              <div className="flex items-center gap-2">
                <div className="relative flex-1 sm:w-56">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400">
                    <MagnifyingGlass size={14} />
                  </span>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Cari transaksi..."
                    className="w-full rounded-xl border border-stone-200 bg-stone-50 pl-8 pr-3 py-1.5 text-xs text-stone-900 placeholder:text-stone-400 focus:bg-white focus:outline-none focus:border-brand-500"
                  />
                </div>

                <select
                  value={selectedCategoryFilter}
                  onChange={(e) => setSelectedCategoryFilter(e.target.value)}
                  className="rounded-xl border border-stone-200 bg-stone-50 px-2.5 py-1.5 text-xs font-semibold text-stone-800 focus:bg-white focus:outline-none"
                >
                  <option value="all">Semua Kategori</option>
                  {EXPENSE_CATEGORIES.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {filteredExpenses.length === 0 ? (
              <div className="py-16 text-center border border-dashed border-stone-200 rounded-2xl">
                <p className="text-xs text-stone-400">
                  Tidak ada transaksi yang cocok.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredExpenses.map((exp) => {
                  const catObj =
                    EXPENSE_CATEGORIES.find((c) => c.id === exp.category) ||
                    EXPENSE_CATEGORIES[6];

                  return (
                    <div
                      key={exp.id}
                      className="flex items-center justify-between rounded-2xl bg-stone-50/70 border border-stone-200/80 p-3 hover:bg-stone-50 transition group"
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <span
                          className={`shrink-0 rounded-lg px-2 py-0.5 text-[10px] font-bold ${catObj.color}`}
                        >
                          {catObj.label}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-bold text-stone-900 truncate">
                            {exp.description}
                          </p>
                          {exp.date && (
                            <p className="text-[10px] text-stone-400 mt-0.5">
                              {format(parseISO(exp.date), "d MMM yyyy", {
                                locale: idLocale,
                              })}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0 ml-3">
                        <span className="text-sm font-bold text-emerald-700">
                          {formatMoney(
                            Number(exp.amount),
                            exp.currency || "IDR"
                          )}
                        </span>
                        <button
                          type="button"
                          onClick={() => setExpenseToDelete(exp)}
                          className="opacity-0 group-hover:opacity-100 text-stone-400 hover:text-rose-600 transition p-1"
                          title="Hapus Transaksi"
                        >
                          <Trash size={14} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ================= VIEW 5: CATATAN TUKAR UANG (EXCHANGE LEDGER) ================= */}
        {activeTab === "exchange" && (
          <div className="rounded-3xl bg-white border border-stone-200/80 p-5 sm:p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-stone-900">
                  Catatan Penukaran Uang (Money Changer)
                </h3>
                <p className="text-xs text-stone-500">
                  Melacak konversi Rupiah (IDR) ke Valas ({destinationCurrencies.join(", ")})
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsExchangeModalOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-xl bg-brand-600 text-white px-3.5 py-1.5 text-xs font-bold shadow-cta hover:bg-brand-700 transition"
              >
                <Plus size={14} weight="bold" />
                Catat Penukaran
              </button>
            </div>

            {exchangeRecords.length === 0 ? (
              <div className="py-16 text-center border border-dashed border-stone-200 rounded-2xl space-y-2">
                <span className="text-2xl">💱</span>
                <p className="text-xs text-stone-500 font-medium">
                  Belum ada catatan penukaran uang.
                </p>
                <p className="text-[11px] text-stone-400">
                  Catat penukaran rupiah ke valas agar kas dompet tujuan terisi otomatis.
                </p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {exchangeRecords.map((rec) => (
                  <div
                    key={rec.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 rounded-2xl bg-stone-50 border border-stone-200/80 p-3.5 hover:bg-stone-50/90 transition group"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded-md bg-indigo-100 text-indigo-800 text-[10px] font-bold">
                          {rec.fromCurrency || "IDR"} ➔ {rec.toCurrency || "SAR"}
                        </span>
                        {rec.date && (
                          <span className="text-[11px] text-stone-400">
                            {format(parseISO(rec.date), "d MMMM yyyy", {
                              locale: idLocale,
                            })}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-stone-600 mt-1">
                        Tukar {formatMoney(rec.fromAmount, rec.fromCurrency || "IDR")} dengan kurs{" "}
                        <strong className="text-stone-900">
                          1 {rec.toCurrency || "SAR"} = Rp {Number(rec.rate).toLocaleString("id-ID")}
                        </strong>
                      </p>
                      {rec.notes && (
                        <p className="text-[11px] text-stone-400 italic mt-0.5">
                          {rec.notes}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-stone-200/60">
                      <span className="text-base font-extrabold text-emerald-700">
                        +{formatMoney(rec.toAmount, rec.toCurrency || "SAR")}
                      </span>
                      <button
                        type="button"
                        onClick={() => setExchangeToDelete(rec)}
                        className="opacity-0 group-hover:opacity-100 text-stone-400 hover:text-rose-600 transition p-1"
                        title="Hapus Catatan Tukar Uang"
                      >
                        <Trash size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ================= MODAL: ATUR TARGET BUDGET ================= */}
      {isEditBudgetOpen &&
        createPortal(
          <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div
              className="relative w-full max-w-lg rounded-3xl bg-white border border-stone-100 p-6 shadow-2xl flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-150"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between pb-3 border-b border-stone-100 shrink-0">
                <div className="flex items-center gap-2">
                  <div className="grid h-9 w-9 place-items-center rounded-xl bg-brand-50 text-brand-700">
                    <PencilSimple size={18} weight="bold" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-stone-900 leading-tight">
                      Atur Alokasi Target Budget
                    </h3>
                    <p className="text-xs text-stone-500">
                      Kelola plafon anggaran Rupiah &amp; uang saku mata uang tujuan
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsEditBudgetOpen(false)}
                  className="grid h-8 w-8 place-items-center rounded-full text-stone-400 hover:bg-stone-100"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto space-y-4 py-3 pr-1 hide-scroll mt-2">
                {/* 1. Global Home Budget (IDR) */}
                <div className="rounded-2xl bg-indigo-50/70 border border-indigo-200 p-3.5">
                  <label className="block text-xs font-bold text-indigo-900 mb-1">
                    🇮🇩 Total Target Budget Utama (IDR - Rupiah)
                  </label>
                  <p className="text-[11px] text-indigo-600 mb-2">
                    Total plafon pengeluaran keseluruhan perjalanan dalam Rupiah
                  </p>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-stone-400">
                      Rp
                    </span>
                    <input
                      type="text"
                      value={budgetIDRDraft}
                      onChange={(e) => {
                        const val = e.target.value.replace(/[^0-9]/g, "");
                        setBudgetIDRDraft(
                          val ? Number(val).toLocaleString("id-ID") : ""
                        );
                      }}
                      className="w-full rounded-xl border border-indigo-200 bg-white py-2 pl-9 pr-3 text-sm font-bold text-stone-900 focus:outline-none focus:ring-2 focus:ring-indigo-300"
                    />
                  </div>
                </div>

                {/* 2. Destination Foreign Currencies Pocket Budgets */}
                <div className="rounded-2xl bg-emerald-50/70 border border-emerald-200 p-3.5 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="block text-xs font-bold text-emerald-950">
                        🌍 Uang Saku Mata Uang Negara Tujuan
                      </label>
                      <p className="text-[11px] text-emerald-700">
                        Alokasi uang saku kas tunai / fisik di negara tujuan
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2.5">
                    {activeCurrenciesDraft.map((cCode) => {
                      const meta =
                        AVAILABLE_CURRENCIES.find((c) => c.code === cCode) || {
                          code: cCode,
                          label: cCode,
                          symbol: cCode,
                          country: cCode,
                          flag: "🌍",
                        };

                      return (
                        <div
                          key={cCode}
                          className="flex items-center justify-between gap-2.5 bg-white p-2.5 rounded-xl border border-emerald-200 shadow-2xs"
                        >
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className="text-base">{meta.flag}</span>
                            <span className="text-xs font-bold text-stone-800 truncate">
                              {meta.country} ({cCode})
                            </span>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <div className="relative w-36">
                              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-stone-400">
                                {meta.symbol}
                              </span>
                              <input
                                type="text"
                                placeholder="0"
                                value={foreignBudgetsDraft[cCode] || ""}
                                onChange={(e) => {
                                  const val = e.target.value.replace(/[^0-9]/g, "");
                                  setForeignBudgetsDraft((prev) => ({
                                    ...prev,
                                    [cCode]: val ? Number(val).toLocaleString("id-ID") : "",
                                  }));
                                }}
                                className="w-full rounded-lg border border-stone-200 bg-stone-50 py-1 pl-7 pr-2 text-xs font-bold text-right text-stone-900 focus:bg-white focus:outline-none"
                              />
                            </div>
                            {activeCurrenciesDraft.length > 1 && (
                              <button
                                type="button"
                                onClick={() => handleRemoveCurrency(cCode)}
                                className="text-stone-400 hover:text-rose-600 p-1"
                                title="Hapus mata uang ini"
                              >
                                <X size={14} />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Add Currency Option */}
                  <div className="pt-2 border-t border-emerald-200/80 flex items-center gap-2">
                    <select
                      value={selectedNewCurrency}
                      onChange={(e) => setSelectedNewCurrency(e.target.value)}
                      className="flex-1 rounded-xl border border-stone-200 bg-white px-2.5 py-1.5 text-xs text-stone-800 focus:outline-none"
                    >
                      <option value="">+ Tambah Mata Uang Lain...</option>
                      {AVAILABLE_CURRENCIES.filter(
                        (c) => c.code !== "IDR" && !activeCurrenciesDraft.includes(c.code)
                      ).map((c) => (
                        <option key={c.code} value={c.code}>
                          {c.flag} {c.label}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      disabled={!selectedNewCurrency}
                      onClick={handleAddNewCurrency}
                      className="px-3 py-1.5 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 disabled:opacity-50 transition"
                    >
                      Tambah
                    </button>
                  </div>
                </div>

                {/* 3. Target Alokasi Pos Kategori */}
                <div className="rounded-2xl bg-stone-50 border border-stone-200/80 p-3.5 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-stone-800">
                      Alokasi Plafon Pos Kategori (IDR)
                    </span>
                    <span className="text-[10px] text-stone-400">
                      Nominal Target
                    </span>
                  </div>

                  <div className="space-y-2">
                    {EXPENSE_CATEGORIES.map((cat) => (
                      <div
                        key={cat.id}
                        className="flex items-center justify-between gap-3 bg-white p-2 rounded-xl border border-stone-200"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span
                            className={`w-2.5 h-2.5 rounded-full ${cat.dotColor}`}
                          />
                          <span className="text-xs font-medium text-stone-800 truncate">
                            {cat.label}
                          </span>
                        </div>
                        <input
                          type="text"
                          placeholder="Misal: 1500000"
                          value={categoryBudgetsDraft[cat.id] || ""}
                          onChange={(e) => {
                            const val = e.target.value.replace(/[^0-9]/g, "");
                            setCategoryBudgetsDraft((prev) => ({
                              ...prev,
                              [cat.id]: val
                                ? Number(val).toLocaleString("id-ID")
                                : "",
                            }));
                          }}
                          className="w-32 rounded-lg border border-stone-200 bg-stone-50 px-2 py-1 text-xs text-right font-bold text-stone-900 focus:bg-white focus:outline-none"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-stone-100 flex items-center justify-end gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsEditBudgetOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-stone-600 hover:bg-stone-100 transition"
                >
                  Batal
                </button>
                <button
                  type="button"
                  disabled={savingBudget}
                  onClick={handleSaveBudget}
                  className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-brand-600 text-white text-xs font-bold hover:bg-brand-700 shadow-cta transition disabled:opacity-50"
                >
                  {savingBudget && (
                    <CircleNotch size={14} className="animate-spin" />
                  )}
                  <span>Simpan Target Budget</span>
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* ================= MODAL: MONEY CHANGER / TUKAR UANG ================= */}
      {isExchangeModalOpen &&
        createPortal(
          <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div
              className="relative w-full max-w-md rounded-3xl bg-white border border-stone-100 p-6 shadow-2xl flex flex-col animate-in zoom-in-95 duration-150"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between pb-3 border-b border-stone-100">
                <div className="flex items-center gap-2">
                  <div className="grid h-9 w-9 place-items-center rounded-xl bg-emerald-100 text-emerald-700 font-bold">
                    💱
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-stone-900 leading-tight">
                      Catat Penukaran Uang
                    </h3>
                    <p className="text-xs text-stone-500">
                      Konversi Rupiah ({exchangeFromCurrency}) ke Valas ({exchangeToCurrency})
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsExchangeModalOpen(false)}
                  className="grid h-8 w-8 place-items-center rounded-full text-stone-400 hover:bg-stone-100"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="mt-4 space-y-3.5">
                {/* Currencies selector */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-semibold text-stone-600 mb-1">
                      Mata Uang Asal
                    </label>
                    <select
                      value={exchangeFromCurrency}
                      onChange={(e) => setExchangeFromCurrency(e.target.value)}
                      className="w-full rounded-xl border border-stone-200 bg-white px-2.5 py-1.5 text-xs font-bold text-stone-900 focus:outline-none"
                    >
                      <option value="IDR">🇮🇩 IDR (Rupiah)</option>
                      {AVAILABLE_CURRENCIES.filter((c) => c.code !== "IDR").map((c) => (
                        <option key={c.code} value={c.code}>
                          {c.flag} {c.code}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-stone-600 mb-1">
                      Mata Uang Tujuan (Valas)
                    </label>
                    <select
                      value={exchangeToCurrency}
                      onChange={(e) => {
                        const newTo = e.target.value;
                        setExchangeToCurrency(newTo);
                        setExchangeRate(DEFAULT_RATES[newTo] || "1");
                      }}
                      className="w-full rounded-xl border border-stone-200 bg-white px-2.5 py-1.5 text-xs font-bold text-stone-900 focus:outline-none"
                    >
                      {destinationCurrencies.map((cur) => {
                        const meta = AVAILABLE_CURRENCIES.find((c) => c.code === cur);
                        return (
                          <option key={cur} value={cur}>
                            {meta?.flag || "🌍"} {cur} ({meta?.country || cur})
                          </option>
                        );
                      })}
                      {/* Also show other available currencies if user wants */}
                      {AVAILABLE_CURRENCIES.filter(
                        (c) => c.code !== "IDR" && !destinationCurrencies.includes(c.code)
                      ).map((c) => (
                        <option key={c.code} value={c.code}>
                          {c.flag} {c.code} ({c.country})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Jumlah {exchangeFromCurrency} yang Ditukar <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-stone-400">
                      {exchangeFromCurrency}
                    </span>
                    <input
                      autoFocus
                      type="text"
                      placeholder="Misal: 5.000.000"
                      value={exchangeFromAmount}
                      onChange={(e) => {
                        const val = e.target.value.replace(/[^0-9]/g, "");
                        setExchangeFromAmount(
                          val ? Number(val).toLocaleString("id-ID") : ""
                        );
                      }}
                      className="w-full rounded-2xl border border-stone-200 bg-white py-2 pl-12 pr-3 text-sm font-bold text-stone-900 placeholder:text-stone-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-100"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-stone-700 mb-1">
                      Kurs (1 {exchangeToCurrency} = ... {exchangeFromCurrency})
                    </label>
                    <input
                      type="number"
                      value={exchangeRate}
                      onChange={(e) => setExchangeRate(e.target.value)}
                      placeholder="4250"
                      className="w-full rounded-2xl border border-stone-200 bg-white px-3 py-2 text-xs font-bold text-stone-900 focus:border-emerald-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-stone-700 mb-1">
                      Tanggal Penukaran
                    </label>
                    <input
                      type="date"
                      value={exchangeDate}
                      onChange={(e) => setExchangeDate(e.target.value)}
                      className="w-full rounded-2xl border border-stone-200 bg-white px-3 py-2 text-xs font-semibold text-stone-900 focus:border-emerald-500 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Calculation Preview */}
                <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-3.5 text-center">
                  <p className="text-[11px] font-medium text-emerald-800">
                    Valas yang Didapatkan (Masuk ke Dompet {exchangeToCurrency}):
                  </p>
                  <p className="text-[22px] font-extrabold text-emerald-700 mt-0.5">
                    {exchangeFromAmount
                      ? formatMoney(
                          (Number(exchangeFromAmount.replace(/[^0-9]/g, "")) || 0) /
                            (Number(exchangeRate) || 1),
                          exchangeToCurrency
                        )
                      : `0 ${exchangeToCurrency}`}
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Lokasi / Catatan Money Changer (Opsional)
                  </label>
                  <input
                    type="text"
                    value={exchangeNotes}
                    onChange={(e) => setExchangeNotes(e.target.value)}
                    placeholder="Contoh: Money Changer Bandara / Hotel"
                    className="w-full rounded-2xl border border-stone-200 bg-white px-3 py-2 text-xs text-stone-900 placeholder:text-stone-400 focus:border-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="mt-5 pt-3 border-t border-stone-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsExchangeModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-stone-600 hover:bg-stone-100 transition"
                >
                  Batal
                </button>
                <button
                  type="button"
                  disabled={savingExchange}
                  onClick={handleSaveExchange}
                  className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 shadow-sm transition disabled:opacity-50"
                >
                  {savingExchange && (
                    <CircleNotch size={14} className="animate-spin" />
                  )}
                  <span>Simpan Penukaran</span>
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* ================= MODAL: DELETE EXPENSE CONFIRMATION ================= */}
      {expenseToDelete &&
        createPortal(
          <div className="fixed inset-0 z-[10002] flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div
              className="relative w-full max-w-sm rounded-[2rem] bg-white border border-white/80 p-6 shadow-2xl flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start gap-3.5">
                <div className="grid h-11 w-11 place-items-center rounded-2xl bg-rose-100 text-rose-600 shrink-0">
                  <Warning size={24} weight="fill" />
                </div>
                <div>
                  <h3 className="text-[15px] font-bold text-stone-900">
                    Hapus Pengeluaran?
                  </h3>
                  <p className="text-[12px] text-stone-500 mt-1 leading-relaxed">
                    Hapus transaksi{" "}
                    <span className="font-semibold text-stone-800">
                      "{expenseToDelete.description}"
                    </span>{" "}
                    sebesar{" "}
                    <span className="font-bold text-emerald-700">
                      {formatMoney(
                        Number(expenseToDelete.amount),
                        expenseToDelete.currency
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
                  <Trash size={14} weight="bold" />
                  Hapus
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* ================= MODAL: DELETE EXCHANGE CONFIRMATION ================= */}
      {exchangeToDelete &&
        createPortal(
          <div className="fixed inset-0 z-[10002] flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div
              className="relative w-full max-w-sm rounded-[2rem] bg-white border border-white/80 p-6 shadow-2xl flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start gap-3.5">
                <div className="grid h-11 w-11 place-items-center rounded-2xl bg-rose-100 text-rose-600 shrink-0">
                  <Warning size={24} weight="fill" />
                </div>
                <div>
                  <h3 className="text-[15px] font-bold text-stone-900">
                    Hapus Catatan Penukaran?
                  </h3>
                  <p className="text-[12px] text-stone-500 mt-1 leading-relaxed">
                    Hapus penukaran{" "}
                    <span className="font-semibold text-stone-800">
                      {formatMoney(
                        exchangeToDelete.fromAmount,
                        exchangeToDelete.fromCurrency || "IDR"
                      )}{" "}
                      ➔{" "}
                      {formatMoney(
                        exchangeToDelete.toAmount,
                        exchangeToDelete.toCurrency || "SAR"
                      )}
                    </span>
                    ? Saldo kedua dompet akan disesuaikan kembali.
                  </p>
                </div>
              </div>

              <div className="mt-5 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setExchangeToDelete(null)}
                  className="h-10 px-4 rounded-xl text-stone-600 text-xs font-semibold hover:bg-stone-100 transition"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDeleteExchange}
                  className="h-10 px-4 rounded-xl bg-rose-600 text-white text-xs font-bold hover:bg-rose-700 shadow-sm transition flex items-center gap-1.5"
                >
                  <Trash size={14} weight="bold" />
                  Hapus
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
