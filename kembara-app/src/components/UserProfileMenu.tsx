"use client";

import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";
import {
  User,
  SignOut,
  X,
  ShieldCheck,
  CalendarBlank,
  EnvelopeSimple,
  CircleNotch,
} from "@phosphor-icons/react";
import type { User as SupabaseUser } from "@supabase/supabase-js";

interface UserProfileMenuProps {
  user:
    | SupabaseUser
    | {
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
  const [mounted, setMounted] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
  }, []);

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

  // Close modal on outside click or Escape
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setIsOpen(false);
    }

    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
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
    <div className="relative">
      {/* Avatar Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Buka Pengaturan Akun"
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        title="Akun Saya"
        className="group relative flex items-center justify-center h-10 w-10 rounded-full transition-all duration-200 hover:ring-2 hover:ring-brand-500/60 focus:outline-none focus:ring-2 focus:ring-brand-500 active:scale-95 shrink-0"
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

      {/* Mobile Bottom Sheet / Desktop Modal */}
      {mounted &&
        isOpen &&
        createPortal(
          <div
            className="fixed inset-0 z-[100000] flex items-end sm:items-center justify-center bg-stone-950/65 backdrop-blur-xs p-0 sm:p-4 animate-in fade-in duration-200"
            onClick={() => setIsOpen(false)}
          >
            <div
              ref={modalRef}
              role="dialog"
              aria-modal="true"
              aria-labelledby="account-sheet-title"
              onClick={(e) => e.stopPropagation()}
              className="w-full sm:max-w-md bg-white rounded-t-[2rem] sm:rounded-3xl shadow-2xl border border-stone-200/80 p-5 sm:p-6 text-stone-800 animate-in slide-in-from-bottom-6 sm:zoom-in-95 duration-200 pb-[calc(env(safe-area-inset-bottom)+1.5rem)] sm:pb-6"
            >
              {/* Sheet Handle for Mobile */}
              <div className="mx-auto w-12 h-1.5 rounded-full bg-stone-300 mb-4 sm:hidden" />

              {/* Header */}
              <div className="flex items-center justify-between pb-3.5 border-b border-stone-100">
                <h3 id="account-sheet-title" className="text-base font-bold text-stone-900">
                  Akun
                </h3>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  aria-label="Tutup"
                  className="grid h-8 w-8 place-items-center rounded-full text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition"
                >
                  <X size={18} weight="bold" />
                </button>
              </div>

              {/* User Profile Card */}
              <div className="flex items-center gap-3.5 my-4">
                <div className="h-14 w-14 overflow-hidden rounded-2xl border-2 border-brand-100 bg-brand-50 shadow-sm shrink-0 flex items-center justify-center">
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
                  <h4 className="text-[16px] font-bold text-stone-900 truncate">
                    {fullName}
                  </h4>
                  <p className="text-[12px] text-stone-500 truncate flex items-center gap-1 mt-0.5">
                    <EnvelopeSimple size={13} className="shrink-0 text-stone-400" />
                    <span className="truncate">{email}</span>
                  </p>
                  <div className="flex items-center gap-1.5 mt-1.5">
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10.5px] font-semibold text-emerald-700 border border-emerald-200/60">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                      Akun Aktif
                    </span>
                  </div>
                </div>
              </div>

              {/* Account Metadata Box */}
              <div className="rounded-2xl bg-stone-50/80 p-3.5 space-y-2.5 text-xs text-stone-600 border border-stone-200/60">
                {joinDate && (
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-stone-400">
                      <CalendarBlank size={14} />
                      Bergabung
                    </span>
                    <span className="font-semibold text-stone-800">{joinDate}</span>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-stone-400">
                    <ShieldCheck size={14} />
                    Autentikasi
                  </span>
                  <span className="font-semibold text-stone-800 capitalize">
                    {user.app_metadata?.provider || "Google"}
                  </span>
                </div>
              </div>

              {/* Sign Out Action */}
              <div className="mt-5 pt-3 border-t border-stone-100">
                <button
                  type="button"
                  onClick={handleSignOut}
                  disabled={signingOut}
                  className="w-full flex items-center justify-center gap-2 rounded-2xl bg-rose-50 hover:bg-rose-100 border border-rose-200/80 py-3 px-4 text-xs font-semibold text-rose-700 transition active:scale-[0.98] disabled:opacity-50 min-h-[44px]"
                >
                  {signingOut ? (
                    <>
                      <CircleNotch size={16} className="animate-spin text-rose-600" />
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
          </div>,
          document.body
        )}
    </div>
  );
}

