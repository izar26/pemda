<?php

declare(strict_types=1);

namespace App\Services\Risiko;

use App\Models\Opd;
use App\Models\Perencanaan\IndikatorPenilaian;
use App\Models\Perencanaan\PeriodePenilaian;
use App\Models\Perencanaan\SasaranPenilaian;
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
        $periodeId = $this->resolvePeriodeId($filters['periode_penilaian_id'] ?? null);
        $filters['periode_penilaian_id'] = $periodeId;

        $query = KonteksPenilaian::query()
            ->with(['opd', 'periode', 'sumberData', 'tujuan', 'sasarans', 'indikators', 'creator'])
            ->filter($filters);

        $direction = strtolower($sortDirection) === 'asc' ? 'asc' : 'desc';

        return $query->orderBy($sortBy, $direction)->paginate($perPage);
    }

    /**
     * Get context assessment by OPD and active period.
     */
    public function getKonteksByOpd(string $opdId, ?string $periodeId = null): ?KonteksPenilaian
    {
        $resolvedPeriodeId = $this->resolvePeriodeId($periodeId);

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

            $attributes = [
                'periode_penilaian_id' => $periodeId,
                'opd_id' => $opdId,
            ];

            $values = [
                'sumber_data_id' => $data['sumber_data_id'] ?? null,
                'tujuan_penilaian_id' => $data['tujuan_penilaian_id'],
                'nama_pemda' => $data['nama_pemda'] ?? 'Pemerintah Kabupaten Cianjur',
                'informasi_lain' => $data['informasi_lain'] ?? '-',
                'nama_kepala' => $data['nama_kepala'] ?? $opd?->kepala,
                'nip_kepala' => $data['nip_kepala'] ?? null,
                'jabatan_kepala' => $data['jabatan_kepala'] ?? ($opd ? "Kepala {$opd->nama}" : null),
                'tanggal_penetapan' => $data['tanggal_penetapan'] ?? now()->toDateString(),
                'status' => $data['status'] ?? 'draft',
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

            return $konteks->load(['opd', 'periode', 'sumberData', 'tujuan', 'sasarans', 'indikators', 'creator']);
        });
    }

    /**
     * Delete context assessment.
     */
    public function deleteKonteks(KonteksPenilaian $konteks): void
    {
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
            $tgl = $konteks->tanggal_penetapan ? $konteks->tanggal_penetapan->isoFormat('D MMMM Y') : date('d F Y');
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
