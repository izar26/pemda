<?php

declare(strict_types=1);

namespace App\Services\Audit;

use App\Models\AuditLogArchive;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Database\Query\Builder;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class AuditArchiveService
{
    /**
     * Number of rows moved per transaction. Keeps lock duration and memory usage bounded.
     */
    private const BATCH_SIZE = 250;

    /**
     * Archive active audit logs older than the given days or cutoff date, then purge them from active storage.
     *
     * Semantics:
     *  - $cutoffDate = 'YYYY-MM-DD' → archive every log created strictly BEFORE that date (00:00).
     *  - otherwise                  → archive every log older than $daysOlderThan full days.
     *
     * @return array{archived_count: int, cutoff_date: string}
     */
    public function archiveAndPurge(
        int $daysOlderThan = 90,
        ?User $archivedBy = null,
        ?string $cutoffDate = null
    ): array {
        $cutoff = $cutoffDate !== null
            ? Carbon::parse($cutoffDate)->startOfDay()
            : now()->subDays($daysOlderThan)->startOfDay();

        $totalArchived = $this->moveInBatches(
            fn () => DB::table('audit_logs')->where('created_at', '<', $cutoff),
            $archivedBy
        );

        // Record the maintenance operation itself in the active log
        if ($totalArchived > 0) {
            app(AuditLogService::class)->log(
                action: 'AUDIT_LOGS_ARCHIVED',
                module: 'Log Audit',
                description: "Superadmin melakukan pengarsipan dan pembersihan log audit: {$totalArchived} catatan berhasil diamankan ke Kubah Arsip Permanen (Cutoff: sebelum {$cutoff->toDateString()}).",
                user: $archivedBy,
                context: [
                    'archived_count' => $totalArchived,
                    'cutoff_date' => $cutoff->toIso8601String(),
                    'days_threshold' => $cutoffDate === null ? $daysOlderThan : null,
                    'mode' => 'retention_threshold',
                ]
            );
        }

        return [
            'archived_count' => $totalArchived,
            'cutoff_date' => $cutoff->toIso8601String(),
        ];
    }

    /**
     * Archive specific audit logs by their primary IDs, with optional exclusion.
     * Perfect for checkbox selection workflow (Select All on filtered view -> deselect exceptions).
     *
     * @param  array<string>  $ids
     * @param  array<string>  $excludeIds
     */
    public function archiveByIds(
        array $ids,
        array $excludeIds = [],
        ?User $archivedBy = null
    ): int {
        $finalIds = array_values(array_unique(array_diff($ids, $excludeIds)));

        if (empty($finalIds)) {
            return 0;
        }

        $totalArchived = 0;

        foreach (array_chunk($finalIds, self::BATCH_SIZE) as $chunkIds) {
            $totalArchived += $this->moveBatch(
                DB::table('audit_logs')->whereIn('id', $chunkIds),
                $archivedBy
            );
        }

        if ($totalArchived > 0) {
            app(AuditLogService::class)->log(
                action: 'AUDIT_LOGS_ARCHIVED',
                module: 'Log Audit',
                description: "Superadmin memindahkan {$totalArchived} catatan log terpilih ke Kubah Arsip Permanen (WORM).",
                user: $archivedBy,
                context: [
                    'archived_count' => $totalArchived,
                    'mode' => 'selective_ids',
                ]
            );
        }

        return $totalArchived;
    }

    /**
     * Archive audit logs based on active filter criteria with optional explicit exclusions.
     * Processes matching rows in bounded batches (never loads all IDs into memory).
     *
     * @param  array{
     *     search?: string,
     *     module?: string,
     *     action?: string,
     *     date_from?: string,
     *     date_to?: string,
     *     days?: int
     * }  $filters
     * @param  array<string>  $excludeIds
     */
    public function archiveByFilter(
        array $filters = [],
        array $excludeIds = [],
        ?User $archivedBy = null
    ): int {
        $totalArchived = $this->moveInBatches(
            function () use ($filters, $excludeIds) {
                $query = DB::table('audit_logs');

                if (!empty($excludeIds)) {
                    $query->whereNotIn('id', $excludeIds);
                }

                $this->applyFilters($query, $filters);

                if (!empty($filters['days'])) {
                    $query->where('created_at', '<', now()->subDays((int) $filters['days'])->startOfDay());
                }

                return $query;
            },
            $archivedBy
        );

        if ($totalArchived > 0) {
            app(AuditLogService::class)->log(
                action: 'AUDIT_LOGS_ARCHIVED',
                module: 'Log Audit',
                description: "Superadmin memindahkan {$totalArchived} catatan log hasil filter ke Kubah Arsip Permanen (WORM).",
                user: $archivedBy,
                context: [
                    'archived_count' => $totalArchived,
                    'mode' => 'filter_criteria',
                    'filters' => $filters,
                    'excluded_count' => count($excludeIds),
                ]
            );
        }

        return $totalArchived;
    }

    /**
     * List archived audit logs from the immutable vault with filters and pagination.
     * Strictly restricted to Superadmin users.
     */
    public function listArchives(
        array $filters = [],
        int $perPage = 15,
        ?User $currentUser = null
    ): LengthAwarePaginator {
        $user = $currentUser ?? auth('sanctum')->user() ?? auth()->user();

        if (!$user?->hasRole('Superadmin')) {
            abort(403, 'Akses Ditolak. Hanya Superadmin yang memiliki hak akses ke Kubah Arsip Audit.');
        }

        $query = AuditLogArchive::query()->orderBy('created_at', 'desc')->orderBy('id', 'desc');

        if (!empty($filters['search'])) {
            $search = trim((string) $filters['search']);
            $likeOperator = $this->likeOperator();
            $query->where(function ($q) use ($search, $likeOperator) {
                $q->where('user_name', $likeOperator, "%{$search}%")
                    ->orWhere('user_nip', $likeOperator, "%{$search}%")
                    ->orWhere('user_email', $likeOperator, "%{$search}%")
                    ->orWhere('description', $likeOperator, "%{$search}%")
                    ->orWhere('ip_address', $likeOperator, "%{$search}%")
                    ->orWhere('action', $likeOperator, "%{$search}%")
                    ->orWhere('module', $likeOperator, "%{$search}%");
            });
        }

        if (!empty($filters['module']) && $filters['module'] !== 'all') {
            $query->where('module', $filters['module']);
        }

        if (!empty($filters['action']) && $filters['action'] !== 'all') {
            $query->where('action', $filters['action']);
        }

        if (!empty($filters['date_from'])) {
            $query->where('created_at', '>=', Carbon::parse($filters['date_from'])->startOfDay());
        }

        if (!empty($filters['date_to'])) {
            $query->where('created_at', '<=', Carbon::parse($filters['date_to'])->endOfDay());
        }

        return $query->paginate($perPage);
    }

    /**
     * Get lifecycle statistics of active and archived audit logs.
     *
     * @return array{
     *     active_logs_count: int,
     *     archived_logs_count: int,
     *     oldest_active_log: ?string,
     *     newest_active_log: ?string,
     *     last_archived_at: ?string
     * }
     */
    public function getStats(): array
    {
        return [
            'active_logs_count' => (int) DB::table('audit_logs')->count(),
            'archived_logs_count' => (int) DB::table('audit_log_archives')->count(),
            'oldest_active_log' => DB::table('audit_logs')->min('created_at'),
            'newest_active_log' => DB::table('audit_logs')->max('created_at'),
            'last_archived_at' => DB::table('audit_log_archives')->max('archived_at'),
        ];
    }

    /**
     * Apply the same search/module/action/date filters used by the active log listing,
     * so "archive filtered result" always matches what the user previewed.
     *
     * @param  array<string, mixed>  $filters
     */
    private function applyFilters(Builder $query, array $filters): void
    {
        if (!empty($filters['module']) && $filters['module'] !== 'all') {
            $query->where('module', $filters['module']);
        }

        if (!empty($filters['action']) && $filters['action'] !== 'all') {
            $query->where('action', $filters['action']);
        }

        if (!empty($filters['date_from'])) {
            $query->where('created_at', '>=', Carbon::parse($filters['date_from'])->startOfDay());
        }

        if (!empty($filters['date_to'])) {
            $query->where('created_at', '<=', Carbon::parse($filters['date_to'])->endOfDay());
        }

        if (!empty($filters['search'])) {
            $search = trim((string) $filters['search']);
            $likeOperator = $this->likeOperator();
            $query->where(function ($q) use ($search, $likeOperator) {
                $q->where('user_name', $likeOperator, "%{$search}%")
                    ->orWhere('user_nip', $likeOperator, "%{$search}%")
                    ->orWhere('user_email', $likeOperator, "%{$search}%")
                    ->orWhere('description', $likeOperator, "%{$search}%")
                    ->orWhere('ip_address', $likeOperator, "%{$search}%");
            });
        }
    }

    /**
     * Repeatedly move batches matching the query produced by $queryFactory until nothing is left.
     * Because moved rows are deleted from audit_logs, each iteration naturally advances.
     *
     * @param  callable(): Builder  $queryFactory
     */
    private function moveInBatches(callable $queryFactory, ?User $archivedBy): int
    {
        $total = 0;

        do {
            $moved = $this->moveBatch(
                $queryFactory()->orderBy('created_at')->orderBy('id')->limit(self::BATCH_SIZE),
                $archivedBy
            );
            $total += $moved;
        } while ($moved === self::BATCH_SIZE);

        return $total;
    }

    /**
     * Atomically copy the rows selected by $query into the WORM archive and delete them from audit_logs.
     * Rows are locked (SELECT ... FOR UPDATE) so concurrent archive requests can never
     * archive the same log twice.
     */
    private function moveBatch(Builder $query, ?User $archivedBy): int
    {
        return DB::transaction(function () use ($query, $archivedBy) {
            $records = $query->lockForUpdate()->get();

            if ($records->isEmpty()) {
                return 0;
            }

            $now = now();
            $archiveRows = [];
            $idsToDelete = [];

            foreach ($records as $log) {
                $idsToDelete[] = $log->id;
                $archiveRows[] = [
                    'id' => (string) Str::uuid7(),
                    'original_audit_id' => $log->id,
                    'user_id' => $log->user_id,
                    'user_name' => $log->user_name,
                    'user_nip' => $log->user_nip,
                    'user_email' => $log->user_email,
                    'action' => $log->action,
                    'module' => $log->module,
                    'auditable_type' => $log->auditable_type,
                    'auditable_id' => $log->auditable_id,
                    'description' => $log->description,
                    'ip_address' => $log->ip_address,
                    'user_agent' => $log->user_agent,
                    'context' => $log->context,
                    'created_at' => $log->created_at,
                    'archived_at' => $now,
                    'archived_by' => $archivedBy?->id,
                ];
            }

            // 1. Insert into immutable archive vault
            DB::table('audit_log_archives')->insert($archiveRows);

            // 2. Safely purge from active table
            DB::table('audit_logs')->whereIn('id', $idsToDelete)->delete();

            return count($archiveRows);
        });
    }

    private function likeOperator(): string
    {
        return DB::connection()->getDriverName() === 'pgsql' ? 'ilike' : 'like';
    }
}
