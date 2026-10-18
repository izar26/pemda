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
use App\Http\Controllers\Api\PegawaiController;
use App\Http\Controllers\Api\Perencanaan\PeriodePenilaianController;
use App\Http\Controllers\Api\RoleController;
use App\Http\Controllers\Api\SystemSettingController;
use App\Http\Controllers\Api\PublicAppConfigController;
use App\Http\Controllers\Api\UserAccountController;
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

// Public Application Identity & Branding Configuration
Route::get('/public/app-config', [PublicAppConfigController::class, 'index']);

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
    // Dashboard Endpoints
    Route::get('/dashboard/stats', [DashboardController::class, 'stats']);

    // Excel Export Endpoints (High Performance Streaming & Async Job Downloads)
    Route::get('/dashboard/export', [DashboardController::class, 'export']);
    Route::get('/pegawai/export', [PegawaiController::class, 'export']);
    Route::get('/user-accounts/export', [UserAccountController::class, 'export']);
    Route::get('/users/export', [UserController::class, 'export']);
    Route::get('/opds/export', [OpdController::class, 'export']);
    Route::get('/roles/export', [RoleController::class, 'export']);
    Route::get('/audit-logs/export', [AuditLogController::class, 'export']);
    Route::get('/exports/status/{jobId}', [ExportJobController::class, 'status']);
    Route::get('/exports/download/{jobId}', [ExportJobController::class, 'download']);

    // RBAC
    Route::get('/permissions', [RoleController::class, 'permissions']);
    Route::apiResource('/roles', RoleController::class);

    // Manajemen Pegawai (Employee Directory without Account Credentials)
    Route::get('/pegawai/check-kepala/{opdId}', [PegawaiController::class, 'checkKepalaOpd'])->whereUuid('opdId');
    Route::apiResource('/pegawai', PegawaiController::class)->parameters(['pegawai' => 'pegawai']);

    // Manajemen Users (Dedicated Login Account & Role Assignment)
    Route::post('/user-accounts/{user}/reset-2fa', [UserAccountController::class, 'resetTwoFactor'])->whereUuid('user');
    Route::apiResource('/user-accounts', UserAccountController::class)->parameters(['user-accounts' => 'user'])->except(['show']);

    // Legacy / Direct User Endpoints
    Route::post('/users/invite', [UserController::class, 'invite']);
    Route::post('/users/{user}/resend-invitation', [UserController::class, 'resendInvitation']);
    Route::post('/users/{user}/reset-2fa', [UserController::class, 'resetTwoFactor']);
    Route::apiResource('/users', UserController::class);

    // Audit Logs & Immutable Archive Vault
    Route::get('/audit-logs/stats', [AuditLogArchiveController::class, 'stats']);
    Route::get('/audit-logs/archives', [AuditLogArchiveController::class, 'index']);
    Route::post('/audit-logs/archive-purge', [AuditLogArchiveController::class, 'purge']);
    Route::get('/audit-logs', [AuditLogController::class, 'index']);

    // System Settings & Assets
    Route::get('/system-settings', [SystemSettingController::class, 'index']);
    Route::put('/system-settings', [SystemSettingController::class, 'update']);
    Route::post('/system-settings/logo', [SystemSettingController::class, 'uploadLogo']);
    Route::delete('/system-settings/logo', [SystemSettingController::class, 'deleteLogo']);

    // Perangkat Daerah (OPD) Dedicated CRUD & Stats
    Route::get('/opds/stats', [OpdController::class, 'stats']);
    Route::post('/opds/reorder', [OpdController::class, 'reorder']);
    Route::post('/opds', [OpdController::class, 'store']);
    Route::put('/opds/{opd}', [OpdController::class, 'update']);
    Route::patch('/opds/{opd}/toggle', [OpdController::class, 'toggleActive']);
    Route::delete('/opds/{opd}', [OpdController::class, 'destroy']);

    // Master Data (Manajemen Risiko & SPIP)
    Route::prefix('master')->group(function () {
        Route::get('/{entity}/export', [MasterDataController::class, 'export']);
        Route::post('/{entity}/reorder', [MasterDataController::class, 'reorder']);
        Route::get('/{entity}', [MasterDataController::class, 'index']);
        Route::get('/{entity}/{id}', [MasterDataController::class, 'show']);
        Route::post('/{entity}', [MasterDataController::class, 'store']);
        Route::put('/{entity}/{id}', [MasterDataController::class, 'update']);
        Route::patch('/{entity}/{id}/toggle', [MasterDataController::class, 'toggleActive']);
        Route::delete('/{entity}/{id}', [MasterDataController::class, 'destroy']);
    });

    // Modul Manajemen Konten (CMS & Banners)
    Route::prefix('content')->group(function () {
        Route::post('/banners/reorder', [BannerController::class, 'reorder']);
        Route::patch('/banners/{banner}/toggle-active', [BannerController::class, 'toggleActive']);
        Route::apiResource('/banners', BannerController::class);
    });

    // Modul Perencanaan Kinerja & Tata Kelola Risiko
    Route::prefix('perencanaan')->group(function () {
        Route::get('/periode/active', [PeriodePenilaianController::class, 'active']);
        Route::get('/periode/stats', [PeriodePenilaianController::class, 'stats']);
        Route::get('/periode/export', [PeriodePenilaianController::class, 'export']);
        Route::patch('/periode/{periode}/activate', [PeriodePenilaianController::class, 'activate']);
        Route::patch('/periode/{periode}/switch-tahun', [PeriodePenilaianController::class, 'switchTahun']);
        Route::apiResource('/periode', PeriodePenilaianController::class)->parameters(['periode' => 'periode']);

        // Fitur 14: Data Tujuan Renstra OPD
        Route::get('/tujuan/stats', [\App\Http\Controllers\Api\Perencanaan\TujuanPenilaianController::class, 'stats']);
        Route::get('/tujuan/export', [\App\Http\Controllers\Api\Perencanaan\TujuanPenilaianController::class, 'export']);
        Route::post('/tujuan/copy', [\App\Http\Controllers\Api\Perencanaan\TujuanPenilaianController::class, 'copy']);
        Route::post('/tujuan/reorder', [\App\Http\Controllers\Api\Perencanaan\TujuanPenilaianController::class, 'reorder']);
        Route::apiResource('/tujuan', \App\Http\Controllers\Api\Perencanaan\TujuanPenilaianController::class)->parameters(['tujuan' => 'tujuan']);

        // Fitur 15: Data Sasaran Renstra OPD
        Route::get('/sasaran/stats', [\App\Http\Controllers\Api\Perencanaan\SasaranPenilaianController::class, 'stats']);
        Route::get('/sasaran/export', [\App\Http\Controllers\Api\Perencanaan\SasaranPenilaianController::class, 'export']);
        Route::post('/sasaran/copy', [\App\Http\Controllers\Api\Perencanaan\SasaranPenilaianController::class, 'copy']);
        Route::post('/sasaran/reorder', [\App\Http\Controllers\Api\Perencanaan\SasaranPenilaianController::class, 'reorder']);
        Route::apiResource('/sasaran', \App\Http\Controllers\Api\Perencanaan\SasaranPenilaianController::class)->parameters(['sasaran' => 'sasaran']);

        // Fitur 16 & 17: Data IKU & Indikator Renstra OPD
        Route::get('/iku/stats', [\App\Http\Controllers\Api\Perencanaan\IndikatorPenilaianController::class, 'stats']);
        Route::get('/iku/export', [\App\Http\Controllers\Api\Perencanaan\IndikatorPenilaianController::class, 'export']);
        Route::post('/iku/copy', [\App\Http\Controllers\Api\Perencanaan\IndikatorPenilaianController::class, 'copy']);
        Route::post('/iku/reorder', [\App\Http\Controllers\Api\Perencanaan\IndikatorPenilaianController::class, 'reorder']);
        Route::apiResource('/iku', \App\Http\Controllers\Api\Perencanaan\IndikatorPenilaianController::class)->parameters(['iku' => 'iku']);
    });

    // Modul Pengelolaan Data Risiko (Fitur 26 - Form 2-10, RCA)
    Route::prefix('risiko')->group(function () {
        // Form 2B: Penetapan Konteks Risiko Strategis OPD
        Route::get('/konteks-strategis/current', [\App\Http\Controllers\Api\Risiko\KonteksPenilaianController::class, 'current']);
        Route::get('/konteks-strategis/{konteks}/export', [\App\Http\Controllers\Api\Risiko\KonteksPenilaianController::class, 'export']);
        Route::apiResource('/konteks-strategis', \App\Http\Controllers\Api\Risiko\KonteksPenilaianController::class)->parameters(['konteks-strategis' => 'konteks']);

        // Form 2C: Penetapan Konteks Risiko Operasional OPD
        Route::get('/konteks-operasional/current', [\App\Http\Controllers\Api\Risiko\KonteksOperasionalController::class, 'current']);
        Route::get('/konteks-operasional/{konteks}/export', [\App\Http\Controllers\Api\Risiko\KonteksOperasionalController::class, 'export']);
        Route::post('/konteks-operasional/{konteks}/items/reorder', [\App\Http\Controllers\Api\Risiko\KonteksOperasionalController::class, 'reorderItems']);
        Route::post('/konteks-operasional/{konteks}/items', [\App\Http\Controllers\Api\Risiko\KonteksOperasionalController::class, 'storeItem']);
        Route::put('/konteks-operasional/{konteks}/items/{item}', [\App\Http\Controllers\Api\Risiko\KonteksOperasionalController::class, 'updateItem']);
        Route::delete('/konteks-operasional/{konteks}/items/{item}', [\App\Http\Controllers\Api\Risiko\KonteksOperasionalController::class, 'destroyItem']);
        Route::apiResource('/konteks-operasional', \App\Http\Controllers\Api\Risiko\KonteksOperasionalController::class)->parameters(['konteks-operasional' => 'konteks']);
    });
});


