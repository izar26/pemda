<?php

declare(strict_types=1);

namespace App\Services\Risiko\Handlers;

use App\Contracts\Risiko\RiskFormHandlerInterface;
use App\Http\Resources\Risiko\KonteksOperasionalResource;
use App\Models\Risiko\KonteksOperasional;
use App\Models\Risiko\PengajuanPenilaianRisiko;
use App\Models\User;

class KonteksOperasional2CHandler implements RiskFormHandlerInterface
{
    public function getFormCode(): string
    {
        return '2c';
    }

    public function getName(): string
    {
        return 'Konteks Operasional (Form 2C)';
    }

    public function getOrder(): int
    {
        return 2;
    }

    public function isComplete(string $opdId, string $periodeId): bool
    {
        $operasional = KonteksOperasional::where('opd_id', $opdId)
            ->where('periode_penilaian_id', $periodeId)
            ->withCount(['items as programs_count' => fn ($q) => $q->where('jenis', 'program')])
            ->first();

        return (bool) ($operasional && $operasional->programs_count > 0);
    }

    public function getIncompleteMessage(): string
    {
        return 'Pohon kinerja program/kegiatan operasional belum ditambahkan.';
    }

    public function isRequired(PengajuanPenilaianRisiko $submission): bool
    {
        return true;
    }

    public function getReviewData(PengajuanPenilaianRisiko $submission, array $params, User $user): array
    {
        $data = KonteksOperasional::where('opd_id', (string) $submission->opd_id)
            ->where('periode_penilaian_id', (string) $submission->periode_penilaian_id)
            ->with([
                'opd',
                'periode',
                'sumberData',
                'konteksStrategis.tujuan',
                'programs.indikators',
                'programs.children.indikators',
                'programs.children.children.indikators',
            ])->first();

        return [
            'data' => $data ? new KonteksOperasionalResource($data) : null,
            'meta' => null,
        ];
    }

    public function authorizeView(User $user, string $opdId): bool
    {
        if (! $user->can('konteks_operasional.view')) {
            return false;
        }

        return $user->hasRole(['Superadmin', 'Admin Office', 'Inspektorat', 'Auditor'])
            || (string) $user->opd_id === $opdId;
    }

    public function authorizeEdit(User $user, string $opdId): bool
    {
        if (! $user->can('konteks_operasional.edit')) {
            return false;
        }

        return $user->hasRole(['Superadmin', 'Admin Office'])
            || (string) $user->opd_id === $opdId;
    }

    public function getDownstreamFormCodes(): array
    {
        return ['3c'];
    }
}
