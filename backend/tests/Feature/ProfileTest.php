<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\Opd;
use App\Models\User;
use Database\Seeders\OpdSeeder;
use Database\Seeders\RbacSeeder;
use Database\Seeders\SystemSettingSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ProfileTest extends TestCase
{
    use RefreshDatabase;

    protected User $user;
    protected Opd $opd;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(OpdSeeder::class);
        $this->seed(RbacSeeder::class);
        $this->seed(SystemSettingSeeder::class);

        $this->opd = Opd::where('kode', 'Sekda')->firstOrFail();

        $this->user = User::factory()->create([
            'name' => 'Budi Santoso',
            'email' => 'budi.santoso@pemda.go.id',
            'nip' => '198801012015011002',
            'phone' => '081234567890',
            'pangkat_gol' => 'Penata Muda (III/a)',
            'jabatan' => 'Analis Data',
            'opd_id' => $this->opd->id,
            'status' => 'active',
        ]);
        $this->user->assignRole('Superadmin');
    }

    public function test_authenticated_user_can_update_own_profile(): void
    {
        $token = $this->user->createToken('test', ['*'])->plainTextToken;

        $targetOpd = Opd::where('kode', 'Diskominfo')->firstOrFail();

        $response = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->putJson('/api/auth/profile', [
                'name' => 'Budi Santoso, M.Kom',
                'nip' => '198801012015011002',
                'phone' => '089988776655',
                'pangkat_gol' => 'Penata (III/c)',
                'jabatan' => 'Kepala Bidang Aplikasi Informatika',
                'opd_id' => $targetOpd->id,
            ]);

        $response->assertStatus(200)
            ->assertJsonPath('user.name', 'Budi Santoso, M.Kom')
            ->assertJsonPath('user.phone', '089988776655')
            ->assertJsonPath('user.pangkat_gol', 'Penata (III/c)')
            ->assertJsonPath('user.jabatan', 'Kepala Bidang Aplikasi Informatika')
            ->assertJsonPath('user.opd.id', $targetOpd->id);

        $this->user->refresh();
        $this->assertEquals('Budi Santoso, M.Kom', $this->user->name);
        $this->assertEquals('089988776655', $this->user->phone);
        $this->assertEquals('Penata (III/c)', $this->user->pangkat_gol);
        $this->assertEquals('Kepala Bidang Aplikasi Informatika', $this->user->jabatan);
        $this->assertEquals($targetOpd->id, $this->user->opd_id);

        $this->assertDatabaseHas('audit_logs', [
            'action' => 'USER_PROFILE_UPDATE',
            'module' => 'Profil',
        ]);
    }

    public function test_cannot_update_profile_with_duplicate_nip(): void
    {
        User::factory()->create([
            'email' => 'other@pemda.go.id',
            'nip' => '199002022018021001',
        ]);

        $token = $this->user->createToken('test', ['*'])->plainTextToken;

        $response = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->putJson('/api/auth/profile', [
                'name' => 'Budi Santoso',
                'nip' => '199002022018021001', // duplicate
            ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['nip']);
    }

    public function test_unauthenticated_user_cannot_update_profile(): void
    {
        $response = $this->putJson('/api/auth/profile', [
            'name' => 'Hacker Name',
        ]);

        $response->assertStatus(401);
    }
}
