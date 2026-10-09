<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\AuditLogResource;
use App\Models\AuditLog;
use App\Models\AuditLogArchive;
use App\Services\Export\ExcelExportService;
use App\Services\Audit\AuditLogService;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Symfony\Component\HttpFoundation\StreamedResponse;

class AuditLogController extends Controller
{
    public function __construct(
        protected AuditLogService $auditLogService
    ) {}

    /**
     * Export Audit Logs data to Excel (.xlsx).
     */
    public function export(Request $request, ExcelExportService $exportService): StreamedResponse
    {
        $user = $request->user();
        if (!$user->can('audit.view')) {
            abort(403, 'Anda tidak memiliki hak akses untuk mengekspor log audit keamanan.');
        }

        $isArchive = $request->boolean('archive') || $request->input('type') === 'archive';
        if ($isArchive && !$user->hasRole('Superadmin')) {
            abort(403, 'Hanya Superadmin yang berhak mengekspor kubah arsip permanen.');
        }

        $modelClass = $isArchive ? AuditLogArchive::class : AuditLog::class;
        $query = $modelClass::query()->orderBy('created_at', 'desc')->orderBy('id', 'desc');

        if (!$user->hasRole('Superadmin')) {
            $query->where('description', 'not like', '%Superadmin%')
                  ->where(function ($q) {
                      $q->whereNull('user_name')
                        ->orWhere('user_name', 'not like', '%Superadmin%');
                  });
        }

        if ($request->filled('search')) {
            $search = trim((string) $request->input('search'));
            $query->where(function ($q) use ($search) {
                $q->where('user_name', 'like', "%{$search}%")
                    ->orWhere('user_nip', 'like', "%{$search}%")
                    ->orWhere('user_email', 'like', "%{$search}%")
                    ->orWhere('description', 'like', "%{$search}%")
                    ->orWhere('ip_address', 'like', "%{$search}%");
            });
        }

        if ($request->filled('module') && $request->input('module') !== 'all') {
            $query->where('module', $request->input('module'));
        }

        if ($request->filled('action') && $request->input('action') !== 'all') {
            $query->where('action', $request->input('action'));
        }

        if ($request->filled('date_from')) {
            $query->whereDate('created_at', '>=', $request->input('date_from'));
        }

        if ($request->filled('date_to')) {
            $query->whereDate('created_at', '<=', $request->input('date_to'));
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
            'Tipe Log Audit' => $isArchive ? 'Kubah Arsip Permanen (WORM)' : 'Log Operasional (Aktif)',
        ];
        if ($request->filled('search')) {
            $metadata['Kata Kunci Pencarian'] = $request->input('search');
        }
        if ($request->filled('module') && $request->input('module') !== 'all') {
            $metadata['Filter Modul'] = $request->input('module');
        }

        $filename = $isArchive ? 'Arsip_Log_Audit_Permanen_PEMDA' : 'Log_Audit_Keamanan_PEMDA';
        $title = $isArchive ? 'LAPORAN KUBAH ARSIP PERMANEN LOG AUDIT KEAMANAN (WORM)' : 'LAPORAN REKAPITULASI LOG AUDIT KEAMANAN SISTEM';

        return $exportService->streamExport(
            filename: $filename,
            title: $title,
            headers: $headers,
            rows: $generator(),
            metadata: $metadata
        );
    }

    /**
     * Get audit logs with search, filter, and pagination.
     */
    public function index(Request $request): AnonymousResourceCollection
    {
        if (!$request->user()->can('audit.view')) {
            abort(403, 'Anda tidak memiliki hak akses untuk melihat log audit keamanan.');
        }

        $perPage = (int) $request->input('per_page', 15);
        if ($perPage < 5 || $perPage > 250) {
            $perPage = 15;
        }

        $filters = $request->only(['search', 'module', 'action', 'date_from', 'date_to', 'auditable_type', 'auditable_id']);

        $logs = $this->auditLogService->listLogs($filters, $perPage, $request->user());

        return AuditLogResource::collection($logs);
    }
}
