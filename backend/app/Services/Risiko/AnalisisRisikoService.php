<?php

declare(strict_types=1);

namespace App\Services\Risiko;

use App\Models\Master\MasterSubUnsurSpip;
use App\Models\Risiko\AnalisisRisiko;
use App\Models\Risiko\IdentifikasiRisikoOpdItem;
use App\Models\Risiko\IdentifikasiRisikoOpdOperasionalItem;
use App\Models\User;
use App\Policies\Risiko\AnalisisRisikoPolicy;
use App\Services\Risiko\Pengajuan\PengajuanReadinessService;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class AnalisisRisikoService
{
    public const COMPLETE_SQL = "a.kriteria_kemungkinan IS NOT NULL AND a.kriteria_kemungkinan <> '' AND a.kriteria_dampak IS NOT NULL AND a.kriteria_dampak <> '' AND a.residual_kriteria_kemungkinan IS NOT NULL AND a.residual_kriteria_kemungkinan <> '' AND a.residual_kriteria_dampak IS NOT NULL AND a.residual_kriteria_dampak <> '' AND a.inheren_kemungkinan IS NOT NULL AND a.inheren_dampak IS NOT NULL AND a.residual_kemungkinan IS NOT NULL AND a.residual_dampak IS NOT NULL AND a.pengendalian_ada IS NOT NULL AND (a.pengendalian_ada = false OR (a.pengendalian_ada = true AND a.pengendalian_uraian IS NOT NULL AND a.pengendalian_uraian <> '' AND a.sub_unsur_spip_id IS NOT NULL AND a.pengendalian_memadai IS NOT NULL))";

    public function __construct(
        private readonly SkalaRisikoService $skala,
        private readonly AnalisisRisikoPolicy $policy,
        private readonly PengajuanReadinessService $readiness,
    ) {}

    public function list(string $opdId, string $periodeId, User $user, array $filters = []): array
    {
        abort_unless($this->policy->view($user, $opdId), 403);
        $complete = self::COMPLETE_SQL;
        $sources = [
            ['3b', 'identifikasi_risiko_opd_items', 'identifikasi_risiko_opds', 'identifikasi_risiko_opd_id', 'risiko_opd_item_id'],
            ['3c', 'identifikasi_risiko_opd_operasional_items', 'identifikasi_risiko_opd_operasionals', 'identifikasi_risiko_opd_operasional_id', 'risiko_operasional_item_id'],
        ];
        $queries = [];
        foreach ($sources as [$source, $itemTable, $docTable, $docKey, $analysisKey]) {
            $queries[] = DB::table($itemTable.' as i')
                ->join($docTable.' as d', 'd.id', '=', 'i.'.$docKey)
                ->leftJoin('analisis_risikos as a', 'a.'.$analysisKey, '=', 'i.id')
                ->where('d.opd_id', $opdId)->where('d.periode_penilaian_id', $periodeId)
                ->select('i.id', 'i.kode_risiko', 'i.pernyataan_risiko', 'i.kategori_risiko', 'i.pemilik_risiko', 'i.urutan', 'a.id as analysis_id')
                ->selectRaw('? as source', [$source])
                ->selectRaw('CASE WHEN '.$complete.' THEN 1 ELSE 0 END as complete')
                ->selectRaw($this->skala->sql('a.inheren_kemungkinan', 'a.inheren_dampak').' as skala_inheren')
                ->selectRaw($this->skala->sql('a.residual_kemungkinan', 'a.residual_dampak').' as skala_residual');
        }
        $base = $queries[0]->unionAll($queries[1]);
        $ranked = DB::query()->fromSub($base, 'risk_rows')->select('risk_rows.*')
            ->selectRaw('CASE WHEN complete = 1 THEN RANK() OVER (PARTITION BY source ORDER BY complete DESC, skala_residual DESC) ELSE NULL END as peringkat');
        $all = DB::query()->fromSub($ranked, 'ranked');
        $overallTotal = (clone $all)->count();
        $completeTotal = (clone $all)->where('complete', 1)->count();
        $filtered = clone $all;
        if (! empty($filters['source'])) {
            $filtered->where('source', $filters['source']);
        }
        if (! empty($filters['status'])) {
            $filtered->where('complete', $filters['status'] === 'complete' ? 1 : 0);
        }
        if ($search = trim($filters['search'] ?? '')) {
            $pattern = '%'.mb_strtolower($search).'%';
            $filtered->where(fn ($q) => $q->whereRaw('LOWER(kode_risiko) LIKE ?', [$pattern])->orWhereRaw('LOWER(pernyataan_risiko) LIKE ?', [$pattern]));
        }
        $page = (int) ($filters['page'] ?? 1);
        $perPage = (int) ($filters['per_page'] ?? 20);
        $total = (clone $filtered)->count();
        $rows = $filtered->orderBy('source')->orderBy('urutan')->orderBy('id')->forPage($page, $perPage)->get();
        $analyses = AnalisisRisiko::with('subUnsur:id,nama')->whereIn('id', $rows->pluck('analysis_id')->filter())->get()->keyBy('id');
        $items = $rows->map(function ($row) use ($analyses) {
            $analysis = $analyses->get($row->analysis_id);

            return [
                'id' => $row->id, 'source' => $row->source, 'kode_risiko' => $row->kode_risiko,
                'pernyataan_risiko' => $row->pernyataan_risiko, 'kategori_risiko' => $row->kategori_risiko,
                'pemilik_risiko' => $row->pemilik_risiko, 'analysis' => $analysis,
                'skala_inheren' => $row->skala_inheren === null ? null : (int) $row->skala_inheren,
                'skala_residual' => $row->skala_residual === null ? null : (int) $row->skala_residual,
                'peringkat' => $row->peringkat === null ? null : (int) $row->peringkat,
                'complete' => (bool) $row->complete,
                'evaluasi' => $row->complete ? $this->skala->evaluasi((int) $row->skala_residual) : null,
            ];
        })->all();

        return [
            'items' => $items,
            'sub_unsur_spip' => MasterSubUnsurSpip::where('is_active', true)->orderBy('urutan')->get(['id', 'nama']),
            'pagination' => ['current_page' => $page, 'last_page' => max(1, (int) ceil($total / $perPage)), 'per_page' => $perPage, 'total' => $total, 'overall_total' => $overallTotal, 'complete_total' => $completeTotal],
        ];
    }

    public function save(string $source, string $itemId, array $data, User $user): AnalisisRisiko
    {
        $model = $source === '3b' ? IdentifikasiRisikoOpdItem::class : IdentifikasiRisikoOpdOperasionalItem::class;
        $item = $model::with('dokumen')->findOrFail($itemId);
        $opdId = (string) $item->dokumen->opd_id;
        abort_unless($this->policy->edit($user, $opdId, $source), 403);
        $this->readiness->assertOpdCanEdit($opdId, (string) $item->dokumen->periode_penilaian_id, $user, '4');
        $readiness = $this->readiness->checkReadiness($opdId, (string) $item->dokumen->periode_penilaian_id, $user);
        if (! $readiness['is_rca_complete']) {
            throw ValidationException::withMessages(['rca' => 'Lengkapi RCA sebelum mengisi Form 4.']);
        }
        $column = $source === '3b' ? 'risiko_opd_item_id' : 'risiko_operasional_item_id';
        if (array_key_exists('pengendalian_ada', $data) && $data['pengendalian_ada'] !== null) {
            $data['pengendalian_ada'] = (bool) $data['pengendalian_ada'];
        }
        if (array_key_exists('pengendalian_ada', $data) && $data['pengendalian_ada'] === false) {
            $data['pengendalian_uraian'] = null;
            $data['sub_unsur_spip_id'] = null;
            $data['pengendalian_memadai'] = null;
        }

        return DB::transaction(fn () => AnalisisRisiko::updateOrCreate([$column => $itemId], $data));
    }
}
