"use client";

import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { createClient } from "@/utils/supabase/client";
import {
  Sparkle,
  X,
  Plus,
  Check,
  AirplaneTilt,
  Bed,
  ForkKnife,
  Mosque,
  Compass,
  Train,
  Bus,
  Clock,
  MapPin,
  CircleNotch,
  CheckCircle,
  FileText,
  Trash,
  ArrowRight,
  MagnifyingGlass,
  MapTrifold,
  Star,
} from "@phosphor-icons/react";
import type { Trip } from "@/types";
import { format, parseISO, addDays } from "date-fns";
import type { ExtractedAgendaItem } from "@/app/api/ai/extract-itinerary/route";
import {
  POPULAR_LANDMARKS,
  extractCityName,
  type LandmarkPreset,
} from "@/lib/geo";
import FreeMapLocationPicker, {
  type SelectedLocationResult,
} from "@/components/FreeMapLocationPicker";

interface AiExtractItineraryModalProps {
  trip: Trip;
  isOpen: boolean;
  onClose: () => void;
  onImportSuccess?: () => void;
}

interface ItemWithLocationState extends ExtractedAgendaItem {
  selected: boolean;
  city?: string | null;
  lat?: number | null;
  lng?: number | null;
}

const CATEGORY_CONFIG: Record<
  string,
  { label: string; icon: any; color: string }
> = {
  flight: { label: "Penerbangan", icon: AirplaneTilt, color: "bg-brand-50 text-brand-600 border-brand-200" },
  hotel: { label: "Penginapan", icon: Bed, color: "bg-amber-50 text-amber-600 border-amber-200" },
  food: { label: "Restoran", icon: ForkKnife, color: "bg-orange-50 text-orange-600 border-orange-200" },
  pray: { label: "Ibadah", icon: Mosque, color: "bg-emerald-50 text-emerald-600 border-emerald-200" },
  explore: { label: "Ziarah/Wisata", icon: Compass, color: "bg-blue-50 text-blue-600 border-blue-200" },
  train: { label: "Kereta", icon: Train, color: "bg-purple-50 text-purple-600 border-purple-200" },
  bus: { label: "Bus", icon: Bus, color: "bg-stone-100 text-stone-600 border-stone-200" },
  transit: { label: "Transit", icon: AirplaneTilt, color: "bg-stone-100 text-stone-600 border-stone-200" },
  car: { label: "Mobil", icon: Compass, color: "bg-stone-100 text-stone-600 border-stone-200" },
  other: { label: "Lainnya", icon: Compass, color: "bg-stone-100 text-stone-600 border-stone-200" },
};

const SAMPLE_TEMPLATES = [
  {
    title: "Rundown 3 Hari",
    text: `Hari 1
08:00 - 14:00 Penerbangan SV817 Jakarta ke Jeddah
15:30 - 18:00 Perjalanan Kereta Cepat Haramain ke Madinah
19:00 - 20:30 Check-in Hotel Frontel Al Harithia Madinah

Hari 2
04:30 - 06:30 Shalat Subuh & Ziarah Raudhah Masjid Nabawi
08:30 - 11:30 Ziarah Masjid Quba, Jabal Uhud, dan Kebun Kurma
12:30 - 13:30 Makan Siang di Restoran Al Romansiah Madinah

Hari 3
09:00 - 12:00 Persiapan Ihram & Miqat di Masjid Bir Ali
14:00 - 16:30 Perjalanan ke Makkah
19:30 - 22:30 Pelaksanaan Ibadah Umrah di Masjidil Haram`,
  },
  {
    title: "E-Ticket Pesawat",
    text: `SAUDIA AIRLINES E-TICKET CONFIRMATION
Booking Reference: SV-992812
Penerbangan: SV817
Tanggal: 26 Oktober 2026
Rute: Jakarta (CGK Terminal 3) -> Jeddah (JED Terminal 1)
Waktu Keberangkatan: 08:00 WIB
Waktu Tiba: 14:30 AST
Bagasi: 2 x 23kg`,
  },
  {
    title: "Voucher Hotel",
    text: `HOTEL BOOKING CONFIRMATION
Hotel: Pullman Zamzam Makkah
Alamat: Abraj Al Bait Complex, King Abdul Aziz Endowment, Makkah
Check-in: 29 Oktober 2026 (Pukul 14:00)
Check-out: 02 November 2026 (Pukul 12:00)
Kamar: 2 Quad Room (Executive Haram View)
Konfirmasi: PLM-MKH-772910`,
  },
];

