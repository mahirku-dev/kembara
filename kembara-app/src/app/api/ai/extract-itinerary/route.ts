import { NextRequest, NextResponse } from "next/server";

export interface ExtractedAgendaItem {
  id: string;
  dayNumber: number;
  date?: string | null;
  name: string;
  category:
    | "flight"
    | "hotel"
    | "food"
    | "pray"
    | "explore"
    | "train"
    | "bus"
    | "transit"
    | "car"
    | "other";
  address?: string | null;
  startTime?: string | null;
  endTime?: string | null;
  notes?: string | null;
  cost?: number;
}

// Fallback heuristic parser when Gemini API is not configured or offline
function heuristicParseItinerary(
  text: string,
  startDateStr?: string
): ExtractedAgendaItem[] {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  const items: ExtractedAgendaItem[] = [];
  let currentDay = 1;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Detect Day headers like "Hari 1", "Day 2", "Hari Kedua", "26 Okt", etc.
    const dayMatch =
      line.match(/^(?:hari|day)\s*[:\-]?\s*(\d+)/i) ||
      line.match(/^(?:hari\s+ke\s*[:\-]?\s*(\d+))/i);

    if (dayMatch) {
      currentDay = parseInt(dayMatch[1], 10) || currentDay;
      continue;
    }

    // Skip short header lines without actual activity
    if (line.length < 3) continue;

    // Detect Time (e.g., "08:00 - 10:30", "14:00", "08.00")
    const timeRangeMatch = line.match(
      /(\d{1,2}[:.]\d{2})\s*(?:-|–|s\/d|to)\s*(\d{1,2}[:.]\d{2})/i
    );
    const singleTimeMatch = line.match(/(?:pukul|jam)?\s*(\d{1,2}[:.]\d{2})/i);

    let startTime: string | null = null;
    let endTime: string | null = null;

    if (timeRangeMatch) {
      startTime = timeRangeMatch[1].replace(".", ":");
      endTime = timeRangeMatch[2].replace(".", ":");
      if (startTime.length === 4) startTime = `0${startTime}`;
      if (endTime.length === 4) endTime = `0${endTime}`;
    } else if (singleTimeMatch) {
      startTime = singleTimeMatch[1].replace(".", ":");
      if (startTime.length === 4) startTime = `0${startTime}`;
    }

    // Clean name from timestamps, bullets, and numbering
    let cleanName = line
      .replace(/^[\d+.)\-*•\s]+/, "")
      .replace(/\d{1,2}[:.]\d{2}\s*(?:-|–|s\/d|to)\s*\d{1,2}[:.]\d{2}/gi, "")
      .replace(/(?:pukul|jam)\s*\d{1,2}[:.]\d{2}/gi, "")
      .replace(/^\s*[-:–|]\s*/, "")
      .trim();

    if (!cleanName || cleanName.length < 2) continue;

    // Detect Category based on keywords
    const lower = line.toLowerCase();
    let category: ExtractedAgendaItem["category"] = "explore";

    if (
      lower.includes("flight") ||
      lower.includes("pesawat") ||
      lower.includes("terbang") ||
      lower.includes("bandara") ||
      lower.includes("airport") ||
      lower.includes("landing") ||
      lower.includes("take off") ||
      lower.includes("boarding")
    ) {
      category = "flight";
    } else if (
      lower.includes("hotel") ||
      lower.includes("check in") ||
      lower.includes("check-in") ||
      lower.includes("check out") ||
      lower.includes("check-out") ||
      lower.includes("penginapan") ||
      lower.includes("resort") ||
      lower.includes("villa")
    ) {
      category = "hotel";
    } else if (
      lower.includes("makan") ||
      lower.includes("sarapan") ||
      lower.includes("breakfast") ||
      lower.includes("lunch") ||
      lower.includes("dinner") ||
      lower.includes("resto") ||
      lower.includes("kuliner") ||
      lower.includes("kafe") ||
      lower.includes("cafe")
    ) {
      category = "food";
    } else if (
      lower.includes("masjid") ||
      lower.includes("solat") ||
      lower.includes("sholat") ||
      lower.includes("shalat") ||
      lower.includes("ibadah") ||
      lower.includes("thawaf") ||
      lower.includes("tawaf") ||
      lower.includes("sa'i") ||
      lower.includes("sai") ||
      lower.includes("umrah") ||
      lower.includes("umroh") ||
      lower.includes("raudhah") ||
      lower.includes("jumat")
    ) {
      category = "pray";
    } else if (
      lower.includes("kereta") ||
      lower.includes("train") ||
      lower.includes("stasiun") ||
      lower.includes("haramain") ||
      lower.includes("whoosh")
    ) {
      category = "train";
    } else if (
      lower.includes("bus") ||
      lower.includes("travel") ||
      lower.includes("terminal")
    ) {
      category = "bus";
    } else if (
      lower.includes("transit") ||
      lower.includes("pindah") ||
      lower.includes("transfer")
    ) {
      category = "transit";
    } else if (
      lower.includes("mobil") ||
      lower.includes("taxi") ||
      lower.includes("taksi") ||
      lower.includes("rental")
    ) {
      category = "car";
    }

    // Extract location/address snippet if detected
    let address: string | null = null;
    const knownLocations = [
      "Makkah",
      "Madinah",
      "Jeddah",
      "Riyadh",
      "Taif",
      "Jakarta",
      "Bandung",
      "Surabaya",
      "Yogyakarta",
      "Solo",
      "Semarang",
      "Denpasar",
      "Mataram",
      "Medan",
      "Padang",
      "Makassar",
      "Kuala Lumpur",
      "Singapore",
      "Bangkok",
      "Tokyo",
      "Seoul",
    ];

    for (const loc of knownLocations) {
      if (new RegExp(`\\b${loc}\\b`, "i").test(line)) {
        address = loc;
        break;
      }
    }

    items.push({
      id: `ext_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      dayNumber: currentDay,
      name: cleanName,
      category,
      address,
      startTime: startTime || undefined,
      endTime: endTime || undefined,
      notes: line !== cleanName ? line : undefined,
    });
  }

  return items;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { text, tripTitle, destination, startDate } = body;

    if (!text || typeof text !== "string" || !text.trim()) {
      return NextResponse.json(
        { error: "Teks itinerary tidak boleh kosong." },
        { status: 400 }
      );
    }

    const apiKey =
      process.env.GEMINI_API_KEY ||
      process.env.GOOGLE_AI_API_KEY ||
      process.env.NEXT_PUBLIC_GEMINI_API_KEY;

    // 1. If Gemini API Key is available, call Google Gemini 1.5/2.0 Flash
    if (apiKey) {
      try {
        const prompt = `You are a travel itinerary extraction assistant for the Kembara travel app.
Trip Details:
- Title: ${tripTitle || "Perjalanan"}
- Destination: ${destination || "Tidak spesifik"}
- Start Date: ${startDate || "Tidak ditentukan"}

Input Text from User (could be flight confirmation, tour rundown, hotel voucher, WhatsApp schedule, or multi-day plan):
"""
${text.slice(0, 10000)}
"""

Extract ALL events, stops, flights, hotels, prayers, meals, transport, and visits into a structured JSON array.
Follow these rules strictly:
1. "dayNumber": (number >= 1) Day sequence. If multi-day rundown, group activities correctly by Day 1, Day 2, etc.
2. "date": "YYYY-MM-DD" if mentioned in text, otherwise null.
3. "name": Concise activity title (e.g. "Penerbangan CGK - JED (SV817)", "Check-in Hotel Pullman Zamzam", "Ziarah Masjid Quba & Jabal Uhud", "Makan Siang di Al Romansiah").
4. "category": EXACTLY one of: "flight", "hotel", "food", "pray", "explore", "train", "bus", "transit", "car", "other".
5. "address": Location or city (e.g. "Bandara Soekarno Hatta Terminal 3, Jakarta", "Madinah", "Makkah", "Bandung").
6. "startTime": "HH:mm" 24h format (e.g. "08:00", "14:30") or null.
7. "endTime": "HH:mm" 24h format (e.g. "12:00", "17:00") or null.
8. "notes": Brief important details (e.g. "Terminal 3 Gate 5", "Voucher PLM-772910", "Pakaian Ihram").

Respond ONLY with a valid JSON array, with NO extra markdown text, NO backticks. Example:
[
  {
    "dayNumber": 1,
    "date": null,
    "name": "Penerbangan Jakarta ke Jeddah",
    "category": "flight",
    "address": "Jakarta",
    "startTime": "08:00",
    "endTime": "14:00",
    "notes": "Flight SV817"
  }
]`;

        const geminiRes = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              contents: [
                {
                  parts: [{ text: prompt }],
                },
              ],
              generationConfig: {
                temperature: 0.1,
                topP: 0.95,
              },
            }),
          }
        );

        if (geminiRes.ok) {
          const geminiData = await geminiRes.json();
          const rawReply =
            geminiData?.candidates?.[0]?.content?.parts?.[0]?.text || "";

          // Clean markdown formatting if present
          const cleanJsonStr = rawReply
            .replace(/^```json\s*/i, "")
            .replace(/^```\s*/i, "")
            .replace(/```\s*$/i, "")
            .trim();

          const parsed = JSON.parse(cleanJsonStr);
          if (Array.isArray(parsed) && parsed.length > 0) {
            const formattedItems: ExtractedAgendaItem[] = parsed.map(
              (p: any, idx: number) => ({
                id: `ai_${Date.now()}_${idx}_${Math.random().toString(36).substring(2, 6)}`,
                dayNumber: typeof p.dayNumber === "number" ? Math.max(1, p.dayNumber) : 1,
                date: p.date || null,
                name: String(p.name || `Agenda ${idx + 1}`).trim(),
                category: [
                  "flight",
                  "hotel",
                  "food",
                  "pray",
                  "explore",
                  "train",
                  "bus",
                  "transit",
                  "car",
                  "other",
                ].includes(p.category)
                  ? p.category
                  : "explore",
                address: p.address ? String(p.address).trim() : null,
                startTime: p.startTime ? String(p.startTime).trim() : null,
                endTime: p.endTime ? String(p.endTime).trim() : null,
                notes: p.notes ? String(p.notes).trim() : null,
              })
            );

            return NextResponse.json({
              success: true,
              engine: "gemini",
              items: formattedItems,
            });
          }
        }
      } catch (geminiError) {
        console.warn("Gemini API call failed, using heuristic parser:", geminiError);
      }
    }

    // 2. Fallback to Local Heuristic NLP Parser
    const fallbackItems = heuristicParseItinerary(text, startDate);

    if (fallbackItems.length === 0) {
      // Create at least one item from the text if nothing detected
      fallbackItems.push({
        id: `ext_${Date.now()}`,
        dayNumber: 1,
        name: text.slice(0, 60).trim(),
        category: "explore",
        notes: text.trim(),
      });
    }

    return NextResponse.json({
      success: true,
      engine: "heuristic",
      items: fallbackItems,
    });
  } catch (error: any) {
    console.error("Error in extract-itinerary API route:", error);
    return NextResponse.json(
      { error: error?.message || "Gagal memproses ekstraksi itinerary." },
      { status: 500 }
    );
  }
}

