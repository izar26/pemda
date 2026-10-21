<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\Pengawasan;

use App\Http\Controllers\Controller;
use App\Http\Requests\Pengawasan\StoreAuditorAssignmentRequest;
use App\Http\Requests\Pengawasan\UpdateAuditorAssignmentRequest;
use App\Services\Pengawasan\AuditorAssignmentService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AuditorAssignmentController extends Controller
{
    public function __construct(
        protected AuditorAssignmentService $assignmentService
    ) {}

    /**
     * Display a listing of auditor assignments (grouped by auditor or flat).
     */
    public function index(Request $request): JsonResponse
    {
        $user = $request->user() ?? auth('sanctum')->user();
        if (!$user?->can('penugasan_auditor.view')) {
            abort(403, 'Anda tidak memiliki hak akses untuk melihat data penugasan auditor.');
        }

        $perPage = (int) $request->input('per_page', 10);
        $filters = $request->only(['search', 'opd_id', 'auditor_id', 'periode_penilaian_id', 'is_active', 'has_assignment']);

        // Check if flat assignments or grouped by auditor
        if ($request->input('view') === 'flat') {
            $paginated = $this->assignmentService->getPaginatedAssignments($filters, $perPage, $user);
        } else {
            $paginated = $this->assignmentService->getAuditorsWithAssignments($filters, $perPage, $user);
        }

        return response()->json([
            'data' => $paginated->items(),
            'meta' => [
                'current_page' => $paginated->currentPage(),
                'last_page' => $paginated->lastPage(),
                'per_page' => $paginated->perPage(),
                'total' => $paginated->total(),
            ],
        ]);
    }

    /**
     * Get statistics on auditor coverage.
     */
    public function stats(Request $request): JsonResponse
    {
        $user = $request->user() ?? auth('sanctum')->user();
        if (!$user?->can('penugasan_auditor.view')) {
            abort(403, 'Anda tidak memiliki hak akses untuk melihat statistik penugasan.');
        }

        $periodePenilaianId = $request->input('periode_penilaian_id');
        $stats = $this->assignmentService->getStats($periodePenilaianId ? (string) $periodePenilaianId : null);

        return response()->json(['data' => $stats]);
    }

    /**
     * Get list of eligible auditors for dropdown selection.
     */
    public function auditors(Request $request): JsonResponse
    {
        $user = $request->user() ?? auth('sanctum')->user();
        if (!$user?->can('penugasan_auditor.view')) {
            abort(403, 'Anda tidak memiliki hak akses.');
        }

        $auditors = $this->assignmentService->getEligibleAuditors();

        return response()->json(['data' => $auditors]);
    }

    /**
     * Store assignments for an auditor.
     */
    public function store(StoreAuditorAssignmentRequest $request): JsonResponse
    {
        $user = $request->user() ?? auth('sanctum')->user();
        $assignments = $this->assignmentService->assignAuditor($request->validated(), $user);

        return response()->json([
            'message' => 'Penugasan auditor berhasil disimpan.',
            'data' => $assignments,
        ], 201);
    }

    /**
     * Sync/update all assignments for a specific auditor.
     */
    public function update(UpdateAuditorAssignmentRequest $request, string $auditorId): JsonResponse
    {
        $user = $request->user() ?? auth('sanctum')->user();
        $synced = $this->assignmentService->syncAuditorAssignments($auditorId, $request->validated(), $user);

        return response()->json([
            'message' => 'Penugasan auditor berhasil diperbarui.',
            'data' => $synced,
        ]);
    }

    /**
     * Delete a single assignment by assignment ID.
     */
    public function destroy(Request $request, string $id): JsonResponse
    {
        $user = $request->user() ?? auth('sanctum')->user();
        if (!$user?->can('penugasan_auditor.delete')) {
            abort(403, 'Anda tidak memiliki hak akses untuk menghapus penugasan auditor.');
        }

        $this->assignmentService->deleteAssignment($id);

        return response()->json([
            'message' => 'Penugasan auditor berhasil dicabut.',
        ]);
    }

    /**
     * Delete all assignments for a specific auditor.
     */
    public function destroyAuditor(Request $request, string $auditorId): JsonResponse
    {
        $user = $request->user() ?? auth('sanctum')->user();
        if (!$user?->can('penugasan_auditor.delete')) {
            abort(403, 'Anda tidak memiliki hak akses untuk mencabut penugasan.');
        }

        $count = $this->assignmentService->deleteAuditorAssignments($auditorId);

        return response()->json([
            'message' => "Seluruh penugasan ({$count} OPD) untuk auditor berhasil dicabut.",
        ]);
    }
}
