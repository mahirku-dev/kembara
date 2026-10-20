"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import type { Place, Trip, TripMember, AgendaPhoto, PhotoComment } from "@/types";
import { isTripHost } from "@/types";
import { createClient } from "@/utils/supabase/client";
import { compressImage, formatBytes } from "@/lib/imageCompression";
import { uploadAgendaPhoto } from "@/lib/storageUpload";
import { formatDistanceToNow, format } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { clsx } from "clsx";
import {
  Camera,
  X,
  UploadSimple,
  Heart,
  ChatCircle,
  PaperPlaneRight,
  Trash,
  PencilSimple,
  ArrowBendUpLeft,
  CircleNotch,
  DownloadSimple,
  Images,
  Check,
  CheckCircle,
  Warning,
  Eye,
  MagnifyingGlassPlus,
  MagnifyingGlassMinus,
  Sparkle,
  SquaresFour,
} from "@phosphor-icons/react";

interface AgendaPhotoAlbumModalProps {
  isOpen: boolean;
  onClose: () => void;
  place: Place;
  trip: Trip;
  user?: any;
  tripMembers?: TripMember[];
  onUpdatePlacePhotos: (placeId: string, photos: AgendaPhoto[]) => Promise<void>;
}

export default function AgendaPhotoAlbumModal({
  isOpen,
  onClose,
  place,
  trip,
  user,
  tripMembers = [],
  onUpdatePlacePhotos,
}: AgendaPhotoAlbumModalProps) {
  const [mounted, setMounted] = useState(false);

  // Photos State
  const photos = useMemo(() => {
    return place.photos_json || [];
  }, [place.photos_json]);

  // View States
  const [activePhoto, setActivePhoto] = useState<AgendaPhoto | null>(null);
  const [showUploadForm, setShowUploadForm] = useState(false);

  // Upload Flow State
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploadPreviews, setUploadPreviews] = useState<
    Array<{
      originalFile: File;
      compressedFile: File;
      dataUrl: string;
      originalSize: number;
      compressedSize: number;
      savingsPercent: number;
      caption: string;
    }>
  >([]);
  const [isCompressing, setIsCompressing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Photo Editing / Deletion State
  const [editingPhotoId, setEditingPhotoId] = useState<string | null>(null);
  const [editingCaption, setEditingCaption] = useState("");
  const [photoToDelete, setPhotoToDelete] = useState<AgendaPhoto | null>(null);
  const [isDeletingPhoto, setIsDeletingPhoto] = useState(false);

  // Instagram Detail View Interactive States
  const [likeHeartAnimation, setLikeHeartAnimation] = useState(false);
  const [photoZoom, setPhotoZoom] = useState(1);
  const [commentText, setCommentText] = useState("");
  const [replyingTo, setReplyingTo] = useState<{
    commentId: string;
    userName: string;
  } | null>(null);
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const commentInputRef = useRef<HTMLInputElement>(null);

  // Host/Auth status
  const isHost = isTripHost(trip.current_user_role, user?.id, trip.user_id);
  const currentUserName =
    user?.user_metadata?.full_name ||
    user?.user_metadata?.name ||
    user?.email?.split("@")[0] ||
    "Pengguna Kembara";

  // Find user avatar if member
  const currentUserAvatar = useMemo(() => {
    const member = tripMembers.find((m) => m.user_id === user?.id);
    return member?.avatar_url || user?.user_metadata?.avatar_url || null;
  }, [tripMembers, user]);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Sync activePhoto with latest data when photos change
  useEffect(() => {
    if (activePhoto) {
      const updated = photos.find((p) => p.id === activePhoto.id);
      if (updated) {
        setActivePhoto(updated);
      } else {
        setActivePhoto(null);
      }
    }
  }, [photos]);

  // Handle files selected for upload
  const handleFileSelect = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploadError(null);
    setIsCompressing(true);

    try {
      const fileArr = Array.from(files);
      const compressedResults: Array<{
        originalFile: File;
        compressedFile: File;
        dataUrl: string;
        originalSize: number;
        compressedSize: number;
        savingsPercent: number;
        caption: string;
      }> = [];

      for (const file of fileArr) {
        // Validate type
        if (!file.type.startsWith("image/")) {
          continue;
        }

        // Compress client-side with canvas (intelligent multi-pass, never exceeds original size)
        const result = await compressImage(file, {
          maxWidth: 1440,
          maxHeight: 1440,
          quality: 0.75,
        });

        compressedResults.push({
          originalFile: file,
          compressedFile: result.file,
          dataUrl: result.dataUrl,
          originalSize: result.originalSize,
          compressedSize: result.compressedSize,
          savingsPercent: result.savingsPercent,
          caption: "",
        });
      }

      if (compressedResults.length === 0) {
        setUploadError("Pilih file gambar yang valid (JPG, PNG, WEBP).");
      } else {
        setUploadPreviews((prev) => [...prev, ...compressedResults]);
      }
    } catch (err: any) {
      console.error("Compression error:", err);
      setUploadError(err?.message || "Gagal mengompresi gambar.");
    } finally {
      setIsCompressing(false);
    }
  };

  // Submit Uploaded Photos to Supabase Storage & Database
  const handleSaveUploadedPhotos = async () => {
    if (uploadPreviews.length === 0) return;
    setIsUploading(true);
    setUploadError(null);

    try {
      const supabase = createClient();
      const newAgendaPhotos: AgendaPhoto[] = [];

      for (const item of uploadPreviews) {
        // Upload compressed file to storage (with fallback)
        const publicUrl = await uploadAgendaPhoto({
          supabase,
          file: item.compressedFile,
          placeId: place.id,
          tripId: trip.id,
          fallbackDataUrl: item.dataUrl,
        });

        const newPhoto: AgendaPhoto = {
          id: `photo-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          place_id: place.id,
          url: publicUrl,
          caption: item.caption.trim() || null,
          created_by: user?.id || "anon",
          created_by_name: currentUserName,
          created_by_avatar: currentUserAvatar,
          created_at: new Date().toISOString(),
          file_size: item.compressedSize,
          likes: [],
          comments: [],
        };

        newAgendaPhotos.push(newPhoto);
      }

      const updatedPhotos = [...newAgendaPhotos, ...photos];
      await onUpdatePlacePhotos(place.id, updatedPhotos);

      // Reset upload states
      setUploadPreviews([]);
      setSelectedFiles([]);
      setShowUploadForm(false);
    } catch (err: any) {
      console.error("Upload error:", err);
      setUploadError(err?.message || "Gagal mengunggah foto ke storage.");
    } finally {
      setIsUploading(false);
    }
  };

  // Save Edit Caption
  const handleSaveEditCaption = async (photoId: string) => {
    const updatedPhotos = photos.map((p) =>
      p.id === photoId ? { ...p, caption: editingCaption.trim() || null } : p
    );
    await onUpdatePlacePhotos(place.id, updatedPhotos);
    setEditingPhotoId(null);
    setEditingCaption("");
  };

  // Delete Photo
  const handleConfirmDeletePhoto = async () => {
    if (!photoToDelete) return;
    setIsDeletingPhoto(true);
    try {
      const updatedPhotos = photos.filter((p) => p.id !== photoToDelete.id);
      await onUpdatePlacePhotos(place.id, updatedPhotos);
      if (activePhoto?.id === photoToDelete.id) {
        setActivePhoto(null);
      }
      setPhotoToDelete(null);
    } catch (err) {
      console.error("Delete photo error:", err);
    } finally {
      setIsDeletingPhoto(false);
    }
  };

  // Toggle Like (Instagram Double Tap or Heart click)
  const handleToggleLike = async (photo: AgendaPhoto) => {
    const userId = user?.id || "anon";
    const currentLikes = photo.likes || [];
    const isLiked = currentLikes.includes(userId);

    const updatedLikes = isLiked
      ? currentLikes.filter((id) => id !== userId)
      : [...currentLikes, userId];

    const updatedPhotos = photos.map((p) =>
      p.id === photo.id ? { ...p, likes: updatedLikes } : p
    );

    // Trigger visual pop animation if liking
    if (!isLiked) {
      setLikeHeartAnimation(true);
      setTimeout(() => setLikeHeartAnimation(false), 900);
    }

    await onUpdatePlacePhotos(place.id, updatedPhotos);
  };

  // Add Comment or Reply
  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim() || !activePhoto) return;

    setIsSubmittingComment(true);
    try {
      const newComment: PhotoComment = {
        id: `comment-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        photo_id: activePhoto.id,
        parent_id: replyingTo ? replyingTo.commentId : null,
        user_id: user?.id || "anon",
        user_name: currentUserName,
        user_avatar: currentUserAvatar,
        text: commentText.trim(),
        reply_to_name: replyingTo ? replyingTo.userName : null,
        created_at: new Date().toISOString(),
      };

      const currentComments = activePhoto.comments || [];
      const updatedComments = [...currentComments, newComment];

      const updatedPhotos = photos.map((p) =>
        p.id === activePhoto.id ? { ...p, comments: updatedComments } : p
      );

      await onUpdatePlacePhotos(place.id, updatedPhotos);

      // Reset input
      setCommentText("");
      setReplyingTo(null);
    } catch (err) {
      console.error("Add comment error:", err);
    } finally {
      setIsSubmittingComment(false);
    }
  };

  // Delete Comment
  const handleDeleteComment = async (commentId: string) => {
    if (!activePhoto) return;
    const currentComments = activePhoto.comments || [];
    // Delete comment and its nested replies
    const updatedComments = currentComments.filter(
      (c) => c.id !== commentId && c.parent_id !== commentId
    );

    const updatedPhotos = photos.map((p) =>
      p.id === activePhoto.id ? { ...p, comments: updatedComments } : p
    );

    await onUpdatePlacePhotos(place.id, updatedPhotos);
  };

  // Helpers for comments tree
  const topLevelComments = useMemo(() => {
    if (!activePhoto) return [];
    return (activePhoto.comments || []).filter((c) => !c.parent_id);
  }, [activePhoto]);

  const getRepliesForComment = (commentId: string) => {
    if (!activePhoto) return [];
    return (activePhoto.comments || []).filter((c) => c.parent_id === commentId);
  };

  // Permission checks
  const canModifyPhoto = (photo: AgendaPhoto) => {
    if (isHost) return true;
    if (user?.id && photo.created_by === user.id) return true;
    return false;
  };

  const canDeleteComment = (comment: PhotoComment) => {
    if (isHost) return true;
    if (user?.id && comment.user_id === user.id) return true;
    return false;
  };

  const formatTimeAgo = (dateStr: string) => {
    try {
      return formatDistanceToNow(new Date(dateStr), {
        addSuffix: true,
        locale: idLocale,
      });
    } catch {
      return "Baru saja";
    }
  };

  if (!isOpen || !mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[100000] flex items-center justify-center p-2 sm:p-4 md:p-6 bg-stone-950/80 backdrop-blur-md animate-in fade-in duration-200">
      {/* ================= MAIN ALBUM CONTAINER ================= */}
      <div
        className="relative w-full max-w-4xl rounded-3xl bg-white border border-white/80 shadow-2xl overflow-hidden flex flex-col max-h-[94vh] animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Album Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-stone-100 bg-white/95 backdrop-blur-md shrink-0">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="grid h-11 w-11 place-items-center rounded-2xl bg-brand-50 text-brand-600 border border-brand-200/60 shadow-xs shrink-0">
              <Camera size={22} weight="duotone" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-[16px] font-bold text-stone-900 leading-snug truncate">
                  Album Foto: {place.name}
                </h3>
                {place.category && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-brand-100/70 text-brand-700 capitalize">
                    {place.category}
                  </span>
                )}
              </div>
              <p className="text-[12px] text-stone-500 mt-0.5">
                {photos.length} foto tersimpan · Kompresi otomatis hemat ruang &amp; kuota
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 ml-3">
            {!showUploadForm && (
              <button
                type="button"
                onClick={() => {
                  setShowUploadForm(true);
                  setUploadPreviews([]);
                  setUploadError(null);
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold shadow-cta transition active:scale-95"
              >
                <UploadSimple size={15} weight="bold" />
                <span className="hidden sm:inline">Tambah Foto</span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="grid h-9 w-9 place-items-center rounded-full bg-stone-100 text-stone-500 hover:bg-stone-200 transition shrink-0"
              title="Tutup Album"
            >
              <X size={17} />
            </button>
          </div>
        </div>

        {/* ================= UPLOAD FORM VIEW ================= */}
        {showUploadForm ? (
          <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-stone-100">
              <div className="flex items-center gap-2 text-xs font-bold text-stone-800">
                <Sparkle size={16} weight="fill" className="text-amber-500" />
                <span>Upload &amp; Kompresi Foto Album</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowUploadForm(false);
                  setUploadPreviews([]);
                  setUploadError(null);
                }}
                className="text-xs font-semibold text-stone-500 hover:text-stone-800"
              >
                Kembali ke Galeri
              </button>
            </div>

            {uploadError && (
              <div className="flex items-center gap-2 rounded-2xl bg-rose-50 border border-rose-200 p-3 text-xs text-rose-700">
                <Warning size={16} weight="fill" className="shrink-0" />
                <span>{uploadError}</span>
              </div>
            )}

            {/* Drag & Drop File Zone */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/jpg"
              multiple
              className="hidden"
              onChange={(e) => handleFileSelect(e.target.files)}
            />

            <div
              onClick={() => fileInputRef.current?.click()}
              className="flex flex-col items-center justify-center p-6 sm:p-8 rounded-3xl border-2 border-dashed border-brand-300 bg-brand-50/40 hover:bg-brand-50/70 transition cursor-pointer text-center group"
            >
              <div className="grid h-14 w-14 place-items-center rounded-2xl bg-white text-brand-600 shadow-sm border border-brand-100 mb-3 group-hover:scale-105 transition-transform">
                {isCompressing ? (
                  <CircleNotch size={26} className="animate-spin text-brand-600" />
                ) : (
                  <Camera size={26} weight="duotone" />
                )}
              </div>
              <p className="text-sm font-bold text-stone-800">
                {isCompressing ? "Mengompresi gambar..." : "Klik untuk pilih foto atau tarik berkas ke sini"}
              </p>
              <p className="text-xs text-stone-500 mt-1 max-w-sm">
                Foto akan otomatis dikompresi ke format optimal (maks 1920px Full HD, ~80% hemat ruang) tanpa mengurangi ketajaman.
              </p>
              <span className="mt-3 inline-flex items-center gap-1 text-[11px] font-semibold text-brand-700 bg-brand-100/70 px-3 py-1 rounded-full">
                ✨ Mendukung unggah banyak foto sekaligus
              </span>
            </div>

            {/* Previews with Caption Inputs */}
            {uploadPreviews.length > 0 && (
              <div className="space-y-3 pt-2">
                <h4 className="text-xs font-bold text-stone-700">
                  Foto Siap Diunggah ({uploadPreviews.length})
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {uploadPreviews.map((preview, idx) => (
                    <div
                      key={idx}
                      className="flex gap-3 p-3 rounded-2xl border border-stone-200/80 bg-stone-50/60 shadow-xs relative"
                    >
                      <div className="relative h-20 w-20 rounded-xl overflow-hidden shrink-0 border border-stone-200 bg-stone-200">
                        <img
                          src={preview.dataUrl}
                          alt="preview"
                          className="h-full w-full object-cover"
                        />
                        <span className="absolute bottom-1 right-1 bg-black/75 text-white text-[9px] font-bold px-1.5 py-0.5 rounded shadow-xs">
                          {preview.savingsPercent > 0 ? `-${preview.savingsPercent}%` : "Optimal"}
                        </span>
                      </div>

                      <div className="min-w-0 flex-1 flex flex-col justify-between">
                        <div>
                          <div className="flex items-center justify-between text-[11px] text-stone-500">
                            <span className="font-semibold text-stone-800 truncate">
                              {preview.savingsPercent > 0 ? (
                                <>
                                  {formatBytes(preview.originalSize)} ➔{" "}
                                  <span className="text-emerald-600 font-bold">
                                    {formatBytes(preview.compressedSize)}
                                  </span>{" "}
                                  <span className="text-emerald-600 font-bold">
                                    (-{preview.savingsPercent}%)
                                  </span>
                                </>
                              ) : (
                                <>
                                  <span>{formatBytes(preview.originalSize)}</span>{" "}
                                  <span className="text-brand-600 font-semibold">(Sudah Optimal)</span>
                                </>
                              )}
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                setUploadPreviews((prev) => prev.filter((_, i) => i !== idx));
                              }}
                              className="text-stone-400 hover:text-rose-600 transition"
                              title="Hapus foto ini"
                            >
                              <X size={14} />
                            </button>
                          </div>
                          <input
                            type="text"
                            maxLength={150}
                            placeholder="Tulis caption untuk foto ini (opsional)..."
                            value={preview.caption}
                            onChange={(e) => {
                              const val = e.target.value;
                              setUploadPreviews((prev) =>
                                prev.map((item, i) => (i === idx ? { ...item, caption: val } : item))
                              );
                            }}
                            className="mt-1.5 w-full text-xs bg-white rounded-lg border border-stone-200 px-2.5 py-1.5 placeholder:text-stone-400 focus:outline-none focus:border-brand-500"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Upload Action Bar */}
            <div className="flex items-center justify-end gap-2 pt-4 border-t border-stone-100">
              <button
                type="button"
                onClick={() => {
                  setShowUploadForm(false);
                  setUploadPreviews([]);
                }}
                className="px-4 py-2 text-xs font-semibold text-stone-600 hover:bg-stone-100 rounded-xl transition"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={uploadPreviews.length === 0 || isUploading || isCompressing}
                onClick={handleSaveUploadedPhotos}
                className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold shadow-cta transition disabled:opacity-50 active:scale-95"
              >
                {isUploading ? (
                  <>
                    <CircleNotch size={15} className="animate-spin" />
                    <span>Menyimpan ke Storage...</span>
                  </>
                ) : (
                  <>
                    <Check size={15} weight="bold" />
                    <span>Simpan ke Album ({uploadPreviews.length})</span>
                  </>
                )}
              </button>
            </div>
          </div>
        ) : (
          /* ================= GALLERY GRID VIEW ================= */
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 hide-scroll">
            {photos.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center max-w-sm mx-auto">
                <div className="grid h-16 w-16 place-items-center rounded-3xl bg-brand-50 text-brand-600 border border-brand-200/70 mb-3 shadow-inner">
                  <Images size={32} weight="duotone" />
                </div>
                <h4 className="text-base font-bold text-stone-800">Belum Ada Foto Album</h4>
                <p className="text-xs text-stone-500 mt-1 leading-relaxed">
                  Abadikan momen rombongan di agenda ini! Semua anggota dapat mengunggah foto, memberi caption, dan saling berkomentar.
                </p>
                <button
                  type="button"
                  onClick={() => setShowUploadForm(true)}
                  className="mt-5 inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold shadow-cta transition active:scale-95"
                >
                  <UploadSimple size={15} weight="bold" />
                  <span>Upload Foto Pertama</span>
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {/* Instagram Style Sub-header Tab */}
                <div className="flex items-center justify-center border-b border-stone-100 pb-2.5 mb-2">
                  <div className="flex items-center gap-2 text-[11px] sm:text-xs font-bold uppercase tracking-wider text-stone-900 border-b-2 border-stone-900 pb-2 -mb-2.5">
                    <SquaresFour size={16} weight="bold" />
                    <span>POSTINGAN ({photos.length})</span>
                  </div>
                </div>

                {/* Instagram 3-Column Grid */}
                <div className="grid grid-cols-3 gap-1 sm:gap-1.5 md:gap-2">
                  {photos.map((photo) => {
                    const likesCount = (photo.likes || []).length;
                    const commentsCount = (photo.comments || []).length;
                    const isLikedByMe = user?.id && (photo.likes || []).includes(user.id);

                    return (
                      <div
                        key={photo.id}
                        onClick={() => {
                          setActivePhoto(photo);
                          setPhotoZoom(1);
                          setReplyingTo(null);
                          setCommentText("");
                        }}
                        className="group relative aspect-square rounded-lg sm:rounded-xl overflow-hidden bg-stone-100 border border-stone-200/60 cursor-pointer shadow-2xs hover:shadow-md transition-all active:scale-[0.98]"
                      >
                        <img
                          src={photo.url}
                          alt={photo.caption || "Agenda Photo"}
                          loading="lazy"
                          className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />

                        {/* Instagram Hover Overlay */}
                        <div className="absolute inset-0 bg-stone-950/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-2 sm:p-2.5 text-white">
                          <div className="flex items-center justify-between text-[10px] text-white/90">
                            <span className="font-semibold truncate max-w-[80px]">
                              {photo.created_by_name}
                            </span>
                            <span className="hidden sm:inline">{formatTimeAgo(photo.created_at)}</span>
                          </div>

                          <div className="flex items-center justify-center gap-3 sm:gap-4 text-xs font-bold">
                            <span className="flex items-center gap-1">
                              <Heart
                                size={15}
                                weight={isLikedByMe ? "fill" : "fill"}
                                className={isLikedByMe ? "text-rose-500" : "text-white"}
                              />
                              {likesCount}
                            </span>
                            <span className="flex items-center gap-1">
                              <ChatCircle size={15} weight="fill" className="text-white" />
                              {commentsCount}
                            </span>
                          </div>

                          {photo.caption ? (
                            <p className="text-[10px] text-white/90 truncate leading-tight hidden sm:block">
                              {photo.caption}
                            </p>
                          ) : (
                            <div />
                          )}
                        </div>
                      </div>
                    );
                  })}

                  {/* Instagram "+ Tambah Foto" Tile in Grid */}
                  <button
                    type="button"
                    onClick={() => {
                      setShowUploadForm(true);
                      setUploadPreviews([]);
                      setUploadError(null);
                    }}
                    className="group aspect-square rounded-lg sm:rounded-xl border-2 border-dashed border-stone-200 hover:border-brand-400 bg-stone-50/70 hover:bg-brand-50/40 transition-all flex flex-col items-center justify-center text-center p-2 cursor-pointer active:scale-95"
                    title="Tambah Foto ke Album"
                  >
                    <div className="grid h-9 w-9 sm:h-11 sm:w-11 place-items-center rounded-xl bg-white text-stone-400 group-hover:text-brand-600 border border-stone-200/80 group-hover:border-brand-200 shadow-xs mb-1 transition-colors">
                      <UploadSimple size={18} weight="bold" />
                    </div>
                    <span className="text-[10px] sm:text-[11px] font-bold text-stone-500 group-hover:text-brand-700">
                      Tambah Foto
                    </span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ================= INSTAGRAM-STYLE PHOTO DETAIL / FEED MODAL ================= */}
      {activePhoto &&
        createPortal(
          <div
            className="fixed inset-0 z-[100050] flex items-center justify-center p-2 sm:p-4 bg-stone-950/85 backdrop-blur-md animate-in fade-in duration-150"
            onClick={() => setActivePhoto(null)}
          >
            <div
              className="relative w-full max-w-5xl rounded-3xl bg-white border border-white/80 shadow-2xl overflow-hidden flex flex-col lg:flex-row max-h-[92vh] animate-in zoom-in-95 duration-150"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Left Column: Photo Showcase (Instagram Viewport) */}
              <div className="relative flex-1 bg-stone-950 flex items-center justify-center min-h-[300px] sm:min-h-[420px] lg:min-h-[580px] overflow-hidden select-none">
                <img
                  src={activePhoto.url}
                  alt={activePhoto.caption || "Foto Agenda"}
                  style={{
                    transform: `scale(${photoZoom})`,
                    transition: "transform 0.2s ease",
                  }}
                  onDoubleClick={() => handleToggleLike(activePhoto)}
                  className="max-h-[50vh] lg:max-h-[85vh] w-full object-contain cursor-pointer"
                />

                {/* Double-tap animated floating heart */}
                {likeHeartAnimation && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none animate-in zoom-in-50 fade-in duration-200">
                    <Heart
                      size={96}
                      weight="fill"
                      className="text-rose-500 drop-shadow-2xl animate-pulse"
                    />
                  </div>
                )}

                {/* Floating Zoom Controls & Double-tap Hint */}
                <div className="absolute bottom-3 left-3 flex items-center gap-1.5 bg-black/60 backdrop-blur-md text-white text-[10px] font-medium px-2.5 py-1 rounded-full border border-white/10">
                  <Heart size={12} weight="fill" className="text-rose-400" />
                  <span>Ketuk 2x untuk menyukai</span>
                </div>

                <div className="absolute bottom-3 right-3 flex items-center gap-1 bg-black/60 backdrop-blur-md text-white p-1 rounded-xl border border-white/10 text-xs">
                  <button
                    type="button"
                    onClick={() => setPhotoZoom((z) => Math.max(0.75, z - 0.25))}
                    className="p-1 hover:bg-white/20 rounded-lg transition"
                    title="Perkecil"
                  >
                    <MagnifyingGlassMinus size={15} />
                  </button>
                  <span className="text-[10px] font-mono px-1 font-bold">
                    {Math.round(photoZoom * 100)}%
                  </span>
                  <button
                    type="button"
                    onClick={() => setPhotoZoom((z) => Math.min(2.5, z + 0.25))}
                    className="p-1 hover:bg-white/20 rounded-lg transition"
                    title="Perbesar"
                  >
                    <MagnifyingGlassPlus size={15} />
                  </button>
                </div>
              </div>

              {/* Right Column: Instagram Post Sidebar (Header, Caption, Threaded Comments, Input) */}
              <div className="w-full lg:w-[380px] xl:w-[420px] flex flex-col bg-white border-t lg:border-t-0 lg:border-l border-stone-100 max-h-[50vh] lg:max-h-[88vh]">
                {/* 1. Post Header */}
                <div className="flex items-center justify-between p-3.5 border-b border-stone-100 shrink-0">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="h-9 w-9 rounded-full bg-brand-100 border border-brand-200 text-brand-700 font-bold flex items-center justify-center text-xs shrink-0 overflow-hidden">
                      {activePhoto.created_by_avatar ? (
                        <img
                          src={activePhoto.created_by_avatar}
                          alt={activePhoto.created_by_name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        activePhoto.created_by_name.charAt(0).toUpperCase()
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-stone-900 truncate">
                        {activePhoto.created_by_name}
                      </p>
                      <p className="text-[10px] text-stone-400 truncate">
                        {place.name} · {formatTimeAgo(activePhoto.created_at)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    {canModifyPhoto(activePhoto) && (
                      <>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingPhotoId(activePhoto.id);
                            setEditingCaption(activePhoto.caption || "");
                          }}
                          className="grid h-7 w-7 place-items-center rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition"
                          title="Edit Caption"
                        >
                          <PencilSimple size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => setPhotoToDelete(activePhoto)}
                          className="grid h-7 w-7 place-items-center rounded-lg text-stone-400 hover:text-rose-600 hover:bg-rose-50 transition"
                          title="Hapus Foto"
                        >
                          <Trash size={14} />
                        </button>
                      </>
                    )}

                    <a
                      href={activePhoto.url}
                      download={`agenda_photo_${activePhoto.id}.jpg`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="grid h-7 w-7 place-items-center rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition"
                      title="Unduh Foto"
                    >
                      <DownloadSimple size={14} />
                    </a>

                    <button
                      type="button"
                      onClick={() => setActivePhoto(null)}
                      className="grid h-7 w-7 place-items-center rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition ml-1"
                      title="Tutup Post"
                    >
                      <X size={15} />
                    </button>
                  </div>
                </div>

                {/* 2. Scrollable Body: Caption & Threaded Comments */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3.5 hide-scroll text-xs">
                  {/* Caption Section */}
                  {editingPhotoId === activePhoto.id ? (
                    <div className="p-3 rounded-2xl bg-brand-50/70 border border-brand-200 space-y-2">
                      <label className="text-[11px] font-bold text-brand-800">Edit Caption:</label>
                      <textarea
                        rows={2}
                        value={editingCaption}
                        onChange={(e) => setEditingCaption(e.target.value)}
                        placeholder="Tulis caption baru..."
                        className="w-full text-xs bg-white rounded-xl border border-brand-200 p-2 placeholder:text-stone-400 focus:outline-none focus:ring-1 focus:ring-brand-500 resize-none"
                      />
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => setEditingPhotoId(null)}
                          className="px-2.5 py-1 text-[11px] font-semibold text-stone-500 hover:text-stone-700"
                        >
                          Batal
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSaveEditCaption(activePhoto.id)}
                          className="px-3 py-1 text-[11px] font-bold text-white bg-brand-600 hover:bg-brand-700 rounded-lg shadow-xs"
                        >
                          Simpan
                        </button>
                      </div>
                    </div>
                  ) : activePhoto.caption ? (
                    <div className="flex items-start gap-2.5 pb-3 border-b border-stone-100">
                      <div className="h-7 w-7 rounded-full bg-stone-100 text-stone-700 font-bold flex items-center justify-center text-[10px] shrink-0">
                        {activePhoto.created_by_name.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1 leading-snug">
                        <span className="font-bold text-stone-900 mr-1.5">
                          {activePhoto.created_by_name}
                        </span>
                        <span className="text-stone-700 whitespace-pre-line">
                          {activePhoto.caption}
                        </span>
                        <div className="text-[10px] text-stone-400 mt-1">
                          {formatTimeAgo(activePhoto.created_at)}
                        </div>
                      </div>
                    </div>
                  ) : null}

                  {/* Comments Section */}
                  <div className="space-y-3">
                    <p className="text-[11px] font-bold text-stone-400 uppercase tracking-wider">
                      Komentar ({activePhoto.comments?.length || 0})
                    </p>

                    {topLevelComments.length === 0 ? (
                      <div className="py-8 text-center text-stone-400 text-xs">
                        <ChatCircle size={28} className="mx-auto mb-1 text-stone-300" />
                        <p>Belum ada komentar.</p>
                        <p className="text-[11px] text-stone-400">Jadilah yang pertama berkomentar!</p>
                      </div>
                    ) : (
                      topLevelComments.map((comment) => {
                        const replies = getRepliesForComment(comment.id);
                        return (
                          <div key={comment.id} className="space-y-2">
                            {/* Parent Comment */}
                            <div className="flex items-start gap-2.5 group">
                              <div className="h-7 w-7 rounded-full bg-stone-100 text-stone-700 font-bold flex items-center justify-center text-[10px] shrink-0 overflow-hidden">
                                {comment.user_avatar ? (
                                  <img
                                    src={comment.user_avatar}
                                    alt={comment.user_name}
                                    className="h-full w-full object-cover"
                                  />
                                ) : (
                                  comment.user_name.charAt(0).toUpperCase()
                                )}
                              </div>
                              <div className="min-w-0 flex-1 leading-snug">
                                <div>
                                  <span className="font-bold text-stone-900 mr-1.5">
                                    {comment.user_name}
                                  </span>
                                  <span className="text-stone-800">{comment.text}</span>
                                </div>
                                <div className="flex items-center gap-3 text-[10px] text-stone-400 mt-1">
                                  <span>{formatTimeAgo(comment.created_at)}</span>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setReplyingTo({
                                        commentId: comment.id,
                                        userName: comment.user_name,
                                      });
                                      commentInputRef.current?.focus();
                                    }}
                                    className="font-bold text-stone-500 hover:text-brand-600 transition"
                                  >
                                    Balas
                                  </button>
                                  {canDeleteComment(comment) && (
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteComment(comment.id)}
                                      className="text-stone-400 hover:text-rose-600 opacity-0 group-hover:opacity-100 transition"
                                      title="Hapus Komentar"
                                    >
                                      Hapus
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Threaded Replies (Instagram Style) */}
                            {replies.length > 0 && (
                              <div className="pl-8 space-y-2 border-l-2 border-brand-100 ml-3.5">
                                {replies.map((reply) => (
                                  <div key={reply.id} className="flex items-start gap-2 group pt-0.5">
                                    <div className="h-5 w-5 rounded-full bg-brand-50 text-brand-700 font-bold flex items-center justify-center text-[9px] shrink-0 overflow-hidden">
                                      {reply.user_avatar ? (
                                        <img
                                          src={reply.user_avatar}
                                          alt={reply.user_name}
                                          className="h-full w-full object-cover"
                                        />
                                      ) : (
                                        reply.user_name.charAt(0).toUpperCase()
                                      )}
                                    </div>
                                    <div className="min-w-0 flex-1 leading-snug">
                                      <div>
                                        <span className="font-bold text-stone-900 mr-1">
                                          {reply.user_name}
                                        </span>
                                        {reply.reply_to_name && (
                                          <span className="text-brand-600 font-semibold mr-1">
                                            @{reply.reply_to_name}
                                          </span>
                                        )}
                                        <span className="text-stone-800">{reply.text}</span>
                                      </div>
                                      <div className="flex items-center gap-3 text-[10px] text-stone-400 mt-0.5">
                                        <span>{formatTimeAgo(reply.created_at)}</span>
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setReplyingTo({
                                              commentId: comment.id,
                                              userName: reply.user_name,
                                            });
                                            commentInputRef.current?.focus();
                                          }}
                                          className="font-bold text-stone-500 hover:text-brand-600 transition"
                                        >
                                          Balas
                                        </button>
                                        {canDeleteComment(reply) && (
                                          <button
                                            type="button"
                                            onClick={() => handleDeleteComment(reply.id)}
                                            className="text-stone-400 hover:text-rose-600 opacity-0 group-hover:opacity-100 transition"
                                          >
                                            Hapus
                                          </button>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* 3. Instagram Action Bar (Likes, Comment Count) */}
                <div className="px-4 py-2.5 border-t border-stone-100 bg-stone-50/40 shrink-0">
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => handleToggleLike(activePhoto)}
                      className="transition active:scale-125"
                      title={
                        user?.id && (activePhoto.likes || []).includes(user.id)
                          ? "Batal Suka"
                          : "Suka Foto"
                      }
                    >
                      <Heart
                        size={22}
                        weight={
                          user?.id && (activePhoto.likes || []).includes(user.id)
                            ? "fill"
                            : "regular"
                        }
                        className={clsx(
                          user?.id && (activePhoto.likes || []).includes(user.id)
                            ? "text-rose-500 animate-pulse"
                            : "text-stone-700 hover:text-rose-500"
                        )}
                      />
                    </button>

                    <button
                      type="button"
                      onClick={() => commentInputRef.current?.focus()}
                      className="text-stone-700 hover:text-brand-600 transition"
                      title="Beri Komentar"
                    >
                      <ChatCircle size={22} weight="regular" />
                    </button>
                  </div>

                  <p className="text-xs font-bold text-stone-900 mt-1.5">
                    {(activePhoto.likes || []).length > 0
                      ? `${(activePhoto.likes || []).length} suka`
                      : "Jadilah yang pertama menyukai"}
                  </p>
                </div>

                {/* 4. Instagram Comment Input Bar */}
                <form
                  onSubmit={handleSubmitComment}
                  className="p-3 border-t border-stone-100 bg-white shrink-0"
                >
                  {replyingTo && (
                    <div className="flex items-center justify-between text-[11px] bg-brand-50 text-brand-700 px-2.5 py-1 rounded-lg mb-2">
                      <span className="flex items-center gap-1">
                        <ArrowBendUpLeft size={12} weight="bold" />
                        Membalas <strong className="font-bold">@{replyingTo.userName}</strong>
                      </span>
                      <button
                        type="button"
                        onClick={() => setReplyingTo(null)}
                        className="text-brand-500 hover:text-brand-700"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  )}

                  <div className="flex items-center gap-2">
                    <input
                      ref={commentInputRef}
                      type="text"
                      maxLength={300}
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                      placeholder={
                        replyingTo
                          ? `Balas @${replyingTo.userName}...`
                          : "Tambahkan komentar untuk foto ini..."
                      }
                      className="flex-1 text-xs bg-stone-100/80 rounded-xl px-3 py-2 text-stone-900 placeholder:text-stone-400 border border-transparent focus:border-brand-300 focus:bg-white focus:outline-none"
                    />

                    <button
                      type="submit"
                      disabled={!commentText.trim() || isSubmittingComment}
                      className="grid h-8 w-8 place-items-center rounded-xl bg-brand-600 hover:bg-brand-700 text-white disabled:opacity-30 transition shrink-0 active:scale-95"
                      title="Kirim Komentar"
                    >
                      {isSubmittingComment ? (
                        <CircleNotch size={14} className="animate-spin" />
                      ) : (
                        <PaperPlaneRight size={14} weight="fill" />
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* ================= MODAL: CONFIRM DELETE PHOTO ================= */}
      {photoToDelete &&
        createPortal(
          <div className="fixed inset-0 z-[100100] flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-sm animate-in fade-in duration-150">
            <div
              className="relative w-full max-w-sm rounded-3xl bg-white border border-white/80 p-5 shadow-2xl space-y-3"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-2xl bg-rose-100 text-rose-600 shrink-0">
                  <Warning size={22} weight="fill" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-stone-900">Hapus Foto dari Album?</h4>
                  <p className="text-xs text-stone-500 mt-0.5 leading-relaxed">
                    Foto ini beserta seluruh komentar dan like di dalamnya akan dihapus permanen.
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setPhotoToDelete(null)}
                  className="px-3.5 py-2 text-xs font-semibold text-stone-600 hover:bg-stone-100 rounded-xl transition"
                >
                  Batal
                </button>
                <button
                  type="button"
                  disabled={isDeletingPhoto}
                  onClick={handleConfirmDeletePhoto}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-sm transition active:scale-95"
                >
                  {isDeletingPhoto ? (
                    <CircleNotch size={14} className="animate-spin" />
                  ) : (
                    <Trash size={14} weight="bold" />
                  )}
                  <span>Hapus</span>
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>,
    document.body
  );
}

