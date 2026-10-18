<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Models\Master\MasterSumberData;
use App\Models\Opd;
use App\Models\Perencanaan\IndikatorPenilaian;
use App\Models\Perencanaan\PeriodePenilaian;
use App\Models\Perencanaan\SasaranPenilaian;
use App\Models\Perencanaan\TujuanPenilaian;
use App\Models\User;
use Illuminate\Database\Seeder;

class TujuanSasaranIndikatorSeeder extends Seeder
{
    /**
     * Run database seeds for cascading Pohon Kinerja: Tujuan, Sasaran & Indikator Renstra OPD (Fitur 14-17).
     *
     * Struktur hierarki 3 level utuh:
     * Level 1: Tujuan Renstra OPD (Fitur 14)
     * Level 2: Sasaran Strategis OPD (Fitur 15)
     * Level 3: IKU & Indikator Kinerja Renstra OPD (Fitur 16 & 17)
     */
    public function run(): void
    {
        $activePeriode = PeriodePenilaian::where('status', 'aktif')->first();
        if (!$activePeriode) {
            return;
        }

        $admin = User::where('email', 'admin@pemda.go.id')->first();
        $adminId = $admin?->id;

        $sumberData = MasterSumberData::where('nama', 'Renstra SKPD')->first();
        $sumberDataId = $sumberData?->id;

        $opds = Opd::all()->keyBy('kode');

        $dataset = [
            'DPUTR' => [
                [
                    'kode_tujuan' => 'TUJ-01',
                    'tujuan' => 'Meningkatkan kualitas penyediaan infrastruktur jalan, drainase, dan sumber daya air yang sesuai tata ruang',
                    'urutan' => 1,
                    'keterangan' => 'Renstra Dinas PUPR 2026-2030 Bab IV Sasaran Strategis',
                    'sasarans' => [
                        [
                            'kode_sasaran' => 'SAS-01',
                            'sasaran' => 'Meningkatnya pelayanan infrastruktur jalan Kabupaten terhadap pusat - pusat kegiatan untuk mendukung peningkatan konektivitas dan aksesibilitas jalur logistik perekonomian daerah',
                            'urutan' => 1,
                            'keterangan' => 'Renstra DPUTR 2026-2030 (Sumber: Rancangan 1 Developer.xlsx)',
                            'indikators' => [
                                [
                                    'kode_indikator' => 'IKU-01',
                                    'indikator' => 'Persentase aksesibilitas jalan Kabupaten terhadap pusat - pusat kegiatan dalam kondisi mantap (%)',
                                    'jenis' => 'IKU',
                                    'urutan' => 1,
                                    'keterangan' => 'IKU Renstra DPUTR 2026-2030 (Sumber: Rancangan 1 Developer.xlsx)',
                                ],
                            ],
                        ],
                        [
                            'kode_sasaran' => 'SAS-02',
                            'sasaran' => 'Meningkatnya layanan infrastruktur irigasi dalam menunjang ketahanan pangan',
                            'urutan' => 2,
                            'keterangan' => 'Renstra DPUTR 2026-2030 (Sumber: Rancangan 1 Developer.xlsx)',
                            'indikators' => [
                                [
                                    'kode_indikator' => 'IKU-02',
                                    'indikator' => 'Persentase irigasi kabupaten dalam kondisi baik (%)',
                                    'jenis' => 'IKU',
                                    'urutan' => 2,
                                    'keterangan' => 'IKU Renstra Bidang Sumber Daya Air (Sumber: Rancangan 1 Developer.xlsx)',
                                ],
                            ],
                        ],
                        [
                            'kode_sasaran' => 'SAS-03',
                            'sasaran' => 'Meningkatnya kompetensi tenaga kerja konstruksi dan pengawasan penyelenggaraan jasa konstruksi',
                            'urutan' => 3,
                            'keterangan' => 'Renstra DPUTR 2026-2030 (Sumber: Rancangan 1 Developer.xlsx)',
                            'indikators' => [
                                [
                                    'kode_indikator' => 'IND-01',
                                    'indikator' => 'Tingkat pengembangan kompetensi jasa konstruksi (%)',
                                    'jenis' => 'Biasa',
                                    'urutan' => 3,
                                    'keterangan' => 'Indikator Renstra Sasaran Bidang Cipta Karya (Sumber: Rancangan 1 Developer.xlsx)',
                                ],
                            ],
                        ],
                        [
                            'kode_sasaran' => 'SAS-04',
                            'sasaran' => 'Meningkatnya optimalisasi penyelenggaraan penataan ruang dalam mewujudkan ruang yang aman, nyaman, produktif dan berkelanjutan',
                            'urutan' => 4,
                            'keterangan' => 'Renstra DPUTR 2026-2030 (Sumber: Rancangan 1 Developer.xlsx)',
                            'indikators' => [
                                [
                                    'kode_indikator' => 'IND-02',
                                    'indikator' => 'Persentase kesesuaian pemanfaatan ruang dengan rencana tata ruang (%)',
                                    'jenis' => 'Biasa',
                                    'urutan' => 4,
                                    'keterangan' => 'Indikator Renstra Sasaran Bidang Tata Ruang (Sumber: Rancangan 1 Developer.xlsx)',
                                ],
                            ],
                        ],
                    ],
                ],
                [
                    'kode_tujuan' => 'TUJ-02',
                    'tujuan' => 'Meningkatkan aksesibilitas konektivitas jalur logistik ekonomi dan ketahanan pangan daerah',
                    'urutan' => 2,
                    'keterangan' => 'Renstra Dinas PUPR 2026-2030 Prioritas Infrastruktur Daerah',
                    'sasarans' => [
                        [
                            'kode_sasaran' => 'SAS-05',
                            'sasaran' => 'Meningkatnya konektivitas jalan strategis penghubung sentra produksi pangan dan kawasan agropolitan',
                            'urutan' => 1,
                            'keterangan' => 'Renstra DPUTR 2026-2030 Bidang Bina Marga Sentra Produksi',
                            'indikators' => [
                                [
                                    'kode_indikator' => 'IKU-03',
                                    'indikator' => 'Persentase kemantapan jalan penghubung sentra pangan dan logistik daerah (%)',
                                    'jenis' => 'IKU',
                                    'urutan' => 1,
                                    'keterangan' => 'IKU Konektivitas Sentra Logistik Pertanian & Pangan',
                                ],
                            ],
                        ],
                        [
                            'kode_sasaran' => 'SAS-06',
                            'sasaran' => 'Meningkatnya kapasitas tampung dan keandalan jaringan drainase utama pengendali banjir kawasan sentra ekonomi',
                            'urutan' => 2,
                            'keterangan' => 'Renstra DPUTR 2026-2030 Bidang Sumber Daya Air & Drainase',
                            'indikators' => [
                                [
                                    'kode_indikator' => 'IND-03',
                                    'indikator' => 'Persentase pengurangan luasan titik genangan/banjir pada sentra produksi pangan dan jalan logistik (%)',
                                    'jenis' => 'Biasa',
                                    'urutan' => 2,
                                    'keterangan' => 'Indikator Drainase dan Mitigasi Genangan Sentra Perekonomian',
                                ],
                            ],
                        ],
                    ],
                ],
            ],
            'Diskominfo' => [
                [
                    'kode_tujuan' => 'TUJ-01',
                    'tujuan' => 'Mewujudkan tata kelola SPBE dan keamanan informasi pemerintahan daerah yang andal dan terintegrasi',
                    'urutan' => 1,
                    'keterangan' => 'Renstra Diskominfo 2026-2030 Pilar Transformasi Digital',
                    'sasarans' => [
                        [
                            'kode_sasaran' => 'SAS-01',
                            'sasaran' => 'Meningkatnya indeks Sistem Pemerintahan Berbasis Elektronik (SPBE) daerah',
                            'urutan' => 1,
                            'keterangan' => 'Renstra Diskominfo 2026-2030 Pilar SPBE Terpadu',
                            'indikators' => [
                                [
                                    'kode_indikator' => 'IKU-01',
                                    'indikator' => 'Indeks Sistem Pemerintahan Berbasis Elektronik (SPBE) Daerah',
                                    'jenis' => 'IKU',
                                    'urutan' => 1,
                                    'keterangan' => 'IKU Renstra Diskominfo Pilar Transformasi Digital',
                                ],
                            ],
                        ],
                        [
                            'kode_sasaran' => 'SAS-02',
                            'sasaran' => 'Terwujudnya ketahanan dan keamanan informasi perangkat daerah dari insiden siber',
                            'urutan' => 2,
                            'keterangan' => 'Renstra Diskominfo 2026-2030 Layanan CSIRT Daerah',
                            'indikators' => [
                                [
                                    'kode_indikator' => 'IKU-02',
                                    'indikator' => 'Indeks Keamanan Informasi Pemerintahan Daerah (Skor KAMI)',
                                    'jenis' => 'IKU',
                                    'urutan' => 2,
                                    'keterangan' => 'IKU Renstra Layanan CSIRT Daerah',
                                ],
                            ],
                        ],
                    ],
                ],
                [
                    'kode_tujuan' => 'TUJ-02',
                    'tujuan' => 'Meningkatkan kualitas keterbukaan informasi publik dan literasi digital masyarakat',
                    'urutan' => 2,
                    'keterangan' => 'Renstra Diskominfo 2026-2030 Layanan Informasi Publik',
                    'sasarans' => [
                        [
                            'kode_sasaran' => 'SAS-03',
                            'sasaran' => 'Meningkatnya kualitas pelayanan informasi publik dan pengelolaan aduan masyarakat',
                            'urutan' => 1,
                            'keterangan' => 'Renstra Diskominfo 2026-2030 Keterbukaan Informasi Publik',
                            'indikators' => [
                                [
                                    'kode_indikator' => 'IND-01',
                                    'indikator' => 'Indeks Keterbukaan Informasi Publik (KIP) Daerah',
                                    'jenis' => 'Biasa',
                                    'urutan' => 1,
                                    'keterangan' => 'Indikator Keterbukaan dan Layanan Informasi PPID',
                                ],
                            ],
                        ],
                        [
                            'kode_sasaran' => 'SAS-04',
                            'sasaran' => 'Meningkatnya literasi digital dan pemanfaatan kanal komunikasi publik terintegrasi',
                            'urutan' => 2,
                            'keterangan' => 'Renstra Diskominfo 2026-2030 Kanal Aspirasi Publik',
                            'indikators' => [
                                [
                                    'kode_indikator' => 'IND-02',
                                    'indikator' => 'Tingkat kepuasan masyarakat terhadap layanan keterbukaan informasi dan kanal aduan publik (%)',
                                    'jenis' => 'Biasa',
                                    'urutan' => 2,
                                    'keterangan' => 'Indikator Kepuasan Pengaduan Publik SP4N LAPOR',
                                ],
                            ],
                        ],
                    ],
                ],
            ],
            'Dinkes' => [
                [
                    'kode_tujuan' => 'TUJ-01',
                    'tujuan' => 'Meningkatkan derajat kesehatan masyarakat melalui penguatan pelayanan kesehatan primer, rujukan, dan pencegahan penyakit',
                    'urutan' => 1,
                    'keterangan' => 'Renstra Dinas Kesehatan 2026-2030 Bab IV Tujuan Strategis Kesehatan',
                    'sasarans' => [
                        [
                            'kode_sasaran' => 'SAS-01',
                            'sasaran' => 'Meningkatnya akses dan mutu pelayanan kesehatan dasar (Puskesmas) dan rujukan yang terakreditasi',
                            'urutan' => 1,
                            'keterangan' => 'Renstra Dinkes 2026-2030 Penguatan Layanan Kesehatan',
                            'indikators' => [
                                [
                                    'kode_indikator' => 'IKU-01',
                                    'indikator' => 'Persentase Puskesmas terakreditasi Paripurna (%)',
                                    'jenis' => 'IKU',
                                    'urutan' => 1,
                                    'keterangan' => 'IKU Pelayanan Kesehatan Dasar Berkualitas',
                                ],
                            ],
                        ],
                        [
                            'kode_sasaran' => 'SAS-02',
                            'sasaran' => 'Meningkatnya cakupan kepesertaan jaminan kesehatan masyarakat menuju Universal Health Coverage (UHC)',
                            'urutan' => 2,
                            'keterangan' => 'Renstra Dinkes 2026-2030 Jaminan Kesehatan Daerah',
                            'indikators' => [
                                [
                                    'kode_indikator' => 'IKU-02',
                                    'indikator' => 'Cakupan Kepesertaan Jaminan Kesehatan Nasional (UHC) (%)',
                                    'jenis' => 'IKU',
                                    'urutan' => 2,
                                    'keterangan' => 'IKU Perlindungan Pembiayaan Kesehatan Masyarakat',
                                ],
                            ],
                        ],
                    ],
                ],
                [
                    'kode_tujuan' => 'TUJ-02',
                    'tujuan' => 'Mempercepat penurunan prevalensi stunting dan peningkatan status gizi ibu dan anak daerah',
                    'urutan' => 2,
                    'keterangan' => 'Renstra Dinas Kesehatan 2026-2030 Prioritas Penanganan Stunting',
                    'sasarans' => [
                        [
                            'kode_sasaran' => 'SAS-03',
                            'sasaran' => 'Menurunnya prevalensi balita stunting melalui intervensi gizi spesifik dan sensitif',
                            'urutan' => 1,
                            'keterangan' => 'Renstra Dinkes 2026-2030 Penurunan Stunting Terintegrasi',
                            'indikators' => [
                                [
                                    'kode_indikator' => 'IKU-03',
                                    'indikator' => 'Prevalensi Stunting pada Balita (%)',
                                    'jenis' => 'IKU',
                                    'urutan' => 1,
                                    'keterangan' => 'IKU Prioritas Penurunan Stunting Nasional/Daerah',
                                ],
                            ],
                        ],
                        [
                            'kode_sasaran' => 'SAS-04',
                            'sasaran' => 'Meningkatnya cakupan pelayanan kesehatan ibu hamil, bersalin, dan balita terstandar',
                            'urutan' => 2,
                            'keterangan' => 'Renstra Dinkes 2026-2030 Kesehatan Ibu dan Anak',
                            'indikators' => [
                                [
                                    'kode_indikator' => 'IND-01',
                                    'indikator' => 'Persentase ibu hamil mendapatkan pelayanan antenatal terstandar (K6) (%)',
                                    'jenis' => 'Biasa',
                                    'urutan' => 2,
                                    'keterangan' => 'Indikator Antenatal Care Terstandar KIA Dinkes',
                                ],
                            ],
                        ],
                    ],
                ],
            ],
            'Disdik' => [
                [
                    'kode_tujuan' => 'TUJ-01',
                    'tujuan' => 'Meningkatkan perluasan akses dan mutu layanan pendidikan yang merata, inklusif, dan berkarakter',
                    'urutan' => 1,
                    'keterangan' => 'Renstra Disdikpora 2026-2030 Layanan Pendidikan Berkualitas',
                    'sasarans' => [
                        [
                            'kode_sasaran' => 'SAS-01',
                            'sasaran' => 'Meningkatnya angka partisipasi sekolah jenjang PAUD, SD, dan SMP',
                            'urutan' => 1,
                            'keterangan' => 'Renstra Disdikpora 2026-2030 Pemerataan Partisipasi Sekolah',
                            'indikators' => [
                                [
                                    'kode_indikator' => 'IKU-01',
                                    'indikator' => 'Angka Partisipasi Murni (APM) Jenjang SMP/Sederajat (%)',
                                    'jenis' => 'IKU',
                                    'urutan' => 1,
                                    'keterangan' => 'IKU Perluasan Akses Wajib Belajar',
                                ],
                            ],
                        ],
                        [
                            'kode_sasaran' => 'SAS-02',
                            'sasaran' => 'Meningkatnya persentase ruang kelas dan fasilitas sarpras satuan pendidikan dalam kondisi layak',
                            'urutan' => 2,
                            'keterangan' => 'Renstra Disdikpora 2026-2030 Sarana Prasarana Sekolah',
                            'indikators' => [
                                [
                                    'kode_indikator' => 'IND-01',
                                    'indikator' => 'Persentase ruang kelas SD dan SMP dalam kondisi baik/layak (%)',
                                    'jenis' => 'Biasa',
                                    'urutan' => 2,
                                    'keterangan' => 'Indikator Sarana Prasarana Satuan Pendidikan',
                                ],
                            ],
                        ],
                        [
                            'kode_sasaran' => 'SAS-03',
                            'sasaran' => 'Meningkatnya proporsi pendidik dan tenaga kependidikan yang tersertifikasi dan kompeten',
                            'urutan' => 3,
                            'keterangan' => 'Renstra Disdikpora 2026-2030 Kualifikasi Pendidik',
                            'indikators' => [
                                [
                                    'kode_indikator' => 'IND-02',
                                    'indikator' => 'Persentase guru jenjang pendidikan dasar berkualifikasi S1/D-IV dan bersertifikat pendidik (%)',
                                    'jenis' => 'Biasa',
                                    'urutan' => 3,
                                    'keterangan' => 'Indikator Sertifikasi dan Kompetensi Guru Dasar',
                                ],
                            ],
                        ],
                    ],
                ],
            ],
            'Itda' => [
                [
                    'kode_tujuan' => 'TUJ-01',
                    'tujuan' => 'Meningkatkan efektivitas pengawasan intern dan kapabilitas APIP menuju tata kelola pemerintahan yang bersih dan akuntabel',
                    'urutan' => 1,
                    'keterangan' => 'Renstra Inspektorat Daerah 2026-2030 Penguatan Pengawasan Intern',
                    'sasarans' => [
                        [
                            'kode_sasaran' => 'SAS-01',
                            'sasaran' => 'Meningkatnya maturitas Sistem Pengendalian Intern Pemerintah (SPIP) terintegrasi level 3+',
                            'urutan' => 1,
                            'keterangan' => 'Renstra Inspektorat 2026-2030 Sasaran SPIP Terintegrasi',
                            'indikators' => [
                                [
                                    'kode_indikator' => 'IKU-01',
                                    'indikator' => 'Tingkat Maturitas Penyelenggaraan SPIP Terintegrasi (Level)',
                                    'jenis' => 'IKU',
                                    'urutan' => 1,
                                    'keterangan' => 'IKU Utama Pengawasan Intern Inspektorat Daerah',
                                ],
                            ],
                        ],
                        [
                            'kode_sasaran' => 'SAS-02',
                            'sasaran' => 'Meningkatnya persentase penyelesaian tindak lanjut hasil pengawasan BPK dan APIP secara tuntas',
                            'urutan' => 2,
                            'keterangan' => 'Renstra Inspektorat 2026-2030 Sasaran Tindak Lanjut TLHP',
                            'indikators' => [
                                [
                                    'kode_indikator' => 'IND-01',
                                    'indikator' => 'Persentase penyelesaian rekomendasi hasil pemeriksaan BPK dan APIP (%)',
                                    'jenis' => 'Biasa',
                                    'urutan' => 2,
                                    'keterangan' => 'Indikator Kinerja Pengawasan Tindak Lanjut TLHP',
                                ],
                            ],
                        ],
                        [
                            'kode_sasaran' => 'SAS-03',
                            'sasaran' => 'Meningkatnya kapabilitas Aparat Pengawasan Intern Pemerintah (APIP) dan indeks efektivitas pencegahan korupsi',
                            'urutan' => 3,
                            'keterangan' => 'Renstra Inspektorat 2026-2030 Kapabilitas Pengawasan',
                            'indikators' => [
                                [
                                    'kode_indikator' => 'IND-02',
                                    'indikator' => 'Kapabilitas APIP Daerah (Level)',
                                    'jenis' => 'Biasa',
                                    'urutan' => 3,
                                    'keterangan' => 'Indikator Kapabilitas Pengawasan APIP Level 3+',
                                ],
                            ],
                        ],
                    ],
                ],
            ],
            'Bapperida' => [
                [
                    'kode_tujuan' => 'TUJ-01',
                    'tujuan' => 'Meningkatkan sinkronisasi perencanaan pembangunan dan evaluasi kinerja makro daerah yang berbasis bukti',
                    'urutan' => 1,
                    'keterangan' => 'Renstra Bapperida 2026-2030 Perencanaan Berkelanjutan',
                    'sasarans' => [
                        [
                            'kode_sasaran' => 'SAS-01',
                            'sasaran' => 'Meningkatnya konsistensi dokumen RKPD terhadap RPJMD serta Renja terhadap Renstra',
                            'urutan' => 1,
                            'keterangan' => 'Renstra Bapperida 2026-2030 Konsistensi Perencanaan',
                            'indikators' => [
                                [
                                    'kode_indikator' => 'IKU-01',
                                    'indikator' => 'Persentase keselarasan program RKPD terhadap dokumen RPJMD (%)',
                                    'jenis' => 'IKU',
                                    'urutan' => 1,
                                    'keterangan' => 'IKU Perencanaan Pembangunan Makro Daerah',
                                ],
                            ],
                        ],
                        [
                            'kode_sasaran' => 'SAS-02',
                            'sasaran' => 'Meningkatnya ketercapaian target indikator kinerja pembangunan makro daerah',
                            'urutan' => 2,
                            'keterangan' => 'Renstra Bapperida 2026-2030 Evaluasi Kinerja Makro',
                            'indikators' => [
                                [
                                    'kode_indikator' => 'IND-01',
                                    'indikator' => 'Indeks Capaian Kinerja Makro Pembangunan Daerah',
                                    'jenis' => 'Biasa',
                                    'urutan' => 2,
                                    'keterangan' => 'Indikator Evaluasi Pembangunan Makro Daerah',
                                ],
                            ],
                        ],
                        [
                            'kode_sasaran' => 'SAS-03',
                            'sasaran' => 'Meningkatnya kualitas dan ketersediaan data statistik sektoral daerah terintegrasi (Satu Data Daerah)',
                            'urutan' => 3,
                            'keterangan' => 'Renstra Bapperida 2026-2030 Tata Kelola Satu Data Daerah',
                            'indikators' => [
                                [
                                    'kode_indikator' => 'IND-02',
                                    'indikator' => 'Tingkat ketersediaan produsen data daerah yang terintegrasi portal SDI (%)',
                                    'jenis' => 'Biasa',
                                    'urutan' => 3,
                                    'keterangan' => 'Indikator Integrasi SDI dan Statistik Sektoral',
                                ],
                            ],
                        ],
                    ],
                ],
            ],
        ];

        foreach ($dataset as $opdKode => $tujuanItems) {
            $opd = $opds->get($opdKode);
            if (!$opd) {
                $opd = Opd::where('kode', $opdKode)->orWhere('nama', 'like', "%{$opdKode}%")->first();
            }

            if (!$opd) {
                continue;
            }

            foreach ($tujuanItems as $tujuanItem) {
                $tujuan = TujuanPenilaian::updateOrCreate(
                    [
                        'periode_penilaian_id' => $activePeriode->id,
                        'opd_id' => $opd->id,
                        'kode_tujuan' => $tujuanItem['kode_tujuan'],
                    ],
                    [
                        'sumber_data_id' => $sumberDataId,
                        'tujuan' => $tujuanItem['tujuan'],
                        'urutan' => $tujuanItem['urutan'],
                        'keterangan' => $tujuanItem['keterangan'],
                        'created_by' => $adminId,
                    ]
                );

                foreach ($tujuanItem['sasarans'] ?? [] as $sasaranItem) {
                    $sasaran = SasaranPenilaian::updateOrCreate(
                        [
                            'periode_penilaian_id' => $activePeriode->id,
                            'tujuan_penilaian_id' => $tujuan->id,
                            'opd_id' => $opd->id,
                            'kode_sasaran' => $sasaranItem['kode_sasaran'],
                        ],
                        [
                            'sasaran' => $sasaranItem['sasaran'],
                            'urutan' => $sasaranItem['urutan'],
                            'keterangan' => $sasaranItem['keterangan'],
                            'created_by' => $adminId,
                        ]
                    );

                    foreach ($sasaranItem['indikators'] ?? [] as $indikatorItem) {
                        IndikatorPenilaian::updateOrCreate(
                            [
                                'periode_penilaian_id' => $activePeriode->id,
                                'sasaran_penilaian_id' => $sasaran->id,
                                'kode_indikator' => $indikatorItem['kode_indikator'],
                            ],
                            [
                                'opd_id' => $opd->id,
                                'tujuan_penilaian_id' => $tujuan->id,
                                'indikator' => $indikatorItem['indikator'],
                                'jenis' => $indikatorItem['jenis'],
                                'urutan' => $indikatorItem['urutan'],
                                'keterangan' => $indikatorItem['keterangan'],
                                'created_by' => $adminId,
                            ]
                        );
                    }
                }
            }
        }
    }
}
