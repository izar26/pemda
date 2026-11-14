<?php

declare(strict_types=1);

namespace Tests\Feature\Risiko;

use App\Models\AuditLog;
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
use App\Models\Risiko\IdentifikasiRisikoOpdOperasional;
use App\Models\Risiko\IdentifikasiRisikoOpdOperasionalItem;
use App\Models\Risiko\IdentifikasiRisikoPemda;
use App\Models\Risiko\IdentifikasiRisikoPemdaItem;
use App\Models\Risiko\KonteksOperasional;
use App\Models\Risiko\KonteksOperasionalItem;
use App\Models\Risiko\KonteksPenilaian;
use App\Models\Risiko\RootCauseAnalysis;
use App\Models\User;
use Database\Seeders\RbacSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class RisikoSecurityAndIntegrationAuditTest extends TestCase
{
    use RefreshDatabase;

    protected PeriodePenilaian $activePeriode;

    protected Opd $opdA;

    protected Opd $opdB;

    protected User $userOpdA;

    protected User $userOpdB;

    protected User $auditorUser;

    protected MasterUrusanPemerintahan $urusan;

    protected MasterPemilikRisiko $pemilik;

    protected IdentifikasiRisikoPemda $doc3aA;

    protected IdentifikasiRisikoPemda $doc3aB;

    protected IdentifikasiRisikoOpd $doc3bA;

    protected IdentifikasiRisikoOpd $doc3bB;

    protected IdentifikasiRisikoOpdOperasional $doc3cA;

    protected IdentifikasiRisikoOpdOperasional $doc3cB;

    protected KonteksOperasionalItem $subKegiatanA;

    protected KonteksOperasionalItem $subKegiatanB;

    protected SasaranPenilaian $sasaranA;

    protected IndikatorPenilaian $indikatorA;

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

        $this->opdA = Opd::create(['nama' => 'Dinas Pendidikan', 'kode' => 'DISDIK', 'singkatan' => 'DISDIK', 'kategori' => 'Dinas', 'is_active' => true]);
        $this->opdB = Opd::create(['nama' => 'Dinas Kesehatan', 'kode' => 'DINKES', 'singkatan' => 'DINKES', 'kategori' => 'Dinas', 'is_active' => true]);

        $this->auditorUser = User::factory()->create(['name' => 'Auditor Utama']);
        $this->auditorUser->assignRole('Auditor');

        AuditorOpdAssignment::create(['opd_id' => $this->opdA->id, 'auditor_id' => $this->auditorUser->id, 'is_active' => true]);
        AuditorOpdAssignment::create(['opd_id' => $this->opdB->id, 'auditor_id' => $this->auditorUser->id, 'is_active' => true]);

        $this->userOpdA = User::factory()->create(['name' => 'Operator Disdik', 'opd_id' => $this->opdA->id]);
        $this->userOpdA->assignRole('OPD');

        $this->userOpdB = User::factory()->create(['name' => 'Operator Dinkes', 'opd_id' => $this->opdB->id]);
        $this->userOpdB->assignRole('OPD');

        $this->urusan = MasterUrusanPemerintahan::create(['kode' => '1.01', 'nama' => 'Pendidikan', 'urutan' => 1, 'is_active' => true]);
        $this->pemilik = MasterPemilikRisiko::create(['nama' => 'Kepala Dinas', 'urutan' => 1, 'is_active' => true]);

        // Form 2B for OPD A
        $sumberData = MasterSumberData::create(['nama' => 'Renstra Disdik', 'is_active' => true]);
        $tujuanA = TujuanPenilaian::create(['opd_id' => $this->opdA->id, 'periode_penilaian_id' => $this->activePeriode->id, 'tujuan' => 'Tujuan Disdik', 'urutan' => 1]);
        $this->sasaranA = SasaranPenilaian::create(['tujuan_penilaian_id' => $tujuanA->id, 'opd_id' => $this->opdA->id, 'periode_penilaian_id' => $this->activePeriode->id, 'sasaran' => 'Sasaran Disdik', 'kode_sasaran' => 'S.01', 'urutan' => 1]);
        $this->indikatorA = IndikatorPenilaian::create(['tujuan_penilaian_id' => $tujuanA->id, 'sasaran_penilaian_id' => $this->sasaranA->id, 'opd_id' => $this->opdA->id, 'periode_penilaian_id' => $this->activePeriode->id, 'indikator' => 'Indikator Disdik', 'kode_indikator' => 'I.01', 'urutan' => 1]);

        $konteks2bA = KonteksPenilaian::create([
            'opd_id' => $this->opdA->id,
            'periode_penilaian_id' => $this->activePeriode->id,
            'sumber_data_id' => $sumberData->id,
            'tujuan_penilaian_id' => $tujuanA->id,
            'status' => 'final',
        ]);
        $konteks2bA->sasarans()->attach($this->sasaranA->id);
        $konteks2bA->indikators()->attach($this->indikatorA->id);

        // Form 2C for OPD A
        $konteks2cA = KonteksOperasional::create([
            'opd_id' => $this->opdA->id,
            'periode_penilaian_id' => $this->activePeriode->id,
            'sumber_data_id' => $sumberData->id,
            'konteks_penilaian_id' => $konteks2bA->id,
        ]);
        $progA = KonteksOperasionalItem::create(['konteks_operasional_id' => $konteks2cA->id, 'kode' => 'A', 'jenis' => 'program', 'nama' => 'Program Disdik', 'urutan' => 1]);
        $kegA = KonteksOperasionalItem::create(['konteks_operasional_id' => $konteks2cA->id, 'parent_id' => $progA->id, 'kode' => 'A.1', 'jenis' => 'kegiatan', 'nama' => 'Kegiatan Disdik', 'urutan' => 1]);
        $this->subKegiatanA = KonteksOperasionalItem::create(['konteks_operasional_id' => $konteks2cA->id, 'parent_id' => $kegA->id, 'kode' => 'A.1.1', 'jenis' => 'sub_kegiatan', 'nama' => 'Sub Disdik', 'urutan' => 1]);

        // Form 2C for OPD B
        $konteks2cB = KonteksOperasional::create([
            'opd_id' => $this->opdB->id,
            'periode_penilaian_id' => $this->activePeriode->id,
            'sumber_data_id' => $sumberData->id,
        ]);
        $progB = KonteksOperasionalItem::create(['konteks_operasional_id' => $konteks2cB->id, 'kode' => 'A', 'jenis' => 'program', 'nama' => 'Program Dinkes', 'urutan' => 1]);
        $kegB = KonteksOperasionalItem::create(['konteks_operasional_id' => $konteks2cB->id, 'parent_id' => $progB->id, 'kode' => 'A.1', 'jenis' => 'kegiatan', 'nama' => 'Kegiatan Dinkes', 'urutan' => 1]);
        $this->subKegiatanB = KonteksOperasionalItem::create(['konteks_operasional_id' => $konteks2cB->id, 'parent_id' => $kegB->id, 'kode' => 'A.1.1', 'jenis' => 'sub_kegiatan', 'nama' => 'Sub Dinkes', 'urutan' => 1]);

        // Documents for OPD A
        $this->doc3aA = IdentifikasiRisikoPemda::create(['opd_id' => $this->opdA->id, 'periode_penilaian_id' => $this->activePeriode->id, 'master_urusan_pemerintahan_id' => $this->urusan->id]);
        $this->doc3bA = IdentifikasiRisikoOpd::create(['opd_id' => $this->opdA->id, 'periode_penilaian_id' => $this->activePeriode->id, 'master_urusan_pemerintahan_id' => $this->urusan->id]);
        $this->doc3cA = IdentifikasiRisikoOpdOperasional::create(['opd_id' => $this->opdA->id, 'periode_penilaian_id' => $this->activePeriode->id, 'master_urusan_pemerintahan_id' => $this->urusan->id]);

        // Documents for OPD B
        $this->doc3aB = IdentifikasiRisikoPemda::create(['opd_id' => $this->opdB->id, 'periode_penilaian_id' => $this->activePeriode->id, 'master_urusan_pemerintahan_id' => $this->urusan->id]);
        $this->doc3bB = IdentifikasiRisikoOpd::create(['opd_id' => $this->opdB->id, 'periode_penilaian_id' => $this->activePeriode->id, 'master_urusan_pemerintahan_id' => $this->urusan->id]);
        $this->doc3cB = IdentifikasiRisikoOpdOperasional::create(['opd_id' => $this->opdB->id, 'periode_penilaian_id' => $this->activePeriode->id, 'master_urusan_pemerintahan_id' => $this->urusan->id]);
    }

    public function test_opd_a_cannot_mutate_opd_b_form_3a_items(): void
    {
        $itemB = IdentifikasiRisikoPemdaItem::create([
            'identifikasi_risiko_pemda_id' => $this->doc3aB->id,
            'kategori_risiko' => 'Risiko Strategis',
            'pernyataan_risiko' => 'Risiko Dinkes B',
            'kode_risiko' => 'RSP.26.RS.001',
            'pemilik_risiko' => 'Kepala Dinas',
            'sifat_risiko' => 'C',
            'urutan' => 1,
            'nomor_urut' => 1,
        ]);

        Sanctum::actingAs($this->userOpdA);

        // Store attempt on OPD B document
        $this->postJson("/api/risiko/identifikasi-pemda/{$this->doc3aB->id}/items", [
            'kategori_risiko' => 'Risiko Strategis',
            'pernyataan_risiko' => 'Malicious Insert by Disdik',
            'sifat_risiko' => 'C',
        ])->assertForbidden();

        // Update attempt on OPD B item
        $this->putJson("/api/risiko/identifikasi-pemda/{$this->doc3aB->id}/items/{$itemB->id}", [
            'kategori_risiko' => 'Risiko Strategis',
            'pernyataan_risiko' => 'Malicious Update by Disdik',
            'sifat_risiko' => 'C',
        ])->assertForbidden();

        // Delete attempt on OPD B item
        $this->deleteJson("/api/risiko/identifikasi-pemda/{$this->doc3aB->id}/items/{$itemB->id}")
            ->assertForbidden();

        // Reorder attempt on OPD B
        $this->postJson("/api/risiko/identifikasi-pemda/{$this->doc3aB->id}/items/reorder", [
            'item_ids' => [$itemB->id],
        ])->assertForbidden();
    }

    public function test_opd_a_cannot_mutate_opd_b_form_3b_items(): void
    {
        $itemB = IdentifikasiRisikoOpdItem::create([
            'identifikasi_risiko_opd_id' => $this->doc3bB->id,
            'kategori_risiko' => 'Risiko Strategis',
            'pernyataan_risiko' => 'Risiko Strategis Dinkes',
            'kode_risiko' => 'RSO.26.DINKES.RS.001',
            'pemilik_risiko' => 'Kepala Dinas',
            'sifat_risiko' => 'C',
            'urutan' => 1,
            'nomor_urut' => 1,
        ]);

        Sanctum::actingAs($this->userOpdA);

        $this->postJson("/api/risiko/identifikasi-opd/{$this->doc3bB->id}/items", [
            'sasaran_penilaian_id' => $this->sasaranA->id,
            'indikator_penilaian_id' => $this->indikatorA->id,
            'kategori_risiko' => 'Risiko Strategis',
            'pernyataan_risiko' => 'Malicious 3B Insert',
            'pemilik_risiko' => 'Kepala Dinas',
            'sifat_risiko' => 'C',
        ])->assertForbidden();

        $this->putJson("/api/risiko/identifikasi-opd/{$this->doc3bB->id}/items/{$itemB->id}", [
            'sasaran_penilaian_id' => $this->sasaranA->id,
            'indikator_penilaian_id' => $this->indikatorA->id,
            'kategori_risiko' => 'Risiko Strategis',
            'pernyataan_risiko' => 'Malicious 3B Update',
            'pemilik_risiko' => 'Kepala Dinas',
            'sifat_risiko' => 'C',
        ])->assertForbidden();

        $this->deleteJson("/api/risiko/identifikasi-opd/{$this->doc3bB->id}/items/{$itemB->id}")
            ->assertForbidden();

        $this->postJson("/api/risiko/identifikasi-opd/{$this->doc3bB->id}/items/reorder", [
            'item_ids' => [$itemB->id],
        ])->assertForbidden();
    }

    public function test_opd_a_cannot_mutate_opd_b_form_3c_items(): void
    {
        $itemB = IdentifikasiRisikoOpdOperasionalItem::create([
            'identifikasi_risiko_opd_operasional_id' => $this->doc3cB->id,
            'operasional_sub_kegiatan_id' => $this->subKegiatanB->id,
            'kategori_risiko' => 'Risiko Operasional',
            'pernyataan_risiko' => 'Risiko Operasional Dinkes',
            'kode_risiko' => 'RO.26.DINKES.RO.001',
            'pemilik_risiko' => 'Kepala Dinas',
            'sifat_risiko' => 'C',
            'urutan' => 1,
            'nomor_urut' => 1,
        ]);

        Sanctum::actingAs($this->userOpdA);

        $this->postJson("/api/risiko/identifikasi-operasional/{$this->doc3cB->id}/items", [
            'operasional_sub_kegiatan_id' => $this->subKegiatanA->id,
            'kategori_risiko' => 'Risiko Operasional',
            'pernyataan_risiko' => 'Malicious 3C Insert',
            'pemilik_risiko' => 'Kepala Dinas',
            'sifat_risiko' => 'C',
        ])->assertForbidden();

        $this->putJson("/api/risiko/identifikasi-operasional/{$this->doc3cB->id}/items/{$itemB->id}", [
            'operasional_sub_kegiatan_id' => $this->subKegiatanA->id,
            'kategori_risiko' => 'Risiko Operasional',
            'pernyataan_risiko' => 'Malicious 3C Update',
            'pemilik_risiko' => 'Kepala Dinas',
            'sifat_risiko' => 'C',
        ])->assertForbidden();

        $this->deleteJson("/api/risiko/identifikasi-operasional/{$this->doc3cB->id}/items/{$itemB->id}")
            ->assertForbidden();

        $this->postJson("/api/risiko/identifikasi-operasional/{$this->doc3cB->id}/items/reorder", [
            'item_ids' => [$itemB->id],
        ])->assertForbidden();
    }

    public function test_opd_a_cannot_update_rca_of_opd_b(): void
    {
        $itemB = IdentifikasiRisikoOpdItem::create([
            'identifikasi_risiko_opd_id' => $this->doc3bB->id,
            'kategori_risiko' => 'Risiko Strategis',
            'pernyataan_risiko' => 'Risiko Dinkes',
            'kode_risiko' => 'RSO.26.DINKES.RS.001',
            'pemilik_risiko' => 'Kepala Dinas',
            'sifat_risiko' => 'C',
            'urutan' => 1,
            'nomor_urut' => 1,
        ]);

        $rcaB = RootCauseAnalysis::create([
            'source_type' => '3b',
            'identifikasi_risiko_opd_item_id' => $itemB->id,
            'why_1' => 'Initial why',
        ]);

        Sanctum::actingAs($this->userOpdA);

        $this->putJson("/api/risiko/rca/{$rcaB->id}", [
            'why_1' => 'Hacked by Disdik',
            'jenis_penyebab' => 'Method',
        ])->assertForbidden();
    }

    public function test_rca_show_endpoint_supports_3a_3b_and_3c_polymorphically(): void
    {
        $item3a = IdentifikasiRisikoPemdaItem::create([
            'identifikasi_risiko_pemda_id' => $this->doc3aA->id,
            'kategori_risiko' => 'Risiko Strategis',
            'pernyataan_risiko' => 'Risiko 3A Pemda',
            'kode_risiko' => 'RSP.26.RS.001',
            'pemilik_risiko' => 'Kepala Dinas',
            'sifat_risiko' => 'C',
            'urutan' => 1,
            'nomor_urut' => 1,
        ]);

        $item3b = IdentifikasiRisikoOpdItem::create([
            'identifikasi_risiko_opd_id' => $this->doc3bA->id,
            'kategori_risiko' => 'Risiko Strategis',
            'pernyataan_risiko' => 'Risiko 3B OPD',
            'kode_risiko' => 'RSO.26.DISDIK.RS.001',
            'pemilik_risiko' => 'Kepala Dinas',
            'sifat_risiko' => 'C',
            'urutan' => 1,
            'nomor_urut' => 1,
        ]);

        $item3c = IdentifikasiRisikoOpdOperasionalItem::create([
            'identifikasi_risiko_opd_operasional_id' => $this->doc3cA->id,
            'operasional_sub_kegiatan_id' => $this->subKegiatanA->id,
            'kategori_risiko' => 'Risiko Operasional',
            'pernyataan_risiko' => 'Risiko 3C Operasional',
            'kode_risiko' => 'RO.26.DISDIK.RO.001',
            'pemilik_risiko' => 'Kepala Dinas',
            'sifat_risiko' => 'C',
            'urutan' => 1,
            'nomor_urut' => 1,
        ]);

        Sanctum::actingAs($this->userOpdA);

        // Fetch RCA for 3A item
        $res3a = $this->getJson("/api/risiko/rca/item/{$item3a->id}")->assertOk();
        $this->assertSame('3a', $res3a->json('data.source_type'));

        // Fetch RCA for 3B item
        $res3b = $this->getJson("/api/risiko/rca/item/{$item3b->id}")->assertOk();
        $this->assertSame('3b', $res3b->json('data.source_type'));

        // Fetch RCA for 3C item
        $res3c = $this->getJson("/api/risiko/rca/item/{$item3c->id}")->assertOk();
        $this->assertSame('3c', $res3c->json('data.source_type'));
    }

    public function test_reorder_triggers_eloquent_audit_logging(): void
    {
        $item1 = IdentifikasiRisikoOpdItem::create([
            'identifikasi_risiko_opd_id' => $this->doc3bA->id,
            'kategori_risiko' => 'Risiko Strategis',
            'pernyataan_risiko' => 'Risiko 1',
            'kode_risiko' => 'RSO.26.DISDIK.RS.001',
            'pemilik_risiko' => 'Kepala Dinas',
            'sifat_risiko' => 'C',
            'urutan' => 1,
            'nomor_urut' => 1,
        ]);

        $item2 = IdentifikasiRisikoOpdItem::create([
            'identifikasi_risiko_opd_id' => $this->doc3bA->id,
            'kategori_risiko' => 'Risiko Strategis',
            'pernyataan_risiko' => 'Risiko 2',
            'kode_risiko' => 'RSO.26.DISDIK.RS.002',
            'pemilik_risiko' => 'Kepala Dinas',
            'sifat_risiko' => 'C',
            'urutan' => 2,
            'nomor_urut' => 2,
        ]);

        Sanctum::actingAs($this->userOpdA);

        $auditCountBefore = AuditLog::where('auditable_type', IdentifikasiRisikoOpdItem::class)->count();

        // Swap order: item2 first, then item1
        $this->postJson("/api/risiko/identifikasi-opd/{$this->doc3bA->id}/items/reorder", [
            'item_ids' => [$item2->id, $item1->id],
        ])->assertOk();

        $item1->refresh();
        $item2->refresh();

        $this->assertSame(1, $item2->urutan);
        $this->assertSame(2, $item1->urutan);

        $auditCountAfter = AuditLog::where('auditable_type', IdentifikasiRisikoOpdItem::class)->count();
        $this->assertGreaterThan($auditCountBefore, $auditCountAfter);
    }

    public function test_reorder_rejects_foreign_document_item_ids(): void
    {
        $itemA = IdentifikasiRisikoOpdItem::create([
            'identifikasi_risiko_opd_id' => $this->doc3bA->id,
            'kategori_risiko' => 'Risiko Strategis',
            'pernyataan_risiko' => 'Item Disdik',
            'kode_risiko' => 'RSO.26.DISDIK.RS.001',
            'pemilik_risiko' => 'Kepala Dinas',
            'sifat_risiko' => 'C',
            'urutan' => 1,
            'nomor_urut' => 1,
        ]);

        $itemB = IdentifikasiRisikoOpdItem::create([
            'identifikasi_risiko_opd_id' => $this->doc3bB->id,
            'kategori_risiko' => 'Risiko Strategis',
            'pernyataan_risiko' => 'Item Dinkes',
            'kode_risiko' => 'RSO.26.DINKES.RS.001',
            'pemilik_risiko' => 'Kepala Dinas',
            'sifat_risiko' => 'C',
            'urutan' => 1,
            'nomor_urut' => 1,
        ]);

        Sanctum::actingAs($this->userOpdA);

        // Attempting to pass itemB into doc3bA reorder
        $this->postJson("/api/risiko/identifikasi-opd/{$this->doc3bA->id}/items/reorder", [
            'item_ids' => [$itemB->id],
        ])->assertUnprocessable()
            ->assertJsonValidationErrors(['item_ids.0']);
    }
}
