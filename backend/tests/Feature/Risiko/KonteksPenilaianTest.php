<?php

declare(strict_types=1);

namespace Tests\Feature\Risiko;

use App\Models\Master\MasterSumberData;
use App\Models\Opd;
use App\Models\Perencanaan\IndikatorPenilaian;
use App\Models\Perencanaan\PeriodePenilaian;
use App\Models\Perencanaan\SasaranPenilaian;
use App\Models\Perencanaan\TujuanPenilaian;
use App\Models\Risiko\KonteksOperasional;
use App\Models\Risiko\KonteksOperasionalItem;
use App\Models\Risiko\KonteksPenilaian;
use App\Models\User;
use Database\Seeders\RbacSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class KonteksPenilaianTest extends TestCase
{
    use RefreshDatabase;

    protected User $admin;
    protected User $opdPuprUser;
    protected User $opdDiskominfoUser;
    protected PeriodePenilaian $activePeriode;
    protected Opd $puprOpd;
    protected Opd $diskominfoOpd;
    protected MasterSumberData $sumberData;
    protected TujuanPenilaian $tujuanPupr;
    protected SasaranPenilaian $sasaran1;
    protected SasaranPenilaian $sasaran2;
    protected IndikatorPenilaian $indikator1;
    protected IndikatorPenilaian $indikator2;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RbacSeeder::class);

        $this->puprOpd = Opd::create([
            'nama' => 'Dinas Pekerjaan Umum dan Tata Ruang',
            'kode' => 'DPUTR',
            'kategori' => 'Dinas',
            'urutan' => 1,
            'is_active' => true,
        ]);

        $this->diskominfoOpd = Opd::create([
            'nama' => 'Dinas Komunikasi dan Informatika',
            'kode' => 'Diskominfo',
            'kategori' => 'Dinas',
            'urutan' => 2,
            'is_active' => true,
        ]);

        $this->admin = User::factory()->create([
            'email' => 'admin_test@pemda.go.id',
            'opd_id' => $this->puprOpd->id,
            'status' => 'active',
        ]);
        $this->admin->assignRole('Superadmin');

        $this->opdPuprUser = User::factory()->create([
            'email' => 'pupr_staff@pemda.go.id',
            'opd_id' => $this->puprOpd->id,
            'status' => 'active',
        ]);
        $this->opdPuprUser->assignRole('OPD');

        $this->opdDiskominfoUser = User::factory()->create([
            'email' => 'diskominfo_staff@pemda.go.id',
            'opd_id' => $this->diskominfoOpd->id,
            'status' => 'active',
        ]);
        $this->opdDiskominfoUser->assignRole('OPD');

        $this->activePeriode = PeriodePenilaian::create([
            'nama_periode' => 'RPJMD 2026 - 2030',
            'tahun_mulai' => 2026,
            'tahun_akhir' => 2030,
            'tahun_penilaian' => 2027,
            'tanggal_mulai' => '2027-01-02',
            'tanggal_akhir' => '2027-12-30',
            'status' => 'aktif',
        ]);

        $auditor = User::factory()->create(['status' => 'active']);
        $auditor->assignRole('Auditor');
        \App\Models\Pengawasan\AuditorOpdAssignment::create([
            'auditor_id' => $auditor->id,
            'opd_id' => $this->puprOpd->id,
            'periode_penilaian_id' => $this->activePeriode->id,
            'is_active' => true,
        ]);
        \App\Models\Pengawasan\AuditorOpdAssignment::create([
            'auditor_id' => $auditor->id,
            'opd_id' => $this->diskominfoOpd->id,
            'periode_penilaian_id' => $this->activePeriode->id,
            'is_active' => true,
        ]);

        $this->sumberData = MasterSumberData::create([
            'nama' => 'Renstra SKPD',
            'is_active' => true,
            'urutan' => 1,
        ]);

        $this->tujuanPupr = TujuanPenilaian::create([
            'periode_penilaian_id' => $this->activePeriode->id,
            'opd_id' => $this->puprOpd->id,
            'kode_tujuan' => 'TUJ-01',
            'tujuan' => 'Meningkatkan konektivitas infrastruktur jalan dan drainase',
            'urutan' => 1,
            'created_by' => $this->admin->id,
        ]);

        $this->sasaran1 = SasaranPenilaian::create([
            'periode_penilaian_id' => $this->activePeriode->id,
            'tujuan_penilaian_id' => $this->tujuanPupr->id,
            'opd_id' => $this->puprOpd->id,
            'kode_sasaran' => 'SAS-01',
            'sasaran' => 'Meningkatnya pelayanan infrastruktur jalan mantap',
            'urutan' => 1,
            'created_by' => $this->admin->id,
        ]);

        $this->sasaran2 = SasaranPenilaian::create([
            'periode_penilaian_id' => $this->activePeriode->id,
            'tujuan_penilaian_id' => $this->tujuanPupr->id,
            'opd_id' => $this->puprOpd->id,
            'kode_sasaran' => 'SAS-02',
            'sasaran' => 'Meningkatnya kinerja jaringan irigasi',
            'urutan' => 2,
            'created_by' => $this->admin->id,
        ]);

        $this->indikator1 = IndikatorPenilaian::create([
            'periode_penilaian_id' => $this->activePeriode->id,
            'tujuan_penilaian_id' => $this->tujuanPupr->id,
            'sasaran_penilaian_id' => $this->sasaran1->id,
            'opd_id' => $this->puprOpd->id,
            'kode_indikator' => 'IKU-01',
            'indikator' => 'Persentase jalan kondisi mantap (%)',
            'jenis' => 'IKU',
            'urutan' => 1,
            'created_by' => $this->admin->id,
        ]);

        $this->indikator2 = IndikatorPenilaian::create([
            'periode_penilaian_id' => $this->activePeriode->id,
            'tujuan_penilaian_id' => $this->tujuanPupr->id,
            'sasaran_penilaian_id' => $this->sasaran2->id,
            'opd_id' => $this->puprOpd->id,
            'kode_indikator' => 'IKU-02',
            'indikator' => 'Persentase irigasi kondisi baik (%)',
            'jenis' => 'IKU',
            'urutan' => 1,
            'created_by' => $this->admin->id,
        ]);
    }

    public function test_can_store_konteks_penilaian_with_cascading_selection(): void
    {
        $payload = [
            'periode_penilaian_id' => $this->activePeriode->id,
            'opd_id' => $this->puprOpd->id,
            'sumber_data_id' => $this->sumberData->id,
            'tujuan_penilaian_id' => $this->tujuanPupr->id,
            'sasaran_ids' => [$this->sasaran1->id, $this->sasaran2->id],
            'indikator_ids' => [$this->indikator1->id, $this->indikator2->id],
            'informasi_lain' => 'Prioritas penanganan bencana longsor dan jalan poros desa.',
            'nama_kepala' => 'Ir. Kepala Dinas',
            'nip_kepala' => '197001011995031001',
            'jabatan_kepala' => 'Kepala DPUTR',
            'status' => 'final',
        ];

        $response = $this->actingAs($this->opdPuprUser)->postJson('/api/risiko/konteks-strategis', $payload);

        $response->assertStatus(201)
            ->assertJsonPath('data.opd.id', $this->puprOpd->id)
            ->assertJsonPath('data.tujuan.id', $this->tujuanPupr->id)
            ->assertJsonPath('data.status', 'final');

        $this->assertDatabaseHas('konteks_penilaians', [
            'opd_id' => $this->puprOpd->id,
            'tujuan_penilaian_id' => $this->tujuanPupr->id,
            'status' => 'final',
        ]);

        $this->assertDatabaseHas('konteks_penilaian_sasarans', [
            'sasaran_penilaian_id' => $this->sasaran1->id,
        ]);

        $this->assertDatabaseHas('konteks_penilaian_indikators', [
            'indikator_penilaian_id' => $this->indikator1->id,
        ]);
    }

    public function test_cannot_select_sasaran_not_belonging_to_tujuan(): void
    {
        // Create an unrelated tujuan & sasaran
        $otherTujuan = TujuanPenilaian::create([
            'periode_penilaian_id' => $this->activePeriode->id,
            'opd_id' => $this->puprOpd->id,
            'kode_tujuan' => 'TUJ-99',
            'tujuan' => 'Tujuan Lain',
            'urutan' => 99,
            'created_by' => $this->admin->id,
        ]);

        $otherSasaran = SasaranPenilaian::create([
            'periode_penilaian_id' => $this->activePeriode->id,
            'tujuan_penilaian_id' => $otherTujuan->id,
            'opd_id' => $this->puprOpd->id,
            'kode_sasaran' => 'SAS-99',
            'sasaran' => 'Sasaran Tujuan Lain',
            'urutan' => 99,
            'created_by' => $this->admin->id,
        ]);

        $payload = [
            'periode_penilaian_id' => $this->activePeriode->id,
            'opd_id' => $this->puprOpd->id,
            'sumber_data_id' => $this->sumberData->id,
            'tujuan_penilaian_id' => $this->tujuanPupr->id,
            'sasaran_ids' => [$otherSasaran->id], // INVALID: doesn't belong to tujuanPupr
            'indikator_ids' => [$this->indikator1->id],
        ];

        $response = $this->actingAs($this->opdPuprUser)->postJson('/api/risiko/konteks-strategis', $payload);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['sasaran_ids']);
    }

    public function test_can_get_current_opd_konteks(): void
    {
        $konteks = KonteksPenilaian::create([
            'periode_penilaian_id' => $this->activePeriode->id,
            'opd_id' => $this->puprOpd->id,
            'tujuan_penilaian_id' => $this->tujuanPupr->id,
            'nama_pemda' => 'Pemerintah Kabupaten Cianjur',
            'status' => 'draft',
            'created_by' => $this->admin->id,
        ]);

        $response = $this->actingAs($this->opdPuprUser)->getJson('/api/risiko/konteks-strategis/current');

        $response->assertStatus(200)
            ->assertJsonPath('data.id', $konteks->id)
            ->assertJsonPath('data.opd.id', $this->puprOpd->id);
    }

    public function test_opd_cannot_view_or_edit_other_opd_konteks(): void
    {
        $konteksPupr = KonteksPenilaian::create([
            'periode_penilaian_id' => $this->activePeriode->id,
            'opd_id' => $this->puprOpd->id,
            'tujuan_penilaian_id' => $this->tujuanPupr->id,
            'nama_pemda' => 'Pemerintah Kabupaten Cianjur',
            'status' => 'draft',
            'created_by' => $this->admin->id,
        ]);

        // Diskominfo tries to view PUPR's konteks
        $response = $this->actingAs($this->opdDiskominfoUser)->getJson("/api/risiko/konteks-strategis/{$konteksPupr->id}");
        $response->assertStatus(403);
    }

    public function test_can_export_form_2b_excel(): void
    {
        $konteks = KonteksPenilaian::create([
            'periode_penilaian_id' => $this->activePeriode->id,
            'opd_id' => $this->puprOpd->id,
            'tujuan_penilaian_id' => $this->tujuanPupr->id,
            'sumber_data_id' => $this->sumberData->id,
            'nama_pemda' => 'Pemerintah Kabupaten Cianjur',
            'nama_kepala' => 'ERI RIHANDIAR, S.T., M.T.',
            'nip_kepala' => '19680801 199703 1 005',
            'status' => 'final',
            'created_by' => $this->admin->id,
        ]);
        $konteks->sasarans()->sync([$this->sasaran1->id => ['urutan' => 1]]);
        $konteks->indikators()->sync([$this->indikator1->id => ['urutan' => 1]]);

        $response = $this->actingAs($this->opdPuprUser)->get("/api/risiko/konteks-strategis/{$konteks->id}/export");

        $response->assertStatus(200)
            ->assertHeader('content-type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    }

    public function test_handles_missing_active_period_gracefully(): void
    {
        $this->activePeriode->update(['status' => 'nonaktif']);

        // Index returns 200 with empty list instead of 422
        $indexRes = $this->actingAs($this->opdPuprUser)->getJson('/api/risiko/konteks-strategis');
        $indexRes->assertStatus(200)
            ->assertJsonPath('meta.total', 0);

        // Current returns 200 with null data instead of 422
        $currentRes = $this->actingAs($this->opdPuprUser)->getJson('/api/risiko/konteks-strategis/current');
        $currentRes->assertStatus(200)
            ->assertJsonPath('data', null);

        // Save still strictly throws 422 because creating a context requires an active period
        $saveRes = $this->actingAs($this->opdPuprUser)->postJson('/api/risiko/konteks-strategis', [
            'opd_id' => $this->puprOpd->id,
            'tujuan_penilaian_id' => $this->tujuanPupr->id,
            'sasaran_ids' => [$this->sasaran1->id],
            'indikator_ids' => [$this->indikator1->id],
        ]);
        $saveRes->assertStatus(422);
    }

    public function test_saving_2b_syncs_header_and_tanggal_penetapan_to_2c(): void
    {
        $payload = [
            'periode_penilaian_id' => $this->activePeriode->id,
            'opd_id' => $this->puprOpd->id,
            'sumber_data_id' => $this->sumberData->id,
            'tujuan_penilaian_id' => $this->tujuanPupr->id,
            'sasaran_ids' => [$this->sasaran1->id],
            'indikator_ids' => [$this->indikator1->id],
            'nama_pemda' => 'Pemerintah Kabupaten Cianjur',
            'nama_kepala' => 'Dr. Ir. Budi Santoso, M.T.',
            'nip_kepala' => '197501012000031001',
            'jabatan_kepala' => 'Kepala Dinas PUPR',
            'tanggal_penetapan' => '2027-02-15',
            'status' => 'final',
        ];

        $saveRes = $this->actingAs($this->opdPuprUser)->postJson('/api/risiko/konteks-strategis', $payload);
        $saveRes->assertStatus(201);

        // Verify downstream 2C was provisioned and synced
        $operasional = KonteksOperasional::where('opd_id', $this->puprOpd->id)
            ->where('periode_penilaian_id', $this->activePeriode->id)
            ->first();

        $this->assertNotNull($operasional);
        $this->assertEquals('Dr. Ir. Budi Santoso, M.T.', $operasional->nama_kepala);
        $this->assertEquals('197501012000031001', $operasional->nip_kepala);
        $this->assertEquals('Kepala Dinas PUPR', $operasional->jabatan_kepala);
        $this->assertEquals('2027-02-15', $operasional->tanggal_penetapan->toDateString());
    }

    public function test_saving_2b_with_reset_operasional_items_deletes_2c_tree_safely_bottom_up(): void
    {
        // 1. Create initial 2B
        $konteks2B = KonteksPenilaian::create([
            'periode_penilaian_id' => $this->activePeriode->id,
            'opd_id' => $this->puprOpd->id,
            'tujuan_penilaian_id' => $this->tujuanPupr->id,
            'sumber_data_id' => $this->sumberData->id,
            'nama_pemda' => 'Pemerintah Kabupaten Cianjur',
            'status' => 'final',
            'created_by' => $this->admin->id,
        ]);
        $konteks2B->sasarans()->sync([$this->sasaran1->id => ['urutan' => 1]]);
        $konteks2B->indikators()->sync([$this->indikator1->id => ['urutan' => 1]]);

        // 2. Create downstream 2C with 3-level tree (Program -> Kegiatan -> Sub Kegiatan)
        $konteks2C = KonteksOperasional::create([
            'periode_penilaian_id' => $this->activePeriode->id,
            'opd_id' => $this->puprOpd->id,
            'sumber_data_id' => $this->sumberData->id,
            'konteks_penilaian_id' => $konteks2B->id,
            'nama_pemda' => 'Pemerintah Kabupaten Cianjur',
            'status' => 'final',
            'created_by' => $this->admin->id,
        ]);

        $prog = KonteksOperasionalItem::create([
            'konteks_operasional_id' => $konteks2C->id,
            'jenis' => 'program',
            'kode' => 'A',
            'nama' => 'Program Infrastruktur',
            'urutan' => 1,
        ]);

        $keg = KonteksOperasionalItem::create([
            'konteks_operasional_id' => $konteks2C->id,
            'parent_id' => $prog->id,
            'jenis' => 'kegiatan',
            'kode' => 'A.1',
            'nama' => 'Kegiatan Pembangunan Jalan',
            'urutan' => 1,
        ]);

        $sub = KonteksOperasionalItem::create([
            'konteks_operasional_id' => $konteks2C->id,
            'parent_id' => $keg->id,
            'jenis' => 'sub_kegiatan',
            'kode' => 'A.1.1',
            'nama' => 'Sub Kegiatan Pemeliharaan Berkala',
            'urutan' => 1,
        ]);

        $this->assertEquals(3, $konteks2C->items()->count());

        // 3. Update 2B with reset_operasional_items = true
        $payload = [
            'periode_penilaian_id' => $this->activePeriode->id,
            'opd_id' => $this->puprOpd->id,
            'sumber_data_id' => $this->sumberData->id,
            'tujuan_penilaian_id' => $this->tujuanPupr->id,
            'sasaran_ids' => [$this->sasaran1->id],
            'indikator_ids' => [$this->indikator1->id],
            'reset_operasional_items' => true,
        ];

        $updateRes = $this->actingAs($this->opdPuprUser)
            ->putJson("/api/risiko/konteks-strategis/{$konteks2B->id}", $payload);

        $updateRes->assertStatus(200);

        // Verify all 3 levels of 2C items were safely removed
        $this->assertEquals(0, KonteksOperasionalItem::where('konteks_operasional_id', $konteks2C->id)->count());

        // Verify 2C status was reset to draft
        $konteks2C->refresh();
        $this->assertEquals('draft', $konteks2C->status);
    }
}
