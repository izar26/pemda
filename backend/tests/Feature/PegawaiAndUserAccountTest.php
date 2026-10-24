<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\Opd;
use App\Models\Role;
use App\Models\User;
use Database\Seeders\RbacSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PegawaiAndUserAccountTest extends TestCase
{
    use RefreshDatabase;

    protected User $superadmin;
    protected Opd $opdA;
    protected Opd $opdB;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RbacSeeder::class);

        $this->opdA = Opd::create([
            'nama' => 'Dinas Komunikasi dan Informatika',
            'kode' => 'DISKOMINFO',
            'kategori' => 'Dinas',
            'is_active' => true,
            'urutan' => 1,
        ]);

        $this->opdB = Opd::create([
            'nama' => 'Badan Perencanaan Pembangunan Daerah',
            'kode' => 'BAPPERIDA',
            'kategori' => 'Badan',
            'is_active' => true,
            'urutan' => 2,
        ]);

        $this->superadmin = User::factory()->create([
            'name' => 'Super Administrator',
            'email' => 'superadmin@pemda.go.id',
            'nip' => '198001012005011001',
            'phone' => '081100000001',
            'jabatan' => 'Pegawai',
            'role' => 'Superadmin',
            'status' => 'active',
        ]);
        $this->superadmin->assignRole('Superadmin');
    }

    protected function getToken(): string
    {
        return $this->superadmin->createToken('test', ['*'])->plainTextToken;
    }

    public function test_can_create_pegawai_without_account_and_sync_kepala_opd(): void
    {
        $token = $this->getToken();

        $response = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->postJson('/api/pegawai', [
                'name' => 'Dr. H. Ahmad Fauzi, M.Si.',
                'email' => 'ahmad.fauzi@pemda.go.id',
                'nip' => '197505102000031001',
                'phone' => '081234567001',
                'opd_id' => $this->opdA->id,
                'pangkat_gol' => 'Pembina Utama Muda (IV/c)',
                'jabatan' => 'Kepala OPD',
            ]);

        $response->assertCreated()
            ->assertJsonPath('data.name', 'Dr. H. Ahmad Fauzi, M.Si.')
            ->assertJsonPath('data.jabatan', 'Kepala OPD')
            ->assertJsonPath('data.has_account', false)
            ->assertJsonPath('data.role', null)
            ->assertJsonPath('data.status', null);

        // Verify OPD kepala is automatically synced
        $this->opdA->refresh();
        $this->assertEquals('Dr. H. Ahmad Fauzi, M.Si.', $this->opdA->kepala);
    }

    public function test_pegawai_jabatan_only_allows_kepala_opd_or_pegawai_and_enforces_unique_phone(): void
    {
        $token = $this->getToken();

        // Invalid jabatan
        $invalidJabatan = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->postJson('/api/pegawai', [
                'name' => 'Pegawai Uji',
                'email' => 'uji@pemda.go.id',
                'nip' => '199001012020011001',
                'phone' => '081234567002',
                'opd_id' => $this->opdA->id,
                'pangkat_gol' => 'Penata Muda (III/a)',
                'jabatan' => 'Sekretaris Dinas',
            ]);

        $invalidJabatan->assertStatus(422)
            ->assertJsonValidationErrors(['jabatan']);

        // Duplicate phone number
        $duplicatePhone = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->postJson('/api/pegawai', [
                'name' => 'Pegawai Duplikat WA',
                'email' => 'duplikat.wa@pemda.go.id',
                'nip' => '199001012020011009',
                'phone' => '081100000001', // already used by superadmin
                'opd_id' => $this->opdA->id,
                'pangkat_gol' => 'Penata Muda (III/a)',
                'jabatan' => 'Pegawai',
            ]);

        $duplicatePhone->assertStatus(422)
            ->assertJsonValidationErrors(['phone']);
    }

    public function test_only_one_kepala_opd_per_opd_and_handover_mechanism_works(): void
    {
        $token = $this->getToken();

        // 1. Create first Kepala OPD on OPD A
        $firstResponse = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->postJson('/api/pegawai', [
                'name' => 'Pejabat Lama, M.T.',
                'email' => 'pejabat.lama@pemda.go.id',
                'nip' => '197601012001011001',
                'phone' => '081299990001',
                'opd_id' => $this->opdA->id,
                'pangkat_gol' => 'Pembina Tingkat I (IV/b)',
                'jabatan' => 'Kepala OPD',
            ]);
        $firstResponse->assertCreated();
        $firstKepalaId = $firstResponse->json('data.id');

        // 2. Check Kepala OPD endpoint returns Pejabat Lama
        $checkRes = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->getJson("/api/pegawai/check-kepala/{$this->opdA->id}");
        $checkRes->assertOk()
            ->assertJsonPath('has_kepala', true)
            ->assertJsonPath('kepala.id', $firstKepalaId);

        // 3. Attempt to create second Kepala OPD without replace_kepala confirmation -> must fail 422
        $blockedResponse = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->postJson('/api/pegawai', [
                'name' => 'Pejabat Baru, M.Kom.',
                'email' => 'pejabat.baru@pemda.go.id',
                'nip' => '198002022005011002',
                'phone' => '081299990002',
                'opd_id' => $this->opdA->id,
                'pangkat_gol' => 'Pembina Tingkat I (IV/b)',
                'jabatan' => 'Kepala OPD',
                'replace_kepala' => false,
            ]);
        $blockedResponse->assertStatus(422)
            ->assertJsonValidationErrors(['jabatan']);

        // 4. Create second Kepala OPD WITH replace_kepala = true -> atomic handover!
        $handoverResponse = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->postJson('/api/pegawai', [
                'name' => 'Pejabat Baru, M.Kom.',
                'email' => 'pejabat.baru@pemda.go.id',
                'nip' => '198002022005011002',
                'phone' => '081299990002',
                'opd_id' => $this->opdA->id,
                'pangkat_gol' => 'Pembina Tingkat I (IV/b)',
                'jabatan' => 'Kepala OPD',
                'replace_kepala' => true,
            ]);
        $handoverResponse->assertCreated()
            ->assertJsonPath('data.jabatan', 'Kepala OPD');

        $secondKepalaId = $handoverResponse->json('data.id');

        // Verify Pejabat Lama was automatically demoted to 'Pegawai'
        $this->assertDatabaseHas('users', [
            'id' => $firstKepalaId,
            'jabatan' => 'Pegawai',
        ]);

        // Verify OPD A kepala was updated to Pejabat Baru
        $this->opdA->refresh();
        $this->assertEquals('Pejabat Baru, M.Kom.', $this->opdA->kepala);

        // Verify Audit Log recorded the handover
        $this->assertDatabaseHas('audit_logs', [
            'action' => 'PEGAWAI_HANDOVER_KEPALA_OPD',
            'module' => 'Manajemen Pegawai',
        ]);

        // 5. Mutate Pejabat Baru from OPD A to OPD B as Kepala OPD
        $mutateResponse = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->putJson("/api/pegawai/{$secondKepalaId}", [
                'name' => 'Pejabat Baru, M.Kom.',
                'email' => 'pejabat.baru@pemda.go.id',
                'nip' => '198002022005011002',
                'phone' => '081299990002',
                'opd_id' => $this->opdB->id,
                'pangkat_gol' => 'Pembina Tingkat I (IV/b)',
                'jabatan' => 'Kepala OPD',
            ]);
        $mutateResponse->assertOk();

        // OPD A kepala must now be null, and OPD B kepala must be Pejabat Baru
        $this->opdA->refresh();
        $this->opdB->refresh();
        $this->assertNull($this->opdA->kepala);
        $this->assertEquals('Pejabat Baru, M.Kom.', $this->opdB->kepala);
    }

    public function test_user_account_lifecycle_assign_update_and_revoke_preserves_pegawai(): void
    {
        $token = $this->getToken();

        // 1. Create a Pegawai without account
        $pegawaiRes = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->postJson('/api/pegawai', [
                'name' => 'Siti Aminah, S.E.',
                'email' => 'siti.aminah@pemda.go.id',
                'nip' => '199204122019032005',
                'phone' => '081355556666',
                'opd_id' => $this->opdA->id,
                'pangkat_gol' => 'Penata Muda Tingkat I (III/b)',
                'jabatan' => 'Pegawai',
            ]);
        $pegawaiRes->assertCreated();
        $pegawaiId = $pegawaiRes->json('data.id');

        // 2. Pegawai without account must NOT appear in /api/user-accounts list
        $listBefore = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->getJson('/api/user-accounts');
        $listBefore->assertOk();
        $accountIdsBefore = collect($listBefore->json('data'))->pluck('id')->all();
        $this->assertNotContains($pegawaiId, $accountIdsBefore);

        // 3. Assign user account to Siti Aminah
        $assignRes = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->postJson('/api/user-accounts', [
                'pegawai_id' => $pegawaiId,
                'role' => 'OPD',
                'password' => 'Password@123',
                'status' => 'active',
            ]);
        $assignRes->assertCreated()
            ->assertJsonPath('data.id', $pegawaiId)
            ->assertJsonPath('data.role', 'OPD')
            ->assertJsonPath('data.status', 'active')
            ->assertJsonPath('data.has_account', true);

        // 4. Attempting to assign a second account to the same Pegawai must fail 422
        $dupAssignRes = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->postJson('/api/user-accounts', [
                'pegawai_id' => $pegawaiId,
                'role' => 'OPD',
                'password' => 'Password@123',
                'status' => 'active',
            ]);
        $dupAssignRes->assertStatus(422)
            ->assertJsonValidationErrors(['pegawai_id']);

        // 5. Update user account status to inactive and change role to Auditor
        $updateRes = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->putJson("/api/user-accounts/{$pegawaiId}", [
                'role' => 'Auditor',
                'status' => 'inactive',
            ]);
        $updateRes->assertOk()
            ->assertJsonPath('data.role', 'Auditor')
            ->assertJsonPath('data.status', 'inactive');

        // 6. Status other than active/inactive must fail 422
        $invalidStatusRes = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->putJson("/api/user-accounts/{$pegawaiId}", [
                'role' => 'Auditor',
                'status' => 'suspended',
            ]);
        $invalidStatusRes->assertStatus(422)
            ->assertJsonValidationErrors(['status']);

        // 7. Revoke (delete) user account -> must preserve Pegawai record in database!
        $revokeRes = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->deleteJson("/api/user-accounts/{$pegawaiId}");
        $revokeRes->assertOk();

        // Pegawai still exists in database, but has_account is false
        $this->assertDatabaseHas('users', [
            'id' => $pegawaiId,
            'name' => 'Siti Aminah, S.E.',
            'nip' => '199204122019032005',
            'password' => null,
            'role' => null,
            'status' => null,
        ]);
    }

    public function test_can_create_direct_user_account_for_bupati_without_nip(): void
    {
        $token = $this->getToken();

        $response = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->postJson('/api/user-accounts', [
                'account_type' => 'direct',
                'name' => 'Bupati H. Syamsuddin, S.E., M.Si.',
                'email' => 'bupati@pemda.go.id',
                'jabatan' => 'Bupati',
                'nip' => null,
                'role' => 'Executive',
                'password' => 'Password@123',
                'status' => 'active',
            ]);

        $response->assertCreated()
            ->assertJsonPath('data.name', 'Bupati H. Syamsuddin, S.E., M.Si.')
            ->assertJsonPath('data.email', 'bupati@pemda.go.id')
            ->assertJsonPath('data.jabatan', 'Bupati')
            ->assertJsonPath('data.nip', null)
            ->assertJsonPath('data.role', 'Executive')
            ->assertJsonPath('data.status', 'active')
            ->assertJsonPath('data.has_account', true);

        $this->assertDatabaseHas('users', [
            'email' => 'bupati@pemda.go.id',
            'jabatan' => 'Bupati',
            'nip' => null,
            'role' => 'Executive',
            'status' => 'active',
        ]);
    }

    public function test_can_create_direct_user_account_for_sekda_with_nip(): void
    {
        $token = $this->getToken();

        $response = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->postJson('/api/user-accounts', [
                'account_type' => 'direct',
                'name' => 'Drs. H. Hendra Wijaya, M.Si.',
                'email' => 'sekda@pemda.go.id',
                'jabatan' => 'Sekretaris Daerah',
                'nip' => '196803151992031004',
                'opd_id' => $this->opdA->id,
                'role' => 'Executive',
                'password' => 'Password@123',
                'status' => 'active',
            ]);

        $response->assertCreated()
            ->assertJsonPath('data.name', 'Drs. H. Hendra Wijaya, M.Si.')
            ->assertJsonPath('data.email', 'sekda@pemda.go.id')
            ->assertJsonPath('data.jabatan', 'Sekretaris Daerah')
            ->assertJsonPath('data.nip', '196803151992031004')
            ->assertJsonPath('data.role', 'Executive')
            ->assertJsonPath('data.status', 'active');
    }
}
