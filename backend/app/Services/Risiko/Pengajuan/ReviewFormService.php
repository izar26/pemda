<?php

declare(strict_types=1);

namespace App\Services\Risiko\Pengajuan;

use App\Models\Risiko\IdentifikasiRisikoOpd;
use App\Models\Risiko\IdentifikasiRisikoOpdOperasional;
use App\Models\Risiko\IdentifikasiRisikoPemda;
use App\Models\Risiko\KonteksOperasional;
use App\Models\Risiko\PengajuanPenilaianRisiko;
use App\Services\Risiko\KonteksPenilaianService;
use App\Services\Risiko\RootCauseAnalysisService;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;

class ReviewFormService
{
    public function __construct(
        private readonly KonteksPenilaianService $konteksService,
        private readonly RootCauseAnalysisService $rcaService,
    ) {}

    public function getForm(PengajuanPenilaianRisiko $submission, string $form, int $page = 1, int $perPage = 20, ?string $search = null, ?string $source = null, ?string $status = null): array
    {
        $opd = (string) $submission->opd_id;
        $periode = (string) $submission->periode_penilaian_id;
        if (in_array($form, ['3a', '3b', '3c'], true)) {
            $model = match ($form) {
                '3a' => IdentifikasiRisikoPemda::class,
                '3b' => IdentifikasiRisikoOpd::class,
                '3c' => IdentifikasiRisikoOpdOperasional::class,
            };
            $document = $model::where('opd_id', $opd)->where('periode_penilaian_id', $periode)
                ->with(['opd', 'periode', 'urusanPemerintahan'])->first();
            if (! $document) {
                return ['data' => null, 'meta' => null];
            }
            $relations = $form === '3c' ? ['subKegiatan.parent.parent', 'subKegiatan.indikators', 'rca'] : ['sasaran', 'indikator', 'rca'];
            $query = $document->items()->with($relations)->reorder()->orderBy('urutan')->orderBy('id');
            if ($search !== null && $search !== '') {
                $term = '%'.mb_strtolower($search).'%';
                $query->where(fn ($q) => $q->whereRaw('LOWER(kode_risiko) LIKE ?', [$term])->orWhereRaw('LOWER(pernyataan_risiko) LIKE ?', [$term]));
            }
            $results = $query->paginate($perPage, ['*'], 'page', $page);
            $document->setRelation('items', $results->getCollection());

            return ['data' => $document, 'meta' => $this->pagination($results)];
        }
        if ($form === 'rca') {
            $query = $this->rcaService->queryRcaByOpd($opd, $periode)->orderBy('id');
            if ($source) {
                $relation = match ($source) {
                    '3a' => 'itemPemda', '3b' => 'itemOpd', '3c' => 'itemOperasional'
                };
                $query->whereHas($relation);
            }
            if ($status === 'complete') {
                $query->whereNotNull('akar_penyebab')->where('akar_penyebab', '!=', '')->whereNotNull('jenis_penyebab')->where('jenis_penyebab', '!=', '');
            } elseif ($status === 'incomplete') {
                $query->where(fn ($q) => $q->whereNull('akar_penyebab')->orWhere('akar_penyebab', '')->orWhereNull('jenis_penyebab')->orWhere('jenis_penyebab', ''));
            }
            if ($search !== null && $search !== '') {
                $term = '%'.mb_strtolower($search).'%';
                $query->where(fn ($q) => $q->whereHas('itemPemda', fn ($item) => $item->whereRaw('LOWER(pernyataan_risiko) LIKE ? OR LOWER(kode_risiko) LIKE ?', [$term, $term]))
                    ->orWhereHas('itemOpd', fn ($item) => $item->whereRaw('LOWER(pernyataan_risiko) LIKE ? OR LOWER(kode_risiko) LIKE ?', [$term, $term]))
                    ->orWhereHas('itemOperasional', fn ($item) => $item->whereRaw('LOWER(pernyataan_risiko) LIKE ? OR LOWER(kode_risiko) LIKE ?', [$term, $term])));
            }
            $results = $query->paginate($perPage, ['*'], 'page', $page);

            return ['data' => $results->getCollection(), 'meta' => $this->pagination($results)];
        }
        $data = match ($form) {
            '2b' => $this->konteksService->getKonteksByOpd($opd, $periode),
            '2c' => KonteksOperasional::where('opd_id', $opd)->where('periode_penilaian_id', $periode)
                ->with(['opd', 'periode', 'sumberData', 'konteksStrategis.tujuan', 'programs.indikators', 'programs.children.indikators', 'programs.children.children.indikators'])->first(),
            default => abort(404),
        };

        return ['data' => $data, 'meta' => null];
    }

    private function pagination(LengthAwarePaginator $results): array
    {
        return ['current_page' => $results->currentPage(), 'last_page' => $results->lastPage(), 'per_page' => $results->perPage(), 'total' => $results->total()];
    }
}
