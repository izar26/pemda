<?php

declare(strict_types=1);

namespace Tests\Feature\Risiko;

use App\Models\Opd;
use App\Models\Pengawasan\AuditorOpdAssignment;
use App\Models\Perencanaan\PeriodePenilaian;
use App\Models\Risiko\AnalisisRisiko;
use App\Models\Risiko\IdentifikasiRisikoOpd;
use App\Models\Risiko\IdentifikasiRisikoOpdItem;
use App\Models\Risiko\PemantauanPengendalianRisiko;
use App\Models\Risiko\PengajuanPenilaianRisiko;
use App\Models\Risiko\PengajuanPenilaianRisikoItem;
use App\Models\Risiko\TindakPengendalianRisiko;
use App\Models\User;
use App\Services\Risiko\Handlers\PemantauanPengendalian9Handler;
use Database\Seeders\RbacSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class PemantauanPengendalianTest extends TestCase
{
    use RefreshDatabase;

    protected Opd $opd;

    protected Opd $otherOpd;

    protected PeriodePenilaian $periode;

    protected User $opdUser;

    protected User $otherOpdUser;

    protected User $auditorUser;

    protected IdentifikasiRisikoOpdItem $priorityItem;

    protected AnalisisRisiko $priorityAnalysis;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RbacSeeder::class);

        $this->opd = Opd::create([
            'nama' => 'Dinas Perhubungan',
            'kode' => 'DISHUB',
            'kategori' => 'Dinas',
            'is_active' => true,
        ]);

        $this->otherOpd = Opd::create([
            'nama' => 'Dinas Sosial',
            'kode' => 'DINSOS',
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

        $doc = IdentifikasiRisikoOpd::create([
            'opd_id' => $this->opd->id,
            'periode_penilaian_id' => $this->periode->id,
        ]);

        // Priority risk: residual (4, 4) -> score 22 (> 9)
        $this->priorityItem = IdentifikasiRisikoOpdItem::create([
            'identifikasi_risiko_opd_id' => $doc->id,
            'kode_risiko' => 'RSO.010',
            'pernyataan_risiko' => 'Kerusakan Rambu Lalu Lintas',
            'kategori_risiko' => 'Operasional',
            'pemilik_risiko' => 'Bidang Lalu Lintas',
        ]);

        $this->priorityAnalysis = AnalisisRisiko::create([
            'risiko_opd_item_id' => $this->priorityItem->id,
            'kriteria_kemungkinan' => 'Frekuensi',
            'inheren_kemungkinan' => 4,
            'kriteria_dampak' => 'Keamanan',
            'inheren_dampak' => 5,
            'residual_kriteria_kemungkinan' => 'Frekuensi',
            'residual_kemungkinan' => 4,
            'residual_kriteria_dampak' => 'Keamanan',
            'residual_dampak' => 4,
            'pengendalian_ada' => false,
            'rencana_tindak' => 'Patroli rambu mingguan',
        ]);

        TindakPengendalianRisiko::create([
            'analisis_risiko_id' => $this->priorityAnalysis->id,
            'celah_pengendalian' => 'Personel patroli terbatas',
            'penanggung_jawab' => 'Kasie Rekayasa LL',
            'target_waktu' => 'Triwulan III 2026',
            'treated_kemungkinan' => 2,
            'treated_dampak' => 2,
        ]);
    }

    public function test_opd_can_list_pemantauan_pengendalian(): void
    {
        Sanctum::actingAs($this->opdUser);

        $response = $this->getJson("/api/risiko/pemantauan-pengendalian?opd_id={$this->opd->id}&periode_penilaian_id={$this->periode->id}");

        $response->assertOk()
            ->assertJsonPath('meta.total', 1)
            ->assertJsonPath('data.0.kode_risiko', 'RSO.010')
            ->assertJsonPath('data.0.rencana_tindak', 'Patroli rambu mingguan')
            ->assertJsonPath('data.0.complete', false);
    }

    public function test_opd_can_save_pemantauan_pengendalian(): void
    {
        Sanctum::actingAs($this->opdUser);

        $payload = [
            'bentuk_pemantauan' => 'Observasi Fisik Lapangan & Cek Log Patroli',
            'penanggung_jawab_pemantauan' => 'Irban Wilayah II',
            'rencana_waktu_pemantauan' => 'Triwulan III 2026',
            'realisasi_waktu_pemantauan' => '20 Agustus 2026',
            'keterangan' => 'Pemantauan berkala bersama tim APIP',
        ];

        $response = $this->putJson("/api/risiko/pemantauan-pengendalian/3b/{$this->priorityItem->id}", $payload);

        $response->assertOk()
            ->assertJsonPath('message', 'Rancangan pemantauan pengendalian intern tersimpan.')
            ->assertJsonPath('data.bentuk_pemantauan', 'Observasi Fisik Lapangan & Cek Log Patroli')
            ->assertJsonPath('data.penanggung_jawab_pemantauan', 'Irban Wilayah II')
            ->assertJsonPath('data.complete', true);

        $this->assertDatabaseHas('pemantauan_pengendalian_risikos', [
            'analisis_risiko_id' => $this->priorityAnalysis->id,
            'bentuk_pemantauan' => 'Observasi Fisik Lapangan & Cek Log Patroli',
            'penanggung_jawab_pemantauan' => 'Irban Wilayah II',
            'rencana_waktu_pemantauan' => 'Triwulan III 2026',
        ]);
    }

    public function test_tenant_isolation_on_pemantauan_pengendalian(): void
    {
        Sanctum::actingAs($this->otherOpdUser);

        $this->putJson("/api/risiko/pemantauan-pengendalian/3b/{$this->priorityItem->id}", [
            'bentuk_pemantauan' => 'Bypass attempt',
            'penanggung_jawab_pemantauan' => 'Attacker',
            'rencana_waktu_pemantauan' => 'Today',
        ])->assertForbidden();

        $this->getJson("/api/risiko/pemantauan-pengendalian?opd_id={$this->opd->id}&periode_penilaian_id={$this->periode->id}")
            ->assertForbidden();
    }

    public function test_handler_completeness_and_polymorphic_review_for_form_9(): void
    {
        $handler = app(PemantauanPengendalian9Handler::class);

        // Before fill: incomplete
        $this->assertFalse($handler->isComplete($this->opd->id, $this->periode->id));

        // Save complete data
        PemantauanPengendalianRisiko::create([
            'analisis_risiko_id' => $this->priorityAnalysis->id,
            'bentuk_pemantauan' => 'Reviu Dokumen dan Wawancara',
            'penanggung_jawab_pemantauan' => 'Irban Khusus',
            'rencana_waktu_pemantauan' => 'Triwulan IV',
        ]);

        $this->assertTrue($handler->isComplete($this->opd->id, $this->periode->id));

        // Review data via polymorphic endpoint
        $submission = PengajuanPenilaianRisiko::create([
            'opd_id' => $this->opd->id,
            'periode_penilaian_id' => $this->periode->id,
            'auditor_id' => $this->auditorUser->id,
            'status' => PengajuanPenilaianRisiko::STATUS_SUBMITTED_TO_AUDITOR,
            'current_tier' => PengajuanPenilaianRisiko::TIER_AUDITOR,
        ]);

        PengajuanPenilaianRisikoItem::create([
            'pengajuan_id' => $submission->id,
            'form_code' => '9',
            'status' => PengajuanPenilaianRisikoItem::STATUS_SUBMITTED,
        ]);

        Sanctum::actingAs($this->auditorUser);
        $reviewResponse = $this->getJson("/api/pengawasan/review-risiko/{$submission->id}/forms/9");

        $reviewResponse->assertOk()
            ->assertJsonPath('data.0.bentuk_pemantauan', 'Reviu Dokumen dan Wawancara')
            ->assertJsonPath('data.0.penanggung_jawab_pemantauan', 'Irban Khusus');
    }
}
