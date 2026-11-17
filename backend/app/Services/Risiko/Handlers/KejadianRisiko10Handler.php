<?php

declare(strict_types=1);

namespace App\Services\Risiko\Handlers;

use App\Contracts\Risiko\LaporanFormHandlerInterface;
use App\Contracts\Risiko\RiskFormHandlerInterface;
use App\Http\Resources\Risiko\KejadianRisikoResource;
use App\Models\Opd;
use App\Models\Perencanaan\PeriodePenilaian;
use App\Models\Risiko\PengajuanPenilaianRisiko;
use App\Models\User;
use App\Policies\Risiko\AnalisisRisikoPolicy;
use App\Services\Risiko\KejadianRisikoService;

class KejadianRisiko10Handler implements LaporanFormHandlerInterface, RiskFormHandlerInterface
{
    public function __construct(
        protected KejadianRisikoService $kejadianService,
        protected AnalisisRisikoPolicy $policy
    ) {}

    public function getFormCode(): string
    {
        return '10';
    }

    public function getName(): string
    {
        return 'Pencatatan Kejadian Risiko (Form 10)';
    }

    public function getOrder(): int
    {
        return 13;
    }

    public function isComplete(string $opdId, string $periodeId): bool
    {
        return $this->kejadianService->isComplete($opdId, $periodeId);
    }

    public function getIncompleteMessage(): string
    {
        return 'Lengkapi data kejadian risiko atau konfirmasikan status nihil kejadian untuk tahun berjalan.';
    }

    public function isRequired(PengajuanPenilaianRisiko $submission): bool
    {
        return true;
    }

    public function getReviewData(PengajuanPenilaianRisiko $submission, array $params, User $user): array
    {
        if (! $submission->items->contains('form_code', '10')) {
            abort(404);
        }

        $result = $this->kejadianService->list(
            (string) $submission->opd_id,
            (string) $submission->periode_penilaian_id,
            $user,
            $params
        );

        return [
            'data' => KejadianRisikoResource::collection($result['items']),
            'meta' => $result['meta'],
            'is_nihil' => $result['is_nihil'],
            'nihil_info' => $result['nihil_info'],
        ];
    }

    public function authorizeView(User $user, string $opdId): bool
    {
        return $this->policy->view($user, $opdId);
    }

    public function authorizeEdit(User $user, string $opdId): bool
    {
        return $this->policy->view($user, $opdId)
            && ($user->hasRole(['Superadmin', 'Admin Office']) || (string) $user->opd_id === $opdId);
    }

    public function getDownstreamFormCodes(): array
    {
        return [];
    }

    public function getLaporanData(Opd $opd, PeriodePenilaian $periode, User $user): array
    {
        $result = $this->kejadianService->list((string) $opd->id, (string) $periode->id, $user, ['per_page' => 1000]);

        return [
            'raw' => KejadianRisikoResource::collection($result['items'])->resolve(),
            'is_nihil' => (bool) ($result['is_nihil'] ?? false),
            'nihil_info' => $result['nihil_info'] ?? null,
        ];
    }

    public function getExcelHeaders(): array
    {
        return [
            'No',
            'Sumber Risiko',
            'Kode Risiko',
            'Pernyataan Risiko',
            'Kategori',
            'Pemilik Risiko',
            'Tanggal Kejadian',
            'Penyebab Kejadian',
            'Dampak Nyata',
            'Keterangan Kejadian',
            'Rencana Tindak (Form 6)',
            'Target Waktu RTP',
            'Realisasi Waktu RTP',
            'Keterangan Realisasi RTP',
        ];
    }

    public function getExcelRows(array $laporanData): iterable
    {
        if (! empty($laporanData['is_nihil'])) {
            return [
                ['1', 'STATUS NIHIL', '-', 'KONFIRMASI STATUS NIHIL: Tidak terdapat kejadian risiko operasional/strategis sepanjang tahun anggaran berjalan', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-'],
            ];
        }

        $items = $laporanData['raw'] ?? [];

        if (empty($items)) {
            return [
                ['1', '-', '-', 'Belum ada catatan kejadian risiko (Form 10) untuk periode ini', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-'],
            ];
        }

        $rows = [];
        $no = 1;

        foreach ($items as $item) {
            $source = match ($item['source_type'] ?? '') {
                '3a' => 'Pemda (3A)',
                '3b' => 'Strategis OPD (3B)',
                '3c' => 'Operasional OPD (3C)',
                default => '-',
            };

            $rows[] = [
                (string) ($no++),
                $source,
                $item['kode_risiko'] ?? '-',
                $item['pernyataan_risiko'] ?? '-',
                $item['kategori_risiko'] ?? '-',
                $item['pemilik_risiko'] ?? '-',
                $item['tanggal_kejadian'] ?? '-',
                $item['sebab'] ?? '-',
                $item['dampak'] ?? '-',
                $item['keterangan'] ?? '-',
                $item['rencana_tindak'] ?? '-',
                $item['target_waktu'] ?? '-',
                $item['realisasi_waktu_rtp'] ?? '-',
                $item['keterangan_rtp'] ?? '-',
            ];
        }

        return $rows;
    }
}
