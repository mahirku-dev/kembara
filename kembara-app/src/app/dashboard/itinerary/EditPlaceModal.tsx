"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { createClient } from "@/utils/supabase/client";
import {
  X,
  Clock,
  Tag,
  NotePencil,
  CircleNotch,
  MapPin,
  Compass,
  Trash,
  Crosshair,
  MagnifyingGlass,
  Check,
  Globe,
  PencilSimple,
  Calendar,
  Image as ImageIcon,
  CheckSquareOffset,
  Plus,
} from "@phosphor-icons/react";
import type { ItineraryDay, Place, Task } from "@/types";
import {
  detectCurrencyFromLocation,
  formatMoney,
  AVAILABLE_CURRENCIES,
  POPULAR_LANDMARKS,
  POPULAR_TIMEZONES,
  detectTimezoneFromLocation,
  formatTimeDisplay,
} from "@/lib/geo";
import FreeMapLocationPicker, {
  type SelectedLocationResult,
} from "@/components/FreeMapLocationPicker";

interface EditPlaceModalProps {
  place: Place;
  isOpen: boolean;
  onClose: () => void;
  tripId: string;
  days: ItineraryDay[];
  currentDayId: string;
  onPlaceUpdated: (updatedPlace: Place, previousDayId?: string) => void;
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

export default function EditPlaceModal({
  place,
  isOpen,
  onClose,
  tripId,
  days,
  currentDayId,
  onPlaceUpdated,
}: EditPlaceModalProps) {
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form States pre-filled from place
  const [targetDayId, setTargetDayId] = useState<string>(place.day_id || currentDayId);
  const [name, setName] = useState(place.name || "");
  const [category, setCategory] = useState(place.category || "explore");
  const [startTime, setStartTime] = useState(formatTimeDisplay(place.start_time) || "08:00");
  const [endTime, setEndTime] = useState(formatTimeDisplay(place.end_time) || "10:00");
  const [timezone, setTimezone] = useState<string>(
    detectTimezoneFromLocation(place.lat, place.lng, place.address, place.name)
  );
  const [thumbnailUrl, setThumbnailUrl] = useState(place.thumbnail_url || "");
  const [notesText, setNotesText] = useState(place.notes || "");
  const [tasksList, setTasksList] = useState<Task[]>(place.tasks_json || []);
  const [newTaskInput, setNewTaskInput] = useState("");

  // Location States
  const [locationName, setLocationName] = useState("");
  const [address, setAddress] = useState(place.address || "");
  const [lat, setLat] = useState<number | null>(place.lat ?? null);
  const [lng, setLng] = useState<number | null>(place.lng ?? null);
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

  useEffect(() => {
    setMounted(true);
  }, []);

  // Sync state when place prop changes
  useEffect(() => {
    if (isOpen && place) {
      setTargetDayId(place.day_id || currentDayId);
      setName(place.name || "");
      setCategory(place.category || "explore");
      setStartTime(formatTimeDisplay(place.start_time) || "08:00");
      setEndTime(formatTimeDisplay(place.end_time) || "10:00");
      setTimezone(detectTimezoneFromLocation(place.lat, place.lng, place.address, place.name));
      setThumbnailUrl(place.thumbnail_url || "");
      setNotesText(place.notes || "");
      setTasksList(place.tasks_json || []);
      setAddress(place.address || "");
      setLat(place.lat ?? null);
      setLng(place.lng ?? null);
      setLocationQuery(place.name || place.address || "");
      setError(null);
    }
  }, [isOpen, place, currentDayId]);

  // Location selected from interactive map
  const handleLocationSelected = (loc: SelectedLocationResult) => {
    setAddress(loc.address);
    setLat(loc.lat);
    setLng(loc.lng);
    setLocationName(loc.name);
    setLocationQuery(loc.name);
    setTimezone(detectTimezoneFromLocation(loc.lat, loc.lng, loc.address, loc.name));

    if (!name.trim()) {
      setName(loc.name);
    }
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
        const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
          query
        )}&format=json&addressdetails=1&limit=6&accept-language=id,en,ar`;
        const res = await fetch(url, {
          headers: {
            "Accept-Language": "id,en,ar",
          },
        });
        if (res.ok) {
          const data: SearchPlaceResult[] = await res.json();
          setSearchResults(data || []);
        }
      } catch (err) {
        console.error("Nominatim search error:", err);
      } finally {
        setSearchingLocation(false);
      }
    }, 450);

    setSearchTimer(timer);
  };

  // Select item from search autocomplete results
  const handleSelectSearchResult = (result: SearchPlaceResult) => {
    const parsedLat = parseFloat(result.lat);
    const parsedLng = parseFloat(result.lon);
    const resolvedName = result.name || result.display_name.split(",")[0] || "";
    const resolvedAddress = result.display_name;

    setLat(parsedLat);
    setLng(parsedLng);
    setAddress(resolvedAddress);
    setLocationName(resolvedName);
    setLocationQuery(resolvedName);
    setSearchResults([]);

    const detectedTz = detectTimezoneFromLocation(
      parsedLat,
      parsedLng,
      resolvedAddress,
      resolvedName
    );
    setTimezone(detectedTz);

    if (!name.trim()) {
      setName(resolvedName);
    }
  };

  // Select landmark preset
  const handleSelectLandmarkPreset = (landmark: (typeof POPULAR_LANDMARKS)[0]) => {
    setLat(landmark.lat);
    setLng(landmark.lng);
    setAddress(landmark.address);
    setLocationName(landmark.name);
    setLocationQuery(landmark.name);
    setSearchResults([]);

    const detectedTz = detectTimezoneFromLocation(
      landmark.lat,
      landmark.lng,
      landmark.address,
      landmark.name
    );
    setTimezone(detectedTz);

    if (!name.trim()) {
      setName(landmark.name);
    }
  };

  // Detect GPS location from device
  const handleDetectGps = () => {
    if (!navigator.geolocation) {
      setGpsError("Geolocation tidak didukung oleh browser Anda.");
      return;
    }

    setDetectingGps(true);
    setGpsError(null);

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const curLat = pos.coords.latitude;
        const curLng = pos.coords.longitude;
        setLat(curLat);
        setLng(curLng);

        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${curLat}&lon=${curLng}&format=json&accept-language=id,en`,
            { headers: { "Accept-Language": "id,en" } }
          );
          if (res.ok) {
            const data = await res.json();
            const revAddress = data.display_name || `GPS (${curLat.toFixed(4)}, ${curLng.toFixed(4)})`;
            const revName = data.name || data.address?.city || data.address?.town || "Lokasi Saat Ini";
            setAddress(revAddress);
            setLocationName(revName);
            setLocationQuery(revName);
            setTimezone(detectTimezoneFromLocation(curLat, curLng, revAddress, revName));
          }
        } catch {
          const fallback = `Titik GPS (${curLat.toFixed(5)}, ${curLng.toFixed(5)})`;
          setAddress(fallback);
          setLocationName(fallback);
        } finally {
          setDetectingGps(false);
        }
      },
      (err) => {
        setDetectingGps(false);
        setGpsError(`Gagal membaca GPS: ${err.message}`);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // Task list helpers
  const handleAddNewTask = () => {
    const clean = newTaskInput.trim();
    if (!clean) return;
    const newTask: Task = {
      id: `t_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      title: clean,
      done: false,
    };
    setTasksList((prev) => [...prev, newTask]);
    setNewTaskInput("");
  };

  const handleRemoveTask = (taskId: string) => {
    setTasksList((prev) => prev.filter((t) => t.id !== taskId));
  };

  const handleToggleTaskDone = (taskId: string) => {
    setTasksList((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, done: !t.done } : t))
    );
  };

  // Submit Update
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      setError("Nama agenda tidak boleh kosong.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const supabase = createClient();
      const cleanStart = formatTimeDisplay(startTime);
      const cleanEnd = formatTimeDisplay(endTime);
      const cleanAddress = address.trim() || locationName.trim() || null;
      const cleanNotes = notesText.trim() || null;
      const cleanThumb = thumbnailUrl.trim() || null;

      const updatePayload: Record<string, any> = {
        name: name.trim(),
        category,
        start_time: cleanStart || null,
        end_time: cleanEnd || null,
        address: cleanAddress,
        lat: lat ?? null,
        lng: lng ?? null,
        thumbnail_url: cleanThumb,
        notes: cleanNotes,
        tasks_json: tasksList,
      };

      // If moving to another day
      const previousDayId = place.day_id;
      if (targetDayId && targetDayId !== previousDayId) {
        updatePayload.day_id = targetDayId;
      }

      const { data: updatedPlace, error: updateErr } = await supabase
        .from("places")
        .update(updatePayload)
        .eq("id", place.id)
        .select()
        .single();

      if (updateErr || !updatedPlace) {
        throw new Error(updateErr?.message || "Gagal memperbarui agenda.");
      }

      const fullUpdated: Place = {
        ...(updatedPlace as Place),
        expenses: place.expenses,
      };

      onPlaceUpdated(fullUpdated, previousDayId);
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Terjadi kesalahan.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !mounted) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[99999] overflow-y-auto bg-stone-900/60 backdrop-blur-sm p-4 sm:p-6 flex items-start sm:items-center justify-center animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg my-6 sm:my-auto rounded-3xl bg-white/95 backdrop-blur-2xl border border-white/80 p-5 sm:p-6 shadow-2xl transition-all max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3.5 border-b border-stone-100 shrink-0">
          <div className="flex items-center gap-2.5">
            <span className="grid h-10 w-10 place-items-center rounded-2xl bg-brand-50 text-brand-600 border border-brand-200/60 shadow-xs">
              <PencilSimple size={20} weight="fill" />
            </span>
            <div>
              <h3 className="text-base font-bold text-stone-900">
                Edit Agenda Kegiatan
              </h3>
              <p className="text-xs text-stone-500">
                Ubah informasi jadwal, nama agenda, lokasi, dan catatan
              </p>
            </div>
          </div>
          <button
            type="button"
            disabled={loading}
            onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded-full bg-stone-100 text-stone-500 hover:bg-stone-200 disabled:opacity-50 transition"
          >
            <X size={16} weight="bold" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden mt-3">
          <div className="flex-1 overflow-y-auto space-y-3.5 pr-1 hide-scroll">
            {error && (
              <div className="rounded-2xl bg-rose-50 border border-rose-200 p-3 text-xs text-rose-700 font-medium">
                {error}
              </div>
            )}

            {/* Target Day Selector (Move Agenda to another day) */}
            {days.length > 1 && (
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1 flex items-center gap-1.5">
                  <Calendar size={14} weight="bold" className="text-brand-600" />
                  Jadwal Hari Kegiatan
                </label>
                <select
                  value={targetDayId}
                  onChange={(e) => setTargetDayId(e.target.value)}
                  className="w-full rounded-2xl border border-stone-200 bg-stone-50/70 p-3 text-xs font-semibold text-stone-900 focus:bg-white focus:border-brand-500 focus:outline-none"
                >
                  {days.map((d, idx) => (
                    <option key={d.id} value={d.id}>
                      Hari ke-{d.day_number || idx + 1} {d.date ? `(${d.date})` : ""}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Nama Agenda */}
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Nama Agenda / Destinasi <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Contoh: Shalat di Raudhah, Ziarah Jabal Uhud..."
                className="w-full rounded-2xl border border-stone-200 bg-stone-50/70 p-3 text-xs font-medium text-stone-900 placeholder:text-stone-400 focus:bg-white focus:border-brand-500 focus:outline-none"
              />
            </div>

            {/* Kategori Agenda */}
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1 flex items-center gap-1.5">
                <Tag size={14} className="text-stone-400" />
                Kategori Agenda
              </label>
              <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-1.5">
                {[
                  { id: "pray", label: "Ibadah" },
                  { id: "explore", label: "Ziarah" },
                  { id: "hotel", label: "Hotel" },
                  { id: "flight", label: "Pesawat" },
                  { id: "car", label: "Mobil" },
                  { id: "taxi", label: "Taksi" },
                  { id: "bus", label: "Bus" },
                  { id: "train", label: "Kereta" },
                  { id: "food", label: "Makan" },
                  { id: "shopping", label: "Belanja" },
                  { id: "other", label: "Lainnya" },
                ].map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setCategory(c.id)}
                    className={`rounded-xl py-2 px-1 text-xs font-semibold border transition text-center truncate ${
                      category === c.id
                        ? "bg-brand-600 text-white border-brand-600 shadow-xs"
                        : "bg-white border-stone-200 text-stone-600 hover:bg-stone-50"
                    }`}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Waktu & Zona Waktu (3 Kolom Responsive) */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1 flex items-center gap-1">
                  <Clock size={13} className="text-stone-400" />
                  Jam Mulai
                </label>
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full rounded-2xl border border-stone-200 bg-stone-50/70 p-2.5 text-xs font-medium text-stone-900 focus:bg-white focus:border-brand-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1 flex items-center gap-1">
                  <Clock size={13} className="text-stone-400" />
                  Jam Selesai
                </label>
                <input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="w-full rounded-2xl border border-stone-200 bg-stone-50/70 p-2.5 text-xs font-medium text-stone-900 focus:bg-white focus:border-brand-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1 flex items-center gap-1">
                  <Globe size={13} className="text-brand-600" />
                  Zona Waktu
                </label>
                <select
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                  className="w-full rounded-2xl border border-stone-200 bg-stone-50/70 p-2.5 text-xs font-bold text-brand-700 focus:bg-white focus:border-brand-500 focus:outline-none"
                >
                  {POPULAR_TIMEZONES.map((tz) => (
                    <option key={tz.code} value={tz.code}>
                      {tz.code} ({tz.label})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* ================= LOCATION SELECTION SECTION ================= */}
            <div className="rounded-2xl bg-stone-50 border border-stone-200/80 p-3.5 space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-stone-800 flex items-center gap-1.5">
                  <MapPin size={15} weight="fill" className="text-rose-500" />
                  Lokasi di Peta (Google Maps / Direction)
                </label>
                <div className="flex items-center gap-1 bg-stone-200/80 p-0.5 rounded-xl text-[11px] font-semibold">
                  <button
                    type="button"
                    onClick={() => setLocationMode("search")}
                    className={`px-2 py-1 rounded-lg transition ${
                      locationMode === "search"
                        ? "bg-white text-stone-900 shadow-2xs"
                        : "text-stone-500 hover:text-stone-800"
                    }`}
                  >
                    Pencarian
                  </button>
                  <button
                    type="button"
                    onClick={() => setLocationMode("manual")}
                    className={`px-2 py-1 rounded-lg transition ${
                      locationMode === "manual"
                        ? "bg-white text-stone-900 shadow-2xs"
                        : "text-stone-500 hover:text-stone-800"
                    }`}
                  >
                    Manual
                  </button>
                </div>
              </div>

              {locationMode === "search" ? (
                <div className="space-y-2">
                  <div className="relative">
                    <input
                      type="text"
                      value={locationQuery}
                      onChange={(e) => handleLocationSearchInput(e.target.value)}
                      placeholder="Cari hotel, masjid, bandara, atau landmark..."
                      className="w-full rounded-2xl border border-stone-200 bg-white p-3 pr-10 text-xs font-medium text-stone-900 placeholder:text-stone-400 focus:border-brand-500 focus:outline-none shadow-2xs"
                    />
                    <div className="absolute right-3 top-3 text-stone-400">
                      {searchingLocation ? (
                        <CircleNotch size={16} className="animate-spin text-brand-600" />
                      ) : (
                        <MagnifyingGlass size={16} />
                      )}
                    </div>
                  </div>

                  {searchResults.length > 0 && (
                    <div className="max-h-48 overflow-y-auto rounded-2xl border border-stone-200 bg-white shadow-lg divide-y divide-stone-100 z-50">
                      {searchResults.map((res) => (
                        <button
                          key={res.place_id}
                          type="button"
                          onClick={() => handleSelectSearchResult(res)}
                          className="w-full text-left p-2.5 text-xs text-stone-800 hover:bg-brand-50 transition flex items-start gap-2"
                        >
                          <MapPin size={14} className="text-rose-500 shrink-0 mt-0.5" />
                          <div>
                            <p className="font-semibold text-stone-900">
                              {res.name || res.display_name.split(",")[0]}
                            </p>
                            <p className="text-[11px] text-stone-500 truncate max-w-[280px] sm:max-w-[360px]">
                              {res.display_name}
                            </p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Preset Landmark Chips */}
                  <div>
                    <p className="text-[11px] font-semibold text-stone-500 mb-1.5 flex items-center gap-1">
                      <Compass size={13} className="text-brand-600" />
                      Landmark Populer:
                    </p>
                    <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto hide-scroll">
                      {POPULAR_LANDMARKS.slice(0, 8).map((lm) => (
                        <button
                          key={lm.id || lm.name}
                          type="button"
                          onClick={() => handleSelectLandmarkPreset(lm)}
                          className="inline-flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-xl bg-white border border-stone-200 hover:border-brand-400 hover:bg-brand-50 text-stone-700 transition active:scale-95 shadow-2xs"
                        >
                          <span>{lm.name.split("&")[0].split("(")[0].trim()}</span>
                          <span className="text-[9px] px-1 py-0.2 bg-stone-100 rounded text-stone-500 uppercase font-bold">
                            {lm.category}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Actions: Buka Peta Interaktif & GPS */}
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setIsMapPickerOpen(true)}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-2xl bg-white border border-brand-300 px-3 py-2 text-xs font-bold text-brand-700 hover:bg-brand-50 shadow-2xs transition active:scale-95"
                    >
                      <Compass size={15} weight="fill" className="text-brand-600" />
                      <span>Pilih Titik di Peta Interaktif</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleDetectGps}
                      disabled={detectingGps}
                      className="inline-flex items-center justify-center gap-1.5 rounded-2xl bg-white border border-stone-200 px-3 py-2 text-xs font-semibold text-stone-700 hover:bg-stone-50 shadow-2xs transition active:scale-95 disabled:opacity-50"
                      title="Gunakan titik GPS saat ini"
                    >
                      {detectingGps ? (
                        <CircleNotch size={14} className="animate-spin text-brand-600" />
                      ) : (
                        <Crosshair size={14} className="text-emerald-600" />
                      )}
                      <span>GPS</span>
                    </button>
                  </div>

                  {gpsError && (
                    <p className="text-[11px] text-rose-600">{gpsError}</p>
                  )}
                </div>
              ) : (
                /* Manual Inputs */
                <div className="space-y-2">
                  <div>
                    <label className="block text-[11px] font-medium text-stone-600 mb-0.5">
                      Alamat / Nama Tempat
                    </label>
                    <input
                      type="text"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="Contoh: Al Haram, Makkah 24231"
                      className="w-full rounded-2xl border border-stone-200 bg-white p-2.5 text-xs text-stone-900 focus:outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] font-medium text-stone-600 mb-0.5">
                        Latitude
                      </label>
                      <input
                        type="number"
                        step="any"
                        value={lat ?? ""}
                        onChange={(e) => setLat(parseFloat(e.target.value) || null)}
                        placeholder="21.4225"
                        className="w-full rounded-2xl border border-stone-200 bg-white p-2.5 text-xs text-stone-900 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-stone-600 mb-0.5">
                        Longitude
                      </label>
                      <input
                        type="number"
                        step="any"
                        value={lng ?? ""}
                        onChange={(e) => setLng(parseFloat(e.target.value) || null)}
                        placeholder="39.8262"
                        className="w-full rounded-2xl border border-stone-200 bg-white p-2.5 text-xs text-stone-900 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Selected Location Summary Badge */}
              {address && (
                <div className="rounded-xl bg-brand-50/80 border border-brand-200 p-2.5 flex items-start gap-2 text-xs text-brand-900">
                  <Check size={15} weight="bold" className="text-brand-600 shrink-0 mt-0.5" />
                  <div className="min-w-0 flex-1">
                    <p className="font-bold truncate">{locationName || name || "Lokasi Terpilih"}</p>
                    <p className="text-[11px] text-stone-500 break-words leading-tight mt-0.5">{address}</p>
                    {lat && lng && (
                      <p className="text-[10px] text-brand-700 font-mono mt-0.5">
                        {lat.toFixed(5)}, {lng.toFixed(5)}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Foto / Thumbnail URL */}
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1 flex items-center gap-1.5">
                <ImageIcon size={14} className="text-stone-400" />
                Foto / Thumbnail Agenda (Opsional URL)
              </label>
              <input
                type="url"
                value={thumbnailUrl}
                onChange={(e) => setThumbnailUrl(e.target.value)}
                placeholder="https://images.unsplash.com/..."
                className="w-full rounded-2xl border border-stone-200 bg-stone-50/70 p-2.5 text-xs font-medium text-stone-900 placeholder:text-stone-400 focus:bg-white focus:border-brand-500 focus:outline-none"
              />
            </div>

            {/* Catatan / Tips Muthawif */}
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1 flex items-center gap-1.5">
                <NotePencil size={14} className="text-stone-400" />
                Catatan Penting / Tips
              </label>
              <textarea
                rows={2}
                value={notesText}
                onChange={(e) => setNotesText(e.target.value)}
                placeholder="Catatan pakaian ihram, kontak muthawif, atau nomor gate..."
                className="w-full rounded-2xl border border-stone-200 bg-stone-50/70 p-2.5 text-xs text-stone-900 placeholder:text-stone-400 focus:bg-white focus:border-brand-500 focus:outline-none resize-none"
              />
            </div>

            {/* Checklist Tugas / Persiapan */}
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <CheckSquareOffset size={14} className="text-stone-400" />
                  Daftar Tugas / Checklist
                </span>
                <span className="text-[11px] text-stone-400">
                  {tasksList.length} tugas
                </span>
              </label>

              {tasksList.length > 0 && (
                <div className="space-y-1.5 mb-2 max-h-36 overflow-y-auto">
                  {tasksList.map((t) => (
                    <div
                      key={t.id}
                      className="flex items-center justify-between gap-2 p-2 rounded-xl bg-stone-50 border border-stone-200/80 text-xs"
                    >
                      <button
                        type="button"
                        onClick={() => handleToggleTaskDone(t.id)}
                        className={`flex-1 text-left flex items-center gap-2 ${
                          t.done ? "text-stone-400 line-through" : "text-stone-800"
                        }`}
                      >
                        <span
                          className={`grid h-4 w-4 place-items-center rounded border ${
                            t.done
                              ? "bg-brand-600 border-brand-600 text-white"
                              : "border-stone-300 bg-white"
                          }`}
                        >
                          {t.done && <Check size={10} weight="bold" />}
                        </span>
                        <span>{t.title}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRemoveTask(t.id)}
                        className="text-stone-400 hover:text-rose-600 p-1 transition"
                      >
                        <Trash size={13} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={newTaskInput}
                  onChange={(e) => setNewTaskInput(e.target.value)}
                  placeholder="Tambah item tugas baru..."
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddNewTask();
                    }
                  }}
                  className="flex-1 rounded-2xl border border-stone-200 bg-stone-50/70 p-2.5 text-xs text-stone-900 focus:bg-white focus:border-brand-500 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={handleAddNewTask}
                  className="rounded-2xl bg-brand-50 hover:bg-brand-100 border border-brand-200 px-3 py-2.5 text-xs font-bold text-brand-700 transition active:scale-95 flex items-center gap-1"
                >
                  <Plus size={14} weight="bold" />
                  <span>Tambah</span>
                </button>
              </div>
            </div>
          </div>

          {/* Footer Submit Actions */}
          <div className="pt-3 border-t border-stone-100 flex items-center justify-end gap-2.5 shrink-0">
            <button
              type="button"
              disabled={loading}
              onClick={onClose}
              className="rounded-2xl border border-stone-200 px-4 py-2.5 text-xs font-semibold text-stone-600 hover:bg-stone-50 active:scale-95 transition"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-brand-600 hover:bg-brand-700 active:scale-95 px-5 py-2.5 text-xs font-bold text-white shadow-cta transition disabled:opacity-50"
            >
              {loading ? (
                <>
                  <CircleNotch size={15} className="animate-spin" />
                  <span>Menyimpan...</span>
                </>
              ) : (
                <>
                  <Check size={15} weight="bold" />
                  <span>Simpan Perubahan</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Free Interactive Leaflet Map Picker Modal */}
      {isMapPickerOpen && (
        <FreeMapLocationPicker
          isOpen={isMapPickerOpen}
          onClose={() => setIsMapPickerOpen(false)}
          onSelectLocation={handleLocationSelected}
          initialLat={lat}
          initialLng={lng}
          initialAddress={address}
          initialName={locationName || name}
        />
      )}
    </div>,
    document.body
  );
}

