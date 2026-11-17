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
use App\Services\Risiko\TindakPengendalianService;

class TindakPengendalian6Handler implements LaporanFormHandlerInterface, RiskFormHandlerInterface
{
    public function __construct(
        protected AnalisisRisiko4Handler $analisisHandler,
        protected TindakPengendalianService $tindakService,
        protected AnalisisRisikoPolicy $policy
    ) {}

    public function getFormCode(): string
    {
        return '6';
    }

    public function getName(): string
    {
        return 'Rencana Tindak Pengendalian (Form 6)';
    }

    public function getOrder(): int
    {
        return 9;
    }

    public function isComplete(string $opdId, string $periodeId): bool
    {
        if (! $this->analisisHandler->isComplete($opdId, $periodeId)) {
            return false;
        }

        $priorityRows = $this->tindakService->query($opdId, $periodeId)->get();

        return $priorityRows->every(fn ($row) => TindakPengendalianService::isComplete((array) $row));
    }

    public function getIncompleteMessage(): string
    {
        return 'Lengkapi rencana tindak untuk setiap risiko prioritas.';
    }

    public function isRequired(PengajuanPenilaianRisiko $submission): bool
    {
        return true;
    }

    public function getReviewData(PengajuanPenilaianRisiko $submission, array $params, User $user): array
    {
        if (! $submission->items->contains('form_code', '6')) {
            abort(404);
        }

        $result = $this->tindakService->list(
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
        return ['7', '8', '9'];
    }

    public function getLaporanData(Opd $opd, PeriodePenilaian $periode, User $user): array
    {
        $result = $this->tindakService->list(
            (string) $opd->id,
            (string) $periode->id,
            $user,
            ['per_page' => 1000]
        );

        return [
            'raw' => $result['items'] ?? [],
        ];
    }

    public function getExcelHeaders(): array
    {
        return [
            'No',
            'Asal (3B/3C)',
            'Kode Risiko',
            'Pernyataan Risiko',
            'Pengendalian yang Ada',
            'Celah Pengendalian',
            'Rencana Tindak Pengendalian (RTP)',
            'Penanggung Jawab',
            'Target Waktu',
            'Kemungkinan Treated',
            'Dampak Treated',
            'Level Treated',
            'Status Kelengkapan',
        ];
    }

    public function getExcelRows(array $laporanData): iterable
    {
        $items = $laporanData['raw'] ?? [];

        if (empty($items)) {
            return [
                ['1', '-', '-', 'Belum ada rencana tindak pengendalian (RTP) untuk periode ini', '-', '-', '-', '-', '-', '-', '-', '-', '-'],
            ];
        }

        $no = 1;
        $rows = [];
        foreach ($items as $row) {
            $r = (array) $row;
            $rows[] = [
                (string) ($no++),
                strtoupper((string) ($r['source'] ?? '-')),
                $r['kode_risiko'] ?? '-',
                $r['pernyataan_risiko'] ?? '-',
                $r['pengendalian_uraian'] ?? 'Belum ada',
                $r['celah_pengendalian'] ?? '-',
                $r['rencana_tindak'] ?? '-',
                $r['penanggung_jawab'] ?? '-',
                $r['target_waktu'] ?? '-',
                (string) ($r['treated_kemungkinan'] ?? '-'),
                (string) ($r['treated_dampak'] ?? '-'),
                (string) ($r['skala_treated'] ?? '-'),
                ! empty($r['complete']) ? 'Lengkap' : 'Belum Lengkap',
            ];
        }

        return $rows;
    }
}
