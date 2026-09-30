<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Models\Master\MasterJenisFraud;
use App\Models\Master\MasterKategoriRisiko;
use App\Models\Master\MasterKriteriaDampak;
use App\Models\Master\MasterPemilikRisiko;
use App\Models\Master\MasterPenyebabRisiko;
use App\Models\Master\MasterSubUnsurSpip;
use App\Models\Master\MasterSumberData;
use App\Models\Master\MasterTingkatRisiko;
use App\Models\Master\MasterUnsurSpip;
use App\Models\Master\MasterUrusanPemerintahan;
use App\Models\Opd;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\File;

class MasterDataSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $jsonPath = __DIR__ . '/master_excel_data.json';
        if (!File::exists($jsonPath)) {
            return;
        }

        $data = json_decode(File::get($jsonPath), true);

        // 1. Pemilik Risiko (Sheet 1)
        if (isset($data['1']['rows'])) {
            foreach ($data['1']['rows'] as $idx => $row) {
                MasterPemilikRisiko::updateOrCreate(
                    ['nama' => trim((string) $row['PEMILIK RISIKO'])],
                    ['urutan' => (int) ($row['NO'] ?? $idx + 1), 'is_active' => true]
                );
            }
        }

        // 2. Kategori Risiko (Sheet 2)
        if (isset($data['2']['rows'])) {
            foreach ($data['2']['rows'] as $idx => $row) {
                MasterKategoriRisiko::updateOrCreate(
                    ['kode' => trim((string) $row['KODE'])],
                    [
                        'nama' => trim((string) $row['KATEGORI RISIKO']),
                        'definisi' => !empty($row['DEFINISI']) ? trim((string) $row['DEFINISI']) : null,
                        'urutan' => (int) ($row['NO'] ?? $idx + 1),
                        'is_active' => true,
                    ]
                );
            }
        }

        // 3. Penyebab Risiko (Sheet 3)
        if (isset($data['3']['rows'])) {
            foreach ($data['3']['rows'] as $idx => $row) {
                MasterPenyebabRisiko::updateOrCreate(
                    ['nama' => trim((string) $row['PENYEBAB RISIKO'])],
                    ['urutan' => (int) ($row['NO'] ?? $idx + 1), 'is_active' => true]
                );
            }
        }

        // 4. Tingkat Risiko (Sheet 4)
        if (isset($data['4']['rows'])) {
            foreach ($data['4']['rows'] as $idx => $row) {
                MasterTingkatRisiko::updateOrCreate(
                    ['kode' => trim((string) $row['KODE'])],
                    [
                        'nama' => trim((string) $row['TINGKAT RISIKO']),
                        'urutan' => $idx + 1,
                        'is_active' => true,
                    ]
                );
            }
        }

        // 5. Jenis Fraud (Sheet 5)
        if (isset($data['5']['rows'])) {
            foreach ($data['5']['rows'] as $idx => $row) {
                $name = trim((string) ($row['JENIS FRAUD  '] ?? $row['JENIS FRAUD'] ?? ''));
                if ($name !== '') {
                    MasterJenisFraud::updateOrCreate(
                        ['nama' => $name],
                        ['urutan' => (int) ($row['NO'] ?? $idx + 1), 'is_active' => true]
                    );
                }
            }
        }

        // 6. Kriteria Dampak (Sheet 6)
        if (isset($data['6']['rows'])) {
            foreach ($data['6']['rows'] as $idx => $row) {
                MasterKriteriaDampak::updateOrCreate(
                    ['nama' => trim((string) $row['KRITERIA DAMPAK'])],
                    ['urutan' => (int) ($row['NO'] ?? $idx + 1), 'is_active' => true]
                );
            }
        }

        // 7. Urusan Pemerintahan (Sheet 7)
        if (isset($data['7']['rows'])) {
            foreach ($data['7']['rows'] as $idx => $row) {
                MasterUrusanPemerintahan::updateOrCreate(
                    ['kode' => (string) $row['KODE']],
                    [
                        'nama' => trim((string) $row['URUSAN PEMERINTAH']),
                        'urutan' => (int) ($row['KODE'] ?? $idx + 1),
                        'is_active' => true,
                    ]
                );
            }
        }

        // 8. Unsur & Sub-Unsur SPIP (Sheet 8)
        if (isset($data['8']['rows'])) {
            foreach ($data['8']['rows'] as $idx => $row) {
                $unsur = MasterUnsurSpip::updateOrCreate(
                    ['nama' => trim((string) $row['UNSUR SPIP'])],
                    [
                        'nomor' => (string) ($row['NO'] ?? $idx + 1),
                        'urutan' => (int) ($row['NO'] ?? $idx + 1),
                        'is_active' => true,
                    ]
                );

                if (!empty($row['BAGIAN'])) {
                    $lines = explode("\n", (string) $row['BAGIAN']);
                    foreach ($lines as $subIdx => $line) {
                        $clean = trim(ltrim(trim($line), '-'));
                        if ($clean !== '') {
                            MasterSubUnsurSpip::updateOrCreate(
                                [
                                    'unsur_spip_id' => $unsur->id,
                                    'nama' => $clean,
                                ],
                                [
                                    'urutan' => $subIdx + 1,
                                    'is_active' => true,
                                ]
                            );
                        }
                    }
                }
            }
        }


        // 11. Sumber Data (Sheet 11)
        if (isset($data['11']['rows'])) {
            foreach ($data['11']['rows'] as $idx => $row) {
                MasterSumberData::updateOrCreate(
                    ['nama' => trim((string) $row['SUMBER DATA'])],
                    ['urutan' => (int) ($row['NO'] ?? $idx + 1), 'is_active' => true]
                );
            }
        }
    }
}
