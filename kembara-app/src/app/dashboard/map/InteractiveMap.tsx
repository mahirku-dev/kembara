"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import type { Trip } from "@/types";
import type { AgendaPlace } from "./MapClient";
import "leaflet/dist/leaflet.css";
import {
  MapPin,
  Clock,
  NavigationArrow,
  Info,
  Sparkle,
  CalendarBlank,
  X,
  Buildings,
} from "@phosphor-icons/react";
import { getGoogleMapsDirectionsUrl } from "@/lib/geo";

interface Landmark {
  id: string;
  name: string;
  city: "makkah" | "madinah" | "jeddah";
  lat: number;
  lng: number;
  category: string;
  desc: string;
}

const DEFAULT_LANDMARKS: Landmark[] = [
  {
    id: "haram",
    name: "Masjidil Haram & Ka'bah",
    city: "makkah",
    lat: 21.4225,
    lng: 39.8262,
    category: "Ibadah Utama",
    desc: "Kiblat umat Islam dunia dan tempat pelaksanaan thawaf & sai.",
  },
  {
    id: "tsur",
    name: "Gua Tsur (Jabal Tsur)",
    city: "makkah",
    lat: 21.3789,
    lng: 39.8519,
    category: "Ziarah Sejarah",
    desc: "Tempat persembunyian Rasulullah SAW dan Abu Bakar Ash-Shiddiq saat hijrah.",
  },
  {
    id: "hira",
    name: "Gua Hira (Jabal Nur)",
    city: "makkah",
    lat: 21.4583,
    lng: 39.8589,
    category: "Ziarah Sejarah",
    desc: "Tempat turunnya wahyu pertama Al-Qur'an (Surat Al-Alaq 1-5).",
  },
  {
    id: "rahmah",
    name: "Jabal Rahmah (Arafah)",
    city: "makkah",
    lat: 21.3547,
    lng: 39.9842,
    category: "Ziarah Sejarah",
    desc: "Tempat bertemunya Nabi Adam AS dan Sayyidah Hawa di Padang Arafah.",
  },
  {
    id: "nabawi",
    name: "Masjid Nabawi & Raudhah",
    city: "madinah",
    lat: 24.4672,
    lng: 39.6111,
    category: "Ibadah Utama",
    desc: "Masjid Rasulullah SAW, Raudhah Syarifah, dan makam beliau.",
  },
  {
    id: "quba",
    name: "Masjid Quba",
    city: "madinah",
    lat: 24.4394,
    lng: 39.6172,
    category: "Masjid Bersejarah",
    desc: "Masjid pertama yang dibangun Rasulullah SAW dalam peradaban Islam.",
  },
  {
    id: "uhud",
    name: "Jabal Uhud & Makam Syuhada",
    city: "madinah",
    lat: 24.5034,
    lng: 39.6121,
    category: "Ziarah Sejarah",
    desc: "Lokasi peristiwa Perang Uhud dan makam Sayyidina Hamzah RA.",
  },
  {
    id: "qiblatain",
    name: "Masjid Qiblatain",
    city: "madinah",
    lat: 24.4842,
    lng: 39.5786,
    category: "Masjid Bersejarah",
    desc: "Tempat turunnya perintah perpindahan arah kiblat dari Baitul Maqdis ke Ka'bah.",
  },
  {
    id: "airport_jeddah",
    name: "Bandara Internasional King Abdulaziz",
    city: "jeddah",
    lat: 21.6796,
    lng: 39.1565,
    category: "Transit",
    desc: "Terminal kedatangan & kepulangan jemaah Umrah / Haji.",
  },
];

type SelectedItem =
  | { type: "agenda"; data: AgendaPlace }
  | { type: "landmark"; data: Landmark };

interface Props {
  trip?: Trip | null;
  places?: AgendaPlace[];
}

