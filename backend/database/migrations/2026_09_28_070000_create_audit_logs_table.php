<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('audit_logs', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('user_name', 100)->nullable();
            $table->string('user_nip', 30)->nullable();
            $table->string('user_email', 100)->nullable();
            $table->string('action', 50)->index(); // LOGIN, LOGOUT, USER_CREATE, USER_UPDATE, USER_DELETE, ROLE_CREATE, ROLE_UPDATE, ROLE_DELETE, 2FA_RESET, SETTINGS_UPDATE
            $table->string('module', 50)->index(); // Autentikasi, Pegawai, Peran & Izin, Pengaturan Sistem
            $table->text('description');
            $table->string('ip_address', 45)->nullable();
            $table->text('user_agent')->nullable();
            $table->json('context')->nullable();
            $table->timestamp('created_at')->useCurrent()->index();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('audit_logs');
    }
};
