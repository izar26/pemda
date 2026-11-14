<?php

declare(strict_types=1);

namespace App\Services\Risiko;

use App\Models\Master\MasterPemilikRisiko;
use App\Models\Opd;
use App\Models\Perencanaan\PeriodePenilaian;
use App\Models\Risiko\IdentifikasiRisikoOpdOperasional;
use App\Models\Risiko\IdentifikasiRisikoOpdOperasionalItem;
use App\Models\Risiko\IdentifikasiRisikoPemda;
use App\Models\Risiko\KonteksOperasionalItem;
use App\Models\Risiko\RootCauseAnalysis;
use App\Models\User;
use App\Services\Risiko\Pengajuan\PengajuanReadinessService;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class IdentifikasiRisikoOpdOperasionalService
{
    /**
     * Category abbreviation map for Form 3C (ROO).
     */
    public const KATEGORI_KODE_MAP = [
        'Risiko Operasional' => 'RO',
        'Risiko Fraud' => 'RF',
        'Risiko Belanja' => 'RB',
        'Risiko Pendapatan' => 'RP',
        'Risiko Pembiayaan' => 'RPb',
        'Risiko Kepatuhan' => 'RK',
        'Risiko Strategis' => 'RS',
        'Risiko Reputasi' => 'RR',
    ];

    public function __construct(
        protected PengajuanReadinessService $readinessService
    ) {}

    /**
     * Resolve active evaluation period ID.
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
     * Get current Form 3C document with items, sub-kegiatan, and RCA relations.
     */
    public function getCurrentDokumen(string $opdId, ?string $periodeId = null): ?IdentifikasiRisikoOpdOperasional
    {
        $resolvedPeriodeId = $this->resolvePeriodeId($periodeId);

        return IdentifikasiRisikoOpdOperasional::where('opd_id', $opdId)
            ->where('periode_penilaian_id', $resolvedPeriodeId)
            ->with([
                'opd',
                'periode',
                'urusanPemerintahan',
                'items.subKegiatan.parent.parent',
                'items.subKegiatan.indikators',
                'items.rca',
                'creator',
                'updater',
            ])
            ->first();
    }

    /**
     * Create or update Form 3C header (Urusan Pemerintahan, Singkatan OPD, dsb).
     */
    public function saveHeader(array $data, ?User $user = null): IdentifikasiRisikoOpdOperasional
    {
        $opdId = (string) $data['opd_id'];
        $periodeId = $this->resolvePeriodeId($data['periode_penilaian_id'] ?? null);

        // Security check
        $this->readinessService->assertOpdCanEdit($opdId, $periodeId, $user, '3c');

        return DB::transaction(function () use ($data, $opdId, $periodeId, $user) {
            $dokumen = IdentifikasiRisikoOpdOperasional::firstOrNew([
                'opd_id' => $opdId,
                'periode_penilaian_id' => $periodeId,
            ]);

            $isNew = ! $dokumen->exists;
            $opd = Opd::find($opdId);

            $urusanId = IdentifikasiRisikoPemda::where('opd_id', $opdId)
                ->where('periode_penilaian_id', $periodeId)
                ->value('master_urusan_pemerintahan_id');
            if (! $urusanId) {
                throw ValidationException::withMessages(['master_urusan_pemerintahan_id' => 'Pilih urusan pemerintahan pada Form 3A terlebih dahulu.']);
            }

            $singkatanOpd = $data['singkatan_opd'] ?? null;
            if (empty($singkatanOpd)) {
                $singkatanOpd = $dokumen->singkatan_opd ?: ($opd?->singkatan ?: 'OPD');
            }

            $dokumen->master_urusan_pemerintahan_id = $urusanId;
            $dokumen->nama_pemda = $data['nama_pemda'] ?? $dokumen->nama_pemda ?? 'Pemerintah Kabupaten Cianjur';
            $dokumen->singkatan_opd = strtoupper(trim((string) $singkatanOpd));
            $dokumen->nama_kepala_opd = $data['nama_kepala_opd'] ?? $dokumen->nama_kepala_opd ?? $opd?->kepala;
            $dokumen->nip_kepala_opd = $data['nip_kepala_opd'] ?? $dokumen->nip_kepala_opd;
            $dokumen->jabatan_kepala_opd = $data['jabatan_kepala_opd'] ?? $dokumen->jabatan_kepala_opd ?? 'Kepala Perangkat Daerah';

            if ($isNew) {
                $dokumen->created_by = $user?->id;
            }
            $dokumen->updated_by = $user?->id;
            $dokumen->save();

            return $dokumen->load(['urusanPemerintahan', 'opd', 'periode']);
        });
    }

    public function pemilikRisikoOptions(): Collection
    {
        return MasterPemilikRisiko::where('is_active', true)->orderBy('urutan')->get(['id', 'nama']);
    }

    private function assertSubKegiatanForm2c(IdentifikasiRisikoOpdOperasional $dokumen, array $data): void
    {
        $exists = KonteksOperasionalItem::whereKey($data['operasional_sub_kegiatan_id'])
            ->where('jenis', 'sub_kegiatan')
            ->whereHas('konteks', fn ($query) => $query->where('opd_id', $dokumen->opd_id)
                ->where('periode_penilaian_id', $dokumen->periode_penilaian_id))
            ->exists();
        if (! $exists) {
            throw ValidationException::withMessages(['operasional_sub_kegiatan_id' => 'Sub-kegiatan harus berasal dari Form 2C OPD dan periode ini.']);
        }
    }

    /**
     * Store new operational risk item in Form 3C and automatically create its RCA slot.
     */
    public function storeItem(IdentifikasiRisikoOpdOperasional $dokumen, array $data, ?User $user = null): IdentifikasiRisikoOpdOperasionalItem
    {
        $this->readinessService->assertOpdCanEdit((string) $dokumen->opd_id, (string) $dokumen->periode_penilaian_id, $user, '3c');

        $this->assertSubKegiatanForm2c($dokumen, $data);

        return DB::transaction(function () use ($dokumen, $data, $user) {
            $lastItem = $dokumen->items()->orderBy('urutan', 'desc')->first();
            $nextNumber = $lastItem ? ((int) $lastItem->nomor_urut + 1) : 1;
            $nextUrutan = $lastItem ? ((int) $lastItem->urutan + 1) : 1;

            $tahunPenilaian = (string) ($dokumen->periode->tahun_mulai ?? date('Y'));
            $singkatanOpd = $dokumen->singkatan_opd ?: ($dokumen->opd?->singkatan ?: 'OPD');
            $kategoriRisiko = $data['kategori_risiko'] ?? 'Risiko Operasional';

            $kodeRisiko = $this->generateKodeRisiko(
                $tahunPenilaian,
                $singkatanOpd,
                $kategoriRisiko,
                $nextNumber
            );

            $item = new IdentifikasiRisikoOpdOperasionalItem;
            $item->identifikasi_risiko_opd_operasional_id = $dokumen->id;
            $item->operasional_sub_kegiatan_id = $data['operasional_sub_kegiatan_id'] ?? null;
            $item->sub_kegiatan_kustom = $data['sub_kegiatan_kustom'] ?? null;
            $item->indikator_keluaran_kustom = $data['indikator_keluaran_kustom'] ?? null;
            $item->probis = $data['probis'] ?? null;
            $item->kategori_risiko = $kategoriRisiko;
            $item->nomor_urut = $nextNumber;
            $item->pernyataan_risiko = trim((string) $data['pernyataan_risiko']);
            $item->kode_risiko = $kodeRisiko;
            $item->pemilik_risiko = ! empty($data['pemilik_risiko']) ? trim((string) $data['pemilik_risiko']) : null;
            $item->sifat_risiko = $data['sifat_risiko'] ?? 'C';
            $item->uraian_dampak = ! empty($data['uraian_dampak']) ? trim((string) $data['uraian_dampak']) : null;
            $item->pihak_terkena = ! empty($data['pihak_terkena']) ? trim((string) $data['pihak_terkena']) : null;
            $item->urutan = $nextUrutan;
            $item->created_by = $user?->id;
            $item->updated_by = $user?->id;
            $item->save();

            // Automatically create paired Root Cause Analysis record for Form 3C
            RootCauseAnalysis::create([
                'source_type' => '3c',
                'identifikasi_risiko_opd_operasional_item_id' => $item->id,
                'created_by' => $user?->id,
            ]);

            return $item->load(['subKegiatan.parent.parent', 'subKegiatan.indikators', 'rca']);
        });
    }

    /**
     * Update an existing operational risk item in Form 3C.
     */
    public function updateItem(IdentifikasiRisikoOpdOperasionalItem $item, array $data, ?User $user = null): IdentifikasiRisikoOpdOperasionalItem
    {
        $dokumen = $item->dokumen;
        $this->readinessService->assertOpdCanEdit((string) $dokumen->opd_id, (string) $dokumen->periode_penilaian_id, $user, '3c');

        $this->assertSubKegiatanForm2c($dokumen, $data);

        return DB::transaction(function () use ($item, $dokumen, $data, $user) {
            $tahunPenilaian = (string) ($dokumen->periode->tahun_mulai ?? date('Y'));
            $singkatanOpd = $dokumen->singkatan_opd ?: ($dokumen->opd?->singkatan ?: 'OPD');
            $kategoriRisiko = $data['kategori_risiko'] ?? $item->kategori_risiko;

            // Re-generate kode risiko if kategori changes
            if ($kategoriRisiko !== $item->kategori_risiko) {
                $item->kode_risiko = $this->generateKodeRisiko(
                    $tahunPenilaian,
                    $singkatanOpd,
                    $kategoriRisiko,
                    (int) $item->nomor_urut
                );
            }

            $item->operasional_sub_kegiatan_id = array_key_exists('operasional_sub_kegiatan_id', $data) ? $data['operasional_sub_kegiatan_id'] : $item->operasional_sub_kegiatan_id;
            $item->sub_kegiatan_kustom = null;
            $item->indikator_keluaran_kustom = null;
            $item->probis = array_key_exists('probis', $data) ? $data['probis'] : $item->probis;
            $item->kategori_risiko = $kategoriRisiko;
            $item->pernyataan_risiko = trim((string) $data['pernyataan_risiko']);
            $item->pemilik_risiko = ! empty($data['pemilik_risiko']) ? trim((string) $data['pemilik_risiko']) : null;
            $item->sifat_risiko = $data['sifat_risiko'] ?? $item->sifat_risiko;
            $item->uraian_dampak = ! empty($data['uraian_dampak']) ? trim((string) $data['uraian_dampak']) : null;
            $item->pihak_terkena = ! empty($data['pihak_terkena']) ? trim((string) $data['pihak_terkena']) : null;
            $item->updated_by = $user?->id;
            $item->save();

            return $item->load(['subKegiatan.parent.parent', 'subKegiatan.indikators', 'rca']);
        });
    }

    /**
     * Delete an operational risk item and cascade-delete its RCA slot.
     */
    public function deleteItem(IdentifikasiRisikoOpdOperasionalItem $item, ?User $user = null): bool
    {
        $dokumen = $item->dokumen;
        $this->readinessService->assertOpdCanEdit((string) $dokumen->opd_id, (string) $dokumen->periode_penilaian_id, $user, '3c');

        return DB::transaction(function () use ($item, $dokumen) {
            $item->delete();

            // Re-sequence nomor_urut & re-generate codes
            $remainingItems = $dokumen->items()->orderBy('urutan', 'asc')->get();
            $tahunPenilaian = (string) ($dokumen->periode->tahun_mulai ?? date('Y'));
            $singkatanOpd = $dokumen->singkatan_opd ?: ($dokumen->opd?->singkatan ?: 'OPD');

            foreach ($remainingItems as $idx => $remaining) {
                $newNo = $idx + 1;
                $remaining->nomor_urut = $newNo;
                $remaining->urutan = $newNo;
                $remaining->kode_risiko = $this->generateKodeRisiko($tahunPenilaian, $singkatanOpd, $remaining->kategori_risiko, $newNo);
                $remaining->saveQuietly();
            }

            return true;
        });
    }

    /**
     * Reorder risk items in Form 3C.
     */
    public function reorderItems(IdentifikasiRisikoOpdOperasional $dokumen, array $itemIds, ?User $user = null): void
    {
        $this->readinessService->assertOpdCanEdit((string) $dokumen->opd_id, (string) $dokumen->periode_penilaian_id, $user, '3c');

        DB::transaction(function () use ($dokumen, $itemIds) {
            $tahunPenilaian = (string) ($dokumen->periode->tahun_mulai ?? date('Y'));
            $singkatanOpd = $dokumen->singkatan_opd ?: ($dokumen->opd?->singkatan ?: 'OPD');

            foreach ($itemIds as $index => $id) {
                $no = $index + 1;
                $item = $dokumen->items()->where('id', $id)->first();
                if ($item) {
                    $item->urutan = $no;
                    $item->nomor_urut = $no;
                    $item->kode_risiko = $this->generateKodeRisiko($tahunPenilaian, $singkatanOpd, $item->kategori_risiko, $no);
                    $item->save();
                }
            }
        });
    }

    /**
     * Generate Kode Risiko matching the Excel template:
     * Format: ROO.[Tahun 2 Digit].[Singkatan OPD].[Singkatan Kategori].[3 Digit Nomor Urut]
     * Contoh: ROO.26.PUTR.RO.001
     */
    public function generateKodeRisiko(string $tahunPenilaian, string $singkatanOpd, string $kategoriRisiko, int $nomorUrut): string
    {
        $twoDigitYear = substr($tahunPenilaian, -2);
        $cleanOpd = strtoupper(preg_replace('/[^A-Za-z0-9]/', '', $singkatanOpd) ?: 'OPD');
        $kategoriSingkatan = self::KATEGORI_KODE_MAP[$kategoriRisiko] ?? 'RO';
        $paddedNumber = str_pad((string) $nomorUrut, 3, '0', STR_PAD_LEFT);

        return "ROO.{$twoDigitYear}.{$cleanOpd}.{$kategoriSingkatan}.{$paddedNumber}";
    }
}
