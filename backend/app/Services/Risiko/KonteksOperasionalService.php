<?php

declare(strict_types=1);

namespace App\Services\Risiko;

use App\Models\Opd;
use App\Models\Perencanaan\PeriodePenilaian;
use App\Models\Risiko\KonteksOperasional;
use App\Models\Risiko\KonteksOperasionalIndikator;
use App\Models\Risiko\KonteksOperasionalItem;
use App\Models\Risiko\KonteksPenilaian;
use App\Models\User;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use OpenSpout\Common\Entity\Row;
use OpenSpout\Common\Entity\Style\Color;
use OpenSpout\Common\Entity\Style\Style;
use OpenSpout\Writer\XLSX\Writer;
use Symfony\Component\HttpFoundation\StreamedResponse;

class KonteksOperasionalService
{
    /**
     * Standard relations to load for Form 2C.
     */
    protected array $relations = [
        'opd',
        'periode',
        'sumberData',
        'konteksStrategis.tujuan',
        'items.indikators',
        'programs.indikators',
        'programs.children.indikators',
        'programs.children.children.indikators',
        'creator',
        'updater',
    ];

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
     * Get paginated list of operational context assessments (Form 2C).
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

        $query = KonteksOperasional::query()
            ->with($this->relations)
            ->filter($filters);

        $direction = strtolower($sortDirection) === 'asc' ? 'asc' : 'desc';

