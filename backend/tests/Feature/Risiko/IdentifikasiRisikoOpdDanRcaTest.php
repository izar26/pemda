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
use App\Models\Risiko\IdentifikasiRisikoOpd;
use App\Models\Risiko\IdentifikasiRisikoOpdItem;
use App\Models\Risiko\IdentifikasiRisikoPemda;
use App\Models\Risiko\IdentifikasiRisikoPemdaItem;
use App\Models\Risiko\KonteksPenilaian;
use App\Models\Risiko\RootCauseAnalysis;
use App\Models\User;
use Database\Seeders\RbacSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class IdentifikasiRisikoOpdDanRcaTest extends TestCase
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
        MasterPemilikRisiko::create(['nama' => 'Kadis PUTR', 'is_active' => true, 'urutan' => 1]);
    }

    public function test_opd_can_get_current_3b_and_it_provides_2b_reference_metadata(): void
    {
        Sanctum::actingAs($this->opdUser);

        $response = $this->getJson('/api/risiko/identifikasi-opd/current');

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
        $this->assertEquals('Meningkatnya Pelayanan Infrastruktur Jalan', $response->json('meta.sasarans_from_2b.0.sasaran'));
    }

    public function test_opd_can_save_3b_header_with_singkatan_opd_and_urusan(): void
    {
        Sanctum::actingAs($this->opdUser);

        IdentifikasiRisikoPemda::create([
            'periode_penilaian_id' => $this->activePeriode->id,
            'opd_id' => $this->opd->id,
            'master_urusan_pemerintahan_id' => $this->urusan->id,
        ]);

        $payload = [
            'periode_penilaian_id' => $this->activePeriode->id,
            'opd_id' => $this->opd->id,
            'master_urusan_pemerintahan_id' => $this->urusan->id,
            'nama_pemda' => 'Pemerintah Kabupaten Cianjur',
            'singkatan_opd' => 'PUTR',
        ];

        $response = $this->postJson('/api/risiko/identifikasi-opd/header', $payload);

        $response->assertStatus(200);
        $this->assertDatabaseHas('identifikasi_risiko_opds', [
            'opd_id' => $this->opd->id,
            'master_urusan_pemerintahan_id' => $this->urusan->id,
            'singkatan_opd' => 'PUTR',
        ]);
    }

    public function test_opd_can_add_item_and_it_auto_generates_kode_risiko_rso_and_rca(): void
    {
        Sanctum::actingAs($this->opdUser);

        $dokumen = IdentifikasiRisikoOpd::create([
            'periode_penilaian_id' => $this->activePeriode->id,
            'opd_id' => $this->opd->id,
            'master_urusan_pemerintahan_id' => $this->urusan->id,
            'singkatan_opd' => 'PUTR',
        ]);

        $itemPayload = [
            'sasaran_penilaian_id' => $this->sasaran->id,
            'indikator_penilaian_id' => $this->indikator->id,
            'kategori_risiko' => 'Risiko Strategis',
            'pernyataan_risiko' => 'Penurunan kondisi jalan kabupaten lebih cepat dibanding pemeliharaan',
            'pemilik_risiko' => 'Kadis PUTR',
            'sifat_risiko' => 'C',
            'uraian_dampak' => 'Meningkatnya jumlah jalan rusak',
            'pihak_terkena' => 'Dinas PUTR, Masyarakat',
        ];

        $response = $this->postJson("/api/risiko/identifikasi-opd/{$dokumen->id}/items", $itemPayload);

        $response->assertStatus(201);
        $kodeRisiko = $response->json('data.kode_risiko');
        $this->assertEquals('RSO.26.PUTR.RS.001', $kodeRisiko);

        // Verify RCA record was automatically established with source_type = '3b'
        $itemId = $response->json('data.id');
        $this->assertDatabaseHas('root_cause_analyses', [
            'identifikasi_risiko_opd_item_id' => $itemId,
            'source_type' => '3b',
        ]);
    }

    public function test_3b_rejects_manual_or_unrelated_references_and_unknown_owner(): void
    {
        Sanctum::actingAs($this->opdUser);
        $dokumen = IdentifikasiRisikoOpd::create([
            'periode_penilaian_id' => $this->activePeriode->id,
            'opd_id' => $this->opd->id,
            'master_urusan_pemerintahan_id' => $this->urusan->id,
        ]);
        $url = "/api/risiko/identifikasi-opd/{$dokumen->id}/items";
        $payload = [
            'sasaran_penilaian_id' => $this->sasaran->id,
            'indikator_penilaian_id' => $this->indikator->id,
            'kategori_risiko' => 'Risiko Strategis',
            'pernyataan_risiko' => 'Risiko keterlambatan program',
            'pemilik_risiko' => 'Kadis PUTR',
            'sifat_risiko' => 'C',
        ];
        $this->postJson($url, array_merge($payload, ['sasaran_kustom' => 'Manual']))->assertUnprocessable()->assertJsonValidationErrors('sasaran_kustom');
        $this->postJson($url, array_merge($payload, ['pemilik_risiko' => 'Tidak terdaftar']))->assertUnprocessable()->assertJsonValidationErrors('pemilik_risiko');
        $konteks = KonteksPenilaian::where('opd_id', $this->opd->id)->firstOrFail();
        $konteks->indikators()->detach($this->indikator->id);
        $this->postJson($url, $payload)->assertUnprocessable()->assertJsonValidationErrors('indikator_penilaian_id');
        $this->assertDatabaseCount('identifikasi_risiko_opd_items', 0);
    }

    public function test_3b_item_cannot_be_added_without_permission(): void
    {
        $dokumen = IdentifikasiRisikoOpd::create([
            'periode_penilaian_id' => $this->activePeriode->id,
            'opd_id' => $this->opd->id,
            'master_urusan_pemerintahan_id' => $this->urusan->id,
        ]);
        Sanctum::actingAs(User::factory()->create());
        $this->postJson("/api/risiko/identifikasi-opd/{$dokumen->id}/items", [])->assertForbidden();
    }

    public function test_rca_3b_auto_computes_deepest_akar_penyebab_and_reflects_in_3b(): void
    {
        Sanctum::actingAs($this->opdUser);

        $dokumen = IdentifikasiRisikoOpd::create([
            'periode_penilaian_id' => $this->activePeriode->id,
            'opd_id' => $this->opd->id,
            'master_urusan_pemerintahan_id' => $this->urusan->id,
            'singkatan_opd' => 'PUTR',
        ]);

        $item = IdentifikasiRisikoOpdItem::create([
            'identifikasi_risiko_opd_id' => $dokumen->id,
            'sasaran_penilaian_id' => $this->sasaran->id,
            'kategori_risiko' => 'Risiko Strategis',
            'nomor_urut' => 1,
            'pernyataan_risiko' => 'Kerusakan jaringan irigasi tidak tertangani',
            'kode_risiko' => 'RSO.26.PUTR.RS.001',
            'pemilik_risiko' => 'Kadis PUTR',
            'sifat_risiko' => 'C',
        ]);

        $rca = RootCauseAnalysis::create([
            'source_type' => '3b',
            'identifikasi_risiko_opd_item_id' => $item->id,
        ]);

        // Update 5-Whys
        $rcaPayload = [
            'why_1' => 'Penanganan irigasi terlambat',
            'why_2' => 'Keterbatasan inventarisasi kondisi jaringan',
            'why_3' => 'Sistem pendataan kondisi belum terintegrasi',
            'why_4' => 'Kekurangan SDM berkompeten',
            'why_5' => null,
            'jenis_penyebab' => 'Man',
            'kegiatan_pengendalian' => 'Mengoptimalkan SDM operasi pemeliharaan',
        ];

        $response = $this->putJson("/api/risiko/rca/{$rca->id}", $rcaPayload);

        $response->assertStatus(200);
        $this->assertEquals('Kekurangan SDM berkompeten', $response->json('data.akar_penyebab'));
        $this->assertEquals('Man', $response->json('data.jenis_penyebab'));

        // Check Form 3B current view reflects RCA data automatically
        $current3BResponse = $this->getJson('/api/risiko/identifikasi-opd/current');
        $current3BResponse->assertStatus(200);
        $itemFrom3B = $current3BResponse->json('data.items.0');
        $this->assertEquals('Kekurangan SDM berkompeten', $itemFrom3B['uraian_sebab']);
        $this->assertEquals('Man', $itemFrom3B['sumber_risiko']);
        $this->assertTrue($itemFrom3B['has_rca']);
    }

    public function test_rca_index_supports_filtering_by_source_type_3a_and_3b(): void
    {
        Sanctum::actingAs($this->opdUser);

        // Create 3A item + RCA
        $dokumen3a = IdentifikasiRisikoPemda::create([
            'periode_penilaian_id' => $this->activePeriode->id,
            'opd_id' => $this->opd->id,
            'master_urusan_pemerintahan_id' => $this->urusan->id,
        ]);
        $item3a = IdentifikasiRisikoPemdaItem::create([
            'identifikasi_risiko_pemda_id' => $dokumen3a->id,
            'kategori_risiko' => 'Risiko Fraud',
            'pernyataan_risiko' => 'Risiko Pemda 1',
            'kode_risiko' => 'RSP.26.RF.001',
            'sifat_risiko' => 'C',
        ]);
        RootCauseAnalysis::create([
            'source_type' => '3a',
            'identifikasi_risiko_pemda_item_id' => $item3a->id,
            'akar_penyebab' => 'Akar 3A',
            'jenis_penyebab' => 'Method',
        ]);

        // Create 3B item + RCA
        $dokumen3b = IdentifikasiRisikoOpd::create([
            'periode_penilaian_id' => $this->activePeriode->id,
            'opd_id' => $this->opd->id,
            'master_urusan_pemerintahan_id' => $this->urusan->id,
        ]);
        $item3b = IdentifikasiRisikoOpdItem::create([
            'identifikasi_risiko_opd_id' => $dokumen3b->id,
            'kategori_risiko' => 'Risiko Strategis',
            'pernyataan_risiko' => 'Risiko OPD 1',
            'kode_risiko' => 'RSO.26.PUTR.RS.001',
            'sifat_risiko' => 'C',
        ]);
        RootCauseAnalysis::create([
            'source_type' => '3b',
            'identifikasi_risiko_opd_item_id' => $item3b->id,
            'akar_penyebab' => 'Akar 3B',
            'jenis_penyebab' => 'Man',
        ]);

        // Query all: should get 2
        $allRes = $this->getJson('/api/risiko/rca');
        $allRes->assertStatus(200);
        $this->assertCount(2, $allRes->json('data'));

        // Filter 3a only: should get 1
        $res3a = $this->getJson('/api/risiko/rca?source_type=3a');
        $res3a->assertStatus(200);
        $this->assertCount(1, $res3a->json('data'));
        $this->assertEquals('3a', $res3a->json('data.0.source_type'));

        // Filter 3b only: should get 1
        $res3b = $this->getJson('/api/risiko/rca?source_type=3b');
        $res3b->assertStatus(200);
        $this->assertCount(1, $res3b->json('data'));
        $this->assertEquals('3b', $res3b->json('data.0.source_type'));
    }
}
