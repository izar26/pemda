<?php

declare(strict_types=1);

namespace Tests\Concerns;

use App\Models\Master\MasterSumberData;
use App\Models\Master\MasterUrusanPemerintahan;
use App\Models\Perencanaan\IndikatorPenilaian;
use App\Models\Perencanaan\SasaranPenilaian;
use App\Models\Perencanaan\TujuanPenilaian;
use App\Models\Risiko\AnalisisRisiko;
use App\Models\Risiko\IdentifikasiRisikoOpd;
use App\Models\Risiko\IdentifikasiRisikoOpdItem;
use App\Models\Risiko\IdentifikasiRisikoOpdOperasional;
use App\Models\Risiko\IdentifikasiRisikoOpdOperasionalItem;
use App\Models\Risiko\IdentifikasiRisikoPemda;
use App\Models\Risiko\IdentifikasiRisikoPemdaItem;
use App\Models\Risiko\KomunikasiPengendalianRisiko;
use App\Models\Risiko\KonteksOperasional;
use App\Models\Risiko\KonteksOperasionalItem;
use App\Models\Risiko\KonteksPenilaian;
use App\Models\Risiko\PemantauanPengendalianRisiko;
use App\Models\Risiko\RootCauseAnalysis;
use App\Models\Risiko\StatusKejadianRisikoOpd;
use App\Models\Risiko\TindakPengendalianRisiko;
use App\Services\Risiko\Handlers\AnalisisRisiko4Handler;
use App\Services\Risiko\Handlers\IdentifikasiOpd3BHandler;
use App\Services\Risiko\Handlers\IdentifikasiOperasional3CHandler;
use App\Services\Risiko\Handlers\IdentifikasiPemda3AHandler;
use App\Services\Risiko\Handlers\KejadianRisiko10Handler;
use App\Services\Risiko\Handlers\KomunikasiPengendalian8Handler;
use App\Services\Risiko\Handlers\KonteksOperasional2CHandler;
use App\Services\Risiko\Handlers\KonteksPenilaian2BHandler;
use App\Services\Risiko\Handlers\PemantauanPengendalian9Handler;
use App\Services\Risiko\Handlers\RootCauseAnalysisHandler;
use App\Services\Risiko\Handlers\TindakPengendalian6Handler;

trait SeedsRisikoPrerequisites
{
    /**
     * Idempotently ensure all prerequisite forms strictly before $targetForm are complete for the given OPD and period.
     */
    protected function seedPrerequisitesBefore(string $opdId, string $periodeId, string $targetForm, bool $makePriority = false): void
    {
        $order = ['2b', '2c', '3a', '3b', '3c', 'rca', '4', '5', '6', '7', '8', '9', '10', 'fra'];
        $targetIdx = array_search(strtolower($targetForm), $order, true);
        if ($targetIdx === false || $targetIdx === 0) {
            return;
        }

        $needed = array_slice($order, 0, $targetIdx);

        if (in_array('2b', $needed, true)) {
            $this->ensureForm2bComplete($opdId, $periodeId);
        }
        if (in_array('2c', $needed, true)) {
            $this->ensureForm2cComplete($opdId, $periodeId);
        }
        if (in_array('3a', $needed, true)) {
            $this->ensureForm3aComplete($opdId, $periodeId);
        }
        if (in_array('3b', $needed, true)) {
            $this->ensureForm3bComplete($opdId, $periodeId);
        }
        if (in_array('3c', $needed, true)) {
            $this->ensureForm3cComplete($opdId, $periodeId);
        }
        if (in_array('rca', $needed, true)) {
            $this->ensureRcaComplete($opdId, $periodeId);
        }
        if (in_array('4', $needed, true)) {
            $this->ensureForm4Complete($opdId, $periodeId, $makePriority);
        }
        if (in_array('6', $needed, true)) {
            $this->ensureForm6Complete($opdId, $periodeId);
        }
        if (in_array('8', $needed, true)) {
            $this->ensureForm8Complete($opdId, $periodeId);
        }
        if (in_array('9', $needed, true)) {
            $this->ensureForm9Complete($opdId, $periodeId);
        }
        if (in_array('10', $needed, true)) {
            $this->ensureForm10Complete($opdId, $periodeId);
        }
    }

