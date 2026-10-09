"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import {
  Compass,
  UserPlus,
  Key,
  CircleNotch,
  CheckCircle,
  GoogleLogo,
  ArrowRight,
  ShieldCheck,
  House,
} from "@phosphor-icons/react";
import { joinTripByCode } from "@/lib/invite";
import Link from "next/link";

function JoinPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const codeParam = (searchParams.get("code") || searchParams.get("joinCode") || "").trim().toUpperCase();

  const [code, setCode] = useState(codeParam);
  const [user, setUser] = useState<any>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successTripId, setSuccessTripId] = useState<string | null>(null);
  const [successTripTitle, setSuccessTripTitle] = useState<string | null>(null);

  // Check auth state
  useEffect(() => {
    async function checkUser() {
      try {
        const supabase = createClient();
        const {
          data: { user: currentUser },
        } = await supabase.auth.getUser();
        setUser(currentUser);
      } catch (err) {
        console.error("Auth check error:", err);
      } finally {
        setCheckingAuth(false);
      }
    }
    checkUser();
  }, []);

  // Sync code from URL parameter
  useEffect(() => {
    if (codeParam) {
      setCode(codeParam);
    }
  }, [codeParam]);

  const handleJoin = async (targetCode: string) => {
    const cleanCode = targetCode.trim().toUpperCase();
    if (!cleanCode) {
      setError("Masukkan kode undangan perjalanan.");
      return;
    }

    setLoading(true);
    setError(null);

    const res = await joinTripByCode(cleanCode);
    setLoading(false);

    if (res.success && res.tripId) {
      setSuccessTripId(res.tripId);
      if (res.title) setSuccessTripTitle(res.title);
      setTimeout(() => {
        router.push(`/dashboard?tripId=${res.tripId}`);
        router.refresh();
      }, 1000);
    } else {
      setError(res.error || "Kode undangan tidak valid atau perjalanan tidak ditemukan.");
    }
  };

  // If user is already authenticated and a code is present in URL, auto join
  useEffect(() => {
    if (!checkingAuth && user && codeParam && !successTripId && !error && !loading) {
      handleJoin(codeParam);
    }
  }, [checkingAuth, user, codeParam]);

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      const supabase = createClient();
      const currentCode = (code || codeParam || "").trim().toUpperCase();
      const nextUrl = currentCode ? `/join?code=${encodeURIComponent(currentCode)}` : "/dashboard";
      const { error: authErr } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(nextUrl)}`,
        },
      });
      if (authErr) {
        setError("Gagal masuk dengan Google. Silakan coba lagi.");
        setLoading(false);
      }
    } catch {
      setError("Terjadi kesalahan koneksi. Silakan coba lagi.");
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4 sm:p-6 text-center">
      {/* Brand Logo */}
      <div className="mb-6 flex items-center gap-2.5">
        <span className="grid h-10 w-10 place-items-center rounded-2xl bg-brand-600 text-white shadow-glass">
          <Compass size={22} weight="fill" />
        </span>
        <span className="text-xl font-bold text-stone-900">Kembara</span>
      </div>

      {/* Main Join Card */}
      <div className="w-full max-w-md overflow-hidden rounded-3xl bg-white/80 backdrop-blur-2xl border border-white/80 p-6 sm:p-8 shadow-2xl space-y-5">
        {checkingAuth ? (
          <div className="py-12 flex flex-col items-center justify-center gap-3 text-stone-500">
            <CircleNotch size={32} className="animate-spin text-brand-600" />
            <p className="text-xs">Memeriksa tautan undangan...</p>
          </div>
        ) : successTripId ? (
          /* Success State */
          <div className="py-8 space-y-3 animate-in zoom-in-95 duration-200">
            <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-emerald-100 text-emerald-600 border border-emerald-200 shadow-sm">
              <CheckCircle size={36} weight="fill" />
            </div>
            <h3 className="text-lg font-bold text-stone-900">
              Berhasil Bergabung!
            </h3>
            {successTripTitle && (
              <p className="text-sm font-semibold text-brand-700 bg-brand-50/80 px-3 py-1.5 rounded-xl border border-brand-200/80 inline-block max-w-full truncate">
                {successTripTitle}
              </p>
            )}
            <p className="text-xs text-stone-500">
              Mengarahkan Anda ke dashboard perjalanan...
            </p>
          </div>
        ) : !user ? (
          /* Unauthenticated State — Prompt Google Login */
          <div className="space-y-4">
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-brand-50 text-brand-600 border border-brand-200/60 shadow-xs">
              <UserPlus size={28} weight="duotone" />
            </div>

            <div>
              <h2 className="text-lg font-bold text-stone-900 leading-tight">
                Undangan Perjalanan Bersama
              </h2>
              <p className="mt-1 text-xs text-stone-500 leading-relaxed">
                Anda diundang untuk bergabung ke rencana perjalanan di Kembara.
              </p>
            </div>

            {code && (
              <div className="rounded-2xl bg-brand-50/80 border border-brand-200/80 p-3 flex items-center justify-center gap-2">
                <span className="text-xs text-stone-500">Kode Undangan:</span>
                <span className="font-mono text-base font-black tracking-widest text-brand-700 bg-white px-2.5 py-0.5 rounded-lg border border-brand-200 shadow-2xs">
                  {code}
                </span>
              </div>
            )}

            {error && (
              <div className="rounded-2xl bg-rose-50 border border-rose-200 p-3 text-xs text-rose-700">
                {error}
              </div>
            )}

            <button
              type="button"
              disabled={loading}
              onClick={handleGoogleLogin}
              className="w-full inline-flex items-center justify-center gap-2.5 rounded-2xl bg-brand-600 hover:bg-brand-700 active:scale-95 px-5 py-3.5 text-sm font-bold text-white shadow-cta transition disabled:opacity-60 cursor-pointer"
            >
              {loading ? (
                <>
                  <CircleNotch size={18} className="animate-spin" />
                  <span>Menghubungkan ke Google...</span>
                </>
              ) : (
                <>
                  <GoogleLogo size={18} weight="bold" />
                  <span>Masuk dengan Google untuk Gabung</span>
                </>
              )}
            </button>

            <p className="text-[11px] text-stone-400">
              Akses default setelah bergabung adalah <strong>Viewer (Lihat Saja)</strong>.
            </p>
          </div>
        ) : (
          /* Authenticated State — Input / Confirm Join */
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleJoin(code);
            }}
            className="space-y-4 text-left"
          >
            <div className="text-center">
              <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-brand-50 text-brand-600 border border-brand-200/60 shadow-xs mb-3">
                <Key size={26} weight="duotone" />
              </div>
              <h2 className="text-lg font-bold text-stone-900 leading-tight">
                Gabung ke Perjalanan
              </h2>
              <p className="mt-1 text-xs text-stone-500">
                Masukkan 6-karakter kode undangan yang dibagikan oleh Host perjalanan.
              </p>
            </div>

            {error && (
              <div className="rounded-2xl bg-rose-50 border border-rose-200 p-3 text-xs text-rose-700 text-center">
                {error}
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1.5 text-center">
                Kode Undangan (6 Karakter)
              </label>
              <input
                type="text"
                maxLength={8}
                autoFocus
                placeholder="Contoh: KMB789"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                className="w-full text-center font-mono text-xl tracking-widest uppercase font-bold rounded-2xl border border-stone-200 bg-stone-50/70 p-3.5 text-stone-900 placeholder:text-stone-300 focus:bg-white focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200 transition"
              />
            </div>

            <button
              type="submit"
              disabled={loading || !code.trim()}
              className="w-full inline-flex items-center justify-center gap-2 rounded-2xl bg-brand-600 hover:bg-brand-700 active:scale-95 px-5 py-3.5 text-sm font-bold text-white shadow-cta transition disabled:opacity-50 cursor-pointer"
            >
              {loading ? (
                <>
                  <CircleNotch size={18} className="animate-spin" />
                  <span>Memproses...</span>
                </>
              ) : (
                <>
                  <span>Gabung Perjalanan Sekarang</span>
                  <ArrowRight size={16} weight="bold" />
                </>
              )}
            </button>

            <div className="pt-2 text-center">
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-1.5 text-xs font-medium text-stone-500 hover:text-stone-800 transition"
              >
                <House size={14} />
                <span>Kembali ke Beranda Dashboard</span>
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

export default function JoinPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center text-stone-400">
          <CircleNotch size={32} className="animate-spin text-brand-600" />
        </div>
      }
    >
      <JoinPageContent />
    </Suspense>
  );
}

