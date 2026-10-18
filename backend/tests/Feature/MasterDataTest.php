<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\Master\MasterKategoriRisiko;
use App\Models\Master\MasterPemilikRisiko;
use App\Models\Master\MasterSumberData;
use App\Models\Master\MasterUnsurSpip;
use App\Models\Master\MasterSubUnsurSpip;
use App\Models\Opd;
use App\Models\Perencanaan\PeriodePenilaian;
use App\Models\Perencanaan\TujuanPenilaian;
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

    public function test_unauthorized_user_cannot_mutate_master_data(): void
    {
        $token = $this->staffWithoutPerm->createToken('test', ['*'])->plainTextToken;

        // POST (create)
        $this->withHeader('Authorization', 'Bearer ' . $token)
            ->postJson('/api/master/kategori-risiko', ['nama' => 'Hacker Risk', 'kode' => 'HR'])
            ->assertStatus(403);

        // PUT (update)
        $this->withHeader('Authorization', 'Bearer ' . $token)
            ->putJson('/api/master/kategori-risiko/1', ['nama' => 'Hacker Risk', 'kode' => 'HR'])
            ->assertStatus(403);

        // PATCH (toggle)
        $this->withHeader('Authorization', 'Bearer ' . $token)
            ->patchJson('/api/master/kategori-risiko/1/toggle')
            ->assertStatus(403);

        // DELETE
        $this->withHeader('Authorization', 'Bearer ' . $token)
            ->deleteJson('/api/master/kategori-risiko/1')
            ->assertStatus(403);
    }

    public function test_cannot_delete_unsur_spip_with_active_sub_unsurs(): void
    {
        $token = $this->superadmin->createToken('test', ['*'])->plainTextToken;

        // Unsur 1 has seeded sub-unsurs
        $unsur = \App\Models\Master\MasterUnsurSpip::whereHas('subUnsurs')->firstOrFail();

        $response = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->deleteJson("/api/master/unsur-spip/{$unsur->id}");

        $response->assertStatus(422)
            ->assertJsonFragment(['message' => "Tidak dapat menghapus Unsur SPIP '{$unsur->nama}' karena masih memiliki {$unsur->subUnsurs()->count()} Sub-Unsur terkait. Bersihkan data Sub-Unsur terlebih dahulu dari bawah."]);
    }

    public function test_authorized_user_can_manage_opd_master_data(): void
    {
        $token = $this->superadmin->createToken('test', ['*'])->plainTextToken;

        // List OPDs
        $response = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->getJson('/api/master/opd');

        $response->assertStatus(200)
            ->assertJsonPath('entity.key', 'opd')
            ->assertJsonPath('entity.label', 'Perangkat Daerah (OPD)');

        $this->assertGreaterThanOrEqual(60, count($response->json('data')));

        // Create new OPD
        $createResponse = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->postJson('/api/master/opd', [
                'kode' => 'KEC-TEST',
                'nama' => 'Kecamatan Contoh Baru',
                'kategori' => 'Kecamatan',
                'kepala' => 'Drs. H. Fulan, M.Si',
                'urutan' => 99,
            ]);

        $createResponse->assertStatus(201)
            ->assertJsonPath('data.kode', 'KEC-TEST')
            ->assertJsonPath('data.nama', 'Kecamatan Contoh Baru');

        $this->assertDatabaseHas('opds', [
            'kode' => 'KEC-TEST',
            'nama' => 'Kecamatan Contoh Baru',
        ]);
    }

    public function test_cannot_delete_sumber_data_when_used_in_tujuan_penilaian(): void
    {
        $token = $this->superadmin->createToken('test', ['*'])->plainTextToken;

        $opd = Opd::firstOrFail();
        $periode = PeriodePenilaian::create([
            'nama_periode' => 'Periode Uji Aktif',
            'tahun_mulai' => 2026,
            'tahun_akhir' => 2030,
            'tahun_penilaian' => 2026,
            'tanggal_mulai' => '2026-01-01',
            'tanggal_akhir' => '2026-12-31',
            'status' => 'aktif',
        ]);

        $sumberData = MasterSumberData::firstOrFail();

        TujuanPenilaian::create([
            'periode_penilaian_id' => $periode->id,
            'opd_id' => $opd->id,
            'sumber_data_id' => $sumberData->id,
            'kode_tujuan' => 'TUJ-GUARD',
            'tujuan' => 'Tujuan Pengujian Guard Sumber Data',
            'urutan' => 1,
            'created_by' => $this->superadmin->id,
        ]);

        $response = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->deleteJson("/api/master/sumber-data/{$sumberData->id}");

        $response->assertStatus(422);

        $this->assertStringContainsString('Tujuan Penilaian', $response->json('message'));
        $this->assertDatabaseHas('master_sumber_datas', ['id' => $sumberData->id]);
    }

    public function test_cannot_deactivate_sumber_data_when_used_in_active_periode(): void
    {
        $token = $this->superadmin->createToken('test', ['*'])->plainTextToken;

        $opd = Opd::firstOrFail();
        $periode = PeriodePenilaian::create([
            'nama_periode' => 'Periode Uji Aktif 2',
            'tahun_mulai' => 2026,
            'tahun_akhir' => 2030,
            'tahun_penilaian' => 2026,
            'tanggal_mulai' => '2026-01-01',
            'tanggal_akhir' => '2026-12-31',
            'status' => 'aktif',
        ]);

        $sumberData = MasterSumberData::firstOrFail();

        TujuanPenilaian::create([
            'periode_penilaian_id' => $periode->id,
            'opd_id' => $opd->id,
            'sumber_data_id' => $sumberData->id,
            'kode_tujuan' => 'TUJ-GUARD-2',
            'tujuan' => 'Tujuan Pengujian Deaktivasi Guard',
            'urutan' => 2,
            'created_by' => $this->superadmin->id,
        ]);

        // Attempt toggle
        $response = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->patchJson("/api/master/sumber-data/{$sumberData->id}/toggle");

        $response->assertStatus(422);

        $this->assertStringContainsString('periode penilaian aktif', $response->json('message'));

        // Attempt update with is_active = false
        $updateResponse = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->putJson("/api/master/sumber-data/{$sumberData->id}", [
                'nama' => $sumberData->nama,
                'is_active' => false,
            ]);

        $updateResponse->assertStatus(422);
    }

    public function test_cannot_create_sub_unsur_with_inactive_unsur_spip(): void
    {
        $token = $this->superadmin->createToken('test', ['*'])->plainTextToken;

        $inactiveUnsur = MasterUnsurSpip::create([
            'nomor' => '99',
            'nama' => 'Unsur Nonaktif',
            'is_active' => false,
            'urutan' => 99,
        ]);

        $response = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->postJson('/api/master/sub-unsur-spip', [
                'unsur_spip_id' => $inactiveUnsur->id,
                'kode' => '99.1',
                'nama' => 'Sub Unsur Baru',
                'urutan' => 1,
            ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['unsur_spip_id']);
    }

    public function test_cannot_reorder_sub_unsurs_across_different_unsurs(): void
    {
        $token = $this->superadmin->createToken('test', ['*'])->plainTextToken;

        $unsur1 = MasterUnsurSpip::create([
            'nomor' => '91',
            'nama' => 'Unsur 91',
            'is_active' => true,
            'urutan' => 91,
        ]);

        $unsur2 = MasterUnsurSpip::create([
            'nomor' => '92',
            'nama' => 'Unsur 92',
            'is_active' => true,
            'urutan' => 92,
        ]);

        $sub1 = \App\Models\Master\MasterSubUnsurSpip::create([
            'unsur_spip_id' => $unsur1->id,
            'kode' => '91.1',
            'nama' => 'Sub 91.1',
            'urutan' => 1,
            'is_active' => true,
        ]);

        $sub2 = \App\Models\Master\MasterSubUnsurSpip::create([
            'unsur_spip_id' => $unsur2->id,
            'kode' => '92.1',
            'nama' => 'Sub 92.1',
            'urutan' => 1,
            'is_active' => true,
        ]);

        $response = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->postJson('/api/master/sub-unsur-spip/reorder', [
                'ids' => [$sub1->id, $sub2->id],
            ]);

        $response->assertStatus(422)
            ->assertJsonPath('message', 'Semua Sub-Unsur yang diurutkan harus berada di bawah Unsur SPIP yang sama.');
    }
}
