<?php

declare(strict_types=1);

namespace App\Services\Audit;

use App\Models\AuditLog;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Str;

class AuditLogService
{
    /**
     * Record a manual audit log entry (backward compatible).
     *
     * @param  array<string, mixed>|null  $context
     */
    public function log(
        string $action,
        string $module,
        string $description,
        ?User $user = null,
        ?array $context = null,
        ?string $auditableType = null,
        ?int $auditableId = null
    ): AuditLog {
        $currentUser = $user ?? auth('sanctum')->user() ?? auth()->user();

        $ipAddress = app()->runningInConsole() ? '127.0.0.1' : (request()->ip() ?? '127.0.0.1');
        $userAgent = app()->runningInConsole() ? 'CLI / Artisan' : (request()->userAgent() ?? 'System');

        return AuditLog::create([
            'user_id' => $currentUser?->id,
            'user_name' => $currentUser?->name ?? 'Sistem',
            'user_nip' => $currentUser?->nip,
            'user_email' => $currentUser?->email,
            'action' => $action,
            'module' => $module,
            'auditable_type' => $auditableType,
            'auditable_id' => $auditableId,
            'description' => $description,
            'ip_address' => $ipAddress,
            'user_agent' => $userAgent,
            'context' => $context,
            'created_at' => now(),
        ]);
    }

    /**
     * Record an audit log for an Eloquent model lifecycle event.
     *
     * @param  array<string, mixed>  $eventData
     */
    public function logModelEvent(
        Model $model,
        string $event,
        array $eventData,
        ?string $customDescription = null
    ): ?AuditLog {
        $module = AuditDiffHelper::resolveModule($model);
        $label = AuditDiffHelper::resolveEntityLabel($model);
        $entityShort = class_basename($model);

        // Normalize action code, e.g. USER_CREATE, OPD_UPDATE, MASTER_DATA_DELETE
        $actionPrefix = Str::upper(Str::snake($entityShort));
        if (Str::startsWith(get_class($model), 'App\\Models\\Master\\')) {
            $actionPrefix = 'MASTER_DATA';
        }
        $action = "{$actionPrefix}_" . Str::upper($event);

        $description = $customDescription ?? match ($event) {
            'created' => "Menambahkan {$entityShort} baru: {$label}",
            'updated' => "Memperbarui {$entityShort}: {$label}" . (!empty($eventData['changes']) ? ' (' . count($eventData['changes']) . ' atribut diubah)' : ''),
            'deleted' => "Menghapus {$entityShort}: {$label}",
            'restored' => "Memulihkan {$entityShort}: {$label}",
            default => "Melakukan aksi {$event} pada {$entityShort}: {$label}",
        };

        $context = array_merge([
            'action_type' => Str::upper($event),
            'entity_name' => $entityShort,
            'entity_id' => $model->getKey(),
            'record_title' => $label,
        ], $eventData);

        return $this->log(
            action: $action,
            module: $module,
            description: $description,
            user: null, // will automatically resolve current authenticated user
            context: $context,
            auditableType: get_class($model),
            auditableId: is_numeric($model->getKey()) ? (int) $model->getKey() : null
        );
    }

    /**
     * List audit logs with search, filter, and pagination.
     *
     * @param  array{
     *     search?: string,
     *     module?: string,
     *     action?: string,
     *     auditable_type?: string,
     *     auditable_id?: int,
     *     date_from?: string,
     *     date_to?: string
     * }  $filters
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

        if (!empty($filters['auditable_type'])) {
            $query->where('auditable_type', $filters['auditable_type']);
        }

        if (!empty($filters['auditable_id'])) {
            $query->where('auditable_id', (int) $filters['auditable_id']);
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
