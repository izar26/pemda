<?php

declare(strict_types=1);

namespace App\Services\Risiko;

use App\Models\Opd;
use App\Models\Perencanaan\PeriodePenilaian;
use App\Models\User;
use App\Policies\Risiko\AnalisisRisikoPolicy;
use Illuminate\Support\Facades\DB;

class PetaRisikoService
{
    public const LABELS_KEMUNGKINAN = [
        1 => 'Hampir tidak terjadi',
        2 => 'Jarang terjadi',
        3 => 'Kadang terjadi',
        4 => 'Sering terjadi',
        5 => 'Hampir pasti terjadi',
    ];

    public const LABELS_DAMPAK = [
        1 => 'Tidak Signifikan',
        2 => 'Minor',
        3 => 'Moderat',
        4 => 'Signifikan',
        5 => 'Sangat Signifikan',
    ];

    public function __construct(
        protected SkalaRisikoService $skala,
        protected AnalisisRisikoPolicy $policy
    ) {}

    /**
     * Generate complete 5x5 matrix analysis and zone breakdown.
     *
     * @param  array<string, mixed>  $filters
     * @return array<string, mixed>
     */
    public function generate(string $opdId, string $periodeId, User $user, array $filters = []): array
    {
        abort_unless($this->policy->view($user, $opdId), 403);

        $opd = Opd::select(['id', 'nama', 'kode'])->find($opdId);
        $periode = PeriodePenilaian::select(['id', 'nama_periode', 'tahun_penilaian'])->find($periodeId);

        // 1. Fetch Inherent & Residual risk items
        $sources = [
            ['3b', 'identifikasi_risiko_opd_items', 'identifikasi_risiko_opds', 'identifikasi_risiko_opd_id', 'risiko_opd_item_id'],
            ['3c', 'identifikasi_risiko_opd_operasional_items', 'identifikasi_risiko_opd_operasionals', 'identifikasi_risiko_opd_operasional_id', 'risiko_operasional_item_id'],
        ];

        $queries = [];
        foreach ($sources as [$source, $itemTable, $docTable, $docKey, $analysisKey]) {
            $queries[] = DB::table($itemTable.' as i')
                ->join($docTable.' as d', 'd.id', '=', 'i.'.$docKey)
                ->join('analisis_risikos as a', 'a.'.$analysisKey, '=', 'i.id')
                ->where('d.opd_id', $opdId)
                ->where('d.periode_penilaian_id', $periodeId)
                ->whereNotNull('a.inheren_kemungkinan')
                ->whereNotNull('a.inheren_dampak')
                ->whereNotNull('a.residual_kemungkinan')
                ->whereNotNull('a.residual_dampak')
                ->select([
                    'i.id',
                    'i.kode_risiko',
                    'i.pernyataan_risiko',
                    'i.kategori_risiko',
                    'i.pemilik_risiko',
                    'i.urutan',
                    'a.id as analysis_id',
                    'a.inheren_kemungkinan',
                    'a.inheren_dampak',
                    'a.residual_kemungkinan',
                    'a.residual_dampak',
                ])
                ->selectRaw('? as source', [$source])
                ->selectRaw($this->skala->sql('a.inheren_kemungkinan', 'a.inheren_dampak').' as skala_inheren')
                ->selectRaw($this->skala->sql('a.residual_kemungkinan', 'a.residual_dampak').' as skala_residual');
        }

        $allRisksQuery = DB::query()->fromSub($queries[0]->unionAll($queries[1]), 'all_risks');

        if (! empty($filters['source'])) {
            $allRisksQuery->where('source', $filters['source']);
        }

        $rawRisks = $allRisksQuery->orderBy('source')->orderBy('urutan')->orderBy('id')->get();

        // 2. Fetch Treated risk items from Form 6 (priority risks with completed treated scores)
        $treatedQueries = [];
        foreach ([
            ['3b', 'identifikasi_risiko_opd_items', 'identifikasi_risiko_opds', 'identifikasi_risiko_opd_id', 'risiko_opd_item_id'],
            ['3c', 'identifikasi_risiko_opd_operasional_items', 'identifikasi_risiko_opd_operasionals', 'identifikasi_risiko_opd_operasional_id', 'risiko_operasional_item_id'],
        ] as [$source, $itemTable, $docTable, $docKey, $analysisKey]) {
            $treatedQueries[] = DB::table($itemTable.' as i')
                ->join($docTable.' as d', 'd.id', '=', 'i.'.$docKey)
                ->join('analisis_risikos as a', 'a.'.$analysisKey, '=', 'i.id')
                ->join('tindak_pengendalian_risikos as t', 't.analisis_risiko_id', '=', 'a.id')
                ->where('d.opd_id', $opdId)
                ->where('d.periode_penilaian_id', $periodeId)
                ->whereNotNull('t.treated_kemungkinan')
                ->whereNotNull('t.treated_dampak')
                ->select([
                    'i.id',
                    'i.kode_risiko',
                    'i.pernyataan_risiko',
                    'i.kategori_risiko',
                    'i.pemilik_risiko',
                    'i.urutan',
                    'a.id as analysis_id',
                    'a.rencana_tindak',
                    't.celah_pengendalian',
                    't.penanggung_jawab',
                    't.target_waktu',
                    't.treated_kemungkinan',
                    't.treated_dampak',
                ])
                ->selectRaw('? as source', [$source])
                ->selectRaw($this->skala->sql('a.residual_kemungkinan', 'a.residual_dampak').' as skala_residual')
                ->selectRaw($this->skala->sql('t.treated_kemungkinan', 't.treated_dampak').' as skala_treated');
        }

        $treatedRisksQuery = DB::query()->fromSub($treatedQueries[0]->unionAll($treatedQueries[1]), 'treated_risks');

        if (! empty($filters['source'])) {
            $treatedRisksQuery->where('source', $filters['source']);
        }

        $rawTreated = $treatedRisksQuery->orderBy('source')->orderBy('urutan')->orderBy('id')->get();

        // 3. Build 5x5 Matrix Grid (k from 5 down to 1, d from 1 to 5)
        $matrixTemplate = [];
        for ($k = 5; $k >= 1; $k--) {
            for ($d = 1; $d <= 5; $d++) {
                $score = $this->skala->hitung($k, $d) ?? 0;
                $zona = $this->skala->zona($score) ?? SkalaRisikoService::ZONA_HIJAU_TUA;
                $matrixTemplate["{$k}_{$d}"] = [
                    'kemungkinan' => $k,
                    'kemungkinan_label' => self::LABELS_KEMUNGKINAN[$k],
                    'dampak' => $d,
                    'dampak_label' => self::LABELS_DAMPAK[$d],
                    'score' => $score,
                    'zona' => $zona,
                ];
            }
        }

        // 4. Populate Inherent Matrix
        $inherentCells = [];
        $inherentZoneCounts = array_fill_keys(array_keys(SkalaRisikoService::ZONA_CONFIG), 0);
        foreach ($matrixTemplate as $key => $cell) {
            $matching = $rawRisks->filter(fn ($r) => (int) $r->inheren_kemungkinan === $cell['kemungkinan'] && (int) $r->inheren_dampak === $cell['dampak']);
            $count = $matching->count();
            $inherentZoneCounts[$cell['zona']] += $count;

            $inherentCells[] = array_merge($cell, [
                'count' => $count,
                'items' => $matching->map(fn ($r) => [
                    'id' => $r->id,
                    'source' => $r->source,
                    'kode_risiko' => $r->kode_risiko,
                    'pernyataan_risiko' => $r->pernyataan_risiko,
                    'kategori_risiko' => $r->kategori_risiko,
                    'pemilik_risiko' => $r->pemilik_risiko,
                    'kemungkinan' => (int) $r->inheren_kemungkinan,
                    'dampak' => (int) $r->inheren_dampak,
                    'skala' => (int) $r->skala_inheren,
                    'zona' => $cell['zona'],
                ])->values()->all(),
            ]);
        }

        // 5. Populate Residual Matrix
        $residualCells = [];
        $residualZoneCounts = array_fill_keys(array_keys(SkalaRisikoService::ZONA_CONFIG), 0);
        foreach ($matrixTemplate as $key => $cell) {
            $matching = $rawRisks->filter(fn ($r) => (int) $r->residual_kemungkinan === $cell['kemungkinan'] && (int) $r->residual_dampak === $cell['dampak']);
            $count = $matching->count();
            $residualZoneCounts[$cell['zona']] += $count;

            $residualCells[] = array_merge($cell, [
                'count' => $count,
                'items' => $matching->map(fn ($r) => [
                    'id' => $r->id,
                    'source' => $r->source,
                    'kode_risiko' => $r->kode_risiko,
                    'pernyataan_risiko' => $r->pernyataan_risiko,
                    'kategori_risiko' => $r->kategori_risiko,
                    'pemilik_risiko' => $r->pemilik_risiko,
                    'kemungkinan' => (int) $r->residual_kemungkinan,
                    'dampak' => (int) $r->residual_dampak,
                    'skala' => (int) $r->skala_residual,
                    'zona' => $cell['zona'],
                ])->values()->all(),
            ]);
        }

        // 6. Populate Treated Matrix
        $treatedCells = [];
        $treatedZoneCounts = array_fill_keys(array_keys(SkalaRisikoService::ZONA_CONFIG), 0);
        foreach ($matrixTemplate as $key => $cell) {
            $matching = $rawTreated->filter(fn ($r) => (int) $r->treated_kemungkinan === $cell['kemungkinan'] && (int) $r->treated_dampak === $cell['dampak']);
            $count = $matching->count();
            $treatedZoneCounts[$cell['zona']] += $count;

            $treatedCells[] = array_merge($cell, [
                'count' => $count,
                'items' => $matching->map(fn ($r) => [
                    'id' => $r->id,
                    'source' => $r->source,
                    'kode_risiko' => $r->kode_risiko,
                    'pernyataan_risiko' => $r->pernyataan_risiko,
                    'kategori_risiko' => $r->kategori_risiko,
                    'pemilik_risiko' => $r->pemilik_risiko,
                    'kemungkinan' => (int) $r->treated_kemungkinan,
                    'dampak' => (int) $r->treated_dampak,
                    'skala' => (int) $r->skala_treated,
                    'rencana_tindak' => $r->rencana_tindak,
                    'penanggung_jawab' => $r->penanggung_jawab,
                    'target_waktu' => $r->target_waktu,
                    'zona' => $cell['zona'],
                ])->values()->all(),
            ]);
        }

        // 7. Zone Summary Table (Rekapitulasi)
        $rekapitulasi = [];
        foreach (SkalaRisikoService::ZONA_CONFIG as $zoneKey => $cfg) {
            $rekapitulasi[] = [
                'zona' => $zoneKey,
                'label' => $cfg['label'],
                'short_label' => $cfg['short_label'],
                'skor_range' => $cfg['range'],
                'color' => $cfg['color'],
                'bg_class' => $cfg['bg_class'],
                'inherent_count' => $inherentZoneCounts[$zoneKey],
                'residual_count' => $residualZoneCounts[$zoneKey],
                'treated_count' => $treatedZoneCounts[$zoneKey],
            ];
        }

        return [
            'opd' => $opd,
            'periode' => $periode,
            'matrices' => [
                'inherent' => [
                    'cells' => $inherentCells,
                    'total_risks' => $rawRisks->count(),
                ],
                'residual' => [
                    'cells' => $residualCells,
                    'total_risks' => $rawRisks->count(),
                ],
                'treated' => [
                    'cells' => $treatedCells,
                    'total_risks' => $rawTreated->count(),
                ],
            ],
            'rekapitulasi' => $rekapitulasi,
            'total_all' => [
                'inherent' => $rawRisks->count(),
                'residual' => $rawRisks->count(),
                'treated' => $rawTreated->count(),
            ],
        ];
    }
}
