<?php

declare(strict_types=1);

namespace App\Services\Auth;

use App\Enums\LoginLogStatus;
use App\Mail\PasswordChangedMail;
use App\Mail\ResetPasswordMail;
use App\Models\LoginLog;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class PasswordResetService
{
    /**
     * Standard dummy hash to mitigate timing attacks when user does not exist.
     */
    private const DUMMY_HASH = '$2y$12$n1n1kIzSEi/5.Ava.8VK7OvqN58Kk8JpwORujaWgECv0wTQUbsA8e';

    /**
     * Lifetime of reset token in minutes.
     */
    public const TOKEN_EXPIRY_MINUTES = 30;

    /**
     * Request a password reset link (Anti-Enumeration, Timing-Safe, Rate-Limited).
     *
     * @return array{message: string}
     *
     * @throws ValidationException
     */
    public function sendResetLink(string $email, string $ip, ?string $userAgent): array
    {
        $cleanEmail = strtolower(trim($email));

        // 1. Rate Limiting: IP-based max 5 attempts per minute
        $ipThrottleKey = 'forgot_pwd_ip:' . $ip;
        $ipAttempts = (int) Cache::get($ipThrottleKey, 0);
        if ($ipAttempts >= 5) {
            throw ValidationException::withMessages([
                'email' => ['Terlalu banyak permintaan reset kata sandi dari IP ini. Silakan coba lagi dalam beberapa menit.'],
            ]);
        }
        Cache::put($ipThrottleKey, $ipAttempts + 1, 60);

        // 2. Cooldown per email (1 request every 2 minutes)
        $cooldownKey = 'forgot_pwd_cooldown:' . md5($cleanEmail);
        if (Cache::has($cooldownKey)) {
            // Still return generic message to avoid enumeration, but don't re-send spam
            return [
                'message' => 'Jika alamat email terdaftar di sistem kami, tautan pengaturan ulang kata sandi telah dikirimkan. Silakan periksa kotak masuk atau folder spam Anda.',
            ];
        }

        // 3. User lookup
        $user = User::where('email', $cleanEmail)->first();

        if (!$user || !$user->isActive()) {
            // Mitigate timing attack: simulate bcrypt hash evaluation
            Hash::check('dummy-password-check-timing', self::DUMMY_HASH);

            // Return generic message
            return [
                'message' => 'Jika alamat email terdaftar di sistem kami, tautan pengaturan ulang kata sandi telah dikirimkan. Silakan periksa kotak masuk atau folder spam Anda.',
            ];
        }

        // Set cooldown for 2 minutes
        Cache::put($cooldownKey, true, 120);

        // 4. Generate cryptographically secure token & SHA-256 hash for storage
        $rawToken = Str::random(64);
        $hashedToken = hash('sha256', $rawToken);

        DB::table('password_reset_tokens')->updateOrInsert(
            ['email' => $user->email],
            [
                'token' => $hashedToken,
                'created_at' => now(),
            ]
        );

        // 5. Send Reset Password Email
        Mail::to($user->email)->send(
            new ResetPasswordMail(
                user: $user,
                token: $rawToken,
                ipAddress: $ip,
                expiresInMinutes: self::TOKEN_EXPIRY_MINUTES
            )
        );

        // 6. Security Audit Log
        LoginLog::create([
            'user_id' => $user->id,
            'identifier' => $user->email,
            'ip_address' => $ip,
            'user_agent' => $userAgent,
            'status' => LoginLogStatus::PASSWORD_RESET_REQUESTED->value,
            'details' => 'Permintaan tautan atur ulang kata sandi melalui email.',
        ]);

        return [
            'message' => 'Jika alamat email terdaftar di sistem kami, tautan pengaturan ulang kata sandi telah dikirimkan. Silakan periksa kotak masuk atau folder spam Anda.',
        ];
    }

    /**
     * Reset password using token, revoke all sessions, and alert user.
     *
     * @return array{message: string}
     *
     * @throws ValidationException
     */
    public function resetPassword(
        string $email,
        string $token,
        string $newPassword,
        string $ip,
        ?string $userAgent
    ): array {
        $cleanEmail = strtolower(trim($email));

        // 1. Fetch token record
        $record = DB::table('password_reset_tokens')->where('email', $cleanEmail)->first();
        if (!$record) {
            throw ValidationException::withMessages([
                'token' => ['Tautan pengaturan ulang kata sandi tidak valid atau telah digunakan.'],
            ]);
        }

        // 2. Validate token hash (timing-safe comparison)
        $hashedInputToken = hash('sha256', trim($token));
        if (!hash_equals($record->token, $hashedInputToken)) {
            throw ValidationException::withMessages([
                'token' => ['Tautan pengaturan ulang kata sandi tidak valid.'],
            ]);
        }

        // 3. Validate expiration
        $createdAt = Carbon::parse($record->created_at);
        if ($createdAt->addMinutes(self::TOKEN_EXPIRY_MINUTES)->isPast()) {
            DB::table('password_reset_tokens')->where('email', $cleanEmail)->delete();

            throw ValidationException::withMessages([
                'token' => ['Tautan pengaturan ulang kata sandi telah kedaluwarsa. Silakan ajukan permohonan baru.'],
            ]);
        }

        // 4. Retrieve user
        $user = User::where('email', $cleanEmail)->first();
        if (!$user || !$user->isActive()) {
            throw ValidationException::withMessages([
                'email' => ['Pengguna tidak ditemukan atau akun sedang dinonaktifkan.'],
            ]);
        }

        // 5. Update password & unlock account if previously locked out
        $user->update([
            'password' => Hash::make($newPassword),
            'failed_login_attempts' => 0,
            'lockout_until' => null,
        ]);

        // 6. Delete used reset token immediately (single-use)
        DB::table('password_reset_tokens')->where('email', $cleanEmail)->delete();

        // 7. Security Hardening: Revoke all existing Sanctum sessions
        $user->tokens()->delete();

        // 8. Log audit trail
        LoginLog::create([
            'user_id' => $user->id,
            'identifier' => $user->email,
            'ip_address' => $ip,
            'user_agent' => $userAgent,
            'status' => LoginLogStatus::PASSWORD_RESET_SUCCESS->value,
            'details' => 'Kata sandi berhasil diperbarui via token email. Seluruh sesi aktif dicabut.',
        ]);

        // 9. Send confirmation email
        Mail::to($user->email)->send(
            new PasswordChangedMail(
                user: $user,
                ipAddress: $ip
            )
        );

        return [
            'message' => 'Kata sandi berhasil diperbarui. Silakan masuk dengan kata sandi baru Anda.',
        ];
    }
}
