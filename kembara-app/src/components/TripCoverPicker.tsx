"use client";

import { useState, useRef } from "react";
import {
  UploadSimple,
  LinkSimple,
  Sparkle,
  X,
  Image as ImageIcon,
  CircleNotch,
  Check,
} from "@phosphor-icons/react";
import { createClient } from "@/utils/supabase/client";

interface TripCoverPickerProps {
  coverUrl: string;
  onChange: (url: string) => void;
}

const PRESET_COVERS = [
  {
    name: "Masjidil Haram & Ka'bah",
    url: "https://images.unsplash.com/photo-1591604129939-f1efa4d9f7fa?w=1000&auto=format&fit=crop&q=80",
  },
  {
    name: "Masjid Nabawi Madinah",
    url: "https://images.unsplash.com/photo-1564769625905-50e93615e769?w=1000&auto=format&fit=crop&q=80",
  },
  {
    name: "Jabal Rahmah & Arafah",
    url: "https://images.unsplash.com/photo-1542838132-92c53300491e?w=1000&auto=format&fit=crop&q=80",
  },
  {
    name: "Istanbul & Hagia Sophia",
    url: "https://images.unsplash.com/photo-1527838832700-5059252407fa?w=1000&auto=format&fit=crop&q=80",
  },
  {
    name: "Masjidil Aqsa Al-Quds",
    url: "https://images.unsplash.com/photo-1565552645632-d725f8bfc19a?w=1000&auto=format&fit=crop&q=80",
  },
  {
    name: "Penerbangan & Travel",
    url: "https://images.unsplash.com/photo-1436491865332-7a61a109cc05?w=1000&auto=format&fit=crop&q=80",
  },
];

