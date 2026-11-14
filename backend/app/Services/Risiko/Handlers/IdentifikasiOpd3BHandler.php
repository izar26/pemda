<?php

declare(strict_types=1);

namespace App\Services\Risiko\Handlers;

use App\Contracts\Risiko\RiskFormHandlerInterface;
use App\Http\Resources\Risiko\IdentifikasiRisikoOpdResource;
use App\Models\Risiko\IdentifikasiRisikoOpd;
use App\Models\Risiko\PengajuanPenilaianRisiko;
use App\Models\User;

class IdentifikasiOpd3BHandler implements RiskFormHandlerInterface
{
    public function getFormCode(): string
    {
        return '3b';
    }

    public function getName(): string
    {
        return 'Identifikasi Risiko OPD (Form 3B)';
    }

    public function getOrder(): int
    {
        return 4;
    }

    public function isComplete(string $opdId, string $periodeId): bool
    {
        $dokumen3b = IdentifikasiRisikoOpd::where('opd_id', $opdId)
            ->where('periode_penilaian_id', $periodeId)
            ->withCount('items')
            ->first();

        return (bool) (
            $dokumen3b &&
            ! empty($dokumen3b->master_urusan_pemerintahan_id) &&
            $dokumen3b->items_count > 0
        );
    }

    public function getIncompleteMessage(): string
    {
        return 'Urusan Pemerintahan belum dipilih atau daftar risiko strategis OPD belum ditambahkan.';
    }

    public function isRequired(PengajuanPenilaianRisiko $submission): bool
    {
        return true;
    }

    public function getReviewData(PengajuanPenilaianRisiko $submission, array $params, User $user): array
    {
        $opd = (string) $submission->opd_id;
        $periode = (string) $submission->periode_penilaian_id;

        $document = IdentifikasiRisikoOpd::where('opd_id', $opd)
            ->where('periode_penilaian_id', $periode)
            ->with(['opd', 'periode', 'urusanPemerintahan'])
            ->first();

        if (! $document) {
            return ['data' => null, 'meta' => null];
        }

        $page = (int) ($params['page'] ?? 1);
        $perPage = (int) ($params['per_page'] ?? 20);
        $search = trim((string) ($params['search'] ?? ''));

        $query = $document->items()->with(['sasaran', 'indikator', 'rca'])->reorder()->orderBy('urutan')->orderBy('id');
        if ($search !== '') {
            $term = '%'.mb_strtolower($search).'%';
            $query->where(fn ($q) => $q->whereRaw('LOWER(kode_risiko) LIKE ?', [$term])->orWhereRaw('LOWER(pernyataan_risiko) LIKE ?', [$term]));
        }

        $results = $query->paginate($perPage, ['*'], 'page', $page);
        $document->setRelation('items', $results->getCollection());

        return [
            'data' => new IdentifikasiRisikoOpdResource($document),
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
        if (! $user->can('identifikasi_risiko_opd.view')) {
            return false;
        }

        return $user->hasRole(['Superadmin', 'Admin Office', 'Inspektorat', 'Auditor'])
            || (string) $user->opd_id === $opdId;
    }

    public function authorizeEdit(User $user, string $opdId): bool
    {
        if (! $user->can('identifikasi_risiko_opd.edit')) {
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
