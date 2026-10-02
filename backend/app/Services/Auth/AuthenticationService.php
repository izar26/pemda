<?php

declare(strict_types=1);

namespace App\Services\Auth;

use App\Enums\LoginLogStatus;
use App\Models\LoginLog;
use App\Models\User;
use App\Services\Audit\AuditLogService;
use Illuminate\Http\Exceptions\HttpResponseException;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Str;

class AuthenticationService
{
    public function __construct(
        protected TwoFactorService $twoFactorService,
        protected AuditLogService $auditLogService
    ) {}

    /**
     * Authenticate user credentials with brute-force and timing-attack defenses.
     *
     * @return array{requires_2fa: bool, token?: string, temp_token?: string, expires_in: int, user?: User, message: string}
     */
    public function attempt(string $identifier, string $password, string $ip, ?string $userAgent): array
    {
        $cleanIdentifier = trim($identifier);
        $throttleKey = 'login_attempt:' . Str::lower($cleanIdentifier) . '|' . $ip;

        // 1. Rate Limiting Check (Max 5 attempts / 60 seconds)
        if (RateLimiter::tooManyAttempts($throttleKey, 5)) {
            $seconds = RateLimiter::availableIn($throttleKey);
            $this->recordLog(null, $cleanIdentifier, $ip, $userAgent, LoginLogStatus::ACCOUNT_LOCKED, "Rate limited for {$seconds}s");

            throw new HttpResponseException(response()->json([
                'message' => "Terlalu banyak percobaan masuk. Silakan tunggu {$seconds} detik lagi sebelum mencoba kembali.",
                'retry_after' => $seconds,
            ], 429));
        }

        // 2. Query user by email or NIP
        $user = User::where('email', Str::lower($cleanIdentifier))
            ->orWhere('nip', $cleanIdentifier)
            ->first();

        // 3. Timing-attack Defense (Calculate dummy hash if user not found)
        if (!$user) {
            Hash::check($password, '$2y$12$e8F35Q4X1X1X1X1X1X1X1OuL6q2.4X1X1X1X1X1X1X1X1X1X1X1X1');
            RateLimiter::hit($throttleKey, 60);
            $this->recordLog(null, $cleanIdentifier, $ip, $userAgent, LoginLogStatus::FAILED_CREDENTIALS, 'User not found');

            throw new HttpResponseException(response()->json([
                'message' => 'Kredensial yang Anda masukkan tidak valid.',
            ], 422));
        }

        // 4. Temporary Lockout Check
        if ($user->isLockedOut()) {
            $remaining = now()->diffInSeconds($user->lockout_until);
            $this->recordLog($user->id, $cleanIdentifier, $ip, $userAgent, LoginLogStatus::ACCOUNT_LOCKED, 'Account currently locked', $user);

            throw new HttpResponseException(response()->json([
                'message' => "Akun Anda terkunci sementara karena beberapa kali kesalahan kata sandi. Silakan coba kembali dalam {$remaining} detik.",
                'retry_after' => $remaining,
            ], 423));
        }

        // 5. Password Verification
        if (!Hash::check($password, $user->password)) {
            RateLimiter::hit($throttleKey, 60);
            $user->increment('failed_login_attempts');

            if ($user->failed_login_attempts >= 5) {
                $user->update(['lockout_until' => now()->addMinutes(15)]);
                $this->recordLog($user->id, $cleanIdentifier, $ip, $userAgent, LoginLogStatus::ACCOUNT_LOCKED, '5 failed attempts, locked 15m', $user);

                throw new HttpResponseException(response()->json([
                    'message' => 'Akun Anda telah dikunci selama 15 menit karena 5 kali percobaan salah demi alasan keamanan.',
                ], 423));
            }

            $this->recordLog($user->id, $cleanIdentifier, $ip, $userAgent, LoginLogStatus::FAILED_CREDENTIALS, 'Incorrect password', $user);

            throw new HttpResponseException(response()->json([
                'message' => 'Kredensial yang Anda masukkan tidak valid.',
            ], 422));
        }

        // 6. Account Status Check
        if (!$user->isActive()) {
            $this->recordLog($user->id, $cleanIdentifier, $ip, $userAgent, LoginLogStatus::ACCOUNT_INACTIVE, "User status is {$user->status}", $user);

            throw new HttpResponseException(response()->json([
                'message' => 'Akun Anda tidak aktif atau sedang ditangguhkan. Silakan hubungi Administrator OPD.',
            ], 403));
        }

        // 7. Reset Counters on Successful Credential Match
        RateLimiter::clear($throttleKey);
        $user->update([
            'failed_login_attempts' => 0,
            'lockout_until' => null,
        ]);

        // 8. Handle 2FA Challenge if enabled
        if ($user->hasTwoFactorEnabled()) {
            $tempToken = $user->createToken(
                '2fa-pending',
                ['2fa:verify'],
                now()->addMinutes(5)
            )->plainTextToken;

            $this->recordLog($user->id, $cleanIdentifier, $ip, $userAgent, LoginLogStatus::CHALLENGE_2FA, '2FA challenge initiated', $user);

            return [
                'requires_2fa' => true,
                'temp_token' => $tempToken,
                'expires_in' => 300,
                'message' => 'Masukkan kode 6-digit dari aplikasi Google Authenticator Anda.',
            ];
        }

        // 9. Finalize Direct Login (without 2FA)
        $user->update([
            'last_login_at' => now(),
            'last_login_ip' => $ip,
        ]);

        $expirationMinutes = (int) config('sanctum.expiration', 480);
        $fullToken = $user->createToken(
            'auth-token',
            ['*'],
            now()->addMinutes($expirationMinutes)
        )->plainTextToken;

        $this->recordLog($user->id, $cleanIdentifier, $ip, $userAgent, LoginLogStatus::SUCCESS, 'Authenticated without 2FA', $user);

        return [
            'requires_2fa' => false,
            'token' => $fullToken,
            'expires_in' => $expirationMinutes * 60,
            'user' => $user,
            'message' => "Selamat datang kembali, {$user->name}!",
        ];
    }

