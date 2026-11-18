<?php

declare(strict_types=1);

namespace Tests\Feature\Risiko;

use App\Models\Master\MasterPemilikRisiko;
use App\Models\Master\MasterSumberData;
use App\Models\Master\MasterUrusanPemerintahan;
use App\Models\Opd;
use App\Models\Pengawasan\AuditorOpdAssignment;
use App\Models\Perencanaan\PeriodePenilaian;
use App\Models\Risiko\IdentifikasiRisikoOpdOperasional;
use App\Models\Risiko\IdentifikasiRisikoOpdOperasionalItem;
use App\Models\Risiko\IdentifikasiRisikoPemda;
use App\Models\Risiko\KonteksOperasional;
use App\Models\Risiko\KonteksOperasionalIndikator;
use App\Models\Risiko\KonteksOperasionalItem;
use App\Models\Risiko\RootCauseAnalysis;
use App\Models\User;
use Database\Seeders\RbacSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\Concerns\SeedsRisikoPrerequisites;
use Tests\TestCase;

class IdentifikasiRisikoOpdOperasionalDanRcaTest extends TestCase
{
    use RefreshDatabase;
    use SeedsRisikoPrerequisites;

    protected User $opdUser;

    protected Opd $opd;

    protected PeriodePenilaian $activePeriode;

    protected MasterSumberData $sumberData;

    protected MasterUrusanPemerintahan $urusan;

    protected KonteksOperasional $konteks2c;

