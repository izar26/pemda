<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Services\Audit\AuditArchiveService;
use Illuminate\Console\Command;

class AuditArchivePurgeCommand extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'audit:archive-purge
                            {--days=90 : Umur minimum hari log aktif yang akan dipindahkan ke arsip permanen}
                            {--cutoff= : Tanggal batas cutoff kustom (format YYYY-MM-DD)}
                            {--force : Jalankan pembersihan tanpa konfirmasi interaktif}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Pindahkan log audit aktif yang sudah melewati batas retensi ke Arsip Permanen dan bersihkan tabel aktif';

    /**
     * Execute the console command.
     */
    public function handle(AuditArchiveService $archiveService): int
    {
        $days = (int) $this->option('days');
        $cutoff = $this->option('cutoff');
        $force = (bool) $this->option('force');

        $this->info('=== PENGARSIPAN & PEMBERSIHAN LOG AUDIT (Arsip Permanen) ===');
        $this->line("Batas Retensi : > {$days} hari" . ($cutoff ? " (Cutoff: {$cutoff})" : ''));

        $statsBefore = $archiveService->getStats();
        $this->line("Total Log Aktif Saat Ini : {$statsBefore['active_logs_count']}");
        $this->line("Total Log di Arsip Permanen : {$statsBefore['archived_logs_count']}");

        if (!$force && !$this->confirm('Apakah Anda yakin ingin memindahkan log audit lama ke arsip permanen dan membersihkannya dari tabel aktif?', true)) {
            $this->warn('Operasi dibatalkan.');
            return self::SUCCESS;
        }

        $this->info('Memproses pemindahan data ke arsip permanen...');

        $result = $archiveService->archiveAndPurge(
            daysOlderThan: $days,
            archivedBy: null,
            cutoffDate: $cutoff
        );

        $archivedCount = $result['archived_count'];

        $this->newLine();
        $this->info("✓ Selesai: {$archivedCount} catatan berhasil diamankan ke Arsip Permanen dan dibersihkan dari tabel aktif.");

        $statsAfter = $archiveService->getStats();
        $this->line("Sisa Log Aktif : {$statsAfter['active_logs_count']}");
        $this->line("Total di Arsip Permanen : {$statsAfter['archived_logs_count']}");

        return self::SUCCESS;
    }
}
