"use client";

import { useState, useRef, useEffect } from "react";
import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";
import {
  User,
  SignOut,
  X,
  ShieldCheck,
  CalendarBlank,
  EnvelopeSimple,
  CheckCircle,
  CircleNotch,
  Key,
} from "@phosphor-icons/react";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import JoinTripModal from "@/components/JoinTripModal";

interface UserProfileMenuProps {
  user: SupabaseUser | {
    id: string;
    email?: string | null;
    user_metadata?: {
      full_name?: string;
      name?: string;
      avatar_url?: string;
    };
    created_at?: string;
    app_metadata?: {
      provider?: string;
      providers?: string[];
    };
  };
}

export default function UserProfileMenu({ user }: UserProfileMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const fullName =
    user.user_metadata?.full_name ||
    user.user_metadata?.name ||
    user.email?.split("@")[0] ||
    "Pengguna";
  const avatarUrl = user.user_metadata?.avatar_url;
  const email = user.email || "—";
  const initial = (fullName[0] || "U").toUpperCase();

  const joinDate = user.created_at
    ? new Date(user.created_at).toLocaleDateString("id-ID", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : null;

  // Close dropdown on click outside or Escape
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setIsOpen(false);
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  const handleSignOut = async () => {
    setSigningOut(true);
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
      router.push("/");
      router.refresh();
    } catch (err) {
      console.error("Gagal logout:", err);
      setSigningOut(false);
    }
  };

  return (
    <div className="relative" ref={menuRef}>
      {/* Avatar Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        title="Buka Profil Saya"
        className="group flex items-center gap-2 rounded-full p-0.5 transition-all duration-200 hover:ring-2 hover:ring-brand-400/60 focus:outline-none focus:ring-2 focus:ring-brand-500 active:scale-95"
      >
        <div className="h-9 w-9 overflow-hidden rounded-full border-2 border-white bg-brand-100 shadow-sm transition group-hover:shadow-md flex items-center justify-center">
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt={fullName}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="h-full w-full bg-gradient-to-br from-brand-600 to-brand-800 flex items-center justify-center text-white font-bold text-sm">
              {initial}
            </div>
          )}
        </div>
      </button>

      {/* Profile Modal / Popover */}
      {isOpen && (
        <div className="absolute right-0 top-12 z-[10000] w-80 sm:w-88 rounded-3xl bg-white/95 backdrop-blur-2xl border border-white/80 shadow-2xl p-5 text-stone-800 animate-in fade-in zoom-in-95 duration-200">
          {/* Header & Close */}
          <div className="flex items-start justify-between pb-3 border-b border-stone-100">
            <span className="text-[11px] font-bold tracking-wider text-brand-600 uppercase">
              Profil Pengguna
            </span>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 rounded-full text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition"
            >
              <X size={16} weight="bold" />
            </button>
          </div>

          {/* User Details */}
          <div className="flex items-center gap-3.5 my-4">
            <div className="h-14 w-14 overflow-hidden rounded-2xl border-2 border-brand-200 bg-brand-50 shadow-sm shrink-0 flex items-center justify-center">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt={fullName}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="h-full w-full bg-gradient-to-br from-brand-600 to-brand-800 flex items-center justify-center text-white font-bold text-xl">
                  {initial}
                </div>
              )}
            </div>

            <div className="min-w-0 flex-1">
              <h4 className="text-[15px] font-bold text-stone-900 truncate">
                {fullName}
              </h4>
              <p className="text-[12px] text-stone-500 truncate flex items-center gap-1 mt-0.5">
                <EnvelopeSimple size={13} className="shrink-0 text-stone-400" />
                <span className="truncate">{email}</span>
              </p>
              <div className="flex items-center gap-1.5 mt-1.5">
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 border border-emerald-200/60">
                  <CheckCircle size={11} weight="fill" className="text-emerald-500" />
                  Akun Aktif
                </span>
              </div>
            </div>
          </div>

          {/* Additional Info Box */}
          <div className="rounded-2xl bg-stone-50 p-3 space-y-2 text-[11px] text-stone-600 border border-stone-100">
            {joinDate && (
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-stone-400">
                  <CalendarBlank size={13} />
                  Bergabung
                </span>
                <span className="font-semibold text-stone-700">{joinDate}</span>
              </div>
            )}
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-stone-400">
                <ShieldCheck size={13} />
                Autentikasi
              </span>
              <span className="font-semibold text-stone-700 capitalize">
                {user.app_metadata?.provider || "Supabase Auth"}
              </span>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="mt-3 pt-3 border-t border-stone-100 space-y-2">
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                setShowJoinModal(true);
              }}
              className="w-full flex items-center justify-center gap-2 rounded-2xl bg-brand-50 hover:bg-brand-100 border border-brand-200/80 py-2.5 px-4 text-xs font-bold text-brand-700 transition active:scale-[0.98]"
            >
              <Key size={15} weight="bold" />
              <span>Gabung Perjalanan dengan Kode</span>
            </button>

            <button
              onClick={handleSignOut}
              disabled={signingOut}
              className="w-full flex items-center justify-center gap-2 rounded-2xl bg-rose-50 hover:bg-rose-100 border border-rose-200/70 py-2.5 px-4 text-xs font-semibold text-rose-700 transition active:scale-[0.98] disabled:opacity-50"
            >
              {signingOut ? (
                <>
                  <CircleNotch size={15} className="animate-spin text-rose-600" />
                  <span>Sedang keluar...</span>
                </>
              ) : (
                <>
                  <SignOut size={16} weight="bold" />
                  <span>Keluar dari Akun</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Join Trip Modal */}
      {showJoinModal && (
        <JoinTripModal
          isOpen={showJoinModal}
          onClose={() => setShowJoinModal(false)}
        />
      )}
    </div>
  );
}

