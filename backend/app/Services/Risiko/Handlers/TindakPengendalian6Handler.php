<?php

declare(strict_types=1);

namespace App\Services\Risiko\Handlers;

use App\Contracts\Risiko\RiskFormHandlerInterface;
use App\Models\Risiko\PengajuanPenilaianRisiko;
use App\Models\User;
use App\Policies\Risiko\AnalisisRisikoPolicy;
use App\Services\Risiko\TindakPengendalianService;

class TindakPengendalian6Handler implements RiskFormHandlerInterface
{
    public function __construct(
        protected AnalisisRisiko4Handler $analisisHandler,
        protected TindakPengendalianService $tindakService,
        protected AnalisisRisikoPolicy $policy
    ) {}

    public function getFormCode(): string
    {
        return '6';
    }

    public function getName(): string
    {
        return 'Rencana Tindak Pengendalian (Form 6)';
    }

    public function getOrder(): int
    {
        return 9;
    }

    public function isComplete(string $opdId, string $periodeId): bool
    {
        if (! $this->analisisHandler->isComplete($opdId, $periodeId)) {
            return false;
        }

        $priorityRows = $this->tindakService->query($opdId, $periodeId)->get();

        return $priorityRows->every(fn ($row) => TindakPengendalianService::isComplete((array) $row));
    }

    public function getIncompleteMessage(): string
    {
        return 'Lengkapi rencana tindak untuk setiap risiko prioritas.';
    }

    public function isRequired(PengajuanPenilaianRisiko $submission): bool
    {
        $hasBeenSubmitted = $submission->submitted_at !== null || $submission->status !== PengajuanPenilaianRisiko::STATUS_DRAFT;

        return ! $hasBeenSubmitted || $submission->items->contains('form_code', '6');
    }

    public function getReviewData(PengajuanPenilaianRisiko $submission, array $params, User $user): array
    {
        if (! $submission->items->contains('form_code', '6')) {
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
        return $this->policy->edit($user, $opdId, '3b') || $this->policy->edit($user, $opdId, '3c');
    }

    public function getDownstreamFormCodes(): array
    {
        return ['7', '8', '9'];
    }
}
