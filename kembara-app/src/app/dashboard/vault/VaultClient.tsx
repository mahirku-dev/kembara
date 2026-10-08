"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { createClient } from "@/utils/supabase/client";
import type { PackingItem, Trip } from "@/types";
import {
  SuitcaseRolling,
  FileText,
  Sparkle,
  Plus,
  Trash,
  AirplaneTilt,
  HouseLine,
  ShieldCheck,
  DownloadSimple,
  UploadSimple,
  CheckCircle,
  CircleNotch,
  X,
  Eye,
  Warning,
  IdentificationCard,
  QrCode,
  FolderSimplePlus,
  PencilSimple,
  Check,
  FilePdf,
  FileImage,
  ArrowSquareOut,
  MagnifyingGlassPlus,
  MagnifyingGlassMinus,
  ArrowsClockwise,
} from "@phosphor-icons/react";
import { clsx } from "clsx";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";

export interface VaultDoc {
  id: string;
  title: string;
  category: "flight" | "hotel" | "insurance" | "visa" | "other";
  fileName: string;
  fileSize: string;
  fileType: "PDF" | "JPG" | "PNG" | "WEBP" | "OTHER";
  fileData?: string; // Base64 data URL or external URL for preview & download
  uploadedAt: string;
  details: {
    subtitle?: string;
    bookingCode?: string;
    issuer?: string;
    dates?: string;
    holderName?: string;
    notes?: string;
  };
}

const INITIAL_DOCS: VaultDoc[] = [
  {
    id: "doc-1",
    title: "Tiket Pesawat Saudia Airlines",
    category: "flight",
    fileName: "saudia_e-ticket_SV817.pdf",
    fileSize: "214 KB",
    fileType: "PDF",
    uploadedAt: "10 Okt 2026",
    details: {
      subtitle: "SV817 · CGK (Jakarta) ➔ JED (Jeddah)",
      bookingCode: "SUD-89218-JKT",
      issuer: "Saudia Arabian Airlines",
      dates: "26 Okt 2026, 10:00 WIB",
      holderName: "Jamaah Kembara Group",
      notes: "Kabin 7kg · Bagasi 2x23kg · Terminal 3 CGK",
    },
  },
  {
    id: "doc-2",
    title: "Konfirmasi Hotel Pullman Zamzam Makkah",
    category: "hotel",
    fileName: "pullman_zamzam_voucher.pdf",
    fileSize: "98 KB",
    fileType: "PDF",
    uploadedAt: "10 Okt 2026",
    details: {
      subtitle: "Abraj Al Bait Complex, King Abdul Aziz Endowment, Makkah",
      bookingCode: "PLM-MKH-772910",
      issuer: "Accor Hotels / Pullman Zamzam",
      dates: "Check-in 29 Okt 2026 — Check-out 02 Nov 2026",
      holderName: "3 Kamar (Quad Sharing) + Full Board",
      notes: "Front desk 24 jam · View Masjidil Haram",
    },
  },
  {
    id: "doc-3",
    title: "Polis Asuransi Perjalanan & Kesehatan",
    category: "insurance",
    fileName: "travel_insurance_policy.pdf",
    fileSize: "1.2 MB",
    fileType: "PDF",
    uploadedAt: "08 Okt 2026",
    details: {
      subtitle: "Comprehensive Worldwide Travel & Medical Protection",
      bookingCode: "INS-KMB-2026-091",
      issuer: "Zurich Syariah Travel Protect",
      dates: "Berlaku 25 Okt 2026 – 05 Nov 2026",
      holderName: "Semua Anggota Rombongan",
      notes: "Coverage Medis s/d Rp 500.000.000 & Evakuasi Darurat",
    },
  },
];

import TripSwitcher from "@/components/TripSwitcher";
import UserProfileMenu from "@/components/UserProfileMenu";

interface Props {
  trip: Trip;
  initialItems: PackingItem[];
  allTrips?: Trip[];
  user?: any;
}

