<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Models\Opd;
use App\Models\Perencanaan\PeriodePenilaian;
use App\Models\Perencanaan\SasaranPenilaian;
use App\Models\Perencanaan\TujuanPenilaian;
use App\Models\User;
use Illuminate\Database\Seeder;

class SasaranPenilaianSeeder extends Seeder
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
                'tujuan_kode' => 'TUJ-01',
                'sasarans' => [
                    [
                        'kode_sasaran' => 'SAS-01',
                        'sasaran' => 'Meningkatnya pelayanan infrastruktur jalan Kabupaten terhadap pusat - pusat kegiatan untuk mendukung peningkatan konektivitas dan aksesibilitas jalur logistik perekonomian daerah',
                        'urutan' => 1,
                        'keterangan' => 'Renstra DPUTR 2026-2030 (Sumber: Rancangan 1 Developer.xlsx)',
                    ],
                    [
                        'kode_sasaran' => 'SAS-02',
                        'sasaran' => 'Meningkatnya layanan infrastruktur irigasi dalam menunjang ketahanan pangan',
                        'urutan' => 2,
                        'keterangan' => 'Renstra DPUTR 2026-2030 (Sumber: Rancangan 1 Developer.xlsx)',
                    ],
                    [
                        'kode_sasaran' => 'SAS-03',
                        'sasaran' => 'Meningkatnya kompetensi tenaga kerja konstruksi dan pengawasan penyelenggaraan jasa konstruksi',
                        'urutan' => 3,
                        'keterangan' => 'Renstra DPUTR 2026-2030 (Sumber: Rancangan 1 Developer.xlsx)',
                    ],
                    [
                        'kode_sasaran' => 'SAS-04',
                        'sasaran' => 'Meningkatnya optimalisasi penyelenggaraan penataan ruang dalam mewujudkan ruang yang aman, nyaman, produktif dan berkelanjutan',
                        'urutan' => 4,
                        'keterangan' => 'Renstra DPUTR 2026-2030 (Sumber: Rancangan 1 Developer.xlsx)',
                    ],
                ],
            ],
            'Diskominfo' => [
                'tujuan_kode' => 'TUJ-01',
                'sasarans' => [
                    [
                        'kode_sasaran' => 'SAS-01',
                        'sasaran' => 'Meningkatnya indeks Sistem Pemerintahan Berbasis Elektronik (SPBE) daerah',
                        'urutan' => 1,
                        'keterangan' => 'Renstra Diskominfo 2026-2030 Pilar SPBE Terpadu',
                    ],
                    [
                        'kode_sasaran' => 'SAS-02',
                        'sasaran' => 'Terwujudnya ketahanan dan keamanan informasi perangkat daerah dari insiden siber',
                        'urutan' => 2,
                        'keterangan' => 'Renstra Diskominfo 2026-2030 Layanan CSIRT Daerah',
                    ],
                ],
            ],
            'Inspektorat' => [
                'tujuan_kode' => 'TUJ-01',
                'sasarans' => [
                    [
                        'kode_sasaran' => 'SAS-01',
                        'sasaran' => 'Meningkatnya maturitas Sistem Pengendalian Intern Pemerintah (SPIP) terintegrasi',
                        'urutan' => 1,
                        'keterangan' => 'Renstra Inspektorat 2026-2030 Sasaran SPIP Terintegrasi',
                    ],
                    [
                        'kode_sasaran' => 'SAS-02',
                        'sasaran' => 'Meningkatnya persentase tindak lanjut hasil pemeriksaan BPK dan APIP secara tuntas',
                        'urutan' => 2,
                        'keterangan' => 'Renstra Inspektorat 2026-2030 Sasaran Tindak Lanjut TLHP',
                    ],
                ],
            ],
            'Bapperida' => [
                'tujuan_kode' => 'TUJ-01',
                'sasarans' => [
                    [
                        'kode_sasaran' => 'SAS-01',
                        'sasaran' => 'Meningkatnya konsistensi dokumen RKPD terhadap RPJMD serta Renja terhadap Renstra',
                        'urutan' => 1,
                        'keterangan' => 'Renstra Bapperida 2026-2030 Konsistensi Perencanaan',
                    ],
                ],
            ],
        ];

        foreach ($dataset as $opdKode => $data) {
            $opd = $opds->get($opdKode);
            if (!$opd) {
                $opd = Opd::where('kode', 'ilike', $opdKode)->orWhere('nama', 'ilike', "%{$opdKode}%")->first();
            }

            if (!$opd) {
                continue;
            }

            $tujuan = TujuanPenilaian::where('periode_penilaian_id', $activePeriode->id)
                ->where('opd_id', $opd->id)
                ->where('kode_tujuan', $data['tujuan_kode'])
                ->first();

            if (!$tujuan) {
                continue;
            }

            foreach ($data['sasarans'] as $sas) {
                SasaranPenilaian::updateOrCreate(
                    [
                        'periode_penilaian_id' => $activePeriode->id,
                        'tujuan_penilaian_id' => $tujuan->id,
                        'opd_id' => $opd->id,
                        'kode_sasaran' => $sas['kode_sasaran'],
                    ],
                    [
                        'sasaran' => $sas['sasaran'],
                        'urutan' => $sas['urutan'],
                        'keterangan' => $sas['keterangan'],
                        'created_by' => $adminId,
                    ]
                );
            }
        }
    }
}
