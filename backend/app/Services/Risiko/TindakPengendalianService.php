<?php

declare(strict_types=1);

namespace App\Services\Risiko;

use App\Models\Perencanaan\PeriodePenilaian;
use App\Models\Risiko\AnalisisRisiko;
use App\Models\Risiko\IdentifikasiRisikoOpdItem;
use App\Models\Risiko\IdentifikasiRisikoOpdOperasionalItem;
use App\Models\Risiko\PengajuanPenilaianRisiko;
use App\Models\Risiko\TindakPengendalianRisiko;
use App\Models\User;
use App\Policies\Risiko\AnalisisRisikoPolicy;
use App\Services\Risiko\Pengajuan\PengajuanReadinessService;
use Illuminate\Database\Query\Builder;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class TindakPengendalianService
{
    public function __construct(
        private readonly SkalaRisikoService $skala,
        private readonly AnalisisRisikoPolicy $policy,
    ) {}

    public function query(string $opdId, string $periodeId): Builder
    {
        $queries = [];
        foreach ([
            ['3b', 'identifikasi_risiko_opd_items', 'identifikasi_risiko_opds', 'identifikasi_risiko_opd_id', 'risiko_opd_item_id', 'identifikasi_risiko_opd_item_id'],
            ['3c', 'identifikasi_risiko_opd_operasional_items', 'identifikasi_risiko_opd_operasionals', 'identifikasi_risiko_opd_operasional_id', 'risiko_operasional_item_id', 'identifikasi_risiko_opd_operasional_item_id'],
        ] as [$source, $items, $documents, $documentKey, $analysisKey, $rcaKey]) {
            $queries[] = DB::table($items.' as i')
                ->join($documents.' as d', 'd.id', '=', 'i.'.$documentKey)
                ->join('analisis_risikos as a', 'a.'.$analysisKey, '=', 'i.id')
                ->leftJoin('root_cause_analyses as r', 'r.'.$rcaKey, '=', 'i.id')
                ->leftJoin('tindak_pengendalian_risikos as t', 't.analisis_risiko_id', '=', 'a.id')
                ->where('d.opd_id', $opdId)->where('d.periode_penilaian_id', $periodeId)
                ->whereRaw(AnalisisRisikoService::COMPLETE_SQL)
                ->select('i.id', 'i.kode_risiko', 'i.pernyataan_risiko', 'i.kategori_risiko', 'i.pemilik_risiko', 'i.uraian_dampak', 'i.urutan', 'a.id as analysis_id', 'a.pengendalian_uraian', 'a.rencana_tindak', 'r.akar_penyebab', 't.celah_pengendalian', 't.penanggung_jawab', 't.target_waktu', 't.treated_kemungkinan', 't.treated_dampak')
                ->selectRaw('? as source', [$source])
                ->selectRaw($this->skala->sql('a.residual_kemungkinan', 'a.residual_dampak').' as skala_residual')
                ->selectRaw($this->skala->sql('t.treated_kemungkinan', 't.treated_dampak').' as skala_treated');
        }

        return DB::query()->fromSub($queries[0]->unionAll($queries[1]), 'risiko_prioritas')
            ->where('skala_residual', '>', 9);
    }

    public function list(string $opdId, string $periodeId, User $user, array $filters = []): array
    {
        abort_unless($this->policy->view($user, $opdId), 403);
        $query = $this->query($opdId, $periodeId);
        if (! empty($filters['source'])) {
            $query->where('source', $filters['source']);
        }
        if ($search = trim($filters['search'] ?? '')) {
            $pattern = '%'.mb_strtolower($search).'%';
            $query->where(fn ($q) => $q->whereRaw('LOWER(kode_risiko) LIKE ?', [$pattern])->orWhereRaw('LOWER(pernyataan_risiko) LIKE ?', [$pattern]));
        }
        if (! empty($filters['status'])) {
            $complete = "TRIM(COALESCE(celah_pengendalian, '')) <> '' AND TRIM(COALESCE(rencana_tindak, '')) <> '' AND TRIM(COALESCE(penanggung_jawab, '')) <> '' AND TRIM(COALESCE(target_waktu, '')) <> '' AND treated_kemungkinan IS NOT NULL AND treated_dampak IS NOT NULL";
            $query->whereRaw($filters['status'] === 'complete' ? "($complete)" : "NOT ($complete)");
        }
        $page = (int) ($filters['page'] ?? 1);
        $perPage = (int) ($filters['per_page'] ?? 20);
        $total = (clone $query)->count();
        $rows = $query->orderBy('source')->orderByDesc('skala_residual')->orderBy('urutan')->orderBy('id')->forPage($page, $perPage)->get();
        $rows->each(fn ($row) => $row->complete = self::isComplete((array) $row));

        return ['items' => $rows, 'pagination' => [
            'current_page' => $page, 'per_page' => $perPage, 'total' => $total, 'last_page' => max(1, (int) ceil($total / $perPage)),
        ]];
    }

    public static function isComplete(array $row): bool
    {
        foreach (['celah_pengendalian', 'rencana_tindak', 'penanggung_jawab', 'target_waktu'] as $field) {
            if (trim((string) ($row[$field] ?? '')) === '') {
                return false;
            }
        }

        return ($row['treated_kemungkinan'] ?? null) !== null && ($row['treated_dampak'] ?? null) !== null;
    }

    public function save(string $source, string $itemId, array $data, User $user): object
    {
        $model = $source === '3b' ? IdentifikasiRisikoOpdItem::class : IdentifikasiRisikoOpdOperasionalItem::class;
        $item = $model::with('dokumen')->findOrFail($itemId);
        $opdId = (string) $item->dokumen->opd_id;
        $periodeId = (string) $item->dokumen->periode_penilaian_id;
        abort_unless($this->policy->edit($user, $opdId, $source), 403);
        if (! PeriodePenilaian::whereKey($periodeId)->where('status', 'aktif')->exists()) {
            throw ValidationException::withMessages(['periode' => 'Periode penilaian tidak aktif.']);
        }
        $readiness = app(PengajuanReadinessService::class);
        $readiness->assertOpdCanEdit($opdId, $periodeId, $user, '6');
        if (! $readiness->checkReadiness($opdId, $periodeId, $user)['is_4_complete']) {
            throw ValidationException::withMessages(['form4' => 'Lengkapi Form 4 sebelum mengisi Form 6.']);
        }
        DB::transaction(function () use ($opdId, $periodeId, $source, $itemId, $data, $user, $readiness) {
            $submission = PengajuanPenilaianRisiko::where('opd_id', $opdId)->where('periode_penilaian_id', $periodeId)->lockForUpdate()->first();
            $readiness->assertOpdCanEdit($opdId, $periodeId, $user, '6');
            if ($submission && ($submission->submitted_at !== null || $submission->status !== PengajuanPenilaianRisiko::STATUS_DRAFT) && ! $submission->items()->where('form_code', '6')->exists()) {
                throw ValidationException::withMessages(['form6' => 'Form 6 tidak termasuk dalam pengajuan ini.']);
            }
            $risk = $this->query($opdId, $periodeId)->where('source', $source)->where('id', $itemId)->first();
            if (! $risk) {
                throw ValidationException::withMessages(['risiko' => 'Risiko ini tidak termasuk risiko prioritas.']);
            }
            $analysis = AnalisisRisiko::lockForUpdate()->findOrFail($risk->analysis_id);
            if (array_key_exists('rencana_tindak', $data)) {
                $analysis->update(['rencana_tindak' => $data['rencana_tindak']]);
            }
            unset($data['rencana_tindak']);
            TindakPengendalianRisiko::updateOrCreate(['analisis_risiko_id' => $analysis->id], $data);
        });
        $row = $this->query($opdId, $periodeId)->where('source', $source)->where('id', $itemId)->first();
        $row->complete = self::isComplete((array) $row);

        return $row;
    }
}
