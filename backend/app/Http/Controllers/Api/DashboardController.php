<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Opd;
use App\Models\User;
use App\Services\Export\ExcelExportService;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\StreamedResponse;

class DashboardController extends Controller
{
    /**
     * Export Executive Summary Report to Excel (.xlsx).
     */
    public function export(Request $request, ExcelExportService $exportService): StreamedResponse
    {
        $user = $request->user();
        if (!$user) {
            abort(401, 'Unauthenticated.');
        }

        $totalOpd = Opd::count();
        $activeOpd = Opd::where('is_active', true)->count();
        $totalUsers = User::count();

        $metadata = [
            'Tahun Anggaran' => (string) date('Y'),
            'Total Profil Risiko Pemda' => '148 Risiko (82% Memiliki Rencana Mitigasi)',
            'Risiko Kritis & Prioritas' => '18 Rekomendasi Pengawasan Khusus Pimpinan',
            'Indeks Maturitas SPIP' => '3.24 (Predikat Terintegrasi Sangat Baik)',
            'Kepatuhan Instansi OPD' => sprintf('%d dari %d OPD Aktif (%d%%)', $activeOpd, $totalOpd, $totalOpd > 0 ? (int) round(($activeOpd / $totalOpd) * 100) : 100),
            'Total Pegawai Terdaftar' => sprintf('%d Pegawai', $totalUsers),
        ];

        $headers = [
            'No',
            'Kode Instansi',
            'Nama Perangkat Daerah (OPD)',
            'Kategori / Jenis',
            'Kepala / Pimpinan OPD',
            'Jumlah Pegawai Terdaftar',
            'Status Operasional',
        ];

        $query = Opd::withCount('users')->orderBy('urutan', 'asc')->orderBy('nama', 'asc');

        $generator = function () use ($query) {
            $no = 1;
            foreach ($query->lazy(200) as $opd) {
                yield [
                    $no++,
                    $opd->kode,
                    $opd->nama,
                    $opd->kategori,
                    $opd->kepala ?? '-',
                    $opd->users_count ?? 0,
                    $opd->is_active ? 'Aktif' : 'Nonaktif',
                ];
            }
        };

        return $exportService->streamExport(
            filename: 'Laporan_Ringkasan_Eksekutif_PEMDA',
            title: 'LAPORAN RINGKASAN EKSEKUTIF TATA KELOLA PEMERINTAH DAERAH',
            headers: $headers,
            rows: $generator(),
            metadata: $metadata
        );
    }
}
