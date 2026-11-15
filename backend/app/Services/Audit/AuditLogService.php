<?php

declare(strict_types=1);

namespace App\Services\Audit;

use App\Models\AuditLog;
use App\Models\Role;
use App\Models\User;
use Illuminate\Database\Eloquent\Collection;
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
        $action = "{$actionPrefix}_".Str::upper($event);

        $description = $customDescription ?? match ($event) {
            'created' => "Menambahkan {$entityShort} baru: {$label}",
            'updated' => "Memperbarui {$entityShort}: {$label}".(! empty($eventData['changes']) ? ' ('.count($eventData['changes']).' atribut diubah)' : ''),
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
     * Apply ghost filter to completely hide Superadmin activity from non-superadmin users.
     */
    public function applyGhostFilter($query, ?User $user): void
    {
        if ($user?->hasRole('Superadmin') || $user?->roles()->where('is_system', true)->exists()) {
            return;
        }

        $superadminRoleIds = Role::where('is_system', true)
            ->orWhere('name', 'Superadmin')
            ->pluck('id')
            ->all();

        $superadminUsers = User::whereHas('roles', function ($q) use ($superadminRoleIds) {
            $q->whereIn('id', $superadminRoleIds);
        })->orWhere('role', 'Superadmin')
            ->orWhere('email', 'superadmin@pemda.go.id')
            ->get(['id', 'email', 'name']);

        $superadminUserIds = $superadminUsers->pluck('id')->filter()->all();
        $superadminEmails = $superadminUsers->pluck('email')->filter()->all();
        $superadminNames = $superadminUsers->pluck('name')->filter()->all();

        $likeOperator = DB::connection()->getDriverName() === 'pgsql' ? 'not ilike' : 'not like';

        // 1. Exclude logs initiated by a Superadmin user ID
        if (! empty($superadminUserIds)) {
            $query->where(function ($q) use ($superadminUserIds) {
                $q->whereNotIn('user_id', $superadminUserIds)
                    ->orWhereNull('user_id');
            });
        }

        // 2. Exclude logs initiated by Superadmin email
        if (! empty($superadminEmails)) {
            $query->where(function ($q) use ($superadminEmails) {
                $q->whereNotIn('user_email', $superadminEmails)
                    ->orWhereNull('user_email');
            });
        }

        // 3. Exclude logs where user_name is Superadmin
        if (! empty($superadminNames)) {
            $query->where(function ($q) use ($superadminNames) {
                $q->whereNotIn('user_name', $superadminNames)
                    ->orWhereNull('user_name');
            });
        }

        $query->where(function ($q) use ($likeOperator) {
            $q->whereNull('user_name')
                ->orWhere(function ($sub) use ($likeOperator) {
                    $sub->where('user_name', $likeOperator, '%Superadmin%');
                });
        });

        // 4. Exclude logs where auditable target is a Superadmin user
        if (! empty($superadminUserIds)) {
            $query->where(function ($q) use ($superadminUserIds) {
                $q->whereNull('auditable_type')
                    ->orWhereNotIn('auditable_type', [User::class, 'App\Models\User'])
                    ->orWhereNotIn('auditable_id', $superadminUserIds);
            });
        }

        // 5. Exclude logs where auditable target is Superadmin role
        if (! empty($superadminRoleIds)) {
            $query->where(function ($q) use ($superadminRoleIds) {
                $q->whereNull('auditable_type')
                    ->orWhereNotIn('auditable_type', [Role::class, 'App\Models\Role'])
                    ->orWhereNotIn('auditable_id', $superadminRoleIds);
            });
        }

        // 6. Exclude logs whose description specifically reveals Superadmin
        $query->where('description', $likeOperator, '%Superadmin%');
    }

    /**
     * Get recent public activity logs for dashboard feed with ghost filter applied.
     *
     * @return Collection<int, AuditLog>
     */
    public function getRecentDashboardActivities(?User $currentUser = null, int $limit = 6)
    {
        $user = $currentUser ?? auth('sanctum')->user() ?? auth()->user();
        $query = AuditLog::query()->orderBy('created_at', 'desc')->orderBy('id', 'desc');

        $this->applyGhostFilter($query, $user);

        return $query->limit($limit)->get();
    }

    /**
     * Permanently destroy all active audit logs (Hard Delete).
     * Restricted to Superadmin only.
     */
    public function destroyAllLogs(?User $actor = null): int
    {
        $count = AuditLog::count();
        DB::table('audit_logs')->delete();

        // Record the destroy-all maintenance action as the first new log
        $this->log(
            action: 'AUDIT_LOGS_DESTROYED',
            module: 'Log Audit Keamanan',
            description: "Superadmin mengosongkan seluruh log operasional secara permanen ({$count} data log dihapus).",
            user: $actor,
            context: [
                'deleted_count' => $count,
                'action_type' => 'HARD_DELETE_ALL',
            ]
        );

        return $count;
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

        // Apply ghost filter to hide Superadmin & System logs from non-superadmin users
        $this->applyGhostFilter($query, $user);

        if (! empty($filters['search'])) {
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

        if (! empty($filters['module']) && $filters['module'] !== 'all') {
            $query->where('module', $filters['module']);
        }

        if (! empty($filters['action']) && $filters['action'] !== 'all') {
            $query->where('action', $filters['action']);
        }

        if (! empty($filters['auditable_type'])) {
            $query->where('auditable_type', $filters['auditable_type']);
        }

        if (! empty($filters['auditable_id'])) {
            $query->where('auditable_id', (string) $filters['auditable_id']);
        }

        if (! empty($filters['date_from'])) {
            $query->whereDate('created_at', '>=', $filters['date_from']);
        }

        if (! empty($filters['date_to'])) {
            $query->whereDate('created_at', '<=', $filters['date_to']);
        }

        return $query->paginate($perPage);
    }
}
