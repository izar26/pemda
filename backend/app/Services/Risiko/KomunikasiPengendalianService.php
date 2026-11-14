<?php

declare(strict_types=1);

namespace App\Services\Risiko;

use App\Models\Perencanaan\PeriodePenilaian;
use App\Models\Risiko\IdentifikasiRisikoOpdItem;
use App\Models\Risiko\IdentifikasiRisikoOpdOperasionalItem;
use App\Models\Risiko\KomunikasiPengendalianRisiko;
use App\Models\Risiko\PengajuanPenilaianRisiko;
use App\Models\User;
use App\Policies\Risiko\AnalisisRisikoPolicy;
use App\Services\Risiko\Pengajuan\PengajuanReadinessService;
use Illuminate\Database\Query\Builder;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class KomunikasiPengendalianService
{
    public function __construct(
        private readonly SkalaRisikoService $skala,
        private readonly AnalisisRisikoPolicy $policy,
    ) {}

    public function query(string $opdId, string $periodeId): Builder
    {
        $queries = [];
        foreach ([
            ['3b', 'identifikasi_risiko_opd_items', 'identifikasi_risiko_opds', 'identifikasi_risiko_opd_id', 'risiko_opd_item_id'],
            ['3c', 'identifikasi_risiko_opd_operasional_items', 'identifikasi_risiko_opd_operasionals', 'identifikasi_risiko_opd_operasional_id', 'risiko_operasional_item_id'],
        ] as [$source, $items, $documents, $documentKey, $analysisKey]) {
            $queries[] = DB::table($items.' as i')
                ->join($documents.' as d', 'd.id', '=', 'i.'.$documentKey)
                ->join('analisis_risikos as a', 'a.'.$analysisKey, '=', 'i.id')
                ->leftJoin('tindak_pengendalian_risikos as t', 't.analisis_risiko_id', '=', 'a.id')
                ->leftJoin('komunikasi_pengendalian_risikos as k', 'k.analisis_risiko_id', '=', 'a.id')
                ->where('d.opd_id', $opdId)->where('d.periode_penilaian_id', $periodeId)
                ->whereRaw(AnalisisRisikoService::COMPLETE_SQL)
                ->select(
                    'i.id',
                    'i.kode_risiko',
                    'i.pernyataan_risiko',
                    'i.kategori_risiko',
                    'i.pemilik_risiko',
                    'i.uraian_dampak',
                    'i.urutan',
                    'a.id as analysis_id',
                    'a.rencana_tindak',
                    't.target_waktu',
                    'k.id as komunikasi_id',
                    'k.media_komunikasi',
                    'k.penyedia_informasi',
                    'k.penerima_informasi',
                    DB::raw('COALESCE(k.rencana_waktu, t.target_waktu) as rencana_waktu'),
                    'k.realisasi_waktu',
                    'k.keterangan'
                )
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
            $complete = "TRIM(COALESCE(media_komunikasi, '')) <> '' AND TRIM(COALESCE(penyedia_informasi, '')) <> '' AND TRIM(COALESCE(penerima_informasi, '')) <> '' AND TRIM(COALESCE(rencana_waktu, '')) <> ''";
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
        foreach (['media_komunikasi', 'penyedia_informasi', 'penerima_informasi', 'rencana_waktu'] as $field) {
            if (trim((string) ($row[$field] ?? '')) === '') {
                return false;
            }
        }

        return true;
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
        $readiness->assertOpdCanEdit($opdId, $periodeId, $user, '8');
        if (! $readiness->checkReadiness($opdId, $periodeId, $user)['is_6_complete']) {
            throw ValidationException::withMessages(['form6' => 'Lengkapi Form 6 sebelum mengisi Form 8.']);
        }

        DB::transaction(function () use ($opdId, $periodeId, $source, $itemId, $data, $user, $readiness) {
            $submission = PengajuanPenilaianRisiko::where('opd_id', $opdId)->where('periode_penilaian_id', $periodeId)->lockForUpdate()->first();
            $readiness->assertOpdCanEdit($opdId, $periodeId, $user, '8');
            if ($submission && ($submission->submitted_at !== null || $submission->status !== PengajuanPenilaianRisiko::STATUS_DRAFT) && ! $submission->items()->where('form_code', '8')->exists()) {
                throw ValidationException::withMessages(['form8' => 'Form 8 tidak termasuk dalam pengajuan ini.']);
            }
            $risk = $this->query($opdId, $periodeId)->where('source', $source)->where('id', $itemId)->first();
            if (! $risk) {
                throw ValidationException::withMessages(['risiko' => 'Risiko ini tidak termasuk risiko prioritas.']);
            }

            $rencanaWaktu = array_key_exists('rencana_waktu', $data) && $data['rencana_waktu'] !== null && trim((string) $data['rencana_waktu']) !== ''
                ? $data['rencana_waktu']
                : ($risk->target_waktu ?? null);

            KomunikasiPengendalianRisiko::updateOrCreate(
                ['analisis_risiko_id' => $risk->analysis_id],
                [
                    'media_komunikasi' => $data['media_komunikasi'] ?? null,
                    'penyedia_informasi' => $data['penyedia_informasi'] ?? null,
                    'penerima_informasi' => $data['penerima_informasi'] ?? null,
                    'rencana_waktu' => $rencanaWaktu,
                    'realisasi_waktu' => $data['realisasi_waktu'] ?? null,
                    'keterangan' => $data['keterangan'] ?? null,
                ]
            );
        });

        $row = $this->query($opdId, $periodeId)->where('source', $source)->where('id', $itemId)->first();
        $row->complete = self::isComplete((array) $row);

        return $row;
    }
}
