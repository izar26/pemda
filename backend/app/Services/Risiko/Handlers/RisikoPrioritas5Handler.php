<?php

declare(strict_types=1);

namespace App\Services\Risiko\Handlers;

use App\Contracts\Risiko\LaporanFormHandlerInterface;
use App\Contracts\Risiko\RiskFormHandlerInterface;
use App\Models\Opd;
use App\Models\Perencanaan\PeriodePenilaian;
use App\Models\Risiko\PengajuanPenilaianRisiko;
use App\Models\User;
use App\Policies\Risiko\AnalisisRisikoPolicy;
use App\Services\Risiko\TindakPengendalianService;

class RisikoPrioritas5Handler implements LaporanFormHandlerInterface, RiskFormHandlerInterface
{
    public function __construct(
        protected AnalisisRisiko4Handler $analisisHandler,
        protected TindakPengendalianService $tindakService,
        protected AnalisisRisikoPolicy $policy
    ) {}

    public function getFormCode(): string
    {
        return '5';
    }

    public function getName(): string
    {
        return 'Daftar Risiko Prioritas (Form 5)';
    }

    public function getOrder(): int
    {
        return 8;
    }

    public function isComplete(string $opdId, string $periodeId): bool
    {
        return $this->analisisHandler->isComplete($opdId, $periodeId);
    }

    public function getIncompleteMessage(): string
    {
        return 'Lengkapi Form 4 untuk menyusun daftar risiko prioritas.';
    }

    public function isRequired(PengajuanPenilaianRisiko $submission): bool
    {
        return true;
    }

    public function getReviewData(PengajuanPenilaianRisiko $submission, array $params, User $user): array
    {
        if (! $submission->items->contains('form_code', '5')) {
            abort(404);
        }

        $result = $this->tindakService->list(
            (string) $submission->opd_id,
            (string) $submission->periode_penilaian_id,
            $user,
            $params
        );

        return ['data' => $result['items'], 'meta' => $result['pagination']];
    }

    public function authorizeView(User $user, string $opdId): bool
    {
        return $this->policy->view($user, $opdId);
    }

    public function authorizeEdit(User $user, string $opdId): bool
    {
        return false;
    }

    public function getDownstreamFormCodes(): array
    {
        return ['6'];
    }

    public function getLaporanData(Opd $opd, PeriodePenilaian $periode, User $user): array
    {
        $result = $this->tindakService->list(
            (string) $opd->id,
            (string) $periode->id,
            $user,
            ['per_page' => 1000]
        );

        return [
            'raw' => $result['items'] ?? [],
        ];
    }

    public function getExcelHeaders(): array
    {
        return [
            'No',
            'Asal (3B/3C)',
            'Kode Risiko',
            'Pernyataan Risiko',
            'Kategori Risiko',
            'Skala Residual',
            'Pemilik Risiko',
            'Penyebab (Akar Masalah)',
            'Uraian Dampak',
            'Status Prioritas',
        ];
    }

    public function getExcelRows(array $laporanData): iterable
    {
        $items = $laporanData['raw'] ?? [];

        if (empty($items)) {
            return [
                ['1', '-', '-', 'Tidak ada risiko prioritas yang melampaui selera risiko untuk periode ini', '-', '-', '-', '-', '-', '-'],
            ];
        }

        $no = 1;
        $rows = [];
        foreach ($items as $row) {
            $r = (array) $row;
            $rows[] = [
                (string) ($no++),
                strtoupper((string) ($r['source'] ?? '-')),
                $r['kode_risiko'] ?? '-',
                $r['pernyataan_risiko'] ?? '-',
                $r['kategori_risiko'] ?? '-',
                (string) ($r['skala_residual'] ?? '-'),
                $r['pemilik_risiko'] ?? '-',
                $r['akar_penyebab'] ?? '-',
                $r['uraian_dampak'] ?? '-',
                'Memerlukan Mitigasi',
            ];
        }

        return $rows;
    }
}
