"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { createClient } from "@/utils/supabase/client";
import {
  Plus,
  X,
  Clock,
  Tag,
  NotePencil,
  CircleNotch,
  MapPin,
  Compass,
  CurrencyDollar,
  Trash,
  Crosshair,
  MagnifyingGlass,
  Check,
  Globe,
  PencilSimple,
} from "@phosphor-icons/react";
import type { Expense, Place, Task } from "@/types";
import {
  detectCurrencyFromLocation,
  formatMoney,
  AVAILABLE_CURRENCIES,
  EXPENSE_CATEGORIES,
  POPULAR_LANDMARKS,
  POPULAR_TIMEZONES,
  detectTimezoneFromLocation,
  formatTimeDisplay,
} from "@/lib/geo";
import FreeMapLocationPicker, {
  type SelectedLocationResult,
} from "@/components/FreeMapLocationPicker";

interface AddPlaceModalProps {
  dayId?: string;
  dayNumber?: number;
  tripId?: string;
  buttonText?: string;
  buttonVariant?: "primary" | "secondary" | "dashed" | "fab";
  className?: string;
  trigger?: React.ReactNode;
  onPlaceAdded: (place: Place) => void;
}

interface ExpenseDraftItem {
  id: string;
  description: string;
  amount: string;
  category: string;
  currency: string;
}

interface SearchPlaceResult {
  place_id: number;
  display_name: string;
  name?: string;
  lat: string;
  lon: string;
  address?: {
    country_code?: string;
    city?: string;
    town?: string;
    state?: string;
    country?: string;
  };
}

