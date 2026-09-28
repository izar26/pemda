<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\ActivateUserRequest;
use App\Http\Requests\Auth\ConfirmTwoFactorRequest;
use App\Http\Requests\Auth\DisableTwoFactorRequest;
use App\Http\Requests\Auth\ForgotPasswordRequest;
use App\Http\Requests\Auth\LoginRequest;
use App\Http\Requests\Auth\ResetPasswordRequest;
use App\Http\Requests\Auth\UpdateProfileRequest;
use App\Http\Requests\Auth\VerifyTwoFactorRequest;
use App\Http\Resources\OpdResource;
use App\Http\Resources\UserResource;
use App\Models\User;
use App\Services\Auth\AuthenticationService;
use App\Services\Auth\PasswordResetService;
use App\Services\Auth\TwoFactorService;
use App\Services\User\UserService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

class AuthController extends Controller
{
    public function __construct(
        protected AuthenticationService $authService,
        protected TwoFactorService $twoFactorService,
        protected PasswordResetService $passwordResetService,
        protected UserService $userService
    ) {}

    /**
     * Handle primary login (Step 1).
     */
    public function login(LoginRequest $request): JsonResponse
    {
        $ip = $request->ip() ?? '127.0.0.1';
        $userAgent = $request->header('User-Agent');

        $result = $this->authService->attempt(
            identifier: $request->validated('identifier'),
            password: $request->validated('password'),
            ip: $ip,
            userAgent: $userAgent
        );

        if ($result['requires_2fa']) {
            return response()->json([
                'requires_2fa' => true,
                'temp_token' => $result['temp_token'],
                'expires_in' => $result['expires_in'],
                'message' => $result['message'],
            ]);
        }

        return response()->json([
            'requires_2fa' => false,
            'token' => $result['token'],
            'token_type' => 'Bearer',
            'expires_in' => $result['expires_in'],
            'user' => new UserResource($result['user']),
            'message' => $result['message'],
        ]);
    }

    /**
     * Handle 2FA verification (Step 2).
     */
    public function verifyTwoFactor(VerifyTwoFactorRequest $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();
        $ip = $request->ip() ?? '127.0.0.1';
        $userAgent = $request->header('User-Agent');

        $result = $this->authService->verifyTwoFactor(
            user: $user,
            code: $request->validated('code'),
            ip: $ip,
            userAgent: $userAgent
        );

        return response()->json([
            'token' => $result['token'],
            'token_type' => 'Bearer',
            'expires_in' => $result['expires_in'],
            'used_backup_code' => $result['used_backup'],
            'user' => new UserResource($result['user']),
            'message' => $result['message'],
        ]);
    }

    /**
     * Generate 2FA Secret, QR Code SVG, and Backup Codes.
     */
    public function setupTwoFactor(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        $setupData = $this->twoFactorService->generateSetup($user);

        return response()->json([
            'secret' => $setupData['secret'],
            'qr_code_svg' => $setupData['qr_code_svg'],
            'message' => 'Pindai kode QR dengan Google Authenticator, lalu masukkan 6-digit kode untuk mengaktifkan.',
        ]);
    }

    /**
     * Confirm and activate 2FA for the account.
     */
    public function confirmTwoFactor(ConfirmTwoFactorRequest $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        $recoveryCodes = $this->twoFactorService->confirm($user, $request->validated('code'));

        if ($recoveryCodes === null) {
            return response()->json([
                'message' => 'Kode verifikasi tidak valid. Pastikan waktu jam pada ponsel Anda tersinkronisasi.',
            ], 422);
        }

        return response()->json([
            'message' => 'Google Authenticator berhasil diaktifkan untuk akun Anda.',
            'two_factor_enabled' => true,
            'recovery_codes' => $recoveryCodes,
        ]);
    }

    /**
     * Disable 2FA for the account (requires current password).
     */
    public function disableTwoFactor(DisableTwoFactorRequest $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        if (!Hash::check($request->validated('current_password'), $user->password)) {
            return response()->json([
                'message' => 'Kata sandi saat ini yang Anda masukkan salah.',
            ], 422);
        }

        $this->twoFactorService->disable($user);

        return response()->json([
            'message' => 'Google Authenticator berhasil dinonaktifkan.',
            'two_factor_enabled' => false,
        ]);
    }

