<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\Opd;
use App\Models\Permission;
use App\Models\Role;
use App\Models\User;
use Database\Seeders\RbacSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class OpdManagementTest extends TestCase
{
    use RefreshDatabase;

    protected User $superadmin;
    protected User $operator;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RbacSeeder::class);

        $this->superadmin = User::factory()->create([
            'email' => 'admin@pemda.go.id',
            'role' => 'Superadmin',
            'status' => 'active',
            'two_factor_secret' => null,
            'two_factor_confirmed_at' => null,
        ]);
        $this->superadmin->assignRole('Superadmin');

        $this->operator = User::factory()->create([
            'email' => 'operator@pemda.go.id',
            'role' => 'Operator',
            'status' => 'active',
            'two_factor_secret' => null,
            'two_factor_confirmed_at' => null,
        ]);
    }

    public function test_public_user_can_access_active_opd_dropdown_list(): void
    {
        Opd::create(['nama' => 'Dinas A', 'kode' => 'DIS-A', 'kategori' => 'Dinas', 'is_active' => true, 'urutan' => 1]);
        Opd::create(['nama' => 'Dinas Inactive', 'kode' => 'DIS-INA', 'kategori' => 'Dinas', 'is_active' => false, 'urutan' => 2]);

        $response = $this->getJson('/api/opds');
        $response->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonFragment(['kode' => 'DIS-A'])
            ->assertJsonMissing(['kode' => 'DIS-INA']);
    }

    public function test_user_without_opd_view_permission_cannot_access_management_list(): void
    {
        $response = $this->actingAs($this->operator)
            ->getJson('/api/opds?page=1&per_page=10');

        $response->assertForbidden();
    }

    public function test_authorized_user_can_view_paginated_opds_with_filters(): void
    {
        Opd::create(['nama' => 'Dinas Kesehatan', 'kode' => 'DINKES', 'kategori' => 'Dinas', 'is_active' => true, 'urutan' => 1]);
        Opd::create(['nama' => 'Badan Keuangan', 'kode' => 'BKD', 'kategori' => 'Badan', 'is_active' => true, 'urutan' => 2]);

        $token = $this->superadmin->createToken('test')->plainTextToken;
        $response = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->getJson('/api/opds?kategori=Dinas&search=Kesehatan&per_page=100');

        $response->assertOk()
            ->assertJsonPath('meta.total', 1)
            ->assertJsonFragment(['kode' => 'DINKES'])
            ->assertJsonMissing(['kode' => 'BKD']);
    }

    public function test_authorized_user_can_get_opd_statistics(): void
    {
        Opd::create(['nama' => 'Dinas 1', 'kode' => 'D1', 'kategori' => 'Dinas', 'is_active' => true, 'urutan' => 1]);
        Opd::create(['nama' => 'Badan 1', 'kode' => 'B1', 'kategori' => 'Badan', 'is_active' => false, 'urutan' => 2]);

        $response = $this->actingAs($this->superadmin)
            ->getJson('/api/opds/stats');

        $response->assertOk()
            ->assertJsonStructure(['total', 'active', 'inactive', 'by_kategori', 'total_pegawai'])
            ->assertJson(['total' => 2, 'active' => 1, 'inactive' => 1]);
    }

    public function test_authorized_user_can_create_opd(): void
    {
        $payload = [
            'nama' => 'Dinas Komunikasi dan Informatika Baru',
            'kode' => 'DISKOMINFO-TEST',
            'kategori' => 'Dinas',
            'kepala' => 'Dr. H. Ahmad Fauzi, M.T.',
            'urutan' => 5,
            'is_active' => true,
        ];

        $response = $this->actingAs($this->superadmin)
            ->postJson('/api/opds', $payload);

        $response->assertCreated()
            ->assertJsonPath('data.kode', 'DISKOMINFO-TEST');

        $this->assertDatabaseHas('opds', ['kode' => 'DISKOMINFO-TEST']);
    }

    public function test_authorized_user_can_update_and_toggle_opd(): void
    {
        $opd = Opd::create([
            'nama' => 'Dinas Pendidikan',
            'kode' => 'DISDIK',
            'kategori' => 'Dinas',
            'is_active' => true,
            'urutan' => 1,
        ]);

        // Update
        $response = $this->actingAs($this->superadmin)
            ->putJson("/api/opds/{$opd->id}", [
                'nama' => 'Dinas Pendidikan & Kebudayaan',
                'kode' => 'DISDIK',
                'kategori' => 'Dinas',
                'kepala' => 'Prof. Dr. Ir. Budi Santoso',
                'is_active' => true,
            ]);

        $response->assertOk()
            ->assertJsonPath('data.nama', 'Dinas Pendidikan & Kebudayaan')
            ->assertJsonPath('data.kepala', 'Prof. Dr. Ir. Budi Santoso');

        // Toggle
        $toggleResp = $this->actingAs($this->superadmin)
            ->patchJson("/api/opds/{$opd->id}/toggle");

        $toggleResp->assertOk()
            ->assertJsonPath('data.is_active', false);
    }

    public function test_cannot_delete_opd_with_assigned_users(): void
    {
        $opd = Opd::create([
            'nama' => 'Inspektorat Daerah',
            'kode' => 'ITDA',
            'kategori' => 'Inspektorat',
            'is_active' => true,
            'urutan' => 1,
        ]);

        User::factory()->create([
            'email' => 'auditor@pemda.go.id',
            'opd_id' => $opd->id,
        ]);

        $response = $this->actingAs($this->superadmin)
            ->deleteJson("/api/opds/{$opd->id}");

        $response->assertStatus(422)
            ->assertJsonFragment(['message' => 'Tidak dapat menghapus OPD ini karena masih terdapat pegawai yang ditugaskan di instansi ini.']);

        $this->assertDatabaseHas('opds', ['id' => $opd->id]);
    }

    public function test_can_delete_opd_without_assigned_users(): void
    {
        $opd = Opd::create([
            'nama' => 'Kantor Baru',
            'kode' => 'KB',
            'kategori' => 'Kantor',
            'is_active' => true,
            'urutan' => 1,
        ]);

        $response = $this->actingAs($this->superadmin)
            ->deleteJson("/api/opds/{$opd->id}");

        $response->assertOk()
            ->assertJsonFragment(['message' => 'Perangkat daerah berhasil dihapus.']);

        $this->assertDatabaseMissing('opds', ['id' => $opd->id]);
    }
}