export default function InteractiveMap({ trip, places = [] }: Props) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersLayerRef = useRef<any>(null);
  const [isMapReady, setIsMapReady] = useState(false);

  // Normalize places with robust number casting for lat & lng
  const agendaPlacesWithGps = useMemo(() => {
    return places
      .filter((p) => {
        const lat = Number(p.lat);
        const lng = Number(p.lng);
        return (
          p.lat !== null &&
          p.lat !== undefined &&
          p.lng !== null &&
          p.lng !== undefined &&
          !isNaN(lat) &&
          !isNaN(lng) &&
          lat >= -90 &&
          lat <= 90 &&
          lng >= -180 &&
          lng <= 180 &&
          (lat !== 0 || lng !== 0)
        );
      })
      .map((p) => ({
        ...p,
        lat: Number(p.lat),
        lng: Number(p.lng),
        day_number: Number(p.day_number || 1),
      }));
  }, [places]);

  // Unique day numbers with valid coordinates
  const daysWithGps = useMemo(() => {
    const map = new Map<number, number>();
    agendaPlacesWithGps.forEach((p) => {
      const dNum = p.day_number;
      map.set(dNum, (map.get(dNum) || 0) + 1);
    });
    return Array.from(map.entries()).sort(([a], [b]) => a - b);
  }, [agendaPlacesWithGps]);

  // Active filter state: "all_agenda" | "day_1" | "day_2" | "landmarks"
  const [activeFilter, setActiveFilter] = useState<string>("all_agenda");
  const [selectedItem, setSelectedItem] = useState<SelectedItem | null>(null);

  // Auto set active filter when agendaPlacesWithGps loads
  useEffect(() => {
    if (agendaPlacesWithGps.length > 0) {
      setActiveFilter("all_agenda");
    } else {
      setActiveFilter("landmarks");
    }
  }, [agendaPlacesWithGps.length]);

  // Initialize Map Instance
  useEffect(() => {
    let isMounted = true;

    async function initMap() {
      if (!mapContainerRef.current) return;

      const L = (await import("leaflet")).default;
      if (!isMounted || !mapContainerRef.current) return;

      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }

      // Check if container already has a leaflet instance (e.g. from Fast Refresh or StrictMode)
      if ((mapContainerRef.current as any)._leaflet_id) {
        delete (mapContainerRef.current as any)._leaflet_id;
      }

      let initialCenter: [number, number] = [23.0, 39.7];
      let initialZoom = 7;

      if (agendaPlacesWithGps.length > 0) {
        initialCenter = [agendaPlacesWithGps[0].lat!, agendaPlacesWithGps[0].lng!];
        initialZoom = 13;
      }

      const map = L.map(mapContainerRef.current, {
        center: initialCenter,
        zoom: initialZoom,
        zoomControl: false,
      });

      // Free OpenStreetMap tile server
      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19,
      }).addTo(map);

      // Add Zoom Control on Top Right
      L.control.zoom({ position: "topright" }).addTo(map);

      // Create LayerGroup for markers
      const markersLayer = L.layerGroup().addTo(map);

      if (isMounted) {
        mapInstanceRef.current = map;
        markersLayerRef.current = markersLayer;
        setIsMapReady(true);
      } else {
        map.remove();
      }
    }

    initMap();

    return () => {
      isMounted = false;
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        markersLayerRef.current = null;
        setIsMapReady(false);
      }
    };
  }, []);

  // Update Markers whenever Map is ready, filter changes, or data updates
  useEffect(() => {
    if (!isMapReady || !mapInstanceRef.current || !markersLayerRef.current) return;

    let isCancelled = false;

    async function updateMarkers() {
      const L = (await import("leaflet")).default;
      if (isCancelled || !mapInstanceRef.current || !markersLayerRef.current) return;

      const map = mapInstanceRef.current;
      const markersLayer = markersLayerRef.current;

      markersLayer.clearLayers();
      const pointsToFit: [number, number][] = [];

      // 1. If viewing Popular Landmarks
      if (activeFilter === "landmarks") {
        DEFAULT_LANDMARKS.forEach((item) => {
          pointsToFit.push([item.lat, item.lng]);

          const landmarkIcon = L.divIcon({
            className: "custom-leaflet-pin",
            html: `
              <div style="
                display: flex;
                align-items: center;
                justify-content: center;
                width: 32px; 
                height: 32px; 
                background: linear-gradient(135deg, #10b981 0%, #047857 100%); 
                border: 2px solid #ffffff; 
                border-radius: 50%; 
                box-shadow: 0 4px 14px rgba(4, 120, 87, 0.45);
                color: #ffffff;
                font-size: 15px;
                cursor: pointer;
                transition: transform 0.15s;
              ">🕌</div>`,
            iconSize: [32, 32],
            iconAnchor: [16, 16],
            popupAnchor: [0, -16],
          });

          const marker = L.marker([item.lat, item.lng], { icon: landmarkIcon }).addTo(
            markersLayer
          );

          marker.on("click", () => {
            setSelectedItem({ type: "landmark", data: item });
            map.panTo([item.lat, item.lng], { animate: true });
          });
        });
      } else {
        // 2. Viewing Agenda Places (All or Day X)
        let filteredAgenda = agendaPlacesWithGps;
        if (activeFilter.startsWith("day_")) {
          const targetDay = parseInt(activeFilter.replace("day_", ""), 10);
          filteredAgenda = agendaPlacesWithGps.filter(
            (p) => Number(p.day_number) === targetDay
          );
        }

        filteredAgenda.forEach((place) => {
          const lat = place.lat;
          const lng = place.lng;
          pointsToFit.push([lat, lng]);

          const dayNumber = place.day_number || 1;
          const agendaIcon = L.divIcon({
            className: "custom-leaflet-pin",
            html: `
              <div style="
                display: flex;
                align-items: center;
                justify-content: center;
                min-width: 34px; 
                height: 32px; 
                padding: 0 6px;
                background: linear-gradient(135deg, #2563eb 0%, #1e40af 100%); 
                border: 2px solid #ffffff; 
                border-radius: 9999px; 
                box-shadow: 0 4px 14px rgba(37, 99, 235, 0.45);
                color: #ffffff;
                font-size: 11px;
                font-weight: 800;
                cursor: pointer;
                letter-spacing: -0.2px;
                white-space: nowrap;
              ">
                H${dayNumber}
              </div>`,
            iconSize: [36, 32],
            iconAnchor: [18, 16],
            popupAnchor: [0, -16],
          });

          const marker = L.marker([lat, lng], { icon: agendaIcon }).addTo(markersLayer);

          marker.on("click", () => {
            setSelectedItem({ type: "agenda", data: place });
            map.panTo([lat, lng], { animate: true });
          });
        });
      }

      // Auto Fit Bounds to show all active markers
      if (pointsToFit.length === 1) {
        map.flyTo(pointsToFit[0], 15, { duration: 0.8 });
      } else if (pointsToFit.length > 1) {
        const bounds = L.latLngBounds(pointsToFit);
        map.fitBounds(bounds, {
          padding: [60, 60],
          maxZoom: 16,
          duration: 0.8,
        });
      }
    }

    updateMarkers();

    return () => {
      isCancelled = true;
    };
  }, [isMapReady, activeFilter, agendaPlacesWithGps]);

  const openInGoogleMaps = (lat: number, lng: number, queryName?: string) => {
    const url = getGoogleMapsDirectionsUrl(lat, lng, queryName, queryName);
    window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="flex flex-col h-full overflow-hidden relative">
      {/* Inline Leaflet Pin CSS Fix */}
      <style jsx global>{`
        .custom-leaflet-pin {
          background: transparent !important;
          border: none !important;
        }
      `}</style>

      {/* Filter Tabs Bar */}
      <div className="px-5 pt-3 pb-2.5 lg:px-10 flex items-center gap-2 overflow-x-auto hide-scroll shrink-0 bg-white/60 border-b border-white/60 backdrop-blur-xl z-20">
        {agendaPlacesWithGps.length > 0 && (
          <button
            onClick={() => {
              setActiveFilter("all_agenda");
              setSelectedItem(null);
            }}
            className={`shrink-0 rounded-full px-4 py-1.5 text-xs font-semibold transition whitespace-nowrap ${
              activeFilter === "all_agenda"
                ? "bg-brand-600 text-white shadow-md"
                : "bg-white/80 border border-brand-200 text-stone-600 hover:bg-brand-50"
            }`}
          >
            Semua Agenda ({agendaPlacesWithGps.length})
          </button>
        )}

        {daysWithGps.map(([dayNum, count]) => (
          <button
            key={`day_${dayNum}`}
            onClick={() => {
              setActiveFilter(`day_${dayNum}`);
              setSelectedItem(null);
            }}
            className={`shrink-0 rounded-full px-4 py-1.5 text-xs font-semibold transition whitespace-nowrap ${
              activeFilter === `day_${dayNum}`
                ? "bg-brand-600 text-white shadow-md"
                : "bg-white/80 border border-brand-200 text-stone-600 hover:bg-brand-50"
            }`}
          >
            Hari {dayNum} ({count})
          </button>
        ))}

        <button
          onClick={() => {
            setActiveFilter("landmarks");
            setSelectedItem(null);
          }}
          className={`shrink-0 rounded-full px-4 py-1.5 text-xs font-semibold transition whitespace-nowrap ${
            activeFilter === "landmarks"
              ? "bg-emerald-600 text-white shadow-md"
              : "bg-white/80 border border-emerald-200 text-emerald-800 hover:bg-emerald-50"
          }`}
        >
          Tempat Populer ({DEFAULT_LANDMARKS.length})
        </button>
      </div>

      {/* Notice Banner if Trip has 0 GPS places */}
      {agendaPlacesWithGps.length === 0 && (
        <div className="bg-amber-50/90 border-b border-amber-200/70 px-5 py-2 lg:px-10 flex items-center gap-2 text-xs text-amber-800 shrink-0">
          <Info size={16} weight="fill" className="text-amber-600 shrink-0" />
          <span>
            Belum ada koordinat lokasi di agenda trip ini. Tambahkan titik lokasi saat
            menambah/mengedit agenda di menu Itinerary.
          </span>
        </div>
      )}

      {/* Map Canvas Container */}
      <div className="relative flex-1 w-full h-full min-h-[400px]">
        <div ref={mapContainerRef} className="w-full h-full" />

        {/* Floating Detail Card at Bottom */}
        {selectedItem && (
          <div className="absolute bottom-20 lg:bottom-6 left-4 right-4 z-[1000] lg:left-6 lg:right-auto lg:w-96 rounded-3xl bg-white/95 backdrop-blur-xl border border-white/80 p-4 shadow-2xl animate-in slide-in-from-bottom duration-300">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                {selectedItem.type === "agenda" ? (
                  <>
                    <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-brand-100 text-brand-700 uppercase">
                        Hari {selectedItem.data.day_number || 1}
                      </span>
                      {selectedItem.data.category && (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-stone-100 text-stone-600 uppercase">
                          {selectedItem.data.category}
                        </span>
                      )}
                    </div>
                    <h4 className="text-[15px] font-bold text-stone-900 leading-tight">
                      {selectedItem.data.name}
                    </h4>
                    {selectedItem.data.address && (
                      <p className="text-[11px] text-stone-500 mt-1 flex items-start gap-1">
                        <MapPin size={13} className="shrink-0 text-brand-500 mt-0.5" />
                        <span className="line-clamp-2">{selectedItem.data.address}</span>
                      </p>
                    )}
                    {selectedItem.data.start_time ? (
                      <p className="text-[11px] font-medium text-brand-600 mt-1 flex items-center gap-1">
                        <Clock size={13} className="shrink-0" />
                        <span>
                          {selectedItem.data.start_time}
                          {selectedItem.data.end_time
                            ? ` - ${selectedItem.data.end_time}`
                            : ""}
                        </span>
                      </p>
                    ) : (
                      <p className="text-[11px] font-medium text-stone-500 mt-1 flex items-center gap-1">
                        <Clock size={13} className="shrink-0 text-stone-400" />
                        <span>Sepanjang hari</span>
                      </p>
                    )}
                    {selectedItem.data.notes && (
                      <p className="text-[11px] text-stone-600 mt-1.5 italic bg-stone-50 p-2 rounded-xl border border-stone-100 line-clamp-2">
                        "{selectedItem.data.notes}"
                      </p>
                    )}
                  </>
                ) : (
                  <>
                    <span className="text-[10px] font-bold tracking-wider text-emerald-700 uppercase px-2 py-0.5 rounded-full bg-emerald-100">
                      {selectedItem.data.category}
                    </span>
                    <h4 className="text-[15px] font-bold text-stone-900 mt-1.5">
                      {selectedItem.data.name}
                    </h4>
                    <p className="text-[12px] text-stone-600 mt-1 leading-relaxed">
                      {selectedItem.data.desc}
                    </p>
                  </>
                )}
              </div>

              <button
                type="button"
                onClick={() => setSelectedItem(null)}
                className="grid h-8 w-8 place-items-center text-stone-400 hover:text-stone-700 rounded-full hover:bg-stone-100 active:scale-95 transition shrink-0"
                title="Tutup Kartu"
              >
                <X size={16} weight="bold" />
              </button>
            </div>

            {/* Google Maps Route Action Button */}
            <div className="mt-3 pt-3 border-t border-stone-100 flex items-center justify-between gap-2">
              <button
                onClick={() => {
                  if (selectedItem.type === "agenda") {
                    openInGoogleMaps(
                      selectedItem.data.lat!,
                      selectedItem.data.lng!,
                      selectedItem.data.name
                    );
                  } else {
                    openInGoogleMaps(
                      selectedItem.data.lat,
                      selectedItem.data.lng,
                      selectedItem.data.name
                    );
                  }
                }}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold shadow-sm transition"
              >
                <NavigationArrow size={14} weight="bold" />
                <span>Buka di Google Maps</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
