<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\User\StoreUserAccountRequest;
use App\Http\Requests\User\UpdateUserAccountRequest;
use App\Http\Resources\UserResource;
use App\Models\User;
use App\Services\Export\ExcelExportService;
use App\Services\User\UserService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Symfony\Component\HttpFoundation\StreamedResponse;

class UserAccountController extends Controller
{
    public function __construct(
        protected UserService $userService
    ) {}

    /**
     * Display a listing of active/inactive user accounts.
     */
    public function index(Request $request): AnonymousResourceCollection
    {
        if (!$request->user()->can('users.view')) {
            abort(403, 'Anda tidak memiliki hak akses untuk melihat data akun pengguna.');
        }

        $filters = $request->only(['search', 'role', 'status', 'sort_by', 'sort_direction', 'opd_id']);
        $perPage = (int) $request->input('per_page', 10);
        if ($perPage < 1 || $perPage > 500) {
            $perPage = 10;
        }

        $users = $this->userService->getUsers($filters, $perPage, $request->user());

        return UserResource::collection($users);
    }

    /**
     * Export user accounts to Excel (.xlsx).
     */
    public function export(Request $request, ExcelExportService $exportService): StreamedResponse
    {
        if (!$request->user()->can('users.view')) {
            abort(403, 'Anda tidak memiliki hak akses untuk mengekspor data akun pengguna.');
        }

        $user = $request->user();
        $filters = $request->only(['search', 'role', 'status', 'opd_id']);

        $query = User::with(['roles', 'opd'])->whereNotNull('password');

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
                    ->orWhere('jabatan', 'like', "%{$term}%");
            });
        }

        if (!empty($filters['opd_id'])) {
            $query->where('opd_id', $filters['opd_id']);
        }

        if (!empty($filters['role'])) {
            $roleName = (string) $filters['role'];
            $query->whereHas('roles', function ($q) use ($roleName) {
                $q->where('name', $roleName);
            });
        }

        if (!empty($filters['status'])) {
            $query->where('status', (string) $filters['status']);
        }

        $query->orderBy('name', 'asc');

        $headers = [
            'No',
            'Nama Lengkap Pegawai',
            'NIP',
            'Jabatan',
            'Perangkat Daerah (OPD)',
            'Email Login',
            'Peran (Role)',
            'Status Akun',
            'Keamanan 2FA',
            'Login Terakhir',
        ];

        $generator = function () use ($query) {
            $no = 1;
            foreach ($query->lazy(500) as $usr) {
                $statusLabel = match ($usr->status) {
                    'active' => 'Aktif',
                    'inactive' => 'Nonaktif',
                    default => ucfirst((string) $usr->status),
                };

                $twoFactorLabel = $usr->hasTwoFactorEnabled() ? 'Aktif' : 'Tidak Aktif';
                $opdNama = $usr->opd?->nama ?? '-';
                $roleNama = $usr->roles->first()?->name ?? $usr->role ?? '-';

                yield [
                    $no++,
                    $usr->name,
                    $usr->nip ?? '-',
                    $usr->jabatan ?? 'Pegawai',
                    $opdNama,
                    $usr->email,
                    $roleNama,
                    $statusLabel,
                    $twoFactorLabel,
                    $usr->last_login_at ? $usr->last_login_at->format('d/m/Y H:i') : '-',
                ];
            }
        };

        $metadata = [];
        if (!empty($filters['search'])) {
            $metadata['Kata Kunci Pencarian'] = $filters['search'];
        }
        if (!empty($filters['status'])) {
            $metadata['Filter Status'] = $filters['status'];
        }

        return $exportService->streamExport(
            filename: 'Data_Akun_Users_PEMDA',
            title: 'LAPORAN DATA AKUN PENGGUNA (MANAJEMEN USERS)',
            headers: $headers,
            rows: $generator(),
            metadata: $metadata
        );
    }

    /**
     * Assign a new user account to an existing Pegawai or create direct leader/executive account.
     */
    public function store(StoreUserAccountRequest $request): JsonResponse
    {
        $validated = $request->validated();
        $accountType = $validated['account_type'] ?? (!empty($validated['pegawai_id']) ? 'pegawai' : 'direct');

        if ($accountType === 'pegawai' && !empty($validated['pegawai_id'])) {
            $user = $this->userService->assignUserAccount($validated, $request->user());
        } else {
            $user = $this->userService->createDirectUserAccount($validated, $request->user());
        }

        return (new UserResource($user))
            ->response()
            ->setStatusCode(201);
    }

    /**
     * Update an existing user account's role, password, and status.
     */
    public function update(UpdateUserAccountRequest $request, User $user): UserResource
    {
        $updatedUser = $this->userService->updateUserAccount(
            $user,
            $request->validated(),
            $request->user()
        );

        return new UserResource($updatedUser);
    }

    /**
     * Revoke user login account while keeping Pegawai biodata intact.
     */
    public function destroy(Request $request, User $user): JsonResponse
    {
        if (!$request->user()->can('users.delete')) {
            abort(403, 'Anda tidak memiliki hak akses untuk mencabut akun pengguna.');
        }

        $this->userService->revokeUserAccount($user, $request->user());

        return response()->json([
            'message' => 'Akun login pengguna berhasil dicabut (data kepegawaian tetap tersimpan).',
        ]);
    }

    /**
     * Reset 2FA authentication for a user account.
     */
    public function resetTwoFactor(Request $request, User $user): JsonResponse
    {
        if (!$request->user()->can('users.reset_2fa')) {
            abort(403, 'Anda tidak memiliki hak akses untuk mereset 2FA pengguna.');
        }

        $this->userService->resetTwoFactor($user, $request->user());

        return response()->json([
            'message' => 'Autentikasi dua faktor (2FA) untuk akun pengguna berhasil direset.',
        ]);
    }
}
