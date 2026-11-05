# AGENTS.md — Pedoman Pengembangan & Protokol Anti-AI-Slop

Dokumen ini merupakan aturan baku (**Constitution**) bagi AI Assistant saat bekerja di proyek **pemda** (Backend: Laravel, Frontend: React + TypeScript). Seluruh instruksi dalam dokumen ini mengikat dan wajib dipatuhi.

---

## 1. Protokol Eksekusi: Strict Planning (Anti-Asumsi)

Jika menerima prompt singkat, ambigu, atau tugas penambahan/perubahan fitur (contoh: *"buatkan endpoint verifikasi berkas"* atau *"tambah filter status di tabel"*), **JANGAN LANGSUNG MENULIS KODE**.

AI wajib menjalankan 2 tahap:

### Tahap 1: Analisis Codebase & Penyusunan Rencana (Plan)
Sebelum menyentuh file apa pun, lakukan penelusuran pada kode yang sudah ada (Model, Migration, Enum, Service, atau Komponen UI), kemudian sajikan rencana ringkas kepada user yang memuat:
1. **Target File**: Daftar file yang akan dibuat atau dimodifikasi.
2. **Skema / Payload**: Bentuk request payload, response JSON, atau perubahan field database.
3. **Alur Logika**: Jalur eksekusi dari Controller/Route sampai ke Database/Service.
4. **Usulan Alternatif/Modern (Opsional)**: Jika AI melihat pendekatan atau arsitektur yang dirasa lebih modern, efisien, atau clean dibanding pola saat ini, AI **boleh mengusulkannya di sini** dan wajib meminta konfirmasi user sebelum diterapkan.

*Tunggu persetujuan user sebelum melanjutkan ke Tahap 2.*

### Tahap 2: Implementasi & Verifikasi Otomatis
Setelah rencana disetujui, tulis kode sesuai standar pada Bab 2, 3, dan 4, lalu jalankan verifikasi pada Bab 5 sebelum menyatakan selesai.

---

## 2. Standar Arsitektur Backend (Laravel 13)

Terapkan arsitektur berlapis ketat (**Strict Layered Architecture**):

1. **Routes & Controllers**:
   * Controller harus tipis (*skinny controller*).
   * Tugas controller hanya: menerima request, memanggil Service yang sesuai, dan mengembalikan `JsonResource` atau response HTTP standar.
   * Dilarang menulis query database langsung (`DB::table(...)` atau `Model::where(...)` yang kompleks) di dalam Controller.
2. **FormRequest**:
   * Setiap validasi input API wajib menggunakan `FormRequest` khusus di `app/Http/Requests/`.
   * Dilarang melakukan `$request->validate()` langsung di Controller.
3. **Service Layer**:
   * Seluruh *business logic*, kalkulasi data, transaksi database (`DB::transaction`), dan interaksi antar-model wajib ditempatkan di `app/Services/`.
4. **Responses & Resources**:
   * Gunakan `JsonResource` di `app/Http/Resources/` untuk memformat output API agar konsisten.
5. **Otorisasi & Keamanan**:
   * Gunakan Policy (`app/Policies/`) atau Spatie Permission (`spatie/laravel-permission`) yang sudah terpasang untuk pengecekan hak akses.
6. **Dependensi**:
   * Dilarang menjalankan `composer require` untuk menambah package pihak ketiga baru kecuali disetujui secara eksplisit oleh user.

---

## 3. Standar Arsitektur Frontend (React 19 + TypeScript + Vite)

1. **Struktur Berbasis Fitur**:
   * Kelompokkan kode per fitur di `src/features/` atau halaman di `src/routes/`.
2. **Type Safety Ketat (Zero `any`)**:
   * Dilarang menggunakan tipe `any`. Gunakan interface/type eksplisit, `unknown` dengan type-guard, atau schema `zod`.
   * Model data harus selaras dengan contract API backend.
3. **Komponen & UI Reusability**:
   * Prioritaskan menggunakan komponen UI yang sudah tersedia di `src/components/ui/` (Radix UI / Shadcn) dan Tailwind CSS v4.
   * Cek folder `src/components/` sebelum membuat komponen baru untuk menghindari duplikasi.
   * Dilarang menginstal library UI tambahan (`pnpm add`) tanpa izin user.
4. **State & Data Fetching**:
   * Gunakan TanStack Query (`@tanstack/react-query`) untuk server-state.
   * Gunakan Zustand untuk global client-state yang persisten.

---

## 4. Kebijakan Anti-Slop (Code Cleanliness)

1. **Kebijakan Komentar (Minimalis & Self-Documenting)**:
   * **Dilarang**: Menulis komentar yang hanya menjelaskan sintaks dasar atau menduplikasi nama fungsi (contoh terlarang: `// save to database`, `// set state loading to true`, `// return response`).
   * **Diperbolehkan**: Komentar hanya untuk menjelaskan aturan bisnis pemda yang rumit, alasan teknis di balik keputusan yang tidak lazim, atau referensi regulasi tertentu.
2. **Larangan Placeholder Malas**:
   * Dilarang menyisakan potongan kode seperti `// TODO: implement later`, `// logic here`, atau `// ... existing code ...`.
   * Kode yang dihasilkan harus utuh, fungsional, dan siap digunakan.
3. **No Fake / Greenwashed Tests**:
   * Unit test dan feature test harus menguji skenario nyata (kondisi sukses, validasi gagal, dan otorisasi terlarang).
   * Dilarang mem-mock semua fungsi secara berlebihan hingga tes selalu hijau tanpa menguji logika bisnis sebenarnya.

---

## 5. Verifikasi Otomatis (Definition of Done)

Sebelum menyatakan tugas selesai kepada user, AI **wajib** melakukan verifikasi mandiri:

1. **Backend Verification**:
   * Format kode yang diubah menggunakan Laravel Pint:
     ```bash
     php vendor/bin/pint path/to/file.php
     ```
   * Jalankan unit/feature test terkait:
     ```bash
     php artisan test --filter=NamaTestTerkait
     ```
2. **Frontend Verification**:
   * Pastikan tidak ada type error:
     ```bash
     npx tsc --noEmit
     ```
3. **Git Cleanliness**:
   * Periksa `git status` / `git diff` untuk memastikan tidak ada file konfigurasi liar, file temporer, atau perubahan yang tidak disengaja.

Jika ditemukan error pada tahap verifikasi, perbaiki langsung sebelum memberikan laporan akhir kepada user.
