<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Pegawai\StorePegawaiRequest;
use App\Http\Requests\Pegawai\UpdatePegawaiRequest;
use App\Http\Resources\UserResource;
use App\Models\User;
use App\Services\Export\ExcelExportService;
use App\Services\Pegawai\PegawaiService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Symfony\Component\HttpFoundation\StreamedResponse;

class PegawaiController extends Controller
{
    public function __construct(
        protected PegawaiService $pegawaiService
    ) {}

    /**
     * Display a listing of employees (Pegawai).
     */
    public function index(Request $request): AnonymousResourceCollection
    {
        $user = $request->user();
        if (!$user->can('pegawai.view') && !$user->can('users.view') && !$user->can('users.create')) {
            abort(403, 'Anda tidak memiliki hak akses untuk melihat data pegawai.');
        }

        $filters = $request->only(['search', 'opd_id', 'jabatan', 'has_account', 'sort_by', 'sort_direction']);
        $perPage = (int) $request->input('per_page', 10);
        if ($perPage < 1 || $perPage > 500) {
            $perPage = 10;
        }

        $pegawai = $this->pegawaiService->getPegawai($filters, $perPage, $user);

        return UserResource::collection($pegawai);
    }

    /**
     * Check current Kepala OPD for a given OPD ID.
     */
    public function checkKepalaOpd(Request $request, string $opdId): JsonResponse
    {
        $user = $request->user();
        if (!$user->can('pegawai.view') && !$user->can('pegawai.create') && !$user->can('pegawai.edit')) {
            abort(403, 'Anda tidak memiliki hak akses.');
        }

        $excludeId = $request->query('exclude_id') ? (string) $request->query('exclude_id') : null;
        $kepala = $this->pegawaiService->getKepalaOpd($opdId, $excludeId);

        return response()->json([
            'has_kepala' => $kepala !== null,
            'kepala' => $kepala ? new UserResource($kepala->load('opd')) : null,
        ]);
    }

    /**
     * Export Pegawai directory to Excel (.xlsx).
     */
    public function export(Request $request, ExcelExportService $exportService): StreamedResponse
    {
        $user = $request->user();
        if (!$user->can('pegawai.view')) {
            abort(403, 'Anda tidak memiliki hak akses untuk mengekspor data pegawai.');
        }

        $filters = $request->only(['search', 'opd_id', 'jabatan']);

        if ($user && $user->hasRole('OPD') && !$user->hasRole(['Superadmin', 'Admin Office', 'Inspektorat'])) {
            $filters['opd_id'] = (string) $user->opd_id;
        }

        $query = User::with(['opd']);

        if (!$user->hasRole('Superadmin')) {
            $query->whereDoesntHave('roles', function ($q) {
                $q->where('name', 'Superadmin');
            })->where(function ($q) {
                $q->whereNull('role')->orWhere('role', '!=', 'Superadmin');
            });
        }

        if (!empty($filters['search'])) {
            $term = trim((string) $filters['search']);
            $query->where(function ($q) use ($term) {
                $q->where('name', 'like', "%{$term}%")
                    ->orWhere('email', 'like', "%{$term}%")
                    ->orWhere('nip', 'like', "%{$term}%")
                    ->orWhere('phone', 'like', "%{$term}%")
                    ->orWhere('jabatan', 'like', "%{$term}%")
                    ->orWhere('pangkat_gol', 'like', "%{$term}%");
            });
        }

        if (!empty($filters['opd_id'])) {
            $query->where('opd_id', $filters['opd_id']);
        }

        if (!empty($filters['jabatan'])) {
            $query->where('jabatan', (string) $filters['jabatan']);
        }

        $query->orderBy('name', 'asc');

        $headers = [
            'No',
            'Nama Lengkap Pegawai',
            'NIP',
            'Jabatan Kedinasan',
            'Golongan / Pangkat',
            'Perangkat Daerah (OPD)',
            'Email Resmi',
            'Nomor WhatsApp',
            'Tanggal Terdaftar',
        ];

        $generator = function () use ($query) {
            $no = 1;
            foreach ($query->lazy(500) as $emp) {
                yield [
                    $no++,
                    $emp->name,
                    $emp->nip ?? '-',
                    $emp->jabatan ?? 'Pegawai',
                    $emp->pangkat_gol ?? '-',
                    $emp->opd?->nama ?? '-',
                    $emp->email,
                    $emp->phone ?? '-',
                    $emp->created_at ? $emp->created_at->format('d/m/Y H:i') : '-',
                ];
            }
        };

        $metadata = [];
        if (!empty($filters['search'])) {
            $metadata['Kata Kunci Pencarian'] = $filters['search'];
        }
        if (!empty($filters['jabatan'])) {
            $metadata['Filter Jabatan'] = $filters['jabatan'];
        }

        return $exportService->streamExport(
            filename: 'Direktori_Pegawai_PEMDA',
            title: 'LAPORAN DIREKTORI DATA KEPEGAWAIAN (ASN) PEMERINTAH DAERAH',
            headers: $headers,
            rows: $generator(),
            metadata: $metadata
        );
    }

    /**
     * Store a newly created employee in storage.
     */
    public function store(StorePegawaiRequest $request): JsonResponse
    {
        $pegawai = $this->pegawaiService->createPegawai($request->validated(), $request->user());

        return (new UserResource($pegawai))
            ->response()
            ->setStatusCode(201);
    }

    /**
     * Display the specified employee.
     */
    public function show(Request $request, string $id): UserResource
    {
        if (!$request->user()->can('pegawai.view')) {
            abort(403, 'Anda tidak memiliki hak akses untuk melihat data pegawai.');
        }

        $pegawai = $this->pegawaiService->getPegawaiById($id, $request->user());

        return new UserResource($pegawai);
    }

    /**
     * Update the specified employee in storage.
     */
    public function update(UpdatePegawaiRequest $request, User $pegawai): UserResource
    {
        $updated = $this->pegawaiService->updatePegawai(
            $pegawai,
            $request->validated(),
            $request->user()
        );

        return new UserResource($updated);
    }

    /**
     * Remove the specified employee from storage.
     */
    public function destroy(Request $request, User $pegawai): JsonResponse
    {
        if (!$request->user()->can('pegawai.delete')) {
            abort(403, 'Anda tidak memiliki hak akses untuk menghapus data pegawai.');
        }

        $this->pegawaiService->deletePegawai($pegawai, $request->user());

        return response()->json([
            'message' => 'Data pegawai berhasil dihapus dari sistem.',
        ]);
    }
}
