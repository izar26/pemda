<?php

declare(strict_types=1);

namespace App\Services\Risiko\Handlers;

use App\Contracts\Risiko\LaporanFormHandlerInterface;
use App\Contracts\Risiko\RiskFormHandlerInterface;
use App\Http\Resources\Risiko\IdentifikasiRisikoPemdaResource;
use App\Models\Opd;
use App\Models\Perencanaan\PeriodePenilaian;
use App\Models\Risiko\IdentifikasiRisikoPemda;
use App\Models\Risiko\PengajuanPenilaianRisiko;
use App\Models\User;

class IdentifikasiPemda3AHandler implements LaporanFormHandlerInterface, RiskFormHandlerInterface
{
    public function getFormCode(): string
    {
        return '3a';
    }

    public function getName(): string
    {
        return 'Identifikasi Risiko Pemda (Form 3A)';
    }

    public function getOrder(): int
    {
        return 3;
    }

    public function isComplete(string $opdId, string $periodeId): bool
    {
        $dokumen3a = IdentifikasiRisikoPemda::where('opd_id', $opdId)
            ->where('periode_penilaian_id', $periodeId)
            ->withCount('items')
            ->first();

        return (bool) (
            $dokumen3a &&
            ! empty($dokumen3a->master_urusan_pemerintahan_id) &&
            $dokumen3a->items_count > 0
        );
    }

    public function getIncompleteMessage(): string
    {
        return 'Urusan Pemerintahan belum dipilih atau daftar risiko strategis Pemda belum ditambahkan.';
    }

    public function isRequired(PengajuanPenilaianRisiko $submission): bool
    {
        return true;
    }

    public function getReviewData(PengajuanPenilaianRisiko $submission, array $params, User $user): array
    {
        $opd = (string) $submission->opd_id;
        $periode = (string) $submission->periode_penilaian_id;

        $document = IdentifikasiRisikoPemda::where('opd_id', $opd)
            ->where('periode_penilaian_id', $periode)
            ->with(['opd', 'periode', 'urusanPemerintahan'])
            ->first();

        if (! $document) {
            return ['data' => null, 'meta' => null];
        }

        $page = (int) ($params['page'] ?? 1);
        $perPage = (int) ($params['per_page'] ?? 20);
        $search = trim((string) ($params['search'] ?? ''));

        $query = $document->items()->with(['sasaran', 'indikator', 'rca'])->reorder()->orderBy('urutan')->orderBy('id');
        if ($search !== '') {
            $term = '%'.mb_strtolower($search).'%';
            $query->where(fn ($q) => $q->whereRaw('LOWER(kode_risiko) LIKE ?', [$term])->orWhereRaw('LOWER(pernyataan_risiko) LIKE ?', [$term]));
        }

        $results = $query->paginate($perPage, ['*'], 'page', $page);
        $document->setRelation('items', $results->getCollection());

        return [
            'data' => new IdentifikasiRisikoPemdaResource($document),
            'meta' => [
                'current_page' => $results->currentPage(),
                'last_page' => $results->lastPage(),
                'per_page' => $results->perPage(),
                'total' => $results->total(),
            ],
        ];
    }

    public function authorizeView(User $user, string $opdId): bool
    {
        if (! $user->can('identifikasi_risiko_pemda.view')) {
            return false;
        }

        return $user->hasRole(['Superadmin', 'Admin Office', 'Inspektorat', 'Auditor'])
            || (string) $user->opd_id === $opdId;
    }

    public function authorizeEdit(User $user, string $opdId): bool
    {
        if (! $user->can('identifikasi_risiko_pemda.edit')) {
            return false;
        }

        return $user->hasRole(['Superadmin', 'Admin Office'])
            || (string) $user->opd_id === $opdId;
    }

    public function getDownstreamFormCodes(): array
    {
        return ['rca'];
    }

    public function getLaporanData(Opd $opd, PeriodePenilaian $periode, User $user): array
    {
        $document = IdentifikasiRisikoPemda::where('opd_id', (string) $opd->id)
            ->where('periode_penilaian_id', (string) $periode->id)
            ->with(['opd', 'periode', 'urusanPemerintahan'])
            ->first();

        if (! $document) {
            return ['raw' => null];
        }

        $items = $document->items()
            ->with(['sasaran', 'indikator', 'rca'])
            ->reorder()
            ->orderBy('urutan')
            ->orderBy('id')
            ->get();

        $document->setRelation('items', $items);

        return [
            'raw' => (new IdentifikasiRisikoPemdaResource($document))->resolve(),
        ];
    }

    public function getExcelHeaders(): array
    {
        return [
            'No',
            'Sasaran Strategis Pemda',
            'Indikator Sasaran (IKU)',
            'Kategori Risiko',
            'Kode Risiko',
            'Pernyataan Risiko',
            'Pemilik Risiko',
            'Uraian Sebab (RCA)',
            'Sumber Risiko',
            'C/UC',
            'Uraian Dampak',
            'Pihak Terkena',
        ];
    }

    public function getExcelRows(array $laporanData): iterable
    {
        $raw = $laporanData['raw'] ?? null;
        $items = $raw['items'] ?? [];

        if (empty($items)) {
            return [
                ['1', 'Belum ada data risiko strategis Pemda yang diidentifikasi untuk OPD ini', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-'],
            ];
        }

        $no = 1;
        $rows = [];
        foreach ($items as $item) {
            $rows[] = [
                (string) ($item['nomor_urut'] ?? $no++),
                $item['resolved_sasaran'] ?? '-',
                $item['resolved_indikator'] ?? '-',
                $item['kategori_risiko'] ?? '-',
                $item['kode_risiko'] ?? '-',
                $item['pernyataan_risiko'] ?? '-',
                $item['pemilik_risiko'] ?? '-',
                $item['uraian_sebab'] ?? '-',
                $item['sumber_risiko'] ?? '-',
                $item['sifat_risiko'] ?? '-',
                $item['uraian_dampak'] ?? '-',
                $item['pihak_terkena'] ?? '-',
            ];
        }

        return $rows;
    }
}
