<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\AuditLog;
use App\Models\Perencanaan\PeriodePenilaian;
use App\Models\Perencanaan\PeriodePerencanaan;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PeriodePenilaianTest extends TestCase
{
    use RefreshDatabase;

    protected User $admin;
    protected User $opdUser;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed();

        $this->admin = User::where('email', 'admin@pemda.go.id')->first();

        // Seed initial cycle 2026-2030
        $cycle = PeriodePerencanaan::create([
            'nama' => 'RPJMD 2026 - 2030',
            'tahun_mulai' => 2026,
            'tahun_selesai' => 2030,
            'durasi_tahun' => 5,
            'status' => 'active',
        ]);
        for ($y = 2026; $y <= 2030; $y++) {
            PeriodePenilaian::create([
                'periode_perencanaan_id' => $cycle->id,
                'periode' => '2026-2030',
                'tahun' => $y,
                'tanggal_mulai' => "{$y}-01-01",
                'tanggal_berakhir' => "{$y}-12-31",
                'status' => $y === 2026 ? 'active' : 'inactive',
            ]);
        }

        // Create an OPD user with only 'perencanaan.view'
        $this->opdUser = User::factory()->create([
            'email' => 'opd@pemda.go.id',
            'status' => 'active',
        ]);
        $this->opdUser->assignRole('OPD');
    }

    public function test_can_list_periode_and_active_year(): void
    {
        $response = $this->actingAs($this->admin)->getJson('/api/perencanaan/periode');

        $response->assertStatus(200)
            ->assertJsonStructure([
                'data',
                'flat',
                'active',
                'can_manage',
            ]);
    }

    public function test_anti_overlap_validation_rejects_clashing_cycles(): void
    {
        // Existing is 2026-2030 (from migration backfill)
        // Trying to create 2025-2027 should fail (overlaps 2026-2027)
        $response = $this->actingAs($this->admin)->postJson('/api/perencanaan/periode', [
            'nama' => 'RPJMD Bentrok',
            'tahun_mulai' => 2025,
            'tahun_selesai' => 2027,
            'status' => 'inactive',
        ]);

        $response->assertStatus(422)
            ->assertJsonFragment([
                'message' => "Rentang tahun 2025 - 2027 bentrok dengan siklus 'RPJMD 2026 - 2030' (2026 - 2030). Periode perencanaan tidak boleh tumpang tindih.",
            ]);
    }

    public function test_can_create_valid_cycle_and_auto_generates_evaluation_years(): void
    {
        // Cycle 2031-2035 does not overlap with 2026-2030
        $response = $this->actingAs($this->admin)->postJson('/api/perencanaan/periode', [
            'nama' => 'RPJMD Periode V',
            'tahun_mulai' => 2031,
            'tahun_selesai' => 2035,
            'tahun_aktif' => 2031,
            'status' => 'inactive',
            'keterangan' => 'Rencana pembangunan tahap 5',
        ]);

        $response->assertStatus(201);

        $createdCycle = PeriodePerencanaan::where('tahun_mulai', 2031)->first();
        $this->assertNotNull($createdCycle);
        $this->assertEquals(5, $createdCycle->durasi_tahun);

        // Check that 5 child years were automatically generated
        $years = PeriodePenilaian::where('periode_perencanaan_id', $createdCycle->id)->get();
        $this->assertCount(5, $years);
        $this->assertEquals([2031, 2032, 2033, 2034, 2035], $years->pluck('tahun')->sort()->values()->all());

        // Verify Audit Log was recorded for the new cycle
        $audit = AuditLog::where('auditable_id', $createdCycle->id)->first();
        $this->assertNotNull($audit);
        $this->assertStringContainsString('RPJMD Periode V', $audit->description);
    }

    public function test_can_switch_active_year_with_one_click(): void
    {
        $cycle = PeriodePerencanaan::first();
        $targetYear = PeriodePenilaian::where('periode_perencanaan_id', $cycle->id)
            ->where('tahun', 2027)
            ->first();

        $response = $this->actingAs($this->admin)->patchJson("/api/perencanaan/periode/{$cycle->id}/activate-year/{$targetYear->id}");

        $response->assertStatus(200);

        // Verify target year is now active
        $this->assertEquals('active', $targetYear->fresh()->status);

        // Verify other years in that cycle are inactive
        $otherYears = PeriodePenilaian::where('periode_perencanaan_id', $cycle->id)
            ->where('id', '!=', $targetYear->id)
            ->pluck('status');
        foreach ($otherYears as $status) {
            $this->assertEquals('inactive', $status);
        }

        // Verify Audit Log was recorded
        $audit = AuditLog::where('action', 'PERIODE_PENILAIAN_ACTIVATED')->latest()->first();
        $this->assertNotNull($audit);
        $this->assertStringContainsString('2027', $audit->description);
    }

    public function test_opd_cannot_create_or_activate_periode(): void
    {
        // OPD only has perencanaan.view, not perencanaan.periode
        $responseCreate = $this->actingAs($this->opdUser)->postJson('/api/perencanaan/periode', [
            'tahun_mulai' => 2031,
            'tahun_selesai' => 2035,
            'status' => 'inactive',
        ]);
        $responseCreate->assertStatus(403);

        $cycle = PeriodePerencanaan::first();
        $year = PeriodePenilaian::first();

        $responseActivate = $this->actingAs($this->opdUser)->patchJson("/api/perencanaan/periode/{$cycle->id}/activate-year/{$year->id}");
        $responseActivate->assertStatus(403);
    }

    public function test_rejects_malformed_periode_string_and_invalid_durations(): void
    {
        // 1. Bug reported by user: typing 2036-204040 must be strictly rejected
        $res1 = $this->actingAs($this->admin)->postJson('/api/perencanaan/periode', [
            'periode' => '2036-204040',
            'status' => 'inactive',
        ]);
        $res1->assertStatus(422);

        // 2. Trailing characters or incomplete string
        $res2 = $this->actingAs($this->admin)->postJson('/api/perencanaan/periode', [
            'periode' => '2036-abc',
            'status' => 'inactive',
        ]);
        $res2->assertStatus(422);

        // 3. Excessive duration (> 6 years)
        $res3 = $this->actingAs($this->admin)->postJson('/api/perencanaan/periode', [
            'periode' => '2036-2045',
            'status' => 'inactive',
        ]);
        $res3->assertStatus(422);
    }
}

