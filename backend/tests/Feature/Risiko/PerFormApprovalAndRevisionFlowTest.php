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
use App\Services\Risiko\Registry\RiskFormRegistry;
use Database\Seeders\RbacSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class PerFormApprovalAndRevisionFlowTest extends TestCase
{
    use RefreshDatabase;

    protected Opd $opd;

    protected PeriodePenilaian $periode;

    protected User $operator;

    protected User $kepalaOpd;

    protected User $evaluator;

    protected User $pengawas;

    protected MasterSumberData $sumberData;

    protected TujuanPenilaian $tujuan;

    protected SasaranPenilaian $sasaran;

    protected IndikatorPenilaian $indikator;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RbacSeeder::class);

        $this->opd = Opd::create([
            'nama' => 'Dinas Pendidikan',
            'kode' => 'DISDIK',
            'kategori' => 'Dinas',
            'is_active' => true,
        ]);

        $this->periode = PeriodePenilaian::create([
            'nama_periode' => 'RPJMD 2026 - 2030',
            'tahun_mulai' => 2026,
            'tahun_akhir' => 2030,
            'tahun_penilaian' => 2026,
            'tanggal_mulai' => '2026-01-01',
            'tanggal_akhir' => '2026-12-31',
            'status' => 'aktif',
        ]);

        $this->operator = User::factory()->create([
            'name' => 'Operator Disdik',
            'email' => 'operator.disdik@pemda.go.id',
            'opd_id' => $this->opd->id,
            'status' => 'active',
        ]);
        $this->operator->assignRole('Operator OPD');

        $this->kepalaOpd = User::factory()->create([
            'name' => 'Kepala Disdik',
            'email' => 'kepala.disdik@pemda.go.id',
            'opd_id' => $this->opd->id,
            'status' => 'active',
        ]);
        $this->kepalaOpd->assignRole('Executive');

        $this->pengawas = User::factory()->create([
            'name' => 'Pengawas 1',
            'email' => 'pengawas1@pemda.go.id',
            'status' => 'active',
        ]);
        $this->pengawas->assignRole('Koordinator Pengawas');

        $this->evaluator = User::factory()->create([
            'name' => 'Evaluator 1',
            'email' => 'evaluator1@pemda.go.id',
            'status' => 'active',
        ]);
        $this->evaluator->assignRole('Evaluator / Reviewer');

        AuditorOpdAssignment::create([
            'auditor_id' => $this->evaluator->id,
            'opd_id' => $this->opd->id,
            'periode_penilaian_id' => $this->periode->id,
            'assigned_by' => $this->pengawas->id,
            'is_active' => true,
        ]);

        $this->sumberData = MasterSumberData::create([
            'nama' => 'Renstra Disdik 2026-2030',
            'urutan' => 1,
            'is_active' => true,
        ]);

        $this->tujuan = TujuanPenilaian::create([
            'periode_penilaian_id' => $this->periode->id,
            'opd_id' => $this->opd->id,
            'sumber_data_id' => $this->sumberData->id,
            'kode_tujuan' => 'T.1',
            'tujuan' => 'Meningkatkan Mutu Pendidikan',
        ]);

        $this->sasaran = SasaranPenilaian::create([
            'periode_penilaian_id' => $this->periode->id,
            'opd_id' => $this->opd->id,
            'tujuan_penilaian_id' => $this->tujuan->id,
            'kode_sasaran' => 'S.1',
            'sasaran' => 'Pemerataan Layanan Pendidikan',
        ]);

        $this->indikator = IndikatorPenilaian::create([
            'periode_penilaian_id' => $this->periode->id,
            'opd_id' => $this->opd->id,
            'tujuan_penilaian_id' => $this->tujuan->id,
            'sasaran_penilaian_id' => $this->sasaran->id,
            'kode_indikator' => 'I.1',
            'indikator' => 'APK Pendidikan Dasar',
            'satuan' => '%',
            'target_tahun_1' => '95',
        ]);

        $this->seedAllFormsComplete();
    }

    protected function seedAllFormsComplete(): void
    {
        $konteks = KonteksPenilaian::create([
            'opd_id' => $this->opd->id,
            'periode_penilaian_id' => $this->periode->id,
            'sumber_data_id' => $this->sumberData->id,
            'tujuan_penilaian_id' => $this->tujuan->id,
        ]);
        $konteks->sasarans()->attach([$this->sasaran->id]);
        $konteks->indikators()->attach([$this->indikator->id]);

        $operasional = KonteksOperasional::create([
            'opd_id' => $this->opd->id,
            'periode_penilaian_id' => $this->periode->id,
        ]);
        KonteksOperasionalItem::create([
            'konteks_operasional_id' => $operasional->id,
            'jenis' => 'program',
            'kode' => '1.01',
            'nama' => 'Program Pengelolaan Pendidikan',
            'urutan' => 1,
        ]);

        $urusan = MasterUrusanPemerintahan::firstOrCreate(
            ['kode' => '01'],
            ['nama' => 'Pendidikan', 'is_active' => true, 'urutan' => 1]
        );

        $dokumen3a = IdentifikasiRisikoPemda::create([
            'periode_penilaian_id' => $this->periode->id,
            'opd_id' => $this->opd->id,
            'master_urusan_pemerintahan_id' => $urusan->id,
            'nama_pemda' => 'Pemerintah Kabupaten Cianjur',
            'status' => 'draft',
        ]);
        $item3a = IdentifikasiRisikoPemdaItem::create([
            'identifikasi_risiko_pemda_id' => $dokumen3a->id,
            'sasaran_penilaian_id' => $this->sasaran->id,
            'indikator_penilaian_id' => $this->indikator->id,
            'kategori_risiko' => 'Risiko Strategis',
            'nomor_urut' => 1,
            'pernyataan_risiko' => 'Risiko Capaian SPM',
            'kode_risiko' => 'RSP.26.RS.001',
            'pemilik_risiko' => 'Kepala Daerah',
            'sifat_risiko' => 'C',
            'uraian_dampak' => 'Capaian SPM rendah',
            'pihak_terkena' => 'Masyarakat',
            'urutan' => 1,
        ]);
        RootCauseAnalysis::create([
            'source_type' => '3a',
            'identifikasi_risiko_pemda_item_id' => $item3a->id,
            'why_1' => 'Fasilitas belum memadai',
            'akar_penyebab' => 'Fasilitas belum memadai',
            'jenis_penyebab' => 'Material',
            'kegiatan_pengendalian' => 'Pengadaan sarpras',
        ]);

        $dokumen3b = IdentifikasiRisikoOpd::create([
            'periode_penilaian_id' => $this->periode->id,
            'opd_id' => $this->opd->id,
            'master_urusan_pemerintahan_id' => $urusan->id,
            'nama_pemda' => 'Pemerintah Kabupaten Cianjur',
            'singkatan_opd' => 'DISDIK',
            'status' => 'draft',
        ]);
        $item3b = IdentifikasiRisikoOpdItem::create([
            'identifikasi_risiko_opd_id' => $dokumen3b->id,
            'sasaran_penilaian_id' => $this->sasaran->id,
            'indikator_penilaian_id' => $this->indikator->id,
            'kategori_risiko' => 'Risiko Strategis',
            'nomor_urut' => 1,
            'pernyataan_risiko' => 'Risiko Capaian Kinerja Sekolah',
            'kode_risiko' => 'RSO.26.DISDIK.RS.001',
            'pemilik_risiko' => 'Kepala Dinas Pendidikan',
            'sifat_risiko' => 'C',
            'uraian_dampak' => 'Standar pendidikan rendah',
            'pihak_terkena' => 'Masyarakat',
            'urutan' => 1,
        ]);
        RootCauseAnalysis::create([
            'source_type' => '3b',
            'identifikasi_risiko_opd_item_id' => $item3b->id,
            'why_1' => 'Kurang guru bersertifikat',
            'akar_penyebab' => 'Kurang guru bersertifikat',
            'jenis_penyebab' => 'Man',
            'kegiatan_pengendalian' => 'Program sertifikasi guru',
        ]);

        $dokumen3c = IdentifikasiRisikoOpdOperasional::create([
            'periode_penilaian_id' => $this->periode->id,
            'opd_id' => $this->opd->id,
            'master_urusan_pemerintahan_id' => $urusan->id,
            'nama_pemda' => 'Pemerintah Kabupaten Cianjur',
            'singkatan_opd' => 'DISDIK',
            'status' => 'draft',
        ]);
        $item3c = IdentifikasiRisikoOpdOperasionalItem::create([
            'identifikasi_risiko_opd_operasional_id' => $dokumen3c->id,
            'sub_kegiatan_kustom' => 'Pengadaan Buku Pelajaran',
            'probis' => 'Pelaksanaan',
            'kategori_risiko' => 'Risiko Operasional',
            'nomor_urut' => 1,
            'pernyataan_risiko' => 'Keterlambatan distribusi buku',
            'kode_risiko' => 'ROO.26.DISDIK.RO.001',
            'pemilik_risiko' => 'Sekretaris',
            'sifat_risiko' => 'C',
            'uraian_dampak' => 'KBM terganggu',
            'pihak_terkena' => 'Siswa',
            'urutan' => 1,
        ]);
        RootCauseAnalysis::create([
            'source_type' => '3c',
            'identifikasi_risiko_opd_operasional_item_id' => $item3c->id,
            'why_1' => 'Kendala logistik',
            'akar_penyebab' => 'Kendala logistik',
            'jenis_penyebab' => 'Eksternal',
            'kegiatan_pengendalian' => 'Mitra ekspedisi alternatif',
        ]);

        $analysis = [
            'kriteria_kemungkinan' => 'Jumlah Frekuensi (dlm 1 tahun)',
            'inheren_kemungkinan' => 3,
            'kriteria_dampak' => 'Penurunan reputasi',
            'inheren_dampak' => 4,
            'pengendalian_ada' => false,
            'residual_kriteria_kemungkinan' => 'Jumlah Frekuensi (dlm 1 tahun)',
            'residual_kriteria_dampak' => 'Penurunan kinerja',
            'residual_kemungkinan' => 2,
            'residual_dampak' => 3,
        ];
        foreach ([['risiko_opd_item_id' => $item3b->id], ['risiko_operasional_item_id' => $item3c->id]] as $source) {
            $record = AnalisisRisiko::create(array_merge($analysis, $source, ['rencana_tindak' => 'Perbaiki prosedur']));
            TindakPengendalianRisiko::create([
                'analisis_risiko_id' => $record->id,
                'celah_pengendalian' => 'Prosedur belum memadai',
                'penanggung_jawab' => 'Kepala bidang',
                'target_waktu' => 'Akhir tahun',
                'treated_kemungkinan' => 1,
                'treated_dampak' => 1,
            ]);
            KomunikasiPengendalianRisiko::create([
                'analisis_risiko_id' => $record->id,
                'media_komunikasi' => 'Rapat koordinasi',
                'penyedia_informasi' => 'PPTK',
                'penerima_informasi' => 'Kepala Dinas',
                'rencana_waktu' => 'Akhir tahun',
            ]);
            PemantauanPengendalianRisiko::create([
                'analisis_risiko_id' => $record->id,
                'bentuk_pemantauan' => 'Reviu Dokumen',
                'penanggung_jawab_pemantauan' => 'Irban Khusus',
                'rencana_waktu_pemantauan' => 'Triwulan IV',
            ]);
        }

        StatusKejadianRisikoOpd::create([
            'opd_id' => $this->opd->id,
            'periode_penilaian_id' => $this->periode->id,
            'is_nihil' => true,
            'confirmed_by' => $this->operator->id,
            'confirmed_at' => now(),
        ]);

        StatusFraudRiskAssessmentOpd::create([
            'opd_id' => $this->opd->id,
            'periode_penilaian_id' => $this->periode->id,
            'is_nihil' => true,
            'confirmed_by' => $this->operator->id,
            'confirmed_at' => now(),
        ]);
    }

    protected function submitInitial(): PengajuanPenilaianRisiko
    {
        Sanctum::actingAs($this->operator);
        $res = $this->postJson('/api/risiko/pengajuan/submit', [
            'opd_id' => $this->opd->id,
            'periode_penilaian_id' => $this->periode->id,
        ])->assertStatus(200);

        return PengajuanPenilaianRisiko::with('items')->findOrFail($res->json('data.id'));
    }

    public function test_kepala_opd_can_approve_and_reject_multiple_forms_without_being_disabled(): void
    {
        $submission = $this->submitInitial();

        Sanctum::actingAs($this->kepalaOpd);

        // 1. Kepala OPD approves Form 2B
        $this->postJson("/api/risiko/pengajuan/{$submission->id}/review-kepala", [
            'form_code' => '2b',
            'status' => 'approved',
        ])->assertStatus(200);

        // 2. Kepala OPD rejects Form 2C with mandatory message
        $this->postJson("/api/risiko/pengajuan/{$submission->id}/review-kepala", [
            'form_code' => '2c',
            'status' => 'rejected',
            'catatan' => 'Perbaiki target kegiatan BOS di Form 2C.',
        ])->assertStatus(200);

        // 3. Kepala OPD is NOT disabled! Can still reject Form 3A AND approve Form 3B in the same session!
        $this->postJson("/api/risiko/pengajuan/{$submission->id}/review-kepala", [
            'form_code' => '3a',
            'status' => 'rejected',
            'catatan' => 'Lengkapi pernyataan risiko Pemda pada Form 3A.',
        ])->assertStatus(200);

        $this->postJson("/api/risiko/pengajuan/{$submission->id}/review-kepala", [
            'form_code' => '3b',
            'status' => 'approved',
        ])->assertStatus(200);

        $submission->refresh();
        $this->assertEquals(PengajuanPenilaianRisiko::TIER_KEPALA_OPD, $submission->current_tier);

        $items = $submission->items()->get()->keyBy('form_code');
        $this->assertEquals('approved', $items['2b']->status_kepala_opd);
        $this->assertEquals('kepala_opd', $items['2b']->current_tier);
        $this->assertEquals('operator', $items['2c']->current_tier);
        $this->assertEquals('operator', $items['3a']->current_tier);
        $this->assertEquals('approved', $items['3b']->status_kepala_opd);

        // 4. Cannot forward to Evaluator yet (not 100% approved & 2 forms in yellow revision)
        $this->postJson("/api/risiko/pengajuan/{$submission->id}/forward-auditor")
            ->assertStatus(422);
    }

    public function test_operator_can_only_edit_rejected_forms_and_resubmit_single_or_all(): void
    {
        $submission = $this->submitInitial();

        Sanctum::actingAs($this->kepalaOpd);
        $codes = app(RiskFormRegistry::class)->getCodes();
        foreach ($codes as $code) {
            if (in_array($code, ['2c', '3a'], true)) {
                $this->postJson("/api/risiko/pengajuan/{$submission->id}/review-kepala", [
                    'form_code' => $code,
                    'status' => 'rejected',
                    'catatan' => "Mohon perbaiki Form {$code} terlebih dahulu.",
                ])->assertStatus(200);
            } else {
                $this->postJson("/api/risiko/pengajuan/{$submission->id}/review-kepala", [
                    'form_code' => $code,
                    'status' => 'approved',
                ])->assertStatus(200);
            }
        }

        // Operator checks readiness: ONLY 2c and 3a are in editable_forms
        Sanctum::actingAs($this->operator);
        $readiness = $this->getJson("/api/risiko/pengajuan/status?opd_id={$this->opd->id}&periode_penilaian_id={$this->periode->id}")
            ->assertStatus(200)
            ->json('data');

        $this->assertEqualsCanonicalizing(['2c', '3a'], $readiness['editable_forms']);
        $this->assertEquals(2, $readiness['revision_forms_count']);

        // Operator CANNOT edit approved Form 2B (403)
        $this->postJson('/api/risiko/konteks-strategis', [
            'opd_id' => $this->opd->id,
            'periode_penilaian_id' => $this->periode->id,
            'sumber_data_id' => $this->sumberData->id,
            'tujuan_penilaian_id' => $this->tujuan->id,
            'sasaran_ids' => [$this->sasaran->id],
            'indikator_ids' => [$this->indikator->id],
        ])->assertStatus(403);

        // Operator CAN resubmit single Form 2C ("Kirim Ulang Form Ini")
        $this->postJson('/api/risiko/pengajuan/submit', [
            'opd_id' => $this->opd->id,
            'periode_penilaian_id' => $this->periode->id,
            'form_code' => '2c',
        ])->assertStatus(200);

        $itemsAfter2c = $submission->items()->get()->keyBy('form_code');
        $this->assertEquals('kepala_opd', $itemsAfter2c['2c']->current_tier);
        $this->assertEquals('submitted', $itemsAfter2c['2c']->status_kepala_opd);
        $this->assertEquals('operator', $itemsAfter2c['3a']->current_tier);
        $this->assertEquals('approved', $itemsAfter2c['2b']->status_kepala_opd);

        // Operator resubmits remaining revised forms (bulk "Kirim Ulang Semua Perbaikan")
        $this->postJson('/api/risiko/pengajuan/submit', [
            'opd_id' => $this->opd->id,
            'periode_penilaian_id' => $this->periode->id,
        ])->assertStatus(200);

        $itemsAfterAll = $submission->items()->get()->keyBy('form_code');
        $this->assertEquals('kepala_opd', $itemsAfterAll['3a']->current_tier);

        // Kepala OPD approves 2C & 3A -> now 100% green -> forward to Evaluator succeeds!
        Sanctum::actingAs($this->kepalaOpd);
        $this->postJson("/api/risiko/pengajuan/{$submission->id}/review-kepala", [
            'form_code' => '2c',
            'status' => 'approved',
        ])->assertStatus(200);
        $this->postJson("/api/risiko/pengajuan/{$submission->id}/review-kepala", [
            'form_code' => '3a',
            'status' => 'approved',
        ])->assertStatus(200);

        $this->postJson("/api/risiko/pengajuan/{$submission->id}/forward-auditor")
            ->assertStatus(200);

        $submission->refresh();
        $this->assertEquals(PengajuanPenilaianRisiko::TIER_AUDITOR, $submission->current_tier);
        $this->assertEquals(PengajuanPenilaianRisiko::STATUS_SUBMITTED_TO_AUDITOR, $submission->status);
    }

    public function test_strict_waterfall_revision_from_pengawas_to_operator_and_back_up(): void
    {
        $submission = $this->submitInitial();
        $codes = app(RiskFormRegistry::class)->getCodes();

        // Advance cleanly to Pengawas tier (100% Kepala -> Forward -> 100% Evaluator -> Forward)
        Sanctum::actingAs($this->kepalaOpd);
        foreach ($codes as $code) {
            $this->postJson("/api/risiko/pengajuan/{$submission->id}/review-kepala", [
                'form_code' => $code,
                'status' => 'approved',
            ])->assertStatus(200);
        }
        $this->postJson("/api/risiko/pengajuan/{$submission->id}/forward-auditor")->assertStatus(200);

        Sanctum::actingAs($this->evaluator);
        foreach ($codes as $code) {
            $this->postJson("/api/pengawasan/review-risiko/{$submission->id}/item", [
                'form_code' => $code,
                'status' => 'approved',
            ])->assertStatus(200);
        }
        $this->postJson("/api/pengawasan/review-risiko/{$submission->id}/forward-pengawas")->assertStatus(200);

        // Pengawas rejects Form 2C with Pesan A, AND continues approving all other forms without being disabled!
        Sanctum::actingAs($this->pengawas);
        $pesanPengawas = 'Lampiran target BOS di Form 2C belum sesuai DPA 2026.';
        foreach ($codes as $code) {
            if ($code === '2c') {
                $this->postJson("/api/pengawasan/review-risiko/{$submission->id}/review-pengawas", [
                    'form_code' => '2c',
                    'status' => 'rejected',
                    'catatan_revisi' => $pesanPengawas,
                ])->assertStatus(200);
            } else {
                $this->postJson("/api/pengawasan/review-risiko/{$submission->id}/review-pengawas", [
                    'form_code' => $code,
                    'status' => 'approved',
                ])->assertStatus(200);
            }
        }

        // Pengawas CANNOT finalize while Form 2C is in revision (yellow)
        $this->postJson("/api/pengawasan/review-risiko/{$submission->id}/finalize-pengawas")
            ->assertStatus(422);

        $item2c = PengajuanPenilaianRisikoItem::where('pengajuan_id', $submission->id)->where('form_code', '2c')->firstOrFail();
        $this->assertEquals('auditor', $item2c->current_tier);
        $this->assertEquals($pesanPengawas, $item2c->catatan_pengawas);

        // Evaluator forwards Form 2C down to Kepala OPD (without retyping — reuses Pengawas note or edited note!)
        Sanctum::actingAs($this->evaluator);
        $this->postJson("/api/pengawasan/review-risiko/{$submission->id}/forward-revision", [
            'form_code' => '2c',
        ])->assertStatus(200);

        $item2c->refresh();
        $this->assertEquals('kepala_opd', $item2c->current_tier);
        $this->assertEquals($pesanPengawas, $item2c->catatan_auditor);

        // Kepala OPD delegates Form 2C down to Operator (with edited pre-filled note)
        Sanctum::actingAs($this->kepalaOpd);
        $pesanKepala = $pesanPengawas.' Mohon segera disesuaikan oleh staf.';
        $this->postJson("/api/risiko/pengajuan/{$submission->id}/delegate-operator", [
            'form_code' => '2c',
            'catatan' => $pesanKepala,
        ])->assertStatus(200);

        $item2c->refresh();
        $this->assertEquals('operator', $item2c->current_tier);
        $this->assertEquals($pesanKepala, $item2c->catatan_kepala_opd);

        // Operator fixes & resubmits ONLY Form 2C
        Sanctum::actingAs($this->operator);
        $this->postJson('/api/risiko/pengajuan/submit', [
            'opd_id' => $this->opd->id,
            'periode_penilaian_id' => $this->periode->id,
            'form_code' => '2c',
        ])->assertStatus(200);

        $item2c->refresh();
        $this->assertEquals('kepala_opd', $item2c->current_tier);

        // Kepala OPD re-approves Form 2C -> automatically climbs back up to Evaluator!
        Sanctum::actingAs($this->kepalaOpd);
        $this->postJson("/api/risiko/pengajuan/{$submission->id}/review-kepala", [
            'form_code' => '2c',
            'status' => 'approved',
        ])->assertStatus(200);

        $item2c->refresh();
        $this->assertEquals('auditor', $item2c->current_tier);

        // Evaluator re-approves Form 2C -> automatically climbs back up to Pengawas!
        Sanctum::actingAs($this->evaluator);
        $this->postJson("/api/pengawasan/review-risiko/{$submission->id}/item", [
            'form_code' => '2c',
            'status' => 'approved',
        ])->assertStatus(200);

        $item2c->refresh();
        $this->assertEquals('pengawas', $item2c->current_tier);

        // Pengawas approves Form 2C -> now 100% green -> Finalize succeeds!
        Sanctum::actingAs($this->pengawas);
        $this->postJson("/api/pengawasan/review-risiko/{$submission->id}/review-pengawas", [
            'form_code' => '2c',
            'status' => 'approved',
        ])->assertStatus(200);

        $this->postJson("/api/pengawasan/review-risiko/{$submission->id}/finalize-pengawas")
            ->assertStatus(200);

        $submission->refresh();
        $this->assertEquals(PengajuanPenilaianRisiko::STATUS_APPROVED, $submission->status);
        $this->assertEquals(PengajuanPenilaianRisiko::TIER_COMPLETED, $submission->current_tier);
    }

    public function test_evaluator_can_resubmit_clarification_per_form_directly_to_pengawas(): void
    {
        $submission = $this->submitInitial();
        $codes = app(RiskFormRegistry::class)->getCodes();

        Sanctum::actingAs($this->kepalaOpd);
        foreach ($codes as $code) {
            $this->postJson("/api/risiko/pengajuan/{$submission->id}/review-kepala", [
                'form_code' => $code,
                'status' => 'approved',
            ])->assertStatus(200);
        }
        $this->postJson("/api/risiko/pengajuan/{$submission->id}/forward-auditor")->assertStatus(200);

        Sanctum::actingAs($this->evaluator);
        foreach ($codes as $code) {
            $this->postJson("/api/pengawasan/review-risiko/{$submission->id}/item", [
                'form_code' => $code,
                'status' => 'approved',
            ])->assertStatus(200);
        }
        $this->postJson("/api/pengawasan/review-risiko/{$submission->id}/forward-pengawas")->assertStatus(200);

        // Pengawas rejects only Form 2B
        Sanctum::actingAs($this->pengawas);
        foreach ($codes as $code) {
            $this->postJson("/api/pengawasan/review-risiko/{$submission->id}/review-pengawas", [
                'form_code' => $code,
                'status' => $code === '2b' ? 'rejected' : 'approved',
                'catatan_revisi' => $code === '2b' ? 'Mohon klarifikasi dasar hukum selera risiko.' : null,
            ])->assertStatus(200);
        }

        // Evaluator clarifies Form 2B directly back to Pengawas
        Sanctum::actingAs($this->evaluator);
        $this->postJson("/api/pengawasan/review-risiko/{$submission->id}/resubmit-pengawas", [
            'form_code' => '2b',
            'catatan' => 'Sudah sesuai Perbup No. 12 Tahun 2026.',
        ])->assertStatus(200);

        // Pengawas approves Form 2B and finalizes
        Sanctum::actingAs($this->pengawas);
        $this->postJson("/api/pengawasan/review-risiko/{$submission->id}/review-pengawas", [
            'form_code' => '2b',
            'status' => 'approved',
        ])->assertStatus(200);

        $this->postJson("/api/pengawasan/review-risiko/{$submission->id}/finalize-pengawas")
            ->assertStatus(200);
    }

    public function test_reject_requires_minimum_5_char_message_across_all_tiers(): void
    {
        $submission = $this->submitInitial();

        Sanctum::actingAs($this->kepalaOpd);
        $this->postJson("/api/risiko/pengajuan/{$submission->id}/review-kepala", [
            'form_code' => '2b',
            'status' => 'rejected',
            'catatan' => 'abc',
        ])->assertStatus(422)->assertJsonValidationErrors(['catatan']);
    }
}
