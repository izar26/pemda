<?php

declare(strict_types=1);

namespace Tests\Feature\Risiko;

use App\Models\Master\MasterSumberData;
use App\Models\Master\MasterUrusanPemerintahan;
use App\Models\Opd;
use App\Models\Pengawasan\AuditorOpdAssignment;
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
use App\Models\Risiko\PencatatanKejadianRisiko;
use App\Models\Risiko\PengajuanPenilaianRisiko;
use App\Models\Risiko\PengajuanPenilaianRisikoItem;
use App\Models\Risiko\StatusKejadianRisikoOpd;
use App\Models\Risiko\TindakPengendalianRisiko;
use App\Models\User;
use App\Services\Risiko\KejadianRisikoService;
use Database\Seeders\RbacSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\Concerns\SeedsRisikoPrerequisites;
use Tests\TestCase;

class KejadianRisikoTest extends TestCase
{
    use RefreshDatabase;
    use SeedsRisikoPrerequisites;

    protected Opd $opd;

    protected Opd $otherOpd;

    protected PeriodePenilaian $periode;

    protected User $opdUser;

    protected User $otherOpdUser;

    protected User $auditorUser;

    protected IdentifikasiRisikoPemdaItem $item3a;

    protected IdentifikasiRisikoOpdItem $item3b;

    protected IdentifikasiRisikoOpdOperasionalItem $item3c;

    protected AnalisisRisiko $analysis3b;

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

        $this->opdUser = User::factory()->create(['opd_id' => $this->opd->id]);
        $this->opdUser->assignRole('OPD');

        $this->otherOpdUser = User::factory()->create(['opd_id' => $this->otherOpd->id]);
        $this->otherOpdUser->assignRole('OPD');

        $this->auditorUser = User::factory()->create();
        $this->auditorUser->assignRole('Auditor');

        AuditorOpdAssignment::create([
            'opd_id' => $this->opd->id,
            'auditor_id' => $this->auditorUser->id,
            'periode_penilaian_id' => $this->periode->id,
            'is_active' => true,
        ]);

        $sumber = MasterSumberData::create(['nama' => 'Renstra DPU', 'is_active' => true]);
        $tujuan = TujuanPenilaian::create(['opd_id' => $this->opd->id, 'periode_penilaian_id' => $this->periode->id, 'sumber_data_id' => $sumber->id, 'kode_tujuan' => 'T1', 'tujuan' => 'Infrastruktur Mantap']);
        $sasaran = SasaranPenilaian::create(['opd_id' => $this->opd->id, 'periode_penilaian_id' => $this->periode->id, 'tujuan_penilaian_id' => $tujuan->id, 'kode_sasaran' => 'S1', 'sasaran' => 'Jalan Mantap']);
        $urusan = MasterUrusanPemerintahan::firstOrCreate(['kode' => '03'], ['nama' => 'Pekerjaan Umum', 'is_active' => true]);

        // Form 3A item
        $doc3a = IdentifikasiRisikoPemda::create([
            'opd_id' => $this->opd->id,
            'periode_penilaian_id' => $this->periode->id,
            'master_urusan_pemerintahan_id' => $urusan->id,
        ]);
        $this->item3a = IdentifikasiRisikoPemdaItem::create([
            'identifikasi_risiko_pemda_id' => $doc3a->id,
            'kode_risiko' => 'RSP.001',
            'pernyataan_risiko' => 'Kerusakan Jembatan Utama',
            'kategori_risiko' => 'Strategis',
            'pemilik_risiko' => 'Bupati',
            'sifat_risiko' => 'C',
            'uraian_dampak' => 'Transportasi terputus',
        ]);

        // Form 3B item with Form 6 RTP
        $doc3b = IdentifikasiRisikoOpd::create([
            'opd_id' => $this->opd->id,
            'periode_penilaian_id' => $this->periode->id,
            'master_urusan_pemerintahan_id' => $urusan->id,
        ]);
        $this->item3b = IdentifikasiRisikoOpdItem::create([
            'identifikasi_risiko_opd_id' => $doc3b->id,
            'kode_risiko' => 'RSO.001',
            'pernyataan_risiko' => 'Longsor Tebing Jalan Kabupaten',
            'kategori_risiko' => 'Operasional',
            'pemilik_risiko' => 'Kadis PU',
            'sifat_risiko' => 'C',
            'uraian_dampak' => 'Akses warga terhambat',
        ]);

