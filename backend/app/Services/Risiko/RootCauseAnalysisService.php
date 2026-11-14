<?php

declare(strict_types=1);

namespace App\Services\Risiko;

use App\Models\Risiko\IdentifikasiRisikoOpd;
use App\Models\Risiko\IdentifikasiRisikoOpdItem;
use App\Models\Risiko\IdentifikasiRisikoOpdOperasional;
use App\Models\Risiko\IdentifikasiRisikoOpdOperasionalItem;
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
     * Get or create RCA record for a specific risk item (3A, 3B, or 3C).
     */
    public function getOrCreateRcaByItem(string $itemId, ?User $user = null): RootCauseAnalysis
    {
        // 1. Try Form 3A (Pemda)
        $item3a = IdentifikasiRisikoPemdaItem::with('dokumen')->find($itemId);
        if ($item3a) {
            $dokumen = $item3a->dokumen;
            if ($user && $user->hasRole('OPD') && ! $user->hasRole(['Superadmin', 'Admin Office']) && $dokumen) {
                if ((string) $user->opd_id !== (string) $dokumen->opd_id) {
                    abort(403, 'Anda tidak memiliki hak akses untuk data RCA perangkat daerah lain.');
                }
            }

            return RootCauseAnalysis::firstOrCreate(
                ['identifikasi_risiko_pemda_item_id' => $item3a->id],
                [
                    'source_type' => '3a',
                    'created_by' => $user?->id ?? auth()->id(),
                    'updated_by' => $user?->id ?? auth()->id(),
                ]
            )->load(['itemPemda.sasaran', 'itemPemda.indikator']);
        }

        // 2. Try Form 3B (OPD Strategis)
        $item3b = IdentifikasiRisikoOpdItem::with('dokumen')->find($itemId);
        if ($item3b) {
            $dokumen = $item3b->dokumen;
            if ($user && $user->hasRole('OPD') && ! $user->hasRole(['Superadmin', 'Admin Office']) && $dokumen) {
                if ((string) $user->opd_id !== (string) $dokumen->opd_id) {
                    abort(403, 'Anda tidak memiliki hak akses untuk data RCA perangkat daerah lain.');
                }
            }

            return RootCauseAnalysis::firstOrCreate(
                ['identifikasi_risiko_opd_item_id' => $item3b->id],
                [
                    'source_type' => '3b',
                    'created_by' => $user?->id ?? auth()->id(),
                    'updated_by' => $user?->id ?? auth()->id(),
                ]
            )->load(['itemOpd.sasaran', 'itemOpd.indikator']);
        }

        // 3. Try Form 3C (OPD Operasional)
        $item3c = IdentifikasiRisikoOpdOperasionalItem::with('dokumen')->find($itemId);
        if ($item3c) {
            $dokumen = $item3c->dokumen;
            if ($user && $user->hasRole('OPD') && ! $user->hasRole(['Superadmin', 'Admin Office']) && $dokumen) {
                if ((string) $user->opd_id !== (string) $dokumen->opd_id) {
                    abort(403, 'Anda tidak memiliki hak akses untuk data RCA perangkat daerah lain.');
                }
            }

            return RootCauseAnalysis::firstOrCreate(
                ['identifikasi_risiko_opd_operasional_item_id' => $item3c->id],
                [
                    'source_type' => '3c',
                    'created_by' => $user?->id ?? auth()->id(),
                    'updated_by' => $user?->id ?? auth()->id(),
                ]
            )->load(['itemOperasional.subKegiatan.parent.parent', 'itemOperasional.subKegiatan.indikators']);
        }

        abort(404, 'Butir risiko tidak ditemukan.');
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
