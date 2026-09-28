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
        Schema::table('users', function (Blueprint $table) {
            $table->string('nip', 30)->nullable()->unique()->after('email');
            $table->string('phone', 20)->nullable()->after('nip');
            $table->string('role', 30)->default('staff')->after('phone');
            $table->string('status', 20)->default('active')->after('role');
            
            // 2FA TOTP Fields
            $table->text('two_factor_secret')->nullable()->after('password');
            $table->text('two_factor_recovery_codes')->nullable()->after('two_factor_secret');
            $table->timestamp('two_factor_confirmed_at')->nullable()->after('two_factor_recovery_codes');
            
            // Security & Lockout Fields
            $table->unsignedInteger('failed_login_attempts')->default(0)->after('two_factor_confirmed_at');
            $table->timestamp('lockout_until')->nullable()->after('failed_login_attempts');
            $table->timestamp('last_login_at')->nullable()->after('lockout_until');
            $table->string('last_login_ip', 45)->nullable()->after('last_login_at');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn([
                'nip',
                'phone',
                'role',
                'status',
                'two_factor_secret',
                'two_factor_recovery_codes',
                'two_factor_confirmed_at',
                'failed_login_attempts',
                'lockout_until',
                'last_login_at',
                'last_login_ip',
            ]);
        });
    }
};
