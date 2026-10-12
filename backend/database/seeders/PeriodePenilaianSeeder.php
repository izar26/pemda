<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Models\Perencanaan\PeriodePenilaian;
use App\Models\User;
use Illuminate\Database\Seeder;

class PeriodePenilaianSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $admin = User::where('email', 'admin@pemda.go.id')->first();

        // 1. Current Active Cycle: RPJMD 2026 - 2030, Tahun Berjalan 2028
        PeriodePenilaian::updateOrCreate(
            [
                'tahun_mulai' => 2026,
                'tahun_akhir' => 2030,
            ],
            [
                'nama_periode' => 'RPJMD 2026 - 2030',
                'tahun_penilaian' => 2028,
                'tanggal_mulai' => '2028-01-02',
                'tanggal_akhir' => '2028-12-30',
                'status' => 'aktif',
                'keterangan' => 'Siklus RPJMD berjalan 2026-2030 Pemerintah Kabupaten Cianjur.',
                'created_by' => $admin?->id,
            ]
        );

        // 2. Past Archived Cycle: RPJMD 2021 - 2025 (Otomatis Arsip)
        PeriodePenilaian::updateOrCreate(
            [
                'tahun_mulai' => 2021,
                'tahun_akhir' => 2025,
            ],
            [
                'nama_periode' => 'RPJMD 2021 - 2025',
                'tahun_penilaian' => 2025,
                'tanggal_mulai' => '2025-01-02',
                'tanggal_akhir' => '2025-12-31',
                'status' => 'arsip',
                'keterangan' => 'Arsip penilaian risiko periode RPJMD sebelumnya.',
                'created_by' => $admin?->id,
            ]
        );
    }
}