    protected function ensureForm2bComplete(string $opdId, string $periodeId): void
    {
        if (app(KonteksPenilaian2BHandler::class)->isComplete($opdId, $periodeId)) {
            return;
        }

        $sumberData = MasterSumberData::first() ?? MasterSumberData::create([
            'nama' => 'Renstra OPD Prasyarat',
            'urutan' => 1,
            'is_active' => true,
        ]);

        $tujuan = TujuanPenilaian::where('opd_id', $opdId)->where('periode_penilaian_id', $periodeId)->first()
            ?? TujuanPenilaian::create([
                'periode_penilaian_id' => $periodeId,
                'opd_id' => $opdId,
                'sumber_data_id' => $sumberData->id,
                'kode_tujuan' => 'T.PR1',
                'tujuan' => 'Tujuan Strategis Prasyarat',
            ]);

        $sasaran = SasaranPenilaian::where('opd_id', $opdId)->where('periode_penilaian_id', $periodeId)->first()
            ?? SasaranPenilaian::create([
                'periode_penilaian_id' => $periodeId,
                'opd_id' => $opdId,
                'tujuan_penilaian_id' => $tujuan->id,
                'kode_sasaran' => 'S.PR1',
                'sasaran' => 'Sasaran Strategis Prasyarat',
            ]);

        $indikator = IndikatorPenilaian::where('opd_id', $opdId)->where('periode_penilaian_id', $periodeId)->first()
            ?? IndikatorPenilaian::create([
                'periode_penilaian_id' => $periodeId,
                'opd_id' => $opdId,
                'tujuan_penilaian_id' => $tujuan->id,
                'sasaran_penilaian_id' => $sasaran->id,
                'kode_indikator' => 'I.PR1',
                'indikator' => 'Indikator Strategis Prasyarat',
                'satuan' => '%',
                'target_tahun_1' => '100',
            ]);

        $konteks = KonteksPenilaian::firstOrCreate(
            ['opd_id' => $opdId, 'periode_penilaian_id' => $periodeId],
            ['sumber_data_id' => $sumberData->id, 'tujuan_penilaian_id' => $tujuan->id]
        );

        if (! $konteks->sumber_data_id || ! $konteks->tujuan_penilaian_id) {
            $konteks->update([
                'sumber_data_id' => $konteks->sumber_data_id ?: $sumberData->id,
                'tujuan_penilaian_id' => $konteks->tujuan_penilaian_id ?: $tujuan->id,
            ]);
        }

        if ($konteks->sasarans()->count() === 0) {
            $konteks->sasarans()->syncWithoutDetaching([$sasaran->id]);
        }
        if ($konteks->indikators()->count() === 0) {
            $konteks->indikators()->syncWithoutDetaching([$indikator->id]);
        }
    }

    protected function ensureForm2cComplete(string $opdId, string $periodeId): void
    {
        if (app(KonteksOperasional2CHandler::class)->isComplete($opdId, $periodeId)) {
            return;
        }

        $operasional = KonteksOperasional::firstOrCreate([
            'opd_id' => $opdId,
            'periode_penilaian_id' => $periodeId,
        ]);

        KonteksOperasionalItem::create([
            'konteks_operasional_id' => $operasional->id,
            'jenis' => 'program',
            'kode' => '9.01',
            'nama' => 'Program Operasional Prasyarat',
            'urutan' => 1,
        ]);
    }

    protected function ensureForm3aComplete(string $opdId, string $periodeId): void
    {
        if (app(IdentifikasiPemda3AHandler::class)->isComplete($opdId, $periodeId)) {
            return;
        }

        $urusan = MasterUrusanPemerintahan::first() ?? MasterUrusanPemerintahan::create([
            'kode' => '99',
            'nama' => 'Urusan Pemerintahan Prasyarat',
            'is_active' => true,
            'urutan' => 1,
        ]);

        $dokumen = IdentifikasiRisikoPemda::firstOrCreate(
            ['opd_id' => $opdId, 'periode_penilaian_id' => $periodeId],
            ['master_urusan_pemerintahan_id' => $urusan->id, 'nama_pemda' => 'Pemerintah Kabupaten Cianjur', 'status' => 'draft']
        );

        if (! $dokumen->master_urusan_pemerintahan_id) {
            $dokumen->update(['master_urusan_pemerintahan_id' => $urusan->id]);
        }

        if ($dokumen->items()->count() === 0) {
            $sasaran = SasaranPenilaian::where('opd_id', $opdId)->where('periode_penilaian_id', $periodeId)->first();
            $indikator = IndikatorPenilaian::where('opd_id', $opdId)->where('periode_penilaian_id', $periodeId)->first();

            IdentifikasiRisikoPemdaItem::create([
                'identifikasi_risiko_pemda_id' => $dokumen->id,
                'sasaran_penilaian_id' => $sasaran?->id,
                'indikator_penilaian_id' => $indikator?->id,
                'kategori_risiko' => 'Risiko Strategis',
                'nomor_urut' => 1,
                'pernyataan_risiko' => 'Risiko Pemda Prasyarat',
                'kode_risiko' => 'RSP.26.RS.901',
                'pemilik_risiko' => 'Kepala Daerah',
                'sifat_risiko' => 'C',
                'uraian_dampak' => 'Dampak prasyarat',
                'pihak_terkena' => 'Masyarakat',
                'urutan' => 1,
            ]);
        }
    }

