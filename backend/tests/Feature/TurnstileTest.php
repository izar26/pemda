<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\User;
use App\Services\Auth\TurnstileService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class TurnstileTest extends TestCase
{
    use RefreshDatabase;

    public function test_login_rejected_when_turnstile_fails(): void
    {
        config(['services.turnstile.enabled' => true]);
        config(['services.turnstile.secret_key' => 'dummy-secret']);
        config(['services.turnstile.hostnames' => ['localhost']]);

        // Mock Cloudflare returning failure
        Http::fake([
            'https://challenges.cloudflare.com/turnstile/v0/siteverify' => Http::response([
                'success' => false,
                'error-codes' => ['invalid-input-response'],
            ], 200),
        ]);

        $response = $this->postJson('/api/auth/login', [
            'identifier' => 'admin@pemda.go.id',
            'password' => 'password123',
            'turnstile_token' => 'invalid-token',
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['turnstile_token']);
    }

    public function test_login_accepted_when_turnstile_succeeds(): void
    {
        config(['services.turnstile.enabled' => true]);
        config(['services.turnstile.secret_key' => 'dummy-secret']);
        config(['services.turnstile.hostnames' => ['localhost']]);

        User::factory()->create([
            'email' => 'admin@pemda.go.id',
            'password' => 'password123',
            'status' => 'active',
        ]);

        // Mock Cloudflare returning success
        Http::fake([
            'https://challenges.cloudflare.com/turnstile/v0/siteverify' => Http::response([
                'success' => true,
                'action' => 'login',
                'hostname' => 'localhost',
            ], 200),
        ]);

        $response = $this->postJson('/api/auth/login', [
            'identifier' => 'admin@pemda.go.id',
            'password' => 'password123',
            'turnstile_token' => 'valid-turnstile-token',
        ]);

        $response->assertStatus(200)
            ->assertJsonStructure([
                'token',
                'user',
            ]);
    }
}
