<?php

namespace Tests\Feature;

use App\Mail\PasswordChangedMail;
use App\Mail\ResetPasswordMail;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;
use Tests\TestCase;

class PasswordResetTest extends TestCase
{
    use RefreshDatabase;

    protected User $user;

    protected function setUp(): void
    {
        parent::setUp();

        $this->user = User::factory()->create([
            'email' => 'pegawai@pemda.go.id',
            'name' => 'Budi Santoso',
            'nip' => '198701012010011002',
            'password' => Hash::make('OldPassword@123'),
            'status' => 'active',
        ]);
    }

    public function test_forgot_password_sends_email_for_existing_user(): void
    {
        Mail::fake();

        $response = $this->postJson('/api/auth/forgot-password', [
            'email' => 'pegawai@pemda.go.id',
        ]);

        $response->assertStatus(200)
            ->assertJson([
                'message' => 'Jika alamat email terdaftar di sistem kami, tautan pengaturan ulang kata sandi telah dikirimkan. Silakan periksa kotak masuk atau folder spam Anda.',
            ]);

        // Assert record exists in password_reset_tokens
        $this->assertDatabaseHas('password_reset_tokens', [
            'email' => 'pegawai@pemda.go.id',
        ]);

        // Assert email was sent
        Mail::assertSent(ResetPasswordMail::class, function ($mail) {
            return $mail->hasTo('pegawai@pemda.go.id') &&
                !empty($mail->token) &&
                $mail->user->id === $this->user->id;
        });
    }

    public function test_forgot_password_returns_generic_response_for_non_existent_email(): void
    {
        Mail::fake();

        $response = $this->postJson('/api/auth/forgot-password', [
            'email' => 'hacker@tidakada.go.id',
        ]);

        // Anti-enumeration: must return 200 with identical message
        $response->assertStatus(200)
            ->assertJson([
                'message' => 'Jika alamat email terdaftar di sistem kami, tautan pengaturan ulang kata sandi telah dikirimkan. Silakan periksa kotak masuk atau folder spam Anda.',
            ]);

        // Assert no email was sent
        Mail::assertNothingSent();
    }

    public function test_reset_password_succeeds_with_valid_token(): void
    {
        Mail::fake();

        // Simulate token issuance
        $rawToken = Str::random(64);
        DB::table('password_reset_tokens')->insert([
            'email' => 'pegawai@pemda.go.id',
            'token' => hash('sha256', $rawToken),
            'created_at' => now(),
        ]);

        // Give user an active session token to verify session revocation
        $sanctumToken = $this->user->createToken('test_session');
        $this->assertCount(1, $this->user->tokens);

        $newPassword = 'NewSecretPassword@456';

        $response = $this->postJson('/api/auth/reset-password', [
            'token' => $rawToken,
            'email' => 'pegawai@pemda.go.id',
            'password' => $newPassword,
            'password_confirmation' => $newPassword,
        ]);

        $response->assertStatus(200)
            ->assertJson([
                'message' => 'Kata sandi berhasil diperbarui. Silakan masuk dengan kata sandi baru Anda.',
            ]);

        // Assert user password in database changed
        $this->user->refresh();
        $this->assertTrue(Hash::check($newPassword, $this->user->password));

        // Assert reset token was deleted from database (single-use)
        $this->assertDatabaseMissing('password_reset_tokens', [
            'email' => 'pegawai@pemda.go.id',
        ]);

        // Assert all Sanctum sessions were revoked
        $this->assertCount(0, $this->user->tokens);

        // Assert confirmation email was sent
        Mail::assertSent(PasswordChangedMail::class, function ($mail) {
            return $mail->hasTo('pegawai@pemda.go.id');
        });
    }

    public function test_reset_password_fails_with_invalid_token(): void
    {
        $rawToken = Str::random(64);
        DB::table('password_reset_tokens')->insert([
            'email' => 'pegawai@pemda.go.id',
            'token' => hash('sha256', $rawToken),
            'created_at' => now(),
        ]);

        $response = $this->postJson('/api/auth/reset-password', [
            'token' => 'completely_wrong_token',
            'email' => 'pegawai@pemda.go.id',
            'password' => 'NewSecretPassword@456',
            'password_confirmation' => 'NewSecretPassword@456',
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['token']);
    }

    public function test_reset_password_fails_with_expired_token(): void
    {
        $rawToken = Str::random(64);
        // Insert expired token (35 minutes old)
        DB::table('password_reset_tokens')->insert([
            'email' => 'pegawai@pemda.go.id',
            'token' => hash('sha256', $rawToken),
            'created_at' => Carbon::now()->subMinutes(35),
        ]);

        $response = $this->postJson('/api/auth/reset-password', [
            'token' => $rawToken,
            'email' => 'pegawai@pemda.go.id',
            'password' => 'NewSecretPassword@456',
            'password_confirmation' => 'NewSecretPassword@456',
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['token']);

        // Expired token should be deleted
        $this->assertDatabaseMissing('password_reset_tokens', [
            'email' => 'pegawai@pemda.go.id',
        ]);
    }

    public function test_reset_password_fails_with_weak_password(): void
    {
        $rawToken = Str::random(64);
        DB::table('password_reset_tokens')->insert([
            'email' => 'pegawai@pemda.go.id',
            'token' => hash('sha256', $rawToken),
            'created_at' => now(),
        ]);

        // Weak password without symbols / numbers
        $response = $this->postJson('/api/auth/reset-password', [
            'token' => $rawToken,
            'email' => 'pegawai@pemda.go.id',
            'password' => 'simple',
            'password_confirmation' => 'simple',
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['password']);
    }
}
