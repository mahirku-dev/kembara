// =============================================
// Kembara App — Geolocation & Currency Detection
// =============================================

export interface LandmarkPreset {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  category: "makkah" | "madinah" | "jeddah" | "indonesia";
  countryCode: "SA" | "ID";
  defaultCurrency: "SAR" | "IDR";
  description: string;
}

export const POPULAR_LANDMARKS: LandmarkPreset[] = [
  // --- MAKKAH ---
  {
    id: "haram",
    name: "Masjidil Haram & Ka'bah",
    address: "Al Haram, Makkah 24231, Arab Saudi",
    lat: 21.4225,
    lng: 39.8262,
    category: "makkah",
    countryCode: "SA",
    defaultCurrency: "SAR",
    description: "Kiblat umat Islam dunia, pusat ibadah Thawaf & Sa'i.",
  },
  {
    id: "hira",
    name: "Gua Hira (Jabal Nur)",
    address: "Jabal An Nur, Makkah, Arab Saudi",
    lat: 21.4583,
    lng: 39.8589,
    category: "makkah",
    countryCode: "SA",
    defaultCurrency: "SAR",
    description: "Tempat turunnya wahyu pertama Al-Qur'an (Surat Al-'Alaq).",
  },
  {
    id: "tsur",
    name: "Gua Tsur (Jabal Tsur)",
    address: "Jabal Thawr, Makkah, Arab Saudi",
    lat: 21.3789,
    lng: 39.8519,
    category: "makkah",
    countryCode: "SA",
    defaultCurrency: "SAR",
    description: "Tempat persembunyian Rasulullah SAW saat hijrah ke Madinah.",
  },
  {
    id: "rahmah",
    name: "Jabal Rahmah (Arafah)",
    address: "Arafat, Makkah, Arab Saudi",
    lat: 21.3547,
    lng: 39.9842,
    category: "makkah",
    countryCode: "SA",
    defaultCurrency: "SAR",
    description: "Tempat pertemuan Nabi Adam AS dan Sayyidah Hawa.",
  },
  {
    id: "mina",
    name: "Kawasan Mina & Jamarat",
    address: "Mina, Makkah, Arab Saudi",
    lat: 21.4172,
    lng: 39.8711,
    category: "makkah",
    countryCode: "SA",
    defaultCurrency: "SAR",
    description: "Lokasi mabit dan lontar jumrah jemaah haji.",
  },
  {
    id: "hhs_makkah",
    name: "Stasiun Kereta Cepat Haramain Makkah",
    address: "Ar Rusayfah, Makkah, Arab Saudi",
    lat: 21.4188,
    lng: 39.7901,
    category: "makkah",
    countryCode: "SA",
    defaultCurrency: "SAR",
    description: "Stasiun kereta peluru rute Makkah - Jeddah - Madinah.",
  },

  // --- MADINAH ---
  {
    id: "nabawi",
    name: "Masjid Nabawi & Raudhah",
    address: "Al Haram, Madinah 42311, Arab Saudi",
    lat: 24.4672,
    lng: 39.6111,
    category: "madinah",
    countryCode: "SA",
    defaultCurrency: "SAR",
    description: "Masjid Rasulullah SAW, Makam Baginda Nabi & Raudhah Asy-Syarifah.",
  },
  {
    id: "quba",
    name: "Masjid Quba",
    address: "Al Hijrah Rd, Quba, Madinah, Arab Saudi",
    lat: 24.4394,
    lng: 39.6172,
    category: "madinah",
    countryCode: "SA",
    defaultCurrency: "SAR",
    description: "Masjid pertama yang dibangun dalam sejarah Islam.",
  },
  {
    id: "uhud",
    name: "Jabal Uhud & Makam Syuhada",
    address: "Uhud, Madinah, Arab Saudi",
    lat: 24.5034,
    lng: 39.6121,
    category: "madinah",
    countryCode: "SA",
    defaultCurrency: "SAR",
    description: "Bukit yang dicintai Rasulullah SAW & makam Sayyidina Hamzah RA.",
  },
  {
    id: "qiblatain",
    name: "Masjid Qiblatain",
    address: "Al Qiblatayn, Madinah, Arab Saudi",
    lat: 24.4842,
    lng: 39.5786,
    category: "madinah",
    countryCode: "SA",
    defaultCurrency: "SAR",
    description: "Masjid tempat turunnya perintah peralihan kiblat ke Ka'bah.",
  },
  {
    id: "hhs_madinah",
    name: "Stasiun Kereta Cepat Haramain Madinah",
    address: "Al Hadra, Madinah, Arab Saudi",
    lat: 24.4754,
    lng: 39.6582,
    category: "madinah",
    countryCode: "SA",
    defaultCurrency: "SAR",
    description: "Stasiun kereta cepat rute Madinah menuju Jeddah & Makkah.",
  },

  // --- JEDDAH ---
  {
    id: "jeddah_airport",
    name: "Bandara Internasional King Abdulaziz (JED)",
    address: "Terminal Haji / Terminal 1, Jeddah, Arab Saudi",
    lat: 21.6796,
    lng: 39.1565,
    category: "jeddah",
    countryCode: "SA",
    defaultCurrency: "SAR",
    description: "Pintu gerbang udara kedatangan & kepulangan jemaah Umrah.",
  },
  {
    id: "corniche_jeddah",
    name: "Jeddah Corniche & Masjid Terapung",
    address: "Corniche Rd, Ash Shati, Jeddah, Arab Saudi",
    lat: 21.5898,
    lng: 39.1096,
    category: "jeddah",
    countryCode: "SA",
    defaultCurrency: "SAR",
    description: "Pesisir laut merah dan Masjid Al-Rahmah (Masjid Terapung).",
  },

  // --- INDONESIA ---
  {
    id: "cgk_airport",
    name: "Bandara Soekarno-Hatta (CGK)",
    address: "Tangerang, Banten, Indonesia",
    lat: -6.1256,
    lng: 106.6559,
    category: "indonesia",
    countryCode: "ID",
    defaultCurrency: "IDR",
    description: "Pusat keberangkatan penerbangan internasional jemaah.",
  },
  {
    id: "sub_airport",
    name: "Bandara Juanda (SUB)",
    address: "Sedati, Sidoarjo, Jawa Timur, Indonesia",
    lat: -7.3798,
    lng: 112.7877,
    category: "indonesia",
    countryCode: "ID",
    defaultCurrency: "IDR",
    description: "Bandara embarkasi Umrah Jawa Timur & Indonesia Timur.",
  },
  {
    id: "asrama_pondok_gede",
    name: "Asrama Haji Pondok Gede",
    address: "Pinang Ranti, Makasar, Jakarta Timur, Indonesia",
    lat: -6.2917,
    lng: 106.8927,
    category: "indonesia",
    countryCode: "ID",
    defaultCurrency: "IDR",
    description: "Pusat pelepasan dan manasik jemaah DKI Jakarta & sekitarnya.",
  },
  {
    id: "asrama_donohudan",
    name: "Asrama Haji Donohudan Solo",
    address: "Ngemplak, Boyolali, Jawa Tengah, Indonesia",
    lat: -7.5305,
    lng: 110.7675,
    category: "indonesia",
    countryCode: "ID",
    defaultCurrency: "IDR",
    description: "Pusat embarkasi jemaah Jawa Tengah & DIY.",
  },
  {
    id: "asrama_sukolilo",
    name: "Asrama Haji Sukolilo Surabaya",
    address: "Manyar Sabrangan, Mulyorejo, Surabaya, Indonesia",
    lat: -7.2882,
    lng: 112.7818,
    category: "indonesia",
    countryCode: "ID",
    defaultCurrency: "IDR",
    description: "Embarkasi jemaah haji & umrah Surabaya.",
  },
  {
    id: "masjid_istiqlal",
    name: "Masjid Istiqlal Jakarta",
    address: "Jl. Taman Wijaya Kusuma, Ps. Baru, Jakarta Pusat, Indonesia",
    lat: -6.1702,
    lng: 106.8317,
    category: "indonesia",
    countryCode: "ID",
    defaultCurrency: "IDR",
    description: "Masjid terbesar di Asia Tenggara, pusat manasik & doa bersama.",
  },
  {
    id: "masjid_sheikh_zayed_solo",
    name: "Masjid Raya Sheikh Zayed Solo",
    address: "Gilingan, Banjarsari, Surakarta, Jawa Tengah, Indonesia",
    lat: -7.5539,
    lng: 110.8299,
    category: "indonesia",
    countryCode: "ID",
    defaultCurrency: "IDR",
    description: "Masjid megah replika Sheikh Zayed Grand Mosque Abu Dhabi.",
  },
];

