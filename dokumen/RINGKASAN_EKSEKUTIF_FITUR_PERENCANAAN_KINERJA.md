# LAPORAN EKSEKUTIF: MODUL PERENCANAAN KINERJA & TATA KELOLA RISIKO PEMERINTAH DAERAH

**Dokumen**: Panduan Alur Kerja, Arsitektur Sistem, dan Integrasi Audit Log  
**Tanggal**: 9 Oktober 2026  
**Peruntukan**: Bahan Laporan dan Presentasi Pimpinan / Kepala Perangkat Daerah / Bapperida  

---

## 1. Eksekutif Ringkasan (Executive Summary)

Modul **Perencanaan Kinerja** dibangun sebagai fondasi hulu dalam siklus Sistem Pengendalian Intern Pemerintah (SPIP) dan Manajemen Risiko Pemerintah Daerah, mengacu pada **Pedoman Teknis Penilaian Risiko Pemda (Formulir 2A & 2B)** serta integrasi data perencanaan makro daerah.

Modul ini memfasilitasi integrasi dua arah:
1. **Perencanaan Makro (Bapperida)**: Penetapan tujuan strategis, sasaran makro, dan Indikator Kinerja Utama (IKU) pemerintah daerah.
2. **Perencanaan Operasional (Perangkat Daerah / OPD)**: Penjabaran program, kegiatan, dan sub-kegiatan Renstra SKPD serta penetapan konteks risiko strategis sebelum proses identifikasi risiko unit kerja dimulai.

Seluruh data saling terhubung (*single source of truth*) dan diawasi penuh oleh **Audit Log** secara *real-time*.

---

## 2. Diagram Alur Kerja Sistem (End-to-End Workflow)

Alur kerja perencanaan kinerja berjalan berurutan dari hulu ke hilir:

