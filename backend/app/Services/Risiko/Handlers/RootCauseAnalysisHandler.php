<?php

declare(strict_types=1);

namespace App\Services\Risiko\Handlers;

use App\Contracts\Risiko\LaporanFormHandlerInterface;
use App\Contracts\Risiko\RiskFormHandlerInterface;
use App\Http\Resources\Risiko\RootCauseAnalysisResource;
use App\Models\Opd;
use App\Models\Perencanaan\PeriodePenilaian;
use App\Models\Risiko\IdentifikasiRisikoOpd;
use App\Models\Risiko\IdentifikasiRisikoOpdOperasional;
use App\Models\Risiko\IdentifikasiRisikoPemda;
use App\Models\Risiko\PengajuanPenilaianRisiko;
use App\Models\Risiko\RootCauseAnalysis;
use App\Models\User;
use App\Services\Risiko\RootCauseAnalysisService;

class RootCauseAnalysisHandler implements LaporanFormHandlerInterface, RiskFormHandlerInterface
{
    public function __construct(
        protected RootCauseAnalysisService $rcaService
    ) {}

    public function getFormCode(): string
    {
        return 'rca';
    }

    public function getName(): string
    {
        return 'Root Cause Analysis (Form RCA)';
    }

    public function getOrder(): int
    {
        return 6;
    }

    public function isComplete(string $opdId, string $periodeId): bool
    {
        $dokumen3a = IdentifikasiRisikoPemda::where('opd_id', $opdId)->where('periode_penilaian_id', $periodeId)->withCount('items')->first();
        $dokumen3b = IdentifikasiRisikoOpd::where('opd_id', $opdId)->where('periode_penilaian_id', $periodeId)->withCount('items')->first();
        $dokumen3c = IdentifikasiRisikoOpdOperasional::where('opd_id', $opdId)->where('periode_penilaian_id', $periodeId)->withCount('items')->first();

        $totalRiskItemsCount = ($dokumen3a?->items_count ?? 0) + ($dokumen3b?->items_count ?? 0) + ($dokumen3c?->items_count ?? 0);
        if ($totalRiskItemsCount === 0) {
            return false;
        }

        $scopeQuery = function ($query) use ($dokumen3a, $dokumen3b, $dokumen3c) {
            $query->where(function ($sub) use ($dokumen3a) {
                if ($dokumen3a) {
                    $sub->whereHas('itemPemda', fn ($q) => $q->where('identifikasi_risiko_pemda_id', $dokumen3a->id));
                } else {
                    $sub->whereRaw('1 = 0');
                }
            })->orWhere(function ($sub) use ($dokumen3b) {
                if ($dokumen3b) {
                    $sub->whereHas('itemOpd', fn ($q) => $q->where('identifikasi_risiko_opd_id', $dokumen3b->id));
                } else {
                    $sub->whereRaw('1 = 0');
                }
            })->orWhere(function ($sub) use ($dokumen3c) {
                if ($dokumen3c) {
                    $sub->whereHas('itemOperasional', fn ($q) => $q->where('identifikasi_risiko_opd_operasional_id', $dokumen3c->id));
                } else {
                    $sub->whereRaw('1 = 0');
                }
            });
        };

        $unresolvedRcaCount = RootCauseAnalysis::where($scopeQuery)
            ->where(function ($q) {
                $q->whereNull('akar_penyebab')
                    ->orWhere('akar_penyebab', '')
                    ->orWhereNull('jenis_penyebab')
                    ->orWhere('jenis_penyebab', '');
            })
            ->count();

        $totalRcaCount = RootCauseAnalysis::where($scopeQuery)->count();

        return $totalRcaCount === $totalRiskItemsCount && $unresolvedRcaCount === 0;
    }

    public function getIncompleteMessage(): string
    {
        return 'Analisis 5-Whys dan jenis penyebab pada Form RCA belum dilengkapi untuk seluruh risiko (3A, 3B, & 3C).';
    }

    public function isRequired(PengajuanPenilaianRisiko $submission): bool
    {
        return true;
    }

