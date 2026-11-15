<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Spatie\Permission\PermissionRegistrar;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // 1. Rename existing penugasan_auditor permissions to penugasan_evaluator
        $mapping = [
            'penugasan_auditor.view' => [
                'name' => 'penugasan_evaluator.view',
                'description' => 'Melihat daftar penugasan evaluator pengawas ke perangkat daerah (OPD)',
            ],
            'penugasan_auditor.create' => [
                'name' => 'penugasan_evaluator.create',
                'description' => 'Menetapkan penugasan evaluator pengawas ke satu atau beberapa OPD',
            ],
            'penugasan_auditor.edit' => [
                'name' => 'penugasan_evaluator.edit',
                'description' => 'Mengubah penugasan dan cakupan OPD binaan evaluator',
            ],
            'penugasan_auditor.delete' => [
                'name' => 'penugasan_evaluator.delete',
                'description' => 'Mencabut penugasan evaluator dari suatu OPD',
            ],
        ];

        foreach ($mapping as $oldName => $info) {
            DB::table('permissions')->where('name', $oldName)->update([
                'name' => $info['name'],
                'group' => 'Penugasan Evaluator',
                'description' => $info['description'],
                'updated_at' => now(),
            ]);
        }

        // Rename any residual group name
        DB::table('permissions')->where('group', 'Penugasan Auditor')->update([
            'group' => 'Penugasan Evaluator',
            'updated_at' => now(),
        ]);

        // Update description for penilaian_risiko.submit
        DB::table('permissions')->where('name', 'penilaian_risiko.submit')->update([
            'description' => 'Mengajukan lembar kerja pengelolaan risiko OPD untuk ditinjau oleh Evaluator Pengawas',
            'updated_at' => now(),
        ]);

        // 2. Clear Spatie permission cache
        app(PermissionRegistrar::class)->forgetCachedPermissions();
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        $mapping = [
            'penugasan_evaluator.view' => [
                'name' => 'penugasan_auditor.view',
                'description' => 'Melihat daftar penugasan auditor pengawas ke perangkat daerah (OPD)',
            ],
            'penugasan_evaluator.create' => [
                'name' => 'penugasan_auditor.create',
                'description' => 'Menetapkan penugasan auditor pengawas ke satu atau beberapa OPD',
            ],
            'penugasan_evaluator.edit' => [
                'name' => 'penugasan_auditor.edit',
                'description' => 'Mengubah penugasan dan cakupan OPD binaan auditor',
            ],
            'penugasan_evaluator.delete' => [
                'name' => 'penugasan_auditor.delete',
                'description' => 'Mencabut penugasan auditor dari suatu OPD',
            ],
        ];

        foreach ($mapping as $newName => $info) {
            DB::table('permissions')->where('name', $newName)->update([
                'name' => $info['name'],
                'group' => 'Penugasan Auditor',
                'description' => $info['description'],
                'updated_at' => now(),
            ]);
        }

        DB::table('permissions')->where('group', 'Penugasan Evaluator')->update([
            'group' => 'Penugasan Auditor',
            'updated_at' => now(),
        ]);

        app(PermissionRegistrar::class)->forgetCachedPermissions();
    }
};