    /**
     * Get remaining 2FA recovery codes.
     */
    public function getRecoveryCodes(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        if (!$user->hasTwoFactorEnabled()) {
            return response()->json([
                'message' => 'Autentikasi dua faktor belum diaktifkan.',
            ], 400);
        }

        return response()->json([
            'recovery_codes' => $user->two_factor_recovery_codes ?? [],
        ]);
    }

    /**
     * Regenerate 8 new recovery codes.
     */
    public function regenerateRecoveryCodes(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        if (!$user->hasTwoFactorEnabled()) {
            return response()->json([
                'message' => 'Autentikasi dua faktor belum diaktifkan.',
            ], 400);
        }

        $codes = [];
        for ($i = 0; $i < 8; $i++) {
            $codes[] = strtoupper(\Illuminate\Support\Str::random(4)) . '-' . strtoupper(\Illuminate\Support\Str::random(4));
        }

        $user->update([
            'two_factor_recovery_codes' => $codes,
        ]);

        return response()->json([
            'message' => 'Kode pemulihan darurat baru berhasil dibuat.',
            'recovery_codes' => $codes,
        ]);
    }

    /**
     * Get authenticated user profile.
     */
    public function me(Request $request): JsonResponse
    {
        return response()->json([
            'user' => new UserResource($request->user()),
        ]);
    }

    /**
     * Logout current session.
     */
    public function logout(Request $request): JsonResponse
    {
        $request->user()->currentAccessToken()?->delete();

        return response()->json([
            'message' => 'Anda telah berhasil keluar dari sistem.',
        ]);
    }

    /**
     * Logout all active sessions across all devices.
     */
    public function logoutAll(Request $request): JsonResponse
    {
        $request->user()->tokens()->delete();

        return response()->json([
            'message' => 'Semua sesi aktif di seluruh perangkat telah dihentikan.',
        ]);
    }

    /**
     * Request password reset link (anti-enumeration, rate-limited).
     */
    public function forgotPassword(ForgotPasswordRequest $request): JsonResponse
    {
        $ip = $request->ip() ?? '127.0.0.1';
        $userAgent = $request->header('User-Agent');

        $result = $this->passwordResetService->sendResetLink(
            email: $request->validated('email'),
            ip: $ip,
            userAgent: $userAgent
        );

        return response()->json($result);
    }

    /**
     * Reset password using token and revoke active sessions.
     */
    public function resetPassword(ResetPasswordRequest $request): JsonResponse
    {
        $ip = $request->ip() ?? '127.0.0.1';
        $userAgent = $request->header('User-Agent');

        $result = $this->passwordResetService->resetPassword(
            email: $request->validated('email'),
            token: $request->validated('token'),
            newPassword: $request->validated('password'),
            ip: $ip,
            userAgent: $userAgent
        );

        return response()->json($result);
    }

    /**
     * Validate an activation token.
     */
    public function validateActivationToken(Request $request): JsonResponse
    {
        $token = (string) $request->query('token', '');
        $user = $this->userService->validateActivationToken($token);

        return response()->json([
            'message' => 'Token aktivasi valid.',
            'data' => [
                'name' => $user->name,
                'email' => $user->email,
                'role' => $user->roles->first()?->name ?? $user->role,
                'nip' => $user->nip,
                'phone' => $user->phone,
                'opd_id' => $user->opd_id,
                'opd' => $user->opd ? new OpdResource($user->opd) : null,
                'pangkat_gol' => $user->pangkat_gol,
                'jabatan' => $user->jabatan,
            ],
        ]);
    }

    /**
     * Activate user account and set password.
     */
    public function activate(ActivateUserRequest $request): JsonResponse
    {
        $user = $this->userService->activateUser(
            $request->validated('token'),
            $request->validated()
        );

        return response()->json([
            'message' => 'Akun pegawai berhasil diaktifkan. Silakan masuk menggunakan kata sandi yang baru dibuat.',
            'user' => new UserResource($user),
        ]);
    }

    /**
     * Update current authenticated user's own profile.
     */
    public function updateProfile(UpdateProfileRequest $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        $updated = $this->userService->updateProfile($user, $request->validated());

        return response()->json([
            'message' => 'Profil pegawai berhasil diperbarui.',
            'user' => new UserResource($updated),
        ]);
    }
}