/**
 * Automatically detects the default currency based on coordinates, address, or country code.
 * - Saudi Arabia -> "SAR"
 * - Indonesia -> "IDR"
 * - Fallback -> "IDR"
 */
export function detectCurrencyFromLocation(
  lat?: number | null,
  lng?: number | null,
  address?: string | null,
  countryCode?: string | null
): "SAR" | "IDR" | "USD" | "MYR" | "EUR" {
  // 1. Authoritative check via Coordinates Bounding Box
  if (lat != null && lng != null && !isNaN(lat) && !isNaN(lng) && (lat !== 0 || lng !== 0)) {
    // Indonesia approx bounding box: lat -11.5..6.5, lng 94.5..141.5
    if (lat >= -11.5 && lat <= 6.5 && lng >= 94.5 && lng <= 141.5) {
      return "IDR";
    }
    // Saudi Arabia approx bounding box: lat 16.0..32.5, lng 34.0..56.0
    if (lat >= 16.0 && lat <= 32.5 && lng >= 34.0 && lng <= 56.0) {
      return "SAR";
    }
    // Malaysia approx bounding box: lat 0.8..7.5, lng 99.5..119.5
    if (lat >= 0.8 && lat <= 7.5 && lng >= 99.5 && lng <= 119.5) {
      return "MYR";
    }
  }

  // 2. Check address keywords (cities, regions, landmarks)
  if (address) {
    const lower = address.toLowerCase();

    // Indonesia check
    if (
      lower.includes("indonesia") ||
      lower.includes("depok") ||
      lower.includes("jakarta") ||
      lower.includes("bogor") ||
      lower.includes("tangerang") ||
      lower.includes("bekasi") ||
      lower.includes("bandung") ||
      lower.includes("surabaya") ||
      lower.includes("semarang") ||
      lower.includes("yogyakarta") ||
      lower.includes("jogja") ||
      lower.includes("solo") ||
      lower.includes("surakarta") ||
      lower.includes("malang") ||
      lower.includes("banten") ||
      lower.includes("jawa barat") ||
      lower.includes("jawa tengah") ||
      lower.includes("jawa timur") ||
      lower.includes("soekarno") ||
      lower.includes("cengkareng") ||
      lower.includes("halim") ||
      lower.includes("juanda") ||
      lower.includes("medan") ||
      lower.includes("makassar") ||
      lower.includes("bali") ||
      lower.includes("denpasar") ||
      lower.includes("palembang") ||
      lower.includes("padang") ||
      lower.includes("aceh") ||
      lower.includes("lampung") ||
      lower.includes("boyolali") ||
      lower.includes("kertajati") ||
      lower.includes("lombok") ||
      lower.includes("balikpapan") ||
      lower.includes("banjarmasin") ||
      lower.includes("pontianak") ||
      lower.includes("manado") ||
      lower.includes("jawa") ||
      lower.includes("sumatera") ||
      lower.includes("kalimantan") ||
      lower.includes("sulawesi") ||
      lower.includes("papua")
    ) {
      return "IDR";
    }

    // Saudi Arabia check
    if (
      lower.includes("saudi") ||
      lower.includes("makkah") ||
      lower.includes("mecca") ||
      lower.includes("madinah") ||
      lower.includes("medina") ||
      lower.includes("jeddah") ||
      lower.includes("riyadh") ||
      lower.includes("arab saudi") ||
      lower.includes("haram") ||
      lower.includes("nabawi") ||
      lower.includes("kaaba") ||
      lower.includes("ka'bah") ||
      lower.includes("taif") ||
      lower.includes("dammam") ||
      lower.includes("khobar") ||
      lower.includes("tabuk") ||
      lower.includes("yanbu") ||
      lower.includes("abha")
    ) {
      return "SAR";
    }
  }

  // 3. Country code check if provided
  if (countryCode) {
    const code = countryCode.toUpperCase();
    if (code === "ID" || code === "IDN") return "IDR";
    if (code === "SA" || code === "SAU") return "SAR";
    if (code === "MY" || code === "MYS") return "MYR";
    if (code === "US" || code === "USA") return "USD";
  }

  return "IDR";
}

