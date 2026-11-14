<?php

declare(strict_types=1);

namespace App\Services\Risiko;

use App\Models\Master\MasterPemilikRisiko;
use App\Models\Opd;
use App\Models\Perencanaan\PeriodePenilaian;
use App\Models\Risiko\IdentifikasiRisikoOpd;
use App\Models\Risiko\IdentifikasiRisikoOpdItem;
use App\Models\Risiko\IdentifikasiRisikoPemda;
use App\Models\Risiko\KonteksPenilaian;
use App\Models\Risiko\RootCauseAnalysis;
use App\Models\User;
use App\Services\Risiko\Pengajuan\PengajuanReadinessService;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class IdentifikasiRisikoOpdService
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
     * Get current Form 3B document with items, sasaran, indikator, and RCA relations.
     */
    public function getCurrentDokumen(string $opdId, ?string $periodeId = null): ?IdentifikasiRisikoOpd
    {
        $resolvedPeriodeId = $this->resolvePeriodeId($periodeId);

        return IdentifikasiRisikoOpd::where('opd_id', $opdId)
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
     * Create or update Form 3B header (Urusan Pemerintahan, Singkatan OPD, dsb).
     */
    public function saveHeader(array $data, ?User $user = null): IdentifikasiRisikoOpd
    {
        $opdId = (string) $data['opd_id'];
        $periodeId = $this->resolvePeriodeId($data['periode_penilaian_id'] ?? null);

        // Security check
        $this->readinessService->assertOpdCanEdit($opdId, $periodeId, $user, '3b');

        return DB::transaction(function () use ($data, $opdId, $periodeId, $user) {
            $dokumen = IdentifikasiRisikoOpd::firstOrNew([
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

            $dokumen->master_urusan_pemerintahan_id = $urusanId;
            $dokumen->nama_pemda = $data['nama_pemda'] ?? $dokumen->nama_pemda ?? 'Pemerintah Kabupaten Cianjur';
            $dokumen->singkatan_opd = $data['singkatan_opd'] ?? $dokumen->singkatan_opd ?? $opd?->singkatan ?? 'OPD';
            $dokumen->nama_kepala_opd = $data['nama_kepala_opd'] ?? $dokumen->nama_kepala_opd ?? $opd?->kepala;
            $dokumen->updated_by = $user?->id;

            if ($isNew) {
                $dokumen->created_by = $user?->id;
                $dokumen->status = 'draft';
            }

            $dokumen->save();

            return $dokumen->load(['opd', 'periode', 'urusanPemerintahan']);
        });
    }

    public function pemilikRisikoOptions(): Collection
    {
        return MasterPemilikRisiko::where('is_active', true)->orderBy('urutan')->get(['id', 'nama']);
    }

    private function assertReferensiForm2b(IdentifikasiRisikoOpd $dokumen, array $data): void
    {
        $konteks = KonteksPenilaian::where('opd_id', $dokumen->opd_id)
            ->where('periode_penilaian_id', $dokumen->periode_penilaian_id)->first();
        if (! $konteks || ! $konteks->sasarans()->reorder()->where('sasaran_penilaians.id', $data['sasaran_penilaian_id'])->exists()) {
            throw ValidationException::withMessages(['sasaran_penilaian_id' => 'Sasaran harus berasal dari Form 2B.']);
        }
        $indikator = $konteks->indikators()->reorder()->where('indikator_penilaians.id', $data['indikator_penilaian_id'])
            ->where('indikator_penilaians.sasaran_penilaian_id', $data['sasaran_penilaian_id'])->exists();
        if (! $indikator) {
            throw ValidationException::withMessages(['indikator_penilaian_id' => 'Indikator harus berasal dari sasaran pada Form 2B.']);
        }
    }

    /**
     * Add a new risk item to Form 3B.
     */
    public function storeItem(IdentifikasiRisikoOpd $dokumen, array $data, ?User $user = null): IdentifikasiRisikoOpdItem
    {
        $this->readinessService->assertOpdCanEdit((string) $dokumen->opd_id, (string) $dokumen->periode_penilaian_id, $user, '3b');

        $this->assertReferensiForm2b($dokumen, $data);

        return DB::transaction(function () use ($dokumen, $data, $user) {
            $nextUrutan = ($dokumen->items()->max('urutan') ?? 0) + 1;
            $nextNomorUrut = ($dokumen->items()->max('nomor_urut') ?? 0) + 1;

            $tahunPenilaian = (string) ($dokumen->periode->tahun_mulai ?? date('Y'));
            $singkatanOpd = $dokumen->singkatan_opd ?: ($dokumen->opd?->singkatan ?: 'OPD');
            $kodeRisiko = $this->generateKodeRisiko($tahunPenilaian, $singkatanOpd, $data['kategori_risiko'], $nextNomorUrut);

            $item = new IdentifikasiRisikoOpdItem;
            $item->identifikasi_risiko_opd_id = $dokumen->id;
            $item->sasaran_penilaian_id = $data['sasaran_penilaian_id'] ?? null;
            $item->sasaran_kustom = $data['sasaran_kustom'] ?? null;
            $item->indikator_penilaian_id = $data['indikator_penilaian_id'] ?? null;
            $item->indikator_kustom = $data['indikator_kustom'] ?? null;
            $item->kategori_risiko = $data['kategori_risiko'];
            $item->nomor_urut = $nextNomorUrut;
            $item->pernyataan_risiko = $data['pernyataan_risiko'];
            $item->kode_risiko = $kodeRisiko;
            $item->pemilik_risiko = $data['pemilik_risiko'];
            $item->sifat_risiko = $data['sifat_risiko'] ?? 'C';
            $item->uraian_dampak = $data['uraian_dampak'] ?? null;
            $item->pihak_terkena = $data['pihak_terkena'] ?? null;
            $item->urutan = $nextUrutan;
            $item->created_by = $user?->id;
            $item->updated_by = $user?->id;
            $item->save();

            // Create initial 1-to-1 RCA record for this 3B item
            $rca = new RootCauseAnalysis;
            $rca->source_type = '3b';
            $rca->identifikasi_risiko_opd_item_id = $item->id;
            $rca->created_by = $user?->id;
            $rca->updated_by = $user?->id;
            $rca->save();

            return $item->load(['sasaran', 'indikator', 'rca']);
        });
    }

    /**
     * Update an existing risk item in Form 3B.
     */
    public function updateItem(IdentifikasiRisikoOpdItem $item, array $data, ?User $user = null): IdentifikasiRisikoOpdItem
    {
        $dokumen = $item->dokumen;
        $this->readinessService->assertOpdCanEdit((string) $dokumen->opd_id, (string) $dokumen->periode_penilaian_id, $user, '3b');

        $this->assertReferensiForm2b($dokumen, $data);

        return DB::transaction(function () use ($item, $dokumen, $data, $user) {
            $tahunPenilaian = (string) ($dokumen->periode->tahun_mulai ?? date('Y'));
            $singkatanOpd = $dokumen->singkatan_opd ?: ($dokumen->opd?->singkatan ?: 'OPD');

            // If category changed, regenerate code
            if (isset($data['kategori_risiko']) && $data['kategori_risiko'] !== $item->kategori_risiko) {
                $item->kategori_risiko = $data['kategori_risiko'];
                $item->kode_risiko = $this->generateKodeRisiko($tahunPenilaian, $singkatanOpd, $data['kategori_risiko'], $item->nomor_urut);
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
                $item->pemilik_risiko = $data['pemilik_risiko'];
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
     * Delete a risk item in Form 3B.
     */
    public function destroyItem(IdentifikasiRisikoOpdItem $item, ?User $user = null): bool
    {
        $dokumen = $item->dokumen;
        $this->readinessService->assertOpdCanEdit((string) $dokumen->opd_id, (string) $dokumen->periode_penilaian_id, $user, '3b');

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
     * Reorder risk items in Form 3B.
     */
    public function reorderItems(IdentifikasiRisikoOpd $dokumen, array $itemIds, ?User $user = null): void
    {
        $this->readinessService->assertOpdCanEdit((string) $dokumen->opd_id, (string) $dokumen->periode_penilaian_id, $user, '3b');

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
     * Format: RSO.[Tahun 2 Digit].[Singkatan OPD].[Singkatan Kategori].[3 Digit Nomor Urut]
     * Contoh: RSO.26.PUTR.RS.001
     */
    public function generateKodeRisiko(string $tahunPenilaian, string $singkatanOpd, string $kategoriRisiko, int $nomorUrut): string
    {
        $twoDigitYear = substr($tahunPenilaian, -2);
        $cleanOpd = strtoupper(preg_replace('/[^A-Za-z0-9]/', '', $singkatanOpd) ?: 'OPD');
        $kategoriSingkatan = self::KATEGORI_KODE_MAP[$kategoriRisiko] ?? 'RS';
        $paddedNumber = str_pad((string) $nomorUrut, 3, '0', STR_PAD_LEFT);

        return "RSO.{$twoDigitYear}.{$cleanOpd}.{$kategoriSingkatan}.{$paddedNumber}";
    }
}
