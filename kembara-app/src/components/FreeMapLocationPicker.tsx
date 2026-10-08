"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import {
  X,
  MagnifyingGlass,
  MapPin,
  Check,
  NavigationArrow,
  Compass,
  CircleNotch,
  Crosshair,
  PencilSimple,
} from "@phosphor-icons/react";
import {
  POPULAR_LANDMARKS,
  detectCurrencyFromLocation,
  type LandmarkPreset,
} from "@/lib/geo";
import "leaflet/dist/leaflet.css";

export interface SelectedLocationResult {
  name: string;
  address: string;
  lat: number;
  lng: number;
  countryCode?: string;
  defaultCurrency: "SAR" | "IDR" | "USD" | "MYR" | "EUR";
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSelectLocation: (location: SelectedLocationResult) => void;
  initialLat?: number | null;
  initialLng?: number | null;
  initialAddress?: string | null;
  initialName?: string | null;
}

interface SearchResult {
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

export default function FreeMapLocationPicker({
  isOpen,
  onClose,
  onSelectLocation,
  initialLat,
  initialLng,
  initialAddress,
  initialName,
}: Props) {
  const [mounted, setMounted] = useState(false);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markerRef = useRef<any>(null);

  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchDebounceTimer, setSearchDebounceTimer] = useState<NodeJS.Timeout | null>(null);

