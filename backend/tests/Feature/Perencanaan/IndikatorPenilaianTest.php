<?php

declare(strict_types=1);

namespace Tests\Feature\Perencanaan;

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

class IndikatorPenilaianTest extends TestCase
{
    use RefreshDatabase;

    protected User $admin;
    protected User $opdUser;
    protected PeriodePenilaian $activePeriode;
    protected PeriodePenilaian $pastPeriode;
    protected Opd $puprOpd;
    protected TujuanPenilaian $tujuanPupr;
    protected SasaranPenilaian $sasaranPupr;

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

        $this->pastPeriode = PeriodePenilaian::create([
            'nama_periode' => 'RPJMD 2021 - 2025',
            'tahun_mulai' => 2021,
            'tahun_akhir' => 2025,
            'tahun_penilaian' => 2025,
            'tanggal_mulai' => '2025-01-02',
            'tanggal_akhir' => '2025-12-30',
            'status' => 'selesai',
        ]);

        $this->tujuanPupr = TujuanPenilaian::create([
            'periode_penilaian_id' => $this->activePeriode->id,
            'opd_id' => $this->puprOpd->id,
            'kode_tujuan' => 'TUJ-01',
            'tujuan' => 'Meningkatkan konektivitas infrastruktur wilayah daerah',
            'urutan' => 1,
            'created_by' => $this->admin->id,
        ]);