export default function AddPlaceModal({
  dayId,
  dayNumber = 1,
  tripId,
  buttonText = "Tambah Agenda",
  buttonVariant = "primary",
  className = "",
  trigger,
  onPlaceAdded,
}: AddPlaceModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form Fields
  const [name, setName] = useState("");
  const [category, setCategory] = useState("pray");
  const [startTime, setStartTime] = useState("08:00");
  const [endTime, setEndTime] = useState("10:00");
  const [timezone, setTimezone] = useState<string>("KSA");
  const [thumbnailUrl, setThumbnailUrl] = useState("");
  const [tasksText, setTasksText] = useState("");
  const [notesText, setNotesText] = useState("");

  // Location Fields
  const [locationName, setLocationName] = useState("");
  const [address, setAddress] = useState("");
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [defaultCurrency, setDefaultCurrency] = useState<string>("IDR");
  const [isMapPickerOpen, setIsMapPickerOpen] = useState(false);

  // Location Mode: "search" | "manual"
  const [locationMode, setLocationMode] = useState<"search" | "manual">("search");

  // Autocomplete search state
  const [locationQuery, setLocationQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchPlaceResult[]>([]);
  const [searchingLocation, setSearchingLocation] = useState(false);
  const [searchTimer, setSearchTimer] = useState<NodeJS.Timeout | null>(null);

  // GPS state
  const [detectingGps, setDetectingGps] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);

  // Multiple Expense Items State
  const [expenseItems, setExpenseItems] = useState<ExpenseDraftItem[]>([]);

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

  // Location selected from interactive map
  const handleLocationSelected = (loc: SelectedLocationResult) => {
    setAddress(loc.address);
    setLat(loc.lat);
    setLng(loc.lng);
    setLocationName(loc.name);
    setDefaultCurrency(loc.defaultCurrency);
    setLocationQuery(loc.name);
    setTimezone(detectTimezoneFromLocation(loc.lat, loc.lng, loc.address, loc.name));

    if (!name.trim()) {
      setName(loc.name);
    }

    setExpenseItems((prev) =>
      prev.map((item) => ({
        ...item,
        currency: loc.defaultCurrency,
      }))
    );
  };

  // Autocomplete live search handler
  const handleLocationSearchInput = (query: string) => {
    setLocationQuery(query);
    if (searchTimer) clearTimeout(searchTimer);

    if (!query.trim() || query.length < 2) {
      setSearchResults([]);
      setSearchingLocation(false);
      return;
    }

    setSearchingLocation(true);
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
            query
          )}&addressdetails=1&limit=5`,
          { headers: { "Accept-Language": "id,en" } }
        );
        if (!res.ok) return;
        const results: SearchPlaceResult[] = await res.json();
        setSearchResults(results);
      } catch (err) {
        console.error("Nominatim search error:", err);
      } finally {
        setSearchingLocation(false);
      }
    }, 380);

    setSearchTimer(timer);
  };

  // Select search autocomplete item
  const handleSelectAutocomplete = (item: SearchPlaceResult) => {
    const itemLat = parseFloat(item.lat);
    const itemLng = parseFloat(item.lon);
    const placeTitle = item.name || item.display_name.split(",")[0] || "Lokasi Agenda";
    const fullAddr = item.display_name;
    const currency = detectCurrencyFromLocation(
      itemLat,
      itemLng,
      fullAddr,
      item.address?.country_code
    );

    setAddress(fullAddr);
    setLocationName(placeTitle);
    setLat(itemLat);
    setLng(itemLng);
    setDefaultCurrency(currency);
    setLocationQuery(placeTitle);
    setTimezone(detectTimezoneFromLocation(itemLat, itemLng, fullAddr, placeTitle));
    setSearchResults([]);

    if (!name.trim()) {
      setName(placeTitle);
    }

    setExpenseItems((prev) =>
      prev.map((exp) => ({
        ...exp,
        currency,
      }))
    );
  };

  // GPS Geolocation trigger
  const handleUseCurrentLocation = () => {
    if (typeof window === "undefined" || !navigator.geolocation) {
      setGpsError("Perangkat tidak mendukung GPS Geolocation.");
      return;
    }

    setDetectingGps(true);
    setGpsError(null);

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        setLat(latitude);
        setLng(longitude);

        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&addressdetails=1`,
            { headers: { "Accept-Language": "id,en" } }
          );
          if (res.ok) {
            const data = await res.json();
            const placeTitle =
              data.name ||
              data.address?.amenity ||
              data.address?.road ||
              "Lokasi Saat Ini";
            const fullAddr = data.display_name || `Lat: ${latitude}, Lng: ${longitude}`;
            const currency = detectCurrencyFromLocation(
              latitude,
              longitude,
              fullAddr,
              data.address?.country_code
            );

            setLocationName(placeTitle);
            setAddress(fullAddr);
            setDefaultCurrency(currency);
            setLocationQuery(placeTitle);
            setTimezone(detectTimezoneFromLocation(latitude, longitude, fullAddr, placeTitle));

            if (!name.trim()) {
              setName(placeTitle);
            }

            setExpenseItems((prev) =>
              prev.map((exp) => ({
                ...exp,
                currency,
              }))
            );
          }
        } catch (err) {
          console.error("Reverse geocoding error:", err);
          const fallback = `Lokasi GPS (${latitude.toFixed(4)}, ${longitude.toFixed(4)})`;
          setLocationName(fallback);
          setAddress(fallback);
          const currency = detectCurrencyFromLocation(latitude, longitude);
          setDefaultCurrency(currency);
          setTimezone(detectTimezoneFromLocation(latitude, longitude, fallback));
        } finally {
          setDetectingGps(false);
        }
      },
      (err) => {
        setDetectingGps(false);
        if (err.code === 1) {
          setGpsError("Izin akses lokasi ditolak oleh browser/perangkat.");
        } else {
          setGpsError("Gagal mendeteksi koordinat GPS.");
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  // Manual address input change
  const handleManualAddressChange = (text: string) => {
    setAddress(text);
    const detected = detectCurrencyFromLocation(null, null, text);
    setDefaultCurrency(detected);
    setTimezone(detectTimezoneFromLocation(null, null, text));
    setExpenseItems((prev) =>
      prev.map((exp) => ({
        ...exp,
        currency: detected,
      }))
    );
  };

  // Preset quick picker
  const handleSelectQuickPreset = (preset: (typeof POPULAR_LANDMARKS)[0]) => {
    setAddress(preset.address);
    setLocationName(preset.name);
    setLat(preset.lat);
    setLng(preset.lng);
    setDefaultCurrency(preset.defaultCurrency);
    setLocationQuery(preset.name);
    setTimezone(detectTimezoneFromLocation(preset.lat, preset.lng, preset.address, preset.name));
    setSearchResults([]);

    if (!name.trim()) {
      setName(preset.name);
    }

    setExpenseItems((prev) =>
      prev.map((exp) => ({
        ...exp,
        currency: preset.defaultCurrency,
      }))
    );
  };

  const handleAddExpenseItem = () => {
    setExpenseItems((prev) => [
      ...prev,
      {
        id: `exp_draft_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        description: "",
        amount: "",
        category: "food",
        currency: defaultCurrency,
      },
    ]);
  };

  const handleRemoveExpenseItem = (id: string) => {
    setExpenseItems((prev) => prev.filter((item) => item.id !== id));
  };

  const handleUpdateExpenseItem = (
    id: string,
    field: keyof ExpenseDraftItem,
    value: string
  ) => {
    setExpenseItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Nama agenda / tempat wajib diisi.");
      return;
    }

    const finalAddress = address.trim() || locationName.trim() || name.trim();

    setLoading(true);
    setError(null);

    try {
      const supabase = createClient();

      // Resolve a valid day_id if not passed directly
      let activeDayId = dayId;
      if (!activeDayId && tripId) {
        const { data: existingDays } = await supabase
          .from("itinerary_days")
          .select("id")
          .eq("trip_id", tripId)
          .order("day_number", { ascending: true })
          .limit(1);

        if (existingDays && existingDays.length > 0) {
          activeDayId = existingDays[0].id;
        } else {
          // Initialize Day 1 if trip has no days yet
          const { data: createdDay, error: dayErr } = await supabase
            .from("itinerary_days")
            .insert({
              trip_id: tripId,
              day_number: 1,
              notes: "Hari 1 - Agenda Kegiatan",
            })
            .select()
            .single();

          if (dayErr || !createdDay) {
            throw new Error(dayErr?.message || "Gagal menginisialisasi hari itinerary.");
          }
          activeDayId = createdDay.id;
        }
      }

      if (!activeDayId) {
        throw new Error("ID Hari Itinerary tidak ditemukan.");
      }

      // Convert tasksText into Task[]
      const tasksJson = tasksText
        .split("\n")
        .map((t) => t.trim())
        .filter(Boolean)
        .map((t, idx) => ({
          id: `t_${Date.now()}_${idx}`,
          title: t,
          done: false,
        }));

      // Filter valid expense items
      const validExpenses = expenseItems
        .map((item) => ({
          ...item,
          numAmount: Number(item.amount.replace(/[^0-9]/g, "")) || 0,
        }))
        .filter((item) => item.numAmount > 0);

      const totalCost = validExpenses.reduce((sum, item) => sum + item.numAmount, 0);

      const insertPayload: Record<string, any> = {
        day_id: activeDayId,
        name: name.trim(),
        category,
        address: finalAddress,
        lat: lat,
        lng: lng,
        start_time: startTime ? formatTimeDisplay(startTime) : null,
        end_time: endTime ? formatTimeDisplay(endTime) : null,
        thumbnail_url: thumbnailUrl.trim() || null,
        notes: notesText.trim() || null,
        cost: totalCost,
        tasks_json: tasksJson,
        sort_order: 100,
      };

      let { data: newPlace, error: insertErr } = await supabase
        .from("places")
        .insert(insertPayload)
        .select()
        .single();

      // Graceful fallback if notes column doesn't exist on remote schema
      if (insertErr && insertErr.message && insertErr.message.toLowerCase().includes("notes")) {
        delete insertPayload.notes;
        const retry = await supabase.from("places").insert(insertPayload).select().single();
        newPlace = retry.data;
        insertErr = retry.error;
      }

      if (insertErr || !newPlace) {
        throw new Error(insertErr?.message || "Gagal menambahkan agenda.");
      }

      const createdExpenses: Expense[] = [];

      // If there are valid expenses and tripId is present, insert into expenses table
      if (validExpenses.length > 0 && tripId) {
        const expenseInserts = validExpenses.map((exp) => ({
          trip_id: tripId,
          place_id: newPlace.id,
          description: exp.description.trim() || "Pengeluaran Agenda",
          amount: exp.numAmount,
          category: exp.category,
          currency: exp.currency || defaultCurrency,
        }));

        const { data: expData, error: expErr } = await supabase
          .from("expenses")
          .insert(expenseInserts)
          .select();

        if (expErr) {
          console.warn("Insert with place_id failed, falling back without place_id:", expErr.message);
          const fallbackInserts = validExpenses.map((exp) => ({
            trip_id: tripId,
            description: exp.description.trim() || "Pengeluaran Agenda",
            amount: exp.numAmount,
            category: exp.category,
            currency: exp.currency || defaultCurrency,
          }));
          const { data: fallbackData } = await supabase
            .from("expenses")
            .insert(fallbackInserts)
            .select();

          if (fallbackData) {
            createdExpenses.push(...(fallbackData as Expense[]));
          }
        } else if (expData) {
          createdExpenses.push(...(expData as Expense[]));
        }
      }

      const fullPlace: Place = {
        ...(newPlace as Place),
        expenses: createdExpenses.length > 0 ? createdExpenses : undefined,
      };

      onPlaceAdded(fullPlace);
      setIsOpen(false);
      setName("");
      setAddress("");
      setLat(null);
      setLng(null);
      setLocationName("");
      setLocationQuery("");
      setExpenseItems([]);
      setThumbnailUrl("");
      setTasksText("");
      setNotesText("");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Terjadi kesalahan.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const modalContent = isOpen && mounted ? (
    <div className="fixed inset-0 z-[99999] overflow-y-auto bg-stone-900/50 backdrop-blur-sm p-4 sm:p-6 flex items-start sm:items-center justify-center animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-lg my-8 sm:my-auto rounded-3xl bg-white/95 backdrop-blur-2xl border border-white/60 p-6 shadow-2xl transition-all max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-stone-100 shrink-0">
          <div>
            <h3 className="text-base font-bold text-stone-900">
              Tambah Agenda — Hari ke-{dayNumber}
            </h3>
            <p className="text-xs text-stone-500">
              Rencanakan destinasi, jadwal waktu, dan catatan pengeluaran
            </p>
          </div>
          <button
            type="button"
            disabled={loading}
            onClick={handleClose}
            className="grid h-8 w-8 place-items-center rounded-full bg-stone-100 text-stone-500 hover:bg-stone-200 disabled:opacity-50 transition"
          >
            <X size={16} />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden mt-3">
          <div className="flex-1 overflow-y-auto space-y-3.5 pr-1 hide-scroll">
            {error && (
              <div className="rounded-2xl bg-rose-50 border border-rose-200 p-3 text-xs text-rose-700">
                {error}
              </div>
            )}

            {/* ================= LOCATION SELECTION SECTION ================= */}
            <div className="rounded-2xl bg-stone-50 border border-stone-200/80 p-3.5 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <MapPin size={16} weight="fill" className="text-brand-600" />
                  <span className="text-xs font-bold text-stone-900">
                    Lokasi Agenda &amp; Peta
                  </span>
                </div>

                {/* Mode Selector */}
                <div className="flex items-center gap-1 bg-white p-0.5 rounded-xl border border-stone-200 text-[11px] font-semibold">
                  <button
                    type="button"
                    onClick={() => setLocationMode("search")}
                    className={`px-2 py-1 rounded-lg transition ${
                      locationMode === "search"
                        ? "bg-brand-600 text-white shadow-xs"
                        : "text-stone-500 hover:text-stone-800"
                    }`}
                  >
                    Pencarian API
                  </button>
                  <button
                    type="button"
                    onClick={() => setLocationMode("manual")}
                    className={`px-2 py-1 rounded-lg transition ${
                      locationMode === "manual"
                        ? "bg-brand-600 text-white shadow-xs"
                        : "text-stone-500 hover:text-stone-800"
                    }`}
                  >
                    Input Manual
                  </button>
                </div>
              </div>

              {locationMode === "search" ? (
                /* Mode 1: Search with Open API Autocomplete */
                <div className="space-y-2">
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-stone-400">
                      {searchingLocation ? (
                        <CircleNotch size={16} className="animate-spin text-brand-600" />
                      ) : (
                        <MagnifyingGlass size={16} />
                      )}
                    </span>
                    <input
                      type="text"
                      value={locationQuery}
                      onChange={(e) => handleLocationSearchInput(e.target.value)}
                      placeholder="Ketik nama hotel, masjid, tempat ziarah, bandara..."
                      className="w-full rounded-2xl border border-stone-200 bg-white pl-9 pr-8 py-2 text-xs text-stone-900 placeholder:text-stone-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
                    />
                    {locationQuery && (
                      <button
                        type="button"
                        onClick={() => {
                          setLocationQuery("");
                          setSearchResults([]);
                        }}
                        className="absolute right-2.5 top-2.5 text-stone-400 hover:text-stone-600"
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>

                  {/* Autocomplete Dropdown List */}
                  {searchResults.length > 0 && (
                    <div className="rounded-2xl border border-brand-200 bg-white p-1.5 shadow-lg space-y-1 max-h-48 overflow-y-auto hide-scroll">
                      {searchResults.map((item) => (
                        <button
                          key={item.place_id}
                          type="button"
                          onClick={() => handleSelectAutocomplete(item)}
                          className="w-full text-left rounded-xl p-2 hover:bg-brand-50 transition flex items-start gap-2"
                        >
                          <MapPin size={14} weight="fill" className="text-brand-600 shrink-0 mt-0.5" />
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-semibold text-stone-900 truncate">
                              {item.name || item.display_name.split(",")[0]}
                            </p>
                            <p className="text-[10.5px] text-stone-400 line-clamp-1">
                              {item.display_name}
                            </p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Action Buttons: GPS & Open Interactive Map */}
                  <div className="flex items-center gap-2 pt-0.5">
                    <button
                      type="button"
                      disabled={detectingGps}
                      onClick={handleUseCurrentLocation}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-white hover:bg-stone-100 border border-stone-200 px-2.5 py-1.5 text-[11px] font-semibold text-stone-700 transition active:scale-95 disabled:opacity-50"
                    >
                      {detectingGps ? (
                        <>
                          <CircleNotch size={13} className="animate-spin text-brand-600" />
                          <span>Mendeteksi GPS...</span>
                        </>
                      ) : (
                        <>
                          <Crosshair size={13} weight="bold" className="text-brand-600" />
                          <span>Gunakan Lokasi Saya</span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => setIsMapPickerOpen(true)}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-brand-50 hover:bg-brand-100 border border-brand-200 px-3 py-1.5 text-[11px] font-bold text-brand-700 transition active:scale-95"
                    >
                      <Compass size={13} weight="bold" />
                      <span>Pilih di Peta</span>
                    </button>
                  </div>

                  {gpsError && (
                    <p className="text-[10.5px] text-red-500 bg-red-50 p-2 rounded-xl border border-red-200">
                      {gpsError}
                    </p>
                  )}

                  {/* Quick Preset Badges */}
                  <div className="pt-1">
                    <p className="text-[10px] font-bold text-stone-400 uppercase mb-1">
                      Pilihan Cepat:
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {POPULAR_LANDMARKS.slice(0, 5).map((preset) => (
                        <button
                          key={preset.id}
                          type="button"
                          onClick={() => handleSelectQuickPreset(preset)}
                          className="rounded-lg bg-white hover:bg-brand-50 border border-stone-200 px-2 py-0.5 text-[10.5px] font-medium text-stone-700 hover:text-brand-700 transition"
                        >
                          {preset.name.split("&")[0].split("(")[0].trim()}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                /* Mode 2: Manual Location Entry */
                <div className="space-y-2">
                  <div>
                    <label className="block text-[11px] font-semibold text-stone-600 mb-1">
                      Nama Tempat / Alamat Manual
                    </label>
                    <input
                      type="text"
                      value={address}
                      onChange={(e) => handleManualAddressChange(e.target.value)}
                      placeholder="Contoh: Hotel Pullman Zamzam Makkah, Al Haram"
                      className="w-full rounded-2xl border border-stone-200 bg-white px-3.5 py-2 text-xs text-stone-900 placeholder:text-stone-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
                    />
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <button
                      type="button"
                      disabled={detectingGps}
                      onClick={handleUseCurrentLocation}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-white hover:bg-stone-100 border border-stone-200 px-2.5 py-1.5 text-[11px] font-semibold text-stone-700 transition"
                    >
                      <Crosshair size={13} weight="bold" className="text-brand-600" />
                      <span>Deteksi GPS</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsMapPickerOpen(true)}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-brand-50 hover:bg-brand-100 border border-brand-200 px-2.5 py-1.5 text-[11px] font-bold text-brand-700 transition"
                    >
                      <Compass size={13} weight="bold" />
                      <span>Buka Peta</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Selected Location Summary Badge */}
              {address && (
                <div className="rounded-xl bg-white border border-brand-200/80 p-2.5 text-xs shadow-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-stone-900 truncate">
                      {locationName || address}
                    </span>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-bold shrink-0 ${
                        defaultCurrency === "SAR"
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-blue-100 text-blue-800"
                      }`}
                    >
                      {defaultCurrency} (
                      {defaultCurrency === "SAR" ? "Arab Saudi" : "Indonesia"})
                    </span>
                  </div>
                  <p className="text-[11px] text-stone-500 line-clamp-1">
                    {address}
                  </p>
                </div>
              )}
            </div>

            {/* Agenda Name */}
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Nama Agenda <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="Misal: Ziarah Masjid Quba, Thawaf Sunnah..."
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-2xl border border-stone-200 bg-white/80 px-3.5 py-2 text-sm text-stone-900 placeholder:text-stone-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
              />
            </div>

            {/* Category */}
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Kategori Agenda
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-stone-400 pointer-events-none">
                  <Tag size={16} />
                </span>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full rounded-2xl border border-stone-200 bg-white/80 pl-9 pr-8 py-2 text-sm text-stone-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
                >
                  <option value="pray">Ibadah &amp; Shalat (Pray)</option>
                  <option value="explore">Ziarah &amp; Situs Bersejarah (Explore)</option>
                  <option value="hotel">Hotel &amp; Istirahat (Hotel)</option>
                  <option value="flight">Penerbangan (Flight)</option>
                  <option value="car">Mobil / Rental Mobil (Car)</option>
                  <option value="taxi">Taksi / Online Ride (Taxi)</option>
                  <option value="bus">Bus &amp; Travel (Bus)</option>
                  <option value="train">Kereta Api (Train)</option>
                  <option value="food">Makan &amp; Kuliner (Food)</option>
                  <option value="shopping">Belanja &amp; Oleh-oleh (Shopping)</option>
                  <option value="other">Lainnya (Other)</option>
                </select>
              </div>
            </div>

            {/* Time & Timezone Pickers */}
            <div className="space-y-1.5">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Jam Mulai
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-stone-400 pointer-events-none">
                      <Clock size={16} />
                    </span>
                    <input
                      type="time"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      className="w-full rounded-2xl border border-stone-200 bg-white/80 pl-9 pr-2 py-2 text-sm text-stone-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Jam Selesai
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-stone-400 pointer-events-none">
                      <Clock size={16} />
                    </span>
                    <input
                      type="time"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      className="w-full rounded-2xl border border-stone-200 bg-white/80 pl-9 pr-2 py-2 text-sm text-stone-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
                    />
                  </div>
                </div>

                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Zona Waktu
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-stone-400 pointer-events-none">
                      <Globe size={16} />
                    </span>
                    <select
                      value={timezone}
                      onChange={(e) => setTimezone(e.target.value)}
                      className="w-full rounded-2xl border border-stone-200 bg-white/80 pl-9 pr-6 py-2 text-xs font-bold text-stone-800 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
                    >
                      {POPULAR_TIMEZONES.map((tz) => (
                        <option key={tz.code} value={tz.code}>
                          {tz.code} ({tz.offset})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* ================= MULTIPLE EXPENSES SECTION ================= */}
            <div className="rounded-2xl border border-stone-200 bg-stone-50/50 p-3.5 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-stone-900 flex items-center gap-1.5">
                    <CurrencyDollar size={16} className="text-emerald-600" />
                    Catatan Pengeluaran Agenda (Opsional)
                  </h4>
                  <p className="text-[11px] text-stone-500">
                    Otomatis dihitung dan terhubung ke halaman Budget
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleAddExpenseItem}
                  className="inline-flex items-center gap-1 rounded-xl bg-brand-50 hover:bg-brand-100 text-brand-700 px-2.5 py-1 text-xs font-semibold transition active:scale-95"
                >
                  <Plus size={13} weight="bold" />
                  + Tambah
                </button>
              </div>

              {expenseItems.length === 0 ? (
                <div className="text-center py-2">
                  <p className="text-[11.5px] text-stone-400 italic">
                    Belum ada pengeluaran dicatat untuk agenda ini.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {expenseItems.map((item, idx) => (
                    <div
                      key={item.id}
                      className="rounded-2xl bg-white border border-stone-200 p-3 shadow-xs space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-stone-500">
                          Pengeluaran #{idx + 1}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRemoveExpenseItem(item.id)}
                          className="text-stone-400 hover:text-rose-600 p-1 rounded-lg transition"
                          title="Hapus baris pengeluaran"
                        >
                          <Trash size={14} />
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {/* Expense Description */}
                        <div>
                          <label className="block text-[10.5px] font-medium text-stone-500 mb-0.5">
                            Nama Pengeluaran
                          </label>
                          <input
                            type="text"
                            placeholder="Contoh: Tiket Masuk, Makan Siang"
                            value={item.description}
                            onChange={(e) =>
                              handleUpdateExpenseItem(item.id, "description", e.target.value)
                            }
                            className="w-full rounded-xl border border-stone-200 px-2.5 py-1.5 text-xs text-stone-900 focus:border-brand-500 focus:outline-none"
                          />
                        </div>

                        {/* Category */}
                        <div>
                          <label className="block text-[10.5px] font-medium text-stone-500 mb-0.5">
                            Kategori
                          </label>
                          <select
                            value={item.category}
                            onChange={(e) =>
                              handleUpdateExpenseItem(item.id, "category", e.target.value)
                            }
                            className="w-full rounded-xl border border-stone-200 px-2.5 py-1.5 text-xs text-stone-900 focus:border-brand-500 focus:outline-none"
                          >
                            {EXPENSE_CATEGORIES.map((cat) => (
                              <option key={cat.id} value={cat.id}>
                                {cat.label}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        {/* Currency */}
                        <div>
                          <label className="block text-[10.5px] font-medium text-stone-500 mb-0.5">
                            Mata Uang
                          </label>
                          <select
                            value={item.currency}
                            onChange={(e) =>
                              handleUpdateExpenseItem(item.id, "currency", e.target.value)
                            }
                            className="w-full rounded-xl border border-stone-200 px-2.5 py-1.5 text-xs font-semibold text-stone-900 focus:border-brand-500 focus:outline-none"
                          >
                            {AVAILABLE_CURRENCIES.map((cur) => (
                              <option key={cur.code} value={cur.code}>
                                {cur.code} ({cur.symbol})
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Amount */}
                        <div>
                          <label className="block text-[10.5px] font-medium text-stone-500 mb-0.5">
                            Nominal ({item.currency})
                          </label>
                          <input
                            type="number"
                            min="0"
                            placeholder="0"
                            value={item.amount}
                            onChange={(e) =>
                              handleUpdateExpenseItem(item.id, "amount", e.target.value)
                            }
                            className="w-full rounded-xl border border-stone-200 px-2.5 py-1.5 text-xs font-semibold text-stone-900 focus:border-brand-500 focus:outline-none"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Tasks / To-Do List */}
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Target Aktivitas / Checklist (1 baris per aktivitas)
              </label>
              <textarea
                rows={2}
                placeholder={"Contoh:\nShalat Tahiyatul Masjid\nAmbil air zamzam"}
                value={tasksText}
                onChange={(e) => setTasksText(e.target.value)}
                className="w-full rounded-2xl border border-stone-200 bg-white/80 p-3 text-xs text-stone-900 placeholder:text-stone-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
              />
            </div>

            {/* Notes */}
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Catatan Khusus (Tips / Lokasi Pintu Masuk)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-stone-400 pointer-events-none">
                  <NotePencil size={16} />
                </span>
                <textarea
                  rows={2}
                  placeholder="Misal: Masuk melalui Pintu King Fahd No. 79..."
                  value={notesText}
                  onChange={(e) => setNotesText(e.target.value)}
                  className="w-full rounded-2xl border border-stone-200 bg-white/80 pl-9 pr-3 py-2 text-xs text-stone-900 placeholder:text-stone-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
                />
              </div>
            </div>
          </div>

          {/* Actions Footer */}
          <div className="mt-4 pt-3 border-t border-stone-100 flex items-center justify-end gap-3 shrink-0">
            <button
              type="button"
              disabled={loading}
              onClick={handleClose}
              className="rounded-2xl px-4 py-2 text-xs font-medium text-stone-600 hover:bg-stone-100 disabled:opacity-50 transition"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-2xl bg-brand-600 px-5 py-2 text-xs font-semibold text-white shadow-cta transition hover:bg-brand-700 active:scale-95 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <CircleNotch size={14} className="animate-spin" />
                  Menyimpan...
                </>
              ) : (
                "Simpan Agenda"
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Interactive Map Location Picker Modal */}
      {isMapPickerOpen && (
        <FreeMapLocationPicker
          isOpen={true}
          onClose={() => setIsMapPickerOpen(false)}
          onSelectLocation={handleLocationSelected}
          initialLat={lat}
          initialLng={lng}
          initialAddress={address}
          initialName={locationName || name}
        />
      )}
    </div>
  ) : null;

  const getButtonClass = () => {
    if (className) return className;
    switch (buttonVariant) {
      case "fab":
        return "fixed bottom-20 right-4 sm:bottom-8 sm:right-8 z-40 inline-flex items-center gap-2 rounded-full bg-brand-600 hover:bg-brand-700 text-white px-4 py-3 shadow-xl hover:shadow-2xl font-bold text-xs sm:text-sm transition-all active:scale-95 border-2 border-white/80";
      case "secondary":
        return "inline-flex items-center gap-1.5 rounded-2xl bg-brand-50 border border-brand-200/80 px-3.5 py-1.5 text-xs font-semibold text-brand-700 hover:bg-brand-100 transition active:scale-95";
      case "dashed":
        return "inline-flex items-center gap-1.5 rounded-2xl border border-dashed border-stone-300 bg-white hover:bg-stone-50 px-4 py-2 text-xs font-semibold text-stone-700 transition active:scale-95";
      case "primary":
      default:
        return "inline-flex items-center gap-1.5 rounded-2xl bg-brand-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-cta transition hover:bg-brand-700 active:scale-95";
    }
  };

  return (
    <>
      {trigger ? (
        <div onClick={handleOpen} className="cursor-pointer inline-block">
          {trigger}
        </div>
      ) : (
        <button
          type="button"
          onClick={handleOpen}
          className={getButtonClass()}
        >
          <Plus size={buttonVariant === "fab" ? 17 : 14} weight="bold" />
          {buttonText}
        </button>
      )}

      {mounted && modalContent && createPortal(modalContent, document.body)}
    </>
  );
}
