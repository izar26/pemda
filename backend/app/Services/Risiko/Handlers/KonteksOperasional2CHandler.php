<?php

declare(strict_types=1);

namespace App\Services\Risiko\Handlers;

use App\Contracts\Risiko\LaporanFormHandlerInterface;
use App\Contracts\Risiko\RiskFormHandlerInterface;
use App\Http\Resources\Risiko\KonteksOperasionalResource;
use App\Models\Opd;
use App\Models\Perencanaan\PeriodePenilaian;
use App\Models\Risiko\KonteksOperasional;
use App\Models\Risiko\PengajuanPenilaianRisiko;
use App\Models\User;

class KonteksOperasional2CHandler implements LaporanFormHandlerInterface, RiskFormHandlerInterface
{
    public function getFormCode(): string
    {
        return '2c';
    }

    public function getName(): string
    {
        return 'Konteks Operasional (Form 2C)';
    }

    public function getOrder(): int
    {
        return 2;
    }

    public function isComplete(string $opdId, string $periodeId): bool
    {
        $operasional = KonteksOperasional::where('opd_id', $opdId)
            ->where('periode_penilaian_id', $periodeId)
            ->withCount(['items as programs_count' => fn ($q) => $q->where('jenis', 'program')])
            ->first();

        return (bool) ($operasional && $operasional->programs_count > 0);
    }

    public function getIncompleteMessage(): string
    {
        return 'Pohon kinerja program/kegiatan operasional belum ditambahkan.';
    }

    public function isRequired(PengajuanPenilaianRisiko $submission): bool
    {
        return true;
    }

    public function getReviewData(PengajuanPenilaianRisiko $submission, array $params, User $user): array
    {
        $data = KonteksOperasional::where('opd_id', (string) $submission->opd_id)
            ->where('periode_penilaian_id', (string) $submission->periode_penilaian_id)
            ->with([
                'opd',
                'periode',
                'sumberData',
                'konteksStrategis.tujuan',
                'programs.indikators',
                'programs.children.indikators',
                'programs.children.children.indikators',
            ])->first();

        return [
            'data' => $data ? new KonteksOperasionalResource($data) : null,
            'meta' => null,
        ];
    }

    public function authorizeView(User $user, string $opdId): bool
    {
        if (! $user->can('konteks_operasional.view')) {
            return false;
        }

        return $user->hasRole(['Superadmin', 'Admin Office', 'Inspektorat', 'Auditor'])
            || (string) $user->opd_id === $opdId;
    }

    public function authorizeEdit(User $user, string $opdId): bool
    {
        if (! $user->can('konteks_operasional.edit')) {
            return false;
        }

        return $user->hasRole(['Superadmin', 'Admin Office'])
            || (string) $user->opd_id === $opdId;
    }

    public function getDownstreamFormCodes(): array
    {
        return ['3c'];
    }

    public function getLaporanData(Opd $opd, PeriodePenilaian $periode, User $user): array
    {
        $data = KonteksOperasional::where('opd_id', (string) $opd->id)
            ->where('periode_penilaian_id', (string) $periode->id)
            ->with([
                'opd',
                'periode',
                'sumberData',
                'konteksStrategis.tujuan',
                'programs.indikators',
                'programs.children.indikators',
                'programs.children.children.indikators',
            ])->first();

        return [
            'raw' => $data ? (new KonteksOperasionalResource($data))->resolve() : null,
        ];
    }

    public function getExcelHeaders(): array
    {
        return [
            'No',
            'Program / Kegiatan / Sub Kegiatan',
            'Tingkat (Level)',
            'Indikator Kinerja',
            'Target',
            'Satuan',
        ];
    }

    public function getExcelRows(array $laporanData): iterable
    {
        $raw = $laporanData['raw'] ?? null;
        if (! $raw || empty($raw['programs'])) {
            return [
                ['1', 'Belum ada data pohon kinerja operasional yang ditetapkan', '-', '-', '-', '-'],
            ];
        }

        $no = 1;
        $rows = [];

        foreach ($raw['programs'] as $prog) {
            $progName = sprintf('Program: %s', $prog['nama_program'] ?? '-');
            $pIndikators = $prog['indikators'] ?? [];

            if (empty($pIndikators)) {
                $rows[] = [(string) $no++, $progName, 'Program', '-', '-', '-'];
            } else {
                foreach ($pIndikators as $idx => $ind) {
                    $rows[] = [
                        $idx === 0 ? (string) $no++ : '',
                        $idx === 0 ? $progName : '',
                        'Program',
                        $ind['nama_indikator'] ?? '-',
                        (string) ($ind['target'] ?? '-'),
                        $ind['satuan'] ?? '-',
                    ];
                }
            }

            // Kegiatan (Children)
            $kegiatans = $prog['children'] ?? [];
            foreach ($kegiatans as $keg) {
                $kegName = sprintf('  Kegiatan: %s', $keg['nama_program'] ?? '-');
                $kIndikators = $keg['indikators'] ?? [];

                if (empty($kIndikators)) {
                    $rows[] = ['', $kegName, 'Kegiatan', '-', '-', '-'];
                } else {
                    foreach ($kIndikators as $ind) {
                        $rows[] = [
                            '',
                            $kegName,
                            'Kegiatan',
                            $ind['nama_indikator'] ?? '-',
                            (string) ($ind['target'] ?? '-'),
                            $ind['satuan'] ?? '-',
                        ];
                    }
                }

                // Sub-Kegiatan (Children of Kegiatan)
                $subKegiatans = $keg['children'] ?? [];
                foreach ($subKegiatans as $sub) {
                    $subName = sprintf('    Sub-Kegiatan: %s', $sub['nama_program'] ?? '-');
                    $sIndikators = $sub['indikators'] ?? [];

                    if (empty($sIndikators)) {
                        $rows[] = ['', $subName, 'Sub-Kegiatan', '-', '-', '-'];
                    } else {
                        foreach ($sIndikators as $ind) {
                            $rows[] = [
                                '',
                                $subName,
                                'Sub-Kegiatan',
                                $ind['nama_indikator'] ?? '-',
                                (string) ($ind['target'] ?? '-'),
                                $ind['satuan'] ?? '-',
                            ];
                        }
                    }
                }
            }
        }

        return $rows;
    }
}
