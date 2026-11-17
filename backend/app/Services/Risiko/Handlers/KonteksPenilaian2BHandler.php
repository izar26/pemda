<?php

declare(strict_types=1);

namespace App\Services\Risiko\Handlers;

use App\Contracts\Risiko\LaporanFormHandlerInterface;
use App\Contracts\Risiko\RiskFormHandlerInterface;
use App\Http\Resources\Risiko\KonteksPenilaianResource;
use App\Models\Opd;
use App\Models\Perencanaan\PeriodePenilaian;
use App\Models\Risiko\KonteksPenilaian;
use App\Models\Risiko\PengajuanPenilaianRisiko;
use App\Models\User;
use App\Services\Risiko\KonteksPenilaianService;

class KonteksPenilaian2BHandler implements LaporanFormHandlerInterface, RiskFormHandlerInterface
{
    public function __construct(
        protected KonteksPenilaianService $service
    ) {}

    public function getFormCode(): string
    {
        return '2b';
    }

    public function getName(): string
    {
        return 'Konteks Strategis (Form 2B)';
    }

    public function getOrder(): int
    {
        return 1;
    }

    public function isComplete(string $opdId, string $periodeId): bool
    {
        $konteks2b = KonteksPenilaian::where('opd_id', $opdId)
            ->where('periode_penilaian_id', $periodeId)
            ->with(['sasarans', 'indikators'])
            ->first();

        return (bool) (
            $konteks2b &&
            ! empty($konteks2b->sumber_data_id) &&
            ! empty($konteks2b->tujuan_penilaian_id) &&
            $konteks2b->sasarans->isNotEmpty() &&
            $konteks2b->indikators->isNotEmpty()
        );
    }

    public function getIncompleteMessage(): string
    {
        return 'Tujuan, sasaran, dan indikator strategis OPD belum terisi lengkap.';
    }

    public function isRequired(PengajuanPenilaianRisiko $submission): bool
    {
        return true;
    }

    public function getReviewData(PengajuanPenilaianRisiko $submission, array $params, User $user): array
    {
        $data = $this->service->getKonteksByOpd((string) $submission->opd_id, (string) $submission->periode_penilaian_id);

        return [
            'data' => $data ? new KonteksPenilaianResource($data) : null,
            'meta' => null,
        ];
    }

    public function authorizeView(User $user, string $opdId): bool
    {
        if (! $user->can('konteks_penetapan.view')) {
            return false;
        }

        return $user->hasRole(['Superadmin', 'Admin Office', 'Inspektorat', 'Auditor'])
            || (string) $user->opd_id === $opdId;
    }

    public function authorizeEdit(User $user, string $opdId): bool
    {
        if (! $user->can('konteks_penetapan.edit')) {
            return false;
        }

        return $user->hasRole(['Superadmin', 'Admin Office'])
            || (string) $user->opd_id === $opdId;
    }

    public function getDownstreamFormCodes(): array
    {
        return ['2c', '3b', '3c'];
    }

    public function getLaporanData(Opd $opd, PeriodePenilaian $periode, User $user): array
    {
        $data = $this->service->getKonteksByOpd((string) $opd->id, (string) $periode->id);

        return [
            'raw' => $data ? (new KonteksPenilaianResource($data))->resolve() : null,
        ];
    }

    public function getExcelHeaders(): array
    {
        return [
            'No',
            'Sasaran Strategis OPD',
            'Indikator Kinerja Utama (IKU)',
            'Target',
            'Satuan',
        ];
    }

    public function getExcelRows(array $laporanData): iterable
    {
        $raw = $laporanData['raw'] ?? null;
        if (! $raw || empty($raw['sasarans'])) {
            return [
                ['1', 'Belum ada data sasaran strategis yang ditetapkan', '-', '-', '-'],
            ];
        }

        $no = 1;
        $rows = [];
        foreach ($raw['sasarans'] as $sasaran) {
            $sasaranText = $sasaran['nama_sasaran'] ?? '-';
            $indikators = $sasaran['indikators'] ?? [];

            if (empty($indikators)) {
                $rows[] = [(string) $no++, $sasaranText, '-', '-', '-'];

                continue;
            }

            foreach ($indikators as $idx => $ind) {
                $rows[] = [
                    $idx === 0 ? (string) $no++ : '',
                    $idx === 0 ? $sasaranText : '',
                    $ind['nama_indikator'] ?? '-',
                    (string) ($ind['target'] ?? '-'),
                    $ind['satuan'] ?? '-',
                ];
            }
        }

        return $rows;
    }
}
