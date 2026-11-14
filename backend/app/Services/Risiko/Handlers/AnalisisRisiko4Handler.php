<?php

declare(strict_types=1);

namespace App\Services\Risiko\Handlers;

use App\Contracts\Risiko\RiskFormHandlerInterface;
use App\Models\Risiko\AnalisisRisiko;
use App\Models\Risiko\IdentifikasiRisikoOpdItem;
use App\Models\Risiko\IdentifikasiRisikoOpdOperasionalItem;
use App\Models\Risiko\PengajuanPenilaianRisiko;
use App\Models\User;
use App\Policies\Risiko\AnalisisRisikoPolicy;
use App\Services\Risiko\AnalisisRisikoService;

class AnalisisRisiko4Handler implements RiskFormHandlerInterface
{
    public function __construct(
        protected AnalisisRisikoService $analisisService,
        protected AnalisisRisikoPolicy $policy
    ) {}

    public function getFormCode(): string
    {
        return '4';
    }

    public function getName(): string
    {
        return 'Analisis dan Evaluasi Risiko (Form 4)';
    }

    public function getOrder(): int
    {
        return 7;
    }

    public function isComplete(string $opdId, string $periodeId): bool
    {
        $ids3b = IdentifikasiRisikoOpdItem::whereHas('dokumen', fn ($q) => $q->where('opd_id', $opdId)->where('periode_penilaian_id', $periodeId))->pluck('id');
        $ids3c = IdentifikasiRisikoOpdOperasionalItem::whereHas('dokumen', fn ($q) => $q->where('opd_id', $opdId)->where('periode_penilaian_id', $periodeId))->pluck('id');
        $totalForm4 = $ids3b->count() + $ids3c->count();

        if ($totalForm4 === 0) {
            return false;
        }

        $completeForm4 = AnalisisRisiko::where(fn ($q) => $q->whereIn('risiko_opd_item_id', $ids3b)->orWhereIn('risiko_operasional_item_id', $ids3c))
            ->whereNotNull('kriteria_kemungkinan')->whereNotNull('inheren_kemungkinan')->whereNotNull('kriteria_dampak')->whereNotNull('inheren_dampak')
            ->whereNotNull('residual_kriteria_kemungkinan')->where('residual_kriteria_kemungkinan', '!=', '')->whereNotNull('residual_kriteria_dampak')->where('residual_kriteria_dampak', '!=', '')
            ->whereNotNull('residual_kemungkinan')->whereNotNull('residual_dampak')->whereNotNull('pengendalian_ada')
            ->where(fn ($q) => $q->where('pengendalian_ada', false)->orWhere(fn ($q) => $q->where('pengendalian_ada', true)->whereNotNull('pengendalian_uraian')->where('pengendalian_uraian', '!=', '')->whereNotNull('sub_unsur_spip_id')->whereNotNull('pengendalian_memadai')))
            ->count();

        return $completeForm4 === $totalForm4;
    }

    public function getIncompleteMessage(): string
    {
        return 'Lengkapi analisis seluruh risiko 3B dan 3C.';
    }

    public function isRequired(PengajuanPenilaianRisiko $submission): bool
    {
        return true;
    }

    public function getReviewData(PengajuanPenilaianRisiko $submission, array $params, User $user): array
    {
        $result = $this->analisisService->list(
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
        return $this->policy->edit($user, $opdId, '3b') || $this->policy->edit($user, $opdId, '3c');
    }

    public function getDownstreamFormCodes(): array
    {
        return ['5', '6', '7', '8', '9'];
    }
}