        return $query->orderBy($sortBy, $direction)->paginate($perPage);
    }

    /**
     * Get operational context assessment by OPD and active period.
     */
    public function getKonteksByOpd(string $opdId, ?string $periodeId = null): ?KonteksOperasional
    {
        $resolvedPeriodeId = $this->resolvePeriodeId($periodeId);

        return KonteksOperasional::with($this->relations)
            ->where('periode_penilaian_id', $resolvedPeriodeId)
            ->where('opd_id', $opdId)
            ->first();
    }

    /**
     * Get a single operational context assessment by ID.
     */
    public function getKonteksById(string $id): KonteksOperasional
    {
        return KonteksOperasional::with($this->relations)
            ->findOrFail($id);
    }

    /**
     * Save (create or update) document header (Form 2C).
     *
     * @param array<string, mixed> $data
     */
    public function saveKonteks(array $data, ?User $user = null): KonteksOperasional
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

            $konteksStrategis = KonteksPenilaian::where('periode_penilaian_id', $periodeId)
                ->where('opd_id', $opdId)
                ->first();

            $values = [
                'sumber_data_id' => $data['sumber_data_id'] ?? null,
                'konteks_penilaian_id' => $data['konteks_penilaian_id'] ?? $konteksStrategis?->id,
                'nama_pemda' => $data['nama_pemda'] ?? 'Pemerintah Kabupaten Cianjur',
                'informasi_lain' => $data['informasi_lain'] ?? '-',
                'nama_kepala' => $data['nama_kepala'] ?? $opd?->kepala,
                'nip_kepala' => $data['nip_kepala'] ?? null,
                'jabatan_kepala' => $data['jabatan_kepala'] ?? ($opd ? "Kepala {$opd->nama}" : null),
                'tanggal_penetapan' => $data['tanggal_penetapan'] ?? now()->toDateString(),
                'status' => $data['status'] ?? 'draft',
                'updated_by' => $userId,
            ];

            $konteks = KonteksOperasional::where($attributes)->first();

            if ($konteks) {
                $konteks->update($values);
            } else {
                $values['created_by'] = $userId;
                $konteks = KonteksOperasional::create(array_merge($attributes, $values));
            }

            // Optional: Batch items synchronization if provided
            if (isset($data['items']) && is_array($data['items'])) {
                $this->syncBatchItems($konteks, $data['items']);
            }

            return $konteks->load($this->relations);
        });
    }

    /**
     * Batch sync hierarchical items (Programs, Kegiatans, Sub-Kegiatans with Indicators).
     *
     * @param array<int, array<string, mixed>> $itemsData
     */
    public function syncBatchItems(KonteksOperasional $konteks, array $itemsData): void
    {
        // First delete existing items
        $konteks->items()->delete();

        // Code mapping to parent ID: ['A' => uuid, 'A.1' => uuid, ...]
        $codeMap = [];

        // 1. Insert Programs first
        foreach ($itemsData as $item) {
            if ($item['jenis'] === 'program') {
                $created = $this->createItemWithIndikators($konteks, null, $item);
                $codeMap[$item['kode']] = $created->id;
            }
        }

        // 2. Insert Kegiatans
        foreach ($itemsData as $item) {
            if ($item['jenis'] === 'kegiatan') {
                $parentKode = $item['parent_kode'] ?? explode('.', $item['kode'])[0] ?? null;
                $parentId = $parentKode && isset($codeMap[$parentKode]) ? $codeMap[$parentKode] : null;
                $created = $this->createItemWithIndikators($konteks, $parentId, $item);
                $codeMap[$item['kode']] = $created->id;
            }
        }

        // 3. Insert Sub-Kegiatans
        foreach ($itemsData as $item) {
            if ($item['jenis'] === 'sub_kegiatan') {
                // Parent of A.1.1 is A.1
                $parts = explode('.', $item['kode']);
                $parentKode = $item['parent_kode'] ?? (count($parts) >= 2 ? "{$parts[0]}.{$parts[1]}" : null);
                $parentId = $parentKode && isset($codeMap[$parentKode]) ? $codeMap[$parentKode] : null;
                $this->createItemWithIndikators($konteks, $parentId, $item);
            }
        }
    }

    /**
     * Create an item node along with its indicators.
     *
     * @param array<string, mixed> $itemData
     */
    protected function createItemWithIndikators(
        KonteksOperasional $konteks,
        ?string $parentId,
        array $itemData
    ): KonteksOperasionalItem {
        $item = KonteksOperasionalItem::create([
            'konteks_operasional_id' => $konteks->id,
            'parent_id' => $parentId,
            'jenis' => $itemData['jenis'],
            'kode' => $itemData['kode'],
            'nama' => $itemData['nama'],
            'urutan' => $itemData['urutan'] ?? 1,
        ]);

        if (!empty($itemData['indikators']) && is_array($itemData['indikators'])) {
            $u = 1;
            foreach ($itemData['indikators'] as $ind) {
                KonteksOperasionalIndikator::create([
                    'item_id' => $item->id,
                    'indikator' => $ind['indikator'],
                    'target' => (string) $ind['target'],
                    'satuan' => $ind['satuan'] ?? null,
                    'urutan' => $ind['urutan'] ?? $u++,
                ]);
            }
        }

        return $item;
    }

    /**
     * Save (create or update) a single operational tree item.
     *
     * @param array<string, mixed> $data
     */
    public function saveItem(
        KonteksOperasional $konteks,
        array $data,
        ?string $itemId = null
    ): KonteksOperasionalItem {
        return DB::transaction(function () use ($konteks, $data, $itemId) {
            if ($itemId) {
                $item = KonteksOperasionalItem::where('konteks_operasional_id', $konteks->id)
                    ->findOrFail($itemId);

                $item->update([
                    'parent_id' => $data['parent_id'] ?? $item->parent_id,
                    'jenis' => $data['jenis'] ?? $item->jenis,
                    'kode' => $data['kode'] ?? $item->kode,
                    'nama' => $data['nama'] ?? $item->nama,
                    'urutan' => $data['urutan'] ?? $item->urutan,
                ]);
            } else {
                $item = KonteksOperasionalItem::create([
                    'konteks_operasional_id' => $konteks->id,
                    'parent_id' => $data['parent_id'] ?? null,
                    'jenis' => $data['jenis'],
                    'kode' => $data['kode'],
                    'nama' => $data['nama'],
                    'urutan' => $data['urutan'] ?? 1,
                ]);
            }

            // Sync indicators if present
            if (isset($data['indikators']) && is_array($data['indikators'])) {
                $item->indikators()->delete();
                $u = 1;
                foreach ($data['indikators'] as $ind) {
                    KonteksOperasionalIndikator::create([
                        'item_id' => $item->id,
                        'indikator' => $ind['indikator'],
                        'target' => (string) $ind['target'],
                        'satuan' => $ind['satuan'] ?? null,
                        'urutan' => $ind['urutan'] ?? $u++,
                    ]);
                }
            }

            return $item->load(['indikators', 'children.indikators']);
        });
    }

    /**
     * Delete an operational tree item (and all its children).
     */
    public function deleteItem(KonteksOperasional $konteks, string $itemId): void
    {
        $item = KonteksOperasionalItem::where('konteks_operasional_id', $konteks->id)
            ->findOrFail($itemId);

        $item->delete();
    }

    /**
     * Delete whole operational context assessment document.
     */
    public function deleteKonteks(KonteksOperasional $konteks): void
    {
        $konteks->delete();
    }

    /**
     * Export Form 2C to Excel (.xlsx) styled cleanly according to Sheet 2C.
     */
    public function exportExcel(KonteksOperasional $konteks): StreamedResponse
    {
        $konteks->loadMissing($this->relations);

        $opdNama = $konteks->opd?->nama ?? 'OPD';
        $tahun = $konteks->periode?->tahun_penilaian ?? date('Y');
        $fileName = 'Form_2C_Penetapan_Konteks_Risiko_Operasional_' . preg_replace('/[^a-zA-Z0-9_-]/', '_', $opdNama) . '_' . $tahun . '.xlsx';

        return response()->streamDownload(function () use ($konteks) {
            $writer = new Writer();
            $writer->openToFile('php://output');

            $titleStyle = (new Style())
                ->setFontBold()
                ->setFontSize(14)
                ->setFontColor(Color::rgb(20, 50, 40));

            $tableHeaderStyle = (new Style())
                ->setFontBold()
                ->setFontSize(10)
                ->setBackgroundColor(Color::rgb(235, 240, 245));

            $boldStyle = (new Style())->setFontBold();

            // Row 1: Title
            $writer->addRow(Row::fromValues(['PENETAPAN KONTEKS RISIKO OPERASIONAL OPD (FORM 2C)'], $titleStyle));
            $writer->addRow(Row::fromValues(['']));

            // Header attributes
            $writer->addRow(Row::fromValues(['Nama Pemda', ':', $konteks->nama_pemda]));
            $writer->addRow(Row::fromValues(['Tahun Penilaian', ':', $konteks->periode?->tahun_penilaian ?? '-']));
            $writer->addRow(Row::fromValues(['Periode yang Dinilai', ':', $konteks->periode?->rentang_tahun ?? '-']));
            $writer->addRow(Row::fromValues(['OPD yang Dinilai', ':', $konteks->opd?->nama ?? '-']));
            $writer->addRow(Row::fromValues(['Sumber Data', ':', $konteks->sumberData?->nama ?? 'Renstra SKPD']));

            // Tujuan Strategis (dari Form 2B)
            $tujuanText = $konteks->konteksStrategis?->tujuan?->tujuan ?? 'Tujuan strategis belum ditentukan di Form 2B';
            $writer->addRow(Row::fromValues(['Tujuan Strategis', ':', $tujuanText], $boldStyle));
            $writer->addRow(Row::fromValues(['']));

            // Table Header Columns (Row 11 in Excel Sheet 2C)
            $writer->addRow(Row::fromValues([
                'NO',
                'Nama Program / Kegiatan / Sub Kegiatan',
                'Indikator',
                'Target',
            ], $tableHeaderStyle));

            // Flatten tree in Program -> Kegiatan -> Sub-Kegiatan order
            $programs = $konteks->programs;
            foreach ($programs as $prog) {
                // Program row
                $this->writeItemRowToExcel($writer, $prog);

                foreach ($prog->children as $keg) {
                    // Kegiatan row
                    $this->writeItemRowToExcel($writer, $keg);

                    foreach ($keg->children as $sub) {
                        // Sub-Kegiatan row
                        $this->writeItemRowToExcel($writer, $sub);
                    }
                }
            }

            $writer->addRow(Row::fromValues(['']));
            // Informasi Lain
            $writer->addRow(Row::fromValues(['Informasi Lain:', ':', $konteks->informasi_lain ?? '-']));
            $writer->addRow(Row::fromValues(['']));
            $writer->addRow(Row::fromValues(['']));

            // Tanda Tangan
            $tgl = $konteks->tanggal_penetapan ? $konteks->tanggal_penetapan->isoFormat('D MMMM Y') : date('d F Y');
            $writer->addRow(Row::fromValues(['', '', "Cianjur, {$tgl}"]));
            $writer->addRow(Row::fromValues(['', '', $konteks->jabatan_kepala ?? "Kepala {$konteks->opd?->nama}"]));
            $writer->addRow(Row::fromValues(['', '', 'Kabupaten Cianjur']));
            $writer->addRow(Row::fromValues(['']));
            $writer->addRow(Row::fromValues(['']));
            $writer->addRow(Row::fromValues(['', '', $konteks->nama_kepala ?? '(................................................)'], $boldStyle));
            $writer->addRow(Row::fromValues(['', '', $konteks->nip_kepala ? "NIP. {$konteks->nip_kepala}" : 'NIP. -']));

            $writer->close();
        }, $fileName, [
            'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Content-Disposition' => "attachment; filename=\"{$fileName}\"",
            'Cache-Control' => 'max-age=0',
        ]);
    }

    /**
     * Helper to write an item and its indicator rows to Excel.
     */
    protected function writeItemRowToExcel(Writer $writer, KonteksOperasionalItem $item): void
    {
        $indikators = $item->indikators;
        $isFirst = true;

        if ($indikators->isEmpty()) {
            $writer->addRow(Row::fromValues([
                $item->kode,
                $item->nama,
                '-',
                '-',
            ]));
        } else {
            foreach ($indikators as $ind) {
                $targetStr = $ind->satuan ? "{$ind->target} {$ind->satuan}" : $ind->target;
                $writer->addRow(Row::fromValues([
                    $isFirst ? $item->kode : '',
                    $isFirst ? $item->nama : '',
                    $ind->indikator,
                    $targetStr,
                ]));
                $isFirst = false;
            }
        }
    }
}
