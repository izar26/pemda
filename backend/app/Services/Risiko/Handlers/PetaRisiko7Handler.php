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
use App\Services\Risiko\PetaRisikoService;

class PetaRisiko7Handler implements LaporanFormHandlerInterface, RiskFormHandlerInterface
{
    public function __construct(
        protected PetaRisikoService $petaRisikoService,
        protected AnalisisRisiko4Handler $analisisHandler,
        protected TindakPengendalian6Handler $tindakHandler,
        protected AnalisisRisikoPolicy $policy
    ) {}

    public function getFormCode(): string
    {
        return '7';
    }

    public function getName(): string
    {
        return 'Peta Risiko (Form 7)';
    }

    public function getOrder(): int
    {
        return 10;
    }

    public function isComplete(string $opdId, string $periodeId): bool
    {
        return $this->analisisHandler->isComplete($opdId, $periodeId)
            && $this->tindakHandler->isComplete($opdId, $periodeId);
    }

    public function getIncompleteMessage(): string
    {
        return 'Lengkapi Analisis Risiko (Form 4) dan Rencana Tindak Pengendalian (Form 6) terlebih dahulu.';
    }

    public function isRequired(PengajuanPenilaianRisiko $submission): bool
    {
        return true;
    }

    public function getReviewData(PengajuanPenilaianRisiko $submission, array $params, User $user): array
    {
        if (! $submission->items->contains('form_code', '7')) {
            abort(404);
        }

        $result = $this->petaRisikoService->generate(
            (string) $submission->opd_id,
            (string) $submission->periode_penilaian_id,
            $user,
            $params
        );

        return ['data' => $result];
    }

    public function authorizeView(User $user, string $opdId): bool
    {
        return $this->policy->view($user, $opdId);
    }

    public function authorizeEdit(User $user, string $opdId): bool
    {
        return $this->policy->edit($user, $opdId, '3b') || $this->policy->edit($user, $opdId, '3c');
    }

    public function getDownstreamFormCodes(): array
    {
        return [];
    }

    public function getLaporanData(Opd $opd, PeriodePenilaian $periode, User $user): array
    {
        return $this->petaRisikoService->generate(
            (string) $opd->id,
            (string) $periode->id,
            $user
        );
    }

    public function getExcelHeaders(): array
    {
        return [
            'No',
            'Zona Risiko',
            'Rentang Skor Matriks',
            'Jumlah Risiko Inheren',
            'Jumlah Risiko Residual',
            'Jumlah Risiko Treated',
        ];
    }

    public function getExcelRows(array $laporanData): iterable
    {
        $rekap = $laporanData['rekapitulasi'] ?? [];

        if (empty($rekap)) {
            return [
                ['1', 'Belum ada data pemetaan risiko 5x5 untuk periode ini', '-', '0', '0', '0'],
            ];
        }

        $no = 1;
        $rows = [];
        foreach ($rekap as $z) {
            $rows[] = [
                (string) ($no++),
                $z['label'] ?? '-',
                (string) ($z['skor_range'] ?? '-'),
                (string) ($z['inherent_count'] ?? 0),
                (string) ($z['residual_count'] ?? 0),
                (string) ($z['treated_count'] ?? 0),
            ];
        }

        return $rows;
    }
}
