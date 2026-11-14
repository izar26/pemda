<?php

declare(strict_types=1);

namespace App\Services\Risiko\Handlers;

use App\Contracts\Risiko\RiskFormHandlerInterface;
use App\Http\Resources\Risiko\KonteksPenilaianResource;
use App\Models\Risiko\KonteksPenilaian;
use App\Models\Risiko\PengajuanPenilaianRisiko;
use App\Models\User;
use App\Services\Risiko\KonteksPenilaianService;

class KonteksPenilaian2BHandler implements RiskFormHandlerInterface
{
    public function __construct(
        protected KonteksPenilaianService $service
    ) {}

    public function getFormCode(): string
    {
        return '2b';
    }

    public function getName(): string
    {
        return 'Konteks Strategis (Form 2B)';
    }

    public function getOrder(): int
    {
        return 1;
    }

    public function isComplete(string $opdId, string $periodeId): bool
    {
        $konteks2b = KonteksPenilaian::where('opd_id', $opdId)
            ->where('periode_penilaian_id', $periodeId)
            ->with(['sasarans', 'indikators'])
            ->first();

        return (bool) (
            $konteks2b &&
            ! empty($konteks2b->sumber_data_id) &&
            ! empty($konteks2b->tujuan_penilaian_id) &&
            $konteks2b->sasarans->isNotEmpty() &&
            $konteks2b->indikators->isNotEmpty()
        );
    }

    public function getIncompleteMessage(): string
    {
        return 'Tujuan, sasaran, dan indikator strategis OPD belum terisi lengkap.';
    }

    public function isRequired(PengajuanPenilaianRisiko $submission): bool
    {
        return true;
    }

    public function getReviewData(PengajuanPenilaianRisiko $submission, array $params, User $user): array
    {
        $data = $this->service->getKonteksByOpd((string) $submission->opd_id, (string) $submission->periode_penilaian_id);

        return [
            'data' => $data ? new KonteksPenilaianResource($data) : null,
            'meta' => null,
        ];
    }

    public function authorizeView(User $user, string $opdId): bool
    {
        if (! $user->can('konteks_penetapan.view')) {
            return false;
        }

        return $user->hasRole(['Superadmin', 'Admin Office', 'Inspektorat', 'Auditor'])
            || (string) $user->opd_id === $opdId;
    }

    public function authorizeEdit(User $user, string $opdId): bool
    {
        if (! $user->can('konteks_penetapan.edit')) {
            return false;
        }

        return $user->hasRole(['Superadmin', 'Admin Office'])
            || (string) $user->opd_id === $opdId;
    }

    public function getDownstreamFormCodes(): array
    {
        return ['2c', '3b', '3c'];
    }
}
