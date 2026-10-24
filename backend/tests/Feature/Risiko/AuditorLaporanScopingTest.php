<?php

declare(strict_types=1);

namespace Tests\Feature\Risiko;

use App\Models\Opd;
use App\Models\Pengawasan\AuditorOpdAssignment;
use App\Models\Perencanaan\PeriodePenilaian;
use App\Models\User;
use Database\Seeders\RbacSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AuditorLaporanScopingTest extends TestCase
{
    use RefreshDatabase;

    protected User $superadmin;
    protected User $inspektoratUser;
    protected User $auditorUser;
    protected Opd $opdAssigned;
    protected Opd $opdUnassigned;
    protected PeriodePenilaian $activePeriode;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RbacSeeder::class);

        $this->activePeriode = PeriodePenilaian::create([
            'nama_periode' => 'RPJMD 2026 - 2030',
            'tahun_mulai' => 2026,
            'tahun_akhir' => 2030,
            'tahun_penilaian' => 2026,
            'tanggal_mulai' => '2026-01-01',
            'tanggal_akhir' => '2026-12-31',
            'status' => 'aktif',
        ]);

        $this->opdAssigned = Opd::create([
            'nama' => 'Dinas Kesehatan Terbina',
            'kode' => 'DINKES',
            'kategori' => 'Dinas',
            'urutan' => 1,
            'is_active' => true,
        ]);

        $this->opdUnassigned = Opd::create([
            'nama' => 'Dinas Pendidikan Luar',
            'kode' => 'DISDIK',
            'kategori' => 'Dinas',
            'urutan' => 2,
            'is_active' => true,
        ]);

        $this->superadmin = User::factory()->create([
            'email' => 'superadmin_test@pemda.go.id',
            'status' => 'active',
        ]);
        $this->superadmin->assignRole('Superadmin');

        $this->inspektoratUser = User::factory()->create([
            'email' => 'inspektorat_test@pemda.go.id',
            'status' => 'active',
        ]);
        $this->inspektoratUser->assignRole('Inspektorat');

        $this->auditorUser = User::factory()->create([
            'email' => 'auditor_scoped@pemda.go.id',
            'status' => 'active',
        ]);
        $this->auditorUser->assignRole('Auditor');

        // Assign auditor to opdAssigned only
        AuditorOpdAssignment::create([
            'auditor_id' => $this->auditorUser->id,
            'opd_id' => $this->opdAssigned->id,
            'periode_penilaian_id' => $this->activePeriode->id,
            'nomor_surat_tugas' => 'ST/001/AUDIT/2026',
            'tanggal_mulai' => '2026-01-01',
            'tanggal_selesai' => '2026-12-31',
            'is_active' => true,
        ]);
    }

    public function test_opd_dropdown_with_assigned_only_filters_for_scoped_auditor(): void
    {
        $response = $this->actingAs($this->auditorUser, 'sanctum')
            ->getJson('/api/opds?all=true&assigned_only=true');

        $response->assertOk();
        $data = $response->json('data');

        $this->assertCount(1, $data);
        $this->assertEquals($this->opdAssigned->id, $data[0]['id']);
    }

    public function test_opd_dropdown_without_param_automatically_filters_for_scoped_auditor(): void
    {
        $response = $this->actingAs($this->auditorUser, 'sanctum')
            ->getJson('/api/opds?all=true');

        $response->assertOk();
        $data = $response->json('data');

        $this->assertCount(1, $data);
        $this->assertEquals($this->opdAssigned->id, $data[0]['id']);
    }

    public function test_opd_dropdown_for_superadmin_and_inspektorat_is_not_restricted(): void
    {
        $responseAdmin = $this->actingAs($this->superadmin, 'sanctum')
            ->getJson('/api/opds?all=true&assigned_only=true');

        $responseAdmin->assertOk();
        $this->assertCount(2, $responseAdmin->json('data'));

        $responseInspektorat = $this->actingAs($this->inspektoratUser, 'sanctum')
            ->getJson('/api/opds?all=true&assigned_only=true');

        $responseInspektorat->assertOk();
        $this->assertCount(2, $responseInspektorat->json('data'));
    }

    public function test_scoped_auditor_can_access_current_form_2b_for_assigned_opd(): void
    {
        $response = $this->actingAs($this->auditorUser, 'sanctum')
            ->getJson('/api/risiko/konteks-strategis/current?opd_id=' . $this->opdAssigned->id);

        $response->assertOk();
    }

    public function test_scoped_auditor_cannot_access_current_form_2b_for_unassigned_opd(): void
    {
        $response = $this->actingAs($this->auditorUser, 'sanctum')
            ->getJson('/api/risiko/konteks-strategis/current?opd_id=' . $this->opdUnassigned->id);

        $response->assertForbidden();
    }

    public function test_scoped_auditor_can_access_current_form_2c_for_assigned_opd(): void
    {
        $response = $this->actingAs($this->auditorUser, 'sanctum')
            ->getJson('/api/risiko/konteks-operasional/current?opd_id=' . $this->opdAssigned->id);

        $response->assertOk();
    }

    public function test_scoped_auditor_cannot_access_current_form_2c_for_unassigned_opd(): void
    {
        $response = $this->actingAs($this->auditorUser, 'sanctum')
            ->getJson('/api/risiko/konteks-operasional/current?opd_id=' . $this->opdUnassigned->id);

        $response->assertForbidden();
    }
}
