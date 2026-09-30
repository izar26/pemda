<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\Master\MasterKategoriRisiko;
use App\Models\Master\MasterPemilikRisiko;
use App\Models\Role;
use App\Models\User;
use Database\Seeders\MasterDataSeeder;
use Database\Seeders\OpdSeeder;
use Database\Seeders\RbacSeeder;
use Database\Seeders\SystemSettingSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class MasterDataTest extends TestCase
{
    use RefreshDatabase;

    protected User $superadmin;
    protected User $staffWithoutPerm;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(OpdSeeder::class);
        $this->seed(RbacSeeder::class);
        $this->seed(SystemSettingSeeder::class);
        $this->seed(MasterDataSeeder::class);

        $this->superadmin = User::factory()->create([
            'email' => 'admin@pemda.go.id',
            'status' => 'active',
        ]);
        $this->superadmin->assignRole('Superadmin');

        $this->staffWithoutPerm = User::factory()->create([
            'email' => 'staff@pemda.go.id',
            'status' => 'active',
        ]);
        Role::firstOrCreate(['name' => 'Staff', 'guard_name' => 'web'], ['is_system' => false]);
        $this->staffWithoutPerm->assignRole('Staff');
    }

    public function test_unauthenticated_cannot_access_master_data(): void
    {
        $response = $this->getJson('/api/master/kategori-risiko');
        $response->assertStatus(401);
    }

    public function test_user_without_master_permission_cannot_access_master_data(): void
    {
        $token = $this->staffWithoutPerm->createToken('test', ['*'])->plainTextToken;

        $response = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->getJson('/api/master/kategori-risiko');

        $response->assertStatus(403);
    }

    public function test_invalid_entity_returns_404(): void
    {
        $token = $this->superadmin->createToken('test', ['*'])->plainTextToken;

        $response = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->getJson('/api/master/unknown-entity-hacker');

        $response->assertStatus(404);
    }

    public function test_authorized_user_can_list_master_data(): void
    {
        $token = $this->superadmin->createToken('test', ['*'])->plainTextToken;

        // Test Kategori Risiko
        $response = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->getJson('/api/master/kategori-risiko');

        $response->assertStatus(200)
            ->assertJsonPath('entity.key', 'kategori-risiko')
            ->assertJsonPath('entity.label', 'Kategori Risiko')
            ->assertJsonStructure(['data', 'entity']);

        $this->assertGreaterThanOrEqual(8, count($response->json('data')));

        // Test Unsur SPIP with sub-unsur eager loading
        $spipResponse = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->getJson('/api/master/unsur-spip');

        $spipResponse->assertStatus(200)
            ->assertJsonPath('entity.key', 'unsur-spip')
            ->assertJsonStructure([
                'data' => [
                    '*' => ['id', 'nomor', 'nama', 'sub_unsurs'],
                ],
            ]);
    }

    public function test_authorized_user_can_create_master_data(): void
    {
        $token = $this->superadmin->createToken('test', ['*'])->plainTextToken;

        $payload = [
            'kode' => 'RCUST',
            'nama' => 'Risiko Khusus Pemda',
            'definisi' => 'Risiko kustom baru untuk pengujian unit.',
            'urutan' => 99,
        ];

        $response = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->postJson('/api/master/kategori-risiko', $payload);

        $response->assertStatus(201)
            ->assertJsonPath('data.kode', 'RCUST')
            ->assertJsonPath('data.nama', 'Risiko Khusus Pemda');

        $this->assertDatabaseHas('master_kategori_risikos', [
            'kode' => 'RCUST',
            'nama' => 'Risiko Khusus Pemda',
        ]);

        $this->assertDatabaseHas('audit_logs', [
            'action' => 'MASTER_DATA_CREATE',
            'module' => 'Master Data',
        ]);
    }

    public function test_authorized_user_can_update_master_data(): void
    {
        $token = $this->superadmin->createToken('test', ['*'])->plainTextToken;

        $kategori = MasterKategoriRisiko::firstOrFail();

        $response = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->putJson("/api/master/kategori-risiko/{$kategori->id}", [
                'kode' => $kategori->kode,
                'nama' => 'Nama Kategori Diperbarui',
                'definisi' => 'Definisi yang diperbarui.',
            ]);

        $response->assertStatus(200)
            ->assertJsonPath('data.nama', 'Nama Kategori Diperbarui');

        $this->assertDatabaseHas('master_kategori_risikos', [
            'id' => $kategori->id,
            'nama' => 'Nama Kategori Diperbarui',
        ]);

        $this->assertDatabaseHas('audit_logs', [
            'action' => 'MASTER_DATA_UPDATE',
            'module' => 'Master Data',
        ]);
    }

    public function test_authorized_user_can_toggle_active_status(): void
    {
        $token = $this->superadmin->createToken('test', ['*'])->plainTextToken;

        $item = MasterPemilikRisiko::firstOrFail();
        $initialStatus = $item->is_active;

        $response = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->patchJson("/api/master/pemilik-risiko/{$item->id}/toggle");

        $response->assertStatus(200)
            ->assertJsonPath('data.is_active', !$initialStatus);

        $item->refresh();
        $this->assertEquals(!$initialStatus, $item->is_active);

        $this->assertDatabaseHas('audit_logs', [
            'action' => 'MASTER_DATA_TOGGLE',
            'module' => 'Master Data',
        ]);
    }

    public function test_authorized_user_can_delete_master_data(): void
    {
        $token = $this->superadmin->createToken('test', ['*'])->plainTextToken;

        $item = MasterPemilikRisiko::create([
            'nama' => 'Entri Uji Hapus',
            'is_active' => true,
        ]);

        $response = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->deleteJson("/api/master/pemilik-risiko/{$item->id}");

        $response->assertStatus(200);

        $this->assertDatabaseMissing('master_pemilik_risikos', [
            'id' => $item->id,
        ]);

        $this->assertDatabaseHas('audit_logs', [
            'action' => 'MASTER_DATA_DELETE',
            'module' => 'Master Data',
        ]);
    }

    public function test_validation_error_when_required_fields_missing(): void
    {
        $token = $this->superadmin->createToken('test', ['*'])->plainTextToken;

        $response = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->postJson('/api/master/kategori-risiko', [
                'nama' => '', // missing name & code
            ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['nama', 'kode']);
    }
}
