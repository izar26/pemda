<?php

declare(strict_types=1);

namespace App\Services\Audit;

use App\Models\AuditLog;
use App\Models\Role;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\DB;
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
        int|string|null $auditableId = null
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
            'auditable_id' => $auditableId !== null ? (string) $auditableId : null,
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
            auditableId: $model->getKey() !== null ? (string) $model->getKey() : null
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
     *     auditable_id?: int|string,
     *     date_from?: string,
     *     date_to?: string
     * }  $filters
     */
    public function listLogs(array $filters = [], int $perPage = 15, ?User $currentUser = null): LengthAwarePaginator
    {
        $user = $currentUser ?? auth('sanctum')->user() ?? auth()->user();
        $query = AuditLog::query()->orderBy('created_at', 'desc')->orderBy('id', 'desc');

        // Ghost filter: non-superadmin users must not see Superadmin activity or logs related to Superadmin
        if (!$user?->hasRole('Superadmin')) {
            $superadminUserIds = User::whereHas('roles', function ($q) {
                $q->where('name', 'Superadmin');
            })->orWhere('role', 'Superadmin')->pluck('id')->all();

            $superadminEmails = User::whereHas('roles', function ($q) {
                $q->where('name', 'Superadmin');
            })->orWhere('role', 'Superadmin')->pluck('email')->all();

            $superadminRoleId = Role::where('name', 'Superadmin')->value('id');

            // Exclude logs initiated by a Superadmin
            if (!empty($superadminUserIds)) {
                $query->where(function ($q) use ($superadminUserIds) {
                    $q->whereNotIn('user_id', $superadminUserIds)
                      ->orWhereNull('user_id');
                });
            }

            if (!empty($superadminEmails)) {
                $query->where(function ($q) use ($superadminEmails) {
                    $q->whereNotIn('user_email', $superadminEmails)
                      ->orWhereNull('user_email');
                });
            }

            // Exclude logs where auditable target is a Superadmin user
            if (!empty($superadminUserIds)) {
                $query->where(function ($q) use ($superadminUserIds) {
                    $q->whereNull('auditable_type')
                      ->orWhereNotIn('auditable_type', [User::class, 'App\Models\User'])
                      ->orWhereNotIn('auditable_id', $superadminUserIds);
                });
            }

            // Exclude logs where auditable target is Superadmin role
            if ($superadminRoleId) {
                $query->where(function ($q) use ($superadminRoleId) {
                    $q->whereNull('auditable_type')
                      ->orWhereNotIn('auditable_type', [Role::class, 'App\Models\Role'])
                      ->orWhere('auditable_id', '!=', $superadminRoleId);
                });
            }

            // Exclude logs whose description or snapshots reveal Superadmin
            $query->where('description', 'not like', '%Superadmin%')
                  ->where(function ($q) {
                      $q->whereNull('user_name')
                        ->orWhere('user_name', 'not like', '%Superadmin%');
                  });
        }

        if (!empty($filters['search'])) {
            $search = trim($filters['search']);
            $likeOperator = DB::connection()->getDriverName() === 'pgsql' ? 'ilike' : 'like';
            $query->where(function ($q) use ($search, $likeOperator) {
                $q->where('user_name', $likeOperator, "%{$search}%")
                    ->orWhere('user_nip', $likeOperator, "%{$search}%")
                    ->orWhere('user_email', $likeOperator, "%{$search}%")
                    ->orWhere('description', $likeOperator, "%{$search}%")
                    ->orWhere('ip_address', $likeOperator, "%{$search}%");
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
            $query->where('auditable_id', (string) $filters['auditable_id']);
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
