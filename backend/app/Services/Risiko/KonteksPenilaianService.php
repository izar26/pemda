<?php

declare(strict_types=1);

namespace App\Services\Risiko;

use App\Models\Opd;
use App\Models\Perencanaan\IndikatorPenilaian;
use App\Models\Perencanaan\PeriodePenilaian;
use App\Models\Perencanaan\SasaranPenilaian;
use App\Models\Risiko\KonteksOperasional;
use App\Models\Risiko\KonteksOperasionalItem;
use App\Models\Risiko\KonteksPenilaian;
use App\Models\User;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use OpenSpout\Common\Entity\Cell;
use OpenSpout\Common\Entity\Row;
use OpenSpout\Common\Entity\Style\Border;
use OpenSpout\Common\Entity\Style\BorderPart;
use OpenSpout\Common\Entity\Style\Color;
use OpenSpout\Common\Entity\Style\Style;
use OpenSpout\Writer\XLSX\Writer;
use Symfony\Component\HttpFoundation\StreamedResponse;

class KonteksPenilaianService
{
    /**
     * Resolve target evaluation period ID (default to active period).
     */
    public function resolvePeriodeId(?string $periodeId = null): string
    {
        if (!empty($periodeId)) {
            return $periodeId;
        }

        $active = PeriodePenilaian::where('status', 'aktif')->first();
        if (!$active) {
            throw ValidationException::withMessages([
                'periode' => 'Tidak ada periode penilaian yang aktif saat ini. Silakan aktifkan periode penilaian terlebih dahulu.',
            ]);
        }

        return (string) $active->id;
    }

    /**
     * Resolve target evaluation period ID optionally without throwing exception.
     */
    public function resolveOptionalPeriodeId(?string $periodeId = null): ?string
    {
        if (!empty($periodeId)) {
            return $periodeId;
        }

        $active = PeriodePenilaian::where('status', 'aktif')->first();
        return $active ? (string) $active->id : null;
    }

    /**
     * Get paginated list of context assessments (Form 2B).
     *
     * @param array<string, mixed> $filters
     */
    public function getPaginatedKonteks(
        array $filters = [],
        int $perPage = 10,
        string $sortBy = 'created_at',
        string $sortDirection = 'desc'
    ): LengthAwarePaginator {
        $periodeId = $this->resolveOptionalPeriodeId($filters['periode_penilaian_id'] ?? null);
        if (!$periodeId) {
            return KonteksPenilaian::query()->whereRaw('1 = 0')->paginate($perPage);
        }
        $filters['periode_penilaian_id'] = $periodeId;

        $query = KonteksPenilaian::query()
            ->with(['opd', 'periode', 'sumberData', 'tujuan', 'sasarans', 'indikators', 'creator'])
            ->filter($filters);

        if (isset($filters['opd_ids']) && is_array($filters['opd_ids'])) {
            $query->whereIn('opd_id', $filters['opd_ids']);
        }

        $direction = strtolower($sortDirection) === 'asc' ? 'asc' : 'desc';

        return $query->orderBy($sortBy, $direction)->paginate($perPage);
    }

    /**
     * Get context assessment by OPD and active period.
     */
    public function getKonteksByOpd(string $opdId, ?string $periodeId = null): ?KonteksPenilaian
    {
        $resolvedPeriodeId = $this->resolveOptionalPeriodeId($periodeId);
        if (!$resolvedPeriodeId) {
            return null;
        }

        return KonteksPenilaian::with(['opd', 'periode', 'sumberData', 'tujuan', 'sasarans', 'indikators', 'creator'])
            ->where('periode_penilaian_id', $resolvedPeriodeId)
            ->where('opd_id', $opdId)
            ->first();
    }

    /**
     * Get a single context assessment by ID.
     */
    public function getKonteksById(string $id): KonteksPenilaian
    {
        return KonteksPenilaian::with(['opd', 'periode', 'sumberData', 'tujuan', 'sasarans', 'indikators', 'creator', 'updater'])
            ->findOrFail($id);
    }

