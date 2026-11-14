<?php

declare(strict_types=1);

namespace Tests\Feature\Risiko;

use App\Models\AuditLog;
use App\Models\Opd;
use App\Models\Perencanaan\PeriodePenilaian;
use App\Models\Risiko\AnalisisRisiko;
use App\Models\Risiko\IdentifikasiRisikoOpd;
use App\Models\Risiko\IdentifikasiRisikoOpdItem;
use App\Models\Risiko\TindakPengendalianRisiko;
use App\Models\User;
use Illuminate\Foundation\Testing\DatabaseMigrations;
use Illuminate\Foundation\Testing\RefreshDatabaseState;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class TindakPengendalianAuditTest extends TestCase
{
    use DatabaseMigrations;

    public function runDatabaseMigrations(): void
    {
        $this->refreshTestDatabase();
        $this->beforeApplicationDestroyed(function () {
            RefreshDatabaseState::$migrated = false;
        });
    }

    public function test_changes_to_shared_plan_and_treatment_record_are_audited_after_commit(): void
    {
        $user = User::factory()->create();
        $this->actingAs($user);
        $opd = Opd::create(['nama' => 'Dinas', 'kode' => 'DIN', 'kategori' => 'Dinas', 'is_active' => true]);
        $periode = PeriodePenilaian::create(['nama_periode' => '2026', 'tahun_penilaian' => '2026', 'tahun_mulai' => 2026, 'tahun_akhir' => 2030, 'tanggal_mulai' => '2026-01-01', 'tanggal_akhir' => '2030-12-31', 'status' => 'aktif']);
        $dokumen = IdentifikasiRisikoOpd::create(['opd_id' => $opd->id, 'periode_penilaian_id' => $periode->id]);
        $item = IdentifikasiRisikoOpdItem::create(['identifikasi_risiko_opd_id' => $dokumen->id, 'kategori_risiko' => 'Risiko Strategis', 'pernyataan_risiko' => 'Risiko', 'kode_risiko' => 'RSO.1']);
        $analysis = AnalisisRisiko::create(['risiko_opd_item_id' => $item->id, 'rencana_tindak' => 'Rencana lama']);
        $treatment = TindakPengendalianRisiko::create(['analisis_risiko_id' => $analysis->id, 'celah_pengendalian' => 'Celah lama']);
        DB::transaction(function () use ($analysis, $treatment) {
            $analysis->update(['rencana_tindak' => 'Rencana baru']);
            $treatment->update(['celah_pengendalian' => 'Celah baru']);
        });
        $analysisLog = AuditLog::where('auditable_type', AnalisisRisiko::class)->where('auditable_id', $analysis->id)->where('action', 'ANALISIS_RISIKO_UPDATED')->firstOrFail();
        $treatmentLog = AuditLog::where('auditable_type', TindakPengendalianRisiko::class)->where('auditable_id', $treatment->id)->where('action', 'TINDAK_PENGENDALIAN_RISIKO_UPDATED')->firstOrFail();
        $this->assertSame($user->id, $analysisLog->user_id);
        $this->assertSame('Rencana lama', $analysisLog->context['changes']['rencana_tindak']['old']);
        $this->assertSame('Rencana baru', $analysisLog->context['changes']['rencana_tindak']['new']);
        $this->assertSame($user->id, $treatmentLog->user_id);
        $this->assertSame('Celah lama', $treatmentLog->context['changes']['celah_pengendalian']['old']);
        $this->assertSame('Celah baru', $treatmentLog->context['changes']['celah_pengendalian']['new']);
    }
}
