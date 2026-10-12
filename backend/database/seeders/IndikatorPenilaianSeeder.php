<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Models\Opd;
use App\Models\Perencanaan\IndikatorPenilaian;
use App\Models\Perencanaan\PeriodePenilaian;
use App\Models\Perencanaan\SasaranPenilaian;
use App\Models\User;
use Illuminate\Database\Seeder;

class IndikatorPenilaianSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $activePeriode = PeriodePenilaian::where('status', 'aktif')->first();
        if (!$activePeriode) {
            return;
        }

        $admin = User::where('email', 'admin@pemda.go.id')->first();
        $adminId = $admin?->id;

        $opds = Opd::all()->keyBy('kode');

        $dataset = [
            'DPUTR' => [
                'SAS-01' => [
                    [
                        'kode_indikator' => 'IKU-01',
                        'indikator' => 'Persentase aksesibilitas jalan Kabupaten terhadap pusat - pusat kegiatan dalam kondisi mantap (%)',
                        'jenis' => 'IKU',
                        'urutan' => 1,
                        'keterangan' => 'IKU Renstra DPUTR 2026-2030 (Sumber: Rancangan 1 Developer.xlsx)',
                    ],
                ],
                'SAS-02' => [
                    [
                        'kode_indikator' => 'IKU-02',
                        'indikator' => 'Persentase irigasi kabupaten dalam kondisi baik (%)',
                        'jenis' => 'IKU',
                        'urutan' => 2,
                        'keterangan' => 'IKU Renstra Bidang Sumber Daya Air (Sumber: Rancangan 1 Developer.xlsx)',
                    ],
                ],
                'SAS-03' => [
                    [
                        'kode_indikator' => 'IND-01',
                        'indikator' => 'Tingkat pengembangan kompetensi jasa konstruksi (%)',
                        'jenis' => 'Biasa',
                        'urutan' => 3,
                        'keterangan' => 'Indikator Renstra Sasaran Bidang Cipta Karya (Sumber: Rancangan 1 Developer.xlsx)',
                    ],
                ],
                'SAS-04' => [
                    [
                        'kode_indikator' => 'IND-02',
                        'indikator' => 'Persentase kesesuaian pemanfaatan ruang dengan rencana tata ruang (%)',
                        'jenis' => 'Biasa',
                        'urutan' => 4,
                        'keterangan' => 'Indikator Renstra Sasaran Bidang Tata Ruang (Sumber: Rancangan 1 Developer.xlsx)',
                    ],
                ],
            ],
            'Diskominfo' => [
                'SAS-01' => [
                    [
                        'kode_indikator' => 'IKU-01',
                        'indikator' => 'Indeks Sistem Pemerintahan Berbasis Elektronik (SPBE) Daerah',
                        'jenis' => 'IKU',
                        'urutan' => 1,
                        'keterangan' => 'IKU Renstra Diskominfo Pilar Transformasi Digital',
                    ],
                ],
                'SAS-02' => [
                    [
                        'kode_indikator' => 'IND-01',
                        'indikator' => 'Persentase penanganan insiden keamanan siber perangkat daerah secara tuntas (%)',
                        'jenis' => 'Biasa',
                        'urutan' => 2,
                        'keterangan' => 'Indikator Renstra Layanan CSIRT Daerah',
                    ],
                ],
            ],
            'Inspektorat' => [
                'SAS-01' => [
                    [
                        'kode_indikator' => 'IKU-01',
                        'indikator' => 'Tingkat Maturitas Penyelenggaraan SPIP Terintegrasi',
                        'jenis' => 'IKU',
                        'urutan' => 1,
                        'keterangan' => 'IKU Utama Pengawasan Intern Inspektorat Daerah',
                    ],
                ],
                'SAS-02' => [
                    [
                        'kode_indikator' => 'IND-01',
                        'indikator' => 'Persentase tindak lanjut rekomendasi hasil pemeriksaan BPK dan APIP (%)',
                        'jenis' => 'Biasa',
                        'urutan' => 2,
                        'keterangan' => 'Indikator Kinerja Pengawasan Tindak Lanjut TLHP',
                    ],
                ],
            ],
            'Bapperida' => [
                'SAS-01' => [
                    [
                        'kode_indikator' => 'IKU-01',
                        'indikator' => 'Persentase keselarasan program RKPD terhadap dokumen RPJMD (%)',
                        'jenis' => 'IKU',
                        'urutan' => 1,
                        'keterangan' => 'IKU Perencanaan Pembangunan Makro Daerah',
                    ],
                ],
            ],
        ];

        foreach ($dataset as $opdKode => $sasaranMap) {
            $opd = $opds->get($opdKode);
            if (!$opd) {
                $opd = Opd::where('kode', 'ilike', $opdKode)->orWhere('nama', 'ilike', "%{$opdKode}%")->first();
            }

            if (!$opd) {
                continue;
            }

            foreach ($sasaranMap as $sasaranKode => $items) {
                $sasaran = SasaranPenilaian::where('periode_penilaian_id', $activePeriode->id)
                    ->where('opd_id', $opd->id)
                    ->where('kode_sasaran', $sasaranKode)
                    ->first();

                if (!$sasaran) {
                    continue;
                }

                foreach ($items as $item) {
                    IndikatorPenilaian::updateOrCreate(
                        [
                            'periode_penilaian_id' => $activePeriode->id,
                            'sasaran_penilaian_id' => $sasaran->id,
                            'kode_indikator' => $item['kode_indikator'],
                        ],
                        [
                            'opd_id' => $opd->id,
                            'tujuan_penilaian_id' => $sasaran->tujuan_penilaian_id,
                            'indikator' => $item['indikator'],
                            'jenis' => $item['jenis'],
                            'urutan' => $item['urutan'],
                            'keterangan' => $item['keterangan'],
                            'created_by' => $adminId,
                        ]
                    );
                }
            }
        }
    }
}
