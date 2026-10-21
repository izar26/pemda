<?php

declare(strict_types=1);

namespace Tests\Feature\Risiko;

use App\Models\Master\MasterSumberData;
use App\Models\Opd;
use App\Models\Perencanaan\PeriodePenilaian;
use App\Models\Perencanaan\TujuanPenilaian;
use App\Models\Risiko\KonteksOperasional;
use App\Models\Risiko\KonteksOperasionalItem;
use App\Models\Risiko\KonteksPenilaian;
use App\Models\User;
use Database\Seeders\RbacSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class KonteksOperasionalTest extends TestCase
{
    use RefreshDatabase;

    protected User $admin;
    protected User $opdPuprUser;
    protected User $opdDiskominfoUser;
    protected PeriodePenilaian $activePeriode;
    protected Opd $puprOpd;
    protected Opd $diskominfoOpd;
    protected MasterSumberData $sumberData;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RbacSeeder::class);

        $this->puprOpd = Opd::create([
            'nama' => 'Dinas Pekerjaan Umum dan Tata Ruang',
            'kode' => 'DPUTR',
            'kategori' => 'Dinas',
            'kepala' => 'ERI RIHANDIAR, S.T., M.T.',
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

        $tujuan = TujuanPenilaian::create([
            'periode_penilaian_id' => $this->activePeriode->id,
            'opd_id' => $this->puprOpd->id,
            'sumber_data_id' => $this->sumberData->id,
            'kode_tujuan' => 'TUJ-01',
            'tujuan' => 'Meningkatkan infrastruktur daerah',
            'urutan' => 1,
            'created_by' => $this->admin->id,
        ]);

        KonteksPenilaian::create([
            'periode_penilaian_id' => $this->activePeriode->id,
            'opd_id' => $this->puprOpd->id,
            'sumber_data_id' => $this->sumberData->id,
            'tujuan_penilaian_id' => $tujuan->id,
            'nama_pemda' => 'Pemerintah Kabupaten Cianjur',
            'nama_kepala' => 'ERI RIHANDIAR, S.T., M.T.',
            'nip_kepala' => '19680801 199703 1 005',
            'jabatan_kepala' => 'Kepala Dinas Pekerjaan Umum dan Tata Ruang',
            'tanggal_penetapan' => '2027-01-15',
            'status' => 'final',
            'created_by' => $this->admin->id,
        ]);
    }

    public function test_can_store_konteks_operasional_with_batch_items(): void
    {
        $payload = [
            'periode_penilaian_id' => $this->activePeriode->id,
            'opd_id' => $this->puprOpd->id,
            'sumber_data_id' => $this->sumberData->id,
            'nama_pemda' => 'Pemerintah Kabupaten Cianjur',
            'informasi_lain' => 'Fokus infrastruktur dasar jalan dan irigasi.',
            'nama_kepala' => 'ERI RIHANDIAR, S.T., M.T.',
            'nip_kepala' => '19680801 199703 1 005',
            'status' => 'final',
            'items' => [
                [
                    'jenis' => 'program',
                    'kode' => 'A',
                    'nama' => 'Program Penunjang Urusan Pemerintahan Daerah',
                    'indikators' => [
                        ['indikator' => 'Indeks Reformasi Birokrasi', 'target' => '80.2', 'satuan' => 'poin'],
                    ],
                ],
                [
                    'jenis' => 'kegiatan',
                    'kode' => 'A.1',
                    'nama' => 'Perencanaan, Penganggaran, dan Evaluasi',
                    'parent_kode' => 'A',
                    'indikators' => [
                        ['indikator' => 'Nilai SAKIP', 'target' => '72.55', 'satuan' => 'poin'],
                    ],
                ],
            ],
        ];

        $response = $this->actingAs($this->opdPuprUser)->postJson('/api/risiko/konteks-operasional', $payload);

        $response->assertStatus(201)
            ->assertJsonPath('data.opd.id', $this->puprOpd->id)
            ->assertJsonPath('data.status', 'final');

        $this->assertDatabaseHas('konteks_operasionals', [
            'opd_id' => $this->puprOpd->id,
            'status' => 'final',
        ]);

        $this->assertDatabaseHas('konteks_operasional_items', [
            'kode' => 'A',
            'jenis' => 'program',
        ]);

        $this->assertDatabaseHas('konteks_operasional_items', [
            'kode' => 'A.1',
            'jenis' => 'kegiatan',
        ]);

        $this->assertDatabaseHas('konteks_operasional_indikators', [
            'target' => '80.2',
        ]);
    }

    public function test_can_get_current_opd_konteks_operasional(): void
    {
        $konteks = KonteksOperasional::create([
            'periode_penilaian_id' => $this->activePeriode->id,
            'opd_id' => $this->puprOpd->id,
            'nama_pemda' => 'Pemerintah Kabupaten Cianjur',
            'status' => 'draft',
            'created_by' => $this->admin->id,
        ]);

        $response = $this->actingAs($this->opdPuprUser)->getJson('/api/risiko/konteks-operasional/current');

        $response->assertStatus(200)
            ->assertJsonPath('data.id', $konteks->id)
            ->assertJsonPath('data.opd.id', $this->puprOpd->id);
    }

    public function test_can_add_item_to_konteks_operasional(): void
    {
        $konteks = KonteksOperasional::create([
            'periode_penilaian_id' => $this->activePeriode->id,
            'opd_id' => $this->puprOpd->id,
            'nama_pemda' => 'Pemerintah Kabupaten Cianjur',
            'status' => 'draft',
            'created_by' => $this->admin->id,
        ]);

        // Add Program A
        $programPayload = [
            'jenis' => 'program',
            'kode' => 'A',
            'nama' => 'Program Penunjang Urusan Pemerintahan',
            'indikators' => [
                ['indikator' => 'Indeks RB', 'target' => '80.0'],
            ],
        ];

        $progRes = $this->actingAs($this->opdPuprUser)
            ->postJson("/api/risiko/konteks-operasional/{$konteks->id}/items", $programPayload);

        $progRes->assertStatus(201)
            ->assertJsonPath('data.kode', 'A')
            ->assertJsonPath('data.jenis', 'program');

        $programId = $progRes->json('data.id');

        // Add Kegiatan A.1 under Program A
        $kegiatanPayload = [
            'parent_id' => $programId,
            'jenis' => 'kegiatan',
            'kode' => 'A.1',
            'nama' => 'Perencanaan dan Evaluasi',
            'indikators' => [
                ['indikator' => 'Nilai SAKIP', 'target' => '75.0'],
            ],
        ];

        $kegRes = $this->actingAs($this->opdPuprUser)
            ->postJson("/api/risiko/konteks-operasional/{$konteks->id}/items", $kegiatanPayload);

        $kegRes->assertStatus(201)
            ->assertJsonPath('data.kode', 'A.1')
            ->assertJsonPath('data.parent_id', $programId);
    }

    public function test_can_update_item_and_indicators(): void
    {
        $konteks = KonteksOperasional::create([
            'periode_penilaian_id' => $this->activePeriode->id,
            'opd_id' => $this->puprOpd->id,
            'nama_pemda' => 'Pemerintah Kabupaten Cianjur',
            'status' => 'draft',
            'created_by' => $this->admin->id,
        ]);

        $item = KonteksOperasionalItem::create([
            'konteks_operasional_id' => $konteks->id,
            'jenis' => 'program',
            'kode' => 'A',
            'nama' => 'Program Lama',
            'urutan' => 1,
        ]);

        $updatePayload = [
            'jenis' => 'program',
            'kode' => 'A',
            'nama' => 'Program Diperbarui',
            'indikators' => [
                ['indikator' => 'Indikator Baru', 'target' => '99.5', 'satuan' => '%'],
            ],
        ];

        $response = $this->actingAs($this->opdPuprUser)
            ->putJson("/api/risiko/konteks-operasional/{$konteks->id}/items/{$item->id}", $updatePayload);

        $response->assertStatus(200)
            ->assertJsonPath('data.nama', 'Program Diperbarui')
            ->assertJsonPath('data.indikators.0.target', '99.5');

        $this->assertDatabaseHas('konteks_operasional_items', [
            'id' => $item->id,
            'nama' => 'Program Diperbarui',
        ]);
    }

    public function test_cannot_delete_parent_item_with_children_must_delete_bottom_up(): void
    {
        $konteks = KonteksOperasional::create([
            'periode_penilaian_id' => $this->activePeriode->id,
            'opd_id' => $this->puprOpd->id,
            'nama_pemda' => 'Pemerintah Kabupaten Cianjur',
            'status' => 'draft',
            'created_by' => $this->admin->id,
        ]);

        $program = KonteksOperasionalItem::create([
            'konteks_operasional_id' => $konteks->id,
            'jenis' => 'program',
            'kode' => 'B',
            'nama' => 'Program SDA',
            'urutan' => 1,
        ]);

        $kegiatan = KonteksOperasionalItem::create([
            'konteks_operasional_id' => $konteks->id,
            'parent_id' => $program->id,
            'jenis' => 'kegiatan',
            'kode' => 'B.1',
            'nama' => 'Kegiatan Pengelolaan SDA',
            'urutan' => 1,
        ]);

        // Attempting to delete Program before Kegiatan must be rejected with 422
        $response = $this->actingAs($this->opdPuprUser)
            ->deleteJson("/api/risiko/konteks-operasional/{$konteks->id}/items/{$program->id}");

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['item']);

        $this->assertDatabaseHas('konteks_operasional_items', ['id' => $program->id]);
        $this->assertDatabaseHas('konteks_operasional_items', ['id' => $kegiatan->id]);

        // Deleting from bottom up: delete Kegiatan first
        $delKegRes = $this->actingAs($this->opdPuprUser)
            ->deleteJson("/api/risiko/konteks-operasional/{$konteks->id}/items/{$kegiatan->id}");
        $delKegRes->assertStatus(200);
        $this->assertDatabaseMissing('konteks_operasional_items', ['id' => $kegiatan->id]);

        // Now deleting Program succeeds
        $delProgRes = $this->actingAs($this->opdPuprUser)
            ->deleteJson("/api/risiko/konteks-operasional/{$konteks->id}/items/{$program->id}");
        $delProgRes->assertStatus(200);
        $this->assertDatabaseMissing('konteks_operasional_items', ['id' => $program->id]);
    }

    public function test_opd_cannot_access_other_opd_konteks_operasional(): void
    {
        $konteksPupr = KonteksOperasional::create([
            'periode_penilaian_id' => $this->activePeriode->id,
            'opd_id' => $this->puprOpd->id,
            'nama_pemda' => 'Pemerintah Kabupaten Cianjur',
            'status' => 'draft',
            'created_by' => $this->admin->id,
        ]);

        // Diskominfo tries to view PUPR's konteks
        $response = $this->actingAs($this->opdDiskominfoUser)->getJson("/api/risiko/konteks-operasional/{$konteksPupr->id}");
        $response->assertStatus(403);
    }

    public function test_can_export_form_2c_excel(): void
    {
        $konteks = KonteksOperasional::create([
            'periode_penilaian_id' => $this->activePeriode->id,
            'opd_id' => $this->puprOpd->id,
            'sumber_data_id' => $this->sumberData->id,
            'nama_pemda' => 'Pemerintah Kabupaten Cianjur',
            'nama_kepala' => 'ERI RIHANDIAR, S.T., M.T.',
            'nip_kepala' => '19680801 199703 1 005',
            'status' => 'final',
            'created_by' => $this->admin->id,
        ]);

        $item = KonteksOperasionalItem::create([
            'konteks_operasional_id' => $konteks->id,
            'jenis' => 'program',
            'kode' => 'A',
            'nama' => 'Program Penunjang Urusan Pemerintahan',
            'urutan' => 1,
        ]);

        $response = $this->actingAs($this->opdPuprUser)->get("/api/risiko/konteks-operasional/{$konteks->id}/export");

        $response->assertStatus(200)
            ->assertHeader('content-type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    }

    public function test_cannot_assign_parent_from_another_opd_or_konteks(): void
    {
        $konteksPupr = KonteksOperasional::create([
            'periode_penilaian_id' => $this->activePeriode->id,
            'opd_id' => $this->puprOpd->id,
            'nama_pemda' => 'Pemerintah Kabupaten Cianjur',
            'status' => 'draft',
            'created_by' => $this->admin->id,
        ]);

        $konteksDiskominfo = KonteksOperasional::create([
            'periode_penilaian_id' => $this->activePeriode->id,
            'opd_id' => $this->diskominfoOpd->id,
            'nama_pemda' => 'Pemerintah Kabupaten Cianjur',
            'status' => 'draft',
            'created_by' => $this->admin->id,
        ]);

        $diskominfoProgram = KonteksOperasionalItem::create([
            'konteks_operasional_id' => $konteksDiskominfo->id,
            'jenis' => 'program',
            'kode' => 'A',
            'nama' => 'Program TI',
            'urutan' => 1,
        ]);

        // PUPR tries to add a kegiatan pointing to Diskominfo's program
        $payload = [
            'parent_id' => $diskominfoProgram->id,
            'jenis' => 'kegiatan',
            'nama' => 'Kegiatan Liar',
        ];

        $res = $this->actingAs($this->opdPuprUser)
            ->postJson("/api/risiko/konteks-operasional/{$konteksPupr->id}/items", $payload);

        $res->assertStatus(422)
            ->assertJsonValidationErrors(['parent_id']);
    }

    public function test_cannot_make_item_its_own_parent(): void
    {
        $konteks = KonteksOperasional::create([
            'periode_penilaian_id' => $this->activePeriode->id,
            'opd_id' => $this->puprOpd->id,
            'nama_pemda' => 'Pemerintah Kabupaten Cianjur',
            'status' => 'draft',
            'created_by' => $this->admin->id,
        ]);

        $item = KonteksOperasionalItem::create([
            'konteks_operasional_id' => $konteks->id,
            'jenis' => 'kegiatan',
            'kode' => 'A.1',
            'nama' => 'Kegiatan 1',
            'urutan' => 1,
        ]);

        $payload = [
            'parent_id' => $item->id,
            'jenis' => 'kegiatan',
            'nama' => 'Kegiatan 1 Updated',
        ];

        $res = $this->actingAs($this->opdPuprUser)
            ->putJson("/api/risiko/konteks-operasional/{$konteks->id}/items/{$item->id}", $payload);

        $res->assertStatus(422)
            ->assertJsonValidationErrors(['parent_id']);
    }

    public function test_cannot_change_jenis_when_item_has_children(): void
    {
        $konteks = KonteksOperasional::create([
            'periode_penilaian_id' => $this->activePeriode->id,
            'opd_id' => $this->puprOpd->id,
            'nama_pemda' => 'Pemerintah Kabupaten Cianjur',
            'status' => 'draft',
            'created_by' => $this->admin->id,
        ]);

        $program = KonteksOperasionalItem::create([
            'konteks_operasional_id' => $konteks->id,
            'jenis' => 'program',
            'kode' => 'A',
            'nama' => 'Program A',
            'urutan' => 1,
        ]);

        $kegiatan = KonteksOperasionalItem::create([
            'konteks_operasional_id' => $konteks->id,
            'parent_id' => $program->id,
            'jenis' => 'kegiatan',
            'kode' => 'A.1',
            'nama' => 'Kegiatan A.1',
            'urutan' => 1,
        ]);

        // Attempt to change Program A to Sub-Kegiatan while it still has child Kegiatan
        $payload = [
            'jenis' => 'sub_kegiatan',
            'parent_id' => $kegiatan->id,
            'nama' => 'Mencoba Downgrade Program',
        ];

        $res = $this->actingAs($this->opdPuprUser)
            ->putJson("/api/risiko/konteks-operasional/{$konteks->id}/items/{$program->id}", $payload);

        $res->assertStatus(422)
            ->assertJsonValidationErrors(['jenis']);
    }

    public function test_can_reorder_items_and_codes_are_recalculated(): void
    {
        $konteks = KonteksOperasional::create([
            'periode_penilaian_id' => $this->activePeriode->id,
            'opd_id' => $this->puprOpd->id,
            'nama_pemda' => 'Pemerintah Kabupaten Cianjur',
            'status' => 'draft',
            'created_by' => $this->admin->id,
        ]);

        $prog1 = KonteksOperasionalItem::create([
            'konteks_operasional_id' => $konteks->id,
            'jenis' => 'program',
            'kode' => 'A',
            'nama' => 'Program A Awal',
            'urutan' => 1,
        ]);

        $prog2 = KonteksOperasionalItem::create([
            'konteks_operasional_id' => $konteks->id,
            'jenis' => 'program',
            'kode' => 'B',
            'nama' => 'Program B Awal',
            'urutan' => 2,
        ]);

        // Reorder: Move Program 2 before Program 1
        $res = $this->actingAs($this->opdPuprUser)
            ->postJson("/api/risiko/konteks-operasional/{$konteks->id}/items/reorder", [
                'ids' => [$prog2->id, $prog1->id],
            ]);

        $res->assertStatus(200);

        $prog2->refresh();
        $prog1->refresh();

        $this->assertEquals(1, $prog2->urutan);
        $this->assertEquals('A', $prog2->kode);

        $this->assertEquals(2, $prog1->urutan);
        $this->assertEquals('B', $prog1->kode);
    }

    public function test_opd_cannot_reorder_other_opd_items(): void
    {
        $konteksPupr = KonteksOperasional::create([
            'periode_penilaian_id' => $this->activePeriode->id,
            'opd_id' => $this->puprOpd->id,
            'nama_pemda' => 'Pemerintah Kabupaten Cianjur',
            'status' => 'draft',
            'created_by' => $this->admin->id,
        ]);

        $prog1 = KonteksOperasionalItem::create([
            'konteks_operasional_id' => $konteksPupr->id,
            'jenis' => 'program',
            'kode' => 'A',
            'nama' => 'Program PUPR',
            'urutan' => 1,
        ]);

        // Diskominfo tries to reorder PUPR's items
        $res = $this->actingAs($this->opdDiskominfoUser)
            ->postJson("/api/risiko/konteks-operasional/{$konteksPupr->id}/items/reorder", [
                'ids' => [$prog1->id],
            ]);

        $res->assertStatus(403);
    }

    public function test_can_update_informasi_lain_in_konteks_operasional(): void
    {
        $konteks = KonteksOperasional::create([
            'periode_penilaian_id' => $this->activePeriode->id,
            'opd_id' => $this->puprOpd->id,
            'sumber_data_id' => $this->sumberData->id,
            'nama_pemda' => 'Pemerintah Kabupaten Cianjur',
            'informasi_lain' => '-',
            'status' => 'draft',
            'created_by' => $this->admin->id,
        ]);

        $payload = [
            'periode_penilaian_id' => $this->activePeriode->id,
            'opd_id' => $this->puprOpd->id,
            'informasi_lain' => 'Catatan operasional prioritas penanganan jalan rusak berat wilayah selatan.',
            'status' => 'final',
        ];

        $res = $this->actingAs($this->opdPuprUser)
            ->putJson("/api/risiko/konteks-operasional/{$konteks->id}", $payload);

        $res->assertStatus(200)
            ->assertJsonPath('data.informasi_lain', 'Catatan operasional prioritas penanganan jalan rusak berat wilayah selatan.');

        $this->assertDatabaseHas('konteks_operasionals', [
            'id' => $konteks->id,
            'informasi_lain' => 'Catatan operasional prioritas penanganan jalan rusak berat wilayah selatan.',
        ]);
    }

    public function test_reorder_rejects_items_from_other_konteks(): void
    {
        $konteksPupr = KonteksOperasional::create([
            'periode_penilaian_id' => $this->activePeriode->id,
            'opd_id' => $this->puprOpd->id,
            'nama_pemda' => 'Pemerintah Kabupaten Cianjur',
            'status' => 'draft',
            'created_by' => $this->admin->id,
        ]);

        $konteksOther = KonteksOperasional::create([
            'periode_penilaian_id' => $this->activePeriode->id,
            'opd_id' => $this->diskominfoOpd->id,
            'nama_pemda' => 'Pemerintah Kabupaten Cianjur',
            'status' => 'draft',
            'created_by' => $this->admin->id,
        ]);

        $itemOther = KonteksOperasionalItem::create([
            'konteks_operasional_id' => $konteksOther->id,
            'jenis' => 'program',
            'kode' => 'A',
            'nama' => 'Program Diskominfo',
            'urutan' => 1,
        ]);

        // Attempting to reorder PUPR's document with an item ID belonging to Diskominfo's document
        $res = $this->actingAs($this->admin)
            ->postJson("/api/risiko/konteks-operasional/{$konteksPupr->id}/items/reorder", [
                'ids' => [$itemOther->id],
            ]);

        $res->assertStatus(422)
            ->assertJsonValidationErrors(['ids.0']);
    }
}
