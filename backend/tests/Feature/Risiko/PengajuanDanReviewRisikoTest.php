<?php

declare(strict_types=1);

namespace Tests\Feature\Risiko;

use App\Models\Master\MasterSumberData;
use App\Models\Master\MasterUrusanPemerintahan;
use App\Models\Opd;
use App\Models\Pengawasan\AuditorOpdAssignment;
use App\Models\Perencanaan\IndikatorPenilaian;
use App\Models\Perencanaan\PeriodePenilaian;
use App\Models\Perencanaan\SasaranPenilaian;
use App\Models\Perencanaan\TujuanPenilaian;
use App\Models\Risiko\AnalisisRisiko;
use App\Models\Risiko\IdentifikasiRisikoOpd;
use App\Models\Risiko\IdentifikasiRisikoOpdItem;
use App\Models\Risiko\IdentifikasiRisikoOpdOperasional;
use App\Models\Risiko\IdentifikasiRisikoOpdOperasionalItem;
use App\Models\Risiko\IdentifikasiRisikoPemda;
use App\Models\Risiko\IdentifikasiRisikoPemdaItem;
use App\Models\Risiko\KomunikasiPengendalianRisiko;
use App\Models\Risiko\KonteksOperasional;
use App\Models\Risiko\KonteksOperasionalItem;
use App\Models\Risiko\KonteksPenilaian;
use App\Models\Risiko\PemantauanPengendalianRisiko;
use App\Models\Risiko\PengajuanPenilaianRisiko;
use App\Models\Risiko\RootCauseAnalysis;
use App\Models\Risiko\StatusFraudRiskAssessmentOpd;
use App\Models\Risiko\StatusKejadianRisikoOpd;
use App\Models\Risiko\TindakPengendalianRisiko;
use App\Models\User;
use Database\Seeders\RbacSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class PengajuanDanReviewRisikoTest extends TestCase
{
    use RefreshDatabase;

    protected User $opdUser;

    protected User $kepalaOpdUser;

    protected User $auditorUser;

    protected User $otherAuditorUser;

    protected User $pengawasUser;

    protected Opd $opd;

    protected PeriodePenilaian $activePeriode;

    protected MasterSumberData $sumberData;

    protected TujuanPenilaian $tujuan;

    protected SasaranPenilaian $sasaran;

    protected IndikatorPenilaian $indikator;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RbacSeeder::class);

        $this->opd = Opd::create([
            'nama' => 'Dinas Kesehatan',
            'kode' => 'Dinkes',
            'kategori' => 'Dinas',
            'is_active' => true,
        ]);

        $this->activePeriode = PeriodePenilaian::create([
            'nama_periode' => 'RPJMD 2024-2029',
            'tahun_mulai' => 2024,
            'tahun_akhir' => 2029,
            'tahun_penilaian' => 2024,
            'tanggal_mulai' => '2024-01-01',
            'tanggal_akhir' => '2029-12-31',
            'status' => 'aktif',
        ]);

        $this->opdUser = User::factory()->create([
            'name' => 'Operator Dinkes',
            'email' => 'dinkes@pemda.go.id',
            'opd_id' => $this->opd->id,
            'status' => 'active',
        ]);
        $this->opdUser->assignRole('OPD');

        $this->kepalaOpdUser = User::factory()->create([
            'name' => 'Kepala Dinas Kesehatan',
            'email' => 'kadis.dinkes@pemda.go.id',
            'opd_id' => $this->opd->id,
            'status' => 'active',
        ]);
        $this->kepalaOpdUser->assignRole('Executive');

        $this->pengawasUser = User::factory()->create([
            'name' => 'Pengawas APIP',
            'email' => 'pengawas@pemda.go.id',
            'status' => 'active',
        ]);
        $this->pengawasUser->assignRole('Inspektorat');

        $this->auditorUser = User::factory()->create([
            'name' => 'Auditor Pembina 1',
            'email' => 'auditor1@pemda.go.id',
            'status' => 'active',
        ]);
        $this->auditorUser->assignRole('Auditor');

        $this->otherAuditorUser = User::factory()->create([
            'name' => 'Auditor Lain',
            'email' => 'auditor2@pemda.go.id',
            'status' => 'active',
        ]);
        $this->otherAuditorUser->assignRole('Auditor');

        $this->sumberData = MasterSumberData::create([
            'nama' => 'Renstra Dinas Kesehatan 2024-2029',
            'urutan' => 1,
            'is_active' => true,
        ]);

        $this->tujuan = TujuanPenilaian::create([
            'periode_penilaian_id' => $this->activePeriode->id,
            'opd_id' => $this->opd->id,
            'sumber_data_id' => $this->sumberData->id,
            'kode_tujuan' => 'T.1',
            'tujuan' => 'Meningkatkan Derajat Kesehatan Masyarakat',
        ]);

        $this->sasaran = SasaranPenilaian::create([
            'periode_penilaian_id' => $this->activePeriode->id,
            'opd_id' => $this->opd->id,
            'tujuan_penilaian_id' => $this->tujuan->id,
            'kode_sasaran' => 'S.1',
            'sasaran' => 'Menurunkan Angka Kematian Ibu dan Bayi',
        ]);

        $this->indikator = IndikatorPenilaian::create([
            'periode_penilaian_id' => $this->activePeriode->id,
            'opd_id' => $this->opd->id,
            'tujuan_penilaian_id' => $this->tujuan->id,
            'sasaran_penilaian_id' => $this->sasaran->id,
            'kode_indikator' => 'I.1',
            'indikator' => 'Angka Kematian Ibu per 100.000 Kelahiran Hidup',
        ]);
    }

    /**
     * Helper to complete Form 2B for the OPD.
     */
    protected function completeForm2B(): KonteksPenilaian
    {
        $konteks = KonteksPenilaian::create([
            'periode_penilaian_id' => $this->activePeriode->id,
            'opd_id' => $this->opd->id,
            'sumber_data_id' => $this->sumberData->id,
            'tujuan_penilaian_id' => $this->tujuan->id,
            'nama_pemda' => 'Pemerintah Kabupaten',
            'nama_kepala' => 'dr. Budi Santoso',
            'status' => 'ditetapkan',
        ]);

        $konteks->sasarans()->attach($this->sasaran->id);
        $konteks->indikators()->attach($this->indikator->id);

        return $konteks;
    }

    /**
     * Helper to complete Form 2C for the OPD.
     */
    protected function completeForm2C(): KonteksOperasional
    {
        $operasional = KonteksOperasional::create([
            'periode_penilaian_id' => $this->activePeriode->id,
            'opd_id' => $this->opd->id,
            'status' => 'draft',
        ]);

        KonteksOperasionalItem::create([
            'konteks_operasional_id' => $operasional->id,
            'parent_id' => null,
            'jenis' => 'program',
            'kode' => '1',
            'nama' => 'Program Pelayanan Kesehatan Dasar',
            'urutan' => 1,
        ]);

        return $operasional;
    }

    /**
     * Helper to complete Form 3A and RCA for the OPD.
     */
    protected function completeForm3AAndRca(bool $includeForm4 = true): IdentifikasiRisikoPemda
    {
        $urusan = MasterUrusanPemerintahan::firstOrCreate(
            ['kode' => '01'],
            ['nama' => 'Pendidikan', 'is_active' => true, 'urutan' => 1]
        );

        $dokumen = IdentifikasiRisikoPemda::create([
            'periode_penilaian_id' => $this->activePeriode->id,
            'opd_id' => $this->opd->id,
            'master_urusan_pemerintahan_id' => $urusan->id,
            'nama_pemda' => 'Pemerintah Kabupaten Cianjur',
            'status' => 'draft',
        ]);

        $item = IdentifikasiRisikoPemdaItem::create([
            'identifikasi_risiko_pemda_id' => $dokumen->id,
            'sasaran_penilaian_id' => $this->sasaran->id,
            'indikator_penilaian_id' => $this->indikator->id,
            'kategori_risiko' => 'Risiko Strategis',
            'nomor_urut' => 1,
            'pernyataan_risiko' => 'Potensi keterlambatan target penurunan AKI',
            'kode_risiko' => 'RSP.26.RS.001',
            'pemilik_risiko' => 'Kepala Daerah',
            'sifat_risiko' => 'C',
            'uraian_dampak' => 'Target RPJMD tidak tercapai',
            'pihak_terkena' => 'Masyarakat',
            'urutan' => 1,
        ]);

        RootCauseAnalysis::create([
            'source_type' => '3a',
            'identifikasi_risiko_pemda_item_id' => $item->id,
            'why_1' => 'Fasilitas kesehatan kurang memadai',
            'akar_penyebab' => 'Fasilitas kesehatan kurang memadai',
            'jenis_penyebab' => 'Material',
            'kegiatan_pengendalian' => 'Pengadaan alkes',
        ]);

        $dokumen3b = IdentifikasiRisikoOpd::create([
            'periode_penilaian_id' => $this->activePeriode->id,
            'opd_id' => $this->opd->id,
            'master_urusan_pemerintahan_id' => $urusan->id,
            'nama_pemda' => 'Pemerintah Kabupaten Cianjur',
            'singkatan_opd' => 'DINKES',
            'status' => 'draft',
        ]);

        $item3b = IdentifikasiRisikoOpdItem::create([
            'identifikasi_risiko_opd_id' => $dokumen3b->id,
            'sasaran_penilaian_id' => $this->sasaran->id,
            'indikator_penilaian_id' => $this->indikator->id,
            'kategori_risiko' => 'Risiko Strategis',
            'nomor_urut' => 1,
            'pernyataan_risiko' => 'Potensi keterlambatan penanganan faskes OPD',
            'kode_risiko' => 'RSO.26.DINKES.RS.001',
            'pemilik_risiko' => 'Kepala Dinas Kesehatan',
            'sifat_risiko' => 'C',
            'uraian_dampak' => 'Penurunan kualitas layanan',
            'pihak_terkena' => 'Masyarakat',
            'urutan' => 1,
        ]);

        RootCauseAnalysis::create([
            'source_type' => '3b',
            'identifikasi_risiko_opd_item_id' => $item3b->id,
            'why_1' => 'SDM faskes belum terlatih',
            'akar_penyebab' => 'SDM faskes belum terlatih',
            'jenis_penyebab' => 'Man',
            'kegiatan_pengendalian' => 'Pelatihan nakes',
        ]);

        $dokumen3c = IdentifikasiRisikoOpdOperasional::create([
            'periode_penilaian_id' => $this->activePeriode->id,
            'opd_id' => $this->opd->id,
            'master_urusan_pemerintahan_id' => $urusan->id,
            'nama_pemda' => 'Pemerintah Kabupaten Cianjur',
            'singkatan_opd' => 'DINKES',
            'status' => 'draft',
        ]);

        $item3c = IdentifikasiRisikoOpdOperasionalItem::create([
            'identifikasi_risiko_opd_operasional_id' => $dokumen3c->id,
            'sub_kegiatan_kustom' => 'Pengadaan Vaksin dan Alkes',
            'probis' => 'Pelaksanaan',
            'kategori_risiko' => 'Risiko Operasional',
            'nomor_urut' => 1,
            'pernyataan_risiko' => 'Kerusakan rantai dingin vaksin saat distribusi',
            'kode_risiko' => 'ROO.26.DINKES.RO.001',
            'pemilik_risiko' => 'Sekretaris',
            'sifat_risiko' => 'C',
            'uraian_dampak' => 'Vaksin rusak dan tidak dapat digunakan',
            'pihak_terkena' => 'Masyarakat penerima vaksin',
            'urutan' => 1,
        ]);

        RootCauseAnalysis::create([
            'source_type' => '3c',
            'identifikasi_risiko_opd_operasional_item_id' => $item3c->id,
            'why_1' => 'Coolbox penyimpanan tidak sesuai standar',
            'akar_penyebab' => 'Coolbox penyimpanan tidak sesuai standar',
            'jenis_penyebab' => 'Material',
            'kegiatan_pengendalian' => 'Pengadaan coolbox terstandar WHO',
        ]);

        if ($includeForm4) {
            $analysis = ['kriteria_kemungkinan' => 'Jumlah Frekuensi (dlm 1 tahun)', 'inheren_kemungkinan' => 3,
                'kriteria_dampak' => 'Penurunan reputasi', 'inheren_dampak' => 4, 'pengendalian_ada' => false,
                'residual_kriteria_kemungkinan' => 'Jumlah Frekuensi (dlm 1 tahun)', 'residual_kriteria_dampak' => 'Penurunan kinerja', 'residual_kemungkinan' => 2, 'residual_dampak' => 3];
            foreach ([['risiko_opd_item_id' => $item3b->id], ['risiko_operasional_item_id' => $item3c->id]] as $source) {
                $record = AnalisisRisiko::create(array_merge($analysis, $source, ['rencana_tindak' => 'Perbaiki prosedur']));
                TindakPengendalianRisiko::create(['analisis_risiko_id' => $record->id, 'celah_pengendalian' => 'Prosedur belum memadai', 'penanggung_jawab' => 'Kepala bidang', 'target_waktu' => 'Akhir tahun', 'treated_kemungkinan' => 1, 'treated_dampak' => 1]);
                KomunikasiPengendalianRisiko::create(['analisis_risiko_id' => $record->id, 'media_komunikasi' => 'Rapat koordinasi', 'penyedia_informasi' => 'PPTK', 'penerima_informasi' => 'Kepala Dinas', 'rencana_waktu' => 'Akhir tahun']);
                PemantauanPengendalianRisiko::create(['analisis_risiko_id' => $record->id, 'bentuk_pemantauan' => 'Reviu Dokumen', 'penanggung_jawab_pemantauan' => 'Irban Khusus', 'rencana_waktu_pemantauan' => 'Triwulan IV']);
            }
            StatusKejadianRisikoOpd::create([
                'opd_id' => $this->opd->id,
                'periode_penilaian_id' => $this->activePeriode->id,
                'is_nihil' => true,
                'confirmed_by' => $this->opdUser->id,
                'confirmed_at' => now(),
            ]);
            StatusFraudRiskAssessmentOpd::create([
                'opd_id' => $this->opd->id,
                'periode_penilaian_id' => $this->activePeriode->id,
                'is_nihil' => true,
                'confirmed_by' => $this->opdUser->id,
                'confirmed_at' => now(),
            ]);
        }

        return $dokumen;
    }

    /**
     * Helper to assign auditor to OPD.
     */
    protected function assignAuditorToOpd(): AuditorOpdAssignment
    {
        return AuditorOpdAssignment::create([
            'auditor_id' => $this->auditorUser->id,
            'opd_id' => $this->opd->id,
            'periode_penilaian_id' => $this->activePeriode->id,
            'is_active' => true,
        ]);
    }

    public function test_assigned_auditor_can_read_all_review_form_endpoints(): void
    {
        $this->assignAuditorToOpd();
        $this->completeForm2B();
        $this->completeForm2C();
        $this->completeForm3AAndRca();
        Sanctum::actingAs($this->auditorUser);
        $params = http_build_query(['opd_id' => $this->opd->id, 'periode_penilaian_id' => $this->activePeriode->id]);
        foreach (['konteks-strategis/current', 'konteks-operasional/current', 'identifikasi-pemda/current', 'identifikasi-opd/current', 'identifikasi-operasional/current'] as $path) {
            $response = $this->getJson("/api/risiko/{$path}?{$params}");
            $response->assertOk()->assertJsonPath('data.opd_id', $this->opd->id);
        }
        $this->getJson("/api/risiko/rca?{$params}")->assertOk()->assertJsonCount(3, 'data');
    }

    public function test_unassigned_auditor_cannot_read_review_form_data(): void
    {
        $this->assignAuditorToOpd();
        Sanctum::actingAs($this->otherAuditorUser);
        $params = http_build_query(['opd_id' => $this->opd->id, 'periode_penilaian_id' => $this->activePeriode->id]);
        foreach (['konteks-strategis/current', 'konteks-operasional/current', 'identifikasi-pemda/current', 'identifikasi-opd/current', 'identifikasi-operasional/current', 'rca'] as $path) {
            $this->getJson("/api/risiko/{$path}?{$params}")->assertForbidden();
        }
    }

    public function test_review_detail_get_does_not_start_review(): void
    {
        $this->assignAuditorToOpd();
        $submission = PengajuanPenilaianRisiko::create([
            'opd_id' => $this->opd->id,
            'periode_penilaian_id' => $this->activePeriode->id,
            'auditor_id' => $this->auditorUser->id,
            'status' => PengajuanPenilaianRisiko::STATUS_SUBMITTED_TO_AUDITOR,
        ]);
        Sanctum::actingAs($this->auditorUser);
        $this->getJson("/api/pengawasan/review-risiko/{$submission->id}")->assertOk();
        $this->assertEquals(PengajuanPenilaianRisiko::STATUS_SUBMITTED_TO_AUDITOR, $submission->fresh()->status);
        $this->postJson("/api/pengawasan/review-risiko/{$submission->id}/start")->assertOk();
        $this->assertEquals(PengajuanPenilaianRisiko::STATUS_IN_REVIEW_AUDITOR, $submission->fresh()->status);
    }

    public function test_review_form_endpoint_uses_submission_scope_and_checks_assignment(): void
    {
        $this->assignAuditorToOpd();
        $this->completeForm2B();
        $this->completeForm2C();
        $this->completeForm3AAndRca();
        $submission = PengajuanPenilaianRisiko::create([
            'opd_id' => $this->opd->id,
            'periode_penilaian_id' => $this->activePeriode->id,
            'auditor_id' => $this->auditorUser->id,
            'status' => PengajuanPenilaianRisiko::STATUS_SUBMITTED_TO_AUDITOR,
        ]);
        Sanctum::actingAs($this->auditorUser);
        foreach (['2b', '2c', '3a', '3b', '3c'] as $form) {
            $this->getJson("/api/pengawasan/review-risiko/{$submission->id}/forms/{$form}")
                ->assertOk()->assertJsonPath('data.opd_id', $this->opd->id);
        }
        $this->getJson("/api/pengawasan/review-risiko/{$submission->id}/forms/rca")->assertOk()->assertJsonCount(3, 'data');
        $page1 = $this->getJson("/api/pengawasan/review-risiko/{$submission->id}/forms/rca?per_page=1&page=1")->assertOk()->assertJsonCount(1, 'data')->assertJsonPath('meta.total', 3)->assertJsonPath('meta.last_page', 3);
        $page2 = $this->getJson("/api/pengawasan/review-risiko/{$submission->id}/forms/rca?per_page=1&page=2")->assertOk()->assertJsonCount(1, 'data');
        $this->assertNotEquals($page1->json('data.0.id'), $page2->json('data.0.id'));
        $this->getJson("/api/pengawasan/review-risiko/{$submission->id}/forms/3b?search=tidakmungkinada")->assertOk()->assertJsonCount(0, 'data.items')->assertJsonPath('meta.total', 0);
        $this->getJson("/api/pengawasan/review-risiko/{$submission->id}/forms/rca?source=3c&status=complete")->assertOk()->assertJsonCount(1, 'data')->assertJsonPath('data.0.source_type', '3c');
        $this->getJson("/api/pengawasan/review-risiko/{$submission->id}/forms/rca?status=incomplete")->assertOk()->assertJsonCount(0, 'data');
        $this->getJson("/api/pengawasan/review-risiko/{$submission->id}/forms/3a?per_page=101")->assertUnprocessable();
        Sanctum::actingAs($this->otherAuditorUser);
        $this->getJson("/api/pengawasan/review-risiko/{$submission->id}/forms/3a")->assertForbidden();
    }

    public function test_review_limits_large_risk_list_in_database(): void
    {
        $this->assignAuditorToOpd();
        $this->completeForm2B();
        $this->completeForm2C();
        $doc = $this->completeForm3AAndRca();
        for ($i = 2; $i <= 101; $i++) {
            IdentifikasiRisikoPemdaItem::create([
                'identifikasi_risiko_pemda_id' => $doc->id,
                'kategori_risiko' => 'Risiko Strategis', 'nomor_urut' => $i,
                'pernyataan_risiko' => "Risiko uji {$i}", 'kode_risiko' => "RSP.TEST.{$i}",
                'pemilik_risiko' => 'Kepala Daerah', 'sifat_risiko' => 'C', 'urutan' => $i,
            ]);
        }
        $submission = PengajuanPenilaianRisiko::create([
            'opd_id' => $this->opd->id, 'periode_penilaian_id' => $this->activePeriode->id,
            'auditor_id' => $this->auditorUser->id, 'status' => PengajuanPenilaianRisiko::STATUS_SUBMITTED_TO_AUDITOR,
        ]);
        Sanctum::actingAs($this->auditorUser);
        DB::flushQueryLog();
        DB::enableQueryLog();
        $this->getJson("/api/pengawasan/review-risiko/{$submission->id}/forms/3a?page=2")
            ->assertOk()->assertJsonCount(20, 'data.items')->assertJsonPath('meta.total', 101)->assertJsonPath('meta.last_page', 6);
        $queries = count(DB::getQueryLog());
        DB::disableQueryLog();
        $this->assertLessThan(40, $queries);
    }

    public function test_form4_analysis_uses_matrix_and_is_scoped_to_opd(): void
    {
        $this->assignAuditorToOpd();
        $this->completeForm2B();
        $this->completeForm2C();
        $this->completeForm3AAndRca();
        Sanctum::actingAs($this->opdUser);
        $opdItem = IdentifikasiRisikoOpdItem::firstOrFail();
        $operasionalItem = IdentifikasiRisikoOpdOperasionalItem::firstOrFail();
        $payload = [
            'kriteria_kemungkinan' => 'Jumlah Frekuensi (dlm 1 tahun)',
            'inheren_kemungkinan' => 3, 'kriteria_dampak' => 'Penurunan reputasi', 'inheren_dampak' => 4,
            'pengendalian_ada' => false, 'residual_kriteria_kemungkinan' => 'Jumlah Frekuensi (dlm 1 tahun)', 'residual_kriteria_dampak' => 'Penurunan kinerja', 'residual_kemungkinan' => 2, 'residual_dampak' => 3,
        ];
        $this->putJson("/api/risiko/analisis-risiko/3b/{$opdItem->id}", $payload)->assertOk();
        $this->putJson("/api/risiko/analisis-risiko/3c/{$operasionalItem->id}", array_merge($payload, ['residual_kemungkinan' => 1, 'residual_dampak' => 1]))->assertOk();
        $params = http_build_query(['opd_id' => $this->opd->id, 'periode_penilaian_id' => $this->activePeriode->id]);
        $response = $this->getJson("/api/risiko/analisis-risiko?{$params}")->assertOk()->assertJsonCount(2, 'data');
        $response->assertJsonPath('data.0.skala_inheren', 19)->assertJsonPath('data.0.skala_residual', 12)->assertJsonPath('data.0.evaluasi', 'Perlu Perlakuan Risiko')->assertJsonPath('data.0.peringkat', 1);
        $response->assertJsonPath('data.0.analysis.kriteria_dampak', 'Penurunan reputasi')->assertJsonPath('data.0.analysis.residual_kriteria_dampak', 'Penurunan kinerja');
        $response->assertJsonPath('data.1.skala_residual', 1)->assertJsonPath('data.1.evaluasi', 'Menerima Risiko')->assertJsonPath('data.1.peringkat', 1);
        $this->getJson("/api/risiko/analisis-risiko?{$params}&per_page=1&page=2")->assertOk()->assertJsonCount(1, 'data')->assertJsonPath('data.0.id', $operasionalItem->id)->assertJsonPath('meta.total', 2)->assertJsonPath('meta.last_page', 2);
        $this->getJson("/api/risiko/analisis-risiko?{$params}&source=3c")->assertOk()->assertJsonCount(1, 'data')->assertJsonPath('data.0.id', $operasionalItem->id)->assertJsonPath('meta.overall_total', 2);
        $this->getJson("/api/risiko/analisis-risiko?{$params}&search=tidak-ditemukan")->assertOk()->assertJsonCount(0, 'data')->assertJsonPath('meta.total', 0);
        $this->putJson("/api/risiko/analisis-risiko/3b/{$opdItem->id}", array_merge($payload, ['inheren_kemungkinan' => 6]))->assertUnprocessable();
        $other = User::factory()->create(['opd_id' => Opd::create(['nama' => 'OPD lain', 'kode' => 'LAIN', 'kategori' => 'Dinas', 'is_active' => true])->id]);
        $other->assignRole('OPD');
        Sanctum::actingAs($other);
        $this->getJson("/api/risiko/analisis-risiko?{$params}")->assertForbidden();
        $this->putJson("/api/risiko/analisis-risiko/3b/{$opdItem->id}", $payload)->assertForbidden();
    }

    public function test_form4_ranking_uses_full_group_before_filtering_and_pagination(): void
    {
        $this->assignAuditorToOpd();
        $this->completeForm2B();
        $this->completeForm2C();
        $this->completeForm3AAndRca();
        $first = IdentifikasiRisikoOpdItem::firstOrFail();
        foreach ([2, 3, 4] as $number) {
            $item = $first->replicate();
            $item->kode_risiko = 'TEST-'.$number;
            $item->nomor_urut = $number;
            $item->urutan = $number;
            $item->save();
            $analysis = AnalisisRisiko::where('risiko_opd_item_id', $first->id)->firstOrFail()->replicate();
            $analysis->risiko_opd_item_id = $item->id;
            $analysis->residual_kemungkinan = $number === 4 ? 1 : 3;
            $analysis->residual_dampak = $number === 4 ? 1 : 4;
            $analysis->save();
        }
        Sanctum::actingAs($this->opdUser);
        $params = http_build_query(['opd_id' => $this->opd->id, 'periode_penilaian_id' => $this->activePeriode->id, 'source' => '3b', 'per_page' => 1]);
        $this->getJson("/api/risiko/analisis-risiko?{$params}&page=1")->assertOk()->assertJsonPath('data.0.peringkat', 3);
        $this->getJson("/api/risiko/analisis-risiko?{$params}&page=2")->assertOk()->assertJsonPath('data.0.peringkat', 1);
        $this->getJson("/api/risiko/analisis-risiko?{$params}&search=TEST-3")->assertOk()->assertJsonPath('data.0.peringkat', 1)->assertJsonPath('meta.total', 1);
        $this->getJson("/api/risiko/analisis-risiko?{$params}&search=TEST-4")->assertOk()->assertJsonPath('data.0.peringkat', 4);
    }

    public function test_form4_residual_criteria_migration_preserves_existing_analysis(): void
    {
        $this->completeForm3AAndRca();
        $migration = require database_path('migrations/2026_11_11_140000_add_residual_criteria_to_analisis_risikos.php');
        $migration->down();
        $migration->up();
        $analysis = AnalisisRisiko::firstOrFail();
        $this->assertSame($analysis->kriteria_kemungkinan, $analysis->residual_kriteria_kemungkinan);
        $this->assertSame($analysis->kriteria_dampak, $analysis->residual_kriteria_dampak);
    }

    public function test_form4_draft_is_not_complete_and_reviewer_sees_analysis(): void
    {
        $this->assignAuditorToOpd();
        $this->completeForm2B();
        $this->completeForm2C();
        $this->completeForm3AAndRca(false);
        $item = IdentifikasiRisikoOpdItem::firstOrFail();
        Sanctum::actingAs($this->opdUser);
        $this->putJson("/api/risiko/analisis-risiko/3b/{$item->id}", ['inheren_kemungkinan' => 3])->assertOk();
        $params = http_build_query(['opd_id' => $this->opd->id, 'periode_penilaian_id' => $this->activePeriode->id]);
        $this->getJson("/api/risiko/analisis-risiko?{$params}")->assertOk()->assertJsonPath('data.0.complete', false)->assertJsonPath('data.0.evaluasi', null);
        $submission = PengajuanPenilaianRisiko::where('opd_id', $this->opd->id)->firstOrFail();
        Sanctum::actingAs($this->auditorUser);
        $this->getJson("/api/pengawasan/review-risiko/{$submission->id}/forms/4")->assertOk()->assertJsonCount(2, 'data')->assertJsonPath('data.0.analysis.inheren_kemungkinan', 3)->assertJsonPath('data.0.complete', false);
        $this->getJson("/api/pengawasan/review-risiko/{$submission->id}/forms/4?per_page=1&page=2")->assertOk()->assertJsonCount(1, 'data')->assertJsonPath('meta.total', 2)->assertJsonPath('meta.current_page', 2);
    }

    public function test_form4_requires_rca_and_gates_new_submission(): void
    {
        $this->assignAuditorToOpd();
        $this->completeForm2B();
        $this->completeForm2C();
        $this->completeForm3AAndRca(false);
        $item3b = IdentifikasiRisikoOpdItem::firstOrFail();
        $item3c = IdentifikasiRisikoOpdOperasionalItem::firstOrFail();
        Sanctum::actingAs($this->opdUser);
        $request = ['opd_id' => $this->opd->id, 'periode_penilaian_id' => $this->activePeriode->id];
        $this->postJson('/api/risiko/pengajuan/submit', $request)->assertUnprocessable();
        $payload = ['kriteria_kemungkinan' => 'Jumlah Frekuensi (dlm 1 tahun)', 'inheren_kemungkinan' => 3,
            'kriteria_dampak' => 'Penurunan reputasi', 'inheren_dampak' => 4, 'pengendalian_ada' => false,
            'residual_kriteria_kemungkinan' => 'Jumlah Frekuensi (dlm 1 tahun)', 'residual_kriteria_dampak' => 'Penurunan kinerja', 'residual_kemungkinan' => 2, 'residual_dampak' => 3];
        $rca = RootCauseAnalysis::where('identifikasi_risiko_opd_item_id', $item3b->id)->firstOrFail();
        $rca->update(['jenis_penyebab' => null]);
        $this->putJson("/api/risiko/analisis-risiko/3b/{$item3b->id}", $payload)->assertUnprocessable()->assertJsonValidationErrors('rca');
        $rca->update(['jenis_penyebab' => 'Man']);
        $this->putJson("/api/risiko/analisis-risiko/3b/{$item3b->id}", $payload)->assertOk();
        $this->putJson("/api/risiko/analisis-risiko/3c/{$item3c->id}", $payload)->assertOk();
        $tindak = ['celah_pengendalian' => 'Prosedur belum memadai', 'rencana_tindak' => 'Perbaiki prosedur', 'penanggung_jawab' => 'Kepala bidang', 'target_waktu' => 'Akhir tahun', 'treated_kemungkinan' => 1, 'treated_dampak' => 1];
        $this->putJson("/api/risiko/tindak-pengendalian/3b/{$item3b->id}", $tindak)->assertOk();
        $this->putJson("/api/risiko/tindak-pengendalian/3c/{$item3c->id}", $tindak)->assertOk();
        $komunikasi = ['media_komunikasi' => 'Rapat koordinasi', 'penyedia_informasi' => 'PPTK', 'penerima_informasi' => 'Kadis', 'rencana_waktu' => 'Akhir tahun'];
        $this->putJson("/api/risiko/komunikasi-pengendalian/3b/{$item3b->id}", $komunikasi)->assertOk();
        $this->putJson("/api/risiko/komunikasi-pengendalian/3c/{$item3c->id}", $komunikasi)->assertOk();
        $pemantauan = ['bentuk_pemantauan' => 'Reviu Dokumen', 'penanggung_jawab_pemantauan' => 'Irban Khusus', 'rencana_waktu_pemantauan' => 'Triwulan IV'];
        $this->putJson("/api/risiko/pemantauan-pengendalian/3b/{$item3b->id}", $pemantauan)->assertOk();
        $this->putJson("/api/risiko/pemantauan-pengendalian/3c/{$item3c->id}", $pemantauan)->assertOk();
        $this->postJson('/api/risiko/kejadian-risiko/confirm-nihil', array_merge($request, ['is_nihil' => true]))->assertOk();
        $this->postJson('/api/risiko/fra/confirm-nihil', array_merge($request, ['is_nihil' => true]))->assertOk();
        $this->postJson('/api/risiko/pengajuan/submit', $request)->assertOk();
        $this->assertDatabaseHas('pengajuan_penilaian_risiko_items', ['form_code' => '4', 'status' => 'submitted']);
        $this->putJson("/api/risiko/analisis-risiko/3b/{$item3b->id}", $payload)->assertForbidden();
    }

    public function test_opd_without_auditor_cannot_store_form_2b(): void
    {
        Sanctum::actingAs($this->opdUser);

        $response = $this->postJson('/api/risiko/konteks-strategis', [
            'periode_penilaian_id' => $this->activePeriode->id,
            'opd_id' => $this->opd->id,
            'sumber_data_id' => $this->sumberData->id,
            'tujuan_penilaian_id' => $this->tujuan->id,
            'sasaran_ids' => [$this->sasaran->id],
            'indikator_ids' => [$this->indikator->id],
        ]);

        $response->assertStatus(403);
        $this->assertStringContainsString('belum memiliki Auditor Pengawas', $response->json('message'));
    }

    public function test_opd_with_auditor_can_store_form_2b(): void
    {
        $this->assignAuditorToOpd();
        Sanctum::actingAs($this->opdUser);

        $response = $this->postJson('/api/risiko/konteks-strategis', [
            'periode_penilaian_id' => $this->activePeriode->id,
            'opd_id' => $this->opd->id,
            'sumber_data_id' => $this->sumberData->id,
            'tujuan_penilaian_id' => $this->tujuan->id,
            'sasaran_ids' => [$this->sasaran->id],
            'indikator_ids' => [$this->indikator->id],
        ]);

        $response->assertStatus(201);
    }

    public function test_opd_cannot_submit_if_forms_are_incomplete(): void
    {
        $this->assignAuditorToOpd();
        $this->completeForm2B(); // Only Form 2B completed, 2C is still missing!

        Sanctum::actingAs($this->opdUser);

        $response = $this->postJson('/api/risiko/pengajuan/submit', [
            'opd_id' => $this->opd->id,
            'periode_penilaian_id' => $this->activePeriode->id,
        ]);

        $response->assertStatus(422);
        $this->assertStringContainsString('wajib dilengkapi terlebih dahulu', $response->json('message'));
    }

    public function test_opd_can_submit_when_all_forms_are_complete(): void
    {
        $this->assignAuditorToOpd();
        $this->completeForm2B();
        $this->completeForm2C();
        $this->completeForm3AAndRca();

        Sanctum::actingAs($this->opdUser);

        $response = $this->postJson('/api/risiko/pengajuan/submit', [
            'opd_id' => $this->opd->id,
            'periode_penilaian_id' => $this->activePeriode->id,
            'catatan' => 'Mohon ditinjau lembar kerja risiko Dinkes 2024.',
        ]);

        $response->assertStatus(200);

        $submission = PengajuanPenilaianRisiko::where('opd_id', $this->opd->id)->first();
        $this->assertNotNull($submission);
        $this->assertEquals(PengajuanPenilaianRisiko::STATUS_SUBMITTED_TO_KEPALA, $submission->status);
        $this->assertEquals(PengajuanPenilaianRisiko::TIER_KEPALA_OPD, $submission->current_tier);
        $this->assertEquals($this->auditorUser->id, $submission->auditor_id);
    }

    public function test_opd_cannot_edit_forms_when_submission_is_locked(): void
    {
        $this->assignAuditorToOpd();
        $this->completeForm2B();
        $this->completeForm2C();
        $this->completeForm3AAndRca();

        // Submit to lock it
        Sanctum::actingAs($this->opdUser);
        $this->postJson('/api/risiko/pengajuan/submit', [
            'opd_id' => $this->opd->id,
            'periode_penilaian_id' => $this->activePeriode->id,
        ])->assertStatus(200);

        // Attempt to edit Form 2B while under review
        $response = $this->postJson('/api/risiko/konteks-strategis', [
            'periode_penilaian_id' => $this->activePeriode->id,
            'opd_id' => $this->opd->id,
            'sumber_data_id' => $this->sumberData->id,
            'tujuan_penilaian_id' => $this->tujuan->id,
            'sasaran_ids' => [$this->sasaran->id],
            'indikator_ids' => [$this->indikator->id],
        ]);

        $response->assertStatus(403);
        $this->assertStringContainsString('sedang dalam proses pemeriksaan', $response->json('message'));
    }

    public function test_unassigned_auditor_cannot_review_opd(): void
    {
        $this->assignAuditorToOpd(); // Assigned to auditorUser, NOT otherAuditorUser
        $this->completeForm2B();
        $this->completeForm2C();
        $this->completeForm3AAndRca();

        Sanctum::actingAs($this->opdUser);
        $this->postJson('/api/risiko/pengajuan/submit', [
            'opd_id' => $this->opd->id,
            'periode_penilaian_id' => $this->activePeriode->id,
        ])->assertStatus(200);

        $submission = PengajuanPenilaianRisiko::where('opd_id', $this->opd->id)->first();

        // Attempt review by otherAuditorUser
        Sanctum::actingAs($this->otherAuditorUser);
        $response = $this->postJson("/api/pengawasan/review-risiko/{$submission->id}/item", [
            'form_code' => '2b',
            'status' => 'approved',
        ]);

        $response->assertStatus(403);
    }

    public function test_auditor_reject_without_notes_is_blocked(): void
    {
        $this->assignAuditorToOpd();
        $this->completeForm2B();
        $this->completeForm2C();
        $this->completeForm3AAndRca();

        Sanctum::actingAs($this->opdUser);
        $this->postJson('/api/risiko/pengajuan/submit', [
            'opd_id' => $this->opd->id,
            'periode_penilaian_id' => $this->activePeriode->id,
        ])->assertStatus(200);

        $submission = PengajuanPenilaianRisiko::where('opd_id', $this->opd->id)->first();

        Sanctum::actingAs($this->auditorUser);
        $response = $this->postJson("/api/pengawasan/review-risiko/{$submission->id}/item", [
            'form_code' => '2b',
            'status' => 'rejected',
            'catatan_revisi' => '', // Empty notes!
        ]);

        $response->assertStatus(422);
        $this->assertStringContainsString('Catatan revisi wajib diisi', $response->json('message'));
    }

    public function test_auditor_can_reject_form_with_notes_and_opd_can_edit_again(): void
    {
        $this->assignAuditorToOpd();
        $this->completeForm2B();
        $this->completeForm2C();
        $this->completeForm3AAndRca();

        Sanctum::actingAs($this->opdUser);
        $this->postJson('/api/risiko/pengajuan/submit', [
            'opd_id' => $this->opd->id,
            'periode_penilaian_id' => $this->activePeriode->id,
        ])->assertStatus(200);

        $submission = PengajuanPenilaianRisiko::where('opd_id', $this->opd->id)->first();

        // Kepala OPD approves to forward to Auditor
        Sanctum::actingAs($this->kepalaOpdUser);
        $this->postJson("/api/risiko/pengajuan/{$submission->id}/review-kepala", [
            'status' => 'approved',
        ])->assertStatus(200);

        // Auditor rejects Form 2C with notes
        Sanctum::actingAs($this->auditorUser);
        $reviewRes = $this->postJson("/api/pengawasan/review-risiko/{$submission->id}/item", [
            'form_code' => '2c',
            'status' => 'rejected',
            'catatan_revisi' => 'Target pada sub kegiatan vaksinasi belum dicantumkan.',
        ]);

        $reviewRes->assertStatus(200);

        $submission->refresh();
        $this->assertEquals(PengajuanPenilaianRisiko::STATUS_REVISION_BY_AUDITOR, $submission->status);
        $this->assertEquals(PengajuanPenilaianRisiko::TIER_KEPALA_OPD, $submission->current_tier);

        // Operator still cannot edit until Kepala OPD delegates it
        Sanctum::actingAs($this->opdUser);
        $editBlockedRes = $this->postJson('/api/risiko/konteks-strategis', [
            'periode_penilaian_id' => $this->activePeriode->id,
            'opd_id' => $this->opd->id,
            'sumber_data_id' => $this->sumberData->id,
            'tujuan_penilaian_id' => $this->tujuan->id,
            'sasaran_ids' => [$this->sasaran->id],
            'indikator_ids' => [$this->indikator->id],
        ]);
        $editBlockedRes->assertStatus(403);

        // Kepala OPD delegates revision to Operator
        Sanctum::actingAs($this->kepalaOpdUser);
        $this->postJson("/api/risiko/pengajuan/{$submission->id}/delegate-operator", [
            'catatan' => 'Tolong perbaiki target vaksinasi sesuai catatan auditor.',
        ])->assertStatus(200);

        $submission->refresh();
        $this->assertEquals(PengajuanPenilaianRisiko::STATUS_REVISION_TO_OPERATOR, $submission->status);

        // OPD can now edit Form 2C to fix it
        Sanctum::actingAs($this->opdUser);
        $editRes = $this->postJson('/api/risiko/konteks-strategis', [
            'periode_penilaian_id' => $this->activePeriode->id,
            'opd_id' => $this->opd->id,
            'sumber_data_id' => $this->sumberData->id,
            'tujuan_penilaian_id' => $this->tujuan->id,
            'sasaran_ids' => [$this->sasaran->id],
            'indikator_ids' => [$this->indikator->id],
        ]);

        $editRes->assertStatus(201);
    }

    public function test_all_forms_approved_sets_submission_to_approved(): void
    {
        $this->assignAuditorToOpd();
        $this->completeForm2B();
        $this->completeForm2C();
        $this->completeForm3AAndRca();

        Sanctum::actingAs($this->opdUser);
        $this->postJson('/api/risiko/pengajuan/submit', [
            'opd_id' => $this->opd->id,
            'periode_penilaian_id' => $this->activePeriode->id,
        ])->assertStatus(200);

        $submission = PengajuanPenilaianRisiko::where('opd_id', $this->opd->id)->first();

        // Kepala OPD approves
        Sanctum::actingAs($this->kepalaOpdUser);
        $this->postJson("/api/risiko/pengajuan/{$submission->id}/review-kepala", [
            'status' => 'approved',
        ])->assertStatus(200);

        Sanctum::actingAs($this->auditorUser);

        // Auditor approves Form 2B
        $this->postJson("/api/pengawasan/review-risiko/{$submission->id}/item", [
            'form_code' => '2b',
            'status' => 'approved',
        ])->assertStatus(200);

        // Auditor approves Form 2C
        $this->postJson("/api/pengawasan/review-risiko/{$submission->id}/item", [
            'form_code' => '2c',
            'status' => 'approved',
        ])->assertStatus(200);

        // Auditor approves Form 3A
        $this->postJson("/api/pengawasan/review-risiko/{$submission->id}/item", [
            'form_code' => '3a',
            'status' => 'approved',
        ])->assertStatus(200);

        // Auditor approves Form 3B
        $this->postJson("/api/pengawasan/review-risiko/{$submission->id}/item", [
            'form_code' => '3b',
            'status' => 'approved',
        ])->assertStatus(200);

        // Auditor approves Form 3C
        $this->postJson("/api/pengawasan/review-risiko/{$submission->id}/item", [
            'form_code' => '3c',
            'status' => 'approved',
        ])->assertStatus(200);

        $submission->refresh();
        $this->assertEquals(PengajuanPenilaianRisiko::STATUS_IN_REVIEW_AUDITOR, $submission->status);

        // Auditor approves Form RCA -> forward to Pengawas
        $this->postJson("/api/pengawasan/review-risiko/{$submission->id}/item", [
            'form_code' => '4',
            'status' => 'approved',
        ])->assertStatus(200);

        $this->postJson("/api/pengawasan/review-risiko/{$submission->id}/item", [
            'form_code' => 'rca',
            'status' => 'approved',
        ])->assertStatus(200);

        foreach (['5', '6', '7', '8', '9', '10', 'fra'] as $code) {
            $this->postJson("/api/pengawasan/review-risiko/{$submission->id}/item", ['form_code' => $code, 'status' => 'approved'])->assertOk();
        }

        $submission->refresh();
        $this->assertEquals(PengajuanPenilaianRisiko::STATUS_SUBMITTED_TO_PENGAWAS, $submission->status);
        $this->assertEquals(PengajuanPenilaianRisiko::TIER_PENGAWAS, $submission->current_tier);

        // Pengawas reviews and approves all forms
        Sanctum::actingAs($this->pengawasUser);

        $this->postJson("/api/pengawasan/review-risiko/{$submission->id}/review-pengawas", [
            'form_code' => '2b',
            'status' => 'approved',
        ])->assertStatus(200);

        $this->postJson("/api/pengawasan/review-risiko/{$submission->id}/review-pengawas", [
            'form_code' => '2c',
            'status' => 'approved',
        ])->assertStatus(200);

        $this->postJson("/api/pengawasan/review-risiko/{$submission->id}/review-pengawas", [
            'form_code' => '3a',
            'status' => 'approved',
        ])->assertStatus(200);

        $this->postJson("/api/pengawasan/review-risiko/{$submission->id}/review-pengawas", [
            'form_code' => '3b',
            'status' => 'approved',
        ])->assertStatus(200);

        $this->postJson("/api/pengawasan/review-risiko/{$submission->id}/review-pengawas", [
            'form_code' => '3c',
            'status' => 'approved',
        ])->assertStatus(200);

        $this->postJson("/api/pengawasan/review-risiko/{$submission->id}/review-pengawas", [
            'form_code' => '4',
            'status' => 'approved',
        ])->assertStatus(200);

        $this->postJson("/api/pengawasan/review-risiko/{$submission->id}/review-pengawas", [
            'form_code' => 'rca',
            'status' => 'approved',
        ])->assertStatus(200);

        foreach (['5', '6', '7', '8', '9', '10', 'fra'] as $code) {
            $this->postJson("/api/pengawasan/review-risiko/{$submission->id}/review-pengawas", ['form_code' => $code, 'status' => 'approved'])->assertOk();
        }

        $submission->refresh();
        $this->assertEquals(PengajuanPenilaianRisiko::STATUS_APPROVED, $submission->status);
        $this->assertEquals(PengajuanPenilaianRisiko::TIER_COMPLETED, $submission->current_tier);
        $this->assertNotNull($submission->approved_at);
        $this->assertEquals($this->pengawasUser->id, $submission->approved_by);
        $this->assertEquals($this->pengawasUser->id, $submission->pengawas_id);
    }

    public function test_auditor_cannot_review_if_opd_has_not_submitted_yet(): void
    {
        $this->assignAuditorToOpd();
        $this->completeForm2B();
        $this->completeForm2C();
        $this->completeForm3AAndRca();

        // OPD only checks readiness, creating draft submission but has NOT submitted
        Sanctum::actingAs($this->opdUser);
        $statusRes = $this->getJson("/api/risiko/pengajuan/status?opd_id={$this->opd->id}");
        $statusRes->assertStatus(200);
        $submissionId = $statusRes->json('data.submission.id');

        // Auditor attempts to approve early while OPD is in draft
        Sanctum::actingAs($this->auditorUser);
        $res = $this->postJson("/api/pengawasan/review-risiko/{$submissionId}/item", [
            'form_code' => '2b',
            'status' => 'approved',
        ]);

        $res->assertStatus(422);
        $this->assertStringContainsString('belum diajukan oleh Kepala OPD', $res->json('message'));
    }

    public function test_opd_cannot_edit_already_approved_form_item_during_revision(): void
    {
        $this->assignAuditorToOpd();
        $this->completeForm2B();
        $operasional = $this->completeForm2C();
        $this->completeForm3AAndRca();

        Sanctum::actingAs($this->opdUser);
        $this->postJson('/api/risiko/pengajuan/submit', [
            'opd_id' => $this->opd->id,
            'periode_penilaian_id' => $this->activePeriode->id,
        ])->assertStatus(200);

        $submission = PengajuanPenilaianRisiko::where('opd_id', $this->opd->id)->first();

        // Kepala OPD approves to forward to Auditor
        Sanctum::actingAs($this->kepalaOpdUser);
        $this->postJson("/api/risiko/pengajuan/{$submission->id}/review-kepala", [
            'status' => 'approved',
        ])->assertStatus(200);

        Sanctum::actingAs($this->auditorUser);
        // Auditor approves 2B
        $this->postJson("/api/pengawasan/review-risiko/{$submission->id}/item", [
            'form_code' => '2b',
            'status' => 'approved',
        ])->assertStatus(200);

        // Auditor rejects 2C with note
        $this->postJson("/api/pengawasan/review-risiko/{$submission->id}/item", [
            'form_code' => '2c',
            'status' => 'rejected',
            'catatan_revisi' => 'Target sub kegiatan belum diisi.',
        ])->assertStatus(200);

        // Kepala OPD delegates to Operator
        Sanctum::actingAs($this->kepalaOpdUser);
        $this->postJson("/api/risiko/pengajuan/{$submission->id}/delegate-operator", [
            'catatan' => 'Perbaiki target sub kegiatan.',
        ])->assertStatus(200);

        // Now OPD attempts to edit Form 2B (which was already approved)
        Sanctum::actingAs($this->opdUser);
        $edit2BRes = $this->postJson('/api/risiko/konteks-strategis', [
            'periode_penilaian_id' => $this->activePeriode->id,
            'opd_id' => $this->opd->id,
            'sumber_data_id' => $this->sumberData->id,
            'tujuan_penilaian_id' => $this->tujuan->id,
            'sasaran_ids' => [$this->sasaran->id],
            'indikator_ids' => [$this->indikator->id],
        ]);

        $edit2BRes->assertStatus(403);
        $this->assertStringContainsString('telah disetujui', $edit2BRes->json('message'));

        // But OPD CAN edit Form 2C (which was rejected and needs revision)
        $edit2CRes = $this->postJson("/api/risiko/konteks-operasional/{$operasional->id}/items", [
            'jenis' => 'program',
            'kode' => '2',
            'nama' => 'Program Tambahan Revisi',
            'urutan' => 2,
        ]);

        $edit2CRes->assertStatus(201);
    }

    public function test_auditor_review_list_status_and_search_filters(): void
    {
        $this->assignAuditorToOpd();
        $this->completeForm2B();
        $this->completeForm2C();
        $this->completeForm3AAndRca();

        Sanctum::actingAs($this->opdUser);
        $this->postJson('/api/risiko/pengajuan/submit', [
            'opd_id' => $this->opd->id,
            'periode_penilaian_id' => $this->activePeriode->id,
        ])->assertStatus(200);

        $submission = PengajuanPenilaianRisiko::where('opd_id', $this->opd->id)->first();
        $this->assertEquals(PengajuanPenilaianRisiko::STATUS_SUBMITTED_TO_KEPALA, $submission->status);

        // Kepala OPD approves to forward to Auditor
        Sanctum::actingAs($this->kepalaOpdUser);
        $this->postJson("/api/risiko/pengajuan/{$submission->id}/review-kepala", [
            'status' => 'approved',
        ])->assertStatus(200);

        $submission->refresh();
        $this->assertEquals(PengajuanPenilaianRisiko::STATUS_SUBMITTED_TO_AUDITOR, $submission->status);

        Sanctum::actingAs($this->auditorUser);

        // 1. Filter 'submitted' should return this OPD
        $resSubmitted = $this->getJson('/api/pengawasan/review-risiko?status=submitted');
        $resSubmitted->assertStatus(200);
        $this->assertCount(1, $resSubmitted->json('data'));
        $this->assertEquals($this->opd->id, $resSubmitted->json('data.0.id'));

        // 2. Filter 'approved' should NOT return this OPD
        $resApproved = $this->getJson('/api/pengawasan/review-risiko?status=approved');
        $resApproved->assertStatus(200);
        $this->assertCount(0, $resApproved->json('data'));

        // 3. Auditor starts review
        $this->postJson("/api/pengawasan/review-risiko/{$submission->id}/start")->assertStatus(200);
        $submission->refresh();
        $this->assertEquals(PengajuanPenilaianRisiko::STATUS_IN_REVIEW_AUDITOR, $submission->status);

        // Filter 'submitted' (Menunggu Review tab) MUST still include in_review
        $resInReview = $this->getJson('/api/pengawasan/review-risiko?status=submitted');
        $resInReview->assertStatus(200);
        $this->assertCount(1, $resInReview->json('data'));
        $this->assertEquals($this->opd->id, $resInReview->json('data.0.id'));

        // 4. Case-insensitive search
        $lowerName = strtolower(substr($this->opd->nama, 0, 5));
        $resSearch = $this->getJson("/api/pengawasan/review-risiko?search={$lowerName}");
        $resSearch->assertStatus(200);
        $this->assertCount(1, $resSearch->json('data'));

        // 5. Auditor rejects an item -> status becomes revision_by_auditor
        $this->postJson("/api/pengawasan/review-risiko/{$submission->id}/item", [
            'form_code' => '2b',
            'status' => 'rejected',
            'catatan_revisi' => 'Perlu penyesuaian indikator sasaran.',
        ])->assertStatus(200);

        // Filter 'revision_requested'
        $resRev = $this->getJson('/api/pengawasan/review-risiko?status=revision_requested');
        $resRev->assertStatus(200);
        $this->assertCount(1, $resRev->json('data'));

        // Filter 'submitted' should now be empty
        $resSubmittedAfterRev = $this->getJson('/api/pengawasan/review-risiko?status=submitted');
        $resSubmittedAfterRev->assertStatus(200);
        $this->assertCount(0, $resSubmittedAfterRev->json('data'));
    }
}
