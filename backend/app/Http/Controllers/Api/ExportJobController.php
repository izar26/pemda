<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Symfony\Component\HttpFoundation\BinaryFileResponse;
use Symfony\Component\HttpFoundation\Response;

class ExportJobController extends Controller
{
    /**
     * Check status of an asynchronous background export job.
     */
    public function status(Request $request, string $jobId): JsonResponse
    {
        $jobData = Cache::get("export_job_{$jobId}");

        if (!$jobData) {
            return response()->json([
                'status' => 'not_found',
                'message' => 'Tugas ekspor tidak ditemukan atau telah kedaluwarsa.',
            ], Response::HTTP_NOT_FOUND);
        }

        // Authorization check: only the initiating user or Superadmin may inspect the job
        $user = $request->user();
        if ($user && isset($jobData['user_id']) && $jobData['user_id'] !== $user->id && !$user->hasRole('Superadmin')) {
            return response()->json([
                'status' => 'error',
                'message' => 'Anda tidak memiliki wewenang untuk memeriksa tugas ekspor ini.',
            ], Response::HTTP_FORBIDDEN);
        }

        return response()->json($jobData);
    }

    /**
     * Download the completed export file.
     */
    public function download(Request $request, string $jobId): BinaryFileResponse|JsonResponse
    {
        $jobData = Cache::get("export_job_{$jobId}");

        if (!$jobData || ($jobData['status'] ?? '') !== 'completed') {
            return response()->json([
                'status' => 'error',
                'message' => 'Berkas ekspor belum siap atau telah kedaluwarsa.',
            ], Response::HTTP_NOT_FOUND);
        }

        // Authorization check: only the initiating user or Superadmin may download the file
        $user = $request->user();
        if ($user && isset($jobData['user_id']) && $jobData['user_id'] !== $user->id && !$user->hasRole('Superadmin')) {
            return response()->json([
                'status' => 'error',
                'message' => 'Anda tidak memiliki hak akses untuk mengunduh berkas ekspor ini.',
            ], Response::HTTP_FORBIDDEN);
        }

        $filePath = storage_path("app/exports/{$jobId}.xlsx");

        if (!file_exists($filePath)) {
            return response()->json([
                'status' => 'error',
                'message' => 'Berkas fisik pada server tidak ditemukan.',
            ], Response::HTTP_NOT_FOUND);
        }

        $downloadFilename = $jobData['filename'] ?? "Export_Data_{$jobId}.xlsx";

        return response()->download($filePath, $downloadFilename, [
            'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Cache-Control' => 'no-cache, must-revalidate',
        ]);
    }
}
