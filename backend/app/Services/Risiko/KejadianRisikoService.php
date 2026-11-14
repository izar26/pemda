<?php

declare(strict_types=1);

namespace App\Services\Risiko;

use App\Models\Perencanaan\PeriodePenilaian;
use App\Models\Risiko\IdentifikasiRisikoOpdItem;
use App\Models\Risiko\IdentifikasiRisikoOpdOperasionalItem;
use App\Models\Risiko\IdentifikasiRisikoPemdaItem;
use App\Models\Risiko\PencatatanKejadianRisiko;
use App\Models\Risiko\PengajuanPenilaianRisiko;
use App\Models\Risiko\StatusKejadianRisikoOpd;
use App\Models\User;
use App\Policies\Risiko\AnalisisRisikoPolicy;
use App\Services\Risiko\Pengajuan\PengajuanReadinessService;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class KejadianRisikoService
{
    public function __construct(
        protected AnalisisRisikoPolicy $policy,
        protected PengajuanReadinessService $readiness
    ) {}

    public function list(string $opdId, string $periodeId, User $user, array $filters = []): array
    {
        abort_unless($this->policy->view($user, $opdId), 403);

        $query = PencatatanKejadianRisiko::query()
            ->with([
                'itemPemda',
                'itemOpd.analisis.tindakPengendalian',
                'itemOperasional.analisis.tindakPengendalian',
            ])
            ->where('opd_id', $opdId)
            ->where('periode_penilaian_id', $periodeId);

        if (! empty($filters['source'])) {
            $query->where('source_type', $filters['source']);
        }

        if ($search = trim($filters['search'] ?? '')) {
            $pattern = '%'.mb_strtolower($search).'%';
            $query->where(function (Builder $q) use ($pattern) {
                $q->whereRaw('LOWER(sebab) LIKE ?', [$pattern])
                    ->orWhereRaw('LOWER(dampak) LIKE ?', [$pattern])
                    ->orWhereRaw('LOWER(COALESCE(keterangan, \'\')) LIKE ?', [$pattern])
                    ->orWhereHas('itemPemda', fn (Builder $sub) => $sub->whereRaw('LOWER(kode_risiko) LIKE ?', [$pattern])->orWhereRaw('LOWER(pernyataan_risiko) LIKE ?', [$pattern]))
                    ->orWhereHas('itemOpd', fn (Builder $sub) => $sub->whereRaw('LOWER(kode_risiko) LIKE ?', [$pattern])->orWhereRaw('LOWER(pernyataan_risiko) LIKE ?', [$pattern]))
                    ->orWhereHas('itemOperasional', fn (Builder $sub) => $sub->whereRaw('LOWER(kode_risiko) LIKE ?', [$pattern])->orWhereRaw('LOWER(pernyataan_risiko) LIKE ?', [$pattern]));
            });
        }

        $page = (int) ($filters['page'] ?? 1);
        $perPage = (int) ($filters['per_page'] ?? 20);

        /** @var LengthAwarePaginator $paginated */
        $paginated = $query->orderBy('tanggal_kejadian', 'desc')
            ->orderBy('created_at', 'desc')
            ->paginate($perPage, ['*'], 'page', $page);

        $statusNihil = StatusKejadianRisikoOpd::query()
            ->with('confirmedBy')
            ->where('opd_id', $opdId)
            ->where('periode_penilaian_id', $periodeId)
            ->first();

        return [
            'items' => $paginated->items(),
            'meta' => [
                'current_page' => $paginated->currentPage(),
                'per_page' => $paginated->perPage(),
                'total' => $paginated->total(),
                'last_page' => $paginated->lastPage(),
            ],
            'is_nihil' => (bool) ($statusNihil?->is_nihil ?? false),
            'nihil_info' => $statusNihil && $statusNihil->is_nihil ? [
                'confirmed_by' => $statusNihil->confirmedBy?->name,
                'confirmed_at' => $statusNihil->confirmed_at?->toIso8601String(),
            ] : null,
            'is_complete' => $this->isComplete($opdId, $periodeId),
        ];
    }

    public function getRiskOptions(string $opdId, string $periodeId, User $user): array
    {
        abort_unless($this->policy->view($user, $opdId), 403);

        $pemdaItems = DB::table('identifikasi_risiko_pemda_items as i')
            ->join('identifikasi_risiko_pemdas as d', 'd.id', '=', 'i.identifikasi_risiko_pemda_id')
            ->where('d.opd_id', $opdId)
            ->where('d.periode_penilaian_id', $periodeId)
            ->select(
                'i.id',
                'i.kode_risiko',
                'i.pernyataan_risiko',
                'i.kategori_risiko',
                'i.pemilik_risiko',
                'i.uraian_dampak',
                DB::raw("'3a' as source_type"),
                DB::raw('NULL as rencana_tindak'),
                DB::raw('NULL as target_waktu'),
                DB::raw('0 as has_rtp')
            )
            ->get();

        $opdItems = DB::table('identifikasi_risiko_opd_items as i')
            ->join('identifikasi_risiko_opds as d', 'd.id', '=', 'i.identifikasi_risiko_opd_id')
            ->leftJoin('analisis_risikos as a', 'a.risiko_opd_item_id', '=', 'i.id')
            ->leftJoin('tindak_pengendalian_risikos as t', 't.analisis_risiko_id', '=', 'a.id')
            ->where('d.opd_id', $opdId)
            ->where('d.periode_penilaian_id', $periodeId)
            ->select(
                'i.id',
                'i.kode_risiko',
                'i.pernyataan_risiko',
                'i.kategori_risiko',
                'i.pemilik_risiko',
                'i.uraian_dampak',
                DB::raw("'3b' as source_type"),
                'a.rencana_tindak',
                't.target_waktu',
                DB::raw("CASE WHEN a.rencana_tindak IS NOT NULL AND TRIM(a.rencana_tindak) != '' THEN 1 ELSE 0 END as has_rtp")
            )
            ->get();

        $operasionalItems = DB::table('identifikasi_risiko_opd_operasional_items as i')
            ->join('identifikasi_risiko_opd_operasionals as d', 'd.id', '=', 'i.identifikasi_risiko_opd_operasional_id')
            ->leftJoin('analisis_risikos as a', 'a.risiko_operasional_item_id', '=', 'i.id')
            ->leftJoin('tindak_pengendalian_risikos as t', 't.analisis_risiko_id', '=', 'a.id')
            ->where('d.opd_id', $opdId)
            ->where('d.periode_penilaian_id', $periodeId)
            ->select(
                'i.id',
                'i.kode_risiko',
                'i.pernyataan_risiko',
                'i.kategori_risiko',
                'i.pemilik_risiko',
                'i.uraian_dampak',
                DB::raw("'3c' as source_type"),
                'a.rencana_tindak',
                't.target_waktu',
                DB::raw("CASE WHEN a.rencana_tindak IS NOT NULL AND TRIM(a.rencana_tindak) != '' THEN 1 ELSE 0 END as has_rtp")
            )
            ->get();

        return [
            'pemda' => $pemdaItems,
            'opd' => $opdItems,
            'operasional' => $operasionalItems,
            'all' => $pemdaItems->concat($opdItems)->concat($operasionalItems)->values(),
        ];
    }

    public function store(array $data, User $user): PencatatanKejadianRisiko
    {
        $opdId = (string) $data['opd_id'];
        $periodeId = (string) $data['periode_penilaian_id'];

        $this->assertUserCanEdit($user, $opdId);
        $this->readiness->assertOpdCanEdit($opdId, $periodeId, $user, '10');

        if (! PeriodePenilaian::whereKey($periodeId)->where('status', 'aktif')->exists()) {
            throw ValidationException::withMessages(['periode' => ['Periode penilaian tidak aktif.']]);
        }

        $sourceType = $data['source_type'];
        $riskItemId = $data['risk_item_id'];

        $this->validateRiskItemBelongsToOpd($sourceType, $riskItemId, $opdId, $periodeId);

        return DB::transaction(function () use ($opdId, $periodeId, $sourceType, $riskItemId, $data, $user) {
            $submission = PengajuanPenilaianRisiko::where('opd_id', $opdId)
                ->where('periode_penilaian_id', $periodeId)
                ->lockForUpdate()
                ->first();

            $this->readiness->assertOpdCanEdit($opdId, $periodeId, $user, '10');

            if ($submission && ($submission->submitted_at !== null || $submission->status !== PengajuanPenilaianRisiko::STATUS_DRAFT) && ! $submission->items()->where('form_code', '10')->exists()) {
                throw ValidationException::withMessages(['form10' => ['Form 10 tidak termasuk dalam pengajuan ini.']]);
            }

            $incident = PencatatanKejadianRisiko::create([
                'opd_id' => $opdId,
                'periode_penilaian_id' => $periodeId,
                'source_type' => $sourceType,
                'identifikasi_risiko_pemda_item_id' => $sourceType === '3a' ? $riskItemId : null,
                'identifikasi_risiko_opd_item_id' => $sourceType === '3b' ? $riskItemId : null,
                'identifikasi_risiko_opd_operasional_item_id' => $sourceType === '3c' ? $riskItemId : null,
                'tanggal_kejadian' => $data['tanggal_kejadian'],
                'sebab' => $data['sebab'],
                'dampak' => $data['dampak'],
                'keterangan' => $data['keterangan'] ?? null,
                'realisasi_waktu_rtp' => $data['realisasi_waktu_rtp'] ?? null,
                'keterangan_rtp' => $data['keterangan_rtp'] ?? null,
            ]);

            // Reset nihil status if an incident is logged
            StatusKejadianRisikoOpd::updateOrCreate(
                ['opd_id' => $opdId, 'periode_penilaian_id' => $periodeId],
                ['is_nihil' => false, 'confirmed_by' => null, 'confirmed_at' => null]
            );

            return $incident->fresh([
                'itemPemda',
                'itemOpd.analisis.tindakPengendalian',
                'itemOperasional.analisis.tindakPengendalian',
            ]);
        });
    }

    public function update(string $id, array $data, User $user): PencatatanKejadianRisiko
    {
        $incident = PencatatanKejadianRisiko::findOrFail($id);
        $opdId = (string) $incident->opd_id;
        $periodeId = (string) $incident->periode_penilaian_id;

        $this->assertUserCanEdit($user, $opdId);
        $this->readiness->assertOpdCanEdit($opdId, $periodeId, $user, '10');

        return DB::transaction(function () use ($incident, $opdId, $periodeId, $data, $user) {
            $submission = PengajuanPenilaianRisiko::where('opd_id', $opdId)
                ->where('periode_penilaian_id', $periodeId)
                ->lockForUpdate()
                ->first();

            $this->readiness->assertOpdCanEdit($opdId, $periodeId, $user, '10');

            if ($submission && ($submission->submitted_at !== null || $submission->status !== PengajuanPenilaianRisiko::STATUS_DRAFT) && ! $submission->items()->where('form_code', '10')->exists()) {
                throw ValidationException::withMessages(['form10' => ['Form 10 tidak termasuk dalam pengajuan ini.']]);
            }

            if (! empty($data['source_type']) && ! empty($data['risk_item_id'])) {
                $sourceType = $data['source_type'];
                $riskItemId = $data['risk_item_id'];
                $this->validateRiskItemBelongsToOpd($sourceType, $riskItemId, $opdId, $periodeId);

                $incident->source_type = $sourceType;
                $incident->identifikasi_risiko_pemda_item_id = $sourceType === '3a' ? $riskItemId : null;
                $incident->identifikasi_risiko_opd_item_id = $sourceType === '3b' ? $riskItemId : null;
                $incident->identifikasi_risiko_opd_operasional_item_id = $sourceType === '3c' ? $riskItemId : null;
            }

            if (array_key_exists('tanggal_kejadian', $data)) {
                $incident->tanggal_kejadian = $data['tanggal_kejadian'];
            }
            if (array_key_exists('sebab', $data)) {
                $incident->sebab = $data['sebab'];
            }
            if (array_key_exists('dampak', $data)) {
                $incident->dampak = $data['dampak'];
            }
            if (array_key_exists('keterangan', $data)) {
                $incident->keterangan = $data['keterangan'];
            }
            if (array_key_exists('realisasi_waktu_rtp', $data)) {
                $incident->realisasi_waktu_rtp = $data['realisasi_waktu_rtp'];
            }
            if (array_key_exists('keterangan_rtp', $data)) {
                $incident->keterangan_rtp = $data['keterangan_rtp'];
            }

            $incident->save();

            return $incident->fresh([
                'itemPemda',
                'itemOpd.analisis.tindakPengendalian',
                'itemOperasional.analisis.tindakPengendalian',
            ]);
        });
    }

    public function destroy(string $id, User $user): void
    {
        $incident = PencatatanKejadianRisiko::findOrFail($id);
        $opdId = (string) $incident->opd_id;
        $periodeId = (string) $incident->periode_penilaian_id;

        $this->assertUserCanEdit($user, $opdId);
        $this->readiness->assertOpdCanEdit($opdId, $periodeId, $user, '10');

        DB::transaction(function () use ($incident, $opdId, $periodeId, $user) {
            $submission = PengajuanPenilaianRisiko::where('opd_id', $opdId)
                ->where('periode_penilaian_id', $periodeId)
                ->lockForUpdate()
                ->first();

            $this->readiness->assertOpdCanEdit($opdId, $periodeId, $user, '10');

            if ($submission && ($submission->submitted_at !== null || $submission->status !== PengajuanPenilaianRisiko::STATUS_DRAFT) && ! $submission->items()->where('form_code', '10')->exists()) {
                throw ValidationException::withMessages(['form10' => ['Form 10 tidak termasuk dalam pengajuan ini.']]);
            }

            $incident->delete();
        });
    }

    public function setNihil(string $opdId, string $periodeId, bool $isNihil, User $user): StatusKejadianRisikoOpd
    {
        $this->assertUserCanEdit($user, $opdId);
        $this->readiness->assertOpdCanEdit($opdId, $periodeId, $user, '10');

        return DB::transaction(function () use ($opdId, $periodeId, $isNihil, $user) {
            $submission = PengajuanPenilaianRisiko::where('opd_id', $opdId)
                ->where('periode_penilaian_id', $periodeId)
                ->lockForUpdate()
                ->first();

            $this->readiness->assertOpdCanEdit($opdId, $periodeId, $user, '10');

            if ($submission && ($submission->submitted_at !== null || $submission->status !== PengajuanPenilaianRisiko::STATUS_DRAFT) && ! $submission->items()->where('form_code', '10')->exists()) {
                throw ValidationException::withMessages(['form10' => ['Form 10 tidak termasuk dalam pengajuan ini.']]);
            }

            if ($isNihil && PencatatanKejadianRisiko::where('opd_id', $opdId)->where('periode_penilaian_id', $periodeId)->lockForUpdate()->exists()) {
                throw ValidationException::withMessages([
                    'is_nihil' => ['Tidak dapat mengonfirmasi status nihil karena terdapat catatan kejadian risiko. Hapus catatan kejadian terlebih dahulu jika ingin menyatakan nihil.'],
                ]);
            }

            return StatusKejadianRisikoOpd::updateOrCreate(
                ['opd_id' => $opdId, 'periode_penilaian_id' => $periodeId],
                [
                    'is_nihil' => $isNihil,
                    'confirmed_by' => $isNihil ? $user->id : null,
                    'confirmed_at' => $isNihil ? now() : null,
                ]
            );
        });
    }

    public function isComplete(string $opdId, string $periodeId): bool
    {
        $records = PencatatanKejadianRisiko::where('opd_id', $opdId)
            ->where('periode_penilaian_id', $periodeId)
            ->get();

        if ($records->isNotEmpty()) {
            return $records->every(function (PencatatanKejadianRisiko $record) {
                return ! empty($record->tanggal_kejadian)
                    && trim((string) $record->sebab) !== ''
                    && trim((string) $record->dampak) !== '';
            });
        }

        return StatusKejadianRisikoOpd::where('opd_id', $opdId)
            ->where('periode_penilaian_id', $periodeId)
            ->where('is_nihil', true)
            ->exists();
    }

    private function assertUserCanEdit(User $user, string $opdId): void
    {
        $hasPermission = $user->can('identifikasi_risiko_opd.edit')
            || $user->can('identifikasi_risiko_opd_operasional.edit')
            || $user->can('identifikasi_risiko_pemda.edit');

        $isAuthorized = $hasPermission
            && $this->policy->view($user, $opdId)
            && ($user->hasRole(['Superadmin', 'Admin Office']) || (string) $user->opd_id === (string) $opdId);

        abort_unless($isAuthorized, 403, 'Anda tidak memiliki hak akses untuk mengubah catatan kejadian risiko pada perangkat daerah ini.');
    }

    private function validateRiskItemBelongsToOpd(string $sourceType, string $riskItemId, string $opdId, string $periodeId): void
    {
        $exists = match ($sourceType) {
            '3a' => IdentifikasiRisikoPemdaItem::whereKey($riskItemId)
                ->whereHas('dokumen', fn ($q) => $q->where('opd_id', $opdId)->where('periode_penilaian_id', $periodeId))
                ->exists(),
            '3b' => IdentifikasiRisikoOpdItem::whereKey($riskItemId)
                ->whereHas('dokumen', fn ($q) => $q->where('opd_id', $opdId)->where('periode_penilaian_id', $periodeId))
                ->exists(),
            '3c' => IdentifikasiRisikoOpdOperasionalItem::whereKey($riskItemId)
                ->whereHas('dokumen', fn ($q) => $q->where('opd_id', $opdId)->where('periode_penilaian_id', $periodeId))
                ->exists(),
            default => false,
        };

        if (! $exists) {
            throw ValidationException::withMessages(['risk_item_id' => ['Item risiko yang dipilih tidak valid untuk OPD atau periode ini.']]);
        }
    }
}
