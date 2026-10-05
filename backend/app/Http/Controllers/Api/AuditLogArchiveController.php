<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\AuditLogResource;
use App\Services\Audit\AuditArchiveService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class AuditLogArchiveController extends Controller
{
    public function __construct(
        protected AuditArchiveService $auditArchiveService
    ) {}

    /**
     * List archived logs from the immutable vault (Superadmin only).
     */
    public function index(Request $request): AnonymousResourceCollection
    {
        $perPage = (int) $request->input('per_page', 15);
        if ($perPage < 5 || $perPage > 250) {
            $perPage = 15;
        }

        $filters = $request->only(['search', 'module', 'action', 'date_from', 'date_to']);

        $archives = $this->auditArchiveService->listArchives($filters, $perPage, $request->user());

        return AuditLogResource::collection($archives);
    }

    /**
     * Archive active logs older than the given threshold and purge them from active storage (Superadmin only).
     */
    public function purge(Request $request): JsonResponse
    {
        if (!$request->user()->hasRole('Superadmin')) {
            abort(403, 'Akses Ditolak. Hanya Superadmin yang berwenang melakukan pengarsipan dan pembersihan log.');
        }

        $validated = $request->validate([
            'ids' => ['nullable', 'array', 'max:5000'],
            'ids.*' => ['string', 'uuid'],
            'exclude_ids' => ['nullable', 'array', 'max:5000'],
            'exclude_ids.*' => ['string', 'uuid'],
            'filters' => ['nullable', 'array'],
            'filters.search' => ['nullable', 'string', 'max:255'],
            'filters.module' => ['nullable', 'string', 'max:50'],
            'filters.action' => ['nullable', 'string', 'max:50'],
            'filters.date_from' => ['nullable', 'date'],
            'filters.date_to' => ['nullable', 'date', 'after_or_equal:filters.date_from'],
            'filters.days' => ['nullable', 'integer', 'min:1', 'max:3650'],
            'days' => ['nullable', 'integer', 'min:1', 'max:3650'],
            'cutoff_date' => ['nullable', 'date', 'before_or_equal:today'],
        ]);

        $excludeIds = (array) ($validated['exclude_ids'] ?? []);

        // Mode 1: Explicit IDs selected via table checkboxes
        if ($request->has('ids')) {
            if (empty($validated['ids'])) {
                abort(422, 'Tidak ada log audit yang dipilih untuk diarsipkan.');
            }

            $count = $this->auditArchiveService->archiveByIds(
                ids: (array) $validated['ids'],
                excludeIds: $excludeIds,
                archivedBy: $request->user()
            );

            return response()->json([
                'message' => $count > 0
                    ? "Berhasil memindahkan {$count} log audit terpilih ke Kubah Arsip Permanen dan membersihkannya dari tabel aktif."
                    : 'Tidak ada log audit yang dipindahkan.',
                'archived_count' => $count,
                'mode' => 'selected_ids',
            ]);
        }

        // Mode 2: Active filter criteria with optional exclusions
        if ($request->has('filters')) {
            $filters = array_filter(
                (array) ($validated['filters'] ?? []),
                fn ($value) => $value !== null && $value !== '' && $value !== 'all'
            );

            // Guard: an empty filter would silently archive the ENTIRE active table.
            if (empty($filters)) {
                abort(422, 'Minimal satu kriteria filter harus aktif untuk mengarsipkan berdasarkan filter.');
            }

            $count = $this->auditArchiveService->archiveByFilter(
                filters: $filters,
                excludeIds: $excludeIds,
                archivedBy: $request->user()
            );

            return response()->json([
                'message' => $count > 0
                    ? "Berhasil memindahkan {$count} log audit hasil filter ke Kubah Arsip Permanen dan membersihkannya dari tabel aktif."
                    : 'Tidak ada log audit hasil filter yang memenuhi kriteria pengarsipan.',
                'archived_count' => $count,
                'mode' => 'filter_criteria',
            ]);
        }

        // Mode 3: Retention threshold (days or cutoff date)
        $days = (int) ($validated['days'] ?? 90);
        $cutoffDate = $validated['cutoff_date'] ?? null;

        $result = $this->auditArchiveService->archiveAndPurge(
            daysOlderThan: $days,
            archivedBy: $request->user(),
            cutoffDate: $cutoffDate
        );

        $count = $result['archived_count'];

        return response()->json([
            'message' => $count > 0
                ? "Berhasil memindahkan {$count} log audit ke Kubah Arsip Permanen dan membersihkannya dari tabel aktif."
                : 'Tidak ada data log yang memenuhi kriteria untuk diarsipkan.',
            'archived_count' => $count,
            'cutoff_date' => $result['cutoff_date'],
            'mode' => 'retention_threshold',
        ]);
    }

    /**
     * Get lifecycle statistics of active and archived audit logs (Superadmin only).
     */
    public function stats(Request $request): JsonResponse
    {
        if (!$request->user()->hasRole('Superadmin')) {
            abort(403, 'Akses Ditolak. Statistik siklus hidup log audit hanya untuk Superadmin.');
        }

        $stats = $this->auditArchiveService->getStats();

        return response()->json([
            'data' => $stats,
        ]);
    }
}
