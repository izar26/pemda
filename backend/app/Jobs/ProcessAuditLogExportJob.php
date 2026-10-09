<?php

declare(strict_types=1);

namespace App\Jobs;

use App\Models\AuditLog;
use App\Models\AuditLogArchive;
use App\Models\User;
use App\Services\Export\ExcelExportService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Log;
use Throwable;

class ProcessAuditLogExportJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    /**
     * Timeout for the queue worker job (in seconds).
     */
    public int $timeout = 600;

    /**
     * Create a new job instance.
     */
    public function __construct(
        public string $jobId,
        public int $userId,
        public array $filters,
        public bool $isArchive,
        public string $filename
    ) {}

    /**
     * Execute the job.
     */
    public function handle(ExcelExportService $exportService): void
    {
        try {
            Cache::put("export_job_{$this->jobId}", [
                'status' => 'processing',
                'user_id' => $this->userId,
                'progress' => 10,
                'started_at' => now()->toIso8601String(),
            ], now()->addHours(4));

            $user = User::find($this->userId);
            if (!$user) {
                throw new \Exception('User initiating export not found.');
            }

            $modelClass = $this->isArchive ? AuditLogArchive::class : AuditLog::class;
            $query = $modelClass::query()->orderBy('created_at', 'desc')->orderBy('id', 'desc');

            if (!$user->hasRole('Superadmin')) {
                $query->where('description', 'not like', '%Superadmin%')
                      ->where(function ($q) {
                          $q->whereNull('user_name')
                            ->orWhere('user_name', 'not like', '%Superadmin%');
                      });
            }

            if (!empty($this->filters['search'])) {
                $search = trim((string) $this->filters['search']);
                $query->where(function ($q) use ($search) {
                    $q->where('user_name', 'like', "%{$search}%")
                        ->orWhere('user_nip', 'like', "%{$search}%")
                        ->orWhere('user_email', 'like', "%{$search}%")
                        ->orWhere('description', 'like', "%{$search}%")
                        ->orWhere('ip_address', 'like', "%{$search}%");
                });
            }

            if (!empty($this->filters['module']) && $this->filters['module'] !== 'all') {
                $query->where('module', $this->filters['module']);
            }

            if (!empty($this->filters['action']) && $this->filters['action'] !== 'all') {
                $query->where('action', $this->filters['action']);
            }

            if (!empty($this->filters['date_from'])) {
                $query->whereDate('created_at', '>=', $this->filters['date_from']);
            }

            if (!empty($this->filters['date_to'])) {
                $query->whereDate('created_at', '<=', $this->filters['date_to']);
            }

            $headers = [
                'No',
                'Waktu Aktivitas (WIB)',
                'Nama Pengguna',
                'NIP Pegawai',
                'Email',
                'Modul Sistem',
                'Kode Aksi / Event',
                'Deskripsi Ringkas Aktivitas Log',
                'Alamat IP',
                'Browser / User Agent',
            ];

            $generator = function () use ($query) {
                $no = 1;
                foreach ($query->lazy(500) as $log) {
                    yield [
                        $no++,
                        $log->created_at ? $log->created_at->format('d/m/Y H:i:s') : '-',
                        $log->user_name ?? 'Sistem',
                        $log->user_nip ?? '-',
                        $log->user_email ?? '-',
                        $log->module ?? '-',
                        $log->action ?? '-',
                        $log->description ?? '-',
                        $log->ip_address ?? '-',
                        $log->user_agent ?? '-',
                    ];
                }
            };

            $metadata = [
                'Tipe Log Audit' => $this->isArchive ? 'Kubah Arsip Permanen (WORM)' : 'Log Operasional (Aktif)',
            ];
            if (!empty($this->filters['search'])) {
                $metadata['Kata Kunci Pencarian'] = $this->filters['search'];
            }
            if (!empty($this->filters['module']) && $this->filters['module'] !== 'all') {
                $metadata['Filter Modul'] = $this->filters['module'];
            }

            $title = $this->isArchive
                ? 'LAPORAN KUBAH ARSIP PERMANEN LOG AUDIT KEAMANAN (WORM)'
                : 'LAPORAN REKAPITULASI LOG AUDIT KEAMANAN SISTEM';

            $exportDir = storage_path('app/exports');
            File::ensureDirectoryExists($exportDir);

            $filePath = $exportDir . DIRECTORY_SEPARATOR . "{$this->jobId}.xlsx";
            $cleanFilename = preg_replace('/[^a-zA-Z0-9_\-]/', '_', $this->filename);
            $fullDownloadName = sprintf('%s_%s.xlsx', $cleanFilename, date('Ymd_His'));

            $rowCount = $exportService->exportToFile(
                destinationPath: $filePath,
                title: $title,
                headers: $headers,
                rows: $generator(),
                metadata: $metadata
            );

            Cache::put("export_job_{$this->jobId}", [
                'status' => 'completed',
                'user_id' => $this->userId,
                'progress' => 100,
                'filename' => $fullDownloadName,
                'total_rows' => $rowCount,
                'completed_at' => now()->toIso8601String(),
            ], now()->addHours(24));

        } catch (Throwable $e) {
            Log::error("Async Export Job Failed [{$this->jobId}]: " . $e->getMessage(), [
                'exception' => $e,
            ]);

            Cache::put("export_job_{$this->jobId}", [
                'status' => 'failed',
                'error' => 'Gagal memproses ekspor di antrean worker: ' . $e->getMessage(),
            ], now()->addHours(2));
        }
    }
}
