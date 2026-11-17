<?php

declare(strict_types=1);

namespace App\Contracts\Risiko;

use App\Models\Opd;
use App\Models\Perencanaan\PeriodePenilaian;
use App\Models\User;

interface LaporanFormHandlerInterface
{
    /**
     * Menyediakan data terstruktur formulir laporan untuk OPD dan Periode Penilaian tertentu.
     *
     * @return array<string, mixed>
     */
    public function getLaporanData(Opd $opd, PeriodePenilaian $periode, User $user): array;

    /**
     * Menyediakan daftar judul kolom untuk ekspor Excel standar BPKP.
     *
     * @return array<int, string>
     */
    public function getExcelHeaders(): array;

    /**
     * Memetakan data laporan menjadi baris-baris data tabular untuk ekspor Excel.
     *
     * @param  array<string, mixed>  $laporanData
     * @return iterable<array<int, mixed>>
     */
    public function getExcelRows(array $laporanData): iterable;
}
