"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";
import {
  X,
  Users,
  Copy,
  Check,
  WhatsappLogo,
  ShareNetwork,
  ArrowsClockwise,
  Crown,
  PencilSimple,
  Eye,
  Trash,
  SignOut,
  ShieldCheck,
  Info,
  CircleNotch,
} from "@phosphor-icons/react";
import type { Trip, TripMember, TripRole } from "@/types";
import { isTripHost, canEditTrip } from "@/types";
import {
  updateMemberRole,
  removeTripMember,
  regenerateTripInviteCode,
} from "@/lib/invite";

interface TripMembersModalProps {
  trip: Trip;
  isOpen: boolean;
  onClose: () => void;
  currentUserId?: string;
  onMembersUpdated?: () => void;
}

export default function TripMembersModal({
  trip,
  isOpen,
  onClose,
  currentUserId,
  onMembersUpdated,
}: TripMembersModalProps) {
  const [mounted, setMounted] = useState(false);
  const [members, setMembers] = useState<TripMember[]>([]);
  const [loading, setLoading] = useState(false);
  const [updatingMemberId, setUpdatingMemberId] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [currentInviteCode, setCurrentInviteCode] = useState(trip.invite_code || "");
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const router = useRouter();
  const isHost = isTripHost(trip.current_user_role, currentUserId, trip.user_id);

  useEffect(() => {
    setMounted(true);
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const fetchMembers = async () => {
    if (!trip.id) return;
    setLoading(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("trip_members")
        .select("*")
        .eq("trip_id", trip.id)
        .order("created_at", { ascending: true })
        .returns<TripMember[]>();

      if (!error && data) {
        setMembers(data);
      }
    } catch (err) {
      console.error("Error fetching trip members:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      setCurrentInviteCode(trip.invite_code || "");
      fetchMembers();
    }
  }, [isOpen, trip.id, trip.invite_code]);

  if (!isOpen || !mounted) return null;

  const handleCopyCode = () => {
    if (!currentInviteCode) return;
    navigator.clipboard.writeText(currentInviteCode);
    setCopiedCode(true);
    showToast("Kode undangan berhasil disalin!");
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleCopyLink = () => {
    if (!currentInviteCode) return;
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const joinUrl = `${origin}/join?code=${currentInviteCode}`;
    navigator.clipboard.writeText(joinUrl);
    setCopiedLink(true);
    showToast("Link undangan berhasil disalin!");
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleShareWhatsapp = () => {
    if (!currentInviteCode) return;
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const joinUrl = `${origin}/join?code=${currentInviteCode}`;
    const text = `Assalamu'alaikum! Yuk gabung ke rencana perjalanan "${trip.title}" di Kembara 🕋✈️.\n\n🔑 Kode Undangan: *${currentInviteCode}*\n🔗 Buka Link: ${joinUrl}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
  };

  const handleRegenerateCode = async () => {
    if (!isHost) return;
    if (
      !confirm(
        "Apakah Anda yakin ingin membuat kode undangan baru? Kode lama tidak akan bisa digunakan lagi."
      )
    ) {
      return;
    }

    setRegenerating(true);
    const res = await regenerateTripInviteCode(trip.id);
    setRegenerating(false);

    if (res.success && res.newCode) {
      setCurrentInviteCode(res.newCode);
      showToast("Kode undangan baru berhasil dibuat!");
      onMembersUpdated?.();
      router.refresh();
    } else {
      alert(res.error || "Gagal membuat kode baru.");
    }
  };

  const handleRoleChange = async (memberId: string, newRole: TripRole) => {
    if (!isHost) return;
    setUpdatingMemberId(memberId);
    const res = await updateMemberRole(memberId, newRole);
    setUpdatingMemberId(null);

    if (res.success) {
      setMembers((prev) =>
        prev.map((m) => (m.id === memberId ? { ...m, role: newRole } : m))
      );
      showToast(
        `Hak akses berhasil diubah menjadi ${
          newRole === "editor" ? "Editor" : "Viewer (Lihat Saja)"
        }`
      );
      onMembersUpdated?.();
      router.refresh();
    } else {
      alert(res.error || "Gagal mengubah hak akses.");
    }
  };

  const handleRemove = async (memberId: string, memberName: string) => {
    if (
      !confirm(
        `Apakah Anda yakin ingin mengeluarkan "${memberName}" dari perjalanan ini?`
      )
    ) {
      return;
    }

    setUpdatingMemberId(memberId);
    const res = await removeTripMember(memberId);
    setUpdatingMemberId(null);

    if (res.success) {
      setMembers((prev) => prev.filter((m) => m.id !== memberId));
      showToast(`${memberName} telah dikeluarkan dari perjalanan.`);
      onMembersUpdated?.();
      router.refresh();
    } else {
      alert(res.error || "Gagal menghapus anggota.");
    }
  };

  const handleLeaveTrip = async () => {
    const myMember = members.find((m) => m.user_id === currentUserId);
    if (!myMember) return;

    if (
      !confirm(
        `Apakah Anda yakin ingin keluar dari perjalanan "${trip.title}"? Anda harus meminta kode undangan lagi jika ingin bergabung kembali.`
      )
    ) {
      return;
    }

    setLoading(true);
    const res = await removeTripMember(myMember.id);
    setLoading(false);

    if (res.success) {
      onClose();
      router.push("/dashboard");
      router.refresh();
    } else {
      alert(res.error || "Gagal keluar dari perjalanan.");
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[100000] flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg overflow-hidden rounded-3xl bg-white shadow-2xl border border-stone-100 flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Toast Notification */}
        {toastMessage && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[100010] flex items-center gap-2 rounded-full bg-stone-900/90 text-white px-4 py-2 text-xs font-semibold shadow-xl backdrop-blur-md animate-in fade-in slide-in-from-top-2">
            <Check size={15} weight="bold" className="text-emerald-400" />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-stone-100 px-6 py-4 bg-stone-50/80">
          <div className="flex items-center gap-2.5">
            <span className="grid h-10 w-10 place-items-center rounded-2xl bg-brand-50 text-brand-600 border border-brand-200/60 shadow-xs">
              <Users size={20} weight="fill" />
            </span>
            <div>
              <h3 className="text-base font-bold text-stone-900">
                Anggota & Hak Akses
              </h3>
              <p className="text-xs text-stone-500 truncate max-w-[240px] sm:max-w-xs">
                {trip.title}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-2 text-stone-400 hover:bg-stone-200/60 hover:text-stone-700 transition"
          >
            <X size={18} weight="bold" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="overflow-y-auto p-6 space-y-6 flex-1 hide-scroll">
          {/* 1. Invite Code Box */}
          <div className="rounded-2xl bg-gradient-to-br from-brand-50/80 via-emerald-50/40 to-stone-50 border border-brand-200/70 p-4 space-y-3 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-brand-700 flex items-center gap-1.5">
                <ShareNetwork size={14} weight="bold" />
                Kode Undangan Perjalanan
              </span>
              {isHost && (
                <button
                  onClick={handleRegenerateCode}
                  disabled={regenerating}
                  className="inline-flex items-center gap-1 text-[11px] font-medium text-stone-500 hover:text-brand-700 hover:underline transition"
                  title="Buat kode baru"
                >
                  <ArrowsClockwise
                    size={13}
                    className={regenerating ? "animate-spin" : ""}
                  />
                  <span>Acak Ulang</span>
                </button>
              )}
            </div>

            {/* Big Code Display & Copy */}
            <div className="flex items-center gap-2">
              <div className="flex-1 rounded-xl bg-white border border-brand-200/90 px-4 py-2.5 text-center shadow-inner">
                <span className="text-2xl font-black font-mono tracking-widest text-brand-900 select-all">
                  {currentInviteCode || "------"}
                </span>
              </div>
              <button
                type="button"
                onClick={handleCopyCode}
                className="inline-flex items-center gap-1.5 rounded-xl bg-brand-600 hover:bg-brand-700 active:scale-95 px-4 py-3 text-xs font-bold text-white shadow-xs transition shrink-0"
              >
                {copiedCode ? (
                  <>
                    <Check size={15} weight="bold" />
                    <span>Tersalin</span>
                  </>
                ) : (
                  <>
                    <Copy size={15} weight="bold" />
                    <span>Salin Kode</span>
                  </>
                )}
              </button>
            </div>

            {/* Action Buttons: WhatsApp & Copy Link */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                onClick={handleShareWhatsapp}
                className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 py-2 px-3 text-xs font-bold text-white shadow-xs transition"
              >
                <WhatsappLogo size={16} weight="fill" />
                <span>Bagikan ke WA</span>
              </button>
              <button
                type="button"
                onClick={handleCopyLink}
                className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-white hover:bg-stone-50 active:scale-95 border border-stone-200 py-2 px-3 text-xs font-semibold text-stone-700 shadow-xs transition"
              >
                {copiedLink ? (
                  <>
                    <Check size={14} weight="bold" className="text-emerald-600" />
                    <span>Link Tersalin</span>
                  </>
                ) : (
                  <>
                    <ShareNetwork size={14} weight="bold" />
                    <span>Salin Link</span>
                  </>
                )}
              </button>
            </div>

            <p className="text-[11px] text-stone-500 leading-relaxed">
              💡 Bagikan kode atau link ini kepada teman/keluarga. Saat bergabung,
              mereka otomatis memiliki hak akses <strong>Viewer (Hanya Melihat)</strong>.
            </p>
          </div>

          {/* 2. Members List */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-stone-600">
                Daftar Anggota ({members.length})
              </h4>
              <span className="text-[11px] text-stone-400">
                {isHost ? "👑 Anda adalah Host" : "👤 Anggota"}
              </span>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-6 text-stone-400 gap-2">
                <CircleNotch size={18} className="animate-spin text-brand-600" />
                <span className="text-xs">Memuat anggota...</span>
              </div>
            ) : members.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-stone-200 p-4 text-center text-xs text-stone-400">
                Belum ada anggota yang bergabung.
              </div>
            ) : (
              <div className="space-y-2">
                {members.map((member) => {
                  const isMemberHost =
                    member.role === "host" || member.role === "owner" || member.user_id === trip.user_id;
                  const isMe = member.user_id === currentUserId;
                  const isUpdating = updatingMemberId === member.id;

                  return (
                    <div
                      key={member.id}
                      className={`flex items-center justify-between gap-3 rounded-2xl p-3 border transition ${
                        isMemberHost
                          ? "bg-amber-50/40 border-amber-200/60"
                          : "bg-white border-stone-100 hover:border-stone-200"
                      }`}
                    >
                      {/* Avatar & Name */}
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="h-10 w-10 rounded-full overflow-hidden bg-brand-100 border border-brand-200 shrink-0 flex items-center justify-center">
                          {member.avatar_url ? (
                            <img
                              src={member.avatar_url}
                              alt={member.name}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <span className="text-sm font-bold text-brand-700">
                              {member.name.charAt(0).toUpperCase()}
                            </span>
                          )}
                        </div>

                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-xs font-bold text-stone-900 truncate">
                              {member.name}
                            </span>
                            {isMe && (
                              <span className="rounded-full bg-brand-100 text-brand-700 text-[9px] font-bold px-1.5 py-0.2">
                                Anda
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] text-stone-400">
                            Bergabung:{" "}
                            {new Date(member.created_at).toLocaleDateString("id-ID", {
                              day: "numeric",
                              month: "short",
                            })}
                          </p>
                        </div>
                      </div>

                      {/* Role Badge or Selector */}
                      <div className="flex items-center gap-2 shrink-0">
                        {isMemberHost ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 border border-amber-400/30 px-2.5 py-1 text-[11px] font-bold text-amber-700">
                            <Crown size={12} weight="fill" className="text-amber-600" />
                            Host
                          </span>
                        ) : isHost ? (
                          /* Host can change other members' roles */
                          <div className="flex items-center gap-1.5">
                            <select
                              value={member.role}
                              disabled={isUpdating}
                              onChange={(e) =>
                                handleRoleChange(member.id, e.target.value as TripRole)
                              }
                              className="rounded-xl border border-stone-200 bg-white px-2.5 py-1 text-xs font-semibold text-stone-700 shadow-xs focus:border-brand-500 focus:outline-hidden disabled:opacity-50 cursor-pointer"
                            >
                              <option value="viewer">👁️ Viewer (Lihat Saja)</option>
                              <option value="editor">✏️ Editor (Bisa Tambah/Edit)</option>
                            </select>

                            <button
                              type="button"
                              onClick={() => handleRemove(member.id, member.name)}
                              disabled={isUpdating}
                              title="Keluarkan Anggota"
                              className="p-1.5 rounded-xl text-stone-400 hover:text-red-600 hover:bg-red-50 transition"
                            >
                              <Trash size={14} weight="bold" />
                            </button>
                          </div>
                        ) : (
                          /* Non-host view of other members' roles */
                          <span
                            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                              member.role === "editor"
                                ? "bg-blue-50 text-blue-700 border border-blue-200"
                                : "bg-stone-100 text-stone-600 border border-stone-200"
                            }`}
                          >
                            {member.role === "editor" ? (
                              <>
                                <PencilSimple size={11} weight="bold" />
                                Editor
                              </>
                            ) : (
                              <>
                                <Eye size={11} weight="bold" />
                                Viewer
                              </>
                            )}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* 3. Role Explanations */}
          <div className="rounded-2xl bg-stone-50 border border-stone-200/70 p-3.5 space-y-2 text-[11px] text-stone-600">
            <span className="font-bold text-stone-800 flex items-center gap-1">
              <ShieldCheck size={14} className="text-brand-600" />
              Tingkatan Hak Akses:
            </span>
            <ul className="space-y-1 pl-4 list-disc text-stone-500">
              <li>
                <strong>👑 Host:</strong> Pembuat trip, memiliki akses penuh mengelola
                perjalanan, anggota, hak akses, dan menghapus trip.
              </li>
              <li>
                <strong>✏️ Editor:</strong> Bisa menambahkan agenda, mencatat
                pengeluaran, mencatat catatan, checklist, dan mengelola tugas.
              </li>
              <li>
                <strong>👁️ Viewer (Default):</strong> Hanya dapat melihat detail trip,
                itinerary, anggaran, dan peta tanpa mengubah data.
              </li>
            </ul>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="border-t border-stone-100 px-6 py-3.5 bg-stone-50/50 flex items-center justify-between gap-3">
          {!isHost && currentUserId && (
            <button
              type="button"
              onClick={handleLeaveTrip}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-red-600 hover:text-red-700 transition"
            >
              <SignOut size={15} weight="bold" />
              <span>Keluar dari Perjalanan</span>
            </button>
          )}
          <div className="ml-auto">
            <button
              type="button"
              onClick={onClose}
              className="rounded-2xl bg-stone-800 hover:bg-stone-900 active:scale-95 px-5 py-2 text-xs font-bold text-white transition shadow-xs"
            >
              Selesai
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

