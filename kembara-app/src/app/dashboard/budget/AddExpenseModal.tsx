"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { createClient } from "@/utils/supabase/client";
import { Plus, X, CurrencyDollar, CalendarBlank, Tag, Note, CircleNotch } from "@phosphor-icons/react";
import {
  AVAILABLE_CURRENCIES,
  EXPENSE_CATEGORIES,
} from "@/lib/geo";
import type { Expense } from "@/types";

interface AddExpenseModalProps {
  tripId: string;
  onExpenseAdded: (newExpense: Expense) => void;
}

export default function AddExpenseModal({
  tripId,
  onExpenseAdded,
}: AddExpenseModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("food");
  const [currency, setCurrency] = useState("IDR");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleOpen = () => {
    setError(null);
    setIsOpen(true);
  };

  const handleClose = () => {
    if (loading) return;
    setIsOpen(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanAmount = Number(amount.replace(/\D/g, ""));
    if (!cleanAmount || cleanAmount <= 0) {
      setError("Jumlah nominal pengeluaran harus lebih dari 0.");
      return;
    }
    if (!description.trim()) {
      setError("Deskripsi pengeluaran wajib diisi.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const supabase = createClient();
      const { data: newExpense, error: insertErr } = await supabase
        .from("expenses")
        .insert({
          trip_id: tripId,
          description: description.trim(),
          amount: cleanAmount,
          category,
          currency,
          date: date || null,
        })
        .select()
        .single();

      if (insertErr || !newExpense) {
        throw new Error(insertErr?.message || "Gagal mencatat pengeluaran.");
      }

      onExpenseAdded(newExpense as Expense);
      setIsOpen(false);
      setDescription("");
      setAmount("");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Terjadi kesalahan.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const modalContent = isOpen && mounted ? (
    <div className="fixed inset-0 z-[9999] overflow-y-auto bg-stone-900/50 backdrop-blur-sm p-4 sm:p-6 flex items-start sm:items-center justify-center animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-md my-8 sm:my-auto rounded-3xl bg-white/95 backdrop-blur-2xl border border-white/60 p-6 shadow-2xl transition-all max-h-[88vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-stone-100 shrink-0">
          <div>
            <h3 className="text-base font-bold text-stone-900">
              Catat Pengeluaran
            </h3>
            <p className="text-xs text-stone-500">
              Pantau anggaran perjalanan Anda
            </p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="grid h-8 w-8 place-items-center rounded-full text-stone-400 hover:bg-stone-100 hover:text-stone-700 transition"
          >
            <X size={18} weight="bold" />
          </button>
        </div>

        {error && (
          <div className="mt-3 rounded-2xl bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-600 shrink-0">
            {error}
          </div>
        )}

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="mt-4 flex flex-col flex-1 overflow-hidden">
          <div className="space-y-3.5 overflow-y-auto pr-1 pb-1 flex-1 hide-scroll">
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Deskripsi / Keterangan <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-stone-400">
                  <Note size={16} />
                </span>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Makan Siang Al-Romansiah"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full rounded-2xl border border-stone-200 bg-white/80 pl-9 pr-3.5 py-2 text-sm text-stone-900 placeholder:text-stone-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div className="col-span-2">
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Jumlah Nominal <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-stone-400">
                    <CurrencyDollar size={16} />
                  </span>
                  <input
                    type="number"
                    required
                    min="1"
                    step="1000"
                    placeholder="Contoh: 150000"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full rounded-2xl border border-stone-200 bg-white/80 pl-9 pr-3 py-2 text-sm text-stone-900 placeholder:text-stone-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Mata Uang
                </label>
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="w-full rounded-2xl border border-stone-200 bg-white/80 px-3 py-2 text-sm text-stone-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
                >
                  {AVAILABLE_CURRENCIES.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.code} ({c.symbol})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Kategori
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-stone-400 pointer-events-none">
                    <Tag size={16} />
                  </span>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full appearance-none rounded-2xl border border-stone-200 bg-white/80 pl-9 pr-8 py-2 text-sm text-stone-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
                  >
                    {EXPENSE_CATEGORIES.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Tanggal
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-stone-400 pointer-events-none">
                    <CalendarBlank size={16} />
                  </span>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full rounded-2xl border border-stone-200 bg-white/80 pl-9 pr-3 py-2 text-sm text-stone-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Actions Footer */}
          <div className="mt-4 pt-3 border-t border-stone-100 flex items-center justify-end gap-2 shrink-0">
            <button
              type="button"
              disabled={loading}
              onClick={handleClose}
              className="rounded-2xl px-3.5 py-2 text-xs font-medium text-stone-600 hover:bg-stone-100 disabled:opacity-50 transition"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center gap-1.5 rounded-2xl bg-brand-600 px-5 py-2 text-xs font-semibold text-white shadow-cta transition hover:bg-brand-700 active:scale-95 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <CircleNotch size={14} className="animate-spin" />
                  Menyimpan...
                </>
              ) : (
                "Simpan Pengeluaran"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  ) : null;

  return (
    <>
      <button
        type="button"
        onClick={handleOpen}
        className="inline-flex items-center gap-1.5 rounded-2xl bg-brand-600 px-4 py-2 text-xs font-semibold text-white shadow-cta transition hover:bg-brand-700 active:scale-95"
      >
        <Plus size={15} weight="bold" />
        Catat Pengeluaran
      </button>

      {mounted && modalContent && createPortal(modalContent, document.body)}
    </>
  );
}
