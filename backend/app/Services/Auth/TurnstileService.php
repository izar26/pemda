<?php

declare(strict_types=1);

namespace App\Services\Auth;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class TurnstileService
{
    protected const VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

    /**
     * Verify Turnstile token against Cloudflare Siteverify API.
     */
    public function verify(?string $token, ?string $clientIp = null, string $expectedAction = 'login'): bool
    {
        $enabled = (bool) config('services.turnstile.enabled', true);
        if (!$enabled) {
            return true;
        }

        $secretKey = (string) config('services.turnstile.secret_key');
        if (empty($secretKey)) {
            Log::warning('Turnstile secret key is not configured; skipping validation.');
            return true;
        }

        if (empty($token) || strlen($token) > 2048) {
            return false;
        }

        try {
            $response = Http::asForm()
                ->timeout(10)
                ->post(self::VERIFY_URL, array_filter([
                    'secret' => $secretKey,
                    'response' => $token,
                    'remoteip' => $clientIp,
                ]));

            if (!$response->successful()) {
                Log::error('Cloudflare Turnstile verification HTTP error', [
                    'status' => $response->status(),
                    'body' => $response->body(),
                ]);
                return false;
            }

            $data = $response->json();

            if (!isset($data['success']) || $data['success'] !== true) {
                Log::info('Cloudflare Turnstile verification rejected', [
                    'error_codes' => $data['error-codes'] ?? [],
                ]);
                return false;
            }

            // Verify action matches expected action (e.g. 'login')
            if (isset($data['action']) && $data['action'] !== '' && $data['action'] !== $expectedAction) {
                Log::warning('Cloudflare Turnstile action mismatch', [
                    'expected' => $expectedAction,
                    'received' => $data['action'],
                ]);
                return false;
            }

            // Verify hostname is in allowed hostnames
            $allowedHostnames = config('services.turnstile.hostnames', []);
            if (!empty($allowedHostnames) && isset($data['hostname'])) {
                if (!in_array($data['hostname'], $allowedHostnames, true)) {
                    Log::warning('Cloudflare Turnstile hostname mismatch', [
                        'allowed' => $allowedHostnames,
                        'received' => $data['hostname'],
                    ]);
                    return false;
                }
            }

            return true;
        } catch (\Throwable $e) {
            Log::error('Cloudflare Turnstile exception: ' . $e->getMessage(), [
                'exception' => $e,
            ]);
            return false;
        }
    }
}
