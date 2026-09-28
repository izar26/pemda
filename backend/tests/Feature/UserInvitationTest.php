<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\AuditLog;
use App\Models\Role;
use App\Models\User;
use Database\Seeders\RbacSeeder;
use Database\Seeders\SystemSettingSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

class UserInvitationTest extends TestCase
{
    use RefreshDatabase;

    protected User $superadmin;
    protected User $staffWithoutPerm;

    protected function setUp(): void
    {
        parent::setUp();

        Mail::fake();

        $this->seed(RbacSeeder::class);
        $this->seed(SystemSettingSeeder::class);

        Role::firstOrCreate(['name' => 'Staff', 'guard_name' => 'web'], ['is_system' => false]);
        Role::firstOrCreate(['name' => 'Pranata Komputer', 'guard_name' => 'web'], ['is_system' => false]);

        $this->superadmin = User::factory()->create([
            'email' => 'admin@pemda.go.id',
            'status' => 'active',
        ]);
        $this->superadmin->assignRole('Superadmin');

        $this->staffWithoutPerm = User::factory()->create([
            'email' => 'staff@pemda.go.id',
            'status' => 'active',
        ]);
        $staffRole = Role::where('name', 'Staff')->first();
        $staffRole->syncPermissions(['users.view']);
        $this->staffWithoutPerm->assignRole('Staff');
    }

    public function test_admin_with_permission_can_invite_user(): void
    {
        $token = $this->superadmin->createToken('test', ['*'])->plainTextToken;

        $payload = [
            'name' => 'Ahmad Dahlan, S.Kom',
            'email' => 'ahmad.dahlan@pemda.go.id',
            'role' => 'Pranata Komputer',
            'notes' => 'Selamat bergabung di unit kerja Diskominfostandi.',
        ];

        $response = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->postJson('/api/users/invite', $payload);

        $response->assertStatus(201)
            ->assertJsonPath('user.name', 'Ahmad Dahlan, S.Kom')
            ->assertJsonPath('user.email', 'ahmad.dahlan@pemda.go.id')
            ->assertJsonPath('user.status', 'pending_activation')
            ->assertJsonStructure(['activation_url']);

        $invitedUser = User::where('email', 'ahmad.dahlan@pemda.go.id')->first();
        $this->assertNotNull($invitedUser);
        $this->assertEquals('pending_activation', $invitedUser->status);
        $this->assertNotNull($invitedUser->activation_token);
        $this->assertTrue($invitedUser->hasRole('Pranata Komputer'));

        // Check audit log
        $this->assertDatabaseHas('audit_logs', [
            'action' => 'USER_INVITE',
            'module' => 'Pegawai',
        ]);
    }

    public function test_user_without_permission_cannot_invite_user(): void
    {
        $token = $this->staffWithoutPerm->createToken('test', ['*'])->plainTextToken;

        $response = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->postJson('/api/users/invite', [
                'name' => 'Ilegal Pegawai',
                'email' => 'ilegal@pemda.go.id',
                'role' => 'Staff',
            ]);

        $response->assertStatus(403);
    }

    public function test_user_can_validate_activation_token(): void
    {
        $user = User::factory()->create([
            'name' => 'Calon Pegawai',
            'email' => 'calon@pemda.go.id',
            'status' => 'pending_activation',
            'activation_token' => 'sample_valid_activation_token_1234567890abcdefghijklmnopqrstuvwxyz',
            'activation_token_expires_at' => now()->addHours(24),
        ]);
        $user->assignRole('Staff');

        $response = $this->getJson('/api/auth/validate-activation-token?token=' . $user->activation_token);

        $response->assertStatus(200)
            ->assertJsonPath('data.name', 'Calon Pegawai')
            ->assertJsonPath('data.email', 'calon@pemda.go.id');
    }

    public function test_cannot_validate_expired_activation_token(): void
    {
        $user = User::factory()->create([
            'email' => 'expired@pemda.go.id',
            'status' => 'pending_activation',
            'activation_token' => 'sample_expired_activation_token_1234567890abcdefghijklmnopqrstuvwxyz',
            'activation_token_expires_at' => now()->subHour(),
        ]);

        $response = $this->getJson('/api/auth/validate-activation-token?token=' . $user->activation_token);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['token']);
    }

    public function test_user_can_activate_account_and_set_password(): void
    {
        $token = 'sample_activation_token_for_activate_test_1234567890abcdefghijklm';
        $user = User::factory()->create([
            'name' => 'Siti Nurhaliza',
            'email' => 'siti.nur@pemda.go.id',
            'status' => 'pending_activation',
            'activation_token' => $token,
            'activation_token_expires_at' => now()->addHours(24),
        ]);
        $user->assignRole('Staff');

        $response = $this->postJson('/api/auth/activate', [
            'token' => $token,
            'nip' => '199505122020012003',
            'phone' => '081298765432',
            'password' => 'SandiKuat@2026',
            'password_confirmation' => 'SandiKuat@2026',
        ]);

        $response->assertStatus(200);

        $user->refresh();
        $this->assertEquals('active', $user->status);
        $this->assertNull($user->activation_token);
        $this->assertEquals('199505122020012003', $user->nip);
        $this->assertEquals('081298765432', $user->phone);
        $this->assertTrue(Hash::check('SandiKuat@2026', $user->password));

        // Replay attack: using same token again should fail
        $responseReplay = $this->postJson('/api/auth/activate', [
            'token' => $token,
            'password' => 'SandiKuatLain@2026',
            'password_confirmation' => 'SandiKuatLain@2026',
        ]);
        $responseReplay->assertStatus(422);
    }
}