    protected KonteksOperasionalItem $subKegiatan;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RbacSeeder::class);

        $this->activePeriode = PeriodePenilaian::create([
            'nama_periode' => 'RPJMD 2026-2030',
            'tahun_penilaian' => '2026',
            'tahun_mulai' => 2026,
            'tahun_akhir' => 2030,
            'tanggal_mulai' => '2026-01-01',
            'tanggal_akhir' => '2030-12-31',
            'status' => 'aktif',
        ]);

        $this->opd = Opd::create([
            'nama' => 'Dinas Pekerjaan Umum dan Penataan Ruang',
            'kode' => 'DPUTR',
            'kategori' => 'Dinas',
            'kepala' => 'Eri Rihandiar',
            'is_active' => true,
        ]);

        $this->opdUser = User::factory()->create([
            'name' => 'Operator DPUTR',
            'email' => 'operator.dputr@cianjurkab.go.id',
            'opd_id' => $this->opd->id,
        ]);
        $this->opdUser->assignRole('OPD');

        $auditorUser = User::factory()->create(['name' => 'Auditor']);
        $auditorUser->assignRole('Auditor');

        AuditorOpdAssignment::create([
            'auditor_id' => $auditorUser->id,
            'opd_id' => $this->opd->id,
            'periode_penilaian_id' => $this->activePeriode->id,
            'is_active' => true,
        ]);

        $this->sumberData = MasterSumberData::create([
            'kode' => 'RENJA',
            'nama' => 'Renja SKPD',
            'is_active' => true,
            'urutan' => 1,
        ]);

        $this->urusan = MasterUrusanPemerintahan::create([
            'kode' => '1.03',
            'nama' => 'PEKERJAAN UMUM DAN PENATAAN RUANG',
            'is_active' => true,
            'urutan' => 1,
        ]);

        MasterPemilikRisiko::create(['nama' => 'Sekretaris', 'is_active' => true, 'urutan' => 1]);

        // Form 2C Konteks Operasional setup
        $this->konteks2c = KonteksOperasional::create([
            'opd_id' => $this->opd->id,
            'periode_penilaian_id' => $this->activePeriode->id,
            'sumber_data_id' => $this->sumberData->id,
            'nama_pemda' => 'Pemerintah Kabupaten Cianjur',
            'status' => 'draft',
        ]);

        $program = KonteksOperasionalItem::create([
            'konteks_operasional_id' => $this->konteks2c->id,
            'jenis' => 'program',
            'kode' => '1.03.01',
            'nama' => 'PROGRAM PENUNJANG URUSAN PEMERINTAHAN DAERAH KABUPATEN/KOTA',
            'urutan' => 1,
        ]);

        $kegiatan = KonteksOperasionalItem::create([
            'konteks_operasional_id' => $this->konteks2c->id,
            'parent_id' => $program->id,
            'jenis' => 'kegiatan',
            'kode' => '1.03.01.2.01',
            'nama' => 'Perencanaan, Penganggaran, dan Evaluasi Kinerja Perangkat Daerah',
            'urutan' => 1,
        ]);

        $this->subKegiatan = KonteksOperasionalItem::create([
            'konteks_operasional_id' => $this->konteks2c->id,
            'parent_id' => $kegiatan->id,
            'jenis' => 'sub_kegiatan',
            'kode' => '1.03.01.2.01.01',
            'nama' => 'Penyusunan Dokumen Perencanaan Perangkat Daerah',
            'urutan' => 1,
        ]);

        KonteksOperasionalIndikator::create([
            'item_id' => $this->subKegiatan->id,
            'indikator' => 'Jumlah dokumen perencanaan yang disusun',
            'target' => '2',
            'satuan' => 'Dokumen',
            'urutan' => 1,
        ]);

        $this->seedPrerequisitesBefore((string) $this->opd->id, (string) $this->activePeriode->id, '3c');
    }

    public function test_can_get_current_3c_with_form_2c_metadata(): void
    {
        Sanctum::actingAs($this->opdUser);

        $res = $this->getJson("/api/risiko/identifikasi-operasional/current?opd_id={$this->opd->id}&periode_penilaian_id={$this->activePeriode->id}");

        $res->assertOk()
            ->assertJsonStructure([
                'data',
                'meta' => [
                    'form_2c_exists',
                    'sub_kegiatans_from_2c',
                    'pemilik_risiko_options',
                    'probis_options',
                    'urusan_pemerintahans',
                    'kategori_options',
                ],
            ]);

        $this->assertTrue($res->json('meta.form_2c_exists'));
        $this->assertNotEmpty($res->json('meta.sub_kegiatans_from_2c'));
        $this->assertStringContainsString('Penyusunan Dokumen', $res->json('meta.sub_kegiatans_from_2c.0.nama'));
    }

    public function test_can_save_header_form_3c(): void
    {
        Sanctum::actingAs($this->opdUser);

        IdentifikasiRisikoPemda::updateOrCreate(
            [
                'periode_penilaian_id' => $this->activePeriode->id,
                'opd_id' => $this->opd->id,
            ],
            [
                'master_urusan_pemerintahan_id' => $this->urusan->id,
            ]
        );

        $payload = [
            'opd_id' => $this->opd->id,
            'periode_penilaian_id' => $this->activePeriode->id,
            'master_urusan_pemerintahan_id' => $this->urusan->id,
            'nama_pemda' => 'Pemerintah Kabupaten Cianjur',
            'singkatan_opd' => 'PUTR',
        ];

        $res = $this->postJson('/api/risiko/identifikasi-operasional/header', $payload);

        $res->assertOk()
            ->assertJsonPath('status', 'success')
            ->assertJsonPath('data.singkatan_opd', 'PUTR')
            ->assertJsonPath('data.master_urusan_pemerintahan_id', $this->urusan->id);

        $this->assertDatabaseHas('identifikasi_risiko_opd_operasionals', [
            'opd_id' => $this->opd->id,
            'singkatan_opd' => 'PUTR',
            'master_urusan_pemerintahan_id' => $this->urusan->id,
        ]);
    }

    public function test_can_store_risk_item_and_auto_generates_roo_code_and_creates_rca(): void
    {
        Sanctum::actingAs($this->opdUser);

        $dokumen = IdentifikasiRisikoOpdOperasional::create([
            'opd_id' => $this->opd->id,
            'periode_penilaian_id' => $this->activePeriode->id,
            'master_urusan_pemerintahan_id' => $this->urusan->id,
            'singkatan_opd' => 'PUTR',
        ]);

        $payload = [
            'operasional_sub_kegiatan_id' => $this->subKegiatan->id,
            'probis' => 'Pelaporan',
            'kategori_risiko' => 'Risiko Operasional',
            'pernyataan_risiko' => 'Penyusunan dokumen perencanaan dan evaluasi kinerja tidak tepat waktu',
            'pemilik_risiko' => 'Sekretaris',
            'sifat_risiko' => 'C',
            'uraian_dampak' => 'Menghambat proses pengambilan keputusan',
            'pihak_terkena' => 'Dinas PUTR, Masyarakat',
        ];

        $res = $this->postJson("/api/risiko/identifikasi-operasional/{$dokumen->id}/items", $payload);

        $res->assertCreated()
            ->assertJsonPath('status', 'success')
            ->assertJsonPath('data.kode_risiko', 'ROO.26.PUTR.RO.001')
            ->assertJsonPath('data.probis', 'Pelaporan')
            ->assertJsonPath('data.nomor_urut', 1);

        $this->assertDatabaseHas('identifikasi_risiko_opd_operasional_items', [
            'identifikasi_risiko_opd_operasional_id' => $dokumen->id,
            'kode_risiko' => 'ROO.26.PUTR.RO.001',
            'probis' => 'Pelaporan',
        ]);

        // Assert paired Root Cause Analysis record was created with source_type = '3c'
        $this->assertDatabaseHas('root_cause_analyses', [
            'source_type' => '3c',
            'identifikasi_risiko_opd_operasional_item_id' => $res->json('data.id'),
        ]);
    }

    public function test_3c_rejects_manual_sub_kegiatan_invalid_owner_and_unrelated_sub_kegiatan(): void
    {
        Sanctum::actingAs($this->opdUser);
        $dokumen = IdentifikasiRisikoOpdOperasional::create([
            'opd_id' => $this->opd->id, 'periode_penilaian_id' => $this->activePeriode->id,
            'master_urusan_pemerintahan_id' => $this->urusan->id,
        ]);
        $url = "/api/risiko/identifikasi-operasional/{$dokumen->id}/items";
        $payload = [
            'operasional_sub_kegiatan_id' => $this->subKegiatan->id,
            'probis' => 'Pelaksanaan', 'kategori_risiko' => 'Risiko Operasional',
            'pernyataan_risiko' => 'Kegiatan terlambat dilaksanakan',
            'pemilik_risiko' => 'Sekretaris', 'sifat_risiko' => 'C',
        ];
        $this->postJson($url, array_merge($payload, ['sub_kegiatan_kustom' => 'Manual']))->assertUnprocessable()->assertJsonValidationErrors('sub_kegiatan_kustom');
        $this->postJson($url, array_merge($payload, ['pemilik_risiko' => 'Tidak terdaftar']))->assertUnprocessable()->assertJsonValidationErrors('pemilik_risiko');
        $this->postJson($url, array_merge($payload, ['operasional_sub_kegiatan_id' => $this->subKegiatan->parent_id]))->assertUnprocessable()->assertJsonValidationErrors('operasional_sub_kegiatan_id');
        $otherOpd = Opd::create(['nama' => 'OPD lain', 'kode' => 'LAIN', 'kategori' => 'Dinas', 'is_active' => true]);
        $otherKonteks = KonteksOperasional::create(['opd_id' => $otherOpd->id, 'periode_penilaian_id' => $this->activePeriode->id]);
        $otherSub = KonteksOperasionalItem::create(['konteks_operasional_id' => $otherKonteks->id, 'jenis' => 'sub_kegiatan', 'kode' => 'X', 'nama' => 'Sub lain']);
        $this->postJson($url, array_merge($payload, ['operasional_sub_kegiatan_id' => $otherSub->id]))->assertUnprocessable()->assertJsonValidationErrors('operasional_sub_kegiatan_id');
    }

    public function test_3c_legacy_item_can_be_updated_with_master_references(): void
    {
        Sanctum::actingAs($this->opdUser);
        $dokumen = IdentifikasiRisikoOpdOperasional::create([
            'opd_id' => $this->opd->id, 'periode_penilaian_id' => $this->activePeriode->id,
            'master_urusan_pemerintahan_id' => $this->urusan->id,
        ]);
        $item = IdentifikasiRisikoOpdOperasionalItem::create([
            'identifikasi_risiko_opd_operasional_id' => $dokumen->id,
            'sub_kegiatan_kustom' => 'Sub lama', 'indikator_keluaran_kustom' => 'Indikator lama',
            'kategori_risiko' => 'Risiko Operasional', 'nomor_urut' => 1,
            'pernyataan_risiko' => 'Risiko lama', 'kode_risiko' => 'ROO.26.PUTR.RO.001',
            'pemilik_risiko' => 'Lama', 'sifat_risiko' => 'C',
        ]);
        $this->putJson("/api/risiko/identifikasi-operasional/{$dokumen->id}/items/{$item->id}", [
            'operasional_sub_kegiatan_id' => $this->subKegiatan->id,
            'kategori_risiko' => 'Risiko Operasional', 'pernyataan_risiko' => 'Risiko diperbarui',
            'pemilik_risiko' => 'Sekretaris', 'sifat_risiko' => 'UC',
        ])->assertOk();
        $this->assertDatabaseHas('identifikasi_risiko_opd_operasional_items', [
            'id' => $item->id, 'operasional_sub_kegiatan_id' => $this->subKegiatan->id,
            'sub_kegiatan_kustom' => null, 'indikator_keluaran_kustom' => null,
        ]);
    }

    public function test_3c_item_requires_permission(): void
    {
        $dokumen = IdentifikasiRisikoOpdOperasional::create([
            'opd_id' => $this->opd->id, 'periode_penilaian_id' => $this->activePeriode->id,
            'master_urusan_pemerintahan_id' => $this->urusan->id,
        ]);
        Sanctum::actingAs(User::factory()->create());
        $this->postJson("/api/risiko/identifikasi-operasional/{$dokumen->id}/items", [])->assertForbidden();
    }

    public function test_rca_update_syncs_root_cause_for_3c_items(): void
    {
        Sanctum::actingAs($this->opdUser);

        $dokumen = IdentifikasiRisikoOpdOperasional::create([
            'opd_id' => $this->opd->id,
            'periode_penilaian_id' => $this->activePeriode->id,
            'master_urusan_pemerintahan_id' => $this->urusan->id,
            'singkatan_opd' => 'PUTR',
        ]);

        $item = IdentifikasiRisikoOpdOperasionalItem::create([
            'identifikasi_risiko_opd_operasional_id' => $dokumen->id,
            'operasional_sub_kegiatan_id' => $this->subKegiatan->id,
            'probis' => 'Pelaksanaan',
            'kategori_risiko' => 'Risiko Operasional',
            'nomor_urut' => 1,
            'pernyataan_risiko' => 'Tunjangan tidak terbayarkan tepat waktu',
            'kode_risiko' => 'ROO.26.PUTR.RO.001',
            'pemilik_risiko' => 'Sekretaris',
            'sifat_risiko' => 'C',
            'urutan' => 1,
        ]);

        $rca = RootCauseAnalysis::create([
            'source_type' => '3c',
            'identifikasi_risiko_opd_operasional_item_id' => $item->id,
        ]);

        $rcaPayload = [
            'why_1' => 'Terlambatnya proses verifikasi dokumen',
            'why_2' => 'Dokumen persyaratan tidak lengkap dari awal',
            'why_3' => 'Sebagian pegawai kurang memahami pengisian SKP',
            'jenis_penyebab' => 'Man',
            'kegiatan_pengendalian' => 'Pelatihan pengisian SKP lebih awal',
        ];

        $res = $this->putJson("/api/risiko/rca/{$rca->id}", $rcaPayload);

        $res->assertOk()
            ->assertJsonPath('data.akar_penyebab', 'Sebagian pegawai kurang memahami pengisian SKP')
            ->assertJsonPath('data.jenis_penyebab', 'Man');

        // Fetching 3C current document should reflect the synchronized RCA data
        $res3c = $this->getJson("/api/risiko/identifikasi-operasional/current?opd_id={$this->opd->id}");
        $res3c->assertOk()
            ->assertJsonPath('data.items.0.uraian_sebab', 'Sebagian pegawai kurang memahami pengisian SKP')
            ->assertJsonPath('data.items.0.sumber_risiko', 'Man')
            ->assertJsonPath('data.items.0.has_rca', true);
    }

    public function test_delete_item_cascades_rca_and_resequences_codes(): void
    {
        Sanctum::actingAs($this->opdUser);

        $dokumen = IdentifikasiRisikoOpdOperasional::create([
            'opd_id' => $this->opd->id,
            'periode_penilaian_id' => $this->activePeriode->id,
            'master_urusan_pemerintahan_id' => $this->urusan->id,
            'singkatan_opd' => 'PUTR',
        ]);

        $item1 = IdentifikasiRisikoOpdOperasionalItem::create([
            'identifikasi_risiko_opd_operasional_id' => $dokumen->id,
            'kategori_risiko' => 'Risiko Operasional',
            'nomor_urut' => 1,
            'pernyataan_risiko' => 'Risiko 1',
            'kode_risiko' => 'ROO.26.PUTR.RO.001',
            'sifat_risiko' => 'C',
            'urutan' => 1,
        ]);
        $rca1 = RootCauseAnalysis::create([
            'source_type' => '3c',
            'identifikasi_risiko_opd_operasional_item_id' => $item1->id,
        ]);

        $item2 = IdentifikasiRisikoOpdOperasionalItem::create([
            'identifikasi_risiko_opd_operasional_id' => $dokumen->id,
            'kategori_risiko' => 'Risiko Operasional',
            'nomor_urut' => 2,
            'pernyataan_risiko' => 'Risiko 2',
            'kode_risiko' => 'ROO.26.PUTR.RO.002',
            'sifat_risiko' => 'C',
            'urutan' => 2,
        ]);
        $rca2 = RootCauseAnalysis::create([
            'source_type' => '3c',
            'identifikasi_risiko_opd_operasional_item_id' => $item2->id,
        ]);

        // Delete item 1
        $res = $this->deleteJson("/api/risiko/identifikasi-operasional/{$dokumen->id}/items/{$item1->id}");
        $res->assertOk();

        // RCA 1 should be gone
        $this->assertDatabaseMissing('root_cause_analyses', ['id' => $rca1->id]);

        // Item 2 should now be resequenced to nomor_urut 1 and code ROO.26.PUTR.RO.001
        $this->assertDatabaseHas('identifikasi_risiko_opd_operasional_items', [
            'id' => $item2->id,
            'nomor_urut' => 1,
            'kode_risiko' => 'ROO.26.PUTR.RO.001',
        ]);
    }
}
