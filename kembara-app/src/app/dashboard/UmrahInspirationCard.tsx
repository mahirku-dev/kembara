"use client";

import { useState } from "react";
import type { Trip } from "@/types";
import { BookOpen, Quotes, ArrowsClockwise, Sparkle } from "@phosphor-icons/react";

export interface InspirationItem {
  id: string;
  category: string;
  arabic: string;
  translation: string;
  source: string;
}

export const UMRAH_INSPIRATIONS: InspirationItem[] = [
  {
    id: "nabawi_prayer",
    category: "Keutamaan Masjid Nabawi",
    arabic: "صَلَاةٌ فِي مَسْجِدِي هَذَا أَفْضَلُ مِنْ أَلْفِ صَلَاةٍ فِيمَا سِوَاهُ إِلَّا الْمَسْجِدَ الْحَرَامَ",
    translation: "Shalat di masjidku ini (Masjid Nabawi) lebih baik dari seribu shalat di masjid lain, kecuali Masjidil Haram.",
    source: "HR. Bukhari No. 1190 & Muslim No. 1394",
  },
  {
    id: "umrah_expiation",
    category: "Penggugur Dosa",
    arabic: "العُمْرَةُ إِلَى العُمْرَةِ كَفَّارَةٌ لِمَا بَيْنَهُمَا، وَالحَجُّ المَبْرُورُ لَيْسَ لَهُ جَزَاءٌ إِلَّا الجَنَّةُ",
    translation: "Antara satu umrah ke umrah berikutnya adalah penghapus dosa di antara keduanya, dan haji yang mabrur tiada balasan baginya selain surga.",
    source: "HR. Bukhari No. 1773 & Muslim No. 1349",
  },
  {
    id: "haram_prayer",
    category: "Keutamaan Masjidil Haram",
    arabic: "صَلَاةٌ فِي الْمَسْجِدِ الْحَرَامِ أَفْضَلُ مِنْ مِائَةِ أَلْفِ صَلَاةٍ فِيمَا سِوَاهُ",
    translation: "Shalat di Masjidil Haram lebih utama daripada seratus ribu shalat di masjid lainnya.",
    source: "HR. Ahmad No. 14694 & Ibnu Majah No. 1406",
  },
  {
    id: "guest_of_allah",
    category: "Tamu Allah yang Mustajab",
    arabic: "الْغَازِي فِي سَبِيلِ اللَّهِ وَالْحَاجُّ وَالْمُعْتَمِرُ وَفْدُ اللَّهِ دَعَاهُمْ فَأَجَابُوهُ وَسَأَلُوهُ فَأَعْطَاهُمْ",
    translation: "Orang yang berperang di jalan Allah, orang yang berhaji, dan orang yang berumrah adalah tamu-tamu Allah. Allah memanggil mereka lalu mereka menyambut-Nya, dan mereka meminta kepada-Nya lalu Allah mengabulkannya.",
    source: "HR. Ibnu Majah No. 2893",
  },
  {
    id: "remove_poverty",
    category: "Keberkahan Rezeki",
    arabic: "تَابِعُوا بَيْنَ الحَجِّ وَالعُمْرَةِ فَإِنَّهُمَا يَنْفِيَانِ الفَقْرَ وَالذُّنُوبَ كَمَا يَنْفِي الكِيرُ خَبَثَ الحَدِيدِ",
    translation: "Lanjutkanlah antara haji dan umrah, karena keduanya menghilangkan kefakiran dan dosa-dosa sebagaimana ubupan api menghilangkan karat besi.",
    source: "HR. Tirmidzi No. 810 & An-Nasa'i No. 2631",
  },
  {
    id: "zamzam_blessing",
    category: "Keberkahan Air Zamzam",
    arabic: "مَاءُ زَمْزَمَ لِمَا شُرِبَ لَهُ",
    translation: "Air Zamzam itu berkhasiat sesuai dengan niat orang yang meminumnya.",
    source: "HR. Ibnu Majah No. 3062 & Ahmad No. 14849",
  },
  {
    id: "raudhah_garden",
    category: "Taman Surga Raudhah",
    arabic: "مَا بَيْنَ بَيْتِي وَمِنْبَرِي رَوْضَةٌ مِنْ رِيَاضِ الْجَنَّةِ",
    translation: "Tempat yang berada di antara rumahku dan mimbarku adalah salah satu taman (Raudhah) dari taman-taman surga.",
    source: "HR. Bukhari No. 1195 & Muslim No. 1391",
  },
  {
    id: "talbiyah_call",
    category: "Kalimat Talbiyah",
    arabic: "لَبَّيْكَ اللَّهُمَّ لَبَّيْكَ، لَبَّيْكَ لاَ شَرِيكَ لَكَ لَبَّيْكَ، إِنَّ الْحَمْدَ وَالنِّعْمَةَ لَكَ وَالْمُلْكَ، لاَ شَرِيكَ لَكَ",
    translation: "Aku penuhi panggilan-Mu ya Allah, aku penuhi panggilan-Mu. Tiada sekutu bagi-Mu, aku penuhi panggilan-Mu. Sesungguhnya segala puji, nikmat, dan kekuasaan adalah milik-Mu, tiada sekutu bagi-Mu.",
    source: "Lafadz Talbiyah Rasulullah ﷺ (HR. Bukhari & Muslim)",
  },
];

