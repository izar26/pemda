<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\AuditLogResource;
use App\Services\Audit\AuditLogService;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class AuditLogController extends Controller
{
    public function __construct(
        protected AuditLogService $auditLogService
    ) {}

    /**
     * Get audit logs with search, filter, and pagination.
     */
    public function index(Request $request): AnonymousResourceCollection
    {
        if (!$request->user()->can('audit.view')) {
            abort(403, 'Anda tidak memiliki hak akses untuk melihat log audit keamanan.');
        }

        $perPage = (int) $request->input('per_page', 15);
        if ($perPage < 5 || $perPage > 100) {
            $perPage = 15;
        }

        $filters = $request->only(['search', 'module', 'action', 'date_from', 'date_to', 'auditable_type', 'auditable_id']);

        $logs = $this->auditLogService->listLogs($filters, $perPage);

        return AuditLogResource::collection($logs);
    }
}
