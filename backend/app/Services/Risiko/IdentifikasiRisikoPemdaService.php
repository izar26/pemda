<?php

declare(strict_types=1);

namespace App\Services\Risiko;

use App\Models\Perencanaan\PeriodePenilaian;
use App\Models\Risiko\IdentifikasiRisikoOpd;
use App\Models\Risiko\IdentifikasiRisikoOpdOperasional;
use App\Models\Risiko\IdentifikasiRisikoPemda;
use App\Models\Risiko\IdentifikasiRisikoPemdaItem;
use App\Models\Risiko\RootCauseAnalysis;
use App\Models\User;
use App\Services\Risiko\Pengajuan\PengajuanReadinessService;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class IdentifikasiRisikoPemdaService
{
    public const KATEGORI_KODE_MAP = [
        'Risiko Fraud' => 'RF',
        'Risiko Belanja' => 'RB',
        'Risiko Pembiayaan' => 'RPb',
        'Risiko Strategis' => 'RS',
        'Risiko Kepatuhan' => 'RK',
        'Risiko Operasional' => 'RO',
        'Risiko Reputasi' => 'RR',
        'Risiko Pendapatan' => 'RP',
    ];

    public function __construct(
        protected PengajuanReadinessService $readinessService
    ) {}

    /**
     * Resolve target evaluation period ID (default to active period).
     */
    public function resolvePeriodeId(?string $periodeId = null): string
    {
        if (! empty($periodeId)) {
            return $periodeId;
        }

        $active = PeriodePenilaian::where('status', 'aktif')->first();
        if (! $active) {
            throw ValidationException::withMessages([
                'periode' => 'Tidak ada periode penilaian yang aktif saat ini. Silakan aktifkan periode penilaian terlebih dahulu.',
            ]);
        }

        return (string) $active->id;
    }

    /**
     * Get current Form 3A document with items, sasaran, indikator, and RCA relations.
     */
    public function getCurrentDokumen(string $opdId, ?string $periodeId = null): ?IdentifikasiRisikoPemda
    {
        $resolvedPeriodeId = $this->resolvePeriodeId($periodeId);

        return IdentifikasiRisikoPemda::where('opd_id', $opdId)
            ->where('periode_penilaian_id', $resolvedPeriodeId)
            ->with([
                'opd',
                'periode',
                'urusanPemerintahan',
                'items.sasaran',
                'items.indikator',
                'items.rca',
                'creator',
                'updater',
            ])
            ->first();
    }

    /**
     * Create or update Form 3A header (Urusan Pemerintahan, Nama Pemda).
     */
    public function saveHeader(array $data, ?User $user = null): IdentifikasiRisikoPemda
    {
        $opdId = (string) $data['opd_id'];
        $periodeId = $this->resolvePeriodeId($data['periode_penilaian_id'] ?? null);

        // Security check
        $this->readinessService->assertOpdCanEdit($opdId, $periodeId, $user, '3a');

        return DB::transaction(function () use ($data, $opdId, $periodeId, $user) {
            $dokumen = IdentifikasiRisikoPemda::firstOrNew([
                'opd_id' => $opdId,
                'periode_penilaian_id' => $periodeId,
            ]);

            $isNew = ! $dokumen->exists;

            foreach (['3b' => IdentifikasiRisikoOpd::class, '3c' => IdentifikasiRisikoOpdOperasional::class] as $form => $model) {
                $related = $model::where('opd_id', $opdId)->where('periode_penilaian_id', $periodeId)->first();
                if ($related && $related->master_urusan_pemerintahan_id !== $data['master_urusan_pemerintahan_id']) {
                    $this->readinessService->assertOpdCanEdit($opdId, $periodeId, $user, $form);
                    $related->master_urusan_pemerintahan_id = $data['master_urusan_pemerintahan_id'];
                    $related->updated_by = $user?->id;
                    $related->save();
                }
            }

            $dokumen->master_urusan_pemerintahan_id = $data['master_urusan_pemerintahan_id'];
            $dokumen->nama_pemda = $data['nama_pemda'] ?? $dokumen->nama_pemda ?? 'Pemerintah Kabupaten Cianjur';
            $dokumen->updated_by = $user?->id;

            if ($isNew) {
                $dokumen->created_by = $user?->id;
                $dokumen->status = 'draft';
            }

            $dokumen->save();

            return $dokumen->load(['opd', 'periode', 'urusanPemerintahan']);
        });
    }

    /**
     * Add a new risk item to Form 3A.
     */
    public function storeItem(IdentifikasiRisikoPemda $dokumen, array $data, ?User $user = null): IdentifikasiRisikoPemdaItem
    {
        $this->readinessService->assertOpdCanEdit((string) $dokumen->opd_id, (string) $dokumen->periode_penilaian_id, $user, '3a');

        return DB::transaction(function () use ($dokumen, $data, $user) {
            $nextUrutan = ($dokumen->items()->max('urutan') ?? 0) + 1;
            $nextNomorUrut = ($dokumen->items()->max('nomor_urut') ?? 0) + 1;

            $tahunPenilaian = (string) ($dokumen->periode->tahun_mulai ?? date('Y'));
            $kodeRisiko = $this->generateKodeRisiko($tahunPenilaian, $data['kategori_risiko'], $nextNomorUrut);

            $item = new IdentifikasiRisikoPemdaItem;
            $item->identifikasi_risiko_pemda_id = $dokumen->id;
            $item->sasaran_penilaian_id = $data['sasaran_penilaian_id'] ?? null;
            $item->sasaran_kustom = $data['sasaran_kustom'] ?? null;
            $item->indikator_penilaian_id = $data['indikator_penilaian_id'] ?? null;
            $item->indikator_kustom = $data['indikator_kustom'] ?? null;
            $item->kategori_risiko = $data['kategori_risiko'];
            $item->nomor_urut = $nextNomorUrut;
            $item->pernyataan_risiko = $data['pernyataan_risiko'];
            $item->kode_risiko = $kodeRisiko;
            $item->pemilik_risiko = $data['pemilik_risiko'] ?? 'Kepala Daerah';
            $item->sifat_risiko = $data['sifat_risiko'] ?? 'C';
            $item->uraian_dampak = $data['uraian_dampak'] ?? null;
            $item->pihak_terkena = $data['pihak_terkena'] ?? null;
            $item->urutan = $nextUrutan;
            $item->created_by = $user?->id;
            $item->updated_by = $user?->id;
            $item->save();

            // Create initial 1-to-1 RCA record for this item
            $rca = new RootCauseAnalysis;
            $rca->identifikasi_risiko_pemda_item_id = $item->id;
            $rca->created_by = $user?->id;
            $rca->updated_by = $user?->id;
            $rca->save();

            return $item->load(['sasaran', 'indikator', 'rca']);
        });
    }

    /**
     * Update an existing risk item in Form 3A.
     */
    public function updateItem(IdentifikasiRisikoPemdaItem $item, array $data, ?User $user = null): IdentifikasiRisikoPemdaItem
    {
        $dokumen = $item->dokumen;
        $this->readinessService->assertOpdCanEdit((string) $dokumen->opd_id, (string) $dokumen->periode_penilaian_id, $user, '3a');

        return DB::transaction(function () use ($item, $dokumen, $data, $user) {
            $tahunPenilaian = (string) ($dokumen->periode->tahun_mulai ?? date('Y'));

            // If category changed, regenerate code prefix
            if (isset($data['kategori_risiko']) && $data['kategori_risiko'] !== $item->kategori_risiko) {
                $item->kategori_risiko = $data['kategori_risiko'];
                $item->kode_risiko = $this->generateKodeRisiko($tahunPenilaian, $data['kategori_risiko'], $item->nomor_urut);
            }

            if (array_key_exists('sasaran_penilaian_id', $data)) {
                $item->sasaran_penilaian_id = $data['sasaran_penilaian_id'];
            }
            if (array_key_exists('sasaran_kustom', $data)) {
                $item->sasaran_kustom = $data['sasaran_kustom'];
            }
            if (array_key_exists('indikator_penilaian_id', $data)) {
                $item->indikator_penilaian_id = $data['indikator_penilaian_id'];
            }
            if (array_key_exists('indikator_kustom', $data)) {
                $item->indikator_kustom = $data['indikator_kustom'];
            }
            if (isset($data['pernyataan_risiko'])) {
                $item->pernyataan_risiko = $data['pernyataan_risiko'];
            }
            if (array_key_exists('pemilik_risiko', $data)) {
                $item->pemilik_risiko = $data['pemilik_risiko'] ?: 'Kepala Daerah';
            }
            if (isset($data['sifat_risiko'])) {
                $item->sifat_risiko = $data['sifat_risiko'];
            }
            if (array_key_exists('uraian_dampak', $data)) {
                $item->uraian_dampak = $data['uraian_dampak'];
            }
            if (array_key_exists('pihak_terkena', $data)) {
                $item->pihak_terkena = $data['pihak_terkena'];
            }

            $item->updated_by = $user?->id;
            $item->save();

            return $item->load(['sasaran', 'indikator', 'rca']);
        });
    }

    /**
     * Delete a risk item in Form 3A.
     */
    public function destroyItem(IdentifikasiRisikoPemdaItem $item, ?User $user = null): bool
    {
        $dokumen = $item->dokumen;
        $this->readinessService->assertOpdCanEdit((string) $dokumen->opd_id, (string) $dokumen->periode_penilaian_id, $user, '3a');

        return DB::transaction(function () use ($item, $dokumen) {
            $item->delete();

            // Re-sequence nomor_urut & re-generate codes
            $remainingItems = $dokumen->items()->orderBy('urutan', 'asc')->get();
            $tahunPenilaian = (string) ($dokumen->periode->tahun_mulai ?? date('Y'));

            foreach ($remainingItems as $idx => $remaining) {
                $newNo = $idx + 1;
                $remaining->nomor_urut = $newNo;
                $remaining->urutan = $newNo;
                $remaining->kode_risiko = $this->generateKodeRisiko($tahunPenilaian, $remaining->kategori_risiko, $newNo);
                $remaining->saveQuietly();
            }

            return true;
        });
    }

    /**
     * Reorder risk items in Form 3A.
     */
    public function reorderItems(IdentifikasiRisikoPemda $dokumen, array $itemIds, ?User $user = null): void
    {
        $this->readinessService->assertOpdCanEdit((string) $dokumen->opd_id, (string) $dokumen->periode_penilaian_id, $user, '3a');

        DB::transaction(function () use ($dokumen, $itemIds) {
            $tahunPenilaian = (string) ($dokumen->periode->tahun_mulai ?? date('Y'));

            foreach ($itemIds as $index => $id) {
                $no = $index + 1;
                $item = $dokumen->items()->where('id', $id)->first();
                if ($item) {
                    $item->urutan = $no;
                    $item->nomor_urut = $no;
                    $item->kode_risiko = $this->generateKodeRisiko($tahunPenilaian, $item->kategori_risiko, $no);
                    $item->saveQuietly();
                }
            }
        });
    }

    /**
     * Generate Kode Risiko matching the Excel template:
     * Format: RSP.[Tahun 2 Digit].[Singkatan Kategori].[3 Digit Nomor Urut]
     * Contoh: RSP.26.RF.001
     */
    public function generateKodeRisiko(string $tahunPenilaian, string $kategoriRisiko, int $nomorUrut): string
    {
        $twoDigitYear = substr($tahunPenilaian, -2);
        $kategoriSingkatan = self::KATEGORI_KODE_MAP[$kategoriRisiko] ?? 'RS';
        $paddedNumber = str_pad((string) $nomorUrut, 3, '0', STR_PAD_LEFT);

        return "RSP.{$twoDigitYear}.{$kategoriSingkatan}.{$paddedNumber}";
    }
}
