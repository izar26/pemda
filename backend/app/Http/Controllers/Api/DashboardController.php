<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Opd;
use App\Models\User;
use App\Services\Export\ExcelExportService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\StreamedResponse;

class DashboardController extends Controller
{
    /**
     * Get summary metrics for the executive dashboard.
     */
    public function stats(Request $request): JsonResponse
    {
        $user = $request->user() ?? auth('sanctum')->user();
        if (!$user?->can('dashboard.view')) {
            abort(403, 'Anda tidak memiliki hak akses untuk melihat dashboard eksekutif.');
        }

        $totalOpd = Opd::count();
        $activeOpd = Opd::where('is_active', true)->count();
        $totalUsers = User::count();

        return response()->json([
            'total_instansi' => $totalOpd,
            'active_instansi' => $activeOpd,
            'total_pegawai' => $totalUsers,
            'mitigation_rate' => 82,
            'high_risk_count' => 18,
            'spip_score' => 3.24,
        ]);
    }

    /**
     * Export Executive Summary Report to Excel (.xlsx).
     */
    public function export(Request $request, ExcelExportService $exportService): StreamedResponse
    {
        $user = $request->user() ?? auth('sanctum')->user();
        if (!$user) {
            abort(401, 'Unauthenticated.');
        }

        if (!$user->can('dashboard.export') && !$user->can('dashboard.view')) {
            abort(403, 'Anda tidak memiliki hak akses untuk mengekspor data dashboard.');
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