    protected function ensureForm3bComplete(string $opdId, string $periodeId): void
    {
        if (app(IdentifikasiOpd3BHandler::class)->isComplete($opdId, $periodeId)) {
            return;
        }

        $urusan = MasterUrusanPemerintahan::first() ?? MasterUrusanPemerintahan::create([
            'kode' => '99',
            'nama' => 'Urusan Pemerintahan Prasyarat',
            'is_active' => true,
            'urutan' => 1,
        ]);

        $dokumen = IdentifikasiRisikoOpd::firstOrCreate(
            ['opd_id' => $opdId, 'periode_penilaian_id' => $periodeId],
            ['master_urusan_pemerintahan_id' => $urusan->id, 'nama_pemda' => 'Pemerintah Kabupaten Cianjur', 'singkatan_opd' => 'OPD', 'status' => 'draft']
        );

        if (! $dokumen->master_urusan_pemerintahan_id) {
            $dokumen->update(['master_urusan_pemerintahan_id' => $urusan->id]);
        }

        if ($dokumen->items()->count() === 0) {
            $sasaran = SasaranPenilaian::where('opd_id', $opdId)->where('periode_penilaian_id', $periodeId)->first();
            $indikator = IndikatorPenilaian::where('opd_id', $opdId)->where('periode_penilaian_id', $periodeId)->first();

            IdentifikasiRisikoOpdItem::create([
                'identifikasi_risiko_opd_id' => $dokumen->id,
                'sasaran_penilaian_id' => $sasaran?->id,
                'indikator_penilaian_id' => $indikator?->id,
                'kategori_risiko' => 'Risiko Strategis',
                'nomor_urut' => 1,
                'pernyataan_risiko' => 'Risiko OPD Prasyarat',
                'kode_risiko' => 'RSO.26.OPD.RS.901',
                'pemilik_risiko' => 'Kepala OPD',
                'sifat_risiko' => 'C',
                'uraian_dampak' => 'Dampak OPD prasyarat',
                'pihak_terkena' => 'Masyarakat',
                'urutan' => 1,
            ]);
        }
    }

    protected function ensureForm3cComplete(string $opdId, string $periodeId): void
    {
        if (app(IdentifikasiOperasional3CHandler::class)->isComplete($opdId, $periodeId)) {
            return;
        }

        $urusan = MasterUrusanPemerintahan::first() ?? MasterUrusanPemerintahan::create([
            'kode' => '99',
            'nama' => 'Urusan Pemerintahan Prasyarat',
            'is_active' => true,
            'urutan' => 1,
        ]);

        $dokumen = IdentifikasiRisikoOpdOperasional::firstOrCreate(
            ['opd_id' => $opdId, 'periode_penilaian_id' => $periodeId],
            ['master_urusan_pemerintahan_id' => $urusan->id, 'nama_pemda' => 'Pemerintah Kabupaten Cianjur', 'singkatan_opd' => 'OPD', 'status' => 'draft']
        );

        if (! $dokumen->master_urusan_pemerintahan_id) {
            $dokumen->update(['master_urusan_pemerintahan_id' => $urusan->id]);
        }

        if ($dokumen->items()->count() === 0) {
            IdentifikasiRisikoOpdOperasionalItem::create([
                'identifikasi_risiko_opd_operasional_id' => $dokumen->id,
                'sub_kegiatan_kustom' => 'Sub Kegiatan Prasyarat',
                'probis' => 'Pelaksanaan',
                'kategori_risiko' => 'Risiko Operasional',
                'nomor_urut' => 1,
                'pernyataan_risiko' => 'Risiko Operasional Prasyarat',
                'kode_risiko' => 'ROO.26.OPD.RO.901',
                'pemilik_risiko' => 'PPTK',
                'sifat_risiko' => 'C',
                'uraian_dampak' => 'Dampak operasional prasyarat',
                'pihak_terkena' => 'OPD',
                'urutan' => 1,
            ]);
        }
    }

