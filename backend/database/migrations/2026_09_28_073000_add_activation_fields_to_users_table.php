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
            $table->string('activation_token', 100)->nullable()->unique()->after('status');
            $table->timestamp('activation_token_expires_at')->nullable()->after('activation_token');
            $table->timestamp('invitation_sent_at')->nullable()->after('activation_token_expires_at');
            $table->text('invitation_notes')->nullable()->after('invitation_sent_at');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn([
                'activation_token',
                'activation_token_expires_at',
                'invitation_sent_at',
                'invitation_notes',
            ]);
        });
    }
};