/**
 * Currencies list with symbols and country flags/labels
 */
export const AVAILABLE_CURRENCIES = [
  { code: "IDR", label: "IDR (Rp - Rupiah Indonesia)", symbol: "Rp", country: "Indonesia", flag: "🇮🇩" },
  { code: "SAR", label: "SAR (﷼ - Riyal Arab Saudi)", symbol: "﷼", country: "Arab Saudi", flag: "🇸🇦" },
  { code: "TRY", label: "TRY (₺ - Lira Turki)", symbol: "₺", country: "Turki", flag: "🇹🇷" },
  { code: "AED", label: "AED (د.إ - Dirham UEA / Dubai)", symbol: "د.إ", country: "Uni Emirat Arab", flag: "🇦🇪" },
  { code: "EGP", label: "EGP (E£ - Pound Mesir)", symbol: "E£", country: "Mesir", flag: "🇪🇬" },
  { code: "JOD", label: "JOD (JD - Dinar Yordania)", symbol: "JD", country: "Yordania", flag: "🇯🇴" },
  { code: "MYR", label: "MYR (RM - Ringgit Malaysia)", symbol: "RM", country: "Malaysia", flag: "🇲🇾" },
  { code: "SGD", label: "SGD (S$ - Dolar Singapura)", symbol: "S$", country: "Singapura", flag: "🇸🇬" },
  { code: "USD", label: "USD ($ - US Dollar)", symbol: "$", country: "Amerika Serikat", flag: "🇺🇸" },
  { code: "EUR", label: "EUR (€ - Euro Eropa)", symbol: "€", country: "Uni Eropa", flag: "🇪🇺" },
  { code: "GBP", label: "GBP (£ - Pound Sterling)", symbol: "£", country: "Inggris", flag: "🇬🇧" },
  { code: "JPY", label: "JPY (¥ - Yen Jepang)", symbol: "¥", country: "Jepang", flag: "🇯🇵" },
  { code: "QAR", label: "QAR (QR - Riyal Qatar)", symbol: "QR", country: "Qatar", flag: "🇶🇦" },
  { code: "OMR", label: "OMR (OMR - Rial Oman)", symbol: "OMR", country: "Oman", flag: "🇴🇲" },
  { code: "KWD", label: "KWD (KD - Dinar Kuwait)", symbol: "KD", country: "Kuwait", flag: "🇰🇼" },
  { code: "AUD", label: "AUD (A$ - Dolar Australia)", symbol: "A$", country: "Australia", flag: "🇦🇺" },
  { code: "CNY", label: "CNY (¥ - Yuan Tiongkok)", symbol: "¥", country: "Tiongkok", flag: "🇨🇳" },
] as const;