  // GPS state
  const [detectingGps, setDetectingGps] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);

  // Preset category tab
  const [activeTab, setActiveTab] = useState<"makkah" | "madinah" | "jeddah" | "indonesia">("makkah");

  // Selected Pin state
  const [currentLat, setCurrentLat] = useState<number>(initialLat || 21.4225);
  const [currentLng, setCurrentLng] = useState<number>(initialLng || 39.8262);
  const [currentName, setCurrentName] = useState<string>(
    initialName || (initialAddress ? "Lokasi Terpilih" : "Masjidil Haram & Ka'bah")
  );
  const [currentAddress, setCurrentAddress] = useState<string>(
    initialAddress || "Al Haram, Makkah 24231, Arab Saudi"
  );
  const [currentCountryCode, setCurrentCountryCode] = useState<string>(() => {
    if (initialLat && initialLng) {
      const cur = detectCurrencyFromLocation(initialLat, initialLng, initialAddress);
      return cur === "SAR" ? "SA" : "ID";
    }
    if (initialAddress) {
      const cur = detectCurrencyFromLocation(null, null, initialAddress);
      return cur === "SAR" ? "SA" : "ID";
    }
    return "SA";
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (initialLat != null && initialLng != null) {
      setCurrentLat(initialLat);
      setCurrentLng(initialLng);
      if (initialAddress) setCurrentAddress(initialAddress);
      if (initialName) setCurrentName(initialName);
      const cur = detectCurrencyFromLocation(initialLat, initialLng, initialAddress);
      setCurrentCountryCode(cur === "SAR" ? "SA" : "ID");
    }
  }, [initialLat, initialLng, initialAddress, initialName, isOpen]);

  // Update pin and map position
  const updateMapPin = useCallback((lat: number, lng: number, zoom = 14) => {
    if (!mapInstanceRef.current) return;
    const map = mapInstanceRef.current;

    map.setView([lat, lng], zoom, { animate: true });

    if (markerRef.current) {
      markerRef.current.setLatLng([lat, lng]);
    }
  }, []);

  // Initialize Leaflet Map
  useEffect(() => {
    if (!isOpen || !mounted || !mapContainerRef.current) return;

    let isSubscribed = true;

    async function setupMap() {
      if (mapInstanceRef.current) {
        // Map is already initialized, resize it
        setTimeout(() => {
          mapInstanceRef.current?.invalidateSize();
        }, 200);
        return;
      }

      const L = (await import("leaflet")).default;

      if (!mapContainerRef.current || !isSubscribed) return;

      if ((mapContainerRef.current as any)._leaflet_id) {
        delete (mapContainerRef.current as any)._leaflet_id;
      }

      const startLat = initialLat || 21.4225;
      const startLng = initialLng || 39.8262;

      // Create Leaflet instance
      const map = L.map(mapContainerRef.current, {
        center: [startLat, startLng],
        zoom: 14,
        zoomControl: false,
      });

      // Official OpenStreetMap tile layer (100% Free, NO API Key needed)
      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19,
      }).addTo(map);

      // Add Zoom control at bottom right
      L.control.zoom({ position: "bottomright" }).addTo(map);

      // Custom pulse Pin icon
      const pinIcon = L.divIcon({
        className: "custom-leaflet-pin",
        html: `
          <div style="position: relative; display: flex; align-items: center; justify-content: center; width: 34px; height: 34px;">
            <div style="position: absolute; width: 34px; height: 34px; background: rgba(59, 91, 185, 0.35); border-radius: 50%; animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
            <div style="position: relative; width: 28px; height: 28px; background: #2563eb; border: 2.5px solid white; border-radius: 50%; box-shadow: 0 4px 10px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center; color: white; font-size: 14px; font-weight: bold;">
              📍
            </div>
          </div>
        `,
        iconSize: [34, 34],
        iconAnchor: [17, 17],
      });

      const marker = L.marker([startLat, startLng], {
        icon: pinIcon,
        draggable: true,
      }).addTo(map);

      marker.on("dragend", async (e: any) => {
        const { lat, lng } = e.target.getLatLng();
        setCurrentLat(lat);
        setCurrentLng(lng);
        await reverseGeocode(lat, lng);
      });

      map.on("click", async (e: any) => {
        const { lat, lng } = e.latlng;
        marker.setLatLng([lat, lng]);
        setCurrentLat(lat);
        setCurrentLng(lng);
        await reverseGeocode(lat, lng);
      });

      if (isSubscribed) {
        mapInstanceRef.current = map;
        markerRef.current = marker;
      } else {
        map.remove();
      }
    }

    setupMap();

    return () => {
      isSubscribed = false;
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        markerRef.current = null;
      }
    };
  }, [isOpen, mounted, initialLat, initialLng]);

  // Reverse Geocoding with Open API (Nominatim OSM)
  const reverseGeocode = async (lat: number, lng: number) => {
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1`,
        { headers: { "Accept-Language": "id,en" } }
      );
      if (!res.ok) return;
      const data = await res.json();
      if (data && data.display_name) {
        const title =
          data.name ||
          data.address?.amenity ||
          data.address?.road ||
          data.address?.city ||
          "Lokasi Terpilih";
        setCurrentName(title);
        setCurrentAddress(data.display_name);
        const detected = detectCurrencyFromLocation(lat, lng, data.display_name, data.address?.country_code);
        setCurrentCountryCode(detected === "SAR" ? "SA" : "ID");
      }
    } catch (err) {
      console.error("Reverse geocoding error:", err);
    }
  };

  // Autocomplete Search
  const handleSearchChange = (query: string) => {
    setSearchQuery(query);
    if (searchDebounceTimer) clearTimeout(searchDebounceTimer);

    if (!query.trim() || query.length < 2) {
      setSearchResults([]);
      setSearching(false);
      return;
    }

    setSearching(true);
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
            query
          )}&addressdetails=1&limit=6`,
          { headers: { "Accept-Language": "id,en" } }
        );
        if (!res.ok) return;
        const results: SearchResult[] = await res.json();
        setSearchResults(results);
      } catch (err) {
        console.error("Search geocoding error:", err);
      } finally {
        setSearching(false);
      }
    }, 400);

    setSearchDebounceTimer(timer);
  };

  // GPS Geolocation Handler
  const handleUseCurrentLocation = () => {
    if (typeof window === "undefined" || !navigator.geolocation) {
      setGpsError("Perangkat tidak mendukung deteksi lokasi GPS.");
      return;
    }

    setDetectingGps(true);
    setGpsError(null);

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        setCurrentLat(latitude);
        setCurrentLng(longitude);
        updateMapPin(latitude, longitude, 16);
        await reverseGeocode(latitude, longitude);
        setDetectingGps(false);
      },
      (err) => {
        setDetectingGps(false);
        if (err.code === 1) {
          setGpsError("Izin akses lokasi ditolak oleh browser/perangkat.");
        } else {
          setGpsError("Gagal mendeteksi koordinat GPS saat ini.");
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const handleSelectSearchResult = (item: SearchResult) => {
    const lat = parseFloat(item.lat);
    const lng = parseFloat(item.lon);
    const title = item.name || item.display_name.split(",")[0] || "Lokasi Terpilih";

    setCurrentLat(lat);
    setCurrentLng(lng);
    setCurrentName(title);
    setCurrentAddress(item.display_name);

    const detected = detectCurrencyFromLocation(
      lat,
      lng,
      item.display_name,
      item.address?.country_code
    );
    setCurrentCountryCode(detected === "SAR" ? "SA" : "ID");

    updateMapPin(lat, lng, 16);
    setSearchResults([]);
    setSearchQuery("");
  };

  const handleSelectPreset = (preset: LandmarkPreset) => {
    setCurrentLat(preset.lat);
    setCurrentLng(preset.lng);
    setCurrentName(preset.name);
    setCurrentAddress(preset.address);
    setCurrentCountryCode(preset.countryCode);
    updateMapPin(preset.lat, preset.lng, 15);
  };

  const detectedCurrency = detectCurrencyFromLocation(
    currentLat,
    currentLng,
    currentAddress,
    currentCountryCode
  );

  const handleConfirm = () => {
    onSelectLocation({
      name: currentName,
      address: currentAddress,
      lat: currentLat,
      lng: currentLng,
      countryCode: currentCountryCode,
      defaultCurrency: detectedCurrency,
    });
    onClose();
  };

  if (!isOpen || !mounted) return null;

  const currentPresets = POPULAR_LANDMARKS.filter((p) => p.category === activeTab);

  return createPortal(
    <div className="fixed inset-0 z-[100005] flex items-center justify-center p-3 sm:p-5 bg-stone-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-4xl h-[92vh] max-h-[780px] bg-white rounded-3xl shadow-2xl border border-stone-200 flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-stone-100 flex items-center justify-between shrink-0 bg-white">
          <div className="flex items-center gap-2.5">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-brand-50 text-brand-600">
              <Compass size={20} weight="fill" />
            </div>
            <div>
              <h3 className="text-base font-bold text-stone-900 leading-tight">
                Pilih Lokasi Agenda
              </h3>
              <p className="text-xs text-stone-500">
                Pencarian peta &amp; deteksi mata uang otomatis (IDR / SAR)
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded-full text-stone-400 hover:bg-stone-100 hover:text-stone-700 transition"
          >
            <X size={18} weight="bold" />
          </button>
        </div>

        {/* Content Body: Split between Controls & Map */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 overflow-hidden">
          {/* Left Panel: Search & Presets */}
          <div className="lg:col-span-5 flex flex-col border-b lg:border-b-0 lg:border-r border-stone-100 bg-stone-50/50 p-4 overflow-y-auto hide-scroll space-y-3.5">
            {/* Search Box & GPS Button */}
            <div className="space-y-2">
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400">
                  {searching ? (
                    <CircleNotch size={16} className="animate-spin text-brand-600" />
                  ) : (
                    <MagnifyingGlass size={16} />
                  )}
                </span>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  placeholder="Cari hotel, masjid, bandara, restoran..."
                  className="w-full rounded-2xl border border-stone-200 bg-white pl-9 pr-8 py-2 text-xs text-stone-900 placeholder:text-stone-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100 shadow-sm"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery("");
                      setSearchResults([]);
                    }}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>

              {/* GPS Geolocation Button */}
              <button
                type="button"
                disabled={detectingGps}
                onClick={handleUseCurrentLocation}
                className="w-full inline-flex items-center justify-center gap-2 rounded-2xl bg-white hover:bg-brand-50 border border-brand-200/80 px-3 py-2 text-xs font-semibold text-brand-700 shadow-xs transition active:scale-95 disabled:opacity-60"
              >
                {detectingGps ? (
                  <>
                    <CircleNotch size={14} className="animate-spin text-brand-600" />
                    <span>Mendeteksi Lokasi GPS...</span>
                  </>
                ) : (
                  <>
                    <Crosshair size={14} weight="bold" className="text-brand-600" />
                    <span>Gunakan Lokasi Saya Saat Ini</span>
                  </>
                )}
              </button>

              {gpsError && (
                <p className="text-[11px] text-red-500 bg-red-50 p-2 rounded-xl border border-red-200">
                  {gpsError}
                </p>
              )}
            </div>

            {/* Autocomplete Results Dropdown */}
            {searchResults.length > 0 && (
              <div className="rounded-2xl border border-brand-200 bg-white p-1.5 shadow-md space-y-1">
                <p className="px-2.5 py-1 text-[10px] font-bold uppercase text-stone-400">
                  Hasil Pencarian Lokasi:
                </p>
                {searchResults.map((item) => (
                  <button
                    key={item.place_id}
                    type="button"
                    onClick={() => handleSelectSearchResult(item)}
                    className="w-full text-left rounded-xl p-2 hover:bg-brand-50 transition flex items-start gap-2"
                  >
                    <MapPin size={15} weight="fill" className="text-brand-600 shrink-0 mt-0.5" />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-stone-900 truncate">
                        {item.name || item.display_name.split(",")[0]}
                      </p>
                      <p className="text-[11px] text-stone-400 line-clamp-1">
                        {item.display_name}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* Preset Category Tabs */}
            <div>
              <p className="text-[11px] font-bold text-stone-500 uppercase tracking-wider mb-2">
                Preset Lokasi Populer
              </p>
              <div className="flex rounded-xl bg-stone-200/60 p-1 gap-1">
                {[
                  { id: "makkah", label: "Makkah" },
                  { id: "madinah", label: "Madinah" },
                  { id: "jeddah", label: "Jeddah" },
                  { id: "indonesia", label: "Indonesia" },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition ${
                      activeTab === tab.id
                        ? "bg-white text-stone-900 shadow-sm"
                        : "text-stone-500 hover:text-stone-800"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Landmark Preset List */}
            <div className="space-y-1.5">
              {currentPresets.map((preset) => {
                const isSelected =
                  Math.abs(currentLat - preset.lat) < 0.001 &&
                  Math.abs(currentLng - preset.lng) < 0.001;

                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => handleSelectPreset(preset)}
                    className={`w-full text-left rounded-2xl p-3 border transition flex items-start justify-between gap-2 ${
                      isSelected
                        ? "bg-brand-50/80 border-brand-300 ring-1 ring-brand-400"
                        : "bg-white hover:bg-stone-100/80 border-stone-200/80"
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-stone-900">
                          {preset.name}
                        </span>
                        <span
                          className={`text-[10px] px-1.5 py-0.2 rounded font-bold ${
                            preset.defaultCurrency === "SAR"
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-blue-100 text-blue-800"
                          }`}
                        >
                          {preset.defaultCurrency}
                        </span>
                      </div>
                      <p className="text-[11px] text-stone-500 line-clamp-1 mt-0.5">
                        {preset.address}
                      </p>
                      <p className="text-[10px] text-stone-400 italic mt-0.5">
                        {preset.description}
                      </p>
                    </div>

                    {isSelected && (
                      <span className="grid h-5 w-5 place-items-center rounded-full bg-brand-600 text-white shrink-0">
                        <Check size={12} weight="bold" />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right Panel: Interactive Map Container */}
          <div className="lg:col-span-7 relative flex flex-col h-[320px] lg:h-auto">
            {/* Map Canvas */}
            <div ref={mapContainerRef} className="flex-1 w-full h-full min-h-[300px] z-0" />

            {/* Instruction Tip */}
            <div className="absolute top-3 left-3 z-[500] pointer-events-none bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/60 shadow-sm text-[11px] text-stone-600 font-medium">
              💡 Klik pada peta atau geser pin 📍 untuk menyesuaikan titik lokasi
            </div>
          </div>
        </div>

        {/* Footer: Selected Location Bar & Actions */}
        <div className="px-5 py-3.5 border-t border-stone-200 bg-stone-50/90 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-stone-900 truncate">
                {currentName}
              </span>
              <span
                className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                  detectedCurrency === "SAR"
                    ? "bg-emerald-100 text-emerald-800"
                    : "bg-blue-100 text-blue-800"
                }`}
              >
                Mata Uang: {detectedCurrency}
              </span>
            </div>
            <p className="text-[11px] text-stone-500 truncate mt-0.5">
              {currentAddress}
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="rounded-2xl px-4 py-2.5 text-xs font-medium text-stone-600 hover:bg-stone-200 transition"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              className="inline-flex items-center gap-2 rounded-2xl bg-brand-600 px-5 py-2.5 text-xs font-bold text-white shadow-cta hover:bg-brand-700 active:scale-95 transition"
            >
              <Check size={14} weight="bold" />
              Gunakan Lokasi Ini
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