        $this->sasaranPupr = SasaranPenilaian::create([
            'periode_penilaian_id' => $this->activePeriode->id,
            'tujuan_penilaian_id' => $this->tujuanPupr->id,
            'opd_id' => $this->puprOpd->id,
            'kode_sasaran' => 'SAS-01',
            'sasaran' => 'Meningkatnya pelayanan infrastruktur jalan Kabupaten',
            'urutan' => 1,
            'created_by' => $this->admin->id,
        ]);
    }

    public function test_can_list_indikator_with_pagination(): void
    {
        IndikatorPenilaian::create([
            'periode_penilaian_id' => $this->activePeriode->id,
            'tujuan_penilaian_id' => $this->tujuanPupr->id,
            'sasaran_penilaian_id' => $this->sasaranPupr->id,
            'opd_id' => $this->puprOpd->id,
            'kode_indikator' => 'IKU-01',
            'indikator' => 'Persentase aksesibilitas jalan Kabupaten dalam kondisi mantap (%)',
            'jenis' => 'IKU',
            'urutan' => 1,
            'created_by' => $this->admin->id,
        ]);

        $response = $this->actingAs($this->admin)->getJson('/api/perencanaan/iku');

        $response->assertStatus(200)
            ->assertJsonStructure([
                'data' => [
                    '*' => [
                        'id',
                        'kode_indikator',
                        'indikator',
                        'jenis',
                        'urutan',
                        'opd' => ['id', 'nama', 'kode'],
                        'sasaran' => ['id', 'kode_sasaran', 'sasaran'],
                        'tujuan' => ['id', 'kode_tujuan', 'tujuan'],
                        'periode' => ['id', 'nama_periode', 'tahun_penilaian'],
                    ],
                ],
                'meta' => ['total', 'current_page', 'per_page'],
            ])
            ->assertJsonPath('meta.total', 1)
            ->assertJsonPath('data.0.jenis', 'IKU');
    }

    public function test_can_filter_by_opd_sasaran_and_jenis(): void
    {
        // IKU
        IndikatorPenilaian::create([
            'periode_penilaian_id' => $this->activePeriode->id,
            'tujuan_penilaian_id' => $this->tujuanPupr->id,
            'sasaran_penilaian_id' => $this->sasaranPupr->id,
            'opd_id' => $this->puprOpd->id,
            'kode_indikator' => 'IKU-01',
            'indikator' => 'Indikator Kinerja Utama 1',
            'jenis' => 'IKU',
            'urutan' => 1,
            'created_by' => $this->admin->id,
        ]);

        // Biasa
        IndikatorPenilaian::create([
            'periode_penilaian_id' => $this->activePeriode->id,
            'tujuan_penilaian_id' => $this->tujuanPupr->id,
            'sasaran_penilaian_id' => $this->sasaranPupr->id,
            'opd_id' => $this->puprOpd->id,
            'kode_indikator' => 'IND-01',
            'indikator' => 'Indikator Renstra Biasa 1',
            'jenis' => 'Biasa',
            'urutan' => 2,
            'created_by' => $this->admin->id,
        ]);

        // Filter jenis=IKU
        $resIku = $this->actingAs($this->admin)->getJson('/api/perencanaan/iku?jenis=IKU');
        $resIku->assertStatus(200)->assertJsonPath('meta.total', 1)->assertJsonPath('data.0.jenis', 'IKU');

        // Filter jenis=Biasa
        $resBiasa = $this->actingAs($this->admin)->getJson('/api/perencanaan/iku?jenis=Biasa');
        $resBiasa->assertStatus(200)->assertJsonPath('meta.total', 1)->assertJsonPath('data.0.jenis', 'Biasa');
    }

    public function test_can_get_indikator_statistics(): void
    {
        IndikatorPenilaian::create([
            'periode_penilaian_id' => $this->activePeriode->id,
            'tujuan_penilaian_id' => $this->tujuanPupr->id,
            'sasaran_penilaian_id' => $this->sasaranPupr->id,
            'opd_id' => $this->puprOpd->id,
            'kode_indikator' => 'IKU-01',
            'indikator' => 'IKU 1',
            'jenis' => 'IKU',
            'urutan' => 1,
            'created_by' => $this->admin->id,
        ]);

        IndikatorPenilaian::create([
            'periode_penilaian_id' => $this->activePeriode->id,
            'tujuan_penilaian_id' => $this->tujuanPupr->id,
            'sasaran_penilaian_id' => $this->sasaranPupr->id,
            'opd_id' => $this->puprOpd->id,
            'kode_indikator' => 'IND-01',
            'indikator' => 'Indikator Biasa 1',
            'jenis' => 'Biasa',
            'urutan' => 2,
            'created_by' => $this->admin->id,
        ]);

        $response = $this->actingAs($this->admin)->getJson('/api/perencanaan/iku/stats');

        $response->assertStatus(200)
            ->assertJsonStructure([
                'total_indikator',
                'total_iku',
                'total_indikator_biasa',
                'sasaran_dengan_indikator',
                'total_sasaran',
                'opd_terpetakan',
                'total_opd',
                'persentase_pemetaan',
                'periode_aktif',
            ])
            ->assertJsonPath('total_indikator', 2)
            ->assertJsonPath('total_iku', 1)
            ->assertJsonPath('total_indikator_biasa', 1);
    }

    public function test_can_create_indikator_with_auto_order_and_code(): void
    {
        $payload = [
            'sasaran_penilaian_id' => $this->sasaranPupr->id,
            'indikator' => 'Persentase irigasi kabupaten dalam kondisi baik (%)',
            'jenis' => 'IKU',
        ];

        $response = $this->actingAs($this->admin)->postJson('/api/perencanaan/iku', $payload);

        $response->assertStatus(201)
            ->assertJsonPath('data.kode_indikator', 'IKU-01')
            ->assertJsonPath('data.urutan', 1)
            ->assertJsonPath('data.opd_id', $this->puprOpd->id)
            ->assertJsonPath('data.tujuan_penilaian_id', $this->tujuanPupr->id);

        $this->assertDatabaseHas('indikator_penilaians', [
            'indikator' => 'Persentase irigasi kabupaten dalam kondisi baik (%)',
            'kode_indikator' => 'IKU-01',
            'jenis' => 'IKU',
        ]);
    }

    public function test_can_update_indikator(): void
    {
        $item = IndikatorPenilaian::create([
            'periode_penilaian_id' => $this->activePeriode->id,
            'tujuan_penilaian_id' => $this->tujuanPupr->id,
            'sasaran_penilaian_id' => $this->sasaranPupr->id,
            'opd_id' => $this->puprOpd->id,
            'kode_indikator' => 'IKU-01',
            'indikator' => 'IKU Sebelum Update',
            'jenis' => 'IKU',
            'urutan' => 1,
            'created_by' => $this->admin->id,
        ]);

        $response = $this->actingAs($this->admin)->putJson("/api/perencanaan/iku/{$item->id}", [
            'indikator' => 'IKU Setelah Diupdate Rumusannya',
            'jenis' => 'IKU',
        ]);

        $response->assertStatus(200)
            ->assertJsonPath('data.indikator', 'IKU Setelah Diupdate Rumusannya');

        $this->assertDatabaseHas('indikator_penilaians', [
            'id' => $item->id,
            'indikator' => 'IKU Setelah Diupdate Rumusannya',
        ]);
    }

    public function test_can_delete_indikator(): void
    {
        $item = IndikatorPenilaian::create([
            'periode_penilaian_id' => $this->activePeriode->id,
            'tujuan_penilaian_id' => $this->tujuanPupr->id,
            'sasaran_penilaian_id' => $this->sasaranPupr->id,
            'opd_id' => $this->puprOpd->id,
            'kode_indikator' => 'IKU-99',
            'indikator' => 'IKU Yang Dihapus',
            'jenis' => 'IKU',
            'urutan' => 99,
            'created_by' => $this->admin->id,
        ]);

        $response = $this->actingAs($this->admin)->deleteJson("/api/perencanaan/iku/{$item->id}");

        $response->assertStatus(200);
        $this->assertDatabaseMissing('indikator_penilaians', [
            'id' => $item->id,
        ]);
    }

    public function test_can_copy_indikator_from_previous_periode(): void
    {
        $pastTujuan = TujuanPenilaian::create([
            'periode_penilaian_id' => $this->pastPeriode->id,
            'opd_id' => $this->puprOpd->id,
            'kode_tujuan' => 'TUJ-01',
            'tujuan' => 'Meningkatkan konektivitas infrastruktur wilayah daerah',
            'urutan' => 1,
            'created_by' => $this->admin->id,
        ]);

        $pastSasaran = SasaranPenilaian::create([
            'periode_penilaian_id' => $this->pastPeriode->id,
            'tujuan_penilaian_id' => $pastTujuan->id,
            'opd_id' => $this->puprOpd->id,
            'kode_sasaran' => 'SAS-01',
            'sasaran' => 'Meningkatnya pelayanan infrastruktur jalan Kabupaten',
            'urutan' => 1,
            'created_by' => $this->admin->id,
        ]);

        IndikatorPenilaian::create([
            'periode_penilaian_id' => $this->pastPeriode->id,
            'tujuan_penilaian_id' => $pastTujuan->id,
            'sasaran_penilaian_id' => $pastSasaran->id,
            'opd_id' => $this->puprOpd->id,
            'kode_indikator' => 'IKU-01',
            'indikator' => 'IKU Lampau yang Disalin',
            'jenis' => 'IKU',
            'urutan' => 1,
            'created_by' => $this->admin->id,
        ]);

        $response = $this->actingAs($this->admin)->postJson('/api/perencanaan/iku/copy', [
            'source_periode_id' => $this->pastPeriode->id,
            'opd_id' => $this->puprOpd->id,
        ]);

        $response->assertStatus(200)
            ->assertJsonPath('copied_count', 1);

        $this->assertDatabaseHas('indikator_penilaians', [
            'periode_penilaian_id' => $this->activePeriode->id,
            'indikator' => 'IKU Lampau yang Disalin',
        ]);
    }

    public function test_unauthorized_user_cannot_create_or_delete_indikator(): void
    {
        $createResponse = $this->actingAs($this->opdUser)->postJson('/api/perencanaan/iku', [
            'sasaran_penilaian_id' => $this->sasaranPupr->id,
            'indikator' => 'Mencoba membuat indikator tanpa izin',
            'jenis' => 'IKU',
        ]);
        $createResponse->assertStatus(403);

        $item = IndikatorPenilaian::create([
            'periode_penilaian_id' => $this->activePeriode->id,
            'tujuan_penilaian_id' => $this->tujuanPupr->id,
            'sasaran_penilaian_id' => $this->sasaranPupr->id,
            'opd_id' => $this->puprOpd->id,
            'kode_indikator' => 'IKU-01',
            'indikator' => 'IKU Eksis',
            'jenis' => 'IKU',
            'urutan' => 1,
            'created_by' => $this->admin->id,
        ]);

        $deleteResponse = $this->actingAs($this->opdUser)->deleteJson("/api/perencanaan/iku/{$item->id}");
        $deleteResponse->assertStatus(403);
    }

    public function test_cannot_delete_indikator_used_in_konteks_penilaian_must_delete_bottom_up(): void
    {
        $sumber = MasterSumberData::create([
            'nama' => 'RPJMD Indikator Test',
            'is_active' => true,
            'urutan' => 1,
        ]);

        $item = IndikatorPenilaian::create([
            'periode_penilaian_id' => $this->activePeriode->id,
            'tujuan_penilaian_id' => $this->tujuanPupr->id,
            'sasaran_penilaian_id' => $this->sasaranPupr->id,
            'opd_id' => $this->puprOpd->id,
            'sumber_data_id' => $sumber->id,
            'kode_indikator' => 'IKU-TEST-FORM2B',
            'indikator' => 'IKU Dipakai di Form 2B',
            'jenis' => 'IKU',
            'urutan' => 99,
            'created_by' => $this->admin->id,
        ]);

        \App\Models\Pengawasan\AuditorOpdAssignment::create([
            'auditor_id' => $this->admin->id,
            'opd_id' => $this->puprOpd->id,
            'is_active' => true,
        ]);

        $konteks = KonteksPenilaian::create([
            'periode_penilaian_id' => $this->activePeriode->id,
            'opd_id' => $this->puprOpd->id,
            'sumber_data_id' => $sumber->id,
            'tujuan_penilaian_id' => $this->tujuanPupr->id,
            'nama_pemda' => 'Pemerintah Kabupaten Cianjur',
            'target' => '100%',
            'satuan' => '%',
            'status' => 'draft',
            'created_by' => $this->admin->id,
        ]);
        $konteks->indikators()->attach($item->id, ['urutan' => 1]);

        // Attempting to delete Indikator while Form 2B exists must return 422
        $response = $this->actingAs($this->admin)->deleteJson("/api/perencanaan/iku/{$item->id}");
        $response->assertStatus(422)
            ->assertJsonValidationErrors(['indikator']);

        $this->assertDatabaseHas('indikator_penilaians', ['id' => $item->id]);

        // Deleting Form 2B first (bottom up)
        $delKonteks = $this->actingAs($this->admin)->deleteJson("/api/risiko/konteks-strategis/{$konteks->id}");
        $delKonteks->assertStatus(200);
        $this->assertDatabaseMissing('konteks_penilaians', ['id' => $konteks->id]);

        // Now deleting Indikator succeeds
        $delInd = $this->actingAs($this->admin)->deleteJson("/api/perencanaan/iku/{$item->id}");
        $delInd->assertStatus(200);
        $this->assertDatabaseMissing('indikator_penilaians', ['id' => $item->id]);
    }

    public function test_opd_cannot_update_or_delete_other_opd_indikator(): void
    {
        $otherOpd = Opd::create([
            'nama' => 'Dinas Kesehatan',
            'kode' => 'Dinkes',
            'kategori' => 'Dinas',
            'urutan' => 2,
            'is_active' => true,
        ]);

        $dinkesTujuan = TujuanPenilaian::create([
            'periode_penilaian_id' => $this->activePeriode->id,
            'opd_id' => $otherOpd->id,
            'kode_tujuan' => 'TUJ-01',
            'tujuan' => 'Meningkatkan derajat kesehatan',
            'urutan' => 1,
            'created_by' => $this->admin->id,
        ]);

        $dinkesSasaran = SasaranPenilaian::create([
            'periode_penilaian_id' => $this->activePeriode->id,
            'tujuan_penilaian_id' => $dinkesTujuan->id,
            'opd_id' => $otherOpd->id,
            'kode_sasaran' => 'SAS-01',
            'sasaran' => 'Sasaran Dinkes',
            'urutan' => 1,
            'created_by' => $this->admin->id,
        ]);

        $dinkesIndikator = IndikatorPenilaian::create([
            'periode_penilaian_id' => $this->activePeriode->id,
            'tujuan_penilaian_id' => $dinkesTujuan->id,
            'sasaran_penilaian_id' => $dinkesSasaran->id,
            'opd_id' => $otherOpd->id,
            'kode_indikator' => 'IKU-01',
            'indikator' => 'Indikator Dinkes',
            'jenis' => 'IKU',
            'urutan' => 1,
            'created_by' => $this->admin->id,
        ]);

        // PUPR staff tries to update Dinkes Indikator
        $updateRes = $this->actingAs($this->opdUser)->putJson("/api/perencanaan/iku/{$dinkesIndikator->id}", [
            'indikator' => 'Diubah oleh PUPR',
        ]);
        $updateRes->assertStatus(403);

        // PUPR staff tries to delete Dinkes Indikator
        $deleteRes = $this->actingAs($this->opdUser)->deleteJson("/api/perencanaan/iku/{$dinkesIndikator->id}");
        $deleteRes->assertStatus(403);
    }

    public function test_opd_cannot_reorder_other_opd_indikator(): void
    {
        $otherOpd = Opd::create([
            'nama' => 'Dinas Kesehatan',
            'kode' => 'Dinkes',
            'kategori' => 'Dinas',
            'urutan' => 2,
            'is_active' => true,
        ]);

        $dinkesTujuan = TujuanPenilaian::create([
            'periode_penilaian_id' => $this->activePeriode->id,
            'opd_id' => $otherOpd->id,
            'kode_tujuan' => 'TUJ-01',
            'tujuan' => 'Meningkatkan derajat kesehatan',
            'urutan' => 1,
            'created_by' => $this->admin->id,
        ]);

        $dinkesSasaran = SasaranPenilaian::create([
            'periode_penilaian_id' => $this->activePeriode->id,
            'tujuan_penilaian_id' => $dinkesTujuan->id,
            'opd_id' => $otherOpd->id,
            'kode_sasaran' => 'SAS-01',
            'sasaran' => 'Sasaran Dinkes',
            'urutan' => 1,
            'created_by' => $this->admin->id,
        ]);

        $ind1 = IndikatorPenilaian::create([
            'periode_penilaian_id' => $this->activePeriode->id,
            'tujuan_penilaian_id' => $dinkesTujuan->id,
            'sasaran_penilaian_id' => $dinkesSasaran->id,
            'opd_id' => $otherOpd->id,
            'kode_indikator' => 'IKU-01',
            'indikator' => 'Indikator 1',
            'jenis' => 'IKU',
            'urutan' => 1,
            'created_by' => $this->admin->id,
        ]);

        $ind2 = IndikatorPenilaian::create([
            'periode_penilaian_id' => $this->activePeriode->id,
            'tujuan_penilaian_id' => $dinkesTujuan->id,
            'sasaran_penilaian_id' => $dinkesSasaran->id,
            'opd_id' => $otherOpd->id,
            'kode_indikator' => 'IKU-02',
            'indikator' => 'Indikator 2',
            'jenis' => 'IKU',
            'urutan' => 2,
            'created_by' => $this->admin->id,
        ]);

        // PUPR staff attempts to reorder Dinkes Indikators
        $res = $this->actingAs($this->opdUser)->postJson('/api/perencanaan/iku/reorder', [
            'ids' => [$ind2->id, $ind1->id],
        ]);
        $res->assertStatus(403);
    }
}
