<?php

declare(strict_types=1);

namespace App\Services\Risiko\Handlers;

use App\Contracts\Risiko\LaporanFormHandlerInterface;
use App\Contracts\Risiko\RiskFormHandlerInterface;
use App\Models\Opd;
use App\Models\Perencanaan\PeriodePenilaian;
use App\Models\Risiko\PengajuanPenilaianRisiko;
use App\Models\User;
use App\Policies\Risiko\AnalisisRisikoPolicy;
use App\Services\Risiko\PemantauanPengendalianService;

class PemantauanPengendalian9Handler implements LaporanFormHandlerInterface, RiskFormHandlerInterface
{
    public function __construct(
        protected TindakPengendalian6Handler $tindakHandler,
        protected PemantauanPengendalianService $pemantauanService,
        protected AnalisisRisikoPolicy $policy
    ) {}

    public function getFormCode(): string
    {
        return '9';
    }

    public function getName(): string
    {
        return 'Pemantauan Pengendalian Intern (Form 9)';
    }

    public function getOrder(): int
    {
        return 12;
    }

    public function isComplete(string $opdId, string $periodeId): bool
    {
        if (! $this->tindakHandler->isComplete($opdId, $periodeId)) {
            return false;
        }

        $priorityRows = $this->pemantauanService->query($opdId, $periodeId)->get();

        return $priorityRows->every(fn ($row) => PemantauanPengendalianService::isComplete((array) $row));
    }

    public function getIncompleteMessage(): string
    {
        return 'Lengkapi rancangan pemantauan pengendalian intern untuk setiap risiko prioritas.';
    }

    public function isRequired(PengajuanPenilaianRisiko $submission): bool
    {
        return true;
    }

    public function getReviewData(PengajuanPenilaianRisiko $submission, array $params, User $user): array
    {
        if (! $submission->items->contains('form_code', '9')) {
            abort(404);
        }

        $result = $this->pemantauanService->list(
            (string) $submission->opd_id,
            (string) $submission->periode_penilaian_id,
            $user,
            $params
        );

        return ['data' => $result['items'], 'meta' => $result['pagination']];
    }

    public function authorizeView(User $user, string $opdId): bool
    {
        return $this->policy->view($user, $opdId);
    }

    public function authorizeEdit(User $user, string $opdId): bool
    {
        return $this->policy->edit($user, $opdId, '3b') || $this->policy->edit($user, $opdId, '3c');
    }

    public function getDownstreamFormCodes(): array
    {
        return [];
    }

    public function getLaporanData(Opd $opd, PeriodePenilaian $periode, User $user): array
    {
        $result = $this->pemantauanService->list((string) $opd->id, (string) $periode->id, $user, ['per_page' => 1000]);

        return [
            'rows' => $result['items'],
        ];
    }

    public function getExcelHeaders(): array
    {
        return [
            'No',
            'Sumber',
            'Kode Risiko',
            'Pernyataan Risiko',
            'Kategori',
            'Pemilik Risiko',
            'Uraian Dampak',
            'Rencana Tindak (Form 6)',
            'Bentuk Pemantauan',
            'Penanggung Jawab Pemantauan',
            'Rencana Waktu Pemantauan',
            'Realisasi Waktu Pemantauan',
            'Keterangan',
            'Status Kelengkapan',
        ];
    }

    public function getExcelRows(array $laporanData): iterable
    {
        $items = $laporanData['rows'] ?? [];

        if (empty($items)) {
            return [
                ['1', '-', '-', 'Belum ada data pemantauan pengendalian intern (Form 9) untuk periode ini', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-'],
            ];
        }

        $rows = [];
        $no = 1;

        foreach ($items as $item) {
            $rowArr = (array) $item;
            $rows[] = [
                (string) ($no++),
                ($rowArr['source'] ?? '') === '3b' ? 'Strategis OPD (3B)' : 'Operasional OPD (3C)',
                $rowArr['kode_risiko'] ?? '',
                $rowArr['pernyataan_risiko'] ?? '',
                $rowArr['kategori_risiko'] ?? '',
                $rowArr['pemilik_risiko'] ?? '',
                $rowArr['uraian_dampak'] ?? '',
                $rowArr['rencana_tindak'] ?? '',
                $rowArr['bentuk_pemantauan'] ?? '',
                $rowArr['penanggung_jawab_pemantauan'] ?? '',
                $rowArr['rencana_waktu_pemantauan'] ?? '',
                $rowArr['realisasi_waktu_pemantauan'] ?? '',
                $rowArr['keterangan'] ?? '',
                ! empty($rowArr['complete']) ? 'Lengkap' : 'Belum Lengkap',
            ];
        }

        return $rows;
    }
}