```
┌────────────────────────────────────────────────────────────────────────┐
│                   TAHAP 1: PERIODE PENILAIAN                           │
│   Pengaturan rentang tahun RPJMD & status aktif (contoh: 2026-2030)    │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│              TAHAP 2: CASCADING KINERJA MAKRO BAPPERIDA                │
│   1. Data Tujuan Strategis Pemda (Level 1 / Fitur 14)                  │
│   2. Data Sasaran Strategis Pemda (Level 2 / Fitur 15)                 │
│   3. Data IKU Pemda (Level 2 / Fitur 16)                               │
│   4. Data Sasaran & Indikator Renstra OPD (Level 3-4 / Fitur 17)       │
│   * Fitur: Duplikasi / Clone Pohon Kinerja antar Periode               │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│               TAHAP 3: RENSTRA SKPD / OPD (FORMULIR 2B)                │
│   Penjabaran teknis anggaran & kinerja per OPD:                        │
│   - Program Renstra                                                    │
│     └── Kegiatan Renstra                                               │
│         └── Sub-Kegiatan Renstra                                       │
│   * Fitur: Sequential Wizard, Impor Excel, Ekspor Excel Hibrida        │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│      TAHAP 4: PENETAPAN KONTEKS RISIKO STRATEGIS OPD (FORMULIR 2A)     │
│   Pengesahan dokumen konteks risiko oleh Kepala OPD & Tanggal Resmi    │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│               PENGAWASAN & TRANSPARANSI: AUDIT LOG                     │
│   Pencatatan riwayat setiap aksi tambah, ubah (diff lama vs baru),     │
│   hapus, clone, impor, dan ekspor data secara otomatis & permanen      │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Rincian Fitur & Fungsionalitas Modul

### A. Tahap 1: Periode Penilaian (`/perencanaan/periode`)
* **Fungsi Utama**:
  * Menjadi jangkar utama (*master anchor*) bagi seluruh modul turunan.
  * Menentukan tahun RPJMD, tahun penilaian berjalan, tanggal mulai, dan batas akhir penilaian.
  * Mengatur status keaktifan (`Aktif`, `Draft`, `Selesai`).
* **Indikator KPI**:
  * Menampilkan 4 kartu ringkasan: Total Periode, Periode Aktif, Durasi Rentang Waktu, dan Catatan Kebijakan.

---

### B. Tahap 2: Cascading Kinerja Makro Daerah (`/perencanaan/cascading`)
* **Fungsi Utama**:
  * Membagi struktur cascading ke dalam **4 Tab Tabel Terpadu** yang rapi, dilengkapi pagination dan pencarian cepat:
    1. **Tab 1 – Data Tujuan Strategis (Level 1 / Fitur No. 14)**: Rumusan visi/misi kepala daerah per sektor urusan OPD.
    2. **Tab 2 – Data Sasaran Strategis (Level 2 / Fitur No. 15)**: Penurunan sasaran terukur dari rumusan tujuan.
    3. **Tab 3 – Data Indikator Kinerja Utama / IKU (Level 2 / Fitur No. 16)**: Tolok ukur keberhasilan sasaran daerah, lengkap dengan target angka dan satuan.
    4. **Tab 4 – Data Sasaran & Indikator Renstra OPD (Level 3–4 / Fitur No. 17)**: Titik temu keselarasan (*alignment*) antara sasaran makro Pemda dengan sasaran teknis OPD.
* **Fitur Andalan**:
  * **Duplikasi / Clone Pohon Kinerja**: Memungkinkan Bapperida menyalin pohon kinerja secara utuh dari periode RPJMD lama ke periode baru tanpa perlu entri ulang secara manual.

---

### C. Tahap 3: Renstra SKPD / Formulir 2B (`/perencanaan/renstra`)
* **Fungsi Utama**:
  * Menampung rincian perencanaan teknis dan operasional OPD berjenjang 3 level:
    $$\text{Program} \longrightarrow \text{Kegiatan} \longrightarrow \text{Sub-Kegiatan}$$
  * Tiap level memuat kode indeks rekening, rumusan nama, indikator kinerja, target, dan satuan.
* **Fitur Andalan**:
  * **Sequential Wizard**: Panduan formulir bertahap untuk menyusun Program, Kegiatan, dan Sub-Kegiatan secara runtut dan terstruktur.
  * **Impor Excel Massal**: Kemudahan impor data massal dari dokumen SIPD/Renstra OPD menggunakan template berstandar.
  * **Ekspor Excel Hibrida**: Kemampuan mencetak laporan matriks resmi Renstra SKPD ke format `.xlsx` menggunakan pemrosesan antrean latar belakang (*background queue*) yang cepat dan stabil.
  * **Dual View**: Fleksibilitas memilih tampilan antara **Kartu Pohon** (*Tree Card View*) atau **Tabel Matriks** (*Table Matrix View*).

---

### D. Tahap 4: Penetapan Konteks Risiko Strategis / Formulir 2A (`/perencanaan/konteks-strategis`)
* **Fungsi Utama**:
  * Mengesahkan Formulir 2A Penetapan Konteks Risiko Strategis Pemda per OPD.
  * Memilih tujuan dan sasaran daerah yang relevan dengan tugas pokok dan fungsi instansi.
  * Mencantumkan pejabat penanggung jawab (Nama Kepala OPD, NIP, Jabatan) dan tanggal penetapan dokumen.

---

## 4. Keunggulan Arsitektur & Antarmuka (UI/UX)

1. **Konsistensi Desain dengan Manajemen Pegawai**:
   * Seluruh layar modul menggunakan standar antarmuka terpadu: Header dengan breadcrumb, subnavigasi terpadu, 4 KPI Stat Cards, toolbar pencarian dan filter cepat, serta tabel berpaginasi.
   * Jendela dialog modal menggunakan arsitektur *pinned header* dan *sticky footer* dengan scroll internal aman (*anti-overflow*).
2. **Komponen Pemilih Cepat (`SearchableSelect`)**:
   * Filter perangkat daerah di seluruh menu menggunakan dropdown pencarian berkecepatan tinggi yang mendukung pengelompokan kategori dinas/badan/kecamatan dan pencarian kata kunci nama/singkatan OPD.

---

## 5. Keamanan, Tata Kelola & Integrasi Audit Log

Seluruh aktivitas pada modul ini telah terintegrasi secara penuh dan otomatis ke dalam **Audit Log** aplikasi di bawah modul **`"Perencanaan Kinerja"`**:

| Kategori Aktivitas | Tipe Event Audit | Informasi yang Direkam |
| :--- | :--- | :--- |
| **Siklus Hidup Data (CRUD)** | `PERIODE_PENILAIAN_*`<br>`TUJUAN_*`<br>`SASARAN_*`<br>`INDIKATOR_SASARAN_*`<br>`RENSTRA_PROGRAM_*`<br>`RENSTRA_KEGIATAN_*`<br>`RENSTRA_SUB_KEGIATAN_*`<br>`KONTEKS_RISIKO_STRATEGIS_*` | Waktu, Pengguna, NIP, OPD, IP Address, serta **perbandingan nilai sebelum dan sesudah perubahan (*diff visual: nilai lama vs nilai baru*)**. |
| **Duplikasi Pohon Kinerja** | `CASCADING_CLONE` | Periode asal, periode tujuan, instansi terkait, dan jumlah total Tujuan, Sasaran, serta Indikator yang disalin. |
| **Impor Dokumen Excel** | `RENSTRA_IMPORT` | Nama file Excel, ukuran file, OPD sasaran, periode, dan total Program, Kegiatan, serta Sub-kegiatan yang berhasil diimpor. |
| **Ekspor Dokumen Excel** | `RENSTRA_EXPORT` | Jejak pengunduhan data Renstra oleh staf/pejabat, nama instansi terkait, dan filter periode. |

---

## 6. Kesimpulan & Nilai Tambah bagi Organisasi

1. **Keselarasan Perencanaan (Strategic Alignment)**: Tidak ada lagi perbedaan antara rumusan indikator yang dibuat di tingkat Bapperida dengan target teknis di tingkat dinas/badan.
2. **Efisiensi Kerja Staf**: Waktu penginputan data dipangkas drastis melalui fitur Impor Excel massal, Sequential Wizard terpandu, dan fasilitas Duplikasi Pohon Kinerja antar periode.
3. **Akuntabilitas & Kesiapan Audit**: Memenuhi standar pengawasan Aparat Pengawasan Intern Pemerintah (APIP) dan BPK, karena setiap angka target dan rumusan kinerja memiliki riwayat jejak rekam digital yang permanen dan tidak dapat dimanipulasi.