        $this->analysis3b = AnalisisRisiko::create([
            'risiko_opd_item_id' => $this->item3b->id,
            'kriteria_kemungkinan' => 'Frekuensi',
            'inheren_kemungkinan' => 4,
            'kriteria_dampak' => 'Biaya',
            'inheren_dampak' => 4,
            'residual_kriteria_kemungkinan' => 'Frekuensi',
            'residual_kemungkinan' => 4,
            'residual_kriteria_dampak' => 'Biaya',
            'residual_dampak' => 4,
            'pengendalian_ada' => false,
            'rencana_tindak' => 'Pemasangan bronjong kawat',
        ]);

        TindakPengendalianRisiko::create([
            'analisis_risiko_id' => $this->analysis3b->id,
            'celah_pengendalian' => 'Belum ada tanggul penahan',
            'penanggung_jawab' => 'Kabid Bina Marga',
            'target_waktu' => 'Triwulan III 2026',
            'treated_kemungkinan' => 2,
            'treated_dampak' => 2,
        ]);

        // Form 3C item
        $doc3c = IdentifikasiRisikoOpdOperasional::create([
            'opd_id' => $this->opd->id,
            'periode_penilaian_id' => $this->periode->id,
        ]);
        $this->item3c = IdentifikasiRisikoOpdOperasionalItem::create([
            'identifikasi_risiko_opd_operasional_id' => $doc3c->id,
            'kode_risiko' => 'ROO.001',
            'pernyataan_risiko' => 'Keterlambatan Aspal Hotmix',
            'kategori_risiko' => 'Operasional',
            'pemilik_risiko' => 'PPK Jalan',
            'sifat_risiko' => 'C',
            'uraian_dampak' => 'Proyek molor',
        ]);

