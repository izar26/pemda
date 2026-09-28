<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\User\InviteUserRequest;
use App\Http\Requests\User\StoreUserRequest;
use App\Http\Requests\User\UpdateUserRequest;
use App\Http\Resources\UserResource;
use App\Models\User;
use App\Services\User\UserService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

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

        $filters = $request->only(['search', 'role', 'status', 'sort_by', 'sort_direction']);
        $perPage = (int) $request->input('per_page', 10);
        if ($perPage < 1 || $perPage > 100) {
            $perPage = 10;
        }

        $users = $this->userService->getUsers($filters, $perPage);

        return UserResource::collection($users);
    }

    /**
     * Store a newly created user in storage.
     */
    public function store(StoreUserRequest $request): JsonResponse
    {
        $user = $this->userService->createUser($request->validated());

        return (new UserResource($user))
            ->response()
            ->setStatusCode(201);
    }

    /**
     * Display the specified user.
     */
    public function show(Request $request, int $id): UserResource
    {
        if (!$request->user()->can('users.view')) {
            abort(403, 'Anda tidak memiliki hak akses untuk melihat data pengguna.');
        }

        $user = $this->userService->getUserById($id);

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

        $this->userService->resetTwoFactor($user);

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
