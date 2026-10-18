<?php

declare(strict_types=1);

namespace Database\Seeders;

use Illuminate\Database\Seeder;

class SasaranPenilaianSeeder extends Seeder
{
    /**
     * Run the database seeds for Sasaran Renstra OPD (Fitur 15).
     * Terintegrasi langsung dengan pohon kinerja lengkap: Tujuan, Sasaran & Indikator.
     */
    public function run(): void
    {
        $this->call(TujuanSasaranIndikatorSeeder::class);
    }
}