export default function VaultClient({
  trip,
  initialItems,
  allTrips = [],
  user,
}: Props) {
  const [mounted, setMounted] = useState(false);
  const [items, setItems] = useState<PackingItem[]>(initialItems);

  // Mobile mode tab state: "packing" | "docs" | "ai"
  const [mobileTab, setMobileTab] = useState<"packing" | "docs" | "ai">("packing");

  // Dynamic Categories (no hardcoded/default categories)
  const [categories, setCategories] = useState<string[]>(() => {
    return Array.from(
      new Set(
        initialItems
          .map((i) => i.category?.trim())
          .filter((c): c is string => Boolean(c && c.length > 0))
      )
    );
  });

  const [showCatForm, setShowCatForm] = useState(false);
  const [newCatName, setNewCatName] = useState("");
  const [editingCategory, setEditingCategory] = useState<{ oldName: string; newName: string } | null>(
    null
  );
  const [categoryItemInputs, setCategoryItemInputs] = useState<Record<string, string>>({});
  const [submittingCat, setSubmittingCat] = useState<string | null>(null);

  // Documents state
  const [docs, setDocs] = useState<VaultDoc[]>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem(`kembara_vault_docs_${trip.id}`);
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch {
          // fallback
        }
      }
    }
    return INITIAL_DOCS;
  });

  // Modal States
  const [previewDoc, setPreviewDoc] = useState<VaultDoc | null>(null);
  const [docToDelete, setDocToDelete] = useState<VaultDoc | null>(null);
  const [confirmTripTitle, setConfirmTripTitle] = useState("");
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<PackingItem | null>(null);
  const [categoryToDelete, setCategoryToDelete] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Upload Form State
  const [newDocTitle, setNewDocTitle] = useState("");
  const [newDocCategory, setNewDocCategory] = useState<VaultDoc["category"]>("flight");
  const [newDocSubtitle, setNewDocSubtitle] = useState("");
  const [newDocBookingCode, setNewDocBookingCode] = useState("");
  const [newDocNotes, setNewDocNotes] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileBase64, setFileBase64] = useState<string | null>(null);
  const [fileTypeDetected, setFileTypeDetected] = useState<VaultDoc["fileType"]>("PDF");
  const [fileSizeFormatted, setFileSizeFormatted] = useState<string>("");
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const [isProcessingFile, setIsProcessingFile] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Preview Modal State
  const [previewTab, setPreviewTab] = useState<"preview" | "details">("preview");
  const [imageZoom, setImageZoom] = useState(1);

  // AI Extractor state
  const [aiText, setAiText] = useState(
    "Booking confirmed: Saudia Flight SV817 from Jakarta (CGK) to Jeddah (JED). Departure Oct 26 at 10:00 AM. Hotel Pullman Zamzam Makkah check-in Oct 29."
  );
  const [aiResult, setAiResult] = useState<{
    name: string;
    location: string;
    type: string;
    time: string;
    dayNumber: number;
  } | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiSuccessMsg, setAiSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Sync docs to localStorage
  useEffect(() => {
    if (mounted) {
      localStorage.setItem(`kembara_vault_docs_${trip.id}`, JSON.stringify(docs));
    }
  }, [docs, trip.id, mounted]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((cur) => (cur === msg ? null : cur));
    }, 3500);
  };

  // Packing stats
  const totalItems = items.length;
  const doneItems = items.filter((i) => i.is_checked).length;
  const progressPct = totalItems > 0 ? Math.round((doneItems / totalItems) * 100) : 0;

  // 1. Add Category
  const handleAddCategory = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newCatName.trim();
    if (!trimmed) return;

    if (!categories.includes(trimmed)) {
      setCategories((prev) => [...prev, trimmed]);
    }
    setNewCatName("");
    setShowCatForm(false);
  };

  // 2. Rename Category
  const handleRenameCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCategory) return;
    const { oldName, newName } = editingCategory;
    const trimmedNew = newName.trim();

    if (!trimmedNew || trimmedNew === oldName) {
      setEditingCategory(null);
      return;
    }

    if (categories.includes(trimmedNew) && trimmedNew.toLowerCase() !== oldName.toLowerCase()) {
      alert(`Kategori "${trimmedNew}" sudah ada.`);
      return;
    }

    // Optimistic update
    setCategories((prev) => prev.map((c) => (c === oldName ? trimmedNew : c)));
    setItems((prev) =>
      prev.map((i) => (i.category === oldName ? { ...i, category: trimmedNew } : i))
    );

    // Transfer input state
    setCategoryItemInputs((prev) => {
      const next = { ...prev };
      if (next[oldName]) {
        next[trimmedNew] = next[oldName];
        delete next[oldName];
      }
      return next;
    });

    setEditingCategory(null);

    try {
      const supabase = createClient();
      await supabase
        .from("packing_lists")
        .update({ category: trimmedNew })
        .eq("trip_id", trip.id)
        .eq("category", oldName);
      showToast(`Kategori berhasil diubah menjadi "${trimmedNew}".`);
    } catch (err) {
      console.error("Gagal mengubah nama kategori:", err);
    }
  };

  // 3. Add Item to Category
  const handleAddItemToCategory = async (catName: string, e: React.FormEvent) => {
    e.preventDefault();
    const text = (categoryItemInputs[catName] || "").trim();
    if (!text) return;

    setSubmittingCat(catName);
    try {
      const supabase = createClient();
      const { data: created, error } = await supabase
        .from("packing_lists")
        .insert({
          trip_id: trip.id,
          item_name: text,
          category: catName,
          is_checked: false,
        })
        .select()
        .single();

      if (!error && created) {
        setItems((prev) => [...prev, created as PackingItem]);
        setCategoryItemInputs((prev) => ({ ...prev, [catName]: "" }));
      }
    } catch (err) {
      console.error("Gagal menambah item checklist:", err);
    } finally {
      setSubmittingCat(null);
    }
  };

  // 4. Toggle Checkbox
  const handleToggleItem = useCallback(async (item: PackingItem) => {
    const nextChecked = !item.is_checked;
    setItems((prev) =>
      prev.map((i) => (i.id === item.id ? { ...i, is_checked: nextChecked } : i))
    );

    try {
      const supabase = createClient();
      await supabase
        .from("packing_lists")
        .update({ is_checked: nextChecked })
        .eq("id", item.id);
    } catch (err) {
      console.error("Gagal update checklist:", err);
    }
  }, []);

  // 5. Delete item with confirmation
  const handleConfirmDeleteItem = async () => {
    if (!itemToDelete) return;
    const targetId = itemToDelete.id;
    const targetName = itemToDelete.item_name;

    setItems((prev) => prev.filter((i) => i.id !== targetId));
    setItemToDelete(null);

    try {
      const supabase = createClient();
      await supabase.from("packing_lists").delete().eq("id", targetId);
      showToast(`Item "${targetName}" berhasil dihapus.`);
    } catch (err) {
      console.error("Gagal menghapus item:", err);
    }
  };

  // 6. Delete category with modal confirmation
  const handleConfirmDeleteCategory = async () => {
    if (!categoryToDelete) return;
    const catName = categoryToDelete;

    setCategories((prev) => prev.filter((c) => c !== catName));
    setItems((prev) => prev.filter((i) => i.category !== catName));
    setCategoryToDelete(null);

    try {
      const supabase = createClient();
      await supabase
        .from("packing_lists")
        .delete()
        .eq("trip_id", trip.id)
        .eq("category", catName);
      showToast(`Kategori "${catName}" berhasil dihapus.`);
    } catch (err) {
      console.error("Gagal menghapus kategori:", err);
    }
  };

  // 7. Delete Document with Trip Name verification
  const handleConfirmDeleteDoc = () => {
    if (!docToDelete) return;
    if (confirmTripTitle.trim().toLowerCase() !== trip.title.trim().toLowerCase()) return;

    const deletedDocTitle = docToDelete.title;
    setDocs((prev) => prev.filter((d) => d.id !== docToDelete.id));

    // Reset modals
    if (previewDoc?.id === docToDelete.id) {
      setPreviewDoc(null);
    }
    setDocToDelete(null);
    setConfirmTripTitle("");
    showToast(`Dokumen "${deletedDocTitle}" berhasil dihapus.`);
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  };

  const processSelectedFile = (file: File) => {
    if (!file) return;

    if (file.size > 15 * 1024 * 1024) {
      showToast("Ukuran file terlalu besar (maksimal 15 MB).");
      return;
    }

    setIsProcessingFile(true);
    setSelectedFile(file);
    setFileSizeFormatted(formatBytes(file.size));

    let detectedType: VaultDoc["fileType"] = "PDF";
    const lowerName = file.name.toLowerCase();
    const mime = file.type.toLowerCase();

    if (mime.includes("pdf") || lowerName.endsWith(".pdf")) {
      detectedType = "PDF";
    } else if (mime.includes("png") || lowerName.endsWith(".png")) {
      detectedType = "PNG";
    } else if (
      mime.includes("jpeg") ||
      mime.includes("jpg") ||
      lowerName.endsWith(".jpg") ||
      lowerName.endsWith(".jpeg")
    ) {
      detectedType = "JPG";
    } else if (mime.includes("webp") || lowerName.endsWith(".webp")) {
      detectedType = "WEBP";
    } else {
      detectedType = "OTHER";
    }
    setFileTypeDetected(detectedType);

    if (!newDocTitle) {
      const cleanName = file.name
        .replace(/\.[^/.]+$/, "")
        .replace(/[_-]+/g, " ")
        .replace(/\b\w/g, (l) => l.toUpperCase());
      setNewDocTitle(cleanName);
    }

    if (
      lowerName.includes("tiket") ||
      lowerName.includes("flight") ||
      lowerName.includes("pesawat") ||
      lowerName.includes("airline") ||
      lowerName.includes("boarding")
    ) {
      setNewDocCategory("flight");
    } else if (
      lowerName.includes("hotel") ||
      lowerName.includes("voucher") ||
      lowerName.includes("zamzam") ||
      lowerName.includes("pullman") ||
      lowerName.includes("booking")
    ) {
      setNewDocCategory("hotel");
    } else if (
      lowerName.includes("visa") ||
      lowerName.includes("paspor") ||
      lowerName.includes("passport")
    ) {
      setNewDocCategory("visa");
    } else if (
      lowerName.includes("asuransi") ||
      lowerName.includes("insurance") ||
      lowerName.includes("polis")
    ) {
      setNewDocCategory("insurance");
    }

    const reader = new FileReader();
    reader.onload = () => {
      setFileBase64(reader.result as string);
      setIsProcessingFile(false);
    };
    reader.onerror = () => {
      setIsProcessingFile(false);
      showToast("Gagal membaca file.");
    };
    reader.readAsDataURL(file);
  };

  // 8. Upload new document with file payload
  const handleUploadNewDoc = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDocTitle.trim()) return;

    const fileName = selectedFile
      ? selectedFile.name
      : `${newDocTitle.toLowerCase().replace(/\s+/g, "_")}.${fileTypeDetected.toLowerCase()}`;

    const todayFormatted = format(new Date(), "d MMM yyyy", { locale: idLocale });

    const createdDoc: VaultDoc = {
      id: `doc-${Date.now()}`,
      title: newDocTitle.trim(),
      category: newDocCategory,
      fileName,
      fileSize: fileSizeFormatted || (selectedFile ? formatBytes(selectedFile.size) : "250 KB"),
      fileType: fileTypeDetected,
      fileData: fileBase64 || undefined,
      uploadedAt: todayFormatted,
      details: {
        subtitle: newDocSubtitle.trim() || "Dokumen Resmi Perjalanan",
        issuer: "Dokumen Pribadi",
        bookingCode: newDocBookingCode.trim() || `KMB-${Math.floor(100000 + Math.random() * 900000)}`,
        dates: "Tersimpan di Kembara Vault",
        notes: newDocNotes.trim() || "Diunggah mandiri oleh pengguna",
      },
    };

    setDocs((prev) => {
      const updated = [createdDoc, ...prev];
      if (typeof window !== "undefined") {
        try {
          localStorage.setItem(`kembara_vault_docs_${trip.id}`, JSON.stringify(updated));
        } catch (err) {
          console.warn("Storage quota exceeded, storing safe copy without heavy base64:", err);
          const safeCopy = updated.map((d) => ({
            ...d,
            fileData: d.fileData && d.fileData.length > 500000 ? undefined : d.fileData,
          }));
          try {
            localStorage.setItem(`kembara_vault_docs_${trip.id}`, JSON.stringify(safeCopy));
          } catch {}
        }
      }
      return updated;
    });

    // Reset Form
    setNewDocTitle("");
    setNewDocSubtitle("");
    setNewDocBookingCode("");
    setNewDocNotes("");
    setSelectedFile(null);
    setFileBase64(null);
    setFileSizeFormatted("");
    setShowUploadModal(false);
    showToast(`Dokumen "${createdDoc.title}" berhasil disimpan di Vault.`);
  };

  // Download document handler
  const handleDownloadDoc = (doc: VaultDoc) => {
    if (doc.fileData) {
      const link = document.createElement("a");
      link.href = doc.fileData;
      link.download = doc.fileName || `${doc.title}.${doc.fileType.toLowerCase()}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      showToast(`Mengunduh ${doc.fileName}...`);
    } else {
      const textContent = `KEMBARA DOCUMENT VAULT\n=======================\nJudul: ${doc.title}\nKategori: ${doc.category.toUpperCase()}\nKode Booking: ${doc.details.bookingCode || "N/A"}\nPenerbit: ${doc.details.issuer || "N/A"}\nJadwal: ${doc.details.dates || "N/A"}\nCatatan: ${doc.details.notes || "-"}\n\nDiunggah: ${doc.uploadedAt}\nKembara Travel Assistant`;
      const blob = new Blob([textContent], { type: "text/plain;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = doc.fileName ? doc.fileName.replace(/\.pdf$/i, ".txt") : `${doc.title}.txt`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      showToast(`Mengunduh ringkasan dokumen: ${doc.title}`);
    }
  };

  // 9. AI Extractor handler
  const handleExtractAI = () => {
    if (!aiText.trim()) return;
    setAiLoading(true);
    setAiSuccessMsg(null);

    setTimeout(() => {
      setAiResult({
        name: "Pullman Zamzam Makkah (Check-in)",
        location: "Abraj Al Bait Complex, Makkah",
        type: "Stay · Hotel",
        time: "14:00 - 15:00",
        dayNumber: 1,
      });
      setAiLoading(false);
    }, 900);
  };

  // 10. Add AI extracted stop to itinerary
  const handleAddAiStopToItinerary = async () => {
    if (!aiResult) return;
    setAiLoading(true);
    try {
      const supabase = createClient();
      const { data: days } = await supabase
        .from("itinerary_days")
        .select("id, day_number")
        .eq("trip_id", trip.id)
        .order("day_number", { ascending: true })
        .limit(1);

      if (days && days.length > 0) {
        const targetDay = days[0];
        await supabase.from("places").insert({
          day_id: targetDay.id,
          name: aiResult.name,
          address: aiResult.location,
          category: "stay",
          start_time: "14:00",
          end_time: "15:00",
          cost: 0,
          tasks_json: [],
          sort_order: 99,
        });
        setAiSuccessMsg(
          `Berhasil menambahkan "${aiResult.name}" ke Itinerary Hari ${targetDay.day_number}!`
        );
        setAiResult(null);
      } else {
        alert("Belum ada hari itinerary yang dibuat untuk trip ini.");
      }
    } catch (err) {
      console.error("Gagal menambahkan agenda:", err);
    } finally {
      setAiLoading(false);
    }
  };

  const getDocIcon = (category: VaultDoc["category"]) => {
    switch (category) {
      case "flight":
        return <AirplaneTilt size={24} className="text-brand-600 shrink-0" weight="duotone" />;
      case "hotel":
        return <HouseLine size={24} className="text-brand-600 shrink-0" weight="duotone" />;
      case "insurance":
        return <ShieldCheck size={24} className="text-brand-600 shrink-0" weight="duotone" />;
      case "visa":
        return <IdentificationCard size={24} className="text-brand-600 shrink-0" weight="duotone" />;
      default:
        return <FileText size={24} className="text-brand-600 shrink-0" weight="duotone" />;
    }
  };

  return (
    <div className="flex flex-col h-full overflow-y-auto pb-28 lg:pb-10">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-[99999] flex items-center gap-2 rounded-2xl bg-stone-900/90 text-white px-4 py-3 text-xs shadow-2xl backdrop-blur-md animate-in fade-in slide-in-from-top-4 duration-300">
          <CheckCircle size={18} weight="fill" className="text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Dynamic Header */}
      <div className="sticky top-0 z-[1100] bg-white/60 backdrop-blur-xl border-b border-white/60 px-5 pt-4 pb-3 lg:px-10 shrink-0">
        <div className="flex items-center justify-between gap-2.5 sm:gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-brand-50 text-brand-600 border border-brand-200/50 shadow-sm shrink-0">
              <SuitcaseRolling size={22} weight="fill" />
            </span>
            <div className="min-w-0">
              <h2 className="text-[18px] sm:text-[20px] font-bold text-brand-700 leading-tight truncate">
                Vault &amp; Dokumen
              </h2>
              <p className="text-[12px] text-stone-500 mt-0.5 line-clamp-1 truncate">
                Kelola checklist perlengkapan &amp; berkas perjalanan
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
            {allTrips && allTrips.length > 0 && (
              <TripSwitcher trips={allTrips} activeTrip={trip} currentUserId={user?.id} />
            )}
            {user && <UserProfileMenu user={user} />}
          </div>
        </div>
      </div>

      {/* ================= MOBILE MODE TABS (Mobile Only) ================= */}
      <div className="md:hidden px-4 pt-3 pb-1">
        <div className="flex rounded-2xl bg-white/60 backdrop-blur-md p-1 border border-white/60 shadow-glass">
          <button
            type="button"
            onClick={() => setMobileTab("packing")}
            className={clsx(
              "flex-1 py-2 px-1 rounded-xl text-[11.5px] font-semibold flex items-center justify-center gap-1.5 transition-all",
              mobileTab === "packing"
                ? "bg-brand-600 text-white shadow-sm"
                : "text-stone-600 hover:text-stone-900"
            )}
          >
            <SuitcaseRolling size={15} weight={mobileTab === "packing" ? "fill" : "regular"} />
            <span>Packing</span>
            {totalItems > 0 && (
              <span
                className={clsx(
                  "text-[10px] px-1.5 py-0.5 rounded-full font-bold",
                  mobileTab === "packing"
                    ? "bg-white/20 text-white"
                    : "bg-brand-100 text-brand-700"
                )}
              >
                {doneItems}/{totalItems}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setMobileTab("docs")}
            className={clsx(
              "flex-1 py-2 px-1 rounded-xl text-[11.5px] font-semibold flex items-center justify-center gap-1.5 transition-all",
              mobileTab === "docs"
                ? "bg-brand-600 text-white shadow-sm"
                : "text-stone-600 hover:text-stone-900"
            )}
          >
            <FileText size={15} weight={mobileTab === "docs" ? "fill" : "regular"} />
            <span>Documents</span>
            {docs.length > 0 && (
              <span
                className={clsx(
                  "text-[10px] px-1.5 py-0.5 rounded-full font-bold",
                  mobileTab === "docs"
                    ? "bg-white/20 text-white"
                    : "bg-brand-100 text-brand-700"
                )}
              >
                {docs.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setMobileTab("ai")}
            className={clsx(
              "flex-1 py-2 px-1 rounded-xl text-[11.5px] font-semibold flex items-center justify-center gap-1.5 transition-all",
              mobileTab === "ai"
                ? "bg-brand-600 text-white shadow-sm"
                : "text-stone-600 hover:text-stone-900"
            )}
          >
            <Sparkle size={15} weight={mobileTab === "ai" ? "fill" : "regular"} />
            <span>AI Extractor</span>
          </button>
        </div>
      </div>

      {/* Main Grid */}
      <div className="mx-auto grid max-w-5xl w-full gap-6 px-4 pt-4 lg:px-10 md:grid-cols-2 md:pt-6">
        {/* ================= COLUMN 1: PACKING LIST ================= */}
        <div className={clsx("flex flex-col", mobileTab !== "packing" && "hidden md:flex")}>
          <div className="flex items-baseline justify-between mb-1">
            <h3 className="text-[15px] font-semibold text-stone-800">Packing List</h3>
            <p className="text-xs font-medium text-stone-500">
              <span className="font-bold text-brand-600">{doneItems}</span> of {totalItems} packed
            </p>
          </div>

          {/* Progress bar */}
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-stone-200/80 mb-4">
            <div
              className="h-full rounded-full bg-brand-600 transition-all duration-500"
              style={{ width: `${progressPct}%` }}
            />
          </div>

          {/* Category Cards List */}
          <div className="space-y-3">
            {categories.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-stone-200 bg-white/40 p-6 text-center">
                <div className="mx-auto grid h-10 w-10 place-items-center rounded-xl bg-brand-50 text-brand-600 mb-2">
                  <FolderSimplePlus size={22} weight="duotone" />
                </div>
                <p className="text-[13.5px] font-semibold text-stone-700">Belum ada kategori persiapan</p>
                <p className="text-[11.5px] text-stone-500 mt-0.5">
                  Buat kategori terlebih dahulu (misal: Dokumen, Pakaian Ihram, Obat-obatan) untuk menambahkan tasklist.
                </p>
              </div>
            ) : (
              categories.map((catName) => {
                const catItems = items.filter((i) => i.category === catName);
                const catTotal = catItems.length;
                const catDone = catItems.filter((i) => i.is_checked).length;
                const allDone = catTotal > 0 && catTotal === catDone;
                const inputValue = categoryItemInputs[catName] || "";
                const isSubmitting = submittingCat === catName;
                const isEditingThisCategory = editingCategory?.oldName === catName;

                return (
                  <div
                    key={catName}
                    className="rounded-2xl border border-stone-100 bg-brand-50/50 p-4 transition-all shadow-sm hover:shadow-md"
                  >
                    {/* Category Card Header */}
                    <div className="flex items-center justify-between mb-3 min-h-[32px]">
                      {isEditingThisCategory ? (
                        <form
                          onSubmit={handleRenameCategory}
                          className="flex-1 flex items-center gap-1.5 min-w-0 mr-2"
                        >
                          <input
                            type="text"
                            autoFocus
                            required
                            maxLength={40}
                            value={editingCategory.newName}
                            onChange={(e) =>
                              setEditingCategory({ oldName: catName, newName: e.target.value })
                            }
                            className="h-8 min-w-0 flex-1 rounded-lg border border-brand-300 bg-white px-2.5 text-[12.5px] font-bold text-stone-900 focus:outline-none focus:ring-2 focus:ring-brand-200"
                          />
                          <button
                            type="submit"
                            disabled={!editingCategory.newName.trim()}
                            className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-brand-600 text-white hover:bg-brand-700 transition shadow-sm disabled:opacity-50"
                            title="Simpan nama baru"
                          >
                            <Check size={14} weight="bold" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingCategory(null)}
                            className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-stone-100 text-stone-500 hover:bg-stone-200 transition"
                            title="Batal"
                          >
                            <X size={14} />
                          </button>
                        </form>
                      ) : (
                        <div className="flex items-center gap-1.5 min-w-0 flex-1 mr-2">
                          <h4
                            className={clsx(
                              "text-[13px] font-bold tracking-tight truncate",
                              allDone ? "text-brand-600/60 line-through" : "text-brand-700"
                            )}
                          >
                            {catName}
                          </h4>
                          <button
                            type="button"
                            onClick={() =>
                              setEditingCategory({ oldName: catName, newName: catName })
                            }
                            className="grid h-6 w-6 place-items-center rounded text-stone-400 opacity-60 hover:opacity-100 hover:text-brand-600 hover:bg-brand-100/50 transition"
                            title="Ubah nama kategori"
                          >
                            <PencilSimple size={13} />
                          </button>
                        </div>
                      )}

                      {!isEditingThisCategory && (
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-[11px] font-semibold text-brand-600/80 bg-brand-100/70 px-2 py-0.5 rounded-full">
                            {catDone}/{catTotal}
                          </span>
                          <button
                            type="button"
                            onClick={() => setCategoryToDelete(catName)}
                            title="Hapus kategori ini"
                            className="grid h-6 w-6 place-items-center rounded text-stone-400 hover:bg-rose-50 hover:text-rose-600 transition"
                          >
                            <Trash size={13} />
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Items List */}
                    <ul className="space-y-1">
                      {catItems.map((item) => (
                        <li key={item.id} className="flex items-center gap-1 -ml-1 group">
                          <label className="flex min-h-[36px] min-w-0 flex-1 cursor-pointer items-center gap-2.5 rounded-lg px-2 hover:bg-white/60 transition">
                            <input
                              type="checkbox"
                              checked={item.is_checked}
                              onChange={() => handleToggleItem(item)}
                              className="h-[16px] w-[16px] shrink-0 rounded border-stone-300 accent-brand-600 cursor-pointer"
                            />
                            <span
                              className={clsx(
                                "text-[12.5px] leading-tight select-none transition",
                                item.is_checked
                                  ? "text-stone-400 line-through"
                                  : "text-stone-700 font-medium"
                              )}
                            >
                              {item.item_name}
                            </span>
                          </label>
                          <button
                            type="button"
                            onClick={() => setItemToDelete(item)}
                            className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-stone-400 opacity-70 group-hover:opacity-100 hover:bg-white/60 hover:text-rose-600 transition"
                            title="Hapus item"
                          >
                            <X size={14} />
                          </button>
                        </li>
                      ))}

                      {/* Inline form to add tasklist/item to this specific category */}
                      <li className="mt-2 pt-1 border-t border-brand-100/60">
                        <form
                          onSubmit={(e) => handleAddItemToCategory(catName, e)}
                          className="flex gap-2"
                        >
                          <input
                            type="text"
                            maxLength={80}
                            value={inputValue}
                            onChange={(e) =>
                              setCategoryItemInputs((prev) => ({
                                ...prev,
                                [catName]: e.target.value,
                              }))
                            }
                            placeholder="Tambah item di kategori ini…"
                            className="h-9 min-w-0 flex-1 rounded-lg border border-stone-200/80 bg-white/70 backdrop-blur-md px-3 text-[12px] text-stone-800 placeholder:text-stone-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
                          />
                          <button
                            type="submit"
                            disabled={isSubmitting || !inputValue.trim()}
                            className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-white/80 backdrop-blur-md border border-white/80 shadow-glass text-brand-600 hover:bg-brand-600 hover:text-white disabled:opacity-40 transition"
                            title="Tambah item"
                          >
                            {isSubmitting ? (
                              <CircleNotch size={15} className="animate-spin" />
                            ) : (
                              <Plus size={15} weight="bold" />
                            )}
                          </button>
                        </form>
                      </li>
                    </ul>
                  </div>
                );
              })
            )}
          </div>

          {/* Add a Category Button & Form Toggle */}
          {!showCatForm ? (
            <button
              type="button"
              onClick={() => setShowCatForm(true)}
              className="mt-3 flex min-h-[46px] w-full items-center justify-center gap-2 rounded-xl border border-dashed border-brand-300 bg-brand-50/30 text-xs font-semibold text-brand-600 hover:bg-brand-50 transition"
            >
              <Plus size={16} weight="bold" />
              Tambah Kategori Baru
            </button>
          ) : (
            <form onSubmit={handleAddCategory} className="mt-3 flex gap-2 animate-in fade-in duration-200">
              <input
                type="text"
                autoFocus
                maxLength={40}
                required
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
                placeholder="Nama kategori, misal: Dokumen, Pakaian Ihram"
                className="h-11 min-w-0 flex-1 rounded-xl border border-stone-200 bg-white/80 backdrop-blur-md px-3.5 shadow-sm text-[13px] text-stone-800 placeholder:text-stone-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
              />
              <button
                type="submit"
                disabled={!newCatName.trim()}
                className="px-4 h-11 shrink-0 place-items-center rounded-xl bg-brand-600 text-white font-semibold text-xs hover:bg-brand-700 shadow-glass disabled:opacity-50 transition flex items-center gap-1.5"
              >
                <Plus size={15} weight="bold" />
                Buat
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowCatForm(false);
                  setNewCatName("");
                }}
                className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-stone-100 text-stone-500 hover:bg-stone-200 transition"
              >
                <X size={16} />
              </button>
            </form>
          )}
        </div>

        {/* ================= COLUMN 2: DOCUMENT VAULT ================= */}
        <div className={clsx("flex flex-col", mobileTab !== "docs" && "hidden md:flex")}>
          <div className="flex items-center justify-between mb-1">
            <h3 className="text-[15px] font-semibold text-stone-800">Document Vault</h3>
            <span className="text-xs text-stone-500 font-medium">{docs.length} tersimpan</span>
          </div>
          <p className="text-xs text-stone-500 mb-4">Tickets, bookings &amp; insurance</p>

          <ul className="space-y-2.5">
            {docs.map((doc) => (
              <li
                key={doc.id}
                className="group flex min-h-[58px] items-center gap-3 rounded-xl bg-brand-100/70 border border-brand-200/50 px-4 py-2.5 transition hover:bg-brand-100 hover:shadow-sm"
              >
                <div
                  onClick={() => setPreviewDoc(doc)}
                  className="cursor-pointer"
                  title="Klik untuk melihat preview"
                >
                  {getDocIcon(doc.category)}
                </div>

                <div
                  onClick={() => setPreviewDoc(doc)}
                  className="flex-1 min-w-0 cursor-pointer"
                >
                  <span className="text-[13px] font-semibold text-stone-800 truncate block hover:text-brand-700 transition">
                    {doc.title}
                  </span>
                  <span className="text-[11px] text-stone-500 font-normal truncate block">
                    {doc.fileType} · {doc.fileSize} · {doc.fileName}
                  </span>
                </div>

                {/* Action buttons */}
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setPreviewDoc(doc)}
                    className="grid h-8 w-8 place-items-center rounded-lg text-stone-500 hover:text-brand-600 hover:bg-white/80 transition"
                    title="Lihat Preview Dokumen"
                  >
                    <Eye size={17} weight="bold" />
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setConfirmTripTitle("");
                      setDocToDelete(doc);
                    }}
                    className="grid h-8 w-8 place-items-center rounded-lg text-stone-400 hover:text-rose-600 hover:bg-rose-50 transition"
                    title="Hapus Dokumen"
                  >
                    <Trash size={16} />
                  </button>
                </div>
              </li>
            ))}

            {docs.length === 0 && (
              <li className="rounded-xl border border-dashed border-stone-200 bg-white/40 p-4 text-center text-xs text-stone-400">
                Belum ada dokumen yang diunggah.
              </li>
            )}

            <li>
              <button
                type="button"
                onClick={() => setShowUploadModal(true)}
                className="flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl border border-dashed border-brand-300 bg-brand-50/30 text-xs font-semibold text-brand-600 hover:bg-brand-50 transition"
              >
                <UploadSimple size={16} weight="bold" />
                Upload a file
              </button>
            </li>
          </ul>
        </div>

        {/* ================= FULL WIDTH: AI EXTRACTOR ================= */}
        <div
          className={clsx(
            "md:col-span-2 pt-4 border-t border-stone-200/60 mt-2",
            mobileTab !== "ai" && "hidden md:block"
          )}
        >
          <div className="flex items-center gap-1.5">
            <Sparkle size={18} className="text-brand-600" weight="fill" />
            <h3 className="text-[15px] font-semibold text-stone-800">AI Itinerary Extractor</h3>
          </div>
          <p className="text-xs text-stone-500 mt-0.5">
            Tempel teks konfirmasi email atau booking — Kembara akan mengekstraknya otomatis menjadi agenda itinerary.
          </p>

          <textarea
            rows={3}
            value={aiText}
            onChange={(e) => setAiText(e.target.value)}
            className="mt-3 w-full resize-none rounded-2xl border border-stone-200/80 bg-white/70 backdrop-blur-md p-3.5 text-[13px] leading-relaxed text-stone-800 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
            placeholder="Tempel teks konfirmasi booking di sini..."
          />

          <button
            type="button"
            onClick={handleExtractAI}
            disabled={aiLoading || !aiText.trim()}
            className="mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-brand-600 text-[13px] font-medium text-white shadow-cta hover:bg-brand-700 active:scale-[.99] transition sm:w-auto sm:px-6 disabled:opacity-50"
          >
            {aiLoading ? (
              <CircleNotch size={16} className="animate-spin" />
            ) : (
              <Sparkle size={16} weight="fill" />
            )}
            Extract Itinerary
          </button>

          {aiSuccessMsg && (
            <div className="mt-3 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
              <CheckCircle size={16} weight="fill" className="text-emerald-600 shrink-0" />
              <span>{aiSuccessMsg}</span>
            </div>
          )}

          {aiResult && (
            <div className="mt-4 rounded-2xl bg-brand-100/80 border border-brand-200 p-4 animate-in fade-in duration-300">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[15px] font-bold text-stone-900">{aiResult.name}</p>
                  <p className="mt-1 text-[11.5px] text-stone-600 flex items-center gap-1">
                    <span>📍 {aiResult.location}</span>
                    <span>• {aiResult.type}</span>
                  </p>
                  <p className="mt-0.5 text-[11.5px] text-stone-500">🕒 {aiResult.time}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleAddAiStopToItinerary}
                disabled={aiLoading}
                className="mt-3 inline-flex h-9 items-center gap-1.5 rounded-lg bg-white/90 border border-white/80 px-4 text-xs font-semibold text-brand-600 shadow-glass hover:bg-brand-600 hover:text-white transition"
              >
                <Plus size={14} weight="bold" />
                Tambahkan ke Itinerary
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ================= MODAL 1: POP-UP PREVIEW DOKUMEN ================= */}
      {mounted &&
        previewDoc &&
        createPortal(
          <div className="fixed inset-0 z-[100000] flex items-center justify-center p-3 sm:p-5 bg-stone-900/70 backdrop-blur-sm animate-in fade-in duration-200">
            <div
              className="relative w-full max-w-3xl rounded-[2rem] bg-white border border-white/80 p-5 sm:p-6 shadow-2xl overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-150"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-start justify-between pb-3.5 border-b border-stone-100 shrink-0">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="grid h-11 w-11 place-items-center rounded-2xl bg-brand-100 text-brand-600 shrink-0">
                    {previewDoc.fileType === "PDF" ? (
                      <FilePdf size={24} weight="duotone" />
                    ) : ["JPG", "PNG", "WEBP"].includes(previewDoc.fileType) ? (
                      <FileImage size={24} weight="duotone" />
                    ) : (
                      getDocIcon(previewDoc.category)
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-[16px] font-bold text-stone-900 leading-tight truncate">
                        {previewDoc.title}
                      </h3>
                      <span className="shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full bg-brand-100 text-brand-700 uppercase">
                        {previewDoc.fileType}
                      </span>
                    </div>
                    <p className="text-[12px] text-stone-500 mt-0.5 truncate">
                      {previewDoc.fileName} · {previewDoc.fileSize} · Diunggah {previewDoc.uploadedAt}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setPreviewDoc(null);
                    setImageZoom(1);
                  }}
                  className="grid h-8 w-8 place-items-center rounded-full bg-stone-100 text-stone-500 hover:bg-stone-200 transition shrink-0 ml-2"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Tabs selector */}
              <div className="flex items-center gap-2 pt-3 pb-1 border-b border-stone-100 shrink-0 text-xs">
                <button
                  type="button"
                  onClick={() => setPreviewTab("preview")}
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl font-semibold transition ${
                    previewTab === "preview"
                      ? "bg-brand-600 text-white shadow-xs"
                      : "text-stone-600 hover:bg-stone-100"
                  }`}
                >
                  <Eye size={15} weight="bold" />
                  <span>Preview File</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewTab("details")}
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl font-semibold transition ${
                    previewTab === "details"
                      ? "bg-brand-600 text-white shadow-xs"
                      : "text-stone-600 hover:bg-stone-100"
                  }`}
                >
                  <IdentificationCard size={15} weight="bold" />
                  <span>Rincian &amp; Info</span>
                </button>
              </div>

              {/* Modal Body */}
              <div className="flex-1 overflow-y-auto py-3 pr-1 hide-scroll">
                {previewTab === "preview" ? (
                  /* ================= TAB 1: FILE PREVIEW (PDF / IMAGE / MOCK) ================= */
                  <div className="space-y-3">
                    {previewDoc.fileType === "PDF" && previewDoc.fileData ? (
                      /* Interactive PDF Preview */
                      <div className="space-y-2">
                        <div className="relative w-full h-[54vh] min-h-[360px] rounded-2xl overflow-hidden border border-stone-200 bg-stone-100 shadow-inner">
                          <iframe
                            src={previewDoc.fileData}
                            className="w-full h-full rounded-2xl"
                            title={previewDoc.title}
                          />
                        </div>
                        <div className="flex items-center justify-between text-xs text-stone-500 px-1">
                          <span className="text-[11px]">Format PDF Interaktif</span>
                          <button
                            type="button"
                            onClick={() => {
                              const w = window.open("");
                              w?.document.write(
                                `<iframe src="${previewDoc.fileData}" style="position:fixed;top:0;left:0;bottom:0;right:0;width:100%;height:100%;border:none;margin:0;padding:0;overflow:hidden;z-index:999999;"></iframe>`
                              );
                            }}
                            className="inline-flex items-center gap-1 text-[11.5px] font-semibold text-brand-600 hover:text-brand-700 hover:underline"
                          >
                            <ArrowSquareOut size={14} weight="bold" />
                            <span>Buka Layar Penuh di Tab Baru</span>
                          </button>
                        </div>
                      </div>
                    ) : ["JPG", "PNG", "WEBP"].includes(previewDoc.fileType) && previewDoc.fileData ? (
                      /* Interactive Image Preview with Zoom Controls */
                      <div className="space-y-2">
                        <div className="relative w-full h-[54vh] min-h-[360px] rounded-2xl overflow-hidden border border-stone-200 bg-stone-900/5 flex items-center justify-center p-3 shadow-inner">
                          <img
                            src={previewDoc.fileData}
                            alt={previewDoc.title}
                            style={{
                              transform: `scale(${imageZoom})`,
                              transition: "transform 0.2s ease",
                            }}
                            className="max-h-[50vh] max-w-full object-contain rounded-xl shadow-md select-none"
                          />

                          {/* Floating zoom controls */}
                          <div className="absolute bottom-3 right-3 flex items-center gap-1 bg-stone-900/80 backdrop-blur-md text-white p-1 rounded-xl shadow-lg border border-white/10 text-xs">
                            <button
                              type="button"
                              onClick={() => setImageZoom((z) => Math.max(0.5, z - 0.25))}
                              className="p-1.5 hover:bg-white/20 rounded-lg transition"
                              title="Perkecil"
                            >
                              <MagnifyingGlassMinus size={15} />
                            </button>
                            <span className="text-[11px] font-mono px-1 font-bold">
                              {Math.round(imageZoom * 100)}%
                            </span>
                            <button
                              type="button"
                              onClick={() => setImageZoom((z) => Math.min(3, z + 0.25))}
                              className="p-1.5 hover:bg-white/20 rounded-lg transition"
                              title="Perbesar"
                            >
                              <MagnifyingGlassPlus size={15} />
                            </button>
                            <button
                              type="button"
                              onClick={() => setImageZoom(1)}
                              className="text-[10px] px-2 py-1 hover:bg-white/20 rounded-lg font-semibold transition ml-0.5"
                            >
                              Reset
                            </button>
                          </div>
                        </div>

                        <div className="flex items-center justify-between text-xs text-stone-500 px-1">
                          <span className="text-[11px]">
                            Resolusi asli · {previewDoc.fileName}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              const w = window.open("");
                              w?.document.write(
                                `<img src="${previewDoc.fileData}" style="max-width:100%;margin:auto;display:block;" />`
                              );
                            }}
                            className="inline-flex items-center gap-1 text-[11.5px] font-semibold text-brand-600 hover:text-brand-700 hover:underline"
                          >
                            <ArrowSquareOut size={14} weight="bold" />
                            <span>Buka Gambar Penuh</span>
                          </button>
                        </div>
                      </div>
                    ) : (
                      /* Mock / Default Ticket Visual Pass */
                      <div className="rounded-2xl border-2 border-brand-100 bg-gradient-to-br from-brand-50/70 via-white to-stone-50 p-5 shadow-inner relative overflow-hidden">
                        <div className="flex items-center justify-between text-xs pb-3 border-b border-brand-100/80">
                          <span className="font-bold text-brand-700 tracking-wider uppercase text-[10.5px]">
                            Kembara Vault Verified Ticket
                          </span>
                          <span className="inline-flex items-center gap-1 font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full text-[10px]">
                            <CheckCircle size={12} weight="fill" />
                            Status: Valid
                          </span>
                        </div>

                        <div className="mt-4 space-y-3">
                          <div>
                            <p className="text-[11px] font-medium text-stone-400 uppercase tracking-wider">
                              Perincian / Keterangan
                            </p>
                            <p className="text-[14px] font-bold text-stone-800 mt-0.5">
                              {previewDoc.details.subtitle || previewDoc.title}
                            </p>
                          </div>

                          <div className="grid grid-cols-2 gap-3 pt-2">
                            <div>
                              <p className="text-[10.5px] font-medium text-stone-400 uppercase">
                                Kode Booking / Referensi
                              </p>
                              <p className="text-[13px] font-mono font-bold text-brand-700">
                                {previewDoc.details.bookingCode || "N/A"}
                              </p>
                            </div>
                            <div>
                              <p className="text-[10.5px] font-medium text-stone-400 uppercase">
                                Penerbit / Maskapai / Hotel
                              </p>
                              <p className="text-[13px] font-semibold text-stone-700">
                                {previewDoc.details.issuer || "Pribadi"}
                              </p>
                            </div>
                          </div>

                          <div className="pt-2 border-t border-brand-100/60 grid grid-cols-2 gap-3">
                            <div>
                              <p className="text-[10.5px] font-medium text-stone-400 uppercase">
                                Jadwal / Waktu
                              </p>
                              <p className="text-[12px] font-medium text-stone-700">
                                {previewDoc.details.dates || "Sesuai Jadwal"}
                              </p>
                            </div>
                            <div>
                              <p className="text-[10.5px] font-medium text-stone-400 uppercase">
                                Pemegang / Rombongan
                              </p>
                              <p className="text-[12px] font-medium text-stone-700 truncate">
                                {previewDoc.details.holderName || "Semua Peserta"}
                              </p>
                            </div>
                          </div>

                          {previewDoc.details.notes && (
                            <div className="pt-2">
                              <p className="text-[11px] text-stone-500 bg-white/80 rounded-xl p-2.5 border border-stone-200/60">
                                ℹ️ {previewDoc.details.notes}
                              </p>
                            </div>
                          )}
                        </div>

                        <div className="mt-4 pt-3 border-t border-dashed border-stone-300 flex items-center justify-between text-stone-400">
                          <div className="flex items-center gap-1 text-[11px]">
                            <QrCode size={22} className="text-stone-600" />
                            <span className="font-mono text-[10px] tracking-widest">
                              {previewDoc.id.toUpperCase()}
                            </span>
                          </div>
                          <span className="text-[10px] text-stone-400">
                            Diunggah: {previewDoc.uploadedAt}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  /* ================= TAB 2: DETAILED METADATA ================= */
                  <div className="rounded-2xl border border-stone-200/80 bg-stone-50/60 p-4 space-y-3 text-xs">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <span className="text-[10.5px] font-bold text-stone-400 uppercase">
                          Kategori Dokumen
                        </span>
                        <p className="text-stone-800 font-semibold mt-0.5 capitalize">
                          {previewDoc.category}
                        </p>
                      </div>
                      <div>
                        <span className="text-[10.5px] font-bold text-stone-400 uppercase">
                          Tipe &amp; Ukuran File
                        </span>
                        <p className="text-stone-800 font-semibold mt-0.5">
                          {previewDoc.fileType} ({previewDoc.fileSize})
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 pt-2 border-t border-stone-200">
                      <div>
                        <span className="text-[10.5px] font-bold text-stone-400 uppercase">
                          Kode Booking / Referensi
                        </span>
                        <p className="font-mono font-bold text-brand-700 mt-0.5">
                          {previewDoc.details.bookingCode || "-"}
                        </p>
                      </div>
                      <div>
                        <span className="text-[10.5px] font-bold text-stone-400 uppercase">
                          Penerbit / Instansi
                        </span>
                        <p className="text-stone-800 font-medium mt-0.5">
                          {previewDoc.details.issuer || "-"}
                        </p>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-stone-200">
                      <span className="text-[10.5px] font-bold text-stone-400 uppercase">
                        Catatan Tambahan
                      </span>
                      <p className="text-stone-700 bg-white p-2.5 rounded-xl border border-stone-200 mt-1 leading-relaxed">
                        {previewDoc.details.notes || "Tidak ada catatan tambahan."}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Footer Actions */}
              <div className="pt-3 border-t border-stone-100 flex items-center justify-between gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setConfirmTripTitle("");
                    setDocToDelete(previewDoc);
                  }}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-rose-600 hover:bg-rose-50 transition"
                >
                  <Trash size={15} />
                  <span>Hapus Dokumen</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleDownloadDoc(previewDoc)}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-brand-600 text-white text-xs font-semibold hover:bg-brand-700 shadow-sm transition active:scale-95"
                  >
                    <DownloadSimple size={15} weight="bold" />
                    <span>Unduh File</span>
                  </button>
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* ================= MODAL 2: DELETE DOCUMENT CONFIRMATION WITH TRIP NAME ================= */}
      {mounted &&
        docToDelete &&
        createPortal(
          <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-stone-900/70 backdrop-blur-md animate-in fade-in duration-200">
            <div
              className="relative w-full max-w-md rounded-[2rem] bg-white border border-white/80 p-6 shadow-2xl flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start gap-3.5">
                <div className="grid h-12 w-12 place-items-center rounded-2xl bg-rose-100 text-rose-600 shrink-0">
                  <Warning size={26} weight="fill" />
                </div>
                <div>
                  <h3 className="text-[16px] font-bold text-stone-900 leading-snug">
                    Hapus Dokumen Ini?
                  </h3>
                  <p className="text-[12px] text-stone-500 mt-0.5">
                    Dokumen <span className="font-semibold text-stone-800">"{docToDelete.title}"</span>{" "}
                    akan dihapus secara permanen.
                  </p>
                </div>
              </div>

              <div className="mt-5 rounded-2xl bg-stone-50 border border-stone-200/80 p-4">
                <label className="block text-[12px] text-stone-600 leading-relaxed">
                  Ketik nama trip berikut untuk mengonfirmasi:
                  <span className="block mt-1 font-mono font-bold text-[13px] text-stone-900 select-all bg-white px-2.5 py-1 rounded-lg border border-stone-200">
                    {trip.title}
                  </span>
                </label>

                <input
                  type="text"
                  autoFocus
                  value={confirmTripTitle}
                  onChange={(e) => setConfirmTripTitle(e.target.value)}
                  placeholder="Ketik persis nama trip di atas..."
                  className="mt-3 h-11 w-full rounded-xl border border-stone-200 bg-white px-3.5 text-[13px] text-stone-900 placeholder:text-stone-400 focus:border-rose-500 focus:outline-none focus:ring-2 focus:ring-rose-200"
                />

                {confirmTripTitle.trim().length > 0 && (
                  <div className="mt-2 text-[11px]">
                    {confirmTripTitle.trim().toLowerCase() === trip.title.trim().toLowerCase() ? (
                      <span className="text-emerald-600 font-semibold flex items-center gap-1">
                        <CheckCircle size={14} weight="fill" />
                        Nama trip cocok
                      </span>
                    ) : (
                      <span className="text-rose-500 font-medium">
                        Nama belum cocok, silakan ketik persis seperti di atas.
                      </span>
                    )}
                  </div>
                )}
              </div>

              <div className="mt-6 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    setDocToDelete(null);
                    setConfirmTripTitle("");
                  }}
                  className="h-11 px-4 rounded-xl text-stone-600 text-xs font-semibold hover:bg-stone-100 transition"
                >
                  Batal
                </button>
                <button
                  type="button"
                  disabled={
                    confirmTripTitle.trim().toLowerCase() !== trip.title.trim().toLowerCase()
                  }
                  onClick={handleConfirmDeleteDoc}
                  className="h-11 px-5 rounded-xl bg-rose-600 text-white text-xs font-bold hover:bg-rose-700 disabled:opacity-40 disabled:cursor-not-allowed shadow-md transition flex items-center gap-1.5"
                >
                  <Trash size={15} weight="bold" />
                  Hapus Dokumen
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* ================= MODAL 3: DELETE TASK/ITEM CONFIRMATION ================= */}
      {mounted &&
        itemToDelete &&
        createPortal(
          <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div
              className="relative w-full max-w-sm rounded-[2rem] bg-white border border-white/80 p-6 shadow-2xl flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start gap-3.5">
                <div className="grid h-11 w-11 place-items-center rounded-2xl bg-rose-100 text-rose-600 shrink-0">
                  <Warning size={24} weight="fill" />
                </div>
                <div>
                  <h3 className="text-[15px] font-bold text-stone-900">Hapus Item Persiapan?</h3>
                  <p className="text-[12px] text-stone-500 mt-1 leading-relaxed">
                    Hapus <span className="font-semibold text-stone-800">"{itemToDelete.item_name}"</span> dari kategori{" "}
                    <span className="font-semibold text-brand-700">"{itemToDelete.category}"</span>?
                  </p>
                </div>
              </div>

              <div className="mt-5 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setItemToDelete(null)}
                  className="h-10 px-4 rounded-xl text-stone-600 text-xs font-semibold hover:bg-stone-100 transition"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDeleteItem}
                  className="h-10 px-4 rounded-xl bg-rose-600 text-white text-xs font-bold hover:bg-rose-700 shadow-sm transition flex items-center gap-1.5"
                >
                  <Trash size={14} weight="bold" />
                  Hapus Item
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* ================= MODAL 4: DELETE CATEGORY CONFIRMATION ================= */}
      {mounted &&
        categoryToDelete &&
        createPortal(
          <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div
              className="relative w-full max-w-sm rounded-[2rem] bg-white border border-white/80 p-6 shadow-2xl flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start gap-3.5">
                <div className="grid h-11 w-11 place-items-center rounded-2xl bg-rose-100 text-rose-600 shrink-0">
                  <Warning size={24} weight="fill" />
                </div>
                <div>
                  <h3 className="text-[15px] font-bold text-stone-900">Hapus Kategori?</h3>
                  <p className="text-[12px] text-stone-500 mt-1 leading-relaxed">
                    Hapus kategori <span className="font-semibold text-stone-800">"{categoryToDelete}"</span> beserta seluruh item persiapan di dalamnya?
                  </p>
                </div>
              </div>

              <div className="mt-5 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setCategoryToDelete(null)}
                  className="h-10 px-4 rounded-xl text-stone-600 text-xs font-semibold hover:bg-stone-100 transition"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDeleteCategory}
                  className="h-10 px-4 rounded-xl bg-rose-600 text-white text-xs font-bold hover:bg-rose-700 shadow-sm transition flex items-center gap-1.5"
                >
                  <Trash size={14} weight="bold" />
                  Hapus Kategori
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* ================= MODAL 5: UPLOAD FILE BARU (PDF & IMAGE) ================= */}
      {mounted &&
        showUploadModal &&
        createPortal(
          <div className="fixed inset-0 z-[100000] flex items-center justify-center p-3 sm:p-5 bg-stone-900/70 backdrop-blur-sm animate-in fade-in duration-200">
            <div
              className="relative w-full max-w-lg rounded-[2rem] bg-white border border-white/80 p-6 shadow-2xl flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-150"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="flex items-start justify-between pb-3.5 border-b border-stone-100 shrink-0">
                <div className="flex items-center gap-2.5">
                  <div className="grid h-10 w-10 place-items-center rounded-xl bg-brand-100 text-brand-600 shrink-0">
                    <UploadSimple size={20} weight="bold" />
                  </div>
                  <div>
                    <h3 className="text-[16px] font-bold text-stone-900">Upload Dokumen &amp; Berkas</h3>
                    <p className="text-[12px] text-stone-500">Mendukung file PDF &amp; Gambar (JPG, PNG, WEBP)</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setShowUploadModal(false);
                    setSelectedFile(null);
                    setFileBase64(null);
                  }}
                  className="grid h-8 w-8 place-items-center rounded-full bg-stone-100 text-stone-500 hover:bg-stone-200 transition shrink-0"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Scrollable Form Body */}
              <form onSubmit={handleUploadNewDoc} className="flex flex-col flex-1 overflow-hidden mt-3.5">
                <div className="flex-1 overflow-y-auto space-y-3.5 pr-1 hide-scroll">
                  {/* Drag & Drop File Zone */}
                  <div>
                    <label className="block text-xs font-semibold text-stone-700 mb-1.5">
                      Pilih Berkas / File <span className="text-rose-500">*</span>
                    </label>

                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="application/pdf,image/png,image/jpeg,image/jpg,image/webp"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) processSelectedFile(f);
                      }}
                    />

                    {!selectedFile ? (
                      <div
                        onDragOver={(e) => {
                          e.preventDefault();
                          setIsDraggingFile(true);
                        }}
                        onDragLeave={(e) => {
                          e.preventDefault();
                          setIsDraggingFile(false);
                        }}
                        onDrop={(e) => {
                          e.preventDefault();
                          setIsDraggingFile(false);
                          const f = e.dataTransfer.files?.[0];
                          if (f) processSelectedFile(f);
                        }}
                        onClick={() => fileInputRef.current?.click()}
                        className={`flex flex-col items-center justify-center p-6 rounded-2xl border-2 border-dashed transition cursor-pointer text-center ${
                          isDraggingFile
                            ? "border-brand-500 bg-brand-50/80 scale-[1.01]"
                            : "border-brand-200 bg-brand-50/30 hover:bg-brand-50/60 hover:border-brand-300"
                        }`}
                      >
                        <div className="grid h-12 w-12 place-items-center rounded-2xl bg-white text-brand-600 shadow-sm border border-brand-100 mb-2">
                          <UploadSimple size={22} weight="bold" />
                        </div>
                        <p className="text-xs font-bold text-stone-800">
                          Klik untuk memilih file atau drag &amp; drop ke sini
                        </p>
                        <p className="text-[11px] text-stone-400 mt-1">
                          Format: PDF, PNG, JPG, JPEG, WEBP (Maksimal 15 MB)
                        </p>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between p-3.5 rounded-2xl bg-brand-50/80 border border-brand-200 shadow-xs">
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          {fileTypeDetected === "PDF" ? (
                            <div className="grid h-12 w-12 place-items-center rounded-xl bg-rose-100 text-rose-600 shrink-0 shadow-xs">
                              <FilePdf size={26} weight="duotone" />
                            </div>
                          ) : fileBase64 ? (
                            <div className="h-12 w-12 rounded-xl overflow-hidden border border-brand-200 shrink-0 bg-white">
                              <img
                                src={fileBase64}
                                alt="Preview"
                                className="h-full w-full object-cover"
                              />
                            </div>
                          ) : (
                            <div className="grid h-12 w-12 place-items-center rounded-xl bg-blue-100 text-blue-600 shrink-0 shadow-xs">
                              <FileImage size={26} weight="duotone" />
                            </div>
                          )}

                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-bold text-stone-900 truncate">
                              {selectedFile.name}
                            </p>
                            <p className="text-[11px] text-stone-500 mt-0.5">
                              {fileTypeDetected} · {fileSizeFormatted}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-1 shrink-0 ml-2">
                          <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="px-2.5 py-1 text-[11px] font-semibold text-brand-700 hover:bg-brand-100/80 rounded-lg transition"
                          >
                            Ganti
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedFile(null);
                              setFileBase64(null);
                              setFileSizeFormatted("");
                            }}
                            className="grid h-7 w-7 place-items-center rounded-lg text-stone-400 hover:text-rose-600 hover:bg-rose-50 transition"
                            title="Hapus file"
                          >
                            <Trash size={14} />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Document Title */}
                  <div>
                    <label className="block text-xs font-semibold text-stone-700 mb-1">
                      Nama / Judul Dokumen <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={newDocTitle}
                      onChange={(e) => setNewDocTitle(e.target.value)}
                      placeholder="Misal: E-Visa Umrah Nadia, Tiket Penerbangan Saudia"
                      className="h-10 w-full rounded-xl border border-stone-200 bg-white px-3.5 text-xs text-stone-900 placeholder:text-stone-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
                    />
                  </div>

                  {/* Category Selection */}
                  <div>
                    <label className="block text-xs font-semibold text-stone-700 mb-1">
                      Kategori Dokumen
                    </label>
                    <select
                      value={newDocCategory}
                      onChange={(e) => setNewDocCategory(e.target.value as VaultDoc["category"])}
                      className="h-10 w-full rounded-xl border border-stone-200 bg-white px-3 text-xs text-stone-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
                    >
                      <option value="flight">Tiket Pesawat / Penerbangan</option>
                      <option value="hotel">Voucher Booking Hotel</option>
                      <option value="insurance">Asuransi Perjalanan</option>
                      <option value="visa">E-Visa / Paspor</option>
                      <option value="other">Dokumen Lainnya</option>
                    </select>
                  </div>

                  {/* Optional Booking Code & Subtitle */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-[11px] font-medium text-stone-600 mb-1">
                        Kode Booking / Ref (Opsional)
                      </label>
                      <input
                        type="text"
                        value={newDocBookingCode}
                        onChange={(e) => setNewDocBookingCode(e.target.value)}
                        placeholder="Misal: SV817-JKT, PLM-991"
                        className="h-9 w-full rounded-xl border border-stone-200 bg-white px-3 text-xs text-stone-900 placeholder:text-stone-400 focus:border-brand-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-stone-600 mb-1">
                        Keterangan Rute / Hotel (Opsional)
                      </label>
                      <input
                        type="text"
                        value={newDocSubtitle}
                        onChange={(e) => setNewDocSubtitle(e.target.value)}
                        placeholder="Misal: CGK ➔ JED, Hotel Makkah"
                        className="h-9 w-full rounded-xl border border-stone-200 bg-white px-3 text-xs text-stone-900 placeholder:text-stone-400 focus:border-brand-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Notes */}
                  <div>
                    <label className="block text-[11px] font-medium text-stone-600 mb-1">
                      Catatan Tambahan (Opsional)
                    </label>
                    <textarea
                      rows={2}
                      value={newDocNotes}
                      onChange={(e) => setNewDocNotes(e.target.value)}
                      placeholder="Misal: Tunjukkan barcode ke petugas bandara saat boarding..."
                      className="w-full rounded-xl border border-stone-200 bg-white p-2.5 text-xs text-stone-900 placeholder:text-stone-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200 resize-none"
                    />
                  </div>
                </div>

                {/* Modal Footer */}
                <div className="mt-4 pt-3 border-t border-stone-100 flex items-center justify-end gap-2.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      setShowUploadModal(false);
                      setSelectedFile(null);
                      setFileBase64(null);
                    }}
                    className="h-10 px-4 rounded-xl text-stone-600 text-xs font-semibold hover:bg-stone-100 transition"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={!newDocTitle.trim() || isProcessingFile}
                    className="h-10 px-5 rounded-xl bg-brand-600 text-white text-xs font-bold hover:bg-brand-700 disabled:opacity-50 shadow-cta transition flex items-center gap-1.5 active:scale-95"
                  >
                    {isProcessingFile ? (
                      <>
                        <CircleNotch size={15} className="animate-spin" />
                        <span>Memproses File...</span>
                      </>
                    ) : (
                      <>
                        <UploadSimple size={15} weight="bold" />
                        <span>Simpan ke Vault</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
