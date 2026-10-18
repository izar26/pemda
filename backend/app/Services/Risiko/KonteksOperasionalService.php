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
        $periodeId = $this->resolveOptionalPeriodeId($filters['periode_penilaian_id'] ?? null);
        if (!$periodeId) {
            return KonteksOperasional::query()->whereRaw('1 = 0')->paginate($perPage);
        }
        $filters['periode_penilaian_id'] = $periodeId;

        $query = KonteksOperasional::query()
            ->with($this->relations)
            ->filter($filters);

        $direction = strtolower($sortDirection) === 'asc' ? 'asc' : 'desc';

        return $query->orderBy($sortBy, $direction)->paginate($perPage);
    }

    /**
     * Get operational context assessment by OPD and active period.
     * Automatically provisions or syncs header from Form 2B if Form 2B exists.
     */
    public function getKonteksByOpd(string $opdId, ?string $periodeId = null): ?KonteksOperasional
    {
        $resolvedPeriodeId = $this->resolveOptionalPeriodeId($periodeId);
        if (!$resolvedPeriodeId) {
            return null;
        }

        $konteksStrategis = KonteksPenilaian::where('periode_penilaian_id', $resolvedPeriodeId)
            ->where('opd_id', $opdId)
            ->first();

        // Step 2C cannot exist or be unlocked if Step 2B hasn't been created yet
        if (!$konteksStrategis) {
            return null;
        }

        $operasional = KonteksOperasional::where('periode_penilaian_id', $resolvedPeriodeId)
            ->where('opd_id', $opdId)
            ->first();

        if (!$operasional) {
            $operasional = KonteksOperasional::create([
                'periode_penilaian_id' => $resolvedPeriodeId,
                'opd_id' => $opdId,
                'sumber_data_id' => $konteksStrategis->sumber_data_id,
                'konteks_penilaian_id' => $konteksStrategis->id,
                'nama_pemda' => $konteksStrategis->nama_pemda ?? 'Pemerintah Kabupaten Cianjur',
                'informasi_lain' => '-',
                'nama_kepala' => $konteksStrategis->nama_kepala,
                'nip_kepala' => $konteksStrategis->nip_kepala,
                'jabatan_kepala' => $konteksStrategis->jabatan_kepala,
                'tanggal_penetapan' => $konteksStrategis->tanggal_penetapan ?? now()->toDateString(),
                'status' => 'draft',
                'created_by' => $konteksStrategis->created_by,
                'updated_by' => $konteksStrategis->updated_by,
            ]);
        } elseif (
            $operasional->konteks_penilaian_id !== $konteksStrategis->id ||
            $operasional->sumber_data_id !== $konteksStrategis->sumber_data_id ||
            $operasional->nama_kepala !== $konteksStrategis->nama_kepala ||
            $operasional->nip_kepala !== $konteksStrategis->nip_kepala ||
            $operasional->jabatan_kepala !== $konteksStrategis->jabatan_kepala ||
            $operasional->tanggal_penetapan?->toDateString() !== $konteksStrategis->tanggal_penetapan?->toDateString() ||
            $operasional->nama_pemda !== ($konteksStrategis->nama_pemda ?? $operasional->nama_pemda)
        ) {
            $operasional->update([
                'konteks_penilaian_id' => $konteksStrategis->id,
                'sumber_data_id' => $konteksStrategis->sumber_data_id,
                'nama_pemda' => $konteksStrategis->nama_pemda ?? $operasional->nama_pemda,
                'nama_kepala' => $konteksStrategis->nama_kepala,
                'nip_kepala' => $konteksStrategis->nip_kepala,
                'jabatan_kepala' => $konteksStrategis->jabatan_kepala,
                'tanggal_penetapan' => $konteksStrategis->tanggal_penetapan,
            ]);
        }

        return $operasional->load($this->relations);
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
            $konteksStrategis = KonteksPenilaian::where('periode_penilaian_id', $periodeId)
                ->where('opd_id', $opdId)
                ->first();

            if (!$konteksStrategis) {
                throw ValidationException::withMessages([
                    'opd_id' => 'Langkah 1: Penetapan Konteks Risiko Strategis (Form 2B) belum diisi untuk perangkat daerah ini.',
                ]);
            }

            $opd = Opd::find($opdId);

            $attributes = [
                'periode_penilaian_id' => $periodeId,
                'opd_id' => $opdId,
            ];

            $konteks = KonteksOperasional::where($attributes)->first();

            $informasiLain = array_key_exists('informasi_lain', $data)
                ? (trim((string) $data['informasi_lain']) !== '' ? trim((string) $data['informasi_lain']) : '-')
                : ($konteks?->informasi_lain ?? '-');

            $values = [
                'sumber_data_id' => $konteksStrategis->sumber_data_id,
                'konteks_penilaian_id' => $konteksStrategis->id,
                'nama_pemda' => $konteksStrategis->nama_pemda ?? 'Pemerintah Kabupaten Cianjur',
                'informasi_lain' => $informasiLain,
                'nama_kepala' => $konteksStrategis->nama_kepala ?? $opd?->kepala,
                'nip_kepala' => $konteksStrategis->nip_kepala ?? null,
                'jabatan_kepala' => $konteksStrategis->jabatan_kepala ?? ($opd ? "Kepala {$opd->nama}" : null),
                'tanggal_penetapan' => $data['tanggal_penetapan'] ?? $konteksStrategis->tanggal_penetapan ?? now()->toDateString(),
                'status' => $data['status'] ?? 'final',
                'updated_by' => $userId,
            ];

            if ($konteks) {
                $konteks->update($values);
            } else {
                $values['created_by'] = $userId;
                $konteks = KonteksOperasional::create(array_merge($attributes, $values));
            }

            // Optional: Batch items synchronization if provided
            if (isset($data['items']) && is_array($data['items'])) {
                $this->syncBatchItems($konteks, $data['items']);
            } else {
                $this->recalculateTreeCodes($konteks);
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
        // Delete existing items safely from bottom up to avoid FK constraint issues
        KonteksOperasionalItem::where('konteks_operasional_id', $konteks->id)
            ->where('jenis', 'sub_kegiatan')
            ->delete();
        KonteksOperasionalItem::where('konteks_operasional_id', $konteks->id)
            ->where('jenis', 'kegiatan')
            ->delete();
        KonteksOperasionalItem::where('konteks_operasional_id', $konteks->id)
            ->where('jenis', 'program')
            ->delete();

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
                if (!$parentId) {
                    throw ValidationException::withMessages([
                        'items' => "Kegiatan '{$item['nama']}' ({$item['kode']}) tidak memiliki Program induk yang valid dalam payload.",
                    ]);
                }
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
                if (!$parentId) {
                    throw ValidationException::withMessages([
                        'items' => "Sub-Kegiatan '{$item['nama']}' ({$item['kode']}) tidak memiliki Kegiatan induk yang valid dalam payload.",
                    ]);
                }
                $this->createItemWithIndikators($konteks, $parentId, $item);
            }
        }

        $this->recalculateTreeCodes($konteks);
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
            'kode' => $itemData['kode'] ?? 'A',
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
     * Save (create or update) a single operational tree item and auto-recalculate hierarchical codes.
     *
     * @param array<string, mixed> $data
     */
    public function saveItem(
        KonteksOperasional $konteks,
        array $data,
        ?string $itemId = null
    ): KonteksOperasionalItem {
        return DB::transaction(function () use ($konteks, $data, $itemId) {
            $targetJenis = $data['jenis'] ?? null;
            $parentId = $targetJenis === 'program' ? null : ($data['parent_id'] ?? null);

            if ($itemId) {
                $item = KonteksOperasionalItem::where('konteks_operasional_id', $konteks->id)
                    ->findOrFail($itemId);

                $newJenis = $targetJenis ?? $item->jenis;
                $resolvedParentId = $newJenis === 'program'
                    ? null
                    : (array_key_exists('parent_id', $data) ? $data['parent_id'] : $item->parent_id);

                $item->update([
                    'parent_id' => $resolvedParentId,
                    'jenis' => $newJenis,
                    'nama' => $data['nama'] ?? $item->nama,
                    'urutan' => $data['urutan'] ?? $item->urutan,
                ]);
            } else {
                $maxUrutan = (int) KonteksOperasionalItem::where('konteks_operasional_id', $konteks->id)
                    ->where('jenis', $data['jenis'])
                    ->where('parent_id', $parentId)
                    ->max('urutan');

                $item = KonteksOperasionalItem::create([
                    'konteks_operasional_id' => $konteks->id,
                    'parent_id' => $parentId,
                    'jenis' => $data['jenis'],
                    'kode' => !empty($data['kode']) ? $data['kode'] : 'TEMP',
                    'nama' => $data['nama'],
                    'urutan' => $data['urutan'] ?? ($maxUrutan + 1),
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

            $this->recalculateTreeCodes($konteks);

            return $item->fresh(['indikators', 'children.indikators']) ?? $item;
        });
    }

    /**
     * Delete an operational tree item with strict bottom-up guard and renumber remaining nodes.
     *
     * @throws ValidationException
     */
    public function deleteItem(KonteksOperasional $konteks, string $itemId): void
    {
        DB::transaction(function () use ($konteks, $itemId) {
            $item = KonteksOperasionalItem::where('konteks_operasional_id', $konteks->id)
                ->findOrFail($itemId);

            $childCount = KonteksOperasionalItem::where('parent_id', $item->id)->count();
            if ($childCount > 0) {
                $childLabel = $item->jenis === 'program' ? 'Kegiatan' : 'Sub-Kegiatan';
                $selfLabel = $item->jenis === 'program' ? 'Program' : 'Kegiatan';

                throw ValidationException::withMessages([
                    'item' => "Tidak dapat menghapus {$selfLabel} '{$item->nama}' karena masih memiliki {$childCount} {$childLabel} di bawahnya. Bersihkan data {$childLabel} terlebih dahulu dari bawah.",
                ]);
            }

            $item->delete();

            $this->recalculateTreeCodes($konteks);
        });
    }

    /**
     * Reorder items within Form 2C and auto-recalculate tree codes.
     *
     * @param array<int, string> $orderedIds
     */
    public function reorderItems(KonteksOperasional $konteks, array $orderedIds): void
    {
        DB::transaction(function () use ($konteks, $orderedIds) {
            foreach ($orderedIds as $index => $id) {
                KonteksOperasionalItem::where('konteks_operasional_id', $konteks->id)
                    ->where('id', $id)
                    ->update(['urutan' => $index + 1]);
            }

            $this->recalculateTreeCodes($konteks);
        });
    }

    /**
     * Automatically recalculate sequential codes (A, B, A.1, A.1.1) and urutan across the tree.
     */
    public function recalculateTreeCodes(KonteksOperasional $konteks): void
    {
        $programs = KonteksOperasionalItem::where('konteks_operasional_id', $konteks->id)
            ->where('jenis', 'program')
            ->orderBy('urutan', 'asc')
            ->orderBy('created_at', 'asc')
            ->get();

        foreach ($programs->values() as $pIdx => $prog) {
            $pUrutan = $pIdx + 1;
            $progKode = $this->indexToAlpha($pUrutan);

            if ($prog->kode !== $progKode || (int) $prog->urutan !== $pUrutan) {
                $prog->update([
                    'kode' => $progKode,
                    'urutan' => $pUrutan,
                ]);
            }

            $kegiatans = KonteksOperasionalItem::where('konteks_operasional_id', $konteks->id)
                ->where('jenis', 'kegiatan')
                ->where('parent_id', $prog->id)
                ->orderBy('urutan', 'asc')
                ->orderBy('created_at', 'asc')
                ->get();

            foreach ($kegiatans->values() as $kIdx => $keg) {
                $kUrutan = $kIdx + 1;
                $kegKode = "{$progKode}.{$kUrutan}";

                if ($keg->kode !== $kegKode || (int) $keg->urutan !== $kUrutan) {
                    $keg->update([
                        'kode' => $kegKode,
                        'urutan' => $kUrutan,
                    ]);
                }

                $subKegiatans = KonteksOperasionalItem::where('konteks_operasional_id', $konteks->id)
                    ->where('jenis', 'sub_kegiatan')
                    ->where('parent_id', $keg->id)
                    ->orderBy('urutan', 'asc')
                    ->orderBy('created_at', 'asc')
                    ->get();

                foreach ($subKegiatans->values() as $sIdx => $sub) {
                    $sUrutan = $sIdx + 1;
                    $subKode = "{$kegKode}.{$sUrutan}";

                    if ($sub->kode !== $subKode || (int) $sub->urutan !== $sUrutan) {
                        $sub->update([
                            'kode' => $subKode,
                            'urutan' => $sUrutan,
                        ]);
                    }
                }
            }
        }
    }

    /**
     * Convert 1-based index to Excel-style alphabetical code (1 -> A, 2 -> B, ..., 26 -> Z, 27 -> AA).
     */
    protected function indexToAlpha(int $num): string
    {
        $alpha = '';
        while ($num > 0) {
            $mod = ($num - 1) % 26;
            $alpha = chr(65 + $mod) . $alpha;
            $num = intdiv($num - $mod, 26);
        }

        return $alpha ?: 'A';
    }

    /**
     * Delete whole operational context assessment document.
     *
     * @throws ValidationException
     */
    public function deleteKonteks(KonteksOperasional $konteks): void
    {
        $itemCount = $konteks->items()->count();
        if ($itemCount > 0) {
            throw ValidationException::withMessages([
                'konteks' => "Tidak dapat menghapus dokumen Konteks Operasional (Form 2C) ini karena masih memiliki {$itemCount} rincian Program/Kegiatan/Sub-Kegiatan. Bersihkan rincian terlebih dahulu dari bawah.",
            ]);
        }

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
            $tgl = $konteks->tanggal_penetapan ? $konteks->tanggal_penetapan->locale('id')->isoFormat('D MMMM Y') : date('d F Y');
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