export type CurrencyCode = (typeof AVAILABLE_CURRENCIES)[number]["code"] | string;

/**
 * Detects destination foreign currencies dynamically from destination text, recorded expenses, and saved settings
 */
export function detectDestinationCurrencies(
  destination?: string | null,
  existingExpenseCurrencies: string[] = [],
  savedCustomCurrencies: string[] = []
): string[] {
  const currenciesSet = new Set<string>();

  // 1. Add any saved custom currencies from trip budget settings
  savedCustomCurrencies.forEach((c) => {
    if (c && c !== "IDR") currenciesSet.add(c.toUpperCase());
  });

  // 2. Add any foreign currencies already recorded in expenses
  existingExpenseCurrencies.forEach((c) => {
    if (c && c !== "IDR") currenciesSet.add(c.toUpperCase());
  });

  // 3. Detect from destination text keywords
  if (destination) {
    const lower = destination.toLowerCase();

    if (
      lower.includes("turki") ||
      lower.includes("turkey") ||
      lower.includes("istanbul") ||
      lower.includes("cappadocia") ||
      lower.includes("bursa")
    ) {
      currenciesSet.add("TRY");
    }

    if (
      lower.includes("mesir") ||
      lower.includes("egypt") ||
      lower.includes("kairo") ||
      lower.includes("cairo") ||
      lower.includes("alexandria")
    ) {
      currenciesSet.add("EGP");
    }

    if (
      lower.includes("dubai") ||
      lower.includes("uae") ||
      lower.includes("emirates") ||
      lower.includes("abu dhabi")
    ) {
      currenciesSet.add("AED");
    }

    if (
      lower.includes("jordan") ||
      lower.includes("yordania") ||
      lower.includes("amman") ||
      lower.includes("petra")
    ) {
      currenciesSet.add("JOD");
    }

    if (
      lower.includes("malaysia") ||
      lower.includes("kuala lumpur") ||
      lower.includes("penang")
    ) {
      currenciesSet.add("MYR");
    }

    if (
      lower.includes("singapura") ||
      lower.includes("singapore") ||
      lower.includes("changi")
    ) {
      currenciesSet.add("SGD");
    }

    if (
      lower.includes("jepang") ||
      lower.includes("japan") ||
      lower.includes("tokyo")
    ) {
      currenciesSet.add("JPY");
    }

    if (
      lower.includes("eropa") ||
      lower.includes("europe") ||
      lower.includes("paris") ||
      lower.includes("amsterdam")
    ) {
      currenciesSet.add("EUR");
    }

    if (
      lower.includes("makkah") ||
      lower.includes("madinah") ||
      lower.includes("jeddah") ||
      lower.includes("saudi") ||
      lower.includes("umrah") ||
      lower.includes("haji") ||
      lower.includes("hajj")
    ) {
      currenciesSet.add("SAR");
    }
  }

  // Fallback: If no foreign currency detected yet, default to SAR for Umrah travel
  if (currenciesSet.size === 0) {
    currenciesSet.add("SAR");
  }

  return Array.from(currenciesSet);
}

