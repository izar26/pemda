<?php

declare(strict_types=1);

namespace App\Rules;

use App\Services\Auth\TurnstileService;
use Closure;
use Illuminate\Contracts\Validation\ValidationRule;

class TurnstileRule implements ValidationRule
{
    public function __construct(
        protected ?string $action = 'login',
        protected ?string $clientIp = null
    ) {}

    /**
     * Run the validation rule.
     *
     * @param  \Closure(string, ?string=): \Illuminate\Translation\PotentiallyTranslatedString  $fail
     */
    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        $enabled = (bool) config('services.turnstile.enabled', true);
        if (!$enabled) {
            return;
        }

        $service = app(TurnstileService::class);
        $clientIp = $this->clientIp ?? request()->ip();

        $isValid = $service->verify(
            token: is_string($value) ? $value : null,
            clientIp: $clientIp,
            expectedAction: $this->action ?? 'login'
        );

        if (!$isValid) {
            $fail('Verifikasi keamanan bot (Cloudflare Turnstile) gagal atau telah kedaluwarsa. Silakan coba lagi.');
        }
    }
}
