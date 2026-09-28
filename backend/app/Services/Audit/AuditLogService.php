<?php

declare(strict_types=1);

namespace App\Services\Audit;

use App\Models\AuditLog;
use App\Models\User;
use Illuminate\Pagination\LengthAwarePaginator;

class AuditLogService
{
    /**
     * Record an audit log entry.
     */
    public function log(
        string $action,
        string $module,
        string $description,
        ?User $user = null,
        ?array $context = null
    ): AuditLog {
        $currentUser = $user ?? auth('sanctum')->user() ?? auth()->user();

        return AuditLog::create([
            'user_id' => $currentUser?->id,
            'user_name' => $currentUser?->name ?? 'Sistem',
            'user_nip' => $currentUser?->nip,
            'user_email' => $currentUser?->email,
            'action' => $action,
            'module' => $module,
            'description' => $description,
            'ip_address' => request()->ip() ?? '127.0.0.1',
            'user_agent' => request()->userAgent() ?? 'System',
            'context' => $context,
            'created_at' => now(),
        ]);
    }

    /**
     * List audit logs with search, filter, and pagination.
     *
     * @param array{search?: string, module?: string, action?: string, date_from?: string, date_to?: string} $filters
     */
    public function listLogs(array $filters = [], int $perPage = 15): LengthAwarePaginator
    {
        $query = AuditLog::query()->orderBy('created_at', 'desc');

        if (!empty($filters['search'])) {
            $search = trim($filters['search']);
            $query->where(function ($q) use ($search) {
                $q->where('user_name', 'ilike', "%{$search}%")
                    ->orWhere('user_nip', 'ilike', "%{$search}%")
                    ->orWhere('user_email', 'ilike', "%{$search}%")
                    ->orWhere('description', 'ilike', "%{$search}%")
                    ->orWhere('ip_address', 'ilike', "%{$search}%");
            });
        }

        if (!empty($filters['module']) && $filters['module'] !== 'all') {
            $query->where('module', $filters['module']);
        }

        if (!empty($filters['action']) && $filters['action'] !== 'all') {
            $query->where('action', $filters['action']);
        }

        if (!empty($filters['date_from'])) {
            $query->whereDate('created_at', '>=', $filters['date_from']);
        }

        if (!empty($filters['date_to'])) {
            $query->whereDate('created_at', '<=', $filters['date_to']);
        }

        return $query->paginate($perPage);
    }
}
