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

// =============================================
// City Recognition & Route Extraction Helpers
// =============================================

export const KNOWN_CITIES: { patterns: RegExp[]; name: string }[] = [
  // Arab Saudi
  { patterns: [/makkah/i, /mecca/i, /mekkah/i, /mekah/i, /haram/i, /kaaba/i, /ka'bah/i, /tan'im/i, /ji'ranah/i, /hudaibiyah/i], name: "Mekkah" },
  { patterns: [/madinah/i, /medina/i, /nabawi/i, /quba/i, /qiblatain/i, /uhud/i, /baqi/i, /bir ali/i], name: "Madinah" },
  { patterns: [/jeddah/i, /jidda/i, /king abdulaziz/i, /red sea/i, /al balad/i], name: "Jeddah" },
  { patterns: [/riyadh/i, /king khalid/i], name: "Riyadh" },
  { patterns: [/taif/i, /thaif/i, /shafa/i, /hada/i], name: "Taif" },
  { patterns: [/dammam/i, /khobar/i, /dhahran/i], name: "Dammam" },
  { patterns: [/yanbu/i], name: "Yanbu" },
  { patterns: [/tabuk/i], name: "Tabuk" },
  { patterns: [/abha/i], name: "Abha" },

  // Indonesia
  { patterns: [/jakarta/i, /soekarno[- ]hatta/i, /halim/i, /cengkareng/i, /gambir/i, /kemayoran/i, /istiqlal/i], name: "Jakarta" },
  { patterns: [/surabaya/i, /juanda/i, /gubeng/i, /pasar turi/i, /sukolilo/i], name: "Surabaya" },
  { patterns: [/bandung/i, /kertajati/i, /lembang/i], name: "Bandung" },
  { patterns: [/yogyakarta/i, /jogja/i, /kulon progo/i, /yia/i, /sleman/i, /bantul/i, /malioboro/i], name: "Yogyakarta" },
  { patterns: [/semarang/i, /ahmad yani/i], name: "Semarang" },
  { patterns: [/solo/i, /surakarta/i, /adi soemarmo/i, /donohudan/i], name: "Solo" },
  { patterns: [/denpasar/i, /bali/i, /ngurah rai/i, /kuta/i, /seminyak/i, /ubud/i, /sanur/i, /jimbaran/i, /nusa dua/i, /badung/i], name: "Denpasar" },
  { patterns: [/mataram/i, /lombok/i, /praya/i, /gili/i, /senggigi/i], name: "Mataram" },
  { patterns: [/medan/i, /kualanamu/i], name: "Medan" },
  { patterns: [/padang/i, /minangkabau/i, /bukittinggi/i], name: "Padang" },
  { patterns: [/palembang/i, /sultan mahmud badaruddin/i], name: "Palembang" },
  { patterns: [/makassar/i, /hasanuddin/i, /ujung pandang/i], name: "Makassar" },
  { patterns: [/balikpapan/i, /sepinggan/i], name: "Balikpapan" },
  { patterns: [/banjarmasin/i, /syamsudin noor/i], name: "Banjarmasin" },
  { patterns: [/pontianak/i, /supadio/i], name: "Pontianak" },
  { patterns: [/manado/i, /sam ratulangi/i], name: "Manado" },
  { patterns: [/bogor/i, /puncak/i], name: "Bogor" },
  { patterns: [/depok/i], name: "Depok" },
  { patterns: [/tangerang/i, /bsd/i, /serpong/i], name: "Tangerang" },
  { patterns: [/bekasi/i], name: "Bekasi" },
  { patterns: [/malang/i, /batu/i, /abdul rachman saleh/i], name: "Malang" },
  { patterns: [/cirebon/i], name: "Cirebon" },
  { patterns: [/sukabumi/i], name: "Sukabumi" },
  { patterns: [/tasikmalaya/i], name: "Tasikmalaya" },
  { patterns: [/pekalongan/i], name: "Pekalongan" },
  { patterns: [/tegal/i], name: "Tegal" },
  { patterns: [/magelang/i, /borobudur/i], name: "Magelang" },
  { patterns: [/banyuwangi/i, /blimbingsari/i], name: "Banyuwangi" },
  { patterns: [/labuan bajo/i, /komodo/i], name: "Labuan Bajo" },
  { patterns: [/kupang/i, /eltari/i], name: "Kupang" },
  { patterns: [/ambon/i, /pattimura/i], name: "Ambon" },
  { patterns: [/jayapura/i, /sentani/i], name: "Jayapura" },
  { patterns: [/banda aceh/i, /sultan iskandar muda/i], name: "Banda Aceh" },
  { patterns: [/pekanbaru/i, /sultan syarif kasim/i], name: "Pekanbaru" },
  { patterns: [/batam/i, /hang nadim/i], name: "Batam" },
  { patterns: [/jambi/i, /sultan thaha/i], name: "Jambi" },
  { patterns: [/bengkulu/i, /fatmawati/i], name: "Bengkulu" },
  { patterns: [/bandar lampung/i, /lampung/i, /radin inten/i], name: "Lampung" },

  // Mancanegara
  { patterns: [/kuala lumpur/i, /klia/i, /petaling jaya/i, /sepang/i], name: "Kuala Lumpur" },
  { patterns: [/penang/i, /george town/i], name: "Penang" },
  { patterns: [/singapore/i, /singapura/i, /changi/i], name: "Singapore" },
  { patterns: [/bangkok/i, /suvarnabhumi/i, /don mueang/i], name: "Bangkok" },
  { patterns: [/phuket/i], name: "Phuket" },
  { patterns: [/istanbul/i, /sabiha/i], name: "Istanbul" },
  { patterns: [/dubai/i, /dxb/i], name: "Dubai" },
  { patterns: [/abu dhabi/i], name: "Abu Dhabi" },
  { patterns: [/doha/i, /hamad/i], name: "Doha" },
  { patterns: [/cairo/i, /kairo/i], name: "Kairo" },
  { patterns: [/amman/i], name: "Amman" },
  { patterns: [/jerusalem/i, /yerusalem/i, /al-quds/i], name: "Yerusalem" },
  { patterns: [/tokyo/i, /haneda/i, /narita/i], name: "Tokyo" },
  { patterns: [/osaka/i, /kansai/i], name: "Osaka" },
  { patterns: [/kyoto/i], name: "Kyoto" },
  { patterns: [/seoul/i, /incheon/i], name: "Seoul" },
  { patterns: [/london/i, /heathrow/i, /gatwick/i], name: "London" },
  { patterns: [/paris/i, /charles de gaulle/i], name: "Paris" },
  { patterns: [/sydney/i, /kingsford smith/i], name: "Sydney" },
  { patterns: [/melbourne/i], name: "Melbourne" },
];

export const PROVINCE_PATTERNS =
  /^(provinsi|prov\.|daerah khusus|daerah istimewa|dki|di |jawa barat|jawa timur|jawa tengah|banten|bali|nusa tenggara barat|nusa tenggara timur|ntb|ntt|sumatera utara|sumut|sumatera barat|sumbar|sumatera selatan|sumsel|riau|kepulauan riau|kepri|jambi|bengkulu|lampung|bangka belitung|babel|kalimantan barat|kalbar|kalimantan timur|kaltim|kalimantan selatan|kalsel|kalimantan tengah|kalteng|kalimantan utara|kaltara|sulawesi selatan|sulsel|sulawesi utara|sulut|sulawesi tengah|sulteng|sulawesi tenggara|sultra|gorontalo|sulawesi barat|sulbar|maluku|maluku utara|papua|papua barat|papua selatan|papua tengah|papua pegunungan|papua barat daya|makkah province|medina province|al madinah province|riyadh province|eastern province|province|state|prefecture|region|oblast|governorate|wilayah|special region)/i;

export const COUNTRY_PATTERNS =
  /^(indonesia|saudi arabia|arab saudi|malaysia|singapore|singapura|thailand|turkey|turkiye|turki|uae|united arab emirates|egypt|mesir|jordan|yordania|japan|jepang|south korea|korea selatan|korea|united kingdom|uk|england|inggris|france|prancis|germany|jerman|australia|united states|usa|amerika serikat)$/i;

/**
 * Extracts a recognizable city name from address text, landmark name, or coordinates.
 */
export function extractCityName(
  address?: string | null,
  name?: string | null,
  lat?: number | null,
  lng?: number | null
): string | null {
  const fullText = `${address || ""} ${name || ""}`;

  // 1. Match against known cities patterns
  for (const city of KNOWN_CITIES) {
    if (city.patterns.some((p) => p.test(fullText))) {
      return city.name;
    }
  }

  // 2. Parse from address components (comma-separated)
  if (address) {
    const parts = address
      .split(",")
      .map((p) => p.trim().replace(/\d+/g, "").trim())
      .filter(
        (p) =>
          p.length > 2 &&
          !COUNTRY_PATTERNS.test(p) &&
          !PROVINCE_PATTERNS.test(p)
      );

    if (parts.length > 0) {
      let candidate = parts[parts.length - 1];
      candidate = candidate
        .replace(
          /^(kota administrasi|kota madya|kota adm\.|kota|kabupaten|kab\.)\s+/i,
          ""
        )
        .trim();

      if (
        candidate &&
        candidate.length <= 30 &&
        !PROVINCE_PATTERNS.test(candidate)
      ) {
        return candidate;
      }
    }
  }

  // 3. Fallback to coordinate bounding boxes if available
  if (lat != null && lng != null && !isNaN(lat) && !isNaN(lng)) {
    // Makkah bounding box: lat 21.30..21.55, lng 39.70..40.05
    if (lat >= 21.3 && lat <= 21.55 && lng >= 39.7 && lng <= 40.05) {
      return "Mekkah";
    }
    // Madinah bounding box: lat 24.35..24.60, lng 39.45..39.75
    if (lat >= 24.35 && lat <= 24.6 && lng >= 39.45 && lng <= 39.75) {
      return "Madinah";
    }
    // Jeddah bounding box: lat 21.30..21.90, lng 39.05..39.35
    if (lat >= 21.3 && lat <= 21.9 && lng >= 39.05 && lng <= 39.35) {
      return "Jeddah";
    }
    // Jakarta bounding box: lat -6.40..-6.05, lng 106.65..107.00
    if (lat >= -6.4 && lat <= -6.05 && lng >= 106.65 && lng <= 107.0) {
      return "Jakarta";
    }
  }

  return null;
}

// =============================================
// Timezone Options & Detection
// =============================================

export interface TimezoneOption {
  code: string;
  label: string;
  offset: string;
  region: string;
}

export const POPULAR_TIMEZONES: TimezoneOption[] = [
  { code: "KSA", label: "Arab Saudi (AST)", offset: "UTC+3", region: "Makkah, Madinah, Jeddah" },
  { code: "WIB", label: "Waktu Indonesia Barat", offset: "UTC+7", region: "Jakarta, Sumatra, Jawa" },
  { code: "WITA", label: "Waktu Indonesia Tengah", offset: "UTC+8", region: "Bali, Lombok, Makassar" },
  { code: "WIT", label: "Waktu Indonesia Timur", offset: "UTC+9", region: "Maluku, Papua" },
  { code: "GST", label: "Uni Emirat Arab / Dubai", offset: "UTC+4", region: "Dubai, Abu Dhabi" },
  { code: "TRT", label: "Turki", offset: "UTC+3", region: "Istanbul, Ankara" },
  { code: "EEST", label: "Mesir", offset: "UTC+3", region: "Kairo, Alexandria" },
  { code: "MYT", label: "Malaysia & Singapura", offset: "UTC+8", region: "Kuala Lumpur, Singapore" },
  { code: "JST", label: "Jepang", offset: "UTC+9", region: "Tokyo, Osaka" },
  { code: "KST", label: "Korea Selatan", offset: "UTC+9", region: "Seoul, Incheon" },
  { code: "UTC", label: "Waktu Standar Universal (GMT)", offset: "UTC+0", region: "Universal Time" },
];

/**
 * Automatically detects the appropriate timezone based on coordinates, address, or name.
 */
export function detectTimezoneFromLocation(
  lat?: number | null,
  lng?: number | null,
  address?: string | null,
  name?: string | null
): string {
  const text = `${address || ""} ${name || ""}`.toLowerCase();

  // Arab Saudi
  if (
    text.includes("makkah") ||
    text.includes("mecca") ||
    text.includes("madinah") ||
    text.includes("medina") ||
    text.includes("jeddah") ||
    text.includes("riyadh") ||
    text.includes("saudi") ||
    text.includes("arab saudi") ||
    text.includes("haram") ||
    text.includes("nabawi") ||
    text.includes("taif") ||
    text.includes("thaif") ||
    (lat && lng && lat >= 16 && lat <= 32 && lng >= 34 && lng <= 55)
  ) {
    return "KSA";
  }

  // UAE / Dubai
  if (
    text.includes("dubai") ||
    text.includes("abu dhabi") ||
    text.includes("dxb") ||
    text.includes("uae") ||
    text.includes("emirates")
  ) {
    return "GST";
  }

  // Turkey
  if (
    text.includes("istanbul") ||
    text.includes("turkey") ||
    text.includes("turki") ||
    text.includes("turkiye") ||
    text.includes("ankara")
  ) {
    return "TRT";
  }

  // Egypt
  if (text.includes("cairo") || text.includes("kairo") || text.includes("mesir") || text.includes("egypt")) {
    return "EEST";
  }

  // Malaysia / Singapore
  if (
    text.includes("kuala lumpur") ||
    text.includes("singapore") ||
    text.includes("singapura") ||
    text.includes("changi") ||
    text.includes("klia") ||
    text.includes("penang")
  ) {
    return "MYT";
  }

  // Indonesia WITA
  if (
    text.includes("bali") ||
    text.includes("denpasar") ||
    text.includes("lombok") ||
    text.includes("makassar") ||
    text.includes("mataram") ||
    text.includes("balikpapan") ||
    text.includes("banjarmasin") ||
    text.includes("manado") ||
    text.includes("kupang")
  ) {
    return "WITA";
  }

  // Indonesia WIT
  if (text.includes("jayapura") || text.includes("papua") || text.includes("ambon") || text.includes("maluku")) {
    return "WIT";
  }

  // Default Indonesia WIB
  return "WIB";
}

/**
 * Strips seconds (e.g. "13:00:00" -> "13:00") and formats clean time display.
 */
export function formatTimeDisplay(timeStr?: string | null): string {
  if (!timeStr) return "";
  const trimmed = timeStr.trim();
  // Strip seconds if present e.g. "13:00:00" -> "13:00"
  const match = trimmed.match(/^(\d{1,2}:\d{2})(?::\d{2})?(.*)$/);
  if (match) {
    const timePart = match[1];
    const rest = match[2]?.trim();
    return rest ? `${timePart} ${rest}` : timePart;
  }
  return trimmed;
}

/**
 * Formats a clean start-end time range string without seconds (e.g. "13:00 — 15:00").
 */
export function formatTimeRange(
  startTime?: string | null,
  endTime?: string | null,
  timezone?: string | null
): string {
  const cleanStart = formatTimeDisplay(startTime);
  const cleanEnd = formatTimeDisplay(endTime);

  let range = "";
  if (cleanStart && cleanEnd) {
    range = `${cleanStart} — ${cleanEnd}`;
  } else if (cleanStart) {
    range = cleanStart;
  } else if (cleanEnd) {
    range = cleanEnd;
  }

  if (range && timezone) {
    return `${range} ${timezone}`;
  }
  return range || "Sepanjang hari";
}

/**
 * Generates an intent URL for Google Maps Navigation & Directions.
 * Prioritizes the exact Place Name and Address/City so Google Maps opens
 * the verified Place of Interest (POI) with its authentic name and photos,
 * rather than a generic raw coordinate or nearby street name.
 */
export function getGoogleMapsDirectionsUrl(
  lat?: number | null,
  lng?: number | null,
  address?: string | null,
  name?: string | null,
  cityName?: string | null
): string {
  const cleanName = (name || "").trim();
  const cleanAddress = (address || "").trim();
  const cleanCity = (cityName || "").trim();

  // 1. Build a rich, human-readable place query that Google Maps can precisely resolve
  let targetQuery = "";

  if (cleanName && cleanAddress) {
    if (cleanAddress.toLowerCase().includes(cleanName.toLowerCase())) {
      targetQuery = cleanAddress;
    } else {
      targetQuery = `${cleanName}, ${cleanAddress}`;
    }
  } else if (cleanName) {
    targetQuery = cleanCity ? `${cleanName}, ${cleanCity}` : cleanName;
  } else if (cleanAddress) {
    targetQuery = cleanAddress;
  }

  // If a descriptive place name/address exists, pass it as the destination query.
  // Google Maps on Android/iOS uses this to match the official POI and display the correct landmark name.
  if (targetQuery) {
    return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(targetQuery)}`;
  }

  // Fallback to coordinates only if no descriptive name/address is available
  if (lat != null && lng != null && !isNaN(Number(lat)) && !isNaN(Number(lng))) {
    return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
  }

  return "https://www.google.com/maps";
}

