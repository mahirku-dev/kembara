# **Product Requirements Document (PRD)**

**Project Name:** Kembara (Personal & Spiritual Trip Planner)  
**Target Platform:** Web App (PWA) Mobile-First  
**Target Audience:** Personal use / Solo Traveler / Small Groups / Jamaah Umrah (Spiritual Trip)

# **1. Product Overview**
Aplikasi perencana perjalanan berbasis web yang memungkinkan pengguna merencanakan itinerary harian, melacak pengeluaran (budgeting), memetakan lokasi secara interaktif, dan mengelola daftar bawaan. Fokus utama adalah *low-budget maintenance* (menggunakan free-tier), *high performance*, serta dukungan mendalam untuk *Spiritual Trip* (seperti Umrah) dengan manajemen agenda berjenjang.

# **2. Tech Stack (Zero/Min Budget & Familiar)**
* **Frontend:** Next.js (App Router), React, Tailwind CSS (shadcn/ui).
* **UI/UX Design System:** **Native Glassmorphism** (elemen translusen ackdrop-blur, rounded corners organik, soft shadows) dengan tata letak *Mobile-First*.
* **Backend/API:** Next.js Server Actions / API Routes.  
* **Database & Auth:** Supabase (PostgreSQL, GoTrue Auth, Row Level Security).  
* **Storage:** Supabase Storage (untuk foto profil, cover trip, thumbnail agenda, dokumen tiket).  
* **Maps & Geocoding:** Mapbox API (Free tier) atau OpenStreetMap.  
* **Hosting/Deployment:** Vercel (Free tier).  
* **AI Integration:** Gemini API (Free tier via Google AI Studio).

# **3. Core Features (MVP)**

## **A. Itinerary Builder Advanced**
* **CRUD Perjalanan:** Judul, Tanggal, Cover Image, Destinasi Utama.
* **Day Filter Navigation:** Navigasi horizontal (*chips*) untuk menyaring tampilan agenda spesifik per hari (Hari 1, Hari 2, dst).
* **Jadwal Harian (Day-by-Day):** Menambahkan tempat kunjungan lengkap dengan waktu tempuh, kategori spesifik (Flight, Train, Bus, Car, Pray/Ibadah, dll), dan **Agenda Thumbnails**.
* **Nested Task Checklist (Sub-tasks):** Manajemen daftar tugas bersarang (checklist) di dalam masing-masing agenda (misal: Persiapan Thawaf -> Bawa botol minum, Pakai Ihram).
* **Drag-and-Drop:** Mengatur urutan tempat kunjungan secara intuitif.

## **B. Interactive Map View**
* Menampilkan titik lokasi jadwal di atas peta.  
* Rute garis (*polyline*) antar tempat berdasarkan urutan.  
* *Color-coding* pin peta berdasarkan hari.

## **C. Budget, Expense & Split-Bill Tracker**
* Menentukan budget total dengan UI *progress bar* interaktif.
* Mencatat pengeluaran dan *split-bill* (patungan) antar anggota.  
* Visualisasi sisa budget vs pengeluaran aktual (*Glassmorphism Ledger*).

## **D. Packing List & Document Vault**
* Checklist barang bawaan per kategori.  
* Unggah file penting (PDF tiket, asuransi, visa).

# **4. Fitur Tambahan & Inovatif**
* **Daily Inspiration (Hadits API):** Integrasi API (via Ahmad Sanusi API) untuk menampilkan *Quote Card* harian interaktif (seperti hadits keutamaan Umrah atau Masjid Nabawi) di halaman Dashboard dengan *fallback offline*.
* **AI Itinerary Extractor:** Ekstraksi teks email konfirmasi ke jadwal via Gemini API.  
* **Offline Support (PWA):** *Service Worker* agar jadwal & peta bisa dibuka tanpa internet.  
* **Live Weather Forecast:** Integrasi cuaca (OpenWeatherMap API).  
* **Auto Currency Converter:** Konversi mata uang asing ke Rupiah.

# **5. Database Schema (Supabase PostgreSQL)**
1. **users** (Supabase Auth native integration)  
2. **	rips**: id, user_id, 	itle, destination, start_date, end_date, cover_url, 	otal_budget.  
3. **	rip_members**: id, 	rip_id, user_id, 
ame, ole.  
4. **itinerary_days**: id, 	rip_id, day_number, date, 
otes.  
5. **places**: id, day_id, 
ame, ddress, lat, lng, start_time, end_time, category, cost, 	humbnail_url, 	asks_json (JSONB untuk checklist bersarang).  
6. **expenses**: id, 	rip_id, category, mount, currency, date, description, paid_by.  
7. **expense_splits**: id, expense_id, member_id, mount_owed.  
8. **packing_lists**: id, 	rip_id, item_name, category, is_checked.

# **6. Implementation Phases**
* **Phase 1 (Setup & Auth):** Inisialisasi Next.js, integrasi Supabase, setup *Native Glassmorphism UI*.  
* **Phase 2 (Core Logic):** CRUD Trips, Advanced Itinerary builder (Day filter & Nested Tasks), Expense & Vault.  
* **Phase 3 (Maps & API Integrations):** Integrasi Mapbox, marker dinamis, dan Daily Hadits API.  
* **Phase 4 (AI & Enhancements):** Integrasi Gemini API, Next-PWA, cuaca & kurs mata uang.
