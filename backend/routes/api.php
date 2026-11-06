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
use App\Http\Controllers\Api\Pengawasan\AuditorAssignmentController;
use App\Http\Controllers\Api\Perencanaan\IndikatorPenilaianController;
use App\Http\Controllers\Api\Perencanaan\PeriodePenilaianController;
use App\Http\Controllers\Api\Perencanaan\SasaranPenilaianController;
use App\Http\Controllers\Api\Perencanaan\TujuanPenilaianController;
use App\Http\Controllers\Api\PublicAppConfigController;
use App\Http\Controllers\Api\Risiko\KonteksOperasionalController;
use App\Http\Controllers\Api\Risiko\KonteksPenilaianController;
use App\Http\Controllers\Api\Risiko\PengajuanRisikoController;
use App\Http\Controllers\Api\RoleController;
use App\Http\Controllers\Api\SystemSettingController;
use App\Http\Controllers\Api\UserAccountController;
use App\Http\Controllers\Api\UserController;
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
        Route::put('/password', [AuthController::class, 'changePassword']);
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
    Route::delete('/audit-logs/destroy-all', [AuditLogController::class, 'destroyAll']);
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
        Route::get('/tujuan/stats', [TujuanPenilaianController::class, 'stats']);
        Route::get('/tujuan/export', [TujuanPenilaianController::class, 'export']);
        Route::post('/tujuan/copy', [TujuanPenilaianController::class, 'copy']);
        Route::post('/tujuan/reorder', [TujuanPenilaianController::class, 'reorder']);
        Route::apiResource('/tujuan', TujuanPenilaianController::class)->parameters(['tujuan' => 'tujuan']);

        // Fitur 15: Data Sasaran Renstra OPD
        Route::get('/sasaran/stats', [SasaranPenilaianController::class, 'stats']);
        Route::get('/sasaran/export', [SasaranPenilaianController::class, 'export']);
        Route::post('/sasaran/copy', [SasaranPenilaianController::class, 'copy']);
        Route::post('/sasaran/reorder', [SasaranPenilaianController::class, 'reorder']);
        Route::apiResource('/sasaran', SasaranPenilaianController::class)->parameters(['sasaran' => 'sasaran']);

        // Fitur 16 & 17: Data IKU & Indikator Renstra OPD
        Route::get('/iku/stats', [IndikatorPenilaianController::class, 'stats']);
        Route::get('/iku/export', [IndikatorPenilaianController::class, 'export']);
        Route::post('/iku/copy', [IndikatorPenilaianController::class, 'copy']);
        Route::post('/iku/reorder', [IndikatorPenilaianController::class, 'reorder']);
        Route::apiResource('/iku', IndikatorPenilaianController::class)->parameters(['iku' => 'iku']);
    });

    // Modul Pengelolaan Data Risiko (Fitur 26 - Form 2-10, RCA)
    Route::prefix('risiko')->group(function () {
        // Form 2B: Penetapan Konteks Risiko Strategis OPD
        Route::get('/konteks-strategis/current', [KonteksPenilaianController::class, 'current']);
        Route::get('/konteks-strategis/{konteks}/export', [KonteksPenilaianController::class, 'export']);
        Route::apiResource('/konteks-strategis', KonteksPenilaianController::class)->parameters(['konteks-strategis' => 'konteks']);

        // Form 2C: Penetapan Konteks Risiko Operasional OPD
        Route::get('/konteks-operasional/current', [KonteksOperasionalController::class, 'current']);
        Route::get('/konteks-operasional/{konteks}/export', [KonteksOperasionalController::class, 'export']);
        Route::post('/konteks-operasional/{konteks}/items/reorder', [KonteksOperasionalController::class, 'reorderItems']);
        Route::post('/konteks-operasional/{konteks}/items', [KonteksOperasionalController::class, 'storeItem']);
        Route::put('/konteks-operasional/{konteks}/items/{item}', [KonteksOperasionalController::class, 'updateItem']);
        Route::delete('/konteks-operasional/{konteks}/items/{item}', [KonteksOperasionalController::class, 'destroyItem']);
        Route::apiResource('/konteks-operasional', KonteksOperasionalController::class)->parameters(['konteks-operasional' => 'konteks']);

        // Alur Pengajuan & Pemeriksaan Risiko (OPD & Kepala OPD)
        Route::get('/pengajuan/status', [PengajuanRisikoController::class, 'status']);
        Route::get('/pengajuan/pending-counts', [PengajuanRisikoController::class, 'pendingCounts']);
        Route::post('/pengajuan/submit', [PengajuanRisikoController::class, 'submit']);
        Route::post('/pengajuan/{id}/review-kepala', [PengajuanRisikoController::class, 'reviewKepalaOpd']);
        Route::post('/pengajuan/{id}/delegate-operator', [PengajuanRisikoController::class, 'delegateOperator']);
    });

    // Modul Pengawasan & Pembinaan (Inspektorat / Penugasan Auditor & Review Risiko)
    Route::prefix('pengawasan')->group(function () {
        Route::get('/penugasan-auditor/stats', [AuditorAssignmentController::class, 'stats']);
        Route::get('/penugasan-auditor/auditors', [AuditorAssignmentController::class, 'auditors']);
        Route::delete('/penugasan-auditor/auditor/{auditorId}', [AuditorAssignmentController::class, 'destroyAuditor']);
        Route::get('/penugasan-auditor', [AuditorAssignmentController::class, 'index']);
        Route::post('/penugasan-auditor', [AuditorAssignmentController::class, 'store']);
        Route::put('/penugasan-auditor/{auditorId}', [AuditorAssignmentController::class, 'update']);
        Route::delete('/penugasan-auditor/{id}', [AuditorAssignmentController::class, 'destroy']);

        // Review & Persetujuan Lembar Kerja Risiko OPD (Auditor & Pengawas APIP)
        Route::get('/review-risiko', [PengajuanRisikoController::class, 'indexReviews']);
        Route::get('/review-risiko/{id}', [PengajuanRisikoController::class, 'showReview']);
        Route::post('/review-risiko/{id}/item', [PengajuanRisikoController::class, 'reviewItem']);
        Route::post('/review-risiko/{id}/forward-revision', [PengajuanRisikoController::class, 'forwardRevisionAuditor']);
        Route::post('/review-risiko/{id}/resubmit-pengawas', [PengajuanRisikoController::class, 'resubmitPengawas']);
        Route::post('/review-risiko/{id}/review-pengawas', [PengajuanRisikoController::class, 'reviewPengawas']);
    });
});