    protected function ensureRcaComplete(string $opdId, string $periodeId): void
    {
        if (app(RootCauseAnalysisHandler::class)->isComplete($opdId, $periodeId)) {
            return;
        }

        $items3a = IdentifikasiRisikoPemdaItem::whereHas('dokumen', fn ($q) => $q->where('opd_id', $opdId)->where('periode_penilaian_id', $periodeId))->get();
        foreach ($items3a as $item) {
            RootCauseAnalysis::updateOrCreate(
                ['identifikasi_risiko_pemda_item_id' => $item->id],
                ['source_type' => '3a', 'why_1' => 'Akar 3A', 'akar_penyebab' => 'Akar 3A', 'jenis_penyebab' => 'Man', 'kegiatan_pengendalian' => 'Pengendalian 3A']
            );
        }

        $items3b = IdentifikasiRisikoOpdItem::whereHas('dokumen', fn ($q) => $q->where('opd_id', $opdId)->where('periode_penilaian_id', $periodeId))->get();
        foreach ($items3b as $item) {
            RootCauseAnalysis::updateOrCreate(
                ['identifikasi_risiko_opd_item_id' => $item->id],
                ['source_type' => '3b', 'why_1' => 'Akar 3B', 'akar_penyebab' => 'Akar 3B', 'jenis_penyebab' => 'Man', 'kegiatan_pengendalian' => 'Pengendalian 3B']
            );
        }

        $items3c = IdentifikasiRisikoOpdOperasionalItem::whereHas('dokumen', fn ($q) => $q->where('opd_id', $opdId)->where('periode_penilaian_id', $periodeId))->get();
        foreach ($items3c as $item) {
            RootCauseAnalysis::updateOrCreate(
                ['identifikasi_risiko_opd_operasional_item_id' => $item->id],
                ['source_type' => '3c', 'why_1' => 'Akar 3C', 'akar_penyebab' => 'Akar 3C', 'jenis_penyebab' => 'Method', 'kegiatan_pengendalian' => 'Pengendalian 3C']
            );
        }
    }

    protected function ensureForm4Complete(string $opdId, string $periodeId, bool $makePriority = false): void
    {
        if (app(AnalisisRisiko4Handler::class)->isComplete($opdId, $periodeId)) {
            return;
        }

        $defaults = [
            'kriteria_kemungkinan' => 'Frekuensi',
            'inheren_kemungkinan' => $makePriority ? 4 : 1,
            'kriteria_dampak' => 'Kinerja',
            'inheren_dampak' => $makePriority ? 4 : 1,
            'pengendalian_ada' => false,
            'residual_kriteria_kemungkinan' => 'Frekuensi',
            'residual_kriteria_dampak' => 'Kinerja',
            'residual_kemungkinan' => $makePriority ? 3 : 1,
            'residual_dampak' => $makePriority ? 4 : 1,
            'rencana_tindak' => 'Rencana tindak prasyarat',
        ];

        $items3b = IdentifikasiRisikoOpdItem::whereHas('dokumen', fn ($q) => $q->where('opd_id', $opdId)->where('periode_penilaian_id', $periodeId))->get();
        foreach ($items3b as $item) {
            AnalisisRisiko::firstOrCreate(['risiko_opd_item_id' => $item->id], $defaults);
        }

        $items3c = IdentifikasiRisikoOpdOperasionalItem::whereHas('dokumen', fn ($q) => $q->where('opd_id', $opdId)->where('periode_penilaian_id', $periodeId))->get();
        foreach ($items3c as $item) {
            AnalisisRisiko::firstOrCreate(['risiko_operasional_item_id' => $item->id], $defaults);
        }
    }

