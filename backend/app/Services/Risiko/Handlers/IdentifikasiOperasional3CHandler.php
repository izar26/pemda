<?php

declare(strict_types=1);

namespace App\Services\Risiko\Handlers;

use App\Contracts\Risiko\RiskFormHandlerInterface;
use App\Http\Resources\Risiko\IdentifikasiRisikoOpdOperasionalResource;
use App\Models\Risiko\IdentifikasiRisikoOpdOperasional;
use App\Models\Risiko\PengajuanPenilaianRisiko;
use App\Models\User;

class IdentifikasiOperasional3CHandler implements RiskFormHandlerInterface
{
    public function getFormCode(): string
    {
        return '3c';
    }

    public function getName(): string
    {
        return 'Identifikasi Risiko Operasional (Form 3C)';
    }

    public function getOrder(): int
    {
        return 5;
    }

    public function isComplete(string $opdId, string $periodeId): bool
    {
        $dokumen3c = IdentifikasiRisikoOpdOperasional::where('opd_id', $opdId)
            ->where('periode_penilaian_id', $periodeId)
            ->withCount('items')
            ->first();

        return (bool) (
            $dokumen3c &&
            ! empty($dokumen3c->master_urusan_pemerintahan_id) &&
            $dokumen3c->items_count > 0
        );
    }

    public function getIncompleteMessage(): string
    {
        return 'Urusan Pemerintahan belum dipilih atau daftar risiko operasional OPD belum ditambahkan.';
    }

    public function isRequired(PengajuanPenilaianRisiko $submission): bool
    {
        return true;
    }

    public function getReviewData(PengajuanPenilaianRisiko $submission, array $params, User $user): array
    {
        $opd = (string) $submission->opd_id;
        $periode = (string) $submission->periode_penilaian_id;

        $document = IdentifikasiRisikoOpdOperasional::where('opd_id', $opd)
            ->where('periode_penilaian_id', $periode)
            ->with(['opd', 'periode', 'urusanPemerintahan'])
            ->first();

        if (! $document) {
            return ['data' => null, 'meta' => null];
        }

        $page = (int) ($params['page'] ?? 1);
        $perPage = (int) ($params['per_page'] ?? 20);
        $search = trim((string) ($params['search'] ?? ''));

        $query = $document->items()->with(['subKegiatan.parent.parent', 'subKegiatan.indikators', 'rca'])->reorder()->orderBy('urutan')->orderBy('id');
        if ($search !== '') {
            $term = '%'.mb_strtolower($search).'%';
            $query->where(fn ($q) => $q->whereRaw('LOWER(kode_risiko) LIKE ?', [$term])->orWhereRaw('LOWER(pernyataan_risiko) LIKE ?', [$term]));
        }

        $results = $query->paginate($perPage, ['*'], 'page', $page);
        $document->setRelation('items', $results->getCollection());

        return [
            'data' => new IdentifikasiRisikoOpdOperasionalResource($document),
            'meta' => [
                'current_page' => $results->currentPage(),
                'last_page' => $results->lastPage(),
                'per_page' => $results->perPage(),
                'total' => $results->total(),
            ],
        ];
    }

    public function authorizeView(User $user, string $opdId): bool
    {
        if (! $user->can('identifikasi_risiko_opd_operasional.view')) {
            return false;
        }

        return $user->hasRole(['Superadmin', 'Admin Office', 'Inspektorat', 'Auditor'])
            || (string) $user->opd_id === $opdId;
    }

    public function authorizeEdit(User $user, string $opdId): bool
    {
        if (! $user->can('identifikasi_risiko_opd_operasional.edit')) {
            return false;
        }

        return $user->hasRole(['Superadmin', 'Admin Office'])
            || (string) $user->opd_id === $opdId;
    }

    public function getDownstreamFormCodes(): array
    {
        return ['rca', '4', '5', '6'];
    }
}
