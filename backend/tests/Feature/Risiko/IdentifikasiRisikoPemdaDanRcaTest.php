<?php

declare(strict_types=1);

namespace Tests\Feature\Risiko;

use App\Models\Master\MasterPemilikRisiko;
use App\Models\Master\MasterSumberData;
use App\Models\Master\MasterUrusanPemerintahan;
use App\Models\Opd;
use App\Models\Pengawasan\AuditorOpdAssignment;
use App\Models\Perencanaan\IndikatorPenilaian;
use App\Models\Perencanaan\PeriodePenilaian;
use App\Models\Perencanaan\SasaranPenilaian;
use App\Models\Perencanaan\TujuanPenilaian;
use App\Models\Risiko\IdentifikasiRisikoPemda;
use App\Models\Risiko\IdentifikasiRisikoPemdaItem;
use App\Models\Risiko\KonteksPenilaian;
use App\Models\Risiko\RootCauseAnalysis;
use App\Models\User;
use Database\Seeders\RbacSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class IdentifikasiRisikoPemdaDanRcaTest extends TestCase
{
    use RefreshDatabase;

    protected User $opdUser;

    protected Opd $opd;

    protected PeriodePenilaian $activePeriode;

    protected MasterSumberData $sumberData;

    protected TujuanPenilaian $tujuan;

    protected SasaranPenilaian $sasaran;

    protected IndikatorPenilaian $indikator;

    protected MasterUrusanPemerintahan $urusan;

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
            'kode' => 'RENSTRA',
            'nama' => 'Renstra SKPD',
            'is_active' => true,
            'urutan' => 1,
        ]);

        $this->tujuan = TujuanPenilaian::create([
            'periode_penilaian_id' => $this->activePeriode->id,
            'opd_id' => $this->opd->id,
            'sumber_data_id' => $this->sumberData->id,
            'kode_tujuan' => 'T.1',
            'tujuan' => 'Meningkatkan Kualitas Infrastruktur',
        ]);

        $this->sasaran = SasaranPenilaian::create([
            'periode_penilaian_id' => $this->activePeriode->id,
            'opd_id' => $this->opd->id,
            'tujuan_penilaian_id' => $this->tujuan->id,
            'kode_sasaran' => 'S.1',
            'sasaran' => 'Meningkatnya Pelayanan Infrastruktur Jalan',
        ]);

        $this->indikator = IndikatorPenilaian::create([
            'periode_penilaian_id' => $this->activePeriode->id,
            'opd_id' => $this->opd->id,
            'tujuan_penilaian_id' => $this->tujuan->id,
            'sasaran_penilaian_id' => $this->sasaran->id,
            'kode_indikator' => 'I.1',
            'indikator' => 'Persentase Kemantapan Jalan',
        ]);

        // Form 2B setup
        $konteks = KonteksPenilaian::create([
            'opd_id' => $this->opd->id,
            'periode_penilaian_id' => $this->activePeriode->id,
            'sumber_data_id' => $this->sumberData->id,
            'tujuan_penilaian_id' => $this->tujuan->id,
        ]);
        $konteks->sasarans()->attach([$this->sasaran->id]);
        $konteks->indikators()->attach([$this->indikator->id]);

        $this->urusan = MasterUrusanPemerintahan::create([
            'kode' => '03',
            'nama' => 'Pekerjaan Umum dan Penataan Ruang',
            'is_active' => true,
            'urutan' => 3,
        ]);

        MasterPemilikRisiko::create([
            'nama' => 'Kepala Daerah',
            'is_active' => true,
            'urutan' => 1,
        ]);
    }

    public function test_opd_can_get_current_3a_and_it_provides_2b_reference_metadata(): void
    {
        Sanctum::actingAs($this->opdUser);

        $response = $this->getJson('/api/risiko/identifikasi-pemda/current');

        $response->assertStatus(200);
        $response->assertJsonStructure([
            'data',
            'meta' => [
                'form_2b_exists',
                'tujuan_strategis',
                'sasarans_from_2b',
                'urusan_pemerintahans',
                'pemilik_risiko_options',
                'kategori_options',
            ],
        ]);

        $this->assertTrue($response->json('meta.form_2b_exists'));
        $this->assertNotEmpty($response->json('meta.sasarans_from_2b'));
        $this->assertNotEmpty($response->json('meta.pemilik_risiko_options'));
        $this->assertEquals('Kepala Daerah', $response->json('meta.pemilik_risiko_options.0.nama'));
        $this->assertEquals('Meningkatnya Pelayanan Infrastruktur Jalan', $response->json('meta.sasarans_from_2b.0.sasaran'));
    }

    public function test_opd_can_save_3a_header_with_master_urusan_pemerintahan(): void
    {
        Sanctum::actingAs($this->opdUser);

        $payload = [
            'periode_penilaian_id' => $this->activePeriode->id,
            'opd_id' => $this->opd->id,
            'master_urusan_pemerintahan_id' => $this->urusan->id,
            'nama_pemda' => 'Pemerintah Kabupaten Cianjur',
        ];

        $response = $this->postJson('/api/risiko/identifikasi-pemda/header', $payload);

        $response->assertStatus(200);
        $this->assertDatabaseHas('identifikasi_risiko_pemdas', [
            'opd_id' => $this->opd->id,
            'master_urusan_pemerintahan_id' => $this->urusan->id,
        ]);
    }

    public function test_urusan_3a_is_inherited_and_changes_sync_to_existing_forms(): void
    {
        Sanctum::actingAs($this->opdUser);
        $payload = [
            'periode_penilaian_id' => $this->activePeriode->id,
            'opd_id' => $this->opd->id,
            'master_urusan_pemerintahan_id' => $this->urusan->id,
        ];
        $this->postJson('/api/risiko/identifikasi-pemda/header', $payload)->assertOk();
        $header = ['periode_penilaian_id' => $this->activePeriode->id, 'opd_id' => $this->opd->id];
        $this->postJson('/api/risiko/identifikasi-opd/header', $header)->assertOk()
            ->assertJsonPath('data.master_urusan_pemerintahan_id', $this->urusan->id);
        $this->postJson('/api/risiko/identifikasi-operasional/header', $header)->assertOk()
            ->assertJsonPath('data.master_urusan_pemerintahan_id', $this->urusan->id);

        $newUrusan = MasterUrusanPemerintahan::create([
            'kode' => '04', 'nama' => 'Urusan lain', 'is_active' => true, 'urutan' => 4,
        ]);
        $payload['master_urusan_pemerintahan_id'] = $newUrusan->id;
        $this->postJson('/api/risiko/identifikasi-pemda/header', $payload)->assertOk();
        foreach (['identifikasi_risiko_opds', 'identifikasi_risiko_opd_operasionals'] as $table) {
            $this->assertDatabaseHas($table, [
                'opd_id' => $this->opd->id,
                'periode_penilaian_id' => $this->activePeriode->id,
                'master_urusan_pemerintahan_id' => $newUrusan->id,
            ]);
        }
    }

    public function test_header_3b_and_3c_require_urusan_from_3a(): void
    {
        Sanctum::actingAs($this->opdUser);
        $payload = ['periode_penilaian_id' => $this->activePeriode->id, 'opd_id' => $this->opd->id];
        $this->postJson('/api/risiko/identifikasi-opd/header', $payload)->assertUnprocessable();
        $this->postJson('/api/risiko/identifikasi-operasional/header', $payload)->assertUnprocessable();
    }

    public function test_urusan_cannot_be_changed_without_assigned_auditor(): void
    {
        Sanctum::actingAs($this->opdUser);
        AuditorOpdAssignment::where('opd_id', $this->opd->id)->delete();

        $this->postJson('/api/risiko/identifikasi-pemda/header', [
            'periode_penilaian_id' => $this->activePeriode->id,
            'opd_id' => $this->opd->id,
            'master_urusan_pemerintahan_id' => $this->urusan->id,
        ])->assertForbidden();
        $this->assertDatabaseMissing('identifikasi_risiko_pemdas', ['opd_id' => $this->opd->id]);
    }

    public function test_opd_can_add_item_and_it_auto_generates_kode_risiko_and_rca(): void
    {
        Sanctum::actingAs($this->opdUser);

        $dokumen = IdentifikasiRisikoPemda::create([
            'periode_penilaian_id' => $this->activePeriode->id,
            'opd_id' => $this->opd->id,
            'master_urusan_pemerintahan_id' => $this->urusan->id,
        ]);

        $itemPayload = [
            'sasaran_penilaian_id' => $this->sasaran->id,
            'indikator_penilaian_id' => $this->indikator->id,
            'kategori_risiko' => 'Risiko Fraud',
            'pernyataan_risiko' => 'Manipulasi pelaporan pengawasan jalan',
            'pemilik_risiko' => 'Kepala Daerah',
            'sifat_risiko' => 'C',
            'uraian_dampak' => 'Kerugian keuangan negara',
            'pihak_terkena' => 'Pemda, Masyarakat',
        ];

        $response = $this->postJson("/api/risiko/identifikasi-pemda/{$dokumen->id}/items", $itemPayload);

        $response->assertStatus(201);
        $kodeRisiko = $response->json('data.kode_risiko');
        $this->assertEquals('RSP.26.RF.001', $kodeRisiko);

        // Verify RCA record was automatically established
        $itemId = $response->json('data.id');
        $this->assertDatabaseHas('root_cause_analyses', [
            'identifikasi_risiko_pemda_item_id' => $itemId,
        ]);
    }

    public function test_rca_auto_computes_deepest_akar_penyebab_and_reflects_in_3a(): void
    {
        Sanctum::actingAs($this->opdUser);

        $dokumen = IdentifikasiRisikoPemda::create([
            'periode_penilaian_id' => $this->activePeriode->id,
            'opd_id' => $this->opd->id,
            'master_urusan_pemerintahan_id' => $this->urusan->id,
        ]);

        $item = IdentifikasiRisikoPemdaItem::create([
            'identifikasi_risiko_pemda_id' => $dokumen->id,
            'sasaran_penilaian_id' => $this->sasaran->id,
            'kategori_risiko' => 'Risiko Strategis',
            'nomor_urut' => 1,
            'pernyataan_risiko' => 'Penurunan kemantapan jalan',
            'kode_risiko' => 'RSP.26.RS.001',
            'pemilik_risiko' => 'Kepala Daerah',
            'sifat_risiko' => 'C',
        ]);

        $rca = RootCauseAnalysis::create([
            'identifikasi_risiko_pemda_item_id' => $item->id,
        ]);

        // Update 5-Whys
        $rcaPayload = [
            'why_1' => 'Kerusakan jalan lebih cepat dari umur rencana',
            'why_2' => 'Kualitas pekerjaan konstruksi tidak sesuai standar',
            'why_3' => 'Pengawasan QC/QA di lapangan lemah',
            'why_4' => null,
            'why_5' => null,
            'jenis_penyebab' => 'Method',
            'kegiatan_pengendalian' => 'Audit mutu berkala dan uji core drill',
        ];

        $response = $this->putJson("/api/risiko/rca/{$rca->id}", $rcaPayload);

        $response->assertStatus(200);
        $this->assertEquals('Pengawasan QC/QA di lapangan lemah', $response->json('data.akar_penyebab'));
        $this->assertEquals('Method', $response->json('data.jenis_penyebab'));

        // Check Form 3A current view reflects RCA data automatically
        $current3AResponse = $this->getJson('/api/risiko/identifikasi-pemda/current');
        $current3AResponse->assertStatus(200);
        $itemFrom3A = $current3AResponse->json('data.items.0');
        $this->assertEquals('Pengawasan QC/QA di lapangan lemah', $itemFrom3A['uraian_sebab']);
        $this->assertEquals('Method', $itemFrom3A['sumber_risiko']);
        $this->assertTrue($itemFrom3A['has_rca']);
    }
}
