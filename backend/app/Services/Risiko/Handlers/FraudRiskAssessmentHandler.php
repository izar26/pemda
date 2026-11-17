<?php

declare(strict_types=1);

namespace App\Services\Risiko\Handlers;

use App\Contracts\Risiko\LaporanFormHandlerInterface;
use App\Contracts\Risiko\RiskFormHandlerInterface;
use App\Http\Resources\Risiko\FraudRiskAssessmentResource;
use App\Models\Opd;
use App\Models\Perencanaan\PeriodePenilaian;
use App\Models\Risiko\PengajuanPenilaianRisiko;
use App\Models\User;
use App\Policies\Risiko\AnalisisRisikoPolicy;
use App\Services\Risiko\FraudRiskAssessmentService;

class FraudRiskAssessmentHandler implements LaporanFormHandlerInterface, RiskFormHandlerInterface
{
    public function __construct(
        protected FraudRiskAssessmentService $fraService,
        protected AnalisisRisikoPolicy $policy
    ) {}

    public function getFormCode(): string
    {
        return 'fra';
    }

    public function getName(): string
    {
        return 'Penilaian Risiko Kecurangan (FRA)';
    }

    public function getOrder(): int
    {
        return 14;
    }

    public function isComplete(string $opdId, string $periodeId): bool
    {
        return $this->fraService->isComplete($opdId, $periodeId);
    }

    public function getIncompleteMessage(): string
    {
        return 'Lengkapi data penilaian risiko kecurangan (FRA) atau konfirmasikan status nihil risiko kecurangan untuk tahun berjalan.';
    }

    public function isRequired(PengajuanPenilaianRisiko $submission): bool
    {
        return true;
    }

    public function getReviewData(PengajuanPenilaianRisiko $submission, array $params, User $user): array
    {
        if (! $submission->items->contains('form_code', 'fra')) {
            abort(404);
        }

        $result = $this->fraService->list(
            (string) $submission->opd_id,
            (string) $submission->periode_penilaian_id,
            $user,
            $params
        );

        return [
            'data' => FraudRiskAssessmentResource::collection($result['items']),
            'meta' => $result['meta'],
            'is_nihil' => $result['is_nihil'],
            'nihil_info' => $result['nihil_info'],
        ];
    }

    public function authorizeView(User $user, string $opdId): bool
    {
        return $this->policy->view($user, $opdId);
    }

    public function authorizeEdit(User $user, string $opdId): bool
    {
        return $this->policy->view($user, $opdId)
            && ($user->hasRole(['Superadmin', 'Admin Office']) || (string) $user->opd_id === $opdId);
    }

    public function getDownstreamFormCodes(): array
    {
        return [];
    }

    public function getLaporanData(Opd $opd, PeriodePenilaian $periode, User $user): array
    {
        $result = $this->fraService->list((string) $opd->id, (string) $periode->id, $user, ['per_page' => 1000]);

        return [
            'raw' => FraudRiskAssessmentResource::collection($result['items'])->resolve(),
            'is_nihil' => (bool) ($result['is_nihil'] ?? false),
            'nihil_info' => $result['nihil_info'] ?? null,
        ];
    }

    public function getExcelHeaders(): array
    {
        return [
            'No',
            'Proses Bisnis',
            'Identifikasi Risiko Kecurangan',
            'Skenario Kecurangan',
            'Jenis Fraud',
            'Penyebab',
            'Pemilik Risiko',
            'Existing Control',
            'Kemungkinan Kriteria',
            'Kemungkinan Skor',
            'Dampak Kriteria',
            'Dampak Skor',
            'Skala Risiko FRA',
            'Rencana Mitigasi',
        ];
    }

    public function getExcelRows(array $laporanData): iterable
    {
        if (! empty($laporanData['is_nihil'])) {
            return [
                ['1', 'STATUS NIHIL', 'KONFIRMASI STATUS NIHIL: Tidak terdapat risiko kecurangan (fraud) yang teridentifikasi untuk tahun anggaran berjalan', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-'],
            ];
        }

        $items = $laporanData['raw'] ?? [];

        if (empty($items)) {
            return [
                ['1', '-', 'Belum ada penilaian risiko kecurangan (FRA) untuk periode ini', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-'],
            ];
        }

        $rows = [];
        $no = 1;

        foreach ($items as $item) {
            $rows[] = [
                (string) ($item['nomor_urut'] ?? $no++),
                $item['proses_bisnis'] ?? '-',
                $item['identifikasi_risiko_kecurangan'] ?? '-',
                $item['skenario_kecurangan'] ?? '-',
                $item['jenis_risiko_kecurangan'] ?? '-',
                $item['penyebab'] ?? '-',
                $item['pemilik_risiko'] ?? '-',
                $item['existing_control'] ?? '-',
                $item['kemungkinan_kriteria'] ?? '-',
                (string) ($item['kemungkinan_skor'] ?? '-'),
                $item['dampak_kriteria'] ?? '-',
                (string) ($item['dampak_skor'] ?? '-'),
                (string) ($item['skala_risiko'] ?? '-'),
                $item['mitigasi'] ?? '-',
            ];
        }

        return $rows;
    }
}
