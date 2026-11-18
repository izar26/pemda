<?php

declare(strict_types=1);

namespace Tests\Feature\Risiko;

use App\Models\Master\MasterJenisFraud;
use App\Models\Opd;
use App\Models\Pengawasan\AuditorOpdAssignment;
use App\Models\Perencanaan\PeriodePenilaian;
use App\Models\Risiko\FraudRiskAssessment;
use App\Models\Risiko\PengajuanPenilaianRisiko;
use App\Models\Risiko\PengajuanPenilaianRisikoItem;
use App\Models\Risiko\StatusFraudRiskAssessmentOpd;
use App\Models\User;
use App\Services\Risiko\Handlers\FraudRiskAssessmentHandler;
use Database\Seeders\RbacSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\Concerns\SeedsRisikoPrerequisites;
use Tests\TestCase;

class FraudRiskAssessmentTest extends TestCase
{
    use RefreshDatabase;
    use SeedsRisikoPrerequisites;

    protected Opd $opd;

    protected Opd $otherOpd;

    protected PeriodePenilaian $periode;

    protected User $opdUser;

    protected User $otherOpdUser;

    protected User $auditorUser;

    protected MasterJenisFraud $jenisFraud;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RbacSeeder::class);

        $this->opd = Opd::create([
            'nama' => 'Dinas Pekerjaan Umum',
            'kode' => 'DPU',
            'kategori' => 'Dinas',
            'is_active' => true,
        ]);

        $this->otherOpd = Opd::create([
            'nama' => 'Dinas Kesehatan',
            'kode' => 'DINKES',
            'kategori' => 'Dinas',
            'is_active' => true,
        ]);

        $this->periode = PeriodePenilaian::create([
            'nama_periode' => '2026',
            'tahun_penilaian' => '2026',
            'tahun_mulai' => 2026,
            'tahun_akhir' => 2030,
            'tanggal_mulai' => '2026-01-01',
            'tanggal_akhir' => '2030-12-31',
            'status' => 'aktif',
        ]);

        $this->jenisFraud = MasterJenisFraud::create([
            'nama' => 'Penyalahgunaan Asset',
            'deskripsi' => 'Penggunaan aset secara tidak sah',
            'is_active' => true,
            'urutan' => 1,
        ]);

        $this->opdUser = User::factory()->create([
            'opd_id' => $this->opd->id,
            'name' => 'Operator DPUTR',
        ]);
        $this->opdUser->assignRole('OPD');
        $this->opdUser->givePermissionTo([
            'identifikasi_risiko_opd.view',
            'identifikasi_risiko_opd.edit',
            'identifikasi_risiko_opd.delete',
        ]);

        $this->otherOpdUser = User::factory()->create([
            'opd_id' => $this->otherOpd->id,
            'name' => 'Operator Dinkes',
        ]);
        $this->otherOpdUser->assignRole('OPD');
        $this->otherOpdUser->givePermissionTo([
            'identifikasi_risiko_opd.view',
            'identifikasi_risiko_opd.edit',
        ]);

        $this->auditorUser = User::factory()->create([
            'name' => 'Auditor Inspektorat',
        ]);
        $this->auditorUser->assignRole('Auditor');
        $this->auditorUser->givePermissionTo([
            'identifikasi_risiko_opd.view',
        ]);

        AuditorOpdAssignment::create([
            'opd_id' => $this->opd->id,
            'auditor_id' => $this->auditorUser->id,
            'periode_penilaian_id' => $this->periode->id,
            'is_active' => true,
        ]);

        $this->seedPrerequisitesBefore((string) $this->opd->id, (string) $this->periode->id, 'fra');
    }

    public function test_can_list_fra_items_and_status_nihil(): void
    {
        Sanctum::actingAs($this->opdUser);

        FraudRiskAssessment::create([
            'opd_id' => $this->opd->id,
            'periode_penilaian_id' => $this->periode->id,
            'nomor_urut' => 1,
            'proses_bisnis' => 'Pengadaan Barang dan Jasa (PBJ)',
            'identifikasi_risiko_kecurangan' => 'Markup harga perkiraan sendiri (HPS)',
            'skenario_kecurangan' => 'HPS disusun tanpa survei harga pasar',
            'jenis_fraud_id' => $this->jenisFraud->id,
            'jenis_risiko_kecurangan' => 'Penyalahgunaan Asset',
            'pemilik_risiko' => 'Kepala SKPD',
            'penyebab' => 'Kesempatan (Opportunity)',
            'existing_control' => 'Review internal oleh tim teknis',
            'kemungkinan_kriteria' => 'Persentase (dlm 1 tahun)',
            'kemungkinan_skor' => 2,
            'dampak_kriteria' => 'Kerugian negara',
            'dampak_skor' => 3,
            'skala_risiko' => 12,
            'mitigasi' => 'Supervisi oleh PA dan Probity Audit APIP',
        ]);

        $response = $this->getJson('/api/risiko/fra?opd_id='.$this->opd->id.'&periode_penilaian_id='.$this->periode->id);

        $response->assertOk()
            ->assertJsonPath('meta.total', 1)
            ->assertJsonPath('is_nihil', false)
            ->assertJsonPath('is_complete', true)
            ->assertJsonPath('data.0.proses_bisnis', 'Pengadaan Barang dan Jasa (PBJ)')
            ->assertJsonPath('data.0.skala_risiko', 12);
    }

    public function test_can_get_reference_options(): void
    {
        Sanctum::actingAs($this->opdUser);

        $response = $this->getJson('/api/risiko/fra/reference-options');

        $response->assertOk()
            ->assertJsonStructure([
                'data' => [
                    'jenis_fraud',
                    'pemilik_risiko',
                    'penyebab',
                    'kriteria_kemungkinan',
                    'kriteria_dampak',
                    'preset_proses_bisnis',
                ],
            ]);
    }

    public function test_can_store_fra_item_and_calculates_skala_risiko_automatically(): void
    {
        Sanctum::actingAs($this->opdUser);

        $payload = [
            'opd_id' => $this->opd->id,
            'periode_penilaian_id' => $this->periode->id,
            'proses_bisnis' => 'Transaksi Keuangan (Penerimaan / Pengeluaran)',
            'identifikasi_risiko_kecurangan' => 'Pembayaran ganda atau tidak sah',
            'skenario_kecurangan' => 'Manipulasi bukti transfer kas daerah',
            'jenis_fraud_id' => $this->jenisFraud->id,
            'pemilik_risiko' => 'Kepala SKPD',
            'penyebab' => 'Kesempatan (Opportunity)',
            'existing_control' => 'Verifikasi berkas oleh bendahara pengeluaran',
            'kemungkinan_kriteria' => 'Jumlah Frekuensi (dlm 1 tahun)',
            'kemungkinan_skor' => 3,
            'dampak_kriteria' => 'Kerugian negara',
            'dampak_skor' => 4,
            'mitigasi' => 'Penerapan cash management system (CMS) perbankan terintegrasi',
        ];

        // Kemungkinan 3, Dampak 4 -> Matriks 5x5: 19
        $response = $this->postJson('/api/risiko/fra', $payload);

        $response->assertCreated()
            ->assertJsonPath('data.skala_risiko', 19)
            ->assertJsonPath('data.jenis_risiko_kecurangan', 'Penyalahgunaan Asset')
            ->assertJsonPath('data.nomor_urut', 1);

        $this->assertDatabaseHas('fraud_risk_assessments', [
            'opd_id' => $this->opd->id,
            'skala_risiko' => 19,
            'proses_bisnis' => 'Transaksi Keuangan (Penerimaan / Pengeluaran)',
        ]);
    }

    public function test_store_resets_status_nihil_automatically(): void
    {
        Sanctum::actingAs($this->opdUser);

        StatusFraudRiskAssessmentOpd::create([
            'opd_id' => $this->opd->id,
            'periode_penilaian_id' => $this->periode->id,
            'is_nihil' => true,
            'confirmed_by' => $this->opdUser->id,
            'confirmed_at' => now(),
        ]);

        $payload = [
            'opd_id' => $this->opd->id,
            'periode_penilaian_id' => $this->periode->id,
            'proses_bisnis' => 'Aset dan Persediaan',
            'identifikasi_risiko_kecurangan' => 'Penggunaan inventaris kantor untuk kepentingan pribadi',
            'skenario_kecurangan' => 'Bahan habis pakai dibawa pulang',
            'jenis_risiko_kecurangan' => 'Penyalahgunaan Asset',
            'pemilik_risiko' => 'Kepala SKPD',
            'penyebab' => 'Rasionalisasi (Rationalization)',
            'existing_control' => 'Pencatatan kartu stok manual',
            'kemungkinan_kriteria' => 'Persentase (dlm 1 tahun)',
            'kemungkinan_skor' => 1,
            'dampak_kriteria' => 'Penurunan kinerja',
            'dampak_skor' => 2,
            'mitigasi' => 'Pemeriksaan fisik aset berkala',
        ];

        $response = $this->postJson('/api/risiko/fra', $payload);
        $response->assertCreated();

        $this->assertDatabaseHas('status_fraud_risk_assessment_opds', [
            'opd_id' => $this->opd->id,
            'is_nihil' => false,
        ]);
    }

    public function test_can_update_fra_item_and_recalculates_skala_risiko(): void
    {
        Sanctum::actingAs($this->opdUser);

        $item = FraudRiskAssessment::create([
            'opd_id' => $this->opd->id,
            'periode_penilaian_id' => $this->periode->id,
            'proses_bisnis' => 'PBJ',
            'identifikasi_risiko_kecurangan' => 'Pengadaan fiktif',
            'skenario_kecurangan' => 'SPK fiktif',
            'jenis_risiko_kecurangan' => 'Korupsi',
            'pemilik_risiko' => 'Kepala SKPD',
            'penyebab' => 'Kesempatan (Opportunity)',
            'existing_control' => 'SOP PBJ',
            'kemungkinan_kriteria' => 'Persentase',
            'kemungkinan_skor' => 1,
            'dampak_kriteria' => 'Kerugian negara',
            'dampak_skor' => 1,
            'skala_risiko' => 1,
            'mitigasi' => 'Audit internal',
        ]);

        // Ubah skor: kemungkinan 5, dampak 5 -> Skala: 25
        $response = $this->putJson('/api/risiko/fra/'.$item->id, [
            'kemungkinan_skor' => 5,
            'dampak_skor' => 5,
            'mitigasi' => 'Probity audit menyeluruh',
        ]);

        $response->assertOk()
            ->assertJsonPath('data.skala_risiko', 25)
            ->assertJsonPath('data.mitigasi', 'Probity audit menyeluruh');

        $this->assertDatabaseHas('fraud_risk_assessments', [
            'id' => $item->id,
            'skala_risiko' => 25,
        ]);
    }

    public function test_can_delete_fra_item(): void
    {
        Sanctum::actingAs($this->opdUser);

        $item = FraudRiskAssessment::create([
            'opd_id' => $this->opd->id,
            'periode_penilaian_id' => $this->periode->id,
            'proses_bisnis' => 'SDM',
            'identifikasi_risiko_kecurangan' => 'Pungli berkas pensiun',
            'skenario_kecurangan' => 'Imbalan percepatan SK',
            'jenis_risiko_kecurangan' => 'Korupsi',
            'pemilik_risiko' => 'Kepala SKPD',
            'penyebab' => 'Tekanan (Pressure)',
            'existing_control' => 'Sistem online',
            'kemungkinan_kriteria' => 'Persentase',
            'kemungkinan_skor' => 2,
            'dampak_kriteria' => 'Penurunan reputasi',
            'dampak_skor' => 3,
            'skala_risiko' => 12,
            'mitigasi' => 'Sistem antrian online',
        ]);

        $response = $this->deleteJson('/api/risiko/fra/'.$item->id);

        $response->assertOk();
        $this->assertDatabaseMissing('fraud_risk_assessments', ['id' => $item->id]);
    }

    public function test_cannot_set_nihil_if_items_exist(): void
    {
        Sanctum::actingAs($this->opdUser);

        FraudRiskAssessment::create([
            'opd_id' => $this->opd->id,
            'periode_penilaian_id' => $this->periode->id,
            'proses_bisnis' => 'PBJ',
            'identifikasi_risiko_kecurangan' => 'Suap rekanan',
            'skenario_kecurangan' => 'Fee proyek',
            'jenis_risiko_kecurangan' => 'Korupsi',
            'pemilik_risiko' => 'Kepala SKPD',
            'penyebab' => 'Kesempatan (Opportunity)',
            'existing_control' => 'SOP',
            'kemungkinan_kriteria' => 'Persentase',
            'kemungkinan_skor' => 2,
            'dampak_kriteria' => 'Tuntutan hukum',
            'dampak_skor' => 4,
            'skala_risiko' => 14,
            'mitigasi' => 'Pemeriksaan rutin',
        ]);

        $response = $this->postJson('/api/risiko/fra/confirm-nihil', [
            'opd_id' => $this->opd->id,
            'periode_penilaian_id' => $this->periode->id,
            'is_nihil' => true,
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['nihil']);
    }

    public function test_can_confirm_and_cancel_nihil_when_no_items_exist(): void
    {
        Sanctum::actingAs($this->opdUser);

        $response = $this->postJson('/api/risiko/fra/confirm-nihil', [
            'opd_id' => $this->opd->id,
            'periode_penilaian_id' => $this->periode->id,
            'is_nihil' => true,
            'catatan' => 'Berdasarkan assessment tidak ditemukan risiko kecurangan.',
        ]);

        $response->assertOk()
            ->assertJsonPath('data.is_nihil', true)
            ->assertJsonPath('data.is_complete', true)
            ->assertJsonPath('data.nihil_info.catatan', 'Berdasarkan assessment tidak ditemukan risiko kecurangan.');

        $this->assertDatabaseHas('status_fraud_risk_assessment_opds', [
            'opd_id' => $this->opd->id,
            'is_nihil' => true,
        ]);

        // Batalkan status nihil
        $cancelResponse = $this->postJson('/api/risiko/fra/confirm-nihil', [
            'opd_id' => $this->opd->id,
            'periode_penilaian_id' => $this->periode->id,
            'is_nihil' => false,
        ]);

        $cancelResponse->assertOk()
            ->assertJsonPath('data.is_nihil', false)
            ->assertJsonPath('data.is_complete', false);
    }

    public function test_locked_submission_prevents_mutating_fra(): void
    {
        Sanctum::actingAs($this->opdUser);

        $submission = PengajuanPenilaianRisiko::create([
            'opd_id' => $this->opd->id,
            'periode_penilaian_id' => $this->periode->id,
            'status' => PengajuanPenilaianRisiko::STATUS_SUBMITTED_TO_KEPALA,
            'current_tier' => PengajuanPenilaianRisiko::TIER_KEPALA_OPD,
            'submitted_at' => now(),
        ]);

        PengajuanPenilaianRisikoItem::create([
            'pengajuan_id' => $submission->id,
            'form_code' => 'fra',
            'status' => PengajuanPenilaianRisikoItem::STATUS_SUBMITTED,
        ]);

        $payload = [
            'opd_id' => $this->opd->id,
            'periode_penilaian_id' => $this->periode->id,
            'proses_bisnis' => 'PBJ',
            'identifikasi_risiko_kecurangan' => 'Pengadaan fiktif',
            'skenario_kecurangan' => 'SPK fiktif',
            'jenis_risiko_kecurangan' => 'Korupsi',
            'pemilik_risiko' => 'Kepala SKPD',
            'penyebab' => 'Kesempatan (Opportunity)',
            'existing_control' => 'SOP',
            'kemungkinan_kriteria' => 'Persentase',
            'kemungkinan_skor' => 2,
            'dampak_kriteria' => 'Kerugian negara',
            'dampak_skor' => 3,
            'mitigasi' => 'Mitigasi',
        ];

        $response = $this->postJson('/api/risiko/fra', $payload);
        $response->assertForbidden();
    }

    public function test_auditor_or_view_only_user_cannot_mutate_fra(): void
    {
        Sanctum::actingAs($this->auditorUser);

        $payload = [
            'opd_id' => $this->opd->id,
            'periode_penilaian_id' => $this->periode->id,
            'proses_bisnis' => 'PBJ',
            'identifikasi_risiko_kecurangan' => 'Pengadaan fiktif',
            'skenario_kecurangan' => 'SPK fiktif',
            'jenis_risiko_kecurangan' => 'Korupsi',
            'pemilik_risiko' => 'Kepala SKPD',
            'penyebab' => 'Kesempatan (Opportunity)',
            'existing_control' => 'SOP',
            'kemungkinan_kriteria' => 'Persentase',
            'kemungkinan_skor' => 2,
            'dampak_kriteria' => 'Kerugian negara',
            'dampak_skor' => 3,
            'mitigasi' => 'Mitigasi',
        ];

        $response = $this->postJson('/api/risiko/fra', $payload);
        $response->assertForbidden();
    }

    public function test_is_complete_logic_on_handler(): void
    {
        $handler = app(FraudRiskAssessmentHandler::class);

        $this->assertFalse($handler->isComplete($this->opd->id, $this->periode->id));

        StatusFraudRiskAssessmentOpd::create([
            'opd_id' => $this->opd->id,
            'periode_penilaian_id' => $this->periode->id,
            'is_nihil' => true,
            'confirmed_by' => $this->opdUser->id,
            'confirmed_at' => now(),
        ]);

        $this->assertTrue($handler->isComplete($this->opd->id, $this->periode->id));
    }

    public function test_auditor_can_review_form_fra_endpoint(): void
    {
        FraudRiskAssessment::create([
            'opd_id' => $this->opd->id,
            'periode_penilaian_id' => $this->periode->id,
            'nomor_urut' => 1,
            'proses_bisnis' => 'PBJ',
            'identifikasi_risiko_kecurangan' => 'Pengadaan fiktif',
            'skenario_kecurangan' => 'SPK fiktif',
            'jenis_risiko_kecurangan' => 'Korupsi',
            'pemilik_risiko' => 'Kepala SKPD',
            'penyebab' => 'Kesempatan (Opportunity)',
            'existing_control' => 'SOP',
            'kemungkinan_kriteria' => 'Persentase',
            'kemungkinan_skor' => 2,
            'dampak_kriteria' => 'Kerugian negara',
            'dampak_skor' => 3,
            'skala_risiko' => 12,
            'mitigasi' => 'Mitigasi',
        ]);

        $submission = PengajuanPenilaianRisiko::create([
            'opd_id' => $this->opd->id,
            'periode_penilaian_id' => $this->periode->id,
            'status' => PengajuanPenilaianRisiko::STATUS_SUBMITTED_TO_AUDITOR,
            'current_tier' => PengajuanPenilaianRisiko::TIER_AUDITOR,
            'auditor_id' => $this->auditorUser->id,
            'submitted_at' => now(),
            'submitted_by' => $this->opdUser->id,
        ]);

        PengajuanPenilaianRisikoItem::create([
            'pengajuan_id' => $submission->id,
            'form_code' => 'fra',
            'status' => PengajuanPenilaianRisikoItem::STATUS_SUBMITTED,
        ]);

        Sanctum::actingAs($this->auditorUser);

        $res = $this->getJson("/api/pengawasan/review-risiko/{$submission->id}/forms/fra");

        $res->assertOk()
            ->assertJsonStructure([
                'data' => [
                    '*' => [
                        'id',
                        'proses_bisnis',
                        'identifikasi_risiko_kecurangan',
                        'skala_risiko',
                    ],
                ],
                'is_nihil',
                'meta',
            ]);
    }
}
