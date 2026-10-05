# **Product Requirements Document (PRD)**

**Project Name:** Kembara (Personal Trip Planner)  
**Target Platform:** Web App (PWA)  
**Target Audience:** Personal use / Solo Traveler / Small Groups

# **1\. Product Overview**

Aplikasi perencana perjalanan berbasis web yang memungkinkan pengguna merencanakan itinerary harian, melacak pengeluaran (budgeting), memetakan lokasi secara interaktif, dan mengelola daftar bawaan. Fokus utama adalah *low-budget maintenance* (menggunakan free-tier) dan *high performance*.

# **2\. Tech Stack (Zero/Min Budget & Familiar)**

* **Frontend:** Next.js (App Router), React, Tailwind CSS (shadcn/ui untuk komponen UI cepat).  
* **Backend/API:** Next.js Server Actions / API Routes.  
* **Database & Auth:** Supabase (PostgreSQL, GoTrue Auth, Row Level Security).  
* **Storage:** Supabase Storage (untuk foto profil, cover trip, dokumen tiket).  
* **Maps & Geocoding:** Mapbox API (Free tier 50.000 load/bulan) atau OpenStreetMap dengan Leaflet.  
* **Hosting/Deployment:** Vercel (Free tier).  
* **AI Integration:** Gemini API (Free tier via Google AI Studio).

# **3\. Core Features (MVP)**

## **A. Itinerary Builder**

* CRUD Perjalanan (Trip): Judul, Tanggal Mulai-Selesai, Cover Image, Destinasi Utama.  
* Jadwal Harian (Day-by-Day): Menambahkan tempat (Place), waktu kunjungan, dan catatan khusus.  
* Drag-and-drop urutan tempat kunjungan.

## **B. Interactive Map View**

* Menampilkan titik lokasi jadwal di atas peta (Mapbox).  
* Rute garis (*polyline*) antar tempat berdasarkan urutan.  
* *Color-coding* pin peta berdasarkan hari.

## **C. Budget, Expense & Split-Bill Tracker**

* Menentukan budget total.  
* Mencatat pengeluaran dan *split-bill* (patungan) antar anggota grup.  
* Visualisasi sisa budget vs pengeluaran aktual.

## **D. Packing List & Document Vault**

* Checklist barang bawaan.  
* Unggah file penting (PDF tiket, asuransi, visa).

# **4\. Fitur Tambahan & Inovatif**

* **AI Itinerary Extractor:** Ekstraksi teks email konfirmasi ke jadwal via Gemini API.  
* **Offline Support (PWA):** *Service Worker* agar jadwal & peta bisa dibuka tanpa internet.  
* **Live Weather Forecast:** Integrasi cuaca (OpenWeatherMap API).  
* **Auto Currency Converter:** Konversi mata uang asing ke Rupiah.

# **5\. Database Schema (Supabase PostgreSQL)**

1. **`users`** (Supabase Auth native integration)  
2. **`trips`**: `id`, `user_id`, `title`, `destination`, `start_date`, `end_date`, `cover_url`, `total_budget`.  
3. **`trip_members`**: `id`, `trip_id`, `user_id`, `name`, `role`.  
4. **`itinerary_days`**: `id`, `trip_id`, `day_number`, `date`, `notes`.  
5. **`places`**: `id`, `day_id`, `name`, `address`, `lat`, `lng`, `start_time`, `end_time`, `category`, `cost`.  
6. **`expenses`**: `id`, `trip_id`, `category`, `amount`, `currency`, `date`, `description`, `paid_by`.  
7. **`expense_splits`**: `id`, `expense_id`, `member_id`, `amount_owed`.  
8. **`packing_lists`**: `id`, `trip_id`, `item_name`, `category`, `is_checked`.

# **6\. Implementation Phases**

* **Phase 1 (Setup & Auth):** Inisialisasi Next.js, integrasi Supabase, UI komponen.  
* **Phase 2 (Core Logic):** CRUD Trips, Itinerary builder, Expense & Split-bill Tracker UI.  
* **Phase 3 (Maps & Geolocation):** Integrasi Mapbox, marker dinamis.  
* **Phase 4 (AI & Enhancements):** Integrasi Gemini API, Next-PWA, cuaca & kurs mata uang.

