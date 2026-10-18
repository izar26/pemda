<?php

declare(strict_types=1);

namespace Database\Seeders;

use Illuminate\Database\Seeder;

class IndikatorPenilaianSeeder extends Seeder
{
    /**
     * Run the database seeds for IKU & Indikator Renstra OPD (Fitur 16 & 17).
     * Terintegrasi langsung dengan pohon kinerja lengkap: Tujuan, Sasaran & Indikator.
     */
    public function run(): void
    {
        $this->call(TujuanSasaranIndikatorSeeder::class);
    }
}