/**
 * Checks whether a trip is an Umrah / Hajj / Holy Land spiritual journey.
 */
export function isUmrahTrip(trip?: Trip | null): boolean {
  if (!trip) return false;
  const combined = `${trip.title || ""} ${trip.destination || ""}`.toLowerCase();
  const keywords = [
    "umrah",
    "umroh",
    "haji",
    "hajj",
    "makkah",
    "mecca",
    "mekah",
    "madinah",
    "medina",
    "saudi",
    "ziarah",
    "masjidil haram",
    "nabawi",
    "tanah suci",
    "spiritual",
    "jeddah",
    "zamzam",
  ];
  return keywords.some((k) => combined.includes(k));
}

interface UmrahInspirationCardProps {
  trip?: Trip | null;
}

export default function UmrahInspirationCard({ trip }: UmrahInspirationCardProps) {
  const [index, setIndex] = useState(0);
  const [isRotating, setIsRotating] = useState(false);

  // Only render if this trip is an Umrah / Holy Land spiritual trip
  if (!trip || !isUmrahTrip(trip)) {
    return null;
  }

  const current = UMRAH_INSPIRATIONS[index];

  const handleNext = () => {
    setIsRotating(true);
    setIndex((prev) => (prev + 1) % UMRAH_INSPIRATIONS.length);
    setTimeout(() => {
      setIsRotating(false);
    }, 300);
  };

  return (
    <div
      onClick={handleNext}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handleNext();
        }
      }}
      title="Klik untuk melihat inspirasi / hadits lainnya"
      className="group relative rounded-3xl bg-gradient-to-br from-[#183a20] via-[#1e4828] to-[#2c6136] p-6 lg:p-8 shadow-xl overflow-hidden text-white border border-[#3b7b46]/30 transition-all duration-300 hover:shadow-2xl hover:border-emerald-400/40 cursor-pointer active:scale-[0.99] select-none"
    >
      {/* Ambient background glows */}
      <div className="absolute -top-16 -right-16 w-48 h-48 bg-white/10 rounded-full blur-3xl transition duration-500 group-hover:bg-white/20 pointer-events-none" />
      <div className="absolute -bottom-8 -left-8 w-32 h-32 bg-emerald-400/20 rounded-full blur-2xl transition duration-500 group-hover:bg-emerald-400/30 pointer-events-none" />
      <div className="absolute top-4 right-5 text-white/10 pointer-events-none">
        <Quotes size={64} weight="fill" aria-hidden />
      </div>

      <div className="relative z-10 flex flex-col gap-4">
        {/* Top Header Badge & Switcher hint */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-emerald-200">
            <BookOpen size={20} weight="light" aria-hidden />
            <span className="text-[11px] font-bold tracking-widest uppercase opacity-90">
              Inspirasi Umrah
            </span>
            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-emerald-900/60 border border-emerald-400/30 text-emerald-300">
              {current.category}
            </span>
          </div>

          <div className="flex items-center gap-1.5 text-xs text-emerald-300/80 group-hover:text-emerald-200 transition bg-white/10 hover:bg-white/20 px-2.5 py-1 rounded-xl backdrop-blur-md">
            <ArrowsClockwise
              size={14}
              weight="bold"
              className={`transition-transform duration-300 ${
                isRotating ? "rotate-180 text-emerald-300" : "group-hover:rotate-45"
              }`}
            />
            <span className="text-[10.5px] font-semibold">
              {index + 1}/{UMRAH_INSPIRATIONS.length}
            </span>
          </div>
        </div>

        {/* Arabic Text */}
        <p
          key={`arabic-${current.id}`}
          className="text-right text-[20px] md:text-[23px] leading-loose text-white/95 mt-1 font-arabic animate-in fade-in zoom-in-95 duration-200"
          dir="rtl"
          style={{ fontFamily: "var(--font-amiri)" }}
        >
          {current.arabic}
        </p>

        {/* Translation & Reference */}
        <div
          key={`trans-${current.id}`}
          className="flex flex-col gap-2 text-[13.5px] md:text-[14.5px] text-emerald-50 font-light leading-relaxed pr-6 animate-in fade-in slide-in-from-bottom-1 duration-200"
        >
          <p className="leading-relaxed">&ldquo;{current.translation}&rdquo;</p>
          <div className="flex items-center justify-between mt-1">
            <p className="text-[11.5px] font-medium text-emerald-300">
              &mdash; {current.source}
            </p>
            <span className="text-[10.5px] text-emerald-400/70 italic group-hover:text-emerald-300 transition">
              Klik kartu untuk ganti inspirasi &rarr;
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

