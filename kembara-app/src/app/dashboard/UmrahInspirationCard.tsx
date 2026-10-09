"use client";

import { useState } from "react";
import type { Trip } from "@/types";
import { BookOpen, CaretRight, ArrowsClockwise } from "@phosphor-icons/react";

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
    translation: "Orang yang berhaji dan berumrah adalah tamu-tamu Allah. Allah memanggil mereka lalu mereka menyambut-Nya, dan mereka berdoa kepada-Nya lalu Allah mengabulkannya.",
    source: "HR. Ibnu Majah No. 2893",
  },
  {
    id: "remove_poverty",
    category: "Keberkahan Rezeki",
    arabic: "تَابِعُوا بَيْنَ الحَجِّ وَالعُمْرَةِ فَإِنَّهُمَا يَنْفِيَانِ الفَقْرَ وَالذُّنُوبَ كَمَا يَنْفِي الكِيرُ خَبَثَ الحَدِيدِ",
    translation: "Lanjutkanlah antara haji dan umrah, karena keduanya menghilangkan kefakiran dan dosa-dosa sebagaimana ubupan api membersihkan karat besi.",
    source: "HR. Tirmidzi No. 810",
  },
  {
    id: "zamzam_blessing",
    category: "Keberkahan Air Zamzam",
    arabic: "مَاءُ زَمْزَمَ لِمَا شُرِبَ لَهُ",
    translation: "Air Zamzam itu berkhasiat sesuai dengan niat orang yang meminumnya.",
    source: "HR. Ibnu Majah No. 3062",
  },
  {
    id: "raudhah_garden",
    category: "Taman Surga Raudhah",
    arabic: "مَا بَيْنَ بَيْتِي وَمِنْبَرِي رَوْضَةٌ مِنْ رِيَاضِ الْجَنَّةِ",
    translation: "Tempat yang berada di antara rumahku dan mimbarku adalah salah satu taman dari taman-taman surga.",
    source: "HR. Bukhari No. 1195",
  },
  {
    id: "talbiyah_call",
    category: "Kalimat Talbiyah",
    arabic: "لَبَّيْكَ اللَّهُمَّ لَبَّيْكَ، لَبَّيْكَ لاَ شَرِيكَ لَكَ لَبَّيْكَ، إِنَّ الْحَمْدَ وَالنِّعْمَةَ لَكَ وَالْمُلْكَ، لاَ شَرِيكَ لَكَ",
    translation: "Aku penuhi panggilan-Mu ya Allah. Tiada sekutu bagi-Mu. Sesungguhnya segala puji, nikmat, dan kekuasaan adalah milik-Mu.",
    source: "Lafadz Talbiyah (HR. Bukhari & Muslim)",
  },
];

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

  if (!trip || !isUmrahTrip(trip)) {
    return null;
  }

  const current = UMRAH_INSPIRATIONS[index];

  const handleNext = () => {
    setIndex((prev) => (prev + 1) % UMRAH_INSPIRATIONS.length);
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
      title="Klik untuk melihat inspirasi berikutnya"
      className="group relative rounded-3xl bg-white/70 hover:bg-white/90 backdrop-blur-xl border border-white/80 p-4 sm:p-5 shadow-panel transition-all active:scale-[0.99] cursor-pointer select-none space-y-2.5"
    >
      {/* Top Header Row */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="grid h-9 w-9 place-items-center rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-200/50 shadow-xs shrink-0 group-hover:scale-105 transition">
            <BookOpen size={18} weight="fill" />
          </span>
          <div className="min-w-0">
            <h4 className="text-[13px] font-bold text-stone-800 leading-tight truncate">
              Inspirasi Umrah
            </h4>
            <p className="text-[11px] text-emerald-700 font-medium truncate">
              {current.category}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            handleNext();
          }}
          className="inline-flex items-center gap-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200/60 px-2.5 py-1 text-[11px] font-bold shadow-xs hover:bg-emerald-100 transition shrink-0"
          title="Ganti Inspirasi"
        >
          <span>
            {index + 1}/{UMRAH_INSPIRATIONS.length}
          </span>
          <CaretRight size={12} weight="bold" />
        </button>
      </div>

      {/* Arabic Text */}
      <p
        className="text-right text-[15px] sm:text-[17px] leading-relaxed text-stone-900 font-arabic pt-1"
        dir="rtl"
        style={{ fontFamily: "var(--font-amiri, serif)" }}
      >
        {current.arabic}
      </p>

      {/* Translation & Source */}
      <div className="pt-1 text-[11.5px] sm:text-xs text-stone-600 leading-relaxed space-y-1">
        <p className="italic line-clamp-2">&ldquo;{current.translation}&rdquo;</p>
        <p className="text-[10.5px] font-semibold text-emerald-700">
          &mdash; {current.source}
        </p>
      </div>
    </div>
  );
}