interface MapSearchResult {
  place_id: number;
  display_name: string;
  name?: string;
  lat: string;
  lon: string;
}

/**
 * Interactive Location Autocomplete Input with Map suggestions and City Extraction
 */
function AgendaLocationInput({
  item,
  onLocationSelected,
  onOpenMapPicker,
}: {
  item: ItemWithLocationState;
  onLocationSelected: (address: string, city: string | null, lat?: number, lng?: number) => void;
  onOpenMapPicker: (item: ItemWithLocationState) => void;
}) {
  const [query, setQuery] = useState(item.address || "");
  const [isOpen, setIsOpen] = useState(false);
  const [results, setResults] = useState<MapSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setQuery(item.address || "");
  }, [item.address]);

  // Handle outside click to close dropdown
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const handleInputChange = (val: string) => {
    setQuery(val);
    setIsOpen(true);
    const autoCity = extractCityName(val, item.name);
    onLocationSelected(val, autoCity, item.lat ?? undefined, item.lng ?? undefined);

    if (debounceTimer.current) clearTimeout(debounceTimer.current);

    if (!val.trim() || val.length < 2) {
      setResults([]);
      setSearching(false);
      return;
    }

    setSearching(true);
    debounceTimer.current = setTimeout(async () => {
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
            val
          )}&addressdetails=1&limit=5`,
          { headers: { "Accept-Language": "id,en" } }
        );
        if (res.ok) {
          const data: MapSearchResult[] = await res.json();
          setResults(data || []);
        }
      } catch (err) {
        console.error("Location search error:", err);
      } finally {
        setSearching(false);
      }
    }, 350);
  };

  const handleSelectPreset = (preset: LandmarkPreset) => {
    setQuery(preset.address);
    const city = extractCityName(preset.address, preset.name, preset.lat, preset.lng);
    onLocationSelected(preset.address, city, preset.lat, preset.lng);
    setIsOpen(false);
  };

  const handleSelectSearchResult = (result: MapSearchResult) => {
    const lat = parseFloat(result.lat);
    const lng = parseFloat(result.lon);
    setQuery(result.display_name);
    const city = extractCityName(result.display_name, result.name, lat, lng);
    onLocationSelected(result.display_name, city, lat, lng);
    setIsOpen(false);
  };

  // Filter matching popular landmarks
  const matchingPresets = POPULAR_LANDMARKS.filter((p) => {
    if (!query.trim()) return false;
    const q = query.toLowerCase();
    return (
      p.name.toLowerCase().includes(q) ||
      p.address.toLowerCase().includes(q) ||
      p.category.toLowerCase().includes(q)
    );
  }).slice(0, 3);

  const recognizedCity = item.city || extractCityName(item.address, item.name, item.lat, item.lng);

  return (
    <div className="relative flex-1" ref={dropdownRef}>
      <div className="flex items-center gap-1 bg-stone-50 hover:bg-white focus-within:bg-white px-2.5 py-1.5 rounded-xl border border-stone-200/80 focus-within:border-brand-500 focus-within:ring-2 focus-within:ring-brand-500/20 transition shadow-xs">
        <MapPin size={14} weight="fill" className="text-rose-500 shrink-0" />
        <input
          type="text"
          value={query}
          onFocus={() => setIsOpen(true)}
          onChange={(e) => handleInputChange(e.target.value)}
          placeholder="Ketik lokasi / cari di peta..."
          className="w-full bg-transparent text-xs text-stone-800 focus:outline-none placeholder:text-stone-400 truncate"
        />

        {/* City Badge Tag */}
        {recognizedCity && (
          <span className="inline-flex items-center gap-0.5 rounded-md bg-emerald-100 text-emerald-800 border border-emerald-300/80 px-1.5 py-0.5 text-[10px] font-bold shrink-0 shadow-2xs">
            <span>📍</span>
            <span>{recognizedCity}</span>
          </span>
        )}

        {/* Pick on Visual Map Button */}
        <button
          type="button"
          onClick={() => onOpenMapPicker(item)}
          className="grid h-6 w-6 place-items-center rounded-lg text-stone-400 hover:text-brand-600 hover:bg-brand-50 transition shrink-0"
          title="Buka Peta Interaktif"
        >
          <MapTrifold size={14} weight="bold" />
        </button>
      </div>

      {/* Autocomplete Dropdown */}
      {isOpen && (
        <div className="absolute left-0 right-0 top-full mt-1.5 z-[1000] rounded-2xl bg-white border border-stone-200 shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 max-h-56 overflow-y-auto hide-scroll text-left">
          {searching && (
            <div className="flex items-center gap-2 px-3 py-2 text-xs text-stone-500 border-b border-stone-100 bg-stone-50/50">
              <CircleNotch size={14} className="animate-spin text-brand-600" />
              <span>Mencari titik lokasi di peta...</span>
            </div>
          )}

          {/* Map Search Results */}
          {results.length > 0 && (
            <div className="p-1.5">
              <span className="block text-[10px] font-bold text-stone-400 uppercase tracking-wider px-2 py-1">
                Hasil Pencarian Peta
              </span>
              {results.map((res) => {
                const city = extractCityName(res.display_name, res.name, parseFloat(res.lat), parseFloat(res.lon));
                return (
                  <button
                    key={res.place_id}
                    type="button"
                    onClick={() => handleSelectSearchResult(res)}
                    className="w-full flex items-start gap-2.5 rounded-xl px-2.5 py-2 text-left hover:bg-brand-50 transition group"
                  >
                    <MapPin size={15} className="text-brand-600 shrink-0 mt-0.5" weight="fill" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-stone-900 group-hover:text-brand-700 truncate">
                          {res.name || res.display_name.split(",")[0]}
                        </span>
                        {city && (
                          <span className="text-[9.5px] font-bold px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800">
                            {city}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-stone-500 truncate leading-tight mt-0.5">
                        {res.display_name}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {/* Matching Popular Landmarks */}
          {matchingPresets.length > 0 && (
            <div className="p-1.5 border-t border-stone-100 bg-amber-50/30">
              <span className="block text-[10px] font-bold text-amber-800 uppercase tracking-wider px-2 py-1 flex items-center gap-1">
                <Star size={12} weight="fill" className="text-amber-500" />
                <span>Rekomendasi Landmark Tanah Suci</span>
              </span>
              {matchingPresets.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => handleSelectPreset(preset)}
                  className="w-full flex items-start gap-2 rounded-xl px-2.5 py-1.5 text-left hover:bg-amber-100/60 transition group"
                >
                  <span className="text-xs shrink-0">📍</span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-stone-900 truncate">
                        {preset.name}
                      </span>
                      <span className="text-[9.5px] font-bold px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800">
                        {extractCityName(preset.address, preset.name, preset.lat, preset.lng)}
                      </span>
                    </div>
                    <p className="text-[10.5px] text-stone-500 truncate">{preset.address}</p>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Quick presets list when no input or results */}
          {results.length === 0 && !searching && (
            <div className="p-2 space-y-1">
              <span className="block text-[10px] font-bold text-stone-400 uppercase tracking-wider px-2 py-0.5">
                Pilihan Lokasi Populer
              </span>
              {POPULAR_LANDMARKS.slice(0, 4).map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => handleSelectPreset(preset)}
                  className="w-full flex items-center justify-between gap-2 rounded-xl px-2 py-1.5 text-left text-xs hover:bg-stone-100 transition"
                >
                  <span className="font-semibold text-stone-800 truncate">{preset.name}</span>
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 shrink-0">
                    {extractCityName(preset.address, preset.name, preset.lat, preset.lng)}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function AiExtractItineraryModal({
  trip,
  isOpen,
  onClose,
  onImportSuccess,
}: AiExtractItineraryModalProps) {
  const [mounted, setMounted] = useState(false);
  const [inputText, setInputText] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [extractedItems, setExtractedItems] = useState<ItemWithLocationState[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Map picker state for visual pin placement
  const [mapPickerItem, setMapPickerItem] = useState<ItemWithLocationState | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!isOpen || !mounted) return null;

  const handleExtract = async () => {
    if (!inputText.trim()) {
      setErrorMsg("Mohon masukkan teks itinerary atau jadwal terlebih dahulu.");
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    try {
      const res = await fetch("/api/ai/extract-itinerary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: inputText,
          tripTitle: trip.title,
          destination: trip.destination,
          startDate: trip.start_date,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Gagal mengekstrak itinerary.");
      }

      // Populate initial city extraction and selection
      const itemsWithSelection: ItemWithLocationState[] = (data.items || []).map(
        (item: ExtractedAgendaItem) => {
          const detectedCity = extractCityName(item.address, item.name);
          return {
            ...item,
            selected: true,
            city: detectedCity,
            lat: item.lat || null,
            lng: item.lng || null,
          };
        }
      );

      setExtractedItems(itemsWithSelection);
    } catch (err: any) {
      console.error("AI Extraction Error:", err);
      setErrorMsg(err.message || "Terjadi kesalahan saat memproses dengan AI.");
    } finally {
      setLoading(false);
    }
  };

  const toggleSelectAll = () => {
    const allSelected = extractedItems.every((i) => i.selected);
    setExtractedItems((prev) =>
      prev.map((i) => ({ ...i, selected: !allSelected }))
    );
  };

  const toggleItem = (id: string) => {
    setExtractedItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, selected: !i.selected } : i))
    );
  };

  const updateItemField = (
    id: string,
    field: keyof ItemWithLocationState,
    value: any
  ) => {
    setExtractedItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, [field]: value } : i))
    );
  };

  const handleLocationUpdate = (
    id: string,
    address: string,
    city: string | null,
    lat?: number,
    lng?: number
  ) => {
    setExtractedItems((prev) =>
      prev.map((i) =>
        i.id === id
          ? {
              ...i,
              address,
              city: city || extractCityName(address, i.name, lat, lng),
              lat: lat ?? i.lat,
              lng: lng ?? i.lng,
            }
          : i
      )
    );
  };

  const handleSelectFromMapPicker = (loc: SelectedLocationResult) => {
    if (!mapPickerItem) return;
    const city = extractCityName(loc.address, loc.name, loc.lat, loc.lng);
    handleLocationUpdate(mapPickerItem.id, loc.address, city, loc.lat, loc.lng);
    setMapPickerItem(null);
  };

  const removeItem = (id: string) => {
    setExtractedItems((prev) => prev.filter((i) => i.id !== id));
  };

  const handleImportToItinerary = async () => {
    const selected = extractedItems.filter((i) => i.selected);
    if (selected.length === 0) {
      setErrorMsg("Pilih minimal 1 agenda untuk diimport.");
      return;
    }

    setSaving(true);
    setErrorMsg(null);

    try {
      const supabase = createClient();

      // 1. Fetch existing itinerary days for this trip
      const { data: existingDays, error: daysErr } = await supabase
        .from("itinerary_days")
        .select("*")
        .eq("trip_id", trip.id)
        .order("day_number", { ascending: true });

      if (daysErr) throw daysErr;

      const dayMap: Record<number, string> = {};
      (existingDays || []).forEach((d) => {
        dayMap[d.day_number] = d.id;
      });

      // 2. Identify and create any missing days
      const requiredDayNumbers = Array.from(
        new Set(selected.map((s) => s.dayNumber))
      ).sort((a, b) => a - b);

      for (const dayNum of requiredDayNumbers) {
        if (!dayMap[dayNum]) {
          let dayDate: string | null = null;
          // Check if extracted item has date
          const itemWithDate = selected.find(
            (s) => s.dayNumber === dayNum && s.date
          );
          if (itemWithDate?.date) {
            dayDate = itemWithDate.date;
          } else if (trip.start_date) {
            try {
              const start = parseISO(trip.start_date);
              dayDate = format(addDays(start, dayNum - 1), "yyyy-MM-dd");
            } catch {}
          }

          const { data: newDay, error: createDayErr } = await supabase
            .from("itinerary_days")
            .insert({
              trip_id: trip.id,
              day_number: dayNum,
              date: dayDate,
              notes: null,
            })
            .select()
            .single();

          if (createDayErr || !newDay) {
            throw new Error(
              createDayErr?.message || `Gagal membuat Hari ${dayNum}`
            );
          }

          dayMap[dayNum] = newDay.id;
        }
      }

      // 3. Batch insert places with extracted city/coords
      const placesToInsert = selected.map((item, idx) => ({
        day_id: dayMap[item.dayNumber],
        name: item.name.trim(),
        address: item.address?.trim() || null,
        lat: item.lat || null,
        lng: item.lng || null,
        start_time: item.startTime || null,
        end_time: item.endTime || null,
        category: item.category || "explore",
        cost: item.cost || 0,
        notes: item.notes?.trim() || null,
        sort_order: idx + 1,
        tasks_json: [],
      }));

      const { error: insertPlacesErr } = await supabase
        .from("places")
        .insert(placesToInsert);

      if (insertPlacesErr) throw insertPlacesErr;

      setSuccessToast(
        `Berhasil mengimport ${selected.length} agenda ke Itinerary!`
      );

      setTimeout(() => {
        onImportSuccess?.();
        onClose();
      }, 1200);
    } catch (err: any) {
      console.error("Gagal import agenda:", err);
      setErrorMsg(err.message || "Gagal mengimport agenda ke database.");
      setSaving(false);
    }
  };

  const selectedCount = extractedItems.filter((i) => i.selected).length;
  const uniqueDaysCount = Array.from(
    new Set(extractedItems.map((i) => i.dayNumber))
  ).length;

  return createPortal(
    <div
      className="fixed inset-0 z-[100000] flex items-end sm:items-center justify-center bg-stone-950/75 backdrop-blur-xs p-0 sm:p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="ai-extract-modal-title"
        onClick={(e) => e.stopPropagation()}
        className="w-full sm:max-w-2xl bg-white rounded-t-[2rem] sm:rounded-3xl shadow-2xl border border-stone-200/80 text-stone-800 animate-in slide-in-from-bottom-6 sm:zoom-in-95 duration-200 max-h-[92vh] flex flex-col overflow-hidden pb-[calc(env(safe-area-inset-bottom)+1rem)] sm:pb-0"
      >
        {/* Mobile Handle */}
        <div className="mx-auto w-12 h-1.5 rounded-full bg-stone-300 mt-3 mb-1 sm:hidden shrink-0" />

        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-stone-100 shrink-0 bg-white">
          <div className="flex items-center gap-2.5">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-brand-500 to-teal-600 text-white shadow-xs">
              <Sparkle size={20} weight="fill" />
            </span>
            <div>
              <h3
                id="ai-extract-modal-title"
                className="text-base sm:text-lg font-bold text-stone-900 leading-tight"
              >
                AI Itinerary &amp; Multi-Agenda Extractor
              </h3>
              <p className="text-xs text-stone-500 mt-0.5">
                Ekstrak otomatis teks rundown, e-ticket, atau voucher hotel
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded-full text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* Toast / Error Banner */}
        {errorMsg && (
          <div className="mx-5 mt-4 p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center justify-between gap-2">
            <span>{errorMsg}</span>
            <button
              type="button"
              onClick={() => setErrorMsg(null)}
              className="text-rose-500 hover:text-rose-700"
            >
              <X size={14} />
            </button>
          </div>
        )}

        {successToast && (
          <div className="mx-5 mt-4 p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
            <CheckCircle size={16} weight="fill" className="text-emerald-600 shrink-0" />
            <span className="font-semibold">{successToast}</span>
          </div>
        )}

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4 hide-scroll">
          {extractedItems.length === 0 ? (
            /* STEP 1: Input Text & Samples */
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
                  Tempel Teks Rundown / Konfirmasi
                </label>
                <textarea
                  rows={8}
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder={`Contoh:\nHari 1: Penerbangan SV817 Jakarta ke Jeddah (08:00 - 14:30)\nHari 2: Ziarah Masjid Quba dan Jabal Uhud (09:00)\nHari 3: Check-in Hotel Pullman Zamzam Makkah`}
                  className="w-full rounded-2xl border border-stone-200 bg-stone-50/60 p-3.5 text-xs sm:text-sm text-stone-900 placeholder:text-stone-400 focus:bg-white focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 font-mono leading-relaxed resize-none transition"
                />
              </div>

              {/* Sample Templates */}
              <div>
                <p className="text-[11px] font-semibold text-stone-500 mb-1.5">
                  Atau coba template contoh:
                </p>
                <div className="flex flex-wrap gap-2">
                  {SAMPLE_TEMPLATES.map((tmpl) => (
                    <button
                      key={tmpl.title}
                      type="button"
                      onClick={() => setInputText(tmpl.text)}
                      className="inline-flex items-center gap-1 rounded-xl bg-stone-100 hover:bg-brand-50 border border-stone-200/80 px-2.5 py-1 text-[11px] font-medium text-stone-700 hover:text-brand-700 transition"
                    >
                      <FileText size={13} className="text-brand-600" />
                      <span>{tmpl.title}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            /* STEP 2: Interactive Multi-Agenda Preview & Editor */
            <div className="space-y-3.5">
              <div className="flex items-center justify-between pb-2 border-b border-stone-100 flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1 bg-brand-50 border border-brand-200 text-brand-700 font-bold px-2.5 py-1 rounded-xl text-xs">
                    <Sparkle size={13} weight="fill" />
                    {extractedItems.length} Agenda Ditemukan ({uniqueDaysCount} Hari)
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={toggleSelectAll}
                    className="text-xs font-semibold text-brand-600 hover:text-brand-700 hover:underline"
                  >
                    {extractedItems.every((i) => i.selected)
                      ? "Batalkan Pilihan"
                      : "Pilih Semua"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setExtractedItems([])}
                    className="text-xs font-semibold text-stone-500 hover:text-stone-800"
                  >
                    Ubah Teks Input
                  </button>
                </div>
              </div>

              {/* List of Agenda Items */}
              <div className="space-y-3">
                {extractedItems.map((item) => {
                  const cat = CATEGORY_CONFIG[item.category] || CATEGORY_CONFIG.explore;
                  const IconComp = cat.icon;

                  return (
                    <div
                      key={item.id}
                      className={`rounded-2xl p-3.5 sm:p-4 transition border ${
                        item.selected
                          ? "bg-white border-brand-300 shadow-sm"
                          : "bg-stone-50/70 border-stone-200/60 opacity-60"
                      }`}
                    >
                      <div className="flex items-start gap-2.5 sm:gap-3">
                        {/* Checkbox */}
                        <button
                          type="button"
                          onClick={() => toggleItem(item.id)}
                          className={`grid h-5 w-5 place-items-center rounded-lg border mt-1 transition shrink-0 ${
                            item.selected
                              ? "bg-brand-600 border-brand-600 text-white"
                              : "border-stone-300 bg-white"
                          }`}
                        >
                          {item.selected && <Check size={13} weight="bold" />}
                        </button>

                        {/* Item Details Form */}
                        <div className="flex-1 min-w-0 space-y-2.5">
                          {/* Row 1: Day Badge, Name & Category */}
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[11px] font-bold text-stone-700 bg-stone-100 px-2 py-0.5 rounded-lg border border-stone-200 shrink-0">
                              Hari {item.dayNumber}
                            </span>

                            <input
                              type="text"
                              value={item.name}
                              onChange={(e) =>
                                updateItemField(item.id, "name", e.target.value)
                              }
                              className="font-bold text-xs sm:text-sm text-stone-900 bg-transparent border-b border-stone-200 focus:border-brand-500 focus:bg-white px-1.5 py-0.5 rounded focus:outline-none flex-1 min-w-[140px]"
                              placeholder="Nama Agenda"
                            />

                            <select
                              value={item.category}
                              onChange={(e) =>
                                updateItemField(
                                  item.id,
                                  "category",
                                  e.target.value
                                )
                              }
                              className="text-[11px] font-semibold rounded-lg bg-stone-100 border border-stone-200 px-2 py-1 text-stone-700 shrink-0 focus:outline-none focus:ring-1 focus:ring-brand-500"
                            >
                              {Object.entries(CATEGORY_CONFIG).map(([k, v]) => (
                                <option key={k} value={k}>
                                  {v.label}
                                </option>
                              ))}
                            </select>

                            <button
                              type="button"
                              onClick={() => removeItem(item.id)}
                              className="text-stone-400 hover:text-rose-600 p-1 rounded-lg transition shrink-0"
                              title="Hapus agenda ini"
                            >
                              <Trash size={14} />
                            </button>
                          </div>

                          {/* Row 2: Location Search with Map Autocomplete & City Extraction */}
                          <div className="space-y-1">
                            <label className="block text-[10.5px] font-semibold text-stone-400 uppercase tracking-wide">
                              Lokasi &amp; Kota di Peta
                            </label>
                            <AgendaLocationInput
                              item={item}
                              onLocationSelected={(address, city, lat, lng) =>
                                handleLocationUpdate(item.id, address, city, lat, lng)
                              }
                              onOpenMapPicker={(targetItem) =>
                                setMapPickerItem(targetItem)
                              }
                            />
                          </div>

                          {/* Row 3: Times & Target Day */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs pt-1">
                            {/* Time */}
                            <div className="flex items-center gap-1.5 bg-stone-50 px-2.5 py-1 rounded-xl border border-stone-200/60">
                              <Clock size={13} className="text-stone-400 shrink-0" />
                              <span className="text-[11px] text-stone-400 font-medium">Jam:</span>
                              <input
                                type="text"
                                value={item.startTime || ""}
                                onChange={(e) =>
                                  updateItemField(
                                    item.id,
                                    "startTime",
                                    e.target.value
                                  )
                                }
                                placeholder="08:00"
                                className="w-12 bg-transparent text-stone-800 font-mono text-center focus:outline-none border-b border-stone-300 text-xs"
                              />
                              <span className="text-stone-400">-</span>
                              <input
                                type="text"
                                value={item.endTime || ""}
                                onChange={(e) =>
                                  updateItemField(
                                    item.id,
                                    "endTime",
                                    e.target.value
                                  )
                                }
                                placeholder="10:00"
                                className="w-12 bg-transparent text-stone-800 font-mono text-center focus:outline-none border-b border-stone-300 text-xs"
                              />
                            </div>

                            {/* Change Target Day */}
                            <div className="flex items-center gap-1.5 bg-stone-50 px-2.5 py-1 rounded-xl border border-stone-200/60">
                              <span className="text-[11px] text-stone-400 font-medium shrink-0">
                                Target Hari:
                              </span>
                              <select
                                value={item.dayNumber}
                                onChange={(e) =>
                                  updateItemField(
                                    item.id,
                                    "dayNumber",
                                    parseInt(e.target.value, 10) || 1
                                  )
                                }
                                className="w-full bg-transparent text-xs font-bold text-brand-700 focus:outline-none"
                              >
                                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15].map(
                                  (n) => (
                                    <option key={n} value={n}>
                                      Hari ke-{n}
                                    </option>
                                  )
                                )}
                              </select>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3.5 border-t border-stone-100 flex items-center justify-between gap-3 shrink-0 bg-stone-50/50">
          <button
            type="button"
            onClick={onClose}
            className="h-10 px-4 rounded-xl text-stone-600 text-xs font-semibold hover:bg-stone-200/60 transition"
          >
            Batal
          </button>

          {extractedItems.length === 0 ? (
            <button
              type="button"
              onClick={handleExtract}
              disabled={loading || !inputText.trim()}
              className="h-10 px-5 rounded-2xl bg-brand-600 text-white text-xs font-bold hover:bg-brand-700 disabled:opacity-50 shadow-cta transition flex items-center gap-2 active:scale-95"
            >
              {loading ? (
                <>
                  <CircleNotch size={15} className="animate-spin" />
                  <span>Menganalisis dengan AI...</span>
                </>
              ) : (
                <>
                  <Sparkle size={15} weight="fill" />
                  <span>Ekstrak Multi-Agenda</span>
                </>
              )}
            </button>
          ) : (
            <button
              type="button"
              onClick={handleImportToItinerary}
              disabled={saving || selectedCount === 0}
              className="h-10 px-5 rounded-2xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 disabled:opacity-50 shadow-cta transition flex items-center gap-2 active:scale-95"
            >
              {saving ? (
                <>
                  <CircleNotch size={15} className="animate-spin" />
                  <span>Menyimpan ke Jadwal...</span>
                </>
              ) : (
                <>
                  <Check size={15} weight="bold" />
                  <span>Import {selectedCount} Agenda Terpilih</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Visual Map Pin Picker Modal */}
      {mapPickerItem && (
        <FreeMapLocationPicker
          isOpen={true}
          onClose={() => setMapPickerItem(null)}
          onSelectLocation={handleSelectFromMapPicker}
          initialLat={mapPickerItem.lat}
          initialLng={mapPickerItem.lng}
          initialAddress={mapPickerItem.address}
          initialName={mapPickerItem.name}
        />
      )}
    </div>,
    document.body
  );
}
