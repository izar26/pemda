<?php

declare(strict_types=1);

namespace App\Services\Risiko;

use App\Models\Risiko\IdentifikasiRisikoOpd;
use App\Models\Risiko\IdentifikasiRisikoOpdOperasional;
use App\Models\Risiko\IdentifikasiRisikoPemda;
use App\Models\Risiko\IdentifikasiRisikoPemdaItem;
use App\Models\Risiko\RootCauseAnalysis;
use App\Models\User;
use App\Services\Risiko\Pengajuan\PengajuanReadinessService;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\DB;

class RootCauseAnalysisService
{
    public function __construct(
        protected PengajuanReadinessService $readinessService,
        protected IdentifikasiRisikoPemdaService $identifikasiService
    ) {}

    /**
     * Get all RCA records for an OPD in the active evaluation period,
     * optionally filtered by source type ('3a', '3b', or '3c').
     *
     * @return Collection<int, RootCauseAnalysis>
     */
    public function getRcaListByOpd(string $opdId, ?string $periodeId = null, ?string $sourceType = null): Collection
    {
        return $this->queryRcaByOpd($opdId, $periodeId, $sourceType)->get();
    }

    public function queryRcaByOpd(string $opdId, ?string $periodeId = null, ?string $sourceType = null): Builder
    {
        $resolvedPeriodeId = $this->identifikasiService->resolvePeriodeId($periodeId);

        $dokumen3a = IdentifikasiRisikoPemda::where('opd_id', $opdId)
            ->where('periode_penilaian_id', $resolvedPeriodeId)
            ->first();

        $dokumen3b = IdentifikasiRisikoOpd::where('opd_id', $opdId)
            ->where('periode_penilaian_id', $resolvedPeriodeId)
            ->first();

        $dokumen3c = IdentifikasiRisikoOpdOperasional::where('opd_id', $opdId)
            ->where('periode_penilaian_id', $resolvedPeriodeId)
            ->first();

        $query = RootCauseAnalysis::query()
            ->where(function ($q) use ($dokumen3a, $dokumen3b, $dokumen3c, $sourceType) {
                if ($sourceType === '3a' && $dokumen3a) {
                    $q->whereHas('itemPemda', fn ($sub) => $sub->where('identifikasi_risiko_pemda_id', $dokumen3a->id));
                } elseif ($sourceType === '3b' && $dokumen3b) {
                    $q->whereHas('itemOpd', fn ($sub) => $sub->where('identifikasi_risiko_opd_id', $dokumen3b->id));
                } elseif ($sourceType === '3c' && $dokumen3c) {
                    $q->whereHas('itemOperasional', fn ($sub) => $sub->where('identifikasi_risiko_opd_operasional_id', $dokumen3c->id));
                } else {
                    $q->where(function ($subQ) use ($dokumen3a) {
                        if ($dokumen3a) {
                            $subQ->whereHas('itemPemda', fn ($inner) => $inner->where('identifikasi_risiko_pemda_id', $dokumen3a->id));
                        } else {
                            $subQ->whereRaw('1 = 0');
                        }
                    })->orWhere(function ($subQ) use ($dokumen3b) {
                        if ($dokumen3b) {
                            $subQ->whereHas('itemOpd', fn ($inner) => $inner->where('identifikasi_risiko_opd_id', $dokumen3b->id));
                        } else {
                            $subQ->whereRaw('1 = 0');
                        }
                    })->orWhere(function ($subQ) use ($dokumen3c) {
                        if ($dokumen3c) {
                            $subQ->whereHas('itemOperasional', fn ($inner) => $inner->where('identifikasi_risiko_opd_operasional_id', $dokumen3c->id));
                        } else {
                            $subQ->whereRaw('1 = 0');
                        }
                    });
                }
            })
            ->with([
                'itemPemda.sasaran',
                'itemPemda.indikator',
                'itemOpd.sasaran',
                'itemOpd.indikator',
                'itemOperasional.subKegiatan.parent.parent',
                'itemOperasional.subKegiatan.indikators',
                'creator',
                'updater',
            ]);

        return $query;
    }

    /**
     * Get or create RCA record for a specific risk item.
     */
    public function getOrCreateRcaByItem(IdentifikasiRisikoPemdaItem $item): RootCauseAnalysis
    {
        return RootCauseAnalysis::firstOrCreate(
            ['identifikasi_risiko_pemda_item_id' => $item->id],
            [
                'source_type' => '3a',
                'created_by' => auth()->id(),
                'updated_by' => auth()->id(),
            ]
        )->load(['itemPemda.sasaran', 'itemPemda.indikator']);
    }

    /**
     * Update 5-Whys analysis, auto-derive root cause, and set control activity.
     */
    public function updateRca(RootCauseAnalysis $rca, array $data, ?User $user = null): RootCauseAnalysis
    {
        $item = match ($rca->source_type) {
            '3c' => $rca->itemOperasional,
            '3b' => $rca->itemOpd,
            default => ($rca->itemPemda ?? $rca->item),
        };
        $dokumen = $item?->dokumen;

        if ($dokumen) {
            $this->readinessService->assertOpdCanEdit(
                (string) $dokumen->opd_id,
                (string) $dokumen->periode_penilaian_id,
                $user,
                'rca'
            );
        }

        return DB::transaction(function () use ($rca, $data, $user) {
            $rca->why_1 = $data['why_1'] ?? $rca->why_1;
            $rca->why_2 = $data['why_2'] ?? $rca->why_2;
            $rca->why_3 = $data['why_3'] ?? $rca->why_3;
            $rca->why_4 = $data['why_4'] ?? $rca->why_4;
            $rca->why_5 = $data['why_5'] ?? $rca->why_5;

            // Automatically derive root cause from deepest non-empty why (5 down to 1)
            $rca->akar_penyebab = $rca->computeAkarPenyebab();

            if (array_key_exists('jenis_penyebab', $data)) {
                $rca->jenis_penyebab = $data['jenis_penyebab'];
            }

            if (array_key_exists('kegiatan_pengendalian', $data)) {
                $rca->kegiatan_pengendalian = $data['kegiatan_pengendalian'];
            }

            $rca->updated_by = $user?->id;
            $rca->save();

            return $rca->load([
                'itemPemda.sasaran',
                'itemPemda.indikator',
                'itemOpd.sasaran',
                'itemOpd.indikator',
                'itemOperasional.subKegiatan.parent.parent',
                'itemOperasional.subKegiatan.indikators',
            ]);
        });
    }
}
