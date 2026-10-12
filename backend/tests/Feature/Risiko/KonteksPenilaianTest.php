<?php

declare(strict_types=1);

namespace Tests\Feature\Risiko;

use App\Models\Master\MasterSumberData;
use App\Models\Opd;
use App\Models\Perencanaan\IndikatorPenilaian;
use App\Models\Perencanaan\PeriodePenilaian;
use App\Models\Perencanaan\SasaranPenilaian;
use App\Models\Perencanaan\TujuanPenilaian;
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
}
