<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\Perencanaan;

use App\Http\Controllers\Controller;
use App\Models\Opd;
use App\Models\Perencanaan\PeriodePenilaian;
use App\Models\Perencanaan\RenstraKegiatan;
use App\Models\Perencanaan\RenstraProgram;
use App\Models\Perencanaan\RenstraSubKegiatan;
use App\Services\Export\ExcelExportService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use OpenSpout\Reader\XLSX\Reader as XLSXReader;
use Symfony\Component\HttpFoundation\StreamedResponse;

class RenstraImportExportController extends Controller
{
    /**
     * Download standardized Excel template for importing Renstra SKPD.
     */
    public function downloadTemplate(ExcelExportService $exportService): StreamedResponse
    {
        $headers = [
            'LEVEL HIERARKI',
            'KODE (P: A | K: A.1 | SK: A.1.1)',
            'NAMA PROGRAM / KEGIATAN / SUB-KEGIATAN',
            'INDIKATOR KINERJA',
            'TARGET',
            'SATUAN',
        ];

        $samples = [
            ['PROGRAM', 'A', 'Program Penyelenggaraan Pemerintahan dan Tata Kelola Daerah', 'Persentase Efektivitas Tata Kelola', '100', '%'],
            ['KEGIATAN', 'A.1', 'Kegiatan Pengelolaan Manajemen Risiko & Pengendalian Intern', 'Jumlah Terlaksananya Pemantauan Risiko', '4', 'Laporan'],
            ['SUB_KEGIATAN', 'A.1.1', 'Sub-Kegiatan Penyusunan Dokumen Risk Register & Renstra SKPD', 'Tersedianya Dokumen Risk Register OPD', '1', 'Dokumen'],
            ['PROGRAM', 'B', 'Program Pelayanan Publik dan Administrasi Kewilayahan', 'Indeks Kepuasan Masyarakat (IKM)', '88', 'Poin'],
            ['KEGIATAN', 'B.1', 'Kegiatan Peningkatan Sarana dan Pelayanan Informasi Masyarakat', 'Tingkat Kepuasan Layanan Informasi', '90', '%'],
            ['SUB_KEGIATAN', 'B.1.1', 'Sub-Kegiatan Pengelolaan Kanal Aduan Layanan Digital Pemda', 'Jumlah Aduan Terlayani Tepat Waktu', '100', '%'],
        ];

        $metadata = [
            'PETUNJUK PENGISIAN' => 'Gunakan kolom LEVEL HIERARKI dengan nilai PROGRAM, KEGIATAN, atau SUB_KEGIATAN. Urutan diisi berjenjang dari Program (A) -> Kegiatan (A.1) -> Sub-Kegiatan (A.1.1).',
        ];

        return $exportService->streamExport(
            filename: 'Template_Import_Renstra_SKPD_PEMDA',
            title: 'TEMPLATE IMPORT DATA RENSTRA SKPD (PROGRAM, KEGIATAN, SUB-KEGIATAN)',
            headers: $headers,
            rows: $samples,
            metadata: $metadata
        );
    }

    /**
     * Export Renstra SKPD tree to Excel (.xlsx).
     */
    public function export(Request $request, ExcelExportService $exportService): StreamedResponse
    {
        $user = $request->user();
        if (!$user->can('perencanaan.view')) {
            abort(403, 'Anda tidak memiliki hak akses untuk mengekspor data Renstra SKPD.');
        }

        $opdId = $request->input('opd_id');
        if (!$user->hasRole('Superadmin') && $user->opd_id) {
            $opdId = $user->opd_id;
        }

        $periodeId = $request->input('periode_penilaian_id');
        if (!$periodeId) {
            $activePeriode = PeriodePenilaian::where('status', 'active')->first();
            $periodeId = $activePeriode?->id;
        }

        $query = RenstraProgram::with(['opd', 'kegiatans.subKegiatans']);
        if ($periodeId) {
            $query->where('periode_penilaian_id', $periodeId);
        }
        if ($opdId && $opdId !== 'all') {
            $query->where('opd_id', $opdId);
        }

        $programs = $query->orderBy('kode', 'asc')->get();

        $headers = [
            'No',
            'OPD / Perangkat Daerah',
            'Level Hierarki',
            'Kode Indeks',
            'Nama Program / Kegiatan / Sub-Kegiatan',
            'Indikator Kinerja',
            'Target',
            'Satuan',
        ];

        $generator = function () use ($programs) {
            $no = 1;
            foreach ($programs as $prog) {
                $opdNama = $prog->opd?->nama ?? '-';
                yield [
                    $no++,
                    $opdNama,
                    '[PROGRAM]',
                    $prog->kode,
                    $prog->nama,
                    $prog->indikator ?? '-',
                    $prog->target ?? '-',
                    $prog->satuan ?? '-',
                ];

                foreach ($prog->kegiatans as $keg) {
                    yield [
                        $no++,
                        $opdNama,
                        '  └── [KEGIATAN]',
                        $keg->kode,
                        '  ' . $keg->nama,
                        $keg->indikator ?? '-',
                        $keg->target ?? '-',
                        $keg->satuan ?? '-',
                    ];

                    foreach ($keg->subKegiatans as $sub) {
                        yield [
                            $no++,
                            $opdNama,
                            '      └── [SUB-KEGIATAN]',
                            $sub->kode,
                            '    ' . $sub->nama,
                            $sub->indikator ?? '-',
                            $sub->target ?? '-',
                            $sub->satuan ?? '-',
                        ];
                    }
                }
            }
        };

        $opdObj = $opdId ? Opd::find($opdId) : null;
        $metadata = [];
        if ($opdObj) {
            $metadata['Perangkat Daerah (OPD)'] = $opdObj->nama;
        }

        return $exportService->streamExport(
            filename: 'Renstra_SKPD_PEMDA',
            title: 'LAPORAN MATRIKS PROGRAM, KEGIATAN & SUB-KEGIATAN RENSTRA SKPD',
            headers: $headers,
            rows: $generator(),
            metadata: $metadata
        );
    }

