<?php

declare(strict_types=1);

namespace App\Services\Risiko;

use App\Contracts\Risiko\LaporanFormHandlerInterface;
use App\Models\Opd;
use App\Models\Perencanaan\PeriodePenilaian;
use App\Models\Risiko\PengajuanPenilaianRisiko;
use App\Models\User;
use App\Services\Export\ExcelExportService;
use App\Services\Risiko\Registry\RiskFormRegistry;
use Illuminate\Auth\Access\AuthorizationException;
use Symfony\Component\HttpFoundation\StreamedResponse;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

class LaporanRisikoService
{
    public function __construct(
        protected RiskFormRegistry $registry,
        protected ExcelExportService $excelService
    ) {}

    /**
     * Mengambil data laporan terstruktur untuk formulir tertentu.
     *
     * @return array<string, mixed>
     */
    public function getLaporan(string $formCode, ?string $opdId, ?int $tahun, User $user): array
    {
        $opd = $this->resolveOpd($opdId, $user);
        $periode = $this->resolvePeriode($tahun);
        $cleanCode = strtolower(trim($formCode));

        $handler = $this->registry->get($cleanCode);

        // 1. Ambil status pengajuan audit resmi
        $submission = PengajuanPenilaianRisiko::where('opd_id', $opd->id)
            ->where('periode_penilaian_id', $periode->id)
            ->with(['kepalaOpd', 'auditor', 'pengawas', 'approvedBy'])
            ->first();

        $isApproved = (bool) ($submission && $submission->status === PengajuanPenilaianRisiko::STATUS_APPROVED);

        // 2. Tentukan pejabat penandatangan
        $penandatanganNama = $submission?->kepalaOpd?->name ?? $opd->kepala ?? '........................';
        $penandatanganNip = $submission?->kepalaOpd?->nip ?? '........................';
        $penandatanganJabatan = 'Kepala '.$opd->nama;
        $tanggalPengesahan = $submission?->approved_at
            ? $submission->approved_at->translatedFormat('d F Y')
            : now()->translatedFormat('d F Y');

        // 3. Ambil data formulir dari handler
        $content = null;
        if ($handler instanceof LaporanFormHandlerInterface) {
            $content = $handler->getLaporanData($opd, $periode, $user);
        } else {
            // Fallback memanfaatkan getReviewData jika handler belum mengimplementasikan LaporanFormHandlerInterface khusus
            if ($submission) {
                $reviewResult = $handler->getReviewData($submission, [], $user);
                $content = $reviewResult['data'] ?? null;
            }
        }

        return [
            'form_code' => $cleanCode,
            'form_title' => $handler->getName(),
            'opd' => [
                'id' => $opd->id,
                'nama' => $opd->nama,
                'kode' => $opd->kode,
            ],
            'periode' => [
                'id' => $periode->id,
                'tahun' => $periode->tahun_penilaian,
                'nama' => $periode->nama,
            ],
            'audit_status' => [
                'submission_id' => $submission?->id,
                'status' => $submission?->status ?? PengajuanPenilaianRisiko::STATUS_DRAFT,
                'current_tier' => $submission?->current_tier ?? PengajuanPenilaianRisiko::TIER_OPERATOR,
                'is_approved' => $isApproved,
                'approved_at' => $submission?->approved_at?->toIso8601String(),
                'approved_by_name' => $submission?->approvedBy?->name,
                'catatan_umum' => $submission?->catatan_umum,
            ],
            'penandatangan' => [
                'nama' => $penandatanganNama,
                'nip' => $penandatanganNip,
                'jabatan' => $penandatanganJabatan,
                'tanggal' => $tanggalPengesahan,
            ],
            'content' => $content,
        ];
    }

