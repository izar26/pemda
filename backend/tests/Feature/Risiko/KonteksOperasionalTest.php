<?php

declare(strict_types=1);

namespace Tests\Feature\Risiko;

use App\Models\Master\MasterSumberData;
use App\Models\Opd;
use App\Models\Perencanaan\PeriodePenilaian;
use App\Models\Risiko\KonteksOperasional;
use App\Models\Risiko\KonteksOperasionalItem;
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

        $this->sumberData = MasterSumberData::create([
            'nama' => 'Renstra SKPD',
            'is_active' => true,
            'urutan' => 1,
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

    public function test_can_delete_item_cascades_to_children(): void
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

        $response = $this->actingAs($this->opdPuprUser)
            ->deleteJson("/api/risiko/konteks-operasional/{$konteks->id}/items/{$program->id}");

        $response->assertStatus(200);

        $this->assertDatabaseMissing('konteks_operasional_items', ['id' => $program->id]);
        $this->assertDatabaseMissing('konteks_operasional_items', ['id' => $kegiatan->id]);
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
}