    protected function ensureForm6Complete(string $opdId, string $periodeId): void
    {
        if (app(TindakPengendalian6Handler::class)->isComplete($opdId, $periodeId)) {
            return;
        }

        $ids3b = IdentifikasiRisikoOpdItem::whereHas('dokumen', fn ($q) => $q->where('opd_id', $opdId)->where('periode_penilaian_id', $periodeId))->pluck('id');
        $ids3c = IdentifikasiRisikoOpdOperasionalItem::whereHas('dokumen', fn ($q) => $q->where('opd_id', $opdId)->where('periode_penilaian_id', $periodeId))->pluck('id');

        $analyses = AnalisisRisiko::whereIn('risiko_opd_item_id', $ids3b)
            ->orWhereIn('risiko_operasional_item_id', $ids3c)
            ->get();

        foreach ($analyses as $analysis) {
            if (! $analysis->rencana_tindak) {
                $analysis->update(['rencana_tindak' => 'Rencana tindak prasyarat']);
            }
            TindakPengendalianRisiko::updateOrCreate(
                ['analisis_risiko_id' => $analysis->id],
                [
                    'celah_pengendalian' => 'Celah prasyarat',
                    'penanggung_jawab' => 'Kepala Bidang',
                    'target_waktu' => 'Triwulan IV',
                    'treated_kemungkinan' => 1,
                    'treated_dampak' => 2,
                ]
            );
        }
    }

    protected function ensureForm8Complete(string $opdId, string $periodeId): void
    {
        if (app(KomunikasiPengendalian8Handler::class)->isComplete($opdId, $periodeId)) {
            return;
        }

        $ids3b = IdentifikasiRisikoOpdItem::whereHas('dokumen', fn ($q) => $q->where('opd_id', $opdId)->where('periode_penilaian_id', $periodeId))->pluck('id');
        $ids3c = IdentifikasiRisikoOpdOperasionalItem::whereHas('dokumen', fn ($q) => $q->where('opd_id', $opdId)->where('periode_penilaian_id', $periodeId))->pluck('id');

        $analyses = AnalisisRisiko::whereIn('risiko_opd_item_id', $ids3b)
            ->orWhereIn('risiko_operasional_item_id', $ids3c)
            ->get();

        foreach ($analyses as $analysis) {
            KomunikasiPengendalianRisiko::updateOrCreate(
                ['analisis_risiko_id' => $analysis->id],
                [
                    'media_komunikasi' => 'Rapat Koordinasi',
                    'penyedia_informasi' => 'Sekretaris OPD',
                    'penerima_informasi' => 'Kepala OPD',
                    'rencana_waktu' => 'Triwulan IV',
                ]
            );
        }
    }

    protected function ensureForm9Complete(string $opdId, string $periodeId): void
    {
        if (app(PemantauanPengendalian9Handler::class)->isComplete($opdId, $periodeId)) {
            return;
        }

        $ids3b = IdentifikasiRisikoOpdItem::whereHas('dokumen', fn ($q) => $q->where('opd_id', $opdId)->where('periode_penilaian_id', $periodeId))->pluck('id');
        $ids3c = IdentifikasiRisikoOpdOperasionalItem::whereHas('dokumen', fn ($q) => $q->where('opd_id', $opdId)->where('periode_penilaian_id', $periodeId))->pluck('id');

        $analyses = AnalisisRisiko::whereIn('risiko_opd_item_id', $ids3b)
            ->orWhereIn('risiko_operasional_item_id', $ids3c)
            ->get();

        foreach ($analyses as $analysis) {
            PemantauanPengendalianRisiko::updateOrCreate(
                ['analisis_risiko_id' => $analysis->id],
                [
                    'bentuk_pemantauan' => 'Reviu Dokumen',
                    'penanggung_jawab_pemantauan' => 'Inspektorat',
                    'rencana_waktu_pemantauan' => 'Triwulan IV',
                ]
            );
        }
    }

    protected function ensureForm10Complete(string $opdId, string $periodeId): void
    {
        if (app(KejadianRisiko10Handler::class)->isComplete($opdId, $periodeId)) {
            return;
        }

        StatusKejadianRisikoOpd::updateOrCreate(
            ['opd_id' => $opdId, 'periode_penilaian_id' => $periodeId],
            ['is_nihil' => true, 'catatan' => 'Nihil prasyarat', 'confirmed_at' => now()]
        );
    }
}