    /**
     * Complete 2FA challenge and issue full session token.
     *
     * @return array{token: string, expires_in: int, user: User, used_backup: bool, message: string}
     */
    public function verifyTwoFactor(User $user, string $code, string $ip, ?string $userAgent): array
    {
        $throttleKey = '2fa_verify:' . $user->id . '|' . $ip;

        if (RateLimiter::tooManyAttempts($throttleKey, 5)) {
            $seconds = RateLimiter::availableIn($throttleKey);
            $this->recordLog($user->id, $user->email, $ip, $userAgent, LoginLogStatus::FAILED_2FA, '2FA rate limit exceeded', $user);

            throw new HttpResponseException(response()->json([
                'message' => "Terlalu banyak percobaan kode 2FA. Silakan coba {$seconds} detik lagi.",
                'retry_after' => $seconds,
            ], 429));
        }

        $result = $this->twoFactorService->verify($user, $code);

        if (!$result['valid']) {
            RateLimiter::hit($throttleKey, 60);
            $this->recordLog($user->id, $user->email, $ip, $userAgent, LoginLogStatus::FAILED_2FA, $result['reason'] ?? 'Invalid code', $user);

            throw new HttpResponseException(response()->json([
                'message' => $result['reason'] ?? 'Kode autentikasi atau kode cadangan tidak valid.',
            ], 422));
        }

        RateLimiter::clear($throttleKey);

        // Delete the temporary 2fa token
        $user->currentAccessToken()?->delete();

        // Update login stats
        $user->update([
            'last_login_at' => now(),
            'last_login_ip' => $ip,
            'failed_login_attempts' => 0,
            'lockout_until' => null,
        ]);

        $expirationMinutes = (int) config('sanctum.expiration', 480);
        $fullToken = $user->createToken(
            'auth-token',
            ['*'],
            now()->addMinutes($expirationMinutes)
        )->plainTextToken;

        $this->recordLog(
            $user->id,
            $user->email,
            $ip,
            $userAgent,
            LoginLogStatus::SUCCESS,
            $result['used_backup'] ? 'Authenticated with 2FA Backup Code' : 'Authenticated with Google Authenticator TOTP',
            $user
        );

        return [
            'token' => $fullToken,
            'expires_in' => $expirationMinutes * 60,
            'user' => $user,
            'used_backup' => $result['used_backup'],
            'message' => "Verifikasi 2FA berhasil. Selamat datang kembali, {$user->name}!",
        ];
    }

    /**
     * Record an audit log entry to both login_logs and audit_logs.
     */
    protected function recordLog(
        ?int $userId,
        string $identifier,
        string $ip,
        ?string $userAgent,
        LoginLogStatus $status,
        ?string $details,
        ?User $user = null
    ): void {
        LoginLog::create([
            'user_id' => $userId,
            'identifier' => $identifier,
            'ip_address' => $ip,
            'user_agent' => $userAgent,
            'status' => $status->value,
            'details' => $details,
            'created_at' => now(),
        ]);

        $resolvedUser = $user ?? ($userId ? User::find($userId) : null);

        $action = match ($status) {
            LoginLogStatus::SUCCESS => 'AUTH_LOGIN_SUCCESS',
            LoginLogStatus::FAILED_CREDENTIALS => 'AUTH_LOGIN_FAILED',
            LoginLogStatus::ACCOUNT_LOCKED => 'AUTH_ACCOUNT_LOCKED',
            LoginLogStatus::ACCOUNT_INACTIVE => 'AUTH_LOGIN_BLOCKED',
            LoginLogStatus::CHALLENGE_2FA => 'AUTH_2FA_CHALLENGE',
            LoginLogStatus::FAILED_2FA => 'AUTH_2FA_FAILED',
            default => 'AUTH_' . $status->value,
        };

        $description = match ($status) {
            LoginLogStatus::SUCCESS => "Pegawai " . ($resolvedUser?->name ?? $identifier) . " berhasil masuk ke sistem",
            LoginLogStatus::FAILED_CREDENTIALS => "Percobaan masuk gagal untuk '{$identifier}': Kredensial tidak valid",
            LoginLogStatus::ACCOUNT_LOCKED => "Akun '{$identifier}' terkunci sementara karena beberapa kali kesalahan kata sandi",
            LoginLogStatus::ACCOUNT_INACTIVE => "Percobaan masuk ditolak: Akun '{$identifier}' sedang nonaktif/ditangguhkan",
            LoginLogStatus::CHALLENGE_2FA => "Tantangan 2FA Google Authenticator dimulai untuk " . ($resolvedUser?->name ?? $identifier),
            LoginLogStatus::FAILED_2FA => "Kode autentikasi 2FA salah untuk " . ($resolvedUser?->name ?? $identifier),
            default => "Aktivitas autentikasi: {$status->value}",
        };

        // Don't flood audit_logs with temporary 2FA challenge tokens, but record all successes and failures
        if ($status !== LoginLogStatus::CHALLENGE_2FA) {
            $this->auditLogService->log(
                action: $action,
                module: 'Autentikasi',
                description: $description,
                user: $resolvedUser,
                context: [
                    'identifier' => $identifier,
                    'auth_status' => $status->value,
                    'details' => $details,
                    'ip_address' => $ip,
                    'user_agent' => $userAgent,
                ]
            );
        }
    }
}
