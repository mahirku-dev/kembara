import Link from "next/link";
import { Compass, House } from "@phosphor-icons/react/dist/ssr";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-6 text-center">
      <div className="mb-6 grid h-20 w-20 place-items-center rounded-3xl bg-white/60 backdrop-blur-xl border border-white/60 shadow-glass text-brand-400">
        <Compass size={40} weight="light" />
      </div>
      <h1 className="text-4xl font-bold text-stone-700">404</h1>
      <p className="mt-2 text-[17px] font-semibold text-stone-600">
        Halaman Tidak Ditemukan
      </p>
      <p className="mt-2 text-[14px] text-stone-400 max-w-xs">
        Halaman yang Anda cari tidak ada atau telah dipindahkan.
      </p>
      <Link
        href="/dashboard"
        className="mt-8 inline-flex items-center gap-2 rounded-2xl bg-brand-600 px-6 py-3 text-[14px] font-semibold text-white shadow-cta transition hover:bg-brand-700"
      >
        <House size={18} weight="fill" aria-hidden />
        Kembali ke Dashboard
      </Link>
    </div>
  );
}

