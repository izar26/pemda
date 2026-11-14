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
use App\Models\Risiko\AnalisisRisiko;
use App\Models\Risiko\IdentifikasiRisikoOpd;
use App\Models\Risiko\IdentifikasiRisikoOpdItem;
use App\Models\Risiko\IdentifikasiRisikoOpdOperasional;
use App\Models\Risiko\IdentifikasiRisikoOpdOperasionalItem;
use App\Models\Risiko\IdentifikasiRisikoPemda;
use App\Models\Risiko\IdentifikasiRisikoPemdaItem;
use App\Models\Risiko\KonteksOperasional;
use App\Models\Risiko\KonteksPenilaian;
use App\Models\Risiko\PengajuanPenilaianRisiko;
use App\Models\Risiko\RootCauseAnalysis;
use App\Models\Risiko\TindakPengendalianRisiko;
use App\Models\User;
use Database\Seeders\RbacSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class RisikoComprehensiveApiScenarioTest extends TestCase
{
    use RefreshDatabase;

    protected User $operatorUser;

    protected User $otherOperatorUser;

    protected User $kepalaOpdUser;

    protected User $otherKepalaOpdUser;

    protected User $auditorUser;

    protected User $pengawasUser;

    protected Opd $opd;

    protected Opd $otherOpd;

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

        $this->otherOpd = Opd::create([
            'nama' => 'Dinas Kesehatan',
            'kode' => 'Dinkes',
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

        $this->otherOperatorUser = User::factory()->create([
            'name' => 'Operator Dinkes',
            'email' => 'operator.dinkes@pemda.go.id',
            'opd_id' => $this->otherOpd->id,
            'status' => 'active',
        ]);
        $this->otherOperatorUser->assignRole('OPD');

        $this->kepalaOpdUser = User::factory()->create([
            'name' => 'Kadis Pendidikan',
            'email' => 'kadis.disdik@pemda.go.id',
            'opd_id' => $this->opd->id,
            'status' => 'active',
        ]);
        $this->kepalaOpdUser->assignRole('Executive');

        $this->otherKepalaOpdUser = User::factory()->create([
            'name' => 'Kadis Kesehatan',
            'email' => 'kadis.dinkes@pemda.go.id',
            'opd_id' => $this->otherOpd->id,
            'status' => 'active',
        ]);
        $this->otherKepalaOpdUser->assignRole('Executive');

        $this->auditorUser = User::factory()->create([
            'name' => 'Auditor APIP',
            'email' => 'auditor@pemda.go.id',
            'status' => 'active',
        ]);
        $this->auditorUser->assignRole('Auditor');

        $this->pengawasUser = User::factory()->create([
            'name' => 'Pengawas APIP Utama',
            'email' => 'pengawas@pemda.go.id',
            'status' => 'active',
        ]);
        $this->pengawasUser->assignRole('Inspektorat');

        $this->sumberData = MasterSumberData::create([
            'nama' => 'Renstra Disdik 2026-2031',
            'urutan' => 1,
            'is_active' => true,
        ]);

        $this->urusan = MasterUrusanPemerintahan::create([
            'kode' => '1.01',
            'nama' => 'Pendidikan',
            'is_active' => true,
        ]);

        MasterPemilikRisiko::create([
            'nama' => 'Kepala Dinas',
            'is_active' => true,
        ]);

        $this->tujuan = TujuanPenilaian::create([
            'opd_id' => $this->opd->id,
            'periode_penilaian_id' => $this->activePeriode->id,
            'sumber_data_id' => $this->sumberData->id,
            'kode_tujuan' => 'T.1',
            'tujuan' => 'Meningkatkan Mutu Pendidikan Daerah',
            'urutan' => 1,
        ]);

        $this->sasaran = SasaranPenilaian::create([
            'opd_id' => $this->opd->id,
            'periode_penilaian_id' => $this->activePeriode->id,
            'tujuan_penilaian_id' => $this->tujuan->id,
            'kode_sasaran' => 'S.1',
            'sasaran' => 'Meningkatnya Aksesibilitas Pendidikan Dasar',
            'urutan' => 1,
        ]);

        $this->indikator = IndikatorPenilaian::create([
            'opd_id' => $this->opd->id,
            'periode_penilaian_id' => $this->activePeriode->id,
            'tujuan_penilaian_id' => $this->tujuan->id,
            'sasaran_penilaian_id' => $this->sasaran->id,
            'kode_indikator' => 'I.1',
            'indikator' => 'Angka Partisipasi Murni (APM) SD',
            'urutan' => 1,
        ]);
    }

    protected function assignAuditor(): void
    {
        AuditorOpdAssignment::create([
            'opd_id' => $this->opd->id,
            'auditor_id' => $this->auditorUser->id,
            'tahun' => 2026,
            'is_active' => true,
        ]);
    }

    public function test_skenario_1_blocked_submission_when_no_auditor_assigned(): void
    {
        Sanctum::actingAs($this->operatorUser);

        $response = $this->postJson('/api/risiko/pengajuan/submit', [
            'opd_id' => $this->opd->id,
            'periode_penilaian_id' => $this->activePeriode->id,
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['auditor']);
    }

    public function test_skenario_2_blocked_submission_when_forms_incomplete(): void
    {
        $this->assignAuditor();
        Sanctum::actingAs($this->operatorUser);

        $response = $this->postJson('/api/risiko/pengajuan/submit', [
            'opd_id' => $this->opd->id,
            'periode_penilaian_id' => $this->activePeriode->id,
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['forms']);
    }

    public function test_skenario_3_cross_opd_idor_prevented_across_all_forms(): void
    {
        $this->assignAuditor();

        // Target: Dokumen milik Disdik ($this->opd)
        $dokumen3b = IdentifikasiRisikoOpd::create([
            'opd_id' => $this->opd->id,
            'periode_penilaian_id' => $this->activePeriode->id,
            'master_urusan_pemerintahan_id' => $this->urusan->id,
        ]);
        $item3b = IdentifikasiRisikoOpdItem::create([
            'identifikasi_risiko_opd_id' => $dokumen3b->id,
            'sasaran_penilaian_id' => $this->sasaran->id,
            'indikator_penilaian_id' => $this->indikator->id,
            'kategori_risiko' => 'Risiko Strategis',
            'pernyataan_risiko' => 'Risiko Disdik',
            'kode_risiko' => 'RSO.DISDIK.01',
        ]);

        // Attacker: Operator Dinkes mencoba manipulasi data Disdik
        Sanctum::actingAs($this->otherOperatorUser);

        // Attack 1: Mutasi Item 3B
        $this->putJson("/api/risiko/identifikasi-opd/{$dokumen3b->id}/items/{$item3b->id}", [
            'pernyataan_risiko' => 'Hacked by Dinkes',
        ])->assertForbidden();

        // Attack 2: Reorder 3B
        $this->postJson("/api/risiko/identifikasi-opd/{$dokumen3b->id}/items/reorder", [
            'item_ids' => [$item3b->id],
        ])->assertForbidden();

        // Attack 3: Form 4 Analisis Risiko
        $this->putJson("/api/risiko/analisis-risiko/3b/{$item3b->id}", [
            'kriteria_kemungkinan' => 'Jumlah Frekuensi (dlm 1 tahun)',
            'inheren_kemungkinan' => 4,
        ])->assertForbidden();

        // Attack 4: Form 6 Tindak Pengendalian
        $this->putJson("/api/risiko/tindak-pengendalian/3b/{$item3b->id}", [
            'celah_pengendalian' => 'Attacking RTP',
        ])->assertForbidden();
    }

    public function test_skenario_4_to_12_full_comprehensive_lifecycle_with_rejection_invalidation_and_lock(): void
    {
        $this->assignAuditor();

        // =========================================================================
        // SKENARIO 4: Happy Path Pengisian Bertahap Form 2B s.d. Form 6
        // =========================================================================
        Sanctum::actingAs($this->operatorUser);

        // 1. Form 2B: Konteks Strategis
        $konteks2b = KonteksPenilaian::create([
            'opd_id' => $this->opd->id,
            'periode_penilaian_id' => $this->activePeriode->id,
            'sumber_data_id' => $this->sumberData->id,
            'tujuan_penilaian_id' => $this->tujuan->id,
        ]);
        $konteks2b->sasarans()->attach([$this->sasaran->id]);
        $konteks2b->indikators()->attach([$this->indikator->id]);

        // 2. Form 2C: Konteks Operasional
        $konteks2c = KonteksOperasional::create([
            'opd_id' => $this->opd->id,
            'periode_penilaian_id' => $this->activePeriode->id,
            'konteks_penilaian_id' => $konteks2b->id,
            'sumber_data_id' => $this->sumberData->id,
        ]);
        $konteks2c->items()->create([
            'jenis' => 'program',
            'kode' => '1.01.01',
            'nama' => 'Program Pengelolaan Pendidikan Dasar',
            'urutan' => 1,
        ]);

        // 3. Form 3A: Identifikasi Pemda
        $dokumen3a = IdentifikasiRisikoPemda::create([
            'opd_id' => $this->opd->id,
            'periode_penilaian_id' => $this->activePeriode->id,
            'master_urusan_pemerintahan_id' => $this->urusan->id,
        ]);
        $item3a = IdentifikasiRisikoPemdaItem::create([
            'identifikasi_risiko_pemda_id' => $dokumen3a->id,
            'sasaran_penilaian_id' => $this->sasaran->id,
            'indikator_penilaian_id' => $this->indikator->id,
            'kategori_risiko' => 'Risiko Strategis Pemda',
            'pernyataan_risiko' => 'Keterlambatan Penyerapan Anggaran BOS Pemda',
            'kode_risiko' => 'RSP.01',
        ]);

        // 4. Form 3B: Identifikasi OPD Strategis
        $dokumen3b = IdentifikasiRisikoOpd::create([
            'opd_id' => $this->opd->id,
            'periode_penilaian_id' => $this->activePeriode->id,
            'master_urusan_pemerintahan_id' => $this->urusan->id,
        ]);
        $item3b = IdentifikasiRisikoOpdItem::create([
            'identifikasi_risiko_opd_id' => $dokumen3b->id,
            'sasaran_penilaian_id' => $this->sasaran->id,
            'indikator_penilaian_id' => $this->indikator->id,
            'kategori_risiko' => 'Risiko Strategis',
            'pernyataan_risiko' => 'Kerusakan Sarana Prasarana Sekolah',
            'kode_risiko' => 'RSO.01',
        ]);

        // 5. Form 3C: Identifikasi OPD Operasional
        $dokumen3c = IdentifikasiRisikoOpdOperasional::create([
            'opd_id' => $this->opd->id,
            'periode_penilaian_id' => $this->activePeriode->id,
            'master_urusan_pemerintahan_id' => $this->urusan->id,
        ]);
        $item3c = IdentifikasiRisikoOpdOperasionalItem::create([
            'identifikasi_risiko_opd_operasional_id' => $dokumen3c->id,
            'pernyataan_risiko' => 'Keterlambatan Distribusi Buku Kurikulum',
            'kode_risiko' => 'ROO.01',
        ]);

        // 6. Form RCA: 5-Whys untuk 3A, 3B, 3C
        RootCauseAnalysis::create([
            'source_type' => '3a',
            'identifikasi_risiko_pemda_item_id' => $item3a->id,
            'akar_penyebab' => 'Sistem pencairan birokrasi berbelit',
            'jenis_penyebab' => 'Sistem / Prosedur',
        ]);
        RootCauseAnalysis::create([
            'source_type' => '3b',
            'identifikasi_risiko_opd_item_id' => $item3b->id,
            'akar_penyebab' => 'Kurangnya alokasi pemeliharaan berkala',
            'jenis_penyebab' => 'Finansial / Anggaran',
        ]);
        RootCauseAnalysis::create([
            'source_type' => '3c',
            'identifikasi_risiko_opd_operasional_item_id' => $item3c->id,
            'akar_penyebab' => 'Vendor logistik telat pengiriman armada',
            'jenis_penyebab' => 'Pihak Ketiga',
        ]);

        // 7. Form 4: Analisis & Evaluasi Matriks
        $analisis3b = AnalisisRisiko::create([
            'risiko_opd_item_id' => $item3b->id,
            'kriteria_kemungkinan' => 'Jumlah Frekuensi (dlm 1 tahun)',
            'inheren_kemungkinan' => 4,
            'kriteria_dampak' => 'Penurunan kinerja',
            'inheren_dampak' => 4,
            'pengendalian_ada' => false,
            'residual_kriteria_kemungkinan' => 'Jumlah Frekuensi (dlm 1 tahun)',
            'residual_kemungkinan' => 4,
            'residual_kriteria_dampak' => 'Penurunan kinerja',
            'residual_dampak' => 4,
        ]);
        $analisis3c = AnalisisRisiko::create([
            'risiko_operasional_item_id' => $item3c->id,
            'kriteria_kemungkinan' => 'Jumlah Frekuensi (dlm 1 tahun)',
            'inheren_kemungkinan' => 3,
            'kriteria_dampak' => 'Gangguan terhadap layanan organisasi',
            'inheren_dampak' => 4,
            'pengendalian_ada' => false,
            'residual_kriteria_kemungkinan' => 'Jumlah Frekuensi (dlm 1 tahun)',
            'residual_kemungkinan' => 3,
            'residual_kriteria_dampak' => 'Gangguan terhadap layanan organisasi',
            'residual_dampak' => 4,
        ]);

        // 8. Form 6: Rencana Tindak Pengendalian (RTP)
        TindakPengendalianRisiko::create([
            'analisis_risiko_id' => $analisis3b->id,
            'celah_pengendalian' => 'Belum ada jadwal inspeksi fisik rutin',
            'penanggung_jawab' => 'Bidang Sarpras Disdik',
            'target_waktu' => 'Triwulan II 2026',
            'treated_kemungkinan' => 2,
            'treated_dampak' => 2,
        ]);
        $analisis3b->update(['rencana_tindak' => 'Pengadaan inspeksi sarpras berkala per semester']);

        TindakPengendalianRisiko::create([
            'analisis_risiko_id' => $analisis3c->id,
            'celah_pengendalian' => 'SLA vendor logistik tidak memiliki denda keterlambatan',
            'penanggung_jawab' => 'PPK Pengadaan Buku',
            'target_waktu' => 'Triwulan I 2026',
            'treated_kemungkinan' => 2,
            'treated_dampak' => 2,
        ]);
        $analisis3c->update(['rencana_tindak' => 'Revisi klausul kontrak penalti vendor logistik']);

        // Form 8: Pengkomunikasian Pengendalian yang Dibangun (3B & 3C)
        $this->putJson("/api/risiko/komunikasi-pengendalian/3b/{$item3b->id}", [
            'media_komunikasi' => 'Rapat Koordinasi Sarpras',
            'penyedia_informasi' => 'Bidang Sarpras Disdik',
            'penerima_informasi' => 'Kepala Dinas & Tim Teknis',
            'rencana_waktu' => 'Triwulan II 2026',
        ])->assertOk();

        $this->putJson("/api/risiko/komunikasi-pengendalian/3c/{$item3c->id}", [
            'media_komunikasi' => 'Rapat Koordinasi Pengadaan',
            'penyedia_informasi' => 'PPK Pengadaan Buku',
            'penerima_informasi' => 'Kepala Dinas & Tim Teknis',
            'rencana_waktu' => 'Triwulan I 2026',
        ])->assertOk();

        // Form 9: Rancangan Pemantauan Pengendalian Intern (3B & 3C)
        $this->putJson("/api/risiko/pemantauan-pengendalian/3b/{$item3b->id}", [
            'bentuk_pemantauan' => 'Observasi Fisik Sekolah',
            'penanggung_jawab_pemantauan' => 'Irban Wilayah I',
            'rencana_waktu_pemantauan' => 'Triwulan II 2026',
        ])->assertOk();

        $this->putJson("/api/risiko/pemantauan-pengendalian/3c/{$item3c->id}", [
            'bentuk_pemantauan' => 'Reviu Dokumen Kontrak & Berita Acara',
            'penanggung_jawab_pemantauan' => 'Irban Khusus',
            'rencana_waktu_pemantauan' => 'Triwulan I 2026',
        ])->assertOk();

        // Verifikasi Status Kesiapan API
        $statusRes = $this->getJson("/api/risiko/pengajuan/status?opd_id={$this->opd->id}&periode_penilaian_id={$this->activePeriode->id}");
        $statusRes->assertOk();
        $this->assertTrue($statusRes->json('data.is_ready_to_submit'));
        $this->assertTrue($statusRes->json('data.all_forms_complete'));
        $this->assertEmpty($statusRes->json('data.missing_forms'));

        // =========================================================================
        // SKENARIO 5: Operator Submit Lembar Kerja ke Tier 2 (Kepala OPD)
        // =========================================================================
        $submitRes = $this->postJson('/api/risiko/pengajuan/submit', [
            'opd_id' => $this->opd->id,
            'periode_penilaian_id' => $this->activePeriode->id,
            'catatan' => 'Mohon persetujuan lembar kerja risiko tahun 2026.',
        ]);
        $submitRes->assertOk();
        $submissionId = $submitRes->json('data.id');

        $this->assertDatabaseHas('pengajuan_penilaian_risikos', [
            'id' => $submissionId,
            'status' => PengajuanPenilaianRisiko::STATUS_SUBMITTED_TO_KEPALA,
            'current_tier' => PengajuanPenilaianRisiko::TIER_KEPALA_OPD,
        ]);

        // =========================================================================
        // SKENARIO 6: Status Lock Mencegah Perubahan oleh Operator
        // =========================================================================
        $this->putJson("/api/risiko/identifikasi-opd/{$dokumen3b->id}/items/{$item3b->id}", [
            'sasaran_penilaian_id' => $this->sasaran->id,
            'indikator_penilaian_id' => $this->indikator->id,
            'kategori_risiko' => 'Risiko Strategis',
            'pemilik_risiko' => 'Kepala Dinas',
            'sifat_risiko' => 'C',
            'pernyataan_risiko' => 'Mutasi ilegal saat terkunci',
        ])->assertForbidden();

        // =========================================================================
        // SKENARIO 7: Kepala OPD Review & Approval (Forward ke Auditor)
        // =========================================================================
        Sanctum::actingAs($this->kepalaOpdUser);

        $kadisRes = $this->postJson("/api/risiko/pengajuan/{$submissionId}/review-kepala", [
            'status' => 'approved',
            'catatan' => 'Disetujui untuk diperiksa Auditor Inspektorat.',
        ]);
        $kadisRes->assertOk();

        $this->assertDatabaseHas('pengajuan_penilaian_risikos', [
            'id' => $submissionId,
            'status' => PengajuanPenilaianRisiko::STATUS_SUBMITTED_TO_AUDITOR,
            'current_tier' => PengajuanPenilaianRisiko::TIER_AUDITOR,
        ]);

        // =========================================================================
        // SKENARIO 8: Auditor Review Seluruh Form via API & Menolak Form 4
        // =========================================================================
        Sanctum::actingAs($this->auditorUser);

        // Start review
        $this->postJson("/api/pengawasan/review-risiko/{$submissionId}/start")->assertOk();

        // Verifikasi semua form dapat diambil via Registry Handler API
        foreach (['2b', '2c', '3a', '3b', '3c', 'rca', '4', '5', '6', '7', '8', '9'] as $code) {
            $this->getJson("/api/pengawasan/review-risiko/{$submissionId}/forms/{$code}")
                ->assertOk()
                ->assertJsonStructure(['data']);
        }

        // Auditor menyetujui form 2B, 2C, 3A, 3B, 3C, 5, 6, 7, 8, 9
        foreach (['2b', '2c', '3a', '3b', '3c', 'rca', '5', '6', '7', '8', '9'] as $code) {
            $this->postJson("/api/pengawasan/review-risiko/{$submissionId}/item", [
                'form_code' => $code,
                'status' => 'approved',
            ])->assertOk();
        }

        // Auditor MENOLAK Form 4
        $rejectRes = $this->postJson("/api/pengawasan/review-risiko/{$submissionId}/item", [
            'form_code' => '4',
            'status' => 'rejected',
            'catatan_revisi' => 'Perbaiki nilai residual kriteria dampak dan kemungkinan pada RSO.01.',
        ]);
        $rejectRes->assertOk();

        $this->assertDatabaseHas('pengajuan_penilaian_risikos', [
            'id' => $submissionId,
            'status' => PengajuanPenilaianRisiko::STATUS_REVISION_BY_AUDITOR,
            'current_tier' => PengajuanPenilaianRisiko::TIER_KEPALA_OPD,
        ]);

        // =========================================================================
        // SKENARIO 9: Cascading Invalidation pada Form Turunan (Form 5 & 6)
        // =========================================================================
        // Saat Form 4 diubah, Form 5 & 6 yang sebelumnya approved harus gugur ke draft
        $analisis3b->update(['residual_kemungkinan' => 3]);

        $this->assertDatabaseHas('pengajuan_penilaian_risiko_items', [
            'pengajuan_id' => $submissionId,
            'form_code' => '5',
            'status' => 'draft',
            'status_auditor' => 'draft',
        ]);
        $this->assertDatabaseHas('pengajuan_penilaian_risiko_items', [
            'pengajuan_id' => $submissionId,
            'form_code' => '6',
            'status' => 'draft',
            'status_auditor' => 'draft',
        ]);

        // =========================================================================
        // SKENARIO 10: Delegasi ke Operator, Koreksi, dan Resubmit
        // =========================================================================
        Sanctum::actingAs($this->kepalaOpdUser);
        $this->postJson("/api/risiko/pengajuan/{$submissionId}/delegate-operator")->assertOk();

        $this->assertDatabaseHas('pengajuan_penilaian_risikos', [
            'id' => $submissionId,
            'status' => PengajuanPenilaianRisiko::STATUS_REVISION_TO_OPERATOR,
            'current_tier' => PengajuanPenilaianRisiko::TIER_OPERATOR,
        ]);

        // Operator resubmit setelah revisi
        Sanctum::actingAs($this->operatorUser);
        $this->postJson('/api/risiko/pengajuan/submit', [
            'opd_id' => $this->opd->id,
            'periode_penilaian_id' => $this->activePeriode->id,
            'catatan' => 'Form 4 telah direvisi sesuai catatan auditor.',
        ])->assertOk();

        // Kadis approve resubmission ke Auditor
        Sanctum::actingAs($this->kepalaOpdUser);
        $this->postJson("/api/risiko/pengajuan/{$submissionId}/review-kepala", [
            'status' => 'approved',
        ])->assertOk();

        // =========================================================================
        // SKENARIO 11: Full Approval oleh Auditor & Pengawas Dalnis APIP
        // =========================================================================
        Sanctum::actingAs($this->auditorUser);

        // Auditor menyetujui seluruh form pada pengajuan ulang
        foreach (['2b', '2c', '3a', '3b', '3c', 'rca', '4', '5', '6', '7', '8', '9'] as $code) {
            $this->postJson("/api/pengawasan/review-risiko/{$submissionId}/item", [
                'form_code' => $code,
                'status' => 'approved',
            ])->assertOk();
        }

        // Parent submission sekarang berpindah ke Pengawas (Tier 4)
        $this->assertDatabaseHas('pengajuan_penilaian_risikos', [
            'id' => $submissionId,
            'status' => PengajuanPenilaianRisiko::STATUS_SUBMITTED_TO_PENGAWAS,
            'current_tier' => PengajuanPenilaianRisiko::TIER_PENGAWAS,
        ]);

        // Pengawas Dalnis menyetujui seluruh form (Tier 4 Final Approval)
        Sanctum::actingAs($this->pengawasUser);
        foreach (['2b', '2c', '3a', '3b', '3c', 'rca', '4', '5', '6', '7', '8', '9'] as $code) {
            $this->postJson("/api/pengawasan/review-risiko/{$submissionId}/review-pengawas", [
                'form_code' => $code,
                'status' => 'approved',
            ])->assertOk();
        }

        // Verifikasi Status Akhir Disetujui Penuh
        $this->assertDatabaseHas('pengajuan_penilaian_risikos', [
            'id' => $submissionId,
            'status' => PengajuanPenilaianRisiko::STATUS_APPROVED,
            'current_tier' => 'completed',
        ]);

        // =========================================================================
        // SKENARIO 12: Post-Approval Immutability (Data Terkunci Permanen)
        // =========================================================================
        Sanctum::actingAs($this->operatorUser);
        $this->putJson("/api/risiko/identifikasi-opd/{$dokumen3b->id}/items/{$item3b->id}", [
            'sasaran_penilaian_id' => $this->sasaran->id,
            'indikator_penilaian_id' => $this->indikator->id,
            'kategori_risiko' => 'Risiko Strategis',
            'pemilik_risiko' => 'Kepala Dinas',
            'sifat_risiko' => 'C',
            'pernyataan_risiko' => 'Percobaan ubah data setelah disetujui penuh',
        ])->assertForbidden();

        Sanctum::actingAs($this->kepalaOpdUser);
        $this->putJson("/api/risiko/analisis-risiko/3b/{$item3b->id}", [
            'kriteria_kemungkinan' => 'Jumlah Frekuensi (dlm 1 tahun)',
            'inheren_kemungkinan' => 5,
        ])->assertForbidden();
    }
}
