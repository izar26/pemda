<?php

declare(strict_types=1);

namespace App\Services\Auth;

use App\Models\User;
use BaconQrCode\Renderer\Image\SvgImageBackEnd;
use BaconQrCode\Renderer\ImageRenderer;
use BaconQrCode\Renderer\RendererStyle\RendererStyle;
use BaconQrCode\Writer;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Str;
use PragmaRX\Google2FA\Google2FA;

class TwoFactorService
{
    protected Google2FA $google2fa;

    public function __construct()
    {
        $this->google2fa = new Google2FA();
    }

    /**
     * Generate new 2FA setup payload (Secret and QR Code SVG only).
     * Recovery codes are NOT generated until the user proves valid confirmation.
     *
     * @return array{secret: string, qr_code_svg: string}
     */
    public function generateSetup(User $user): array
    {
        $secret = $this->google2fa->generateSecretKey();

        // Save secret temporarily (unconfirmed, no recovery codes yet)
        $user->update([
            'two_factor_secret' => $secret,
            'two_factor_recovery_codes' => null,
            'two_factor_confirmed_at' => null,
        ]);

        $appName = config('app.name', 'PEMDA');
        $otpauthUrl = $this->google2fa->getQRCodeUrl($appName, $user->email, $secret);

        $renderer = new ImageRenderer(new RendererStyle(220), new SvgImageBackEnd());
        $writer = new Writer($renderer);
        $svgQr = $writer->writeString($otpauthUrl);

        return [
            'secret' => $secret,
            'qr_code_svg' => $svgQr,
        ];
    }

    /**
     * Confirm 2FA activation with initial code and generate recovery codes on success.
     *
     * @return list<string>|null
     */
    public function confirm(User $user, string $code): ?array
    {
        if (empty($user->two_factor_secret)) {
            return null;
        }

        $isValid = $this->google2fa->verifyKey($user->two_factor_secret, $code, 1);
        if (!$isValid) {
            return null;
        }

        // Generate 8 cryptographically secure single-use recovery codes upon successful confirmation
        $recoveryCodes = [];
        for ($i = 0; $i < 8; $i++) {
            $recoveryCodes[] = strtoupper(Str::random(4)) . '-' . strtoupper(Str::random(4));
        }

        $user->update([
            'two_factor_confirmed_at' => now(),
            'two_factor_recovery_codes' => $recoveryCodes,
        ]);

        return $recoveryCodes;
    }

    /**
     * Verify a 2FA submission (TOTP or single-use recovery code) with Anti-Replay protection.
     *
     * @return array{valid: bool, used_backup: bool, reason: ?string}
     */
    public function verify(User $user, string $code): array
    {
        $code = trim($code);

        // Anti-Replay: prevent OTP reuse within the valid time window
        $replayKey = 'used_totp:' . $user->id . ':' . $code;
        if (Cache::has($replayKey)) {
            return [
                'valid' => false,
                'used_backup' => false,
                'reason' => 'Kode ini baru saja digunakan. Tunggu kode berikutnya pada aplikasi Google Authenticator.',
            ];
        }

        // Check 6-digit TOTP
        if (strlen($code) === 6 && ctype_digit($code) && !empty($user->two_factor_secret)) {
            if ($this->google2fa->verifyKey($user->two_factor_secret, $code, 1)) {
                Cache::put($replayKey, true, 90);
                return [
                    'valid' => true,
                    'used_backup' => false,
                    'reason' => null,
                ];
            }
        }

        // Check Recovery Codes
        if (!empty($user->two_factor_recovery_codes)) {
            $cleanInput = strtoupper(str_replace(['-', ' '], '', $code));
            $codes = $user->two_factor_recovery_codes;

            foreach ($codes as $index => $stored) {
                $cleanStored = strtoupper(str_replace(['-', ' '], '', $stored));
                if (hash_equals($cleanStored, $cleanInput)) {
                    // Consume the used recovery code
                    unset($codes[$index]);
                    $user->update([
                        'two_factor_recovery_codes' => array_values($codes),
                    ]);

                    return [
                        'valid' => true,
                        'used_backup' => true,
                        'reason' => null,
                    ];
                }
            }
        }

        return [
            'valid' => false,
            'used_backup' => false,
            'reason' => 'Kode autentikasi tidak valid atau sudah kedaluwarsa.',
        ];
    }

    /**
     * Disable 2FA.
     */
    public function disable(User $user): void
    {
        $user->update([
            'two_factor_secret' => null,
            'two_factor_recovery_codes' => null,
            'two_factor_confirmed_at' => null,
        ]);

        // Revoke all tokens across devices for security
        $user->tokens()->delete();
    }
}
