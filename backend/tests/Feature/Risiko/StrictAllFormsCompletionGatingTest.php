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
use App\Models\Risiko\PengajuanPenilaianRisikoItem;
use App\Models\Risiko\RootCauseAnalysis;
use App\Models\Risiko\StatusFraudRiskAssessmentOpd;
use App\Models\Risiko\StatusKejadianRisikoOpd;
use App\Models\Risiko\TindakPengendalianRisiko;
use App\Models\User;
use Database\Seeders\RbacSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class StrictAllFormsCompletionGatingTest extends TestCase
{
    use RefreshDatabase;

    protected User $operatorUser;

    protected User $kepalaOpdUser;

    protected User $auditorUser;

    protected Opd $opd;

    protected PeriodePenilaian $activePeriode;

    protected MasterSumberData $sumberData;

    protected MasterUrusanPemerintahan $urusan;

    protected TujuanPenilaian $tujuan;

    protected SasaranPenilaian $sasaran;

    protected IndikatorPenilaian $indikator;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RbacSeeder::class);

        $this->opd = Opd::create([
            'nama' => 'Dinas Pendidikan',
            'kode' => 'Disdik',
            'kategori' => 'Dinas',
            'is_active' => true,
        ]);

        $this->activePeriode = PeriodePenilaian::create([
            'nama_periode' => 'RPJMD 2026-2031',
            'tahun_mulai' => 2026,
            'tahun_akhir' => 2031,
            'tahun_penilaian' => 2026,
            'tanggal_mulai' => '2026-01-01',
            'tanggal_akhir' => '2031-12-31',
            'status' => 'aktif',
        ]);

        $this->operatorUser = User::factory()->create([
            'name' => 'Operator Disdik',
            'email' => 'operator.disdik@pemda.go.id',
            'opd_id' => $this->opd->id,
            'status' => 'active',
        ]);
        $this->operatorUser->assignRole('OPD');

        $this->kepalaOpdUser = User::factory()->create([
            'name' => 'Kepala Dinas Pendidikan',
            'email' => 'kepala.disdik@pemda.go.id',
            'opd_id' => $this->opd->id,
            'status' => 'active',
        ]);
        $this->kepalaOpdUser->assignRole('Executive');

        $this->auditorUser = User::factory()->create([
            'name' => 'Auditor Pembina Disdik',
            'email' => 'auditor.disdik@pemda.go.id',
            'status' => 'active',
        ]);
        $this->auditorUser->assignRole('Auditor');

        AuditorOpdAssignment::create([
            'auditor_id' => $this->auditorUser->id,
            'opd_id' => $this->opd->id,
            'periode_penilaian_id' => $this->activePeriode->id,
            'is_active' => true,
        ]);

        $this->sumberData = MasterSumberData::create([
            'nama' => 'Renstra Disdik 2026-2031',
            'urutan' => 1,
            'is_active' => true,
        ]);

        $this->urusan = MasterUrusanPemerintahan::firstOrCreate(
            ['kode' => '01'],
            ['nama' => 'Pendidikan', 'is_active' => true, 'urutan' => 1]
        );

        $this->tujuan = TujuanPenilaian::create([
            'periode_penilaian_id' => $this->activePeriode->id,
            'opd_id' => $this->opd->id,
            'sumber_data_id' => $this->sumberData->id,
            'kode_tujuan' => 'T.1',
            'tujuan' => 'Meningkatkan Mutu dan Aksesibilitas Pendidikan',
        ]);

        $this->sasaran = SasaranPenilaian::create([
            'periode_penilaian_id' => $this->activePeriode->id,
            'opd_id' => $this->opd->id,
            'tujuan_penilaian_id' => $this->tujuan->id,
            'kode_sasaran' => 'S.1',
            'sasaran' => 'Meningkatnya Angka Partisipasi Sekolah',
        ]);

        $this->indikator = IndikatorPenilaian::create([
            'periode_penilaian_id' => $this->activePeriode->id,
            'opd_id' => $this->opd->id,
            'tujuan_penilaian_id' => $this->tujuan->id,
            'sasaran_penilaian_id' => $this->sasaran->id,
            'kode_indikator' => 'I.1',
            'indikator' => 'Harapan Lama Sekolah (HLS)',
        ]);
    }

    /**
     * Complete steps 1 to 6 (2B, 2C, 3A, 3B, 3C, and RCA).
     */
    protected function completeSteps1Through6(): array
    {
        // 1. Form 2B
        $konteks = KonteksPenilaian::create([
            'periode_penilaian_id' => $this->activePeriode->id,
            'opd_id' => $this->opd->id,
            'sumber_data_id' => $this->sumberData->id,
            'tujuan_penilaian_id' => $this->tujuan->id,
            'nama_pemda' => 'Pemerintah Daerah',
            'nama_kepala' => 'Dr. H. Kepala Disdik',
            'status' => 'ditetapkan',
        ]);
        $konteks->sasarans()->attach($this->sasaran->id);
        $konteks->indikators()->attach($this->indikator->id);

        // 2. Form 2C
        $operasional = KonteksOperasional::create([
            'periode_penilaian_id' => $this->activePeriode->id,
            'opd_id' => $this->opd->id,
            'status' => 'draft',
        ]);
        KonteksOperasionalItem::create([
            'konteks_operasional_id' => $operasional->id,
            'parent_id' => null,
            'jenis' => 'program',
            'kode' => '1.01',
            'nama' => 'Program Pengelolaan Pendidikan Dasar',
            'urutan' => 1,
        ]);

        // 3. Form 3A & RCA
        $dokumen3a = IdentifikasiRisikoPemda::create([
            'periode_penilaian_id' => $this->activePeriode->id,
            'opd_id' => $this->opd->id,
            'master_urusan_pemerintahan_id' => $this->urusan->id,
            'nama_pemda' => 'Pemerintah Daerah',
            'status' => 'draft',
        ]);
        $item3a = IdentifikasiRisikoPemdaItem::create([
            'identifikasi_risiko_pemda_id' => $dokumen3a->id,
            'sasaran_penilaian_id' => $this->sasaran->id,
            'indikator_penilaian_id' => $this->indikator->id,
            'kategori_risiko' => 'Risiko Strategis',
            'nomor_urut' => 1,
            'pernyataan_risiko' => 'Risiko Capaian SPM Pendidikan Menurun',
            'kode_risiko' => 'RSP.26.RS.001',
            'pemilik_risiko' => 'Kepala Daerah',
            'sifat_risiko' => 'C',
            'uraian_dampak' => 'Kualitas SDM menurun',
            'pihak_terkena' => 'Masyarakat',
            'urutan' => 1,
        ]);
        RootCauseAnalysis::create([
            'source_type' => '3a',
            'identifikasi_risiko_pemda_item_id' => $item3a->id,
            'why_1' => 'Anggaran sarpras pendidikan terbatas',
            'akar_penyebab' => 'Anggaran sarpras pendidikan terbatas',
            'jenis_penyebab' => 'Money',
            'kegiatan_pengendalian' => 'Optimalisasi alokasi belanja modal sekolah',
        ]);

        // 4. Form 3B & RCA
        $dokumen3b = IdentifikasiRisikoOpd::create([
            'periode_penilaian_id' => $this->activePeriode->id,
            'opd_id' => $this->opd->id,
            'master_urusan_pemerintahan_id' => $this->urusan->id,
            'nama_pemda' => 'Pemerintah Daerah',
            'singkatan_opd' => 'DISDIK',
            'status' => 'draft',
        ]);
        $item3b = IdentifikasiRisikoOpdItem::create([
            'identifikasi_risiko_opd_id' => $dokumen3b->id,
            'sasaran_penilaian_id' => $this->sasaran->id,
            'indikator_penilaian_id' => $this->indikator->id,
            'kategori_risiko' => 'Risiko Strategis',
            'nomor_urut' => 1,
            'pernyataan_risiko' => 'Risiko Distribusi Guru Belum Merata',
            'kode_risiko' => 'RSO.26.DISDIK.RS.001',
            'pemilik_risiko' => 'Kepala Dinas Pendidikan',
            'sifat_risiko' => 'C',
            'uraian_dampak' => 'Kesenjangan mutu sekolah pinggiran',
            'pihak_terkena' => 'Siswa dan Orang Tua',
            'urutan' => 1,
        ]);
        RootCauseAnalysis::create([
            'source_type' => '3b',
            'identifikasi_risiko_opd_item_id' => $item3b->id,
            'why_1' => 'Sistem zonasi penempatan belum optimal',
            'akar_penyebab' => 'Sistem zonasi penempatan belum optimal',
            'jenis_penyebab' => 'Method',
            'kegiatan_pengendalian' => 'Penyusunan regulasi redistribusi guru berkala',
        ]);

        // 5. Form 3C & RCA
        $dokumen3c = IdentifikasiRisikoOpdOperasional::create([
            'periode_penilaian_id' => $this->activePeriode->id,
            'opd_id' => $this->opd->id,
            'master_urusan_pemerintahan_id' => $this->urusan->id,
            'nama_pemda' => 'Pemerintah Daerah',
            'singkatan_opd' => 'DISDIK',
            'status' => 'draft',
        ]);
        $item3c = IdentifikasiRisikoOpdOperasionalItem::create([
            'identifikasi_risiko_opd_operasional_id' => $dokumen3c->id,
            'sub_kegiatan_kustom' => 'Pengadaan Sarana Laboratorium IPA',
            'probis' => 'Pelaksanaan',
            'kategori_risiko' => 'Risiko Operasional',
            'nomor_urut' => 1,
            'pernyataan_risiko' => 'Keterlambatan pengiriman alkes laboratorium oleh penyedia',
            'kode_risiko' => 'ROO.26.DISDIK.RO.001',
            'pemilik_risiko' => 'PPK Disdik',
            'sifat_risiko' => 'C',
            'uraian_dampak' => 'Praktikum siswa semester 1 tertunda',
            'pihak_terkena' => 'Siswa SMP',
            'urutan' => 1,
        ]);
        RootCauseAnalysis::create([
            'source_type' => '3c',
            'identifikasi_risiko_opd_operasional_item_id' => $item3c->id,
            'why_1' => 'Pabrikasi alkes terhambat rantai pasok impor',
            'akar_penyebab' => 'Pabrikasi alkes terhambat rantai pasok impor',
            'jenis_penyebab' => 'Eksternal',
            'kegiatan_pengendalian' => 'Klausul sanksi progres berkala & asistensi teknis',
        ]);

        return compact('item3b', 'item3c');
    }

    /**
     * Complete remaining steps 7 to 14 (4, 5, 6, 7, 8, 9, 10, FRA).
     */
    protected function completeSteps7Through14(IdentifikasiRisikoOpdItem $item3b, IdentifikasiRisikoOpdOperasionalItem $item3c): void
    {
        $analysisTemplate = [
            'kriteria_kemungkinan' => 'Jumlah Frekuensi (dlm 1 tahun)',
            'inheren_kemungkinan' => 4,
            'kriteria_dampak' => 'Penurunan reputasi',
            'inheren_dampak' => 4,
            'pengendalian_ada' => false,
            'residual_kriteria_kemungkinan' => 'Jumlah Frekuensi (dlm 1 tahun)',
            'residual_kriteria_dampak' => 'Penurunan kinerja',
            'residual_kemungkinan' => 2,
            'residual_dampak' => 2,
            'rencana_tindak' => 'Tindak lanjut penguatan SOP dan monitoring',
        ];

        foreach ([['risiko_opd_item_id' => $item3b->id], ['risiko_operasional_item_id' => $item3c->id]] as $source) {
            // Form 4 & 5 (Analisis & Prioritas)
            $analisis = AnalisisRisiko::create(array_merge($analysisTemplate, $source));

            // Form 6 & 7 (Tindak Pengendalian & Peta Risiko)
            TindakPengendalianRisiko::create([
                'analisis_risiko_id' => $analisis->id,
                'celah_pengendalian' => 'Prosedur pemantauan belum terdokumentasi',
                'penanggung_jawab' => 'Kabid Terkait',
                'target_waktu' => 'Triwulan III',
                'treated_kemungkinan' => 1,
                'treated_dampak' => 1,
            ]);

            // Form 8 (Komunikasi Pengendalian)
            KomunikasiPengendalianRisiko::create([
                'analisis_risiko_id' => $analisis->id,
                'media_komunikasi' => 'Rapat Koordinasi Bulanan',
                'penyedia_informasi' => 'PPTK Disdik',
                'penerima_informasi' => 'Kepala Dinas',
                'rencana_waktu' => 'Tiap Akhir Bulan',
            ]);

            // Form 9 (Pemantauan Pengendalian)
            PemantauanPengendalianRisiko::create([
                'analisis_risiko_id' => $analisis->id,
                'bentuk_pemantauan' => 'Reviu Dokumen dan Kunjungan Lapangan',
                'penanggung_jawab_pemantauan' => 'Tim Pengawas Internal Disdik',
                'rencana_waktu_pemantauan' => 'Triwulan II dan IV',
            ]);
        }

        // Form 10 (Kejadian Risiko)
        StatusKejadianRisikoOpd::create([
            'opd_id' => $this->opd->id,
            'periode_penilaian_id' => $this->activePeriode->id,
            'is_nihil' => true,
            'confirmed_by' => $this->operatorUser->id,
            'confirmed_at' => now(),
        ]);

        // Form FRA (Fraud Risk Assessment)
        StatusFraudRiskAssessmentOpd::create([
            'opd_id' => $this->opd->id,
            'periode_penilaian_id' => $this->activePeriode->id,
            'is_nihil' => true,
            'confirmed_by' => $this->operatorUser->id,
            'confirmed_at' => now(),
        ]);
    }

    public function test_readiness_blocks_submission_when_only_steps_1_to_6_are_completed(): void
    {
        $this->completeSteps1Through6();

        Sanctum::actingAs($this->operatorUser);

        // Check readiness
        $response = $this->getJson("/api/risiko/pengajuan/status?opd_id={$this->opd->id}&periode_penilaian_id={$this->activePeriode->id}");

        $response->assertOk()
            ->assertJsonPath('data.all_forms_complete', false)
            ->assertJsonPath('data.can_submit_to_kepala', false)
            ->assertJsonPath('data.is_ready_to_submit', false);

        $missingCodes = collect($response->json('data.missing_forms'))->pluck('code')->all();
        $this->assertContains('4', $missingCodes);
        $this->assertContains('5', $missingCodes);
        $this->assertContains('6', $missingCodes);
        $this->assertContains('7', $missingCodes);
        $this->assertContains('8', $missingCodes);
        $this->assertContains('9', $missingCodes);
        $this->assertContains('10', $missingCodes);
        $this->assertContains('FRA', $missingCodes);

        // Attempt submit to Kepala OPD must fail with 422
        $submitResponse = $this->postJson('/api/risiko/pengajuan/submit', [
            'opd_id' => $this->opd->id,
            'periode_penilaian_id' => $this->activePeriode->id,
        ]);

        $submitResponse->assertStatus(422)
            ->assertJsonValidationErrors(['forms']);

        $submission = PengajuanPenilaianRisiko::where('opd_id', $this->opd->id)
            ->where('periode_penilaian_id', $this->activePeriode->id)
            ->first();

        $this->assertNotNull($submission);
        $this->assertEquals(PengajuanPenilaianRisiko::STATUS_DRAFT, $submission->status);
    }

    public function test_resubmission_after_revisi_kepala_opd_strictly_blocks_when_forms_are_incomplete(): void
    {
        $this->completeSteps1Through6();

        // Create submission in status revision_by_kepala_opd (exactly matching user screenshot)
        $submission = PengajuanPenilaianRisiko::create([
            'opd_id' => $this->opd->id,
            'periode_penilaian_id' => $this->activePeriode->id,
            'auditor_id' => $this->auditorUser->id,
            'status' => PengajuanPenilaianRisiko::STATUS_REVISION_BY_KEPALA,
            'current_tier' => PengajuanPenilaianRisiko::TIER_OPERATOR,
            'submitted_at' => now()->subDay(),
            'submitted_by' => $this->operatorUser->id,
        ]);

        PengajuanPenilaianRisikoItem::create([
            'pengajuan_id' => $submission->id,
            'form_code' => 'rca',
            'status' => PengajuanPenilaianRisikoItem::STATUS_REJECTED,
            'status_kepala_opd' => PengajuanPenilaianRisikoItem::STATUS_REJECTED,
            'catatan_kepala_opd' => 'Harap perbaiki RCA',
        ]);

        Sanctum::actingAs($this->operatorUser);

        // Check readiness: must not allow submit because forms 4 to FRA are incomplete
        $response = $this->getJson("/api/risiko/pengajuan/status?opd_id={$this->opd->id}&periode_penilaian_id={$this->activePeriode->id}");

        $response->assertOk()
            ->assertJsonPath('data.all_forms_complete', false)
            ->assertJsonPath('data.can_submit_to_kepala', false)
            ->assertJsonPath('data.is_ready_to_submit', false);

        // Direct submission attempt must be rejected with 422
        $submitResponse = $this->postJson('/api/risiko/pengajuan/submit', [
            'opd_id' => $this->opd->id,
            'periode_penilaian_id' => $this->activePeriode->id,
        ]);

        $submitResponse->assertStatus(422)
            ->assertJsonValidationErrors(['forms']);

        $submission->refresh();
        $this->assertEquals(PengajuanPenilaianRisiko::STATUS_REVISION_BY_KEPALA, $submission->status);
    }

    public function test_submission_succeeds_and_registers_all_14_forms_when_100_percent_complete(): void
    {
        $items = $this->completeSteps1Through6();
        $this->completeSteps7Through14($items['item3b'], $items['item3c']);

        Sanctum::actingAs($this->operatorUser);

        // Check readiness: must be 100% complete
        $response = $this->getJson("/api/risiko/pengajuan/status?opd_id={$this->opd->id}&periode_penilaian_id={$this->activePeriode->id}");

        $response->assertOk()
            ->assertJsonPath('data.all_forms_complete', true)
            ->assertJsonPath('data.can_submit_to_kepala', true)
            ->assertJsonPath('data.is_ready_to_submit', true)
            ->assertJsonCount(0, 'data.missing_forms');

        // Submit to Kepala OPD
        $submitResponse = $this->postJson('/api/risiko/pengajuan/submit', [
            'opd_id' => $this->opd->id,
            'periode_penilaian_id' => $this->activePeriode->id,
            'catatan' => 'Seluruh 14 lembar kerja risiko telah lengkap.',
        ]);

        $submitResponse->assertOk()
            ->assertJsonPath('message', 'Seluruh lembar kerja pengelolaan risiko berhasil diajukan kepada Kepala OPD.');

        $submission = PengajuanPenilaianRisiko::where('opd_id', $this->opd->id)
            ->where('periode_penilaian_id', $this->activePeriode->id)
            ->firstOrFail();

        $this->assertEquals(PengajuanPenilaianRisiko::STATUS_SUBMITTED_TO_KEPALA, $submission->status);
        $this->assertEquals(PengajuanPenilaianRisiko::TIER_KEPALA_OPD, $submission->current_tier);

        // Assert all 14 form codes are registered with submitted status
        $this->assertEquals(14, $submission->items()->count());
        $expectedCodes = ['2b', '2c', '3a', '3b', '3c', 'rca', '4', '5', '6', '7', '8', '9', '10', 'fra'];
        $itemCodes = $submission->items()->pluck('form_code')->all();
        sort($expectedCodes, SORT_STRING);
        sort($itemCodes, SORT_STRING);
        $this->assertEquals($expectedCodes, $itemCodes);

        foreach ($submission->items as $item) {
            $this->assertEquals(PengajuanPenilaianRisikoItem::STATUS_SUBMITTED, $item->status);
            $this->assertEquals(PengajuanPenilaianRisikoItem::STATUS_SUBMITTED, $item->status_kepala_opd);
        }
    }
}
