<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Models\Master\MasterSumberData;
use App\Models\Opd;
use App\Models\Perencanaan\PeriodePenilaian;
use App\Models\Risiko\KonteksOperasional;
use App\Models\Risiko\KonteksOperasionalIndikator;
use App\Models\Risiko\KonteksOperasionalItem;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\File;

class KonteksOperasionalSeeder extends Seeder
{
    /**
     * Run the database seeds for Form 2C Konteks Operasional (Fitur 26).
     */
    public function run(): void
    {
        $activePeriode = PeriodePenilaian::where('status', 'aktif')->first();
        if (!$activePeriode) {
            return;
        }

        $sumberData = MasterSumberData::where('nama', 'Renstra SKPD')->first();
        $adminUser = User::where('email', 'admin@pemda.go.id')->first();
        $adminId = $adminUser?->id;

        $configs = [
            [
                'opd_kode' => 'DPUTR',
                'json_file' => 'konteks_operasional_dputr.json',
                'nama_kepala' => 'ERI RIHANDIAR, S.T., M.T.',
                'nip_kepala' => '19680801 199703 1 005',
                'jabatan_kepala' => 'Kepala Dinas Pekerjaan Umum dan Tata Ruang',
                'tanggal_penetapan' => '2027-01-15',
                'status' => 'final',
            ],
            [
                'opd_kode' => 'Diskominfo',
                'json_file' => 'konteks_operasional_diskominfo.json',
                'nama_kepala' => 'Dr. H. Cecep Dicky Haryadi, S.H., M.H.',
                'nip_kepala' => '19720415 199803 1 004',
                'jabatan_kepala' => 'Kepala Dinas Komunikasi, Informatika dan Persandian',
                'tanggal_penetapan' => '2027-01-20',
                'status' => 'final',
            ],
        ];

        foreach ($configs as $cfg) {
            $opd = Opd::where('kode', $cfg['opd_kode'])
                ->orWhere('nama', 'like', "%{$cfg['opd_kode']}%")
                ->first();

            if (!$opd) {
                continue;
            }

            $jsonPath = __DIR__ . '/' . $cfg['json_file'];
            if (!File::exists($jsonPath)) {
                continue;
            }

            $itemsData = json_decode(File::get($jsonPath), true);
            if (!is_array($itemsData)) {
                continue;
            }

            $this->seedOpdKonteks($opd, $activePeriode, $sumberData, $cfg, $itemsData, $adminId);
        }
    }

    /**
     * Seed operational context tree hierarchy for a specific OPD.
     */
    private function seedOpdKonteks(
        Opd $opd,
        PeriodePenilaian $activePeriode,
        ?MasterSumberData $sumberData,
        array $cfg,
        array $itemsData,
        ?string $adminId
    ): void {
        DB::transaction(function () use ($opd, $activePeriode, $sumberData, $cfg, $itemsData, $adminId) {
            $konteks = KonteksOperasional::updateOrCreate(
                [
                    'periode_penilaian_id' => $activePeriode->id,
                    'opd_id' => $opd->id,
                ],
                [
                    'sumber_data_id' => $sumberData?->id,
                    'nama_pemda' => 'Pemerintah Kabupaten Cianjur',
                    'informasi_lain' => '-',
                    'nama_kepala' => $cfg['nama_kepala'],
                    'nip_kepala' => $cfg['nip_kepala'],
                    'jabatan_kepala' => $cfg['jabatan_kepala'],
                    'tanggal_penetapan' => $cfg['tanggal_penetapan'],
                    'status' => $cfg['status'],
                    'created_by' => $adminId,
                    'updated_by' => $adminId,
                ]
            );

            // Clean up existing items to avoid duplicates
            $konteks->items()->delete();

            $codeMap = [];

            // 1. Seed Programs (Level 1)
            $uProg = 1;
            foreach ($itemsData as $item) {
                if ($item['jenis'] === 'program') {
                    $created = KonteksOperasionalItem::create([
                        'konteks_operasional_id' => $konteks->id,
                        'parent_id' => null,
                        'jenis' => 'program',
                        'kode' => $item['kode'],
                        'nama' => $item['nama'],
                        'urutan' => $uProg++,
                    ]);
                    $codeMap[$item['kode']] = $created->id;
                    $this->seedIndikators($created->id, $item['indikators'] ?? []);
                }
            }

            // 2. Seed Kegiatans (Level 2)
            $uKeg = 1;
            foreach ($itemsData as $item) {
                if ($item['jenis'] === 'kegiatan') {
                    $parentId = $item['parent_kode'] && isset($codeMap[$item['parent_kode']])
                        ? $codeMap[$item['parent_kode']]
                        : null;

                    $created = KonteksOperasionalItem::create([
                        'konteks_operasional_id' => $konteks->id,
                        'parent_id' => $parentId,
                        'jenis' => 'kegiatan',
                        'kode' => $item['kode'],
                        'nama' => $item['nama'],
                        'urutan' => $uKeg++,
                    ]);
                    $codeMap[$item['kode']] = $created->id;
                    $this->seedIndikators($created->id, $item['indikators'] ?? []);
                }
            }

            // 3. Seed Sub-Kegiatans (Level 3)
            $uSub = 1;
            foreach ($itemsData as $item) {
                if ($item['jenis'] === 'sub_kegiatan') {
                    $parentId = $item['parent_kode'] && isset($codeMap[$item['parent_kode']])
                        ? $codeMap[$item['parent_kode']]
                        : null;

                    $created = KonteksOperasionalItem::create([
                        'konteks_operasional_id' => $konteks->id,
                        'parent_id' => $parentId,
                        'jenis' => 'sub_kegiatan',
                        'kode' => $item['kode'],
                        'nama' => $item['nama'],
                        'urutan' => $uSub++,
                    ]);
                    $this->seedIndikators($created->id, $item['indikators'] ?? []);
                }
            }
        });
    }

    /**
     * Seed performance indicators for an operational item.
     */
    private function seedIndikators(string $itemId, array $indikators): void
    {
        $u = 1;
        foreach ($indikators as $ind) {
            KonteksOperasionalIndikator::create([
                'item_id' => $itemId,
                'indikator' => $ind['indikator'],
                'target' => (string) ($ind['target'] ?? '0'),
                'urutan' => $u++,
            ]);
        }
    }
}
