<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Models\Opd;
use App\Models\Perencanaan\PeriodePenilaian;
use App\Models\Perencanaan\TujuanPenilaian;
use App\Models\User;
use Illuminate\Database\Seeder;

class TujuanPenilaianSeeder extends Seeder
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

        $samples = [
            'DPUTR' => [
                [
                    'kode_tujuan' => 'TUJ-01',
                    'tujuan' => 'Meningkatkan kualitas penyediaan infrastruktur jalan, drainase, dan sumber daya air yang sesuai tata ruang',
                    'urutan' => 1,
                    'keterangan' => 'Renstra Dinas PUPR 2026-2030 Bab IV Sasaran Strategis',
                ],
                [
                    'kode_tujuan' => 'TUJ-02',
                    'tujuan' => 'Meningkatkan aksesibilitas konektivitas jalur logistik ekonomi dan ketahanan pangan daerah',
                    'urutan' => 2,
                    'keterangan' => 'Renstra Dinas PUPR 2026-2030 Prioritas Infrastruktur Daerah',
                ],
            ],
            'Diskominfo' => [
                [
                    'kode_tujuan' => 'TUJ-01',
                    'tujuan' => 'Mewujudkan tata kelola SPBE dan keamanan informasi pemerintahan daerah yang andal dan terintegrasi',
                    'urutan' => 1,
                    'keterangan' => 'Renstra Diskominfo 2026-2030 Pilar Transformasi Digital',
                ],
                [
                    'kode_tujuan' => 'TUJ-02',
                    'tujuan' => 'Meningkatkan kualitas keterbukaan informasi publik dan literasi digital masyarakat',
                    'urutan' => 2,
                    'keterangan' => 'Renstra Diskominfo 2026-2030 Layanan Informasi Publik',
                ],
            ],
            'Inspektorat' => [
                [
                    'kode_tujuan' => 'TUJ-01',
                    'tujuan' => 'Meningkatkan efektivitas pengawasan intern dan kapabilitas APIP menuju tata kelola pemerintahan yang bersih dan bebas korupsi',
                    'urutan' => 1,
                    'keterangan' => 'Renstra Inspektorat Daerah 2026-2030 Penguatan Pengawasan Intern',
                ],
            ],
            'Bapperida' => [
                [
                    'kode_tujuan' => 'TUJ-01',
                    'tujuan' => 'Meningkatkan sinkronisasi perencanaan pembangunan dan evaluasi kinerja makro daerah yang berbasis bukti',
                    'urutan' => 1,
                    'keterangan' => 'Renstra Bapperida 2026-2030 Perencanaan Berkelanjutan',
                ],
            ],
        ];

        foreach ($samples as $opdKode => $items) {
            $opd = $opds->get($opdKode);
            if (!$opd) {
                // Try case-insensitive search
                $opd = Opd::where('kode', 'ilike', $opdKode)->orWhere('nama', 'ilike', "%{$opdKode}%")->first();
            }

            if ($opd) {
                foreach ($items as $item) {
                    TujuanPenilaian::updateOrCreate(
                        [
                            'periode_penilaian_id' => $activePeriode->id,
                            'opd_id' => $opd->id,
                            'kode_tujuan' => $item['kode_tujuan'],
                        ],
                        [
                            'tujuan' => $item['tujuan'],
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