/**
 * Currency formatter supporting IDR, SAR, TRY, AED, USD, etc.
 */
export function formatMoney(amount: number, currency = "IDR"): string {
  try {
    const num = Number(amount) || 0;
    const curUpper = currency ? currency.toUpperCase() : "IDR";

    if (curUpper === "IDR") {
      return `Rp ${new Intl.NumberFormat("id-ID", { maximumFractionDigits: 0 }).format(num)}`;
    }
    if (curUpper === "SAR") {
      return `SAR ${new Intl.NumberFormat("id-ID", { maximumFractionDigits: 0 }).format(num)}`;
    }
    if (curUpper === "TRY") {
      return `TRY ${new Intl.NumberFormat("id-ID", { maximumFractionDigits: 0 }).format(num)}`;
    }
    if (curUpper === "AED") {
      return `AED ${new Intl.NumberFormat("id-ID", { maximumFractionDigits: 0 }).format(num)}`;
    }
    if (curUpper === "EGP") {
      return `EGP ${new Intl.NumberFormat("id-ID", { maximumFractionDigits: 0 }).format(num)}`;
    }
    if (curUpper === "USD") {
      return `$ ${new Intl.NumberFormat("id-ID", { maximumFractionDigits: 2 }).format(num)}`;
    }
    if (curUpper === "EUR") {
      return `€ ${new Intl.NumberFormat("id-ID", { maximumFractionDigits: 2 }).format(num)}`;
    }
    if (curUpper === "MYR") {
      return `RM ${new Intl.NumberFormat("id-ID", { maximumFractionDigits: 0 }).format(num)}`;
    }
    if (curUpper === "SGD") {
      return `S$ ${new Intl.NumberFormat("id-ID", { maximumFractionDigits: 2 }).format(num)}`;
    }

    return `${curUpper} ${new Intl.NumberFormat("id-ID", { maximumFractionDigits: 2 }).format(num)}`;
  } catch {
    return `${currency} ${amount.toLocaleString()}`;
  }
}

export const EXPENSE_CATEGORIES = [
  { id: "food", label: "Makan & Minum", color: "bg-orange-100 text-orange-700", dotColor: "bg-orange-500" },
  { id: "transport", label: "Transportasi / Taksi", color: "bg-blue-100 text-blue-700", dotColor: "bg-blue-500" },
  { id: "ibadah", label: "Ibadah & Ziarah", color: "bg-emerald-100 text-emerald-700", dotColor: "bg-emerald-500" },
  { id: "shopping", label: "Belanja & Oleh-oleh", color: "bg-purple-100 text-purple-700", dotColor: "bg-purple-500" },
  { id: "accommodation", label: "Hotel / Akomodasi", color: "bg-amber-100 text-amber-700", dotColor: "bg-amber-500" },
  { id: "flight", label: "Tiket Pesawat", color: "bg-sky-100 text-sky-700", dotColor: "bg-sky-500" },
  { id: "other", label: "Lainnya", color: "bg-stone-100 text-stone-700", dotColor: "bg-stone-500" },
] as const;



