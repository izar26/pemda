<?php

declare(strict_types=1);

namespace App\Services\Risiko\Handlers;

use App\Contracts\Risiko\RiskFormHandlerInterface;
use App\Http\Resources\Risiko\KejadianRisikoResource;
use App\Models\Risiko\PengajuanPenilaianRisiko;
use App\Models\User;
use App\Policies\Risiko\AnalisisRisikoPolicy;
use App\Services\Risiko\KejadianRisikoService;

class KejadianRisiko10Handler implements RiskFormHandlerInterface
{
    public function __construct(
        protected KejadianRisikoService $kejadianService,
        protected AnalisisRisikoPolicy $policy
    ) {}

    public function getFormCode(): string
    {
        return '10';
    }

    public function getName(): string
    {
        return 'Pencatatan Kejadian Risiko (Form 10)';
    }

    public function getOrder(): int
    {
        return 13;
    }

    public function isComplete(string $opdId, string $periodeId): bool
    {
        return $this->kejadianService->isComplete($opdId, $periodeId);
    }

    public function getIncompleteMessage(): string
    {
        return 'Lengkapi data kejadian risiko atau konfirmasikan status nihil kejadian untuk tahun berjalan.';
    }

    public function isRequired(PengajuanPenilaianRisiko $submission): bool
    {
        $hasBeenSubmitted = $submission->submitted_at !== null || $submission->status !== PengajuanPenilaianRisiko::STATUS_DRAFT;

        if ($hasBeenSubmitted && ! $submission->items->contains('form_code', '10')) {
            return false;
        }

        return true;
    }

    public function getReviewData(PengajuanPenilaianRisiko $submission, array $params, User $user): array
    {
        if (! $submission->items->contains('form_code', '10')) {
            abort(404);
        }

        $result = $this->kejadianService->list(
            (string) $submission->opd_id,
            (string) $submission->periode_penilaian_id,
            $user,
            $params
        );

        return [
            'data' => KejadianRisikoResource::collection($result['items']),
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
}
