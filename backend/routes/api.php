<?php

use App\Http\Controllers\Api\AuditLogArchiveController;
use App\Http\Controllers\Api\AuditLogController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\Content\BannerController;
use App\Http\Controllers\Api\Content\PublicBannerController;
use App\Http\Controllers\Api\DashboardController;
use App\Http\Controllers\Api\ExportJobController;
use App\Http\Controllers\Api\MasterDataController;
use App\Http\Controllers\Api\OpdController;
use App\Http\Controllers\Api\Perencanaan\CascadingController;
use App\Http\Controllers\Api\Perencanaan\KonteksRisikoController;
use App\Http\Controllers\Api\Perencanaan\PeriodePenilaianController;
use App\Http\Controllers\Api\Perencanaan\RenstraController;
use App\Http\Controllers\Api\Perencanaan\RenstraImportExportController;
use App\Http\Controllers\Api\RoleController;
use App\Http\Controllers\Api\SystemSettingController;
use App\Http\Controllers\Api\UserController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

// Health check endpoint
Route::get('/ping', function () {
    return response()->json([
        'status' => 'success',
        'message' => 'Backend Laravel API connected successfully!',
        'timestamp' => now()->toIso8601String(),
    ]);
});

// Public Banners (Login Carousel, Public Portals)
Route::get('/content/banners/public', [PublicBannerController::class, 'index']);

// Master OPD (Perangkat Daerah) - Publicly available for dropdowns & registration
Route::get('/opds', [OpdController::class, 'index']);
Route::get('/opds/{opd}', [OpdController::class, 'show'])->whereUuid('opd');

// Authentication Routes
Route::prefix('auth')->group(function () {
    // Public endpoints
    Route::post('/login', [AuthController::class, 'login']);
    Route::post('/forgot-password', [AuthController::class, 'forgotPassword']);
    Route::post('/reset-password', [AuthController::class, 'resetPassword']);
    Route::get('/validate-activation-token', [AuthController::class, 'validateActivationToken'])->middleware('throttle:30,1');
    Route::post('/activate', [AuthController::class, 'activate'])->middleware('throttle:10,1');

    // Step 2: 2FA Verification (Accepts temporary 2fa:verify token)
    Route::middleware(['auth:sanctum', 'ability:2fa:verify'])->group(function () {
        Route::post('/2fa/verify', [AuthController::class, 'verifyTwoFactor']);
    });

    // Fully authenticated endpoints (Denies 2fa-pending tokens)
    Route::middleware(['auth:sanctum', 'two_factor.fully_authenticated'])->group(function () {
        Route::get('/me', [AuthController::class, 'me']);
        Route::put('/profile', [AuthController::class, 'updateProfile']);
        Route::post('/logout', [AuthController::class, 'logout']);
        Route::post('/logout-all', [AuthController::class, 'logoutAll']);

        // 2FA Management
        Route::post('/2fa/setup', [AuthController::class, 'setupTwoFactor']);
        Route::post('/2fa/confirm', [AuthController::class, 'confirmTwoFactor']);
        Route::post('/2fa/disable', [AuthController::class, 'disableTwoFactor']);
        Route::get('/2fa/recovery-codes', [AuthController::class, 'getRecoveryCodes']);
        Route::post('/2fa/recovery-codes/regenerate', [AuthController::class, 'regenerateRecoveryCodes']);
    });
});

