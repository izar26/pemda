# Portal Layanan Administrasi & Kepegawaian Pemerintah Daerah (PEMDA)

Platform digital terpadu untuk tata kelola pemerintahan daerah, manajemen aparatur pegawai sipil / non-ASN, manajemen peran dinamis (*Role-Based Access Control*), audit aktivitas sistem secara komprehensif, dan sistem keamanan berlapis berstandar instansi pemerintah.

---

## 🏛️ Arsitektur & Teknologi

Sistem dibangun dengan arsitektur monorepo modern yang memisahkan backend API dan frontend SPA:

### Backend
- **Framework**: Laravel 11.x (PHP 8.2+)
- **Database**: PostgreSQL 16+
- **Autentikasi & Keamanan**:
  - Laravel Sanctum (Token-based API authentication)
  - Google Authenticator (TOTP Two-Factor Authentication via PragmaRX)
  - Spatie Laravel-Permission (Role-Based Access Control dinamis)
  - Cryptographically secure single-use invitation tokens (SHA-256 / Str::random(64))
  - Rate limiting & anti-enumeration protection
  - Comprehensive Audit Trail Logging
- **Testing**: PHPUnit / Pest (Automated test coverage)

### Frontend
- **Framework**: React 19 + TypeScript + Vite
- **UI & Komponen**: Tailwind CSS + Shadcn UI + Radix UI + Lucide Icons
- **State & Routing**:
  - TanStack Router (Type-safe routing & search params handling)
  - TanStack Query (React Query v5 untuk server-state caching & synchronization)
  - Zustand (Client-side auth & UI states)
- **Paket Manajer**: **pnpm** (Strict package resolution)

---

## 🚀 Fitur Utama Sistem

1. **Autentikasi & Keamanan Berlapis**:
   - Multi-step login dengan proteksi brute-force (Rate Limiting).
   - Wajib / Opsional Autentikasi Dua Faktor (2FA) dengan QR Code Google Authenticator & *Emergency Recovery Codes*.
   - Manajemen pemulihan kata sandi (*Password Reset*) anti-enumerasi akun.

2. **Manajemen Pegawai & Alur Aktivasi Mandiri (*Self-Service Onboarding*)**:
   - Admin OPD / BKPSDM mengirimkan undangan aktivasi akun via email dinas resmi.
   - Token aktivasi unik berbatas waktu 48 jam dan hangus otomatis setelah dipakai (*Single-use*).
   - Pegawai mengaktivasi akun sendiri: melengkapi NIP, data kontak, dan membuat kata sandi dengan indikator keamanan 5 parameter (*real-time password strength meter*).
   - Admin dapat memantau status "Menunggu Aktivasi" dan mengirim ulang undangan (*Resend Invitation*) bila diperlukan.

3. **Tata Kelola Peran & Izin Dinamis (RBAC)**:
   - Manajemen peran jabatan (*Role*) dinamis dengan matriks izin (*Permissions*) granular per modul.
   - Proteksi peran sistem (*is_system*) agar peran kritis tidak dapat terhapus secara tidak sengaja.
   - Penegakan otorisasi di tingkat API backend (*policies/middleware*) dan sinkronisasi hak akses frontend.

4. **Audit Trail & Jejak Aktivitas Resmi**:
   - Pencatatan otomatis setiap aksi penting: login, pengubahan izin peran, pengiriman undangan pegawai, aktivasi akun, dan perubahan data profil.
   - IP address, user-agent, metadata konteks, dan pencarian log audit.

---

## 📂 Struktur Direktori

```
pemda/
├── backend/                  # REST API Laravel 11
│   ├── app/
│   │   ├── Http/Controllers/Api/   # API Controller (Auth, User, Role, Audit)
│   │   ├── Http/Requests/          # Form Request Validation
│   │   ├── Http/Resources/         # API Resource Transformers
│   │   ├── Mail/                   # Mailables & Notifikasi Email
│   │   ├── Models/                 # Eloquent Models & Relationships
│   │   └── Services/               # Business Logic Services
│   ├── database/
│   │   ├── migrations/             # Database Schemas & Migrations
│   │   └── seeders/                # Initial Roles & Demo Data
│   ├── resources/views/emails/     # Template Email HTML Resmi PEMDA
│   ├── routes/api.php              # Definisi Endpoint API
│   └── tests/                      # Automated Feature & Unit Tests
│
├── frontend/                 # Client SPA React 19 + TypeScript
│   ├── src/
│   │   ├── components/             # Reusable UI & Shadcn Components
│   │   ├── features/               # Modul Fitur (auth, users, roles, audit)
│   │   ├── hooks/                  # Custom React Hooks
│   │   ├── lib/                    # Axios Client, Utility Functions
│   │   ├── routes/                 # TanStack Router File Routes
│   │   ├── services/               # API Communication Layer
│   │   ├── stores/                 # Zustand Stores
│   │   └── types/                  # TypeScript Type Definitions
│   └── vite.config.ts              # Konfigurasi Vite & Build
│
├── .gitignore                # Aturan Git Monorepo
└── README.md                 # Dokumentasi Sistem
```

---

## 🛠️ Panduan Instalasi & Menjalankan Sistem

### 1. Prasyarat
- PHP >= 8.2 (ekstensi: `pdo_pgsql`, `mbstring`, `openssl`, `gd`, `fileinfo`)
- Composer >= 2.x
- Node.js >= 20.x
- **pnpm** >= 9.x (`npm install -g pnpm`)
- PostgreSQL >= 16

### 2. Konfigurasi Backend (Laravel)
```bash
cd backend
composer install
cp .env.example .env
php artisan key:generate
```
Sesuaikan konfigurasi koneksi database PostgreSQL di `backend/.env`:
```env
DB_CONNECTION=pgsql
DB_HOST=127.0.0.1
DB_PORT=5432
DB_DATABASE=pemda
DB_USERNAME=postgres
DB_PASSWORD=your_password
```
Jalankan migrasi dan seeder:
```bash
php artisan migrate --seed
php artisan test
php artisan serve
```

### 3. Konfigurasi Frontend (React + Vite)
```bash
cd frontend
pnpm install
cp .env.example .env
pnpm build
pnpm dev
```

Akses portal pada peramban web: `http://localhost:5173`.

---

## 🔒 Kebijakan Keamanan (*Security Policy*)
- Jangan pernah mengunggah file `.env` atau berkas kredensial privat ke dalam repositori.
- Seluruh endpoint API diproteksi dengan otorisasi berbasis izin (*permission checks*) pada lapisan controller.
- Token autentikasi dan token aktivasi selalu diproses dengan pengacakan kriptografis yang aman.
