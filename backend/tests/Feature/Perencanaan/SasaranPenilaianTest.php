<?php

declare(strict_types=1);

namespace Tests\Feature\Perencanaan;

use App\Models\Opd;
use App\Models\Perencanaan\IndikatorPenilaian;
use App\Models\Perencanaan\PeriodePenilaian;
use App\Models\Perencanaan\SasaranPenilaian;
use App\Models\Perencanaan\TujuanPenilaian;
use App\Models\User;
use Database\Seeders\RbacSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SasaranPenilaianTest extends TestCase
{
    use RefreshDatabase;

    protected User $admin;
    protected User $opdUser;
    protected PeriodePenilaian $activePeriode;
    protected PeriodePenilaian $pastPeriode;
    protected Opd $puprOpd;
    protected TujuanPenilaian $tujuanPupr;

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
    }

    public function test_can_list_sasaran_with_pagination(): void
    {
        SasaranPenilaian::create([
            'periode_penilaian_id' => $this->activePeriode->id,
            'tujuan_penilaian_id' => $this->tujuanPupr->id,
            'opd_id' => $this->puprOpd->id,
            'kode_sasaran' => 'SAS-01',
            'sasaran' => 'Meningkatnya kemantapan jalan kabupaten dan jembatan',
            'urutan' => 1,
            'created_by' => $this->admin->id,
        ]);

        $response = $this->actingAs($this->admin)->getJson('/api/perencanaan/sasaran');

        $response->assertStatus(200)
            ->assertJsonStructure([
                'data' => [
                    '*' => [
                        'id',
                        'kode_sasaran',
                        'sasaran',
                        'urutan',
                        'opd' => ['id', 'nama', 'kode'],
                        'tujuan' => ['id', 'kode_tujuan', 'tujuan'],
                        'periode' => ['id', 'nama_periode', 'tahun_penilaian'],
                    ],
                ],
                'meta' => ['total', 'current_page', 'per_page'],
            ])
            ->assertJsonPath('meta.total', 1);
    }

    public function test_can_filter_sasaran_by_opd_and_tujuan(): void
    {
        $dinkes = Opd::create([
            'nama' => 'Dinas Kesehatan',
            'kode' => 'Dinkes',
            'kategori' => 'Dinas',
            'urutan' => 2,
            'is_active' => true,
        ]);

        $tujuanDinkes = TujuanPenilaian::create([
            'periode_penilaian_id' => $this->activePeriode->id,
            'opd_id' => $dinkes->id,
            'kode_tujuan' => 'TUJ-01',
            'tujuan' => 'Meningkatkan derajat kesehatan masyarakat',
            'urutan' => 1,
            'created_by' => $this->admin->id,
        ]);

        SasaranPenilaian::create([
            'periode_penilaian_id' => $this->activePeriode->id,
            'tujuan_penilaian_id' => $this->tujuanPupr->id,
            'opd_id' => $this->puprOpd->id,
            'kode_sasaran' => 'SAS-01',
            'sasaran' => 'Sasaran PUPR 1',
            'urutan' => 1,
            'created_by' => $this->admin->id,
        ]);

        SasaranPenilaian::create([
            'periode_penilaian_id' => $this->activePeriode->id,
            'tujuan_penilaian_id' => $tujuanDinkes->id,
            'opd_id' => $dinkes->id,
            'kode_sasaran' => 'SAS-01',
            'sasaran' => 'Sasaran Dinkes 1',
            'urutan' => 1,
            'created_by' => $this->admin->id,
        ]);

        // Filter by PUPR
        $resPupr = $this->actingAs($this->admin)->getJson("/api/perencanaan/sasaran?opd_id={$this->puprOpd->id}");
        $resPupr->assertStatus(200)->assertJsonPath('meta.total', 1);

        // Filter by Dinkes Tujuan
        $resTujuan = $this->actingAs($this->admin)->getJson("/api/perencanaan/sasaran?tujuan_penilaian_id={$tujuanDinkes->id}");
        $resTujuan->assertStatus(200)->assertJsonPath('meta.total', 1);
    }

    public function test_can_get_sasaran_statistics(): void
    {
        SasaranPenilaian::create([
            'periode_penilaian_id' => $this->activePeriode->id,
            'tujuan_penilaian_id' => $this->tujuanPupr->id,
            'opd_id' => $this->puprOpd->id,
            'kode_sasaran' => 'SAS-01',
            'sasaran' => 'Meningkatnya konektivitas jalan',
            'urutan' => 1,
            'created_by' => $this->admin->id,
        ]);

        $response = $this->actingAs($this->admin)->getJson('/api/perencanaan/sasaran/stats');

        $response->assertStatus(200)
            ->assertJsonStructure([
                'total_sasaran',
                'total_tujuan',
                'tujuan_dengan_sasaran',
                'opd_terpetakan',
                'total_opd',
                'persentase_pemetaan',
                'periode_aktif',
            ])
            ->assertJsonPath('total_sasaran', 1)
            ->assertJsonPath('tujuan_dengan_sasaran', 1)
            ->assertJsonPath('opd_terpetakan', 1);
    }

    public function test_can_create_sasaran_with_auto_order_and_code(): void
    {
        $payload = [
            'tujuan_penilaian_id' => $this->tujuanPupr->id,
            'sasaran' => 'Penyelenggaraan jasa konstruksi yang memenuhi standar keselamatan',
        ];

        $response = $this->actingAs($this->admin)->postJson('/api/perencanaan/sasaran', $payload);

        $response->assertStatus(201)
            ->assertJsonPath('data.kode_sasaran', 'SAS-01')
            ->assertJsonPath('data.urutan', 1)
            ->assertJsonPath('data.opd_id', $this->puprOpd->id);

        $this->assertDatabaseHas('sasaran_penilaians', [
            'sasaran' => 'Penyelenggaraan jasa konstruksi yang memenuhi standar keselamatan',
            'kode_sasaran' => 'SAS-01',
            'urutan' => 1,
        ]);
    }

    public function test_can_update_sasaran(): void
    {
        $sasaran = SasaranPenilaian::create([
            'periode_penilaian_id' => $this->activePeriode->id,
            'tujuan_penilaian_id' => $this->tujuanPupr->id,
            'opd_id' => $this->puprOpd->id,
            'kode_sasaran' => 'SAS-01',
            'sasaran' => 'Sasaran Awal',
            'urutan' => 1,
            'created_by' => $this->admin->id,
        ]);

        $response = $this->actingAs($this->admin)->putJson("/api/perencanaan/sasaran/{$sasaran->id}", [
            'sasaran' => 'Sasaran Diperbarui yang Lebih Spesifik',
            'kode_sasaran' => 'SAS-REV-01',
        ]);

        $response->assertStatus(200)
            ->assertJsonPath('data.sasaran', 'Sasaran Diperbarui yang Lebih Spesifik')
            ->assertJsonPath('data.kode_sasaran', 'SAS-REV-01');

        $this->assertDatabaseHas('sasaran_penilaians', [
            'id' => $sasaran->id,
            'sasaran' => 'Sasaran Diperbarui yang Lebih Spesifik',
        ]);
    }

    public function test_can_delete_sasaran(): void
    {
        $sasaran = SasaranPenilaian::create([
            'periode_penilaian_id' => $this->activePeriode->id,
            'tujuan_penilaian_id' => $this->tujuanPupr->id,
            'opd_id' => $this->puprOpd->id,
            'kode_sasaran' => 'SAS-99',
            'sasaran' => 'Sasaran Akan Dihapus',
            'urutan' => 99,
            'created_by' => $this->admin->id,
        ]);

        $response = $this->actingAs($this->admin)->deleteJson("/api/perencanaan/sasaran/{$sasaran->id}");

        $response->assertStatus(200);
        $this->assertDatabaseMissing('sasaran_penilaians', [
            'id' => $sasaran->id,
        ]);
    }

    public function test_can_copy_sasaran_from_previous_periode(): void
    {
        $pastTujuan = TujuanPenilaian::create([
            'periode_penilaian_id' => $this->pastPeriode->id,
            'opd_id' => $this->puprOpd->id,
            'kode_tujuan' => 'TUJ-01',
            'tujuan' => 'Meningkatkan konektivitas infrastruktur wilayah daerah',
            'urutan' => 1,
            'created_by' => $this->admin->id,
        ]);

        SasaranPenilaian::create([
            'periode_penilaian_id' => $this->pastPeriode->id,
            'tujuan_penilaian_id' => $pastTujuan->id,
            'opd_id' => $this->puprOpd->id,
            'kode_sasaran' => 'SAS-01',
            'sasaran' => 'Sasaran Lampau yang Disalin',
            'urutan' => 1,
            'created_by' => $this->admin->id,
        ]);

        $response = $this->actingAs($this->admin)->postJson('/api/perencanaan/sasaran/copy', [
            'source_periode_id' => $this->pastPeriode->id,
            'opd_id' => $this->puprOpd->id,
        ]);

        $response->assertStatus(200)
            ->assertJsonPath('copied_count', 1);

        $this->assertDatabaseHas('sasaran_penilaians', [
            'periode_penilaian_id' => $this->activePeriode->id,
            'sasaran' => 'Sasaran Lampau yang Disalin',
        ]);
    }

    public function test_unauthorized_user_cannot_create_or_delete_sasaran(): void
    {
        $createResponse = $this->actingAs($this->opdUser)->postJson('/api/perencanaan/sasaran', [
            'tujuan_penilaian_id' => $this->tujuanPupr->id,
            'sasaran' => 'Mencoba membuat tanpa izin',
        ]);
        $createResponse->assertStatus(403);

        $sasaran = SasaranPenilaian::create([
            'periode_penilaian_id' => $this->activePeriode->id,
            'tujuan_penilaian_id' => $this->tujuanPupr->id,
            'opd_id' => $this->puprOpd->id,
            'kode_sasaran' => 'SAS-01',
            'sasaran' => 'Sasaran Eksis',
            'urutan' => 1,
            'created_by' => $this->admin->id,
        ]);

        $deleteResponse = $this->actingAs($this->opdUser)->deleteJson("/api/perencanaan/sasaran/{$sasaran->id}");
        $deleteResponse->assertStatus(403);
    }

    public function test_cannot_delete_sasaran_with_child_indikator_must_delete_bottom_up(): void
    {
        $sasaran = SasaranPenilaian::create([
            'periode_penilaian_id' => $this->activePeriode->id,
            'tujuan_penilaian_id' => $this->tujuanPupr->id,
            'opd_id' => $this->puprOpd->id,
            'kode_sasaran' => 'SAS-DEL-GUARD',
            'sasaran' => 'Sasaran Memiliki Indikator',
            'urutan' => 1,
            'created_by' => $this->admin->id,
        ]);

        $indikator = IndikatorPenilaian::create([
            'periode_penilaian_id' => $this->activePeriode->id,
            'opd_id' => $this->puprOpd->id,
            'tujuan_penilaian_id' => $this->tujuanPupr->id,
            'sasaran_penilaian_id' => $sasaran->id,
            'kode_indikator' => 'IKU-DEL',
            'indikator' => 'Indikator Sasaran Anak',
            'jenis' => 'IKU',
            'urutan' => 1,
            'created_by' => $this->admin->id,
        ]);

        // Attempt deleting Sasaran directly must return 422
        $response = $this->actingAs($this->admin)->deleteJson("/api/perencanaan/sasaran/{$sasaran->id}");
        $response->assertStatus(422)
            ->assertJsonValidationErrors(['sasaran']);

        $this->assertDatabaseHas('sasaran_penilaians', ['id' => $sasaran->id]);

        // Delete child Indikator first
        $delIndikator = $this->actingAs($this->admin)->deleteJson("/api/perencanaan/iku/{$indikator->id}");
        $delIndikator->assertStatus(200);
        $this->assertDatabaseMissing('indikator_penilaians', ['id' => $indikator->id]);

        // Now delete Sasaran succeeds
        $delSasaran = $this->actingAs($this->admin)->deleteJson("/api/perencanaan/sasaran/{$sasaran->id}");
        $delSasaran->assertStatus(200);
        $this->assertDatabaseMissing('sasaran_penilaians', ['id' => $sasaran->id]);
    }

    public function test_opd_cannot_update_or_delete_other_opd_sasaran(): void
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

        // PUPR staff tries to update Dinkes Sasaran
        $updateRes = $this->actingAs($this->opdUser)->putJson("/api/perencanaan/sasaran/{$dinkesSasaran->id}", [
            'sasaran' => 'Diubah oleh PUPR',
        ]);
        $updateRes->assertStatus(403);

        // PUPR staff tries to delete Dinkes Sasaran
        $deleteRes = $this->actingAs($this->opdUser)->deleteJson("/api/perencanaan/sasaran/{$dinkesSasaran->id}");
        $deleteRes->assertStatus(403);
    }

    public function test_opd_cannot_reorder_other_opd_sasaran(): void
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

        $sasaran1 = SasaranPenilaian::create([
            'periode_penilaian_id' => $this->activePeriode->id,
            'tujuan_penilaian_id' => $dinkesTujuan->id,
            'opd_id' => $otherOpd->id,
            'kode_sasaran' => 'SAS-01',
            'sasaran' => 'Sasaran 1',
            'urutan' => 1,
            'created_by' => $this->admin->id,
        ]);

        $sasaran2 = SasaranPenilaian::create([
            'periode_penilaian_id' => $this->activePeriode->id,
            'tujuan_penilaian_id' => $dinkesTujuan->id,
            'opd_id' => $otherOpd->id,
            'kode_sasaran' => 'SAS-02',
            'sasaran' => 'Sasaran 2',
            'urutan' => 2,
            'created_by' => $this->admin->id,
        ]);

        // PUPR staff attempts to reorder Dinkes Sasarans
        $res = $this->actingAs($this->opdUser)->postJson('/api/perencanaan/sasaran/reorder', [
            'ids' => [$sasaran2->id, $sasaran1->id],
        ]);
        $res->assertStatus(403);
    }

    public function test_opd_cannot_show_other_opd_sasaran(): void
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
            'kode_tujuan' => 'TUJ-DINKES',
            'tujuan' => 'Meningkatkan derajat kesehatan',
            'urutan' => 1,
            'created_by' => $this->admin->id,
        ]);

        $dinkesSasaran = SasaranPenilaian::create([
            'periode_penilaian_id' => $this->activePeriode->id,
            'tujuan_penilaian_id' => $dinkesTujuan->id,
            'opd_id' => $otherOpd->id,
            'kode_sasaran' => 'SAS-DINKES',
            'sasaran' => 'Sasaran Rahasia Dinkes',
            'urutan' => 1,
            'created_by' => $this->admin->id,
        ]);

        // PUPR staff tries to view Dinkes's Sasaran details
        $res = $this->actingAs($this->opdUser)->getJson("/api/perencanaan/sasaran/{$dinkesSasaran->id}");
        $res->assertStatus(403);
    }

    public function test_opd_index_and_export_scoped_to_own_opd(): void
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
            'kode_tujuan' => 'TUJ-DINKES',
            'tujuan' => 'Meningkatkan derajat kesehatan',
            'urutan' => 1,
            'created_by' => $this->admin->id,
        ]);

        SasaranPenilaian::create([
            'periode_penilaian_id' => $this->activePeriode->id,
            'tujuan_penilaian_id' => $this->tujuanPupr->id,
            'opd_id' => $this->puprOpd->id,
            'kode_sasaran' => 'SAS-PUPR',
            'sasaran' => 'Sasaran PUPR Sendiri',
            'urutan' => 1,
            'created_by' => $this->opdUser->id,
        ]);

        SasaranPenilaian::create([
            'periode_penilaian_id' => $this->activePeriode->id,
            'tujuan_penilaian_id' => $dinkesTujuan->id,
            'opd_id' => $otherOpd->id,
            'kode_sasaran' => 'SAS-DINKES',
            'sasaran' => 'Sasaran Dinkes Rahasia',
            'urutan' => 1,
            'created_by' => $this->admin->id,
        ]);

        // PUPR staff requests index without filters or passing Dinkes's ID
        $res = $this->actingAs($this->opdUser)->getJson("/api/perencanaan/sasaran?opd_id={$otherOpd->id}");
        $res->assertStatus(200);
        $res->assertJsonPath('meta.total', 1);
        $res->assertJsonPath('data.0.opd.id', $this->puprOpd->id);

        // PUPR staff requests export
        $exportRes = $this->actingAs($this->opdUser)->get("/api/perencanaan/sasaran/export?opd_id={$otherOpd->id}");
        $exportRes->assertStatus(200);
    }
}
