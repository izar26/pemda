<?php

declare(strict_types=1);

namespace Tests\Feature\Perencanaan;

use App\Models\AuditLog;
use App\Models\Perencanaan\PeriodePenilaian;
use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PeriodePenilaianTest extends TestCase
{
    use RefreshDatabase;

    protected User $admin;
    protected User $staff;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(\Database\Seeders\RbacSeeder::class);

        $this->admin = User::factory()->create([
            'role' => 'superadmin',
            'status' => 'active',
        ]);
        $this->admin->assignRole('Superadmin');

        $this->staff = User::factory()->create([
            'role' => 'staff',
            'status' => 'active',
        ]);
    }

    public function test_unauthenticated_user_cannot_access_periode_endpoints(): void
    {
        $response = $this->getJson('/api/perencanaan/periode');
        $response->assertStatus(401);
    }

    public function test_user_without_permission_cannot_view_periode(): void
    {
        $response = $this->actingAs($this->staff)->getJson('/api/perencanaan/periode');
        $response->assertStatus(403);
    }

    public function test_authorized_user_can_view_paginated_periods(): void
    {
        PeriodePenilaian::create([
            'nama_periode' => 'RPJMD 2026 - 2030',
            'tahun_mulai' => 2026,
            'tahun_akhir' => 2030,
            'tahun_penilaian' => 2027,
            'tanggal_mulai' => '2027-01-02',
            'tanggal_akhir' => '2027-12-30',
            'status' => 'aktif',
        ]);

        $response = $this->actingAs($this->admin)->getJson('/api/perencanaan/periode');
        $response->assertStatus(200)
            ->assertJsonStructure([
                'data' => [
                    '*' => [
                        'id',
                        'nama_periode',
                        'tahun_mulai',
                        'tahun_akhir',
                        'tahun_penilaian',
                        'rentang_tahun',
                        'tanggal_mulai',
                        'tanggal_akhir',
                        'status',
                        'is_aktif',
                        'sisa_hari',
                    ],
                ],
                'meta' => [
                    'current_page',
                    'total',
                ],
            ]);
    }

    public function test_can_fetch_active_period(): void
    {
        PeriodePenilaian::create([
            'nama_periode' => 'RPJMD 2026 - 2030',
            'tahun_mulai' => 2026,
            'tahun_akhir' => 2030,
            'tahun_penilaian' => 2027,
            'tanggal_mulai' => '2027-01-02',
            'tanggal_akhir' => '2027-12-30',
            'status' => 'aktif',
        ]);

        $response = $this->actingAs($this->admin)->getJson('/api/perencanaan/periode/active');
        $response->assertStatus(200)
            ->assertJsonPath('data.tahun_penilaian', 2027)
            ->assertJsonPath('data.is_aktif', true);
    }

    public function test_can_fetch_period_stats(): void
    {
        PeriodePenilaian::create([
            'nama_periode' => 'RPJMD 2026 - 2030',
            'tahun_mulai' => 2026,
            'tahun_akhir' => 2030,
            'tahun_penilaian' => 2027,
            'tanggal_mulai' => '2027-01-02',
            'tanggal_akhir' => '2027-12-30',
            'status' => 'aktif',
        ]);

        PeriodePenilaian::create([
            'nama_periode' => 'RPJMD 2021 - 2025',
            'tahun_mulai' => 2021,
            'tahun_akhir' => 2025,
            'tahun_penilaian' => 2025,
            'tanggal_mulai' => '2025-01-02',
            'tanggal_akhir' => '2025-12-31',
            'status' => 'arsip',
        ]);

        $response = $this->actingAs($this->admin)->getJson('/api/perencanaan/periode/stats');
        $response->assertStatus(200)
            ->assertJsonPath('total', 2)
            ->assertJsonPath('aktif.tahun_penilaian', 2027)
            ->assertJsonPath('arsip', 1)
            ->assertJsonPath('tidak_aktif', 0);
    }

    public function test_can_create_new_period(): void
    {
        $payload = [
            'nama_periode' => 'RPJMD 2026 - 2030',
            'tahun_mulai' => 2026,
            'tahun_akhir' => 2030,
            'tahun_penilaian' => 2027,
            'tanggal_mulai' => '2027-01-02',
            'tanggal_akhir' => '2027-12-30',
            'status' => 'aktif',
            'keterangan' => 'Uji coba periode baru',
        ];

        $response = $this->actingAs($this->admin)->postJson('/api/perencanaan/periode', $payload);
        $response->assertStatus(201)
            ->assertJsonPath('data.nama_periode', 'RPJMD 2026 - 2030')
            ->assertJsonPath('data.tahun_penilaian', 2027)
            ->assertJsonPath('data.is_aktif', true);

        $this->assertDatabaseHas('periode_penilaians', [
            'tahun_mulai' => 2026,
            'tahun_penilaian' => 2027,
            'status' => 'aktif',
        ]);
    }

    public function test_creating_active_period_deactivates_other_active_periods(): void
    {
        $old = PeriodePenilaian::create([
            'nama_periode' => 'RPJMD 2021 - 2025',
            'tahun_mulai' => 2021,
            'tahun_akhir' => 2025,
            'tahun_penilaian' => 2024,
            'tanggal_mulai' => '2024-01-02',
            'tanggal_akhir' => '2024-12-30',
            'status' => 'aktif',
        ]);

        $payload = [
            'nama_periode' => 'RPJMD 2026 - 2030',
            'tahun_mulai' => 2026,
            'tahun_akhir' => 2030,
            'tahun_penilaian' => 2027,
            'tanggal_mulai' => '2027-01-02',
            'tanggal_akhir' => '2027-12-30',
            'status' => 'aktif',
        ];

        $response = $this->actingAs($this->admin)->postJson('/api/perencanaan/periode', $payload);
        $response->assertStatus(201);

        $this->assertEquals('arsip', $old->fresh()->status);
        $this->assertEquals(1, PeriodePenilaian::where('status', 'aktif')->count());
    }

    public function test_cannot_create_period_with_invalid_tahun_penilaian(): void
    {
        // tahun_penilaian 2035 is outside 2026-2030
        $payload = [
            'nama_periode' => 'RPJMD 2026 - 2030',
            'tahun_mulai' => 2026,
            'tahun_akhir' => 2030,
            'tahun_penilaian' => 2035,
            'tanggal_mulai' => '2035-01-02',
            'tanggal_akhir' => '2035-12-30',
            'status' => 'aktif',
        ];

        $response = $this->actingAs($this->admin)->postJson('/api/perencanaan/periode', $payload);
        $response->assertStatus(422)
            ->assertJsonValidationErrors(['tahun_penilaian']);
    }

    public function test_cannot_create_period_with_mismatched_date_years(): void
    {
        // tanggal_mulai is 2028-01-02 but tahun_penilaian is 2027
        $payload = [
            'nama_periode' => 'RPJMD 2026 - 2030',
            'tahun_mulai' => 2026,
            'tahun_akhir' => 2030,
            'tahun_penilaian' => 2027,
            'tanggal_mulai' => '2028-01-02',
            'tanggal_akhir' => '2027-12-30',
            'status' => 'aktif',
        ];

        $response = $this->actingAs($this->admin)->postJson('/api/perencanaan/periode', $payload);
        $response->assertStatus(422)
            ->assertJsonValidationErrors(['tanggal_mulai']);
    }

    public function test_cannot_create_duplicate_period_and_evaluation_year(): void
    {
        PeriodePenilaian::create([
            'nama_periode' => 'RPJMD 2026 - 2030',
            'tahun_mulai' => 2026,
            'tahun_akhir' => 2030,
            'tahun_penilaian' => 2027,
            'tanggal_mulai' => '2027-01-02',
            'tanggal_akhir' => '2027-12-30',
            'status' => 'aktif',
        ]);

        $payload = [
            'nama_periode' => 'RPJMD Duplikat 2026 - 2030',
            'tahun_mulai' => 2026,
            'tahun_akhir' => 2030,
            'tahun_penilaian' => 2027,
            'tanggal_mulai' => '2027-01-02',
            'tanggal_akhir' => '2027-12-30',
            'status' => 'tidak_aktif',
        ];

        $response = $this->actingAs($this->admin)->postJson('/api/perencanaan/periode', $payload);
        $response->assertStatus(422)
            ->assertJsonValidationErrors(['tahun_penilaian']);
    }

    public function test_can_activate_period(): void
    {
        $p1 = PeriodePenilaian::create([
            'nama_periode' => 'RPJMD 2021 - 2025',
            'tahun_mulai' => 2021,
            'tahun_akhir' => 2025,
            'tahun_penilaian' => 2025,
            'tanggal_mulai' => '2025-01-02',
            'tanggal_akhir' => '2025-12-30',
            'status' => 'aktif',
        ]);

        $p2 = PeriodePenilaian::create([
            'nama_periode' => 'RPJMD 2026 - 2030',
            'tahun_mulai' => 2026,
            'tahun_akhir' => 2030,
            'tahun_penilaian' => 2026,
            'tanggal_mulai' => '2026-01-02',
            'tanggal_akhir' => '2026-12-30',
            'status' => 'tidak_aktif',
        ]);

        $response = $this->actingAs($this->admin)->patchJson("/api/perencanaan/periode/{$p2->id}/activate");
        $response->assertStatus(200);

        $this->assertEquals('arsip', $p1->fresh()->status);
        $this->assertEquals('aktif', $p2->fresh()->status);
    }

    public function test_cannot_delete_active_period(): void
    {
        $p = PeriodePenilaian::create([
            'nama_periode' => 'RPJMD 2026 - 2030',
            'tahun_mulai' => 2026,
            'tahun_akhir' => 2030,
            'tahun_penilaian' => 2027,
            'tanggal_mulai' => '2027-01-02',
            'tanggal_akhir' => '2027-12-30',
            'status' => 'aktif',
        ]);

        $response = $this->actingAs($this->admin)->deleteJson("/api/perencanaan/periode/{$p->id}");
        $response->assertStatus(422)
            ->assertJsonPath('message', 'Periode yang sedang aktif tidak dapat dihapus. Silakan nonaktifkan atau jadikan arsip terlebih dahulu.');

        $this->assertDatabaseHas('periode_penilaians', ['id' => $p->id]);
    }

    public function test_can_delete_inactive_period(): void
    {
        $p = PeriodePenilaian::create([
            'nama_periode' => 'RPJMD 2026 - 2030',
            'tahun_mulai' => 2026,
            'tahun_akhir' => 2030,
            'tahun_penilaian' => 2028,
            'tanggal_mulai' => '2028-01-02',
            'tanggal_akhir' => '2028-12-30',
            'status' => 'tidak_aktif',
        ]);

        $response = $this->actingAs($this->admin)->deleteJson("/api/perencanaan/periode/{$p->id}");
        $response->assertStatus(200);

        $this->assertDatabaseMissing('periode_penilaians', ['id' => $p->id]);
    }

    public function test_audit_log_records_period_creation(): void
    {
        $payload = [
            'nama_periode' => 'RPJMD 2026 - 2030',
            'tahun_mulai' => 2026,
            'tahun_akhir' => 2030,
            'tahun_penilaian' => 2027,
            'tanggal_mulai' => '2027-01-02',
            'tanggal_akhir' => '2027-12-30',
            'status' => 'aktif',
        ];

        $this->actingAs($this->admin)->postJson('/api/perencanaan/periode', $payload);

        $this->assertDatabaseHas('audit_logs', [
            'module' => 'Perencanaan Kinerja',
            'action' => 'PERIODE_PENILAIAN_CREATED',
        ]);
    }

    public function test_can_export_periods_to_excel(): void
    {
        PeriodePenilaian::create([
            'nama_periode' => 'RPJMD 2026 - 2030',
            'tahun_mulai' => 2026,
            'tahun_akhir' => 2030,
            'tahun_penilaian' => 2027,
            'tanggal_mulai' => '2027-01-02',
            'tanggal_akhir' => '2027-12-30',
            'status' => 'aktif',
        ]);

        $response = $this->actingAs($this->admin)->get('/api/perencanaan/periode/export');
        $response->assertStatus(200);
        $this->assertTrue(
            str_contains((string) $response->headers->get('content-type'), 'spreadsheet') ||
            str_contains((string) $response->headers->get('content-disposition'), 'Data_Periode_Penilaian')
        );
    }

    public function test_cannot_create_period_with_non_5_year_cycle(): void
    {
        $payload = [
            'tahun_mulai' => 2026,
            'tahun_akhir' => 2028, // Only 3 years, not 5
            'tahun_penilaian' => 2027,
            'tanggal_mulai' => '2027-01-02',
            'tanggal_akhir' => '2027-12-30',
            'status' => 'aktif',
        ];

        $response = $this->actingAs($this->admin)->postJson('/api/perencanaan/periode', $payload);
        $response->assertStatus(422)
            ->assertJsonValidationErrors(['tahun_akhir']);
    }

    public function test_auto_generates_nama_periode_if_omitted(): void
    {
        $payload = [
            'tahun_mulai' => 2026,
            'tahun_akhir' => 2030,
            'tahun_penilaian' => 2027,
            'tanggal_mulai' => '2027-01-02',
            'tanggal_akhir' => '2027-12-30',
            'status' => 'aktif',
        ];

        $response = $this->actingAs($this->admin)->postJson('/api/perencanaan/periode', $payload);
        $response->assertStatus(201)
            ->assertJsonPath('data.nama_periode', 'RPJMD 2026 - 2030');
    }

    public function test_get_active_or_throw_aborts_with_422_when_no_active_period(): void
    {
        $this->expectException(\Symfony\Component\HttpKernel\Exception\HttpException::class);
        $this->expectExceptionMessage('Tidak ada periode penilaian yang aktif saat ini.');

        PeriodePenilaian::getActiveOrThrow();
    }

    public function test_can_switch_tahun_penilaian_within_cycle(): void
    {
        $periode = PeriodePenilaian::create([
            'nama_periode' => 'RPJMD 2026 - 2030',
            'tahun_mulai' => 2026,
            'tahun_akhir' => 2030,
            'tahun_penilaian' => 2026,
            'tanggal_mulai' => '2026-01-02',
            'tanggal_akhir' => '2026-12-30',
            'status' => 'aktif',
        ]);

        $response = $this->actingAs($this->admin)->patchJson("/api/perencanaan/periode/{$periode->id}/switch-tahun", [
            'tahun_penilaian' => 2028,
        ]);

        $response->assertStatus(200)
            ->assertJsonPath('data.tahun_penilaian', 2028)
            ->assertJsonPath('data.tanggal_mulai', '2028-01-02')
            ->assertJsonPath('data.tanggal_akhir', '2028-12-30');

        $this->assertDatabaseHas('periode_penilaians', [
            'id' => $periode->id,
            'tahun_penilaian' => 2028,
            'status' => 'aktif',
        ]);
    }

    public function test_cannot_switch_tahun_outside_rpjmd_cycle(): void
    {
        $periode = PeriodePenilaian::create([
            'nama_periode' => 'RPJMD 2026 - 2030',
            'tahun_mulai' => 2026,
            'tahun_akhir' => 2030,
            'tahun_penilaian' => 2026,
            'tanggal_mulai' => '2026-01-02',
            'tanggal_akhir' => '2026-12-30',
            'status' => 'aktif',
        ]);

        $response = $this->actingAs($this->admin)->patchJson("/api/perencanaan/periode/{$periode->id}/switch-tahun", [
            'tahun_penilaian' => 2032,
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['tahun_penilaian']);
    }

    public function test_activating_new_period_auto_archives_past_periods(): void
    {
        $past = PeriodePenilaian::create([
            'nama_periode' => 'RPJMD 2021 - 2025',
            'tahun_mulai' => 2021,
            'tahun_akhir' => 2025,
            'tahun_penilaian' => 2025,
            'tanggal_mulai' => '2025-01-02',
            'tanggal_akhir' => '2025-12-30',
            'status' => 'aktif',
        ]);

        $current = PeriodePenilaian::create([
            'nama_periode' => 'RPJMD 2026 - 2030',
            'tahun_mulai' => 2026,
            'tahun_akhir' => 2030,
            'tahun_penilaian' => 2026,
            'tanggal_mulai' => '2026-01-02',
            'tanggal_akhir' => '2026-12-30',
            'status' => 'tidak_aktif',
        ]);

        $response = $this->actingAs($this->admin)->patchJson("/api/perencanaan/periode/{$current->id}/activate");
        $response->assertStatus(200)
            ->assertJsonPath('data.status', 'aktif');

        $this->assertEquals('aktif', $current->fresh()->status);
        $this->assertEquals('arsip', $past->fresh()->status);
    }

    public function test_switch_tahun_on_inactive_period_activates_it_and_archives_past(): void
    {
        $past = PeriodePenilaian::create([
            'nama_periode' => 'RPJMD 2021 - 2025',
            'tahun_mulai' => 2021,
            'tahun_akhir' => 2025,
            'tahun_penilaian' => 2025,
            'tanggal_mulai' => '2025-01-02',
            'tanggal_akhir' => '2025-12-30',
            'status' => 'aktif',
        ]);

        $current = PeriodePenilaian::create([
            'nama_periode' => 'RPJMD 2026 - 2030',
            'tahun_mulai' => 2026,
            'tahun_akhir' => 2030,
            'tahun_penilaian' => 2026,
            'tanggal_mulai' => '2026-01-02',
            'tanggal_akhir' => '2026-12-30',
            'status' => 'tidak_aktif',
        ]);

        $response = $this->actingAs($this->admin)->patchJson("/api/perencanaan/periode/{$current->id}/switch-tahun", [
            'tahun_penilaian' => 2029,
        ]);

        $response->assertStatus(200)
            ->assertJsonPath('data.status', 'aktif')
            ->assertJsonPath('data.tahun_penilaian', 2029);

        $this->assertEquals('aktif', $current->fresh()->status);
        $this->assertEquals(2029, $current->fresh()->tahun_penilaian);
        $this->assertEquals('arsip', $past->fresh()->status);
    }
}

