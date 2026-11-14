<?php

declare(strict_types=1);

namespace App\Services\Risiko\Handlers;

use App\Contracts\Risiko\RiskFormHandlerInterface;
use App\Models\Risiko\PengajuanPenilaianRisiko;
use App\Models\User;
use App\Policies\Risiko\AnalisisRisikoPolicy;
use App\Services\Risiko\PetaRisikoService;

class PetaRisiko7Handler implements RiskFormHandlerInterface
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
        $hasBeenSubmitted = $submission->submitted_at !== null || $submission->status !== PengajuanPenilaianRisiko::STATUS_DRAFT;

        if ($hasBeenSubmitted && ! $submission->items->contains('form_code', '7')) {
            return false;
        }

        if (! $this->analisisHandler->isRequired($submission) || ! $this->tindakHandler->isRequired($submission)) {
            return false;
        }

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
}