// Dynamic RBAC & User Management Routes
Route::middleware(['auth:sanctum', 'two_factor.fully_authenticated'])->group(function () {
    // Excel Export Endpoints (High Performance Streaming & Async Job Downloads)
    Route::get('/dashboard/export', [DashboardController::class, 'export']);
    Route::get('/users/export', [UserController::class, 'export']);
    Route::get('/opds/export', [OpdController::class, 'export']);
    Route::get('/roles/export', [RoleController::class, 'export']);
    Route::get('/audit-logs/export', [AuditLogController::class, 'export']);
    Route::get('/exports/status/{jobId}', [ExportJobController::class, 'status']);
    Route::get('/exports/download/{jobId}', [ExportJobController::class, 'download']);

    // RBAC
    Route::get('/permissions', [RoleController::class, 'permissions']);
    Route::apiResource('/roles', RoleController::class);

    // User Management
    Route::post('/users/invite', [UserController::class, 'invite']);
    Route::post('/users/{user}/resend-invitation', [UserController::class, 'resendInvitation']);
    Route::post('/users/{user}/reset-2fa', [UserController::class, 'resetTwoFactor']);
    Route::apiResource('/users', UserController::class);

    // Audit Logs & Immutable Archive Vault
    Route::get('/audit-logs/stats', [AuditLogArchiveController::class, 'stats']);
    Route::get('/audit-logs/archives', [AuditLogArchiveController::class, 'index']);
    Route::post('/audit-logs/archive-purge', [AuditLogArchiveController::class, 'purge']);
    Route::get('/audit-logs', [AuditLogController::class, 'index']);

    // System Settings
    Route::get('/system-settings', [SystemSettingController::class, 'index']);
    Route::put('/system-settings', [SystemSettingController::class, 'update']);

    // Perangkat Daerah (OPD) Dedicated CRUD & Stats
    Route::get('/opds/stats', [OpdController::class, 'stats']);
    Route::post('/opds', [OpdController::class, 'store']);
    Route::put('/opds/{opd}', [OpdController::class, 'update']);
    Route::patch('/opds/{opd}/toggle', [OpdController::class, 'toggleActive']);
    Route::delete('/opds/{opd}', [OpdController::class, 'destroy']);

    // Master Data (Manajemen Risiko & SPIP)
    Route::prefix('master')->group(function () {
        Route::get('/{entity}/export', [MasterDataController::class, 'export']);
        Route::get('/{entity}', [MasterDataController::class, 'index']);
        Route::get('/{entity}/{id}', [MasterDataController::class, 'show']);
        Route::post('/{entity}', [MasterDataController::class, 'store']);
        Route::put('/{entity}/{id}', [MasterDataController::class, 'update']);
        Route::patch('/{entity}/{id}/toggle', [MasterDataController::class, 'toggleActive']);
        Route::delete('/{entity}/{id}', [MasterDataController::class, 'destroy']);
    });

    // Modul Perencanaan & Cascading (Fitur 13, 14-17, Sheet 2B & 2C)
    Route::prefix('perencanaan')->group(function () {
        // Fitur 13: Periode Penilaian (Bapperida)
        Route::get('/periode', [PeriodePenilaianController::class, 'index']);
        Route::get('/periode/active', [PeriodePenilaianController::class, 'active']);
        Route::post('/periode', [PeriodePenilaianController::class, 'store']);
        Route::put('/periode/{periode}', [PeriodePenilaianController::class, 'update']);
        Route::patch('/periode/{periode}/activate', [PeriodePenilaianController::class, 'activate']);
        Route::patch('/periode/{periode}/status', [PeriodePenilaianController::class, 'updateStatus']);
        Route::delete('/periode/{periode}', [PeriodePenilaianController::class, 'destroy']);

        // Fitur 14-17: Cascading Makro 3 Tingkat (Tujuan -> Sasaran -> Indikator)
        Route::get('/cascading', [CascadingController::class, 'index']);
        Route::post('/cascading/clone', [CascadingController::class, 'clone']);
        Route::post('/cascading/tujuan', [CascadingController::class, 'storeTujuan']);
        Route::put('/cascading/tujuan/{tujuan}', [CascadingController::class, 'updateTujuan']);
        Route::delete('/cascading/tujuan/{tujuan}', [CascadingController::class, 'destroyTujuan']);

        Route::post('/cascading/sasaran', [CascadingController::class, 'storeSasaran']);
        Route::put('/cascading/sasaran/{sasaran}', [CascadingController::class, 'updateSasaran']);
        Route::delete('/cascading/sasaran/{sasaran}', [CascadingController::class, 'destroySasaran']);

        Route::post('/cascading/indikator', [CascadingController::class, 'storeIndikator']);
        Route::put('/cascading/indikator/{indikator}', [CascadingController::class, 'updateIndikator']);
        Route::delete('/cascading/indikator/{indikator}', [CascadingController::class, 'destroyIndikator']);

        // Sheet 2B: Penetapan Konteks Risiko Strategis OPD (Fitur 26)
        Route::get('/konteks-strategis', [KonteksRisikoController::class, 'show']);
        Route::post('/konteks-strategis', [KonteksRisikoController::class, 'store']);

        // Sheet 2C: Renstra SKPD Program, Kegiatan, Sub Kegiatan (OPD)
        Route::get('/renstra/tree', [RenstraController::class, 'tree']);
        Route::post('/renstra/program', [RenstraController::class, 'storeProgram']);
        Route::put('/renstra/program/{program}', [RenstraController::class, 'updateProgram']);
        Route::delete('/renstra/program/{program}', [RenstraController::class, 'destroyProgram']);

        Route::post('/renstra/kegiatan', [RenstraController::class, 'storeKegiatan']);
        Route::put('/renstra/kegiatan/{kegiatan}', [RenstraController::class, 'updateKegiatan']);
        Route::delete('/renstra/kegiatan/{kegiatan}', [RenstraController::class, 'destroyKegiatan']);

        Route::post('/renstra/sub-kegiatan', [RenstraController::class, 'storeSubKegiatan']);
        Route::put('/renstra/sub-kegiatan/{subKegiatan}', [RenstraController::class, 'updateSubKegiatan']);
        Route::delete('/renstra/sub-kegiatan/{subKegiatan}', [RenstraController::class, 'destroySubKegiatan']);

        // Import & Export Renstra Excel
        Route::get('/renstra/template', [RenstraImportExportController::class, 'downloadTemplate']);
        Route::get('/renstra/export', [RenstraImportExportController::class, 'export']);
        Route::post('/renstra/import', [RenstraImportExportController::class, 'import']);
    });

    // Modul Manajemen Konten (CMS & Banners)
    Route::prefix('content')->group(function () {
        Route::post('/banners/reorder', [BannerController::class, 'reorder']);
        Route::patch('/banners/{banner}/toggle-active', [BannerController::class, 'toggleActive']);
        Route::apiResource('/banners', BannerController::class);
    });
});


