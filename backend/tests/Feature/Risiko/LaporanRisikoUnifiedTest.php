<?php

declare(strict_types=1);

namespace Tests\Feature\Risiko;

use App\Models\Opd;
use App\Models\Perencanaan\PeriodePenilaian;
use App\Models\Risiko\PengajuanPenilaianRisiko;
use App\Models\User;
use Database\Seeders\RbacSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class LaporanRisikoUnifiedTest extends TestCase
{
    use RefreshDatabase;

    protected User $superadmin;

    protected Opd $opd;

    protected PeriodePenilaian $periode;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RbacSeeder::class);

        $this->periode = PeriodePenilaian::create([
            'nama_periode' => 'RPJMD 2026 - 2030',
            'tahun_mulai' => 2026,
            'tahun_akhir' => 2030,
            'tahun_penilaian' => 2026,
            'tanggal_mulai' => '2026-01-01',
            'tanggal_akhir' => '2026-12-31',
            'is_active' => true,
            'status' => 'aktif',
        ]);

        $this->opd = Opd::create([
            'nama' => 'Dinas Kesehatan Kabupaten Cianjur',
            'kode' => '1.02.01',
            'kategori' => 'Dinas',
            'kepala' => 'Dr. H. Ahmad Fauzi, M.Kes',
            'is_active' => true,
            'urutan' => 1,
        ]);

        $this->superadmin = User::factory()->create([
            'name' => 'Superadmin Laporan',
            'email' => 'superadmin.laporan@pemda.test',
        ]);
        $this->superadmin->assignRole('Superadmin');
    }

    public function test_get_laporan_2b_returns_unified_structure(): void
    {
        $response = $this->actingAs($this->superadmin, 'sanctum')
            ->getJson("/api/risiko/laporan/2b?opd_id={$this->opd->id}&tahun=2026");

        $response->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.form_code', '2b')
            ->assertJsonPath('data.opd.id', $this->opd->id)
            ->assertJsonPath('data.audit_status.is_approved', false)
            ->assertJsonStructure([
                'data' => [
                    'form_code',
                    'form_title',
                    'opd' => ['id', 'nama', 'kode'],
                    'periode' => ['id', 'tahun', 'nama'],
                    'audit_status' => ['status', 'current_tier', 'is_approved'],
                    'penandatangan' => ['nama', 'nip', 'jabatan', 'tanggal'],
                    'content',
                ],
            ]);
    }

    public function test_get_laporan_2c_returns_unified_structure(): void
    {
        $response = $this->actingAs($this->superadmin, 'sanctum')
            ->getJson("/api/risiko/laporan/2c?opd_id={$this->opd->id}&tahun=2026");

        $response->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.form_code', '2c')
            ->assertJsonPath('data.opd.id', $this->opd->id);
    }

    public function test_export_excel_denied_when_submission_is_not_approved(): void
    {
        // Belum disetujui (submission draft)
        PengajuanPenilaianRisiko::create([
            'opd_id' => $this->opd->id,
            'periode_penilaian_id' => $this->periode->id,
            'status' => PengajuanPenilaianRisiko::STATUS_DRAFT,
            'current_tier' => PengajuanPenilaianRisiko::TIER_OPERATOR,
        ]);

        $response = $this->actingAs($this->superadmin, 'sanctum')
            ->get("/api/risiko/laporan/2b/export?opd_id={$this->opd->id}&tahun=2026");

        $response->assertForbidden();
    }

    public function test_export_excel_allowed_when_submission_is_approved(): void
    {
        // Status sudah Approved oleh Inspektorat
        PengajuanPenilaianRisiko::create([
            'opd_id' => $this->opd->id,
            'periode_penilaian_id' => $this->periode->id,
            'status' => PengajuanPenilaianRisiko::STATUS_APPROVED,
            'current_tier' => PengajuanPenilaianRisiko::TIER_COMPLETED,
            'approved_at' => now(),
            'approved_by' => $this->superadmin->id,
        ]);

        $response = $this->actingAs($this->superadmin, 'sanctum')
            ->get("/api/risiko/laporan/2b/export?opd_id={$this->opd->id}&tahun=2026");

        $response->assertOk();
        $this->assertStringContainsString('spreadsheetml.sheet', (string) $response->headers->get('Content-Type'));
    }
}
