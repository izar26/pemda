<?php

declare(strict_types=1);

use App\Models\Opd;
use App\Models\Permission;
use App\Models\Role;
use App\Models\User;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Spatie\Permission\PermissionRegistrar;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // 1. Clean up duplicate non-null phones before adding unique index
        $duplicatePhones = DB::table('users')
            ->whereNotNull('phone')
            ->select('phone')
            ->groupBy('phone')
            ->havingRaw('COUNT(*) > 1')
            ->pluck('phone');

        foreach ($duplicatePhones as $dupPhone) {
            $ids = DB::table('users')
                ->where('phone', $dupPhone)
                ->orderBy('created_at', 'asc')
                ->pluck('id');

            // Keep the first one, set subsequent duplicates to null
            foreach ($ids->slice(1) as $id) {
                DB::table('users')->where('id', $id)->update(['phone' => null]);
            }
        }

        // 2. Normalize existing jabatan to 'Kepala OPD' or 'Pegawai'
        DB::table('users')
            ->whereNotNull('jabatan')
            ->whereNotIn('jabatan', ['Kepala OPD', 'Pegawai'])
            ->update(['jabatan' => 'Pegawai']);

        // 3. Alter users table: make password, role, status nullable and phone unique
        Schema::table('users', function (Blueprint $table) {
            $table->string('password')->nullable()->change();
            $table->string('role', 30)->nullable()->default(null)->change();
            $table->string('status', 20)->nullable()->default(null)->change();
            $table->unique('phone', 'users_phone_unique');
        });

        // 4. Sync opds.kepala from existing Kepala OPD employees if any
        if (Schema::hasTable('opds')) {
            $kepalaUsers = DB::table('users')
                ->whereNotNull('opd_id')
                ->where('jabatan', 'Kepala OPD')
                ->get(['opd_id', 'name']);

            foreach ($kepalaUsers as $k) {
                DB::table('opds')->where('id', $k->opd_id)->update(['kepala' => $k->name]);
            }
        }

        // 5. Upsert Pegawai & Users permissions if permissions table already seeded
        if (Schema::hasTable('permissions') && DB::table('permissions')->count() > 0) {
            app()[PermissionRegistrar::class]->forgetCachedPermissions();

            $pegawaiPermissions = [
                ['name' => 'pegawai.view', 'group' => 'Manajemen Pegawai', 'description' => 'Melihat direktori dan biodata kepegawaian ASN per OPD'],
                ['name' => 'pegawai.create', 'group' => 'Manajemen Pegawai', 'description' => 'Menambahkan data pegawai baru ke instansi OPD'],
                ['name' => 'pegawai.edit', 'group' => 'Manajemen Pegawai', 'description' => 'Mengubah biodata, mutasi OPD, dan jabatan Kepala OPD / Pegawai'],
                ['name' => 'pegawai.delete', 'group' => 'Manajemen Pegawai', 'description' => 'Menghapus data pegawai dari sistem'],
            ];

            $userPermissions = [
                ['name' => 'users.view', 'group' => 'Manajemen Users', 'description' => 'Melihat daftar akun pengguna (users) dan status keamanan 2FA'],
                ['name' => 'users.create', 'group' => 'Manajemen Users', 'description' => 'Memberikan akun login dan menetapkan peran (role) kepada pegawai'],
                ['name' => 'users.edit', 'group' => 'Manajemen Users', 'description' => 'Mengubah peran (role), kata sandi, dan status aktif/nonaktif akun'],
                ['name' => 'users.delete', 'group' => 'Manajemen Users', 'description' => 'Mencabut akun login pengguna dari sistem'],
                ['name' => 'users.reset_2fa', 'group' => 'Manajemen Users', 'description' => 'Mereset Google Authenticator (2FA) akun pengguna'],
            ];

            foreach (array_merge($pegawaiPermissions, $userPermissions) as $perm) {
                Permission::updateOrCreate(
                    ['name' => $perm['name'], 'guard_name' => 'web'],
                    ['group' => $perm['group'], 'description' => $perm['description']]
                );
            }

            $superadmin = Role::where('name', 'Superadmin')->first();
            if ($superadmin) {
                $superadmin->givePermissionTo(['pegawai.view', 'pegawai.create', 'pegawai.edit', 'pegawai.delete']);
            }

            $adminOffice = Role::where('name', 'Admin Office')->first();
            if ($adminOffice) {
                $adminOffice->givePermissionTo(['pegawai.view', 'pegawai.create', 'pegawai.edit', 'pegawai.delete']);
            }

            app()[PermissionRegistrar::class]->forgetCachedPermissions();
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropUnique('users_phone_unique');
        });
    }
};