    /**
     * Get metadata for an OPD in the target evaluation period (Kepala OPD info & Form 2C item counts).
     *
     * @return array<string, mixed>
     */
    public function getOpdMeta(string $opdId, ?string $periodeId = null): array
    {
        $resolvedPeriodeId = $this->resolveOptionalPeriodeId($periodeId);
        $opd = Opd::find($opdId);
        $kepalaPegawai = User::where('opd_id', $opdId)
            ->where('jabatan', 'Kepala OPD')
            ->first();

        $operasional = $resolvedPeriodeId ? KonteksOperasional::withCount([
            'items as total_items_count',
            'items as programs_count' => fn ($q) => $q->where('jenis', 'program'),
            'items as kegiatans_count' => fn ($q) => $q->where('jenis', 'kegiatan'),
            'items as sub_kegiatans_count' => fn ($q) => $q->where('jenis', 'sub_kegiatan'),
        ])
            ->where('periode_penilaian_id', $resolvedPeriodeId)
            ->where('opd_id', $opdId)
            ->first() : null;

        return [
            'kepala_opd' => [
                'nama' => $kepalaPegawai?->name ?? $opd?->kepala ?? null,
                'nip' => $kepalaPegawai?->nip ?? null,
                'jabatan' => $opd ? "Kepala {$opd->nama}" : null,
            ],
            'operasional_summary' => [
                'id' => $operasional?->id,
                'status' => $operasional?->status ?? null,
                'total_items' => (int) ($operasional?->total_items_count ?? 0),
                'programs_count' => (int) ($operasional?->programs_count ?? 0),
                'kegiatans_count' => (int) ($operasional?->kegiatans_count ?? 0),
                'sub_kegiatans_count' => (int) ($operasional?->sub_kegiatans_count ?? 0),
            ],
        ];
    }

    /**
     * Save (create or update) context assessment (Form 2B).
     *
     * @param array<string, mixed> $data
     */
    public function saveKonteks(array $data, ?User $user = null): KonteksPenilaian
    {
        $periodeId = $this->resolvePeriodeId($data['periode_penilaian_id'] ?? null);
        $opdId = $data['opd_id'];
        $userId = $user?->id ?? auth('sanctum')->id();

        return DB::transaction(function () use ($data, $periodeId, $opdId, $userId) {
            $opd = Opd::find($opdId);
            $kepalaPegawai = User::where('opd_id', $opdId)
                ->where('jabatan', 'Kepala OPD')
                ->first();

            $attributes = [
                'periode_penilaian_id' => $periodeId,
                'opd_id' => $opdId,
            ];

            $resolvedNamaKepala = !empty($data['nama_kepala'])
                ? $data['nama_kepala']
                : ($kepalaPegawai?->name ?? $opd?->kepala);
            $resolvedNipKepala = !empty($data['nip_kepala'])
                ? $data['nip_kepala']
                : $kepalaPegawai?->nip;
            $resolvedJabatanKepala = !empty($data['jabatan_kepala'])
                ? $data['jabatan_kepala']
                : ($opd ? "Kepala {$opd->nama}" : null);

            $values = [
                'sumber_data_id' => $data['sumber_data_id'] ?? null,
                'tujuan_penilaian_id' => $data['tujuan_penilaian_id'],
                'nama_pemda' => $data['nama_pemda'] ?? 'Pemerintah Kabupaten Cianjur',
                'informasi_lain' => $data['informasi_lain'] ?? '-',
                'nama_kepala' => $resolvedNamaKepala,
                'nip_kepala' => $resolvedNipKepala,
                'jabatan_kepala' => $resolvedJabatanKepala,
                'tanggal_penetapan' => $data['tanggal_penetapan'] ?? now()->toDateString(),
                'status' => $data['status'] ?? 'final',
                'updated_by' => $userId,
            ];

            $konteks = KonteksPenilaian::where($attributes)->first();

            if ($konteks) {
                $konteks->update($values);
            } else {
                $values['created_by'] = $userId;
                $konteks = KonteksPenilaian::create(array_merge($attributes, $values));
            }

            // Sync Sasarans
            if (!empty($data['sasaran_ids'])) {
                $sasaranSync = [];
                $urutan = 1;
                foreach ($data['sasaran_ids'] as $sasaranId) {
                    $sasaranSync[$sasaranId] = ['urutan' => $urutan++];
                }
                $konteks->sasarans()->sync($sasaranSync);
            }

            // Sync Indikators
            if (!empty($data['indikator_ids'])) {
                $indikatorSync = [];
                $urutan = 1;
                foreach ($data['indikator_ids'] as $indikatorId) {
                    $indikatorSync[$indikatorId] = ['urutan' => $urutan++];
                }
                $konteks->indikators()->sync($indikatorSync);
            }

            // Synchronize downstream Form 2C (KonteksOperasional)
            $operasional = KonteksOperasional::where($attributes)->first();
            $operasionalValues = [
                'konteks_penilaian_id' => $konteks->id,
                'sumber_data_id' => $konteks->sumber_data_id,
                'nama_pemda' => $konteks->nama_pemda,
                'nama_kepala' => $konteks->nama_kepala,
                'nip_kepala' => $konteks->nip_kepala,
                'jabatan_kepala' => $konteks->jabatan_kepala,
                'tanggal_penetapan' => $konteks->tanggal_penetapan,
                'updated_by' => $userId,
            ];

            if ($operasional) {
                if (!empty($data['reset_operasional_items'])) {
                    // Safe bottom-up deletion to avoid self-referencing foreign key constraint violations
                    KonteksOperasionalItem::where('konteks_operasional_id', $operasional->id)
                        ->where('jenis', 'sub_kegiatan')
                        ->delete();
                    KonteksOperasionalItem::where('konteks_operasional_id', $operasional->id)
                        ->where('jenis', 'kegiatan')
                        ->delete();
                    KonteksOperasionalItem::where('konteks_operasional_id', $operasional->id)
                        ->where('jenis', 'program')
                        ->delete();
                    $operasionalValues['status'] = 'draft';
                }
                $operasional->update($operasionalValues);
            } else {
                KonteksOperasional::create(array_merge($attributes, $operasionalValues, [
                    'informasi_lain' => '-',
                    'tanggal_penetapan' => $konteks->tanggal_penetapan ?? now()->toDateString(),
                    'status' => 'draft',
                    'created_by' => $userId,
                ]));
            }

            return $konteks->load(['opd', 'periode', 'sumberData', 'tujuan', 'sasarans', 'indikators', 'creator']);
        });
    }

