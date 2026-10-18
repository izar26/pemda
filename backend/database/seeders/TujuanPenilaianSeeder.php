<?php

declare(strict_types=1);

namespace Database\Seeders;

use Illuminate\Database\Seeder;

class TujuanPenilaianSeeder extends Seeder
{
    /**
     * Run the database seeds for Tujuan Renstra OPD (Fitur 14).
     * Terintegrasi langsung dengan pohon kinerja lengkap: Tujuan, Sasaran & Indikator.
     */
    public function run(): void
    {
        $this->call(TujuanSasaranIndikatorSeeder::class);
    }
}