    /**
     * Import Renstra SKPD data from uploaded Excel file.
     */
    public function import(Request $request): JsonResponse
    {
        $user = $request->user();
        if (!$user->can('perencanaan.renstra')) {
            abort(403, 'Anda tidak memiliki hak akses untuk mengimpor data Renstra SKPD.');
        }

        $request->validate([
            'file' => ['required', 'file', 'mimes:xlsx,xls', 'max:10240'],
            'opd_id' => ['required', 'uuid', 'exists:opds,id'],
            'periode_penilaian_id' => ['required', 'uuid', 'exists:periode_penilaians,id'],
        ]);

        $opdId = $request->input('opd_id');
        if (!$user->hasRole('Superadmin') && $user->opd_id) {
            $opdId = $user->opd_id;
        }

        $periodeId = $request->input('periode_penilaian_id');
        $file = $request->file('file');

        $reader = new XLSXReader();
        $reader->open($file->getRealPath());

        $programCount = 0;
        $kegiatanCount = 0;
        $subKegiatanCount = 0;

        $lastProgram = null;
        $lastKegiatan = null;

        DB::transaction(function () use ($reader, $opdId, $periodeId, &$programCount, &$kegiatanCount, &$subKegiatanCount, &$lastProgram, &$lastKegiatan) {
            foreach ($reader->getSheetIterator() as $sheet) {
                $rowIndex = 0;
                foreach ($sheet->getRowIterator() as $row) {
                    $rowIndex++;
                    $cells = $row->toArray();

                    // Skip metadata / header rows
                    if ($rowIndex <= 6 || empty($cells[0]) || empty($cells[1]) || empty($cells[2])) {
                        continue;
                    }

                    $levelRaw = strtoupper(trim((string) $cells[0]));
                    $kode = trim((string) $cells[1]);
                    $nama = trim((string) $cells[2]);
                    $indikator = isset($cells[3]) ? trim((string) $cells[3]) : null;
                    $target = isset($cells[4]) ? trim((string) $cells[4]) : null;
                    $satuan = isset($cells[5]) ? trim((string) $cells[5]) : null;

                    if ($levelRaw === 'PROGRAM' || str_contains($kode, '.') === false || str_contains($levelRaw, 'PROG')) {
                        $lastProgram = RenstraProgram::updateOrCreate([
                            'opd_id' => $opdId,
                            'periode_penilaian_id' => $periodeId,
                            'kode' => $kode,
                        ], [
                            'nama' => $nama,
                            'indikator' => $indikator,
                            'target' => $target,
                            'satuan' => $satuan,
                        ]);
                        $programCount++;
                        $lastKegiatan = null;
                    } elseif ($levelRaw === 'KEGIATAN' || (substr_count($kode, '.') === 1) || str_contains($levelRaw, 'KEG')) {
                        if (!$lastProgram) {
                            // Create fallback program if missing
                            $lastProgram = RenstraProgram::firstOrCreate([
                                'opd_id' => $opdId,
                                'periode_penilaian_id' => $periodeId,
                                'kode' => 'A',
                            ], [
                                'nama' => 'Program Utama SKPD',
                            ]);
                        }

                        $lastKegiatan = RenstraKegiatan::updateOrCreate([
                            'renstra_program_id' => $lastProgram->id,
                            'opd_id' => $opdId,
                            'periode_penilaian_id' => $periodeId,
                            'kode' => $kode,
                        ], [
                            'nama' => $nama,
                            'indikator' => $indikator,
                            'target' => $target,
                            'satuan' => $satuan,
                        ]);
                        $kegiatanCount++;
                    } elseif ($levelRaw === 'SUB_KEGIATAN' || $levelRaw === 'SUB KEGIATAN' || substr_count($kode, '.') >= 2 || str_contains($levelRaw, 'SUB')) {
                        if (!$lastKegiatan) {
                            if (!$lastProgram) {
                                $lastProgram = RenstraProgram::firstOrCreate([
                                    'opd_id' => $opdId,
                                    'periode_penilaian_id' => $periodeId,
                                    'kode' => 'A',
                                ], [
                                    'nama' => 'Program Utama SKPD',
                                ]);
                            }
                            $lastKegiatan = RenstraKegiatan::firstOrCreate([
                                'renstra_program_id' => $lastProgram->id,
                                'opd_id' => $opdId,
                                'periode_penilaian_id' => $periodeId,
                                'kode' => 'A.1',
                            ], [
                                'nama' => 'Kegiatan Utama SKPD',
                            ]);
                        }

                        RenstraSubKegiatan::updateOrCreate([
                            'renstra_kegiatan_id' => $lastKegiatan->id,
                            'opd_id' => $opdId,
                            'periode_penilaian_id' => $periodeId,
                            'kode' => $kode,
                        ], [
                            'nama' => $nama,
                            'indikator' => $indikator,
                            'target' => $target,
                            'satuan' => $satuan,
                        ]);
                        $subKegiatanCount++;
                    }
                }
                break; // Process first sheet
            }
        });

        $reader->close();

        return response()->json([
            'message' => 'Impor data Renstra SKPD berhasil diproses.',
            'summary' => [
                'program_count' => $programCount,
                'kegiatan_count' => $kegiatanCount,
                'sub_kegiatan_count' => $subKegiatanCount,
                'total_records' => $programCount + $kegiatanCount + $subKegiatanCount,
            ],
        ]);
    }
}
