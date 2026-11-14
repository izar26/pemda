<?php

declare(strict_types=1);

namespace App\Services\Risiko\Handlers;

use App\Contracts\Risiko\RiskFormHandlerInterface;
use App\Models\Risiko\PengajuanPenilaianRisiko;
use App\Models\User;
use App\Policies\Risiko\AnalisisRisikoPolicy;
use App\Services\Risiko\KomunikasiPengendalianService;

class KomunikasiPengendalian8Handler implements RiskFormHandlerInterface
{
    public function __construct(
        protected TindakPengendalian6Handler $tindakHandler,
        protected KomunikasiPengendalianService $komunikasiService,
        protected AnalisisRisikoPolicy $policy
    ) {}

    public function getFormCode(): string
    {
        return '8';
    }

    public function getName(): string
    {
        return 'Pengkomunikasian Pengendalian (Form 8)';
    }

    public function getOrder(): int
    {
        return 11;
    }

    public function isComplete(string $opdId, string $periodeId): bool
    {
        if (! $this->tindakHandler->isComplete($opdId, $periodeId)) {
            return false;
        }

        $priorityRows = $this->komunikasiService->query($opdId, $periodeId)->get();

        return $priorityRows->every(fn ($row) => KomunikasiPengendalianService::isComplete((array) $row));
    }

    public function getIncompleteMessage(): string
    {
        return 'Lengkapi pengkomunikasian pengendalian untuk setiap risiko prioritas.';
    }

    public function isRequired(PengajuanPenilaianRisiko $submission): bool
    {
        $hasBeenSubmitted = $submission->submitted_at !== null || $submission->status !== PengajuanPenilaianRisiko::STATUS_DRAFT;

        if ($hasBeenSubmitted && ! $submission->items->contains('form_code', '8')) {
            return false;
        }

        return $this->tindakHandler->isRequired($submission);
    }

    public function getReviewData(PengajuanPenilaianRisiko $submission, array $params, User $user): array
    {
        if (! $submission->items->contains('form_code', '8')) {
            abort(404);
        }

        $result = $this->komunikasiService->list(
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
        return [];
    }
}