    public function getReviewData(PengajuanPenilaianRisiko $submission, array $params, User $user): array
    {
        $opd = (string) $submission->opd_id;
        $periode = (string) $submission->periode_penilaian_id;

        $page = (int) ($params['page'] ?? 1);
        $perPage = (int) ($params['per_page'] ?? 20);
        $search = trim((string) ($params['search'] ?? ''));
        $source = (string) ($params['source'] ?? '');
        $status = (string) ($params['status'] ?? '');

        $query = $this->rcaService->queryRcaByOpd($opd, $periode)->orderBy('id');

        if ($source !== '') {
            $relation = match ($source) {
                '3a' => 'itemPemda',
                '3b' => 'itemOpd',
                '3c' => 'itemOperasional',
                default => null,
            };
            if ($relation) {
                $query->whereHas($relation);
            }
        }

        if ($status === 'complete') {
            $query->whereNotNull('akar_penyebab')->where('akar_penyebab', '!=', '')->whereNotNull('jenis_penyebab')->where('jenis_penyebab', '!=', '');
        } elseif ($status === 'incomplete') {
            $query->where(fn ($q) => $q->whereNull('akar_penyebab')->orWhere('akar_penyebab', '')->orWhereNull('jenis_penyebab')->orWhere('jenis_penyebab', ''));
        }

        if ($search !== '') {
            $term = '%'.mb_strtolower($search).'%';
            $query->where(fn ($q) => $q->whereHas('itemPemda', fn ($item) => $item->whereRaw('LOWER(pernyataan_risiko) LIKE ? OR LOWER(kode_risiko) LIKE ?', [$term, $term]))
                ->orWhereHas('itemOpd', fn ($item) => $item->whereRaw('LOWER(pernyataan_risiko) LIKE ? OR LOWER(kode_risiko) LIKE ?', [$term, $term]))
                ->orWhereHas('itemOperasional', fn ($item) => $item->whereRaw('LOWER(pernyataan_risiko) LIKE ? OR LOWER(kode_risiko) LIKE ?', [$term, $term])));
        }

        $results = $query->paginate($perPage, ['*'], 'page', $page);

        return [
            'data' => RootCauseAnalysisResource::collection($results->getCollection()),
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
        $permissions = ['identifikasi_risiko_pemda.view', 'identifikasi_risiko_opd.view', 'identifikasi_risiko_opd_operasional.view', 'review_risiko.view'];
        if (! $user->canAny($permissions)) {
            return false;
        }

        return $user->hasRole(['Superadmin', 'Admin Office', 'Inspektorat', 'Auditor'])
            || (string) $user->opd_id === $opdId;
    }

    public function authorizeEdit(User $user, string $opdId): bool
    {
        $permissions = ['identifikasi_risiko_pemda.edit', 'identifikasi_risiko_opd.edit', 'identifikasi_risiko_opd_operasional.edit'];
        if (! $user->canAny($permissions)) {
            return false;
        }

        return $user->hasRole(['Superadmin', 'Admin Office'])
            || (string) $user->opd_id === $opdId;
    }

    public function getDownstreamFormCodes(): array
    {
        return ['4', '5', '6'];
    }

    public function getLaporanData(Opd $opd, PeriodePenilaian $periode, User $user): array
    {
        $rcaItems = $this->rcaService
            ->queryRcaByOpd((string) $opd->id, (string) $periode->id)
            ->orderBy('id')
            ->get();

        return [
            'raw' => RootCauseAnalysisResource::collection($rcaItems)->resolve(),
        ];
    }

    public function getExcelHeaders(): array
    {
        return [
            'No',
            'Asal Formulir',
            'Kode Risiko',
            'Pernyataan Risiko',
            'Why 1 (Gejala/Pemicu)',
            'Why 2',
            'Why 3',
            'Why 4',
            'Why 5',
            'Akar Penyebab (Root Cause)',
            'Jenis Penyebab',
            'Sumber Risiko',
            'Rencana Pengendalian',
        ];
    }

    public function getExcelRows(array $laporanData): iterable
    {
        $items = $laporanData['raw'] ?? [];

        if (empty($items)) {
            return [
                ['1', '-', '-', 'Belum ada data analisis akar masalah (RCA) untuk periode ini', '-', '-', '-', '-', '-', '-', '-', '-', '-'],
            ];
        }

        $no = 1;
        $rows = [];
        foreach ($items as $rca) {
            $item = $rca['item'] ?? [];
            $sourceType = strtoupper((string) ($rca['source_type'] ?? '3A'));

            $rows[] = [
                (string) ($item['nomor_urut'] ?? $no++),
                sprintf('Form %s', $sourceType),
                $item['kode_risiko'] ?? '-',
                $item['pernyataan_risiko'] ?? '-',
                $rca['why_1'] ?? '-',
                $rca['why_2'] ?? '-',
                $rca['why_3'] ?? '-',
                $rca['why_4'] ?? '-',
                $rca['why_5'] ?? '-',
                $rca['akar_penyebab'] ?? '-',
                $rca['jenis_penyebab'] ?? '-',
                $item['sifat_risiko'] ?? '-',
                $rca['kegiatan_pengendalian'] ?? '-',
            ];
        }

        return $rows;
    }
}
