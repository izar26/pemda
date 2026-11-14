<?php

declare(strict_types=1);

namespace App\Services\Risiko\Pengajuan;

use App\Models\Risiko\AnalisisRisiko;
use App\Models\Risiko\IdentifikasiRisikoOpdItem;
use App\Models\Risiko\IdentifikasiRisikoOpdOperasionalItem;
use App\Models\Risiko\PengajuanPenilaianRisiko;
use App\Models\Risiko\PengajuanPenilaianRisikoHistory;
use App\Models\Risiko\PengajuanPenilaianRisikoItem;
use App\Models\Risiko\RootCauseAnalysis;
use App\Services\Risiko\Registry\RiskFormRegistry;
use Illuminate\Database\Eloquent\Model;

class InvalidateDerivedFormsService
{
    public function __construct(
        protected RiskFormRegistry $registry
    ) {}

    public function invalidate(Model $model, bool $deleting = false): void
    {
        if ($model instanceof AnalisisRisiko) {
            if (! $deleting && $model->wasChanged() && count(array_diff(array_keys($model->getChanges()), ['rencana_tindak', 'updated_at'])) === 0) {
                return;
            }
            $item = $model->risiko_opd_item_id
                ? IdentifikasiRisikoOpdItem::with('dokumen')->find($model->risiko_opd_item_id)
                : IdentifikasiRisikoOpdOperasionalItem::with('dokumen')->find($model->risiko_operasional_item_id);
        } elseif ($model instanceof RootCauseAnalysis) {
            $item = match ($model->source_type) {
                '3b' => $model->itemOpd,
                '3c' => $model->itemOperasional,
                default => null,
            };
        } else {
            $item = $model;
        }
        $document = $item?->dokumen;
        if (! $document) {
            return;
        }
        $submission = PengajuanPenilaianRisiko::where('opd_id', $document->opd_id)
            ->where('periode_penilaian_id', $document->periode_penilaian_id)->first();
        if (! $submission) {
            return;
        }
        $formCode = match (true) {
            $model instanceof AnalisisRisiko => '4',
            $model instanceof RootCauseAnalysis => 'rca',
            $model instanceof IdentifikasiRisikoOpdItem => '3b',
            $model instanceof IdentifikasiRisikoOpdOperasionalItem => '3c',
            default => null,
        };

        $downstreamCodes = $formCode && $this->registry->has($formCode)
            ? $this->registry->get($formCode)->getDownstreamFormCodes()
            : ['5', '6'];

        $items = $submission->items()->whereIn('form_code', $downstreamCodes)->get();
        foreach ($items as $derived) {
            if (! in_array(PengajuanPenilaianRisikoItem::STATUS_APPROVED, [$derived->status, $derived->status_kepala_opd, $derived->status_auditor, $derived->status_pengawas], true)) {
                continue;
            }
            $derived->update([
                'status' => PengajuanPenilaianRisikoItem::STATUS_DRAFT,
                'status_kepala_opd' => PengajuanPenilaianRisikoItem::STATUS_DRAFT,
                'status_auditor' => PengajuanPenilaianRisikoItem::STATUS_DRAFT,
                'status_pengawas' => PengajuanPenilaianRisikoItem::STATUS_DRAFT,
                'reviewed_at' => null,
                'reviewed_by' => null,
            ]);
            PengajuanPenilaianRisikoHistory::create([
                'pengajuan_id' => $submission->id,
                'form_code' => $derived->form_code,
                'action' => 'derived_form_invalidated',
                'catatan' => 'Persetujuan perlu diulang karena data sumber berubah.',
                'user_id' => auth()->id(),
                'created_at' => now(),
            ]);
        }
    }
}