        $this->seedPrerequisitesBefore((string) $this->opd->id, (string) $this->periode->id, '10');
    }

    public function test_opd_can_list_risk_options_across_3a_3b_3c(): void
    {
        Sanctum::actingAs($this->opdUser);

        $response = $this->getJson("/api/risiko/kejadian-risiko/risk-options?opd_id={$this->opd->id}&periode_penilaian_id={$this->periode->id}");

        $response->assertOk()
            ->assertJsonStructure([
                'data' => [
                    'pemda',
                    'opd',
                    'operasional',
                    'all',
                ],
            ]);

        $all = $response->json('data.all');
        $this->assertCount(3, $all);

        // Check that 3b risk has RTP linked
        $opdRisk = collect($all)->firstWhere('kode_risiko', 'RSO.001');
        $this->assertNotNull($opdRisk);
        $this->assertSame('Pemasangan bronjong kawat', $opdRisk['rencana_tindak']);
        $this->assertSame('Triwulan III 2026', $opdRisk['target_waktu']);
        $this->assertSame(1, $opdRisk['has_rtp']);
    }

    public function test_opd_can_create_update_and_delete_kejadian_risiko(): void
    {
        Sanctum::actingAs($this->opdUser);

        // 1. Create incident linked to 3B
        $createRes = $this->postJson('/api/risiko/kejadian-risiko', [
            'opd_id' => $this->opd->id,
            'periode_penilaian_id' => $this->periode->id,
            'source_type' => '3b',
            'risk_item_id' => $this->item3b->id,
            'tanggal_kejadian' => '2026-05-12',
            'sebab' => 'Hujan lebat selama 3 hari berturut-turut memicu pergerakan tanah.',
            'dampak' => 'Sebagian badan jalan amblas sepanjang 15 meter.',
            'keterangan' => 'Arus lalu lintas dialihkan sementara ke jalur alternatif.',
            'realisasi_waktu_rtp' => 'Juni 2026',
            'keterangan_rtp' => 'Pemasangan bronjong darurat telah diselesaikan.',
        ]);

        $createRes->assertCreated()
            ->assertJsonPath('data.kode_risiko', 'RSO.001')
            ->assertJsonPath('data.rencana_tindak', 'Pemasangan bronjong kawat')
            ->assertJsonPath('data.target_waktu', 'Triwulan III 2026')
            ->assertJsonPath('data.realisasi_waktu_rtp', 'Juni 2026')
            ->assertJsonPath('data.has_rtp', true);

        $incidentId = $createRes->json('data.id');

        // 2. List incident
        $listRes = $this->getJson("/api/risiko/kejadian-risiko?opd_id={$this->opd->id}&periode_penilaian_id={$this->periode->id}");
        $listRes->assertOk()
            ->assertJsonPath('meta.total', 1)
            ->assertJsonPath('is_nihil', false)
            ->assertJsonPath('is_complete', true);

        // 3. Update incident
        $updateRes = $this->putJson("/api/risiko/kejadian-risiko/{$incidentId}", [
            'tanggal_kejadian' => '2026-05-14',
            'sebab' => 'Hujan lebat disertai luapan air saluran irigasi.',
            'dampak' => 'Sebagian badan jalan amblas 15 meter dan tiang listrik miring.',
        ]);

        $updateRes->assertOk()
            ->assertJsonPath('data.tanggal_kejadian', '2026-05-14')
            ->assertJsonPath('data.sebab', 'Hujan lebat disertai luapan air saluran irigasi.');

        // 4. Delete incident
        $deleteRes = $this->deleteJson("/api/risiko/kejadian-risiko/{$incidentId}");
        $deleteRes->assertOk();

        $this->assertDatabaseMissing('pencatatan_kejadian_risikos', ['id' => $incidentId]);
    }

    public function test_creating_incident_auto_resets_nihil_status(): void
    {
        Sanctum::actingAs($this->opdUser);

        // First set status to nihil
        $nihilRes = $this->postJson('/api/risiko/kejadian-risiko/confirm-nihil', [
            'opd_id' => $this->opd->id,
            'periode_penilaian_id' => $this->periode->id,
            'is_nihil' => true,
        ]);
        $nihilRes->assertOk()->assertJsonPath('data.is_nihil', true);

        $this->assertDatabaseHas('status_kejadian_risiko_opds', [
            'opd_id' => $this->opd->id,
            'periode_penilaian_id' => $this->periode->id,
            'is_nihil' => true,
        ]);

        // Creating an incident must automatically flip is_nihil to false
        $this->postJson('/api/risiko/kejadian-risiko', [
            'opd_id' => $this->opd->id,
            'periode_penilaian_id' => $this->periode->id,
            'source_type' => '3a',
            'risk_item_id' => $this->item3a->id,
            'tanggal_kejadian' => '2026-08-01',
            'sebab' => 'Erosi bantaran sungai menghantam pilar jembatan.',
            'dampak' => 'Retakan pada pilar jembatan utama.',
        ])->assertCreated();

        $this->assertDatabaseHas('status_kejadian_risiko_opds', [
            'opd_id' => $this->opd->id,
            'periode_penilaian_id' => $this->periode->id,
            'is_nihil' => false,
        ]);
    }

    public function test_cannot_confirm_nihil_when_incidents_exist(): void
    {
        Sanctum::actingAs($this->opdUser);

        // Add incident
        PencatatanKejadianRisiko::create([
            'opd_id' => $this->opd->id,
            'periode_penilaian_id' => $this->periode->id,
            'source_type' => '3b',
            'identifikasi_risiko_opd_item_id' => $this->item3b->id,
            'tanggal_kejadian' => '2026-06-01',
            'sebab' => 'Penyebab nyata',
            'dampak' => 'Dampak nyata',
        ]);

        // Attempting to set nihil must fail with 422
        $res = $this->postJson('/api/risiko/kejadian-risiko/confirm-nihil', [
            'opd_id' => $this->opd->id,
            'periode_penilaian_id' => $this->periode->id,
            'is_nihil' => true,
        ]);

        $res->assertUnprocessable()
            ->assertJsonValidationErrors(['is_nihil']);
    }

    public function test_is_complete_evaluates_correctly(): void
    {
        $service = app(KejadianRisikoService::class);

        // Initially: no incident, not nihil -> not complete
        $this->assertFalse($service->isComplete($this->opd->id, $this->periode->id));

        // Confirm nihil -> complete
        StatusKejadianRisikoOpd::create([
            'opd_id' => $this->opd->id,
            'periode_penilaian_id' => $this->periode->id,
            'is_nihil' => true,
        ]);
        $this->assertTrue($service->isComplete($this->opd->id, $this->periode->id));

        // Add incomplete incident -> not complete even if nihil row was there
        $incident = PencatatanKejadianRisiko::create([
            'opd_id' => $this->opd->id,
            'periode_penilaian_id' => $this->periode->id,
            'source_type' => '3b',
            'identifikasi_risiko_opd_item_id' => $this->item3b->id,
            'tanggal_kejadian' => '2026-06-01',
            'sebab' => '',
            'dampak' => 'Dampak saja',
        ]);
        $this->assertFalse($service->isComplete($this->opd->id, $this->periode->id));

        // Complete incident -> complete
        $incident->update(['sebab' => 'Penyebab terisi']);
        $this->assertTrue($service->isComplete($this->opd->id, $this->periode->id));
    }

    public function test_tenant_isolation_prevents_cross_opd_editing(): void
    {
        Sanctum::actingAs($this->otherOpdUser);

        // Trying to save incident to another OPD must be forbidden (403)
        $this->postJson('/api/risiko/kejadian-risiko', [
            'opd_id' => $this->opd->id,
            'periode_penilaian_id' => $this->periode->id,
            'source_type' => '3b',
            'risk_item_id' => $this->item3b->id,
            'tanggal_kejadian' => '2026-05-12',
            'sebab' => 'Sebab',
            'dampak' => 'Dampak',
        ])->assertForbidden();

        // Trying to confirm nihil for another OPD must be forbidden (403)
        $this->postJson('/api/risiko/kejadian-risiko/confirm-nihil', [
            'opd_id' => $this->opd->id,
            'periode_penilaian_id' => $this->periode->id,
            'is_nihil' => true,
        ])->assertForbidden();
    }

    public function test_locked_submission_prevents_mutating_incident(): void
    {
        $incident = PencatatanKejadianRisiko::create([
            'opd_id' => $this->opd->id,
            'periode_penilaian_id' => $this->periode->id,
            'source_type' => '3b',
            'identifikasi_risiko_opd_item_id' => $this->item3b->id,
            'tanggal_kejadian' => '2026-05-12',
            'sebab' => 'Sebab',
            'dampak' => 'Dampak',
        ]);

        $submission = PengajuanPenilaianRisiko::create([
            'opd_id' => $this->opd->id,
            'periode_penilaian_id' => $this->periode->id,
            'status' => PengajuanPenilaianRisiko::STATUS_SUBMITTED_TO_AUDITOR,
            'current_tier' => PengajuanPenilaianRisiko::TIER_AUDITOR,
            'submitted_at' => now(),
            'submitted_by' => $this->opdUser->id,
        ]);

        PengajuanPenilaianRisikoItem::create([
            'pengajuan_id' => $submission->id,
            'form_code' => '10',
            'status' => PengajuanPenilaianRisikoItem::STATUS_SUBMITTED,
        ]);

        Sanctum::actingAs($this->opdUser);

        // Updating or creating should be rejected while locked
        $this->putJson("/api/risiko/kejadian-risiko/{$incident->id}", [
            'sebab' => 'Coba ubah saat terkunci',
        ])->assertForbidden();

        $this->deleteJson("/api/risiko/kejadian-risiko/{$incident->id}")->assertForbidden();
    }

    public function test_auditor_can_review_form_10_endpoint(): void
    {
        PencatatanKejadianRisiko::create([
            'opd_id' => $this->opd->id,
            'periode_penilaian_id' => $this->periode->id,
            'source_type' => '3b',
            'identifikasi_risiko_opd_item_id' => $this->item3b->id,
            'tanggal_kejadian' => '2026-05-12',
            'sebab' => 'Sebab kejadian',
            'dampak' => 'Dampak nyata',
            'realisasi_waktu_rtp' => 'Juli 2026',
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
            'form_code' => '10',
            'status' => PengajuanPenilaianRisikoItem::STATUS_SUBMITTED,
        ]);

        Sanctum::actingAs($this->auditorUser);

        $res = $this->getJson("/api/pengawasan/review-risiko/{$submission->id}/forms/10");

        $res->assertOk()
            ->assertJsonStructure([
                'data' => [
                    '*' => [
                        'id',
                        'kode_risiko',
                        'pernyataan_risiko',
                        'tanggal_kejadian',
                        'sebab',
                        'dampak',
                        'rencana_tindak',
                        'target_waktu',
                        'realisasi_waktu_rtp',
                    ],
                ],
                'meta',
                'is_nihil',
            ])
            ->assertJsonPath('data.0.kode_risiko', 'RSO.001')
            ->assertJsonPath('data.0.realisasi_waktu_rtp', 'Juli 2026');
    }

    public function test_auditor_or_view_only_user_cannot_delete_incident(): void
    {
        $incident = PencatatanKejadianRisiko::create([
            'opd_id' => $this->opd->id,
            'periode_penilaian_id' => $this->periode->id,
            'source_type' => '3b',
            'identifikasi_risiko_opd_item_id' => $this->item3b->id,
            'tanggal_kejadian' => '2026-05-12',
            'sebab' => 'Sebab kejadian',
            'dampak' => 'Dampak nyata',
        ]);

        // Auditor must be rejected with 403 Forbidden
        Sanctum::actingAs($this->auditorUser);
        $this->deleteJson("/api/risiko/kejadian-risiko/{$incident->id}")->assertForbidden();

        // User without edit permission must be rejected with 403 Forbidden
        $viewOnlyUser = User::factory()->create(['opd_id' => $this->opd->id]);
        $viewOnlyUser->givePermissionTo('identifikasi_risiko_opd.view');
        Sanctum::actingAs($viewOnlyUser);
        $this->deleteJson("/api/risiko/kejadian-risiko/{$incident->id}")->assertForbidden();

        $this->assertDatabaseHas('pencatatan_kejadian_risikos', ['id' => $incident->id]);
    }

    public function test_search_and_source_filters(): void
    {
        Sanctum::actingAs($this->opdUser);

        PencatatanKejadianRisiko::create([
            'opd_id' => $this->opd->id,
            'periode_penilaian_id' => $this->periode->id,
            'source_type' => '3a',
            'identifikasi_risiko_pemda_item_id' => $this->item3a->id,
            'tanggal_kejadian' => '2026-03-01',
            'sebab' => 'Banjir bandang luapan sungai',
            'dampak' => 'Pilar jembatan retak',
        ]);

        PencatatanKejadianRisiko::create([
            'opd_id' => $this->opd->id,
            'periode_penilaian_id' => $this->periode->id,
            'source_type' => '3b',
            'identifikasi_risiko_opd_item_id' => $this->item3b->id,
            'tanggal_kejadian' => '2026-04-01',
            'sebab' => 'Longsor lereng bukit',
            'dampak' => 'Jalan tertutup material tanah',
        ]);

        // Filter by source=3a
        $res3a = $this->getJson("/api/risiko/kejadian-risiko?opd_id={$this->opd->id}&periode_penilaian_id={$this->periode->id}&source=3a");
        $res3a->assertOk()->assertJsonPath('meta.total', 1)->assertJsonPath('data.0.source_type', '3a');

        // Filter by source=3b
        $res3b = $this->getJson("/api/risiko/kejadian-risiko?opd_id={$this->opd->id}&periode_penilaian_id={$this->periode->id}&source=3b");
        $res3b->assertOk()->assertJsonPath('meta.total', 1)->assertJsonPath('data.0.source_type', '3b');

        // Search by keyword "banjir"
        $resSearch = $this->getJson("/api/risiko/kejadian-risiko?opd_id={$this->opd->id}&periode_penilaian_id={$this->periode->id}&search=banjir");
        $resSearch->assertOk()->assertJsonPath('meta.total', 1)->assertJsonPath('data.0.sebab', 'Banjir bandang luapan sungai');
    }

    public function test_update_requires_coupled_source_type_and_risk_item_id(): void
    {
        Sanctum::actingAs($this->opdUser);

        $incident = PencatatanKejadianRisiko::create([
            'opd_id' => $this->opd->id,
            'periode_penilaian_id' => $this->periode->id,
            'source_type' => '3b',
            'identifikasi_risiko_opd_item_id' => $this->item3b->id,
            'tanggal_kejadian' => '2026-05-12',
            'sebab' => 'Sebab kejadian',
            'dampak' => 'Dampak nyata',
        ]);

        // Sending source_type without risk_item_id must fail validation
        $res = $this->putJson("/api/risiko/kejadian-risiko/{$incident->id}", [
            'source_type' => '3c',
        ]);
        $res->assertUnprocessable()->assertJsonValidationErrors(['risk_item_id']);

        // Sending risk_item_id without source_type must fail validation
        $res2 = $this->putJson("/api/risiko/kejadian-risiko/{$incident->id}", [
            'risk_item_id' => $this->item3c->id,
        ]);
        $res2->assertUnprocessable()->assertJsonValidationErrors(['source_type']);
    }
}
