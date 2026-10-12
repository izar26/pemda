<?php

declare(strict_types=1);

namespace Tests\Feature\Perencanaan;

use App\Models\Opd;
use App\Models\Perencanaan\PeriodePenilaian;
use App\Models\Perencanaan\TujuanPenilaian;
use App\Models\User;
use Database\Seeders\RbacSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class TujuanPenilaianTest extends TestCase
{
    use RefreshDatabase;

    protected User $admin;
    protected User $opdUser;
    protected PeriodePenilaian $activePeriode;
    protected Opd $puprOpd;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RbacSeeder::class);

        $this->puprOpd = Opd::create([
            'nama' => 'Dinas Pekerjaan Umum dan Penataan Ruang',
            'kode' => 'PUPR',
            'kategori' => 'Dinas',
            'urutan' => 1,
            'is_active' => true,
        ]);

        $this->admin = User::factory()->create([
            'email' => 'admin_test@pemda.go.id',
            'opd_id' => $this->puprOpd->id,
            'status' => 'active',
        ]);
        $this->admin->assignRole('Superadmin');

        $this->opdUser = User::factory()->create([
            'email' => 'opd_staff@pemda.go.id',
            'opd_id' => $this->puprOpd->id,
            'status' => 'active',
        ]);
        $this->opdUser->assignRole('OPD');

        $this->activePeriode = PeriodePenilaian::create([
            'nama_periode' => 'RPJMD 2026 - 2030',
            'tahun_mulai' => 2026,
            'tahun_akhir' => 2030,
            'tahun_penilaian' => 2028,
            'tanggal_mulai' => '2028-01-02',
            'tanggal_akhir' => '2028-12-30',
            'status' => 'aktif',
        ]);
    }

    public function test_can_list_tujuan_with_pagination(): void
    {
        TujuanPenilaian::create([
            'periode_penilaian_id' => $this->activePeriode->id,
            'opd_id' => $this->puprOpd->id,
            'kode_tujuan' => 'TUJ-01',
            'tujuan' => 'Meningkatkan kualitas jalan dan jembatan daerah',
            'urutan' => 1,
            'created_by' => $this->admin->id,
        ]);

        $response = $this->actingAs($this->admin)->getJson('/api/perencanaan/tujuan');

        $response->assertStatus(200)
            ->assertJsonStructure([
                'data' => [
                    '*' => [
                        'id',
                        'kode_tujuan',
                        'tujuan',
                        'urutan',
                        'opd' => ['id', 'nama', 'kode'],
                        'periode' => ['id', 'nama_periode', 'tahun_penilaian'],
                    ],
                ],
                'meta' => ['total', 'current_page', 'per_page'],
            ])
            ->assertJsonPath('meta.total', 1);
    }

    public function test_can_filter_tujuan_by_opd(): void
    {
        $otherOpd = Opd::create([
            'nama' => 'Dinas Kesehatan',
            'kode' => 'Dinkes',
            'kategori' => 'Dinas',
            'urutan' => 2,
            'is_active' => true,
        ]);

        TujuanPenilaian::create([
            'periode_penilaian_id' => $this->activePeriode->id,
            'opd_id' => $this->puprOpd->id,
            'kode_tujuan' => 'TUJ-01',
            'tujuan' => 'Tujuan PUPR',
            'urutan' => 1,
        ]);

        TujuanPenilaian::create([
            'periode_penilaian_id' => $this->activePeriode->id,
            'opd_id' => $otherOpd->id,
            'kode_tujuan' => 'TUJ-01',
            'tujuan' => 'Tujuan Dinkes',
            'urutan' => 1,
        ]);

        $response = $this->actingAs($this->admin)->getJson("/api/perencanaan/tujuan?opd_id={$this->puprOpd->id}");

        $response->assertStatus(200)
            ->assertJsonPath('meta.total', 1)
            ->assertJsonPath('data.0.opd.id', $this->puprOpd->id);
    }

    public function test_can_get_stats_tujuan(): void
    {
        TujuanPenilaian::create([
            'periode_penilaian_id' => $this->activePeriode->id,
            'opd_id' => $this->puprOpd->id,
            'kode_tujuan' => 'TUJ-01',
            'tujuan' => 'Tujuan PUPR 1',
            'urutan' => 1,
        ]);

        $response = $this->actingAs($this->admin)->getJson('/api/perencanaan/tujuan/stats');

        $response->assertStatus(200)
            ->assertJsonPath('total_tujuan', 1)
            ->assertJsonPath('opd_terpetakan', 1);
    }

    public function test_can_create_tujuan(): void
    {
        $payload = [
            'opd_id' => $this->puprOpd->id,
            'kode_tujuan' => 'TUJ-01',
            'tujuan' => 'Meningkatkan kualitas infrastruktur jalan dan drainase',
            'urutan' => 1,
            'keterangan' => 'Renstra Bab IV',
        ];

        $response = $this->actingAs($this->admin)->postJson('/api/perencanaan/tujuan', $payload);

        $response->assertStatus(201)
            ->assertJsonPath('data.tujuan', 'Meningkatkan kualitas infrastruktur jalan dan drainase')
            ->assertJsonPath('data.kode_tujuan', 'TUJ-01');

        $this->assertDatabaseHas('tujuan_penilaians', [
            'opd_id' => $this->puprOpd->id,
            'periode_penilaian_id' => $this->activePeriode->id,
            'kode_tujuan' => 'TUJ-01',
        ]);
    }

    public function test_cannot_create_tujuan_without_permission(): void
    {
        $payload = [
            'opd_id' => $this->puprOpd->id,
            'tujuan' => 'Tujuan Tanpa Izin',
        ];

        // OPD role only has risiko.view, not perencanaan.tujuan/cascading
        $response = $this->actingAs($this->opdUser)->postJson('/api/perencanaan/tujuan', $payload);

        $response->assertStatus(403);
    }

    public function test_can_update_tujuan(): void
    {
        $tujuan = TujuanPenilaian::create([
            'periode_penilaian_id' => $this->activePeriode->id,
            'opd_id' => $this->puprOpd->id,
            'kode_tujuan' => 'TUJ-01',
            'tujuan' => 'Tujuan Awal',
            'urutan' => 1,
        ]);

        $response = $this->actingAs($this->admin)->putJson("/api/perencanaan/tujuan/{$tujuan->id}", [
            'tujuan' => 'Tujuan Telah Diperbarui Sesuai Renstra Baru',
        ]);

        $response->assertStatus(200)
            ->assertJsonPath('data.tujuan', 'Tujuan Telah Diperbarui Sesuai Renstra Baru');

        $this->assertEquals('Tujuan Telah Diperbarui Sesuai Renstra Baru', $tujuan->fresh()->tujuan);
    }

    public function test_can_delete_tujuan(): void
    {
        $tujuan = TujuanPenilaian::create([
            'periode_penilaian_id' => $this->activePeriode->id,
            'opd_id' => $this->puprOpd->id,
            'kode_tujuan' => 'TUJ-01',
            'tujuan' => 'Tujuan Yang Akan Dihapus',
            'urutan' => 1,
        ]);

        $response = $this->actingAs($this->admin)->deleteJson("/api/perencanaan/tujuan/{$tujuan->id}");

        $response->assertStatus(200);
        $this->assertDatabaseMissing('tujuan_penilaians', ['id' => $tujuan->id]);
    }

    public function test_can_copy_tujuan_from_previous_period(): void
    {
        $pastPeriode = PeriodePenilaian::create([
            'nama_periode' => 'RPJMD 2021 - 2025',
            'tahun_mulai' => 2021,
            'tahun_akhir' => 2025,
            'tahun_penilaian' => 2025,
            'tanggal_mulai' => '2025-01-02',
            'tanggal_akhir' => '2025-12-30',
            'status' => 'arsip',
        ]);

        TujuanPenilaian::create([
            'periode_penilaian_id' => $pastPeriode->id,
            'opd_id' => $this->puprOpd->id,
            'kode_tujuan' => 'TUJ-01',
            'tujuan' => 'Tujuan Periode Lampau',
            'urutan' => 1,
        ]);

        $response = $this->actingAs($this->admin)->postJson('/api/perencanaan/tujuan/copy', [
            'source_periode_id' => $pastPeriode->id,
        ]);

        $response->assertStatus(200)
            ->assertJsonPath('copied_count', 1);

        $this->assertDatabaseHas('tujuan_penilaians', [
            'periode_penilaian_id' => $this->activePeriode->id,
            'tujuan' => 'Tujuan Periode Lampau',
        ]);
    }

    public function test_can_export_tujuan_to_excel(): void
    {
        TujuanPenilaian::create([
            'periode_penilaian_id' => $this->activePeriode->id,
            'opd_id' => $this->puprOpd->id,
            'kode_tujuan' => 'TUJ-01',
            'tujuan' => 'Tujuan Export Excel',
            'urutan' => 1,
        ]);

        $response = $this->actingAs($this->admin)->get('/api/perencanaan/tujuan/export');

        $response->assertStatus(200);
        $this->assertTrue(
            str_contains((string) $response->headers->get('content-type'), 'spreadsheet') ||
            str_contains((string) $response->headers->get('content-disposition'), 'Data_Tujuan_Renstra_OPD')
        );
    }
}
