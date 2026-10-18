<?php

declare(strict_types=1);

namespace Tests\Feature\Perencanaan;

use App\Models\Master\MasterSumberData;
use App\Models\Opd;
use App\Models\Perencanaan\IndikatorPenilaian;
use App\Models\Perencanaan\PeriodePenilaian;
use App\Models\Perencanaan\SasaranPenilaian;
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
        $sumberData = MasterSumberData::create([
            'nama' => 'Renstra OPD 2025-2029',
            'urutan' => 1,
            'is_active' => true,
        ]);

        $payload = [
            'opd_id' => $this->puprOpd->id,
            'sumber_data_id' => $sumberData->id,
            'kode_tujuan' => 'TUJ-01',
            'tujuan' => 'Meningkatkan kualitas infrastruktur jalan dan drainase',
            'urutan' => 1,
            'keterangan' => 'Renstra Bab IV',
        ];

        $response = $this->actingAs($this->admin)->postJson('/api/perencanaan/tujuan', $payload);

        $response->assertStatus(201)
            ->assertJsonPath('data.tujuan', 'Meningkatkan kualitas infrastruktur jalan dan drainase')
            ->assertJsonPath('data.sumber_data_id', $sumberData->id)
            ->assertJsonPath('data.sumber_data.nama', 'Renstra OPD 2025-2029');

        $this->assertDatabaseHas('tujuan_penilaians', [
            'opd_id' => $this->puprOpd->id,
            'periode_penilaian_id' => $this->activePeriode->id,
            'sumber_data_id' => $sumberData->id,
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

    public function test_can_reorder_tujuan_sasaran_and_indikator(): void
    {
        $t1 = TujuanPenilaian::create([
            'periode_penilaian_id' => $this->activePeriode->id,
            'opd_id' => $this->puprOpd->id,
            'tujuan' => 'Tujuan 1',
            'urutan' => 1,
        ]);
        $t2 = TujuanPenilaian::create([
            'periode_penilaian_id' => $this->activePeriode->id,
            'opd_id' => $this->puprOpd->id,
            'tujuan' => 'Tujuan 2',
            'urutan' => 2,
        ]);

        // Reorder Tujuan
        $this->actingAs($this->admin)
            ->postJson('/api/perencanaan/tujuan/reorder', [
                'ids' => [$t2->id, $t1->id],
            ])
            ->assertStatus(200);

        $this->assertEquals(1, $t2->fresh()->urutan);
        $this->assertEquals(2, $t1->fresh()->urutan);

        // Create Sasarans & Reorder
        $s1 = SasaranPenilaian::create([
            'periode_penilaian_id' => $this->activePeriode->id,
            'opd_id' => $this->puprOpd->id,
            'tujuan_penilaian_id' => $t1->id,
            'sasaran' => 'Sasaran 1',
            'urutan' => 1,
        ]);
        $s2 = SasaranPenilaian::create([
            'periode_penilaian_id' => $this->activePeriode->id,
            'opd_id' => $this->puprOpd->id,
            'tujuan_penilaian_id' => $t1->id,
            'sasaran' => 'Sasaran 2',
            'urutan' => 2,
        ]);

        $this->actingAs($this->admin)
            ->postJson('/api/perencanaan/sasaran/reorder', [
                'ids' => [$s2->id, $s1->id],
            ])
            ->assertStatus(200);

        $this->assertEquals(1, $s2->fresh()->urutan);
        $this->assertEquals(2, $s1->fresh()->urutan);

        // Create Indikators & Reorder
        $i1 = IndikatorPenilaian::create([
            'periode_penilaian_id' => $this->activePeriode->id,
            'opd_id' => $this->puprOpd->id,
            'tujuan_penilaian_id' => $t1->id,
            'sasaran_penilaian_id' => $s1->id,
            'jenis' => 'IKU',
            'indikator' => 'Indikator 1',
            'urutan' => 1,
        ]);
        $i2 = IndikatorPenilaian::create([
            'periode_penilaian_id' => $this->activePeriode->id,
            'opd_id' => $this->puprOpd->id,
            'tujuan_penilaian_id' => $t1->id,
            'sasaran_penilaian_id' => $s1->id,
            'jenis' => 'Biasa',
            'indikator' => 'Indikator 2',
            'urutan' => 2,
        ]);

        $this->actingAs($this->admin)
            ->postJson('/api/perencanaan/iku/reorder', [
                'ids' => [$i2->id, $i1->id],
            ])
            ->assertStatus(200);

        $this->assertEquals(1, $i2->fresh()->urutan);
        $this->assertEquals(2, $i1->fresh()->urutan);
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
            str_contains((string) $response->headers->get('content-disposition'), 'Data_Tujuan_Sasaran_Indikator_OPD')
        );
    }

    public function test_cannot_delete_tujuan_with_child_sasaran_must_delete_bottom_up(): void
    {
        $sumberData = MasterSumberData::create([
            'nama' => 'RPJMD Test',
            'is_active' => true,
            'urutan' => 1,
        ]);

        $tujuan = TujuanPenilaian::create([
            'periode_penilaian_id' => $this->activePeriode->id,
            'opd_id' => $this->puprOpd->id,
            'sumber_data_id' => $sumberData->id,
            'kode_tujuan' => 'TUJ-DEL',
            'tujuan' => 'Tujuan yang memiliki anak',
            'urutan' => 1,
            'created_by' => $this->admin->id,
        ]);

        $sasaran = SasaranPenilaian::create([
            'periode_penilaian_id' => $this->activePeriode->id,
            'opd_id' => $this->puprOpd->id,
            'tujuan_penilaian_id' => $tujuan->id,
            'sumber_data_id' => $sumberData->id,
            'kode_sasaran' => 'SAS-DEL',
            'sasaran' => 'Sasaran Anak',
            'urutan' => 1,
            'created_by' => $this->admin->id,
        ]);

        // Attempt deleting Tujuan directly must return 422
        $response = $this->actingAs($this->admin)->deleteJson("/api/perencanaan/tujuan/{$tujuan->id}");
        $response->assertStatus(422)
            ->assertJsonValidationErrors(['tujuan']);

        $this->assertDatabaseHas('tujuan_penilaians', ['id' => $tujuan->id]);

        // Delete child Sasaran first
        $delSasaran = $this->actingAs($this->admin)->deleteJson("/api/perencanaan/sasaran/{$sasaran->id}");
        $delSasaran->assertStatus(200);
        $this->assertDatabaseMissing('sasaran_penilaians', ['id' => $sasaran->id]);

        // Now delete Tujuan succeeds
        $delTujuan = $this->actingAs($this->admin)->deleteJson("/api/perencanaan/tujuan/{$tujuan->id}");
        $delTujuan->assertStatus(200);
        $this->assertDatabaseMissing('tujuan_penilaians', ['id' => $tujuan->id]);
    }

    public function test_cannot_create_tujuan_with_inactive_sumber_data_or_inactive_opd(): void
    {
        $inactiveSumber = MasterSumberData::create([
            'nama' => 'Sumber Nonaktif',
            'is_active' => false,
            'urutan' => 99,
        ]);

        $inactiveOpd = Opd::create([
            'nama' => 'OPD Nonaktif',
            'kode' => 'OPD-NONAKTIF',
            'kategori' => 'Dinas',
            'is_active' => false,
        ]);

        // Post with inactive sumber data
        $resp1 = $this->actingAs($this->admin)->postJson('/api/perencanaan/tujuan', [
            'periode_penilaian_id' => $this->activePeriode->id,
            'opd_id' => $this->puprOpd->id,
            'sumber_data_id' => $inactiveSumber->id,
            'tujuan' => 'Test Tujuan Inactive Sumber',
        ]);
        $resp1->assertStatus(422)->assertJsonValidationErrors(['sumber_data_id']);

        // Post with inactive OPD
        $activeSumber = MasterSumberData::create([
            'nama' => 'Sumber Aktif',
            'is_active' => true,
            'urutan' => 1,
        ]);

        $resp2 = $this->actingAs($this->admin)->postJson('/api/perencanaan/tujuan', [
            'periode_penilaian_id' => $this->activePeriode->id,
            'opd_id' => $inactiveOpd->id,
            'sumber_data_id' => $activeSumber->id,
            'tujuan' => 'Test Tujuan Inactive OPD',
        ]);
        $resp2->assertStatus(422)->assertJsonValidationErrors(['opd_id']);
    }

    public function test_opd_cannot_update_or_delete_other_opd_tujuan(): void
    {
        $otherOpd = Opd::create([
            'nama' => 'Dinas Kesehatan',
            'kode' => 'Dinkes',
            'kategori' => 'Dinas',
            'urutan' => 2,
            'is_active' => true,
        ]);

        $activeSumber = MasterSumberData::create([
            'nama' => 'Sumber Aktif',
            'is_active' => true,
            'urutan' => 1,
        ]);

        $dinkesTujuan = TujuanPenilaian::create([
            'periode_penilaian_id' => $this->activePeriode->id,
            'opd_id' => $otherOpd->id,
            'sumber_data_id' => $activeSumber->id,
            'kode_tujuan' => 'TUJ-01',
            'tujuan' => 'Meningkatkan derajat kesehatan masyarakat',
            'urutan' => 1,
            'created_by' => $this->admin->id,
        ]);

        // PUPR staff tries to update Dinkes Tujuan
        $updateRes = $this->actingAs($this->opdUser)->putJson("/api/perencanaan/tujuan/{$dinkesTujuan->id}", [
            'tujuan' => 'Diubah oleh PUPR',
        ]);
        $updateRes->assertStatus(403);

        // PUPR staff tries to delete Dinkes Tujuan
        $deleteRes = $this->actingAs($this->opdUser)->deleteJson("/api/perencanaan/tujuan/{$dinkesTujuan->id}");
        $deleteRes->assertStatus(403);
    }

    public function test_opd_cannot_reorder_other_opd_tujuan(): void
    {
        $otherOpd = Opd::create([
            'nama' => 'Dinas Kesehatan',
            'kode' => 'Dinkes',
            'kategori' => 'Dinas',
            'urutan' => 2,
            'is_active' => true,
        ]);

        $activeSumber = MasterSumberData::create([
            'nama' => 'Sumber Aktif',
            'is_active' => true,
            'urutan' => 1,
        ]);

        $tujuan1 = TujuanPenilaian::create([
            'periode_penilaian_id' => $this->activePeriode->id,
            'opd_id' => $otherOpd->id,
            'sumber_data_id' => $activeSumber->id,
            'kode_tujuan' => 'TUJ-01',
            'tujuan' => 'Tujuan Dinkes 1',
            'urutan' => 1,
            'created_by' => $this->admin->id,
        ]);

        $tujuan2 = TujuanPenilaian::create([
            'periode_penilaian_id' => $this->activePeriode->id,
            'opd_id' => $otherOpd->id,
            'sumber_data_id' => $activeSumber->id,
            'kode_tujuan' => 'TUJ-02',
            'tujuan' => 'Tujuan Dinkes 2',
            'urutan' => 2,
            'created_by' => $this->admin->id,
        ]);

        // PUPR staff attempts to reorder Dinkes Tujuans
        $res = $this->actingAs($this->opdUser)->postJson('/api/perencanaan/tujuan/reorder', [
            'ids' => [$tujuan2->id, $tujuan1->id],
        ]);
        $res->assertStatus(403);
    }

    public function test_cannot_reorder_tujuans_across_different_opds(): void
    {
        $otherOpd = Opd::create([
            'nama' => 'Dinas Pendidikan',
            'kode' => 'Disdik',
            'kategori' => 'Dinas',
            'urutan' => 3,
            'is_active' => true,
        ]);

        $activeSumber = MasterSumberData::create([
            'nama' => 'Sumber Aktif',
            'is_active' => true,
            'urutan' => 1,
        ]);

        $puprTujuan = TujuanPenilaian::create([
            'periode_penilaian_id' => $this->activePeriode->id,
            'opd_id' => $this->puprOpd->id,
            'sumber_data_id' => $activeSumber->id,
            'kode_tujuan' => 'TUJ-01',
            'tujuan' => 'Tujuan PUPR',
            'urutan' => 1,
            'created_by' => $this->admin->id,
        ]);

        $disdikTujuan = TujuanPenilaian::create([
            'periode_penilaian_id' => $this->activePeriode->id,
            'opd_id' => $otherOpd->id,
            'sumber_data_id' => $activeSumber->id,
            'kode_tujuan' => 'TUJ-01',
            'tujuan' => 'Tujuan Disdik',
            'urutan' => 1,
            'created_by' => $this->admin->id,
        ]);

        // Admin attempts to reorder PUPR and Disdik together in one payload
        $res = $this->actingAs($this->admin)->postJson('/api/perencanaan/tujuan/reorder', [
            'ids' => [$puprTujuan->id, $disdikTujuan->id],
        ]);
        $res->assertStatus(422);
    }

    public function test_opd_cannot_show_other_opd_tujuan(): void
    {
        $otherOpd = Opd::create([
            'nama' => 'Dinas Pendidikan',
            'kode' => 'Disdik',
            'kategori' => 'Dinas',
            'urutan' => 3,
            'is_active' => true,
        ]);

        $disdikTujuan = TujuanPenilaian::create([
            'periode_penilaian_id' => $this->activePeriode->id,
            'opd_id' => $otherOpd->id,
            'kode_tujuan' => 'TUJ-DISDIK',
            'tujuan' => 'Tujuan Khusus Disdik',
            'urutan' => 1,
            'created_by' => $this->admin->id,
        ]);

        // PUPR staff tries to view Disdik's Tujuan details
        $res = $this->actingAs($this->opdUser)->getJson("/api/perencanaan/tujuan/{$disdikTujuan->id}");
        $res->assertStatus(403);
    }

    public function test_opd_index_and_export_scoped_to_own_opd(): void
    {
        $otherOpd = Opd::create([
            'nama' => 'Dinas Pendidikan',
            'kode' => 'Disdik',
            'kategori' => 'Dinas',
            'urutan' => 3,
            'is_active' => true,
        ]);

        TujuanPenilaian::create([
            'periode_penilaian_id' => $this->activePeriode->id,
            'opd_id' => $this->puprOpd->id,
            'kode_tujuan' => 'TUJ-PUPR',
            'tujuan' => 'Tujuan PUPR Sendiri',
            'urutan' => 1,
            'created_by' => $this->opdUser->id,
        ]);

        TujuanPenilaian::create([
            'periode_penilaian_id' => $this->activePeriode->id,
            'opd_id' => $otherOpd->id,
            'kode_tujuan' => 'TUJ-DISDIK',
            'tujuan' => 'Tujuan Disdik Rahasia',
            'urutan' => 1,
            'created_by' => $this->admin->id,
        ]);

        // PUPR staff requests index without filters or passing Disdik's ID
        $res = $this->actingAs($this->opdUser)->getJson("/api/perencanaan/tujuan?opd_id={$otherOpd->id}");
        $res->assertStatus(200);
        $res->assertJsonPath('meta.total', 1);
        $res->assertJsonPath('data.0.opd.id', $this->puprOpd->id);

        // PUPR staff requests export
        $exportRes = $this->actingAs($this->opdUser)->get("/api/perencanaan/tujuan/export?opd_id={$otherOpd->id}");
        $exportRes->assertStatus(200);
    }
}