    /**
     * Delete context assessment with bottom-up guard.
     *
     * @throws ValidationException
     */
    public function deleteKonteks(KonteksPenilaian $konteks): void
    {
        $operasional = KonteksOperasional::where('konteks_penilaian_id', $konteks->id)
            ->orWhere(function ($q) use ($konteks) {
                $q->where('periode_penilaian_id', $konteks->periode_penilaian_id)
                    ->where('opd_id', $konteks->opd_id);
            })
            ->first();

        if ($operasional) {
            $itemCount = $operasional->items()->count();
            if ($itemCount > 0) {
                throw ValidationException::withMessages([
                    'konteks' => "Tidak dapat menghapus Konteks Risiko Strategis (Form 2B) ini karena masih terdapat {$itemCount} rincian Program/Kegiatan/Sub-Kegiatan pada Konteks Operasional (Form 2C). Bersihkan data Form 2C terlebih dahulu dari bawah.",
                ]);
            }
            $operasional->delete();
        }

        $konteks->delete();
    }

    /**
     * Export Form 2B to Excel (.xlsx) styled cleanly.
     */
    public function exportExcel(KonteksPenilaian $konteks): StreamedResponse
    {
        $konteks->loadMissing(['opd', 'periode', 'sumberData', 'tujuan', 'sasarans', 'indikators']);

        $opdNama = $konteks->opd?->nama ?? 'OPD';
        $tahun = $konteks->periode?->tahun_penilaian ?? date('Y');
        $fileName = 'Form_2B_Penetapan_Konteks_Risiko_Strategis_' . preg_replace('/[^a-zA-Z0-9_-]/', '_', $opdNama) . '_' . $tahun . '.xlsx';

        return response()->streamDownload(function () use ($konteks) {
            $writer = new Writer();
            $writer->openToFile('php://output');

            $titleStyle = (new Style())
                ->setFontBold()
                ->setFontSize(14)
                ->setFontColor(Color::rgb(20, 50, 40));

            $headerSectionStyle = (new Style())
                ->setFontBold()
                ->setFontSize(11)
                ->setBackgroundColor(Color::rgb(240, 245, 242));

            $boldStyle = (new Style())->setFontBold();

            // Row 1: Title
            $writer->addRow(Row::fromValues(['PENETAPAN KONTEKS RISIKO STRATEGIS OPD (FORM 2B)'], $titleStyle));
            $writer->addRow(Row::fromValues(['']));

            // Header attributes
            $writer->addRow(Row::fromValues(['Nama Pemda', ':', $konteks->nama_pemda]));
            $writer->addRow(Row::fromValues(['Tahun Penilaian', ':', $konteks->periode?->tahun_penilaian ?? '-']));
            $writer->addRow(Row::fromValues(['Periode yang Dinilai', ':', $konteks->periode?->rentang_tahun ?? '-']));
            $writer->addRow(Row::fromValues(['OPD yang Dinilai', ':', $konteks->opd?->nama ?? '-']));
            $writer->addRow(Row::fromValues(['Sumber Data', ':', $konteks->sumberData?->nama ?? 'Renstra SKPD']));
            $writer->addRow(Row::fromValues(['']));

            // Tujuan Strategis
            $writer->addRow(Row::fromValues(['Tujuan Strategis', ':', $konteks->tujuan?->tujuan ?? '-'], $boldStyle));
            $writer->addRow(Row::fromValues(['']));

            // Sasaran Strategis Section
            $writer->addRow(Row::fromValues(['Sasaran Strategis yang Dinilai:'], $headerSectionStyle));
            $no = 1;
            foreach ($konteks->sasarans as $sasaran) {
                $kode = $sasaran->kode_sasaran ? "[{$sasaran->kode_sasaran}] " : '';
                $writer->addRow(Row::fromValues(["{$no}. {$kode}{$sasaran->sasaran}"]));
                $no++;
            }
            $writer->addRow(Row::fromValues(['']));

            // IKU Renstra Section
            $writer->addRow(Row::fromValues(['IKU / Indikator Renstra OPD yang Dinilai:'], $headerSectionStyle));
            $no = 1;
            foreach ($konteks->indikators as $ind) {
                $kode = $ind->kode_indikator ? "[{$ind->kode_indikator}] " : '';
                $jenis = "[{$ind->jenis}] ";
                $writer->addRow(Row::fromValues(["{$no}. {$kode}{$jenis}{$ind->indikator}"]));
                $no++;
            }
            $writer->addRow(Row::fromValues(['']));

            // Informasi Lain
            $writer->addRow(Row::fromValues(['Informasi Lain / Isu Strategis:', ':', $konteks->informasi_lain ?? '-']));
            $writer->addRow(Row::fromValues(['']));
            $writer->addRow(Row::fromValues(['']));

            // Tanda Tangan
            $tgl = $konteks->tanggal_penetapan ? $konteks->tanggal_penetapan->locale('id')->isoFormat('D MMMM Y') : date('d F Y');
            $writer->addRow(Row::fromValues(['', '', "Cianjur, {$tgl}"]));
            $writer->addRow(Row::fromValues(['', '', $konteks->jabatan_kepala ?? "Kepala {$konteks->opd?->nama}"]));
            $writer->addRow(Row::fromValues(['', '', 'Kabupaten Cianjur']));
            $writer->addRow(Row::fromValues(['']));
            $writer->addRow(Row::fromValues(['']));
            $writer->addRow(Row::fromValues(['', '', $konteks->nama_kepala ?? '(................................................)'] , $boldStyle));
            $writer->addRow(Row::fromValues(['', '', $konteks->nip_kepala ? "NIP. {$konteks->nip_kepala}" : 'NIP. -']));

            $writer->close();
        }, $fileName, [
            'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Content-Disposition' => "attachment; filename=\"{$fileName}\"",
            'Cache-Control' => 'max-age=0',
        ]);
    }
}
