<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use PragmaRX\Google2FA\Google2FA;
use Tests\TestCase;

class AuthTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        
        // Ensure clean test user
        User::updateOrCreate(
            ['email' => 'admin@pemda.go.id'],
            [
                'name' => 'Administrator Utama',
                'nip' => '198501012010011001',
                'phone' => '081234567890',
                'role' => 'superadmin',
                'status' => 'active',
                'password' => Hash::make('Password@123'),
                'two_factor_secret' => null,
                'two_factor_recovery_codes' => null,
                'two_factor_confirmed_at' => null,
                'failed_login_attempts' => 0,
                'lockout_until' => null,
            ]
        );
    }

    public function test_user_can_login_with_email_and_password(): void
    {
        $response = $this->postJson('/api/auth/login', [
            'identifier' => 'admin@pemda.go.id',
            'password' => 'Password@123',
        ]);

        $response->assertStatus(200)
            ->assertJsonStructure([
                'requires_2fa',
                'token',
                'token_type',
                'expires_in',
                'user' => ['id', 'name', 'email', 'nip', 'role'],
            ]);
    }

    public function test_user_can_login_with_nip_and_password(): void
    {
        $response = $this->postJson('/api/auth/login', [
            'identifier' => '198501012010011001',
            'password' => 'Password@123',
        ]);

        $response->assertStatus(200)
            ->assertJsonPath('requires_2fa', false)
            ->assertJsonPath('user.nip', '198501012010011001');
    }

    public function test_login_fails_with_invalid_credentials(): void
    {
        $response = $this->postJson('/api/auth/login', [
            'identifier' => 'admin@pemda.go.id',
            'password' => 'WrongPassword',
        ]);

        $response->assertStatus(422)
            ->assertJsonPath('message', 'Kredensial yang Anda masukkan tidak valid.');
    }

    public function test_login_requires_2fa_when_enabled_and_blocks_bypass(): void
    {
        $user = User::where('email', 'admin@pemda.go.id')->first();
        $g2fa = new Google2FA();
        $secret = $g2fa->generateSecretKey();

        $user->update([
            'two_factor_secret' => $secret,
            'two_factor_recovery_codes' => ['BACKUP-01', 'BACKUP-02'],
            'two_factor_confirmed_at' => now(),
        ]);

        // 1. Login step 1
        $loginRes = $this->postJson('/api/auth/login', [
            'identifier' => 'admin@pemda.go.id',
            'password' => 'Password@123',
        ]);

        $loginRes->assertStatus(200)
            ->assertJsonPath('requires_2fa', true)
            ->assertJsonStructure(['temp_token']);

        $tempToken = $loginRes->json('temp_token');

        // 2. Anti-Bypass: accessing protected endpoint using temp token must be blocked (HTTP 403)
        $bypassRes = $this->withHeader('Authorization', 'Bearer ' . $tempToken)
            ->getJson('/api/auth/me');

        $bypassRes->assertStatus(403);

        // 3. Step 2: verify TOTP
        $validOtp = $g2fa->getCurrentOtp($secret);
        $verifyRes = $this->withHeader('Authorization', 'Bearer ' . $tempToken)
            ->postJson('/api/auth/2fa/verify', [
                'code' => $validOtp,
            ]);

        $verifyRes->assertStatus(200)
            ->assertJsonStructure(['token', 'user']);

        // 4. Anti-Replay: submitting the exact same OTP code immediately must be rejected
        $replayRes = $this->withHeader('Authorization', 'Bearer ' . $tempToken)
            ->postJson('/api/auth/2fa/verify', [
                'code' => $validOtp,
            ]);

        $replayRes->assertStatus(422);
    }

    public function test_can_login_using_backup_recovery_code(): void
    {
        $user = User::where('email', 'admin@pemda.go.id')->first();
        $g2fa = new Google2FA();
        $secret = $g2fa->generateSecretKey();

        $user->update([
            'two_factor_secret' => $secret,
            'two_factor_recovery_codes' => ['EMERGENCY-01', 'EMERGENCY-02'],
            'two_factor_confirmed_at' => now(),
        ]);

        $loginRes = $this->postJson('/api/auth/login', [
            'identifier' => 'admin@pemda.go.id',
            'password' => 'Password@123',
        ]);

        $tempToken = $loginRes->json('temp_token');

        $verifyRes = $this->withHeader('Authorization', 'Bearer ' . $tempToken)
            ->postJson('/api/auth/2fa/verify', [
                'code' => 'EMERGENCY-01',
            ]);

        $verifyRes->assertStatus(200)
            ->assertJsonPath('used_backup_code', true);

        // Verify recovery code was consumed and removed
        $user->refresh();
        $this->assertNotContains('EMERGENCY-01', $user->two_factor_recovery_codes);
        $this->assertContains('EMERGENCY-02', $user->two_factor_recovery_codes);
    }
}