export default function TripCoverPicker({ coverUrl, onChange }: TripCoverPickerProps) {
  const [activeTab, setActiveTab] = useState<"presets" | "upload" | "url">("presets");
  const [urlInput, setUrlInput] = useState(coverUrl || "");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check size limit (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setUploadError("Ukuran gambar maksimal 5MB.");
      return;
    }

    setUploading(true);
    setUploadError(null);

    try {
      const supabase = createClient();
      const fileExt = file.name.split(".").pop() || "jpg";
      const fileName = `cover_${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${fileExt}`;
      const filePath = `covers/${fileName}`;

      // Try uploading to Supabase Storage 'trip-covers' bucket
      const { data, error: uploadErr } = await supabase.storage
        .from("trip-covers")
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: true,
        });

      if (!uploadErr && data) {
        const { data: publicUrlData } = supabase.storage
          .from("trip-covers")
          .getPublicUrl(filePath);

        if (publicUrlData?.publicUrl) {
          onChange(publicUrlData.publicUrl);
          setUrlInput(publicUrlData.publicUrl);
          setUploading(false);
          return;
        }
      }

      // Fallback: Convert to Base64 Data URL if bucket is not configured yet
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        onChange(base64String);
        setUrlInput(base64String);
        setUploading(false);
      };
      reader.readAsDataURL(file);
    } catch (err: unknown) {
      console.warn("Storage upload fallback to base64:", err);
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        onChange(base64String);
        setUrlInput(base64String);
        setUploading(false);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleApplyUrl = () => {
    if (urlInput.trim()) {
      onChange(urlInput.trim());
    }
  };

  const handleRemoveCover = () => {
    onChange("");
    setUrlInput("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-xs font-semibold text-stone-700 flex items-center gap-1.5">
          <ImageIcon size={15} className="text-brand-600" />
          <span>Foto Sampul / Thumbnail Perjalanan</span>
        </label>
        {coverUrl && (
          <button
            type="button"
            onClick={handleRemoveCover}
            className="text-[11px] font-semibold text-rose-600 hover:text-rose-700 transition"
          >
            Hapus Gambar
          </button>
        )}
      </div>

      {/* Preview Box */}
      {coverUrl ? (
        <div className="relative group overflow-hidden rounded-2xl h-36 w-full border border-stone-200 shadow-sm bg-stone-100">
          <img
            src={coverUrl}
            alt="Preview Sampul"
            className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-stone-900/60 via-transparent to-transparent" />
          <button
            type="button"
            onClick={handleRemoveCover}
            className="absolute top-2 right-2 p-1.5 rounded-full bg-stone-900/70 text-white hover:bg-stone-900 transition shadow-md"
            title="Ganti gambar"
          >
            <X size={14} weight="bold" />
          </button>
          <span className="absolute bottom-2.5 left-3 text-[11px] font-semibold text-white/90 drop-shadow-sm">
            Foto Sampul Terpilih
          </span>
        </div>
      ) : (
        /* Tabs selector when no cover selected */
        <div className="space-y-3 rounded-2xl bg-stone-50/80 p-3.5 border border-stone-200/80">
          {/* Tabs */}
          <div className="flex items-center gap-1 p-1 rounded-xl bg-stone-200/60 text-xs">
            <button
              type="button"
              onClick={() => setActiveTab("presets")}
              className={`flex-1 py-1.5 px-2 rounded-lg font-semibold transition flex items-center justify-center gap-1 ${
                activeTab === "presets"
                  ? "bg-white text-brand-700 shadow-sm"
                  : "text-stone-600 hover:text-stone-900"
              }`}
            >
              <Sparkle size={13} weight="fill" />
              <span>Pilihan Foto</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("upload")}
              className={`flex-1 py-1.5 px-2 rounded-lg font-semibold transition flex items-center justify-center gap-1 ${
                activeTab === "upload"
                  ? "bg-white text-brand-700 shadow-sm"
                  : "text-stone-600 hover:text-stone-900"
              }`}
            >
              <UploadSimple size={13} weight="bold" />
              <span>Upload</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("url")}
              className={`flex-1 py-1.5 px-2 rounded-lg font-semibold transition flex items-center justify-center gap-1 ${
                activeTab === "url"
                  ? "bg-white text-brand-700 shadow-sm"
                  : "text-stone-600 hover:text-stone-900"
              }`}
            >
              <LinkSimple size={13} weight="bold" />
              <span>Link URL</span>
            </button>
          </div>

          {/* Tab 1: Presets */}
          {activeTab === "presets" && (
            <div className="grid grid-cols-3 gap-2 pt-1">
              {PRESET_COVERS.map((preset) => (
                <button
                  key={preset.name}
                  type="button"
                  onClick={() => {
                    onChange(preset.url);
                    setUrlInput(preset.url);
                  }}
                  className="group relative overflow-hidden rounded-xl h-20 border border-stone-200 focus:outline-none focus:ring-2 focus:ring-brand-500 shadow-sm"
                >
                  <img
                    src={preset.url}
                    alt={preset.name}
                    className="h-full w-full object-cover transition group-hover:scale-110 duration-200"
                  />
                  <div className="absolute inset-0 bg-stone-900/40 group-hover:bg-stone-900/20 transition" />
                  <span className="absolute bottom-1 left-1 right-1 text-[9px] font-bold text-white leading-tight drop-shadow truncate">
                    {preset.name}
                  </span>
                </button>
              ))}
            </div>
          )}

          {/* Tab 2: Upload */}
          {activeTab === "upload" && (
            <div className="pt-1">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
                id="trip-cover-file-input"
              />
              <label
                htmlFor="trip-cover-file-input"
                className="flex flex-col items-center justify-center gap-2 p-5 rounded-xl border border-dashed border-stone-300 hover:border-brand-500 bg-white cursor-pointer transition text-center"
              >
                {uploading ? (
                  <CircleNotch size={24} className="animate-spin text-brand-600" />
                ) : (
                  <UploadSimple size={24} className="text-brand-600" />
                )}
                <div>
                  <p className="text-xs font-bold text-stone-800">
                    {uploading ? "Sedang memproses gambar..." : "Klik untuk Upload Foto"}
                  </p>
                  <p className="text-[10px] text-stone-400 mt-0.5">
                    PNG, JPG, atau WebP (Maksimal 5MB)
                  </p>
                </div>
              </label>
              {uploadError && (
                <p className="text-[11px] font-semibold text-rose-600 mt-1.5">
                  {uploadError}
                </p>
              )}
            </div>
          )}

          {/* Tab 3: URL */}
          {activeTab === "url" && (
            <div className="space-y-2 pt-1">
              <div className="flex items-center gap-2">
                <input
                  type="url"
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  placeholder="https://images.unsplash.com/photo-..."
                  className="flex-1 rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs text-stone-800 placeholder-stone-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                />
                <button
                  type="button"
                  onClick={handleApplyUrl}
                  disabled={!urlInput.trim()}
                  className="rounded-xl bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white px-3 py-2 text-xs font-semibold transition"
                >
                  Terapkan
                </button>
              </div>
              <p className="text-[10px] text-stone-400">
                Tempelkan URL langsung gambar dari Unsplash, Google Drive, atau hosting foto.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

