<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\User\InviteUserRequest;
use App\Http\Requests\User\StoreUserRequest;
use App\Http\Requests\User\UpdateUserRequest;
use App\Http\Resources\UserResource;
use App\Models\User;
use App\Services\Export\ExcelExportService;
use App\Services\User\UserService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Symfony\Component\HttpFoundation\StreamedResponse;

class UserController extends Controller
{
    public function __construct(
        protected UserService $userService
    ) {}

    /**
     * Display a listing of users.
     */
    public function index(Request $request): AnonymousResourceCollection
    {
        if (!$request->user()->can('users.view')) {
            abort(403, 'Anda tidak memiliki hak akses untuk melihat data pengguna.');
        }

        $filters = $request->only(['search', 'role', 'status', 'sort_by', 'sort_direction', 'opd_id']);
        $perPage = (int) $request->input('per_page', 10);
        if ($perPage < 1 || $perPage > 100) {
            $perPage = 10;
        }

        $users = $this->userService->getUsers($filters, $perPage, $request->user());

        return UserResource::collection($users);
    }

    /**
     * Export users data to Excel (.xlsx) with high performance streaming.
     */
    public function export(Request $request, ExcelExportService $exportService): StreamedResponse
    {
        if (!$request->user()->can('users.view')) {
            abort(403, 'Anda tidak memiliki hak akses untuk mengekspor data pegawai.');
        }

        $user = $request->user();
        $filters = $request->only(['search', 'role', 'status', 'opd_id']);

        $query = User::with(['roles', 'opd']);

        if (!$user->hasRole('Superadmin')) {
            $query->whereDoesntHave('roles', function ($q) {
                $q->where('name', 'Superadmin');
            })->where('role', '!=', 'Superadmin');
        }

        if (!empty($filters['search'])) {
            $term = trim((string) $filters['search']);
            $query->where(function ($q) use ($term) {
                $q->where('name', 'like', "%{$term}%")
                    ->orWhere('email', 'like', "%{$term}%")
                    ->orWhere('nip', 'like', "%{$term}%")
                    ->orWhere('jabatan', 'like', "%{$term}%")
                    ->orWhere('pangkat_gol', 'like', "%{$term}%");
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
            'Email Resmi',
            'NIP',
            'Jabatan / Posisi',
            'Golongan / Pangkat',
            'Perangkat Daerah (OPD)',
            'Peran (Role)',
            'Status Akun',
            'Keamanan 2FA',
            'Tanggal Terdaftar',
        ];

        $generator = function () use ($query) {
            $no = 1;
            foreach ($query->lazy(500) as $usr) {
                $statusLabel = match ($usr->status) {
                    'active' => 'Aktif',
                    'pending_activation' => 'Menunggu Aktivasi',
                    'inactive' => 'Nonaktif',
                    default => ucfirst((string) $usr->status),
                };

                $twoFactorLabel = $usr->two_factor_enabled ? 'Aktif' : 'Tidak Aktif';
                $opdNama = $usr->opd?->nama ?? '-';
                $roleNama = $usr->roles->first()?->name ?? $usr->role ?? '-';

                yield [
                    $no++,
                    $usr->name,
                    $usr->email,
                    $usr->nip ?? '-',
                    $usr->jabatan ?? '-',
                    $usr->pangkat_gol ?? '-',
                    $opdNama,
                    $roleNama,
                    $statusLabel,
                    $twoFactorLabel,
                    $usr->created_at ? $usr->created_at->format('d/m/Y H:i') : '-',
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
            filename: 'Data_Pegawai_PEMDA',
            title: 'LAPORAN DATA MANAJEMEN PEGAWAI & PENGGUNA',
            headers: $headers,
            rows: $generator(),
            metadata: $metadata
        );
    }

    /**
     * Store a newly created user in storage.
     */
    public function store(StoreUserRequest $request): JsonResponse
    {
        $user = $this->userService->createUser($request->validated(), $request->user());

        return (new UserResource($user))
            ->response()
            ->setStatusCode(201);
    }

    /**
     * Display the specified user.
     */
    public function show(Request $request, string $id): UserResource
    {
        if (!$request->user()->can('users.view')) {
            abort(403, 'Anda tidak memiliki hak akses untuk melihat data pengguna.');
        }

        $user = $this->userService->getUserById($id, $request->user());

        return new UserResource($user);
    }

    /**
     * Update the specified user in storage.
     */
    public function update(UpdateUserRequest $request, User $user): UserResource
    {
        $updatedUser = $this->userService->updateUser(
            $user,
            $request->validated(),
            $request->user()
        );

        return new UserResource($updatedUser);
    }

    /**
     * Remove the specified user from storage.
     */
    public function destroy(Request $request, User $user): JsonResponse
    {
        if (!$request->user()->can('users.delete')) {
            abort(403, 'Anda tidak memiliki hak akses untuk menghapus pengguna.');
        }

        $this->userService->deleteUser($user, $request->user());

        return response()->json([
            'message' => 'Akun pegawai berhasil dihapus dari sistem.',
        ]);
    }

    /**
     * Reset 2FA authentication for a user.
     */
    public function resetTwoFactor(Request $request, User $user): JsonResponse
    {
        if (!$request->user()->can('users.reset_2fa')) {
            abort(403, 'Anda tidak memiliki hak akses untuk mereset 2FA pengguna.');
        }

        $this->userService->resetTwoFactor($user, $request->user());

        return response()->json([
            'message' => 'Autentikasi dua faktor (2FA) untuk pegawai berhasil direset.',
        ]);
    }

    /**
     * Invite a new user by sending an activation email.
     */
    public function invite(InviteUserRequest $request): JsonResponse
    {
        $result = $this->userService->inviteUser($request->validated(), $request->user());

        return response()->json([
            'message' => 'Undangan aktivasi akun berhasil dikirim ke email pegawai.',
            'user' => new UserResource($result['user']),
            'activation_url' => $result['activation_url'],
        ], 201);
    }

    /**
     * Resend an activation invitation email.
     */
    public function resendInvitation(Request $request, User $user): JsonResponse
    {
        if (!$request->user()->can('users.create') && !$request->user()->can('users.edit')) {
            abort(403, 'Anda tidak memiliki hak akses untuk mengirim ulang undangan.');
        }

        $result = $this->userService->resendInvitation($user, $request->user());

        return response()->json([
            'message' => 'Undangan aktivasi akun berhasil dikirim ulang ke email pegawai.',
            'user' => new UserResource($result['user']),
            'activation_url' => $result['activation_url'],
        ]);
    }
}