    /**
     * Mengalirkan file ekspor spreadsheet (.xlsx) resmi dengan validasi status persetujuan.
     */
    public function exportExcel(string $formCode, ?string $opdId, ?int $tahun, User $user): StreamedResponse
    {
        $opd = $this->resolveOpd($opdId, $user);
        $periode = $this->resolvePeriode($tahun);
        $cleanCode = strtolower(trim($formCode));

        $handler = $this->registry->get($cleanCode);

        $submission = PengajuanPenilaianRisiko::where('opd_id', $opd->id)
            ->where('periode_penilaian_id', $periode->id)
            ->first();

        $isApproved = (bool) ($submission && $submission->status === PengajuanPenilaianRisiko::STATUS_APPROVED);

        if (! $isApproved) {
            throw new AuthorizationException(
                'Dokumen Laporan Resmi hanya dapat diunduh jika status pengajuan penilaian risiko OPD telah disetujui penuh (Approved) oleh Inspektorat.'
            );
        }

        $laporanData = $this->getLaporan($cleanCode, (string) $opd->id, (int) $periode->tahun_penilaian, $user);

        $headers = [];
        $rows = [];

        if ($handler instanceof LaporanFormHandlerInterface) {
            $headers = $handler->getExcelHeaders();
            $rows = $handler->getExcelRows($laporanData['content'] ?? []);
        } else {
            $headers = ['Informasi', 'Keterangan'];
            $rows = [
                ['Formulir', $handler->getName()],
                ['Status', 'Format tabel ekspor sedang dalam penyesuaian tahap lanjut'],
            ];
        }

        $title = sprintf('LAPORAN %s - %s', mb_strtoupper($handler->getName()), mb_strtoupper($opd->nama));
        $filename = sprintf('Laporan_%s_%s_%d', strtoupper($cleanCode), preg_replace('/[^a-zA-Z0-9]/', '_', $opd->nama), $periode->tahun_penilaian);

        $metadata = [
            'Perangkat Daerah' => $opd->nama,
            'Tahun Penilaian' => (string) $periode->tahun_penilaian,
            'Status Audit' => 'DISETUJUI (APPROVED) INSPEKTORAT',
            'Penandatangan' => sprintf('%s (NIP: %s)', $laporanData['penandatangan']['nama'], $laporanData['penandatangan']['nip']),
        ];

        return $this->excelService->streamExport($filename, $title, $headers, $rows, $metadata);
    }

    protected function resolveOpd(?string $opdId, User $user): Opd
    {
        // Jika user adalah role OPD murni (bukan admin/inspektorat), kunci ke opd_id mereka sendiri
        $isGlobalAdmin = $user->hasRole(['Superadmin', 'Administrator', 'Admin Office', 'Inspektorat', 'Koordinator Pengawas']);
        $isScopedAuditor = $user->hasRole(['Evaluator / Reviewer', 'Auditor']);

        if (! $isGlobalAdmin && ! $isScopedAuditor && $user->opd_id) {
            $targetOpdId = (string) $user->opd_id;
        } else {
            $targetOpdId = $opdId ?: (string) $user->opd_id;
        }

        if (! $targetOpdId) {
            $firstOpd = Opd::where('is_active', true)->orderBy('urutan')->first();
            if (! $firstOpd) {
                throw new NotFoundHttpException('Perangkat Daerah tidak ditemukan.');
            }

            return $firstOpd;
        }

        $opd = Opd::find($targetOpdId);
        if (! $opd) {
            throw new NotFoundHttpException('Perangkat Daerah dengan ID tersebut tidak ditemukan.');
        }

        return $opd;
    }

    protected function resolvePeriode(?int $tahun): PeriodePenilaian
    {
        if ($tahun) {
            $periode = PeriodePenilaian::where('tahun_penilaian', $tahun)->first();
            if ($periode) {
                return $periode;
            }
        }

        $activePeriode = PeriodePenilaian::where('is_active', true)->first();
        if ($activePeriode) {
            return $activePeriode;
        }

        $latestPeriode = PeriodePenilaian::orderBy('tahun_penilaian', 'desc')->first();
        if (! $latestPeriode) {
            throw new NotFoundHttpException('Periode penilaian belum dikonfigurasi di sistem.');
        }

        return $latestPeriode;
    }
}
