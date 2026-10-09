"use client";

import { useState, useEffect, useTransition, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { Compass, CircleNotch, GoogleLogo } from "@phosphor-icons/react";

function LoginPageContent() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const searchParams = useSearchParams();

  // Distinguish true trip invite codes from OAuth PKCE codes (UUIDs)
  const rawCode = searchParams.get("joinCode") || searchParams.get("code");
  const isAuthCode = rawCode ? rawCode.includes("-") || rawCode.length > 12 : false;
  const joinCode = rawCode && !isAuthCode ? rawCode.trim().toUpperCase() : null;

  // If Supabase OAuth redirected here with ?code=<UUID>, forward to /auth/callback immediately
  useEffect(() => {
    const codeParam = searchParams.get("code");
    if (codeParam && (codeParam.includes("-") || codeParam.length > 12)) {
      setLoading(true);
      const nextParam = searchParams.get("next") || (joinCode ? `/join?code=${joinCode}` : "/dashboard");
      window.location.href = `/auth/callback?code=${encodeURIComponent(codeParam)}&next=${encodeURIComponent(nextParam)}`;
    }
  }, [searchParams, joinCode]);

  // Listen for active auth session changes
  useEffect(() => {
    const supabase = createClient();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        const nextParam = searchParams.get("next");
        const target = nextParam || (joinCode ? `/join?code=${joinCode}` : "/dashboard");
        window.location.href = target;
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [searchParams, joinCode]);

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError(null);
    startTransition(async () => {
      try {
        const supabase = createClient();
        const nextParam = searchParams.get("next");
        const nextUrl = nextParam || (joinCode ? `/join?code=${joinCode}` : "/dashboard");

        const { error } = await supabase.auth.signInWithOAuth({
          provider: "google",
          options: {
            redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(nextUrl)}`,
          },
        });
        if (error) {
          setError("Gagal masuk dengan Google. Silakan coba lagi.");
          setLoading(false);
        }
        // If successful, browser will navigate to Google OAuth endpoint
      } catch {
        setError("Terjadi kesalahan koneksi. Silakan coba lagi.");
        setLoading(false);
      }
    });
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-6 text-center">
      <div className="mb-8 grid h-20 w-20 place-items-center rounded-3xl bg-white/60 backdrop-blur-xl border border-white/60 shadow-glass text-brand-600">
        <Compass size={48} weight="fill" />
      </div>
      <h1 className="text-3xl font-bold text-stone-900">Kembara</h1>
      <p className="mt-2 text-stone-500">
        Rencanakan perjalanan spiritual dan personal Anda.
      </p>

      <div className="mt-10 w-full max-w-sm space-y-4">
        {error && (
          <div className="rounded-2xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600">
            {error}
          </div>
        )}

        <button
          onClick={handleGoogleLogin}
          disabled={loading}
          className="flex w-full items-center justify-center gap-3 rounded-2xl bg-white/60 backdrop-blur-md border border-white/60 p-4 text-[15px] font-medium shadow-glass transition hover:bg-white/80 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {loading ? (
            <>
              <CircleNotch size={20} weight="light" className="animate-spin text-stone-700" />
              Mengarahkan ke Google...
            </>
          ) : (
            <>
              <GoogleLogo size={20} weight="bold" className="text-stone-700" />
              Masuk dengan Google
            </>
          )}
        </button>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <CircleNotch size={32} className="animate-spin text-brand-600" />
        </div>
      }
    >
      <LoginPageContent />
    </Suspense>
  );
}
