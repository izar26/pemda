<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // 1. Create master / siklus periode perencanaans table
        Schema::create('periode_perencanaans', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('nama', 150); // e.g. "RPJMD 2026 - 2030"
            $table->integer('tahun_mulai')->index();
            $table->integer('tahun_selesai')->index();
            $table->integer('durasi_tahun')->default(5);
            $table->enum('status', ['active', 'inactive', 'archived'])->default('active')->index();
            $table->text('keterangan')->nullable();
            $table->timestamps();
        });

        // 2. Add foreign key relation to periode_penilaians (child evaluation years)
        Schema::table('periode_penilaians', function (Blueprint $table) {
            $table->foreignUuid('periode_perencanaan_id')
                ->nullable()
                ->after('id')
                ->constrained('periode_perencanaans')
                ->cascadeOnDelete();
        });

        // 3. Backfill data from existing records in periode_penilaians
        $existingRecords = DB::table('periode_penilaians')->get();
        $processedCycles = [];

        foreach ($existingRecords as $record) {
            $periodeStr = $record->periode ?? '';
            $startYear = null;
            $endYear = null;

            if (preg_match('#(\d{4})\s*[-–/]\s*(\d{4})#', $periodeStr, $matches)) {
                $startYear = (int) $matches[1];
                $endYear = (int) $matches[2];
            } else {
                $startYear = (int) ($record->tahun ?: 2026);
                $endYear = $startYear + 4;
            }

            $cycleKey = "{$startYear}-{$endYear}";

            if (!isset($processedCycles[$cycleKey])) {
                $parentUuid = (string) Str::uuid();
                DB::table('periode_perencanaans')->insert([
                    'id' => $parentUuid,
                    'nama' => "RPJMD {$startYear} - {$endYear}",
                    'tahun_mulai' => $startYear,
                    'tahun_selesai' => $endYear,
                    'durasi_tahun' => ($endYear - $startYear + 1),
                    'status' => $record->status ?? 'active',
                    'keterangan' => $record->catatan ?? null,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
                $processedCycles[$cycleKey] = [
                    'id' => $parentUuid,
                    'start' => $startYear,
                    'end' => $endYear,
                ];
            }

            $parentId = $processedCycles[$cycleKey]['id'];
            DB::table('periode_penilaians')
                ->where('id', $record->id)
                ->update(['periode_perencanaan_id' => $parentId]);
        }

        // 4. Ensure complete evaluation years (5 years) exist for seeded cycles
        foreach ($processedCycles as $cycle) {
            $parentId = $cycle['id'];
            for ($yr = $cycle['start']; $yr <= $cycle['end']; $yr++) {
                $exists = DB::table('periode_penilaians')
                    ->where('periode_perencanaan_id', $parentId)
                    ->where('tahun', $yr)
                    ->exists();

                if (!$exists) {
                    DB::table('periode_penilaians')->insert([
                        'id' => (string) Str::uuid(),
                        'periode_perencanaan_id' => $parentId,
                        'periode' => "{$cycle['start']}-{$cycle['end']}",
                        'tahun' => $yr,
                        'tanggal_mulai' => "{$yr}-01-01",
                        'tanggal_berakhir' => "{$yr}-12-31",
                        'status' => 'inactive',
                        'catatan' => null,
                        'created_at' => now(),
                        'updated_at' => now(),
                    ]);
                }
            }
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::hasColumn('periode_penilaians', 'periode_perencanaan_id')) {
            Schema::table('periode_penilaians', function (Blueprint $table) {
                $table->dropForeign(['periode_perencanaan_id']);
                $table->dropColumn('periode_perencanaan_id');
            });
        }

        Schema::dropIfExists('periode_perencanaans');
    }
};
