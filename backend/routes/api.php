<?php

use App\Http\Controllers\Api\AuditLogController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\MasterDataController;
use App\Http\Controllers\Api\OpdController;
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

// Master OPD (Perangkat Daerah) - Publicly available for registration/activation & dashboard
Route::get('/opds', [OpdController::class, 'index']);
Route::get('/opds/{opd}', [OpdController::class, 'show']);

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
    // RBAC
    Route::get('/permissions', [RoleController::class, 'permissions']);
    Route::apiResource('/roles', RoleController::class);

    // User Management
    Route::post('/users/invite', [UserController::class, 'invite']);
    Route::post('/users/{user}/resend-invitation', [UserController::class, 'resendInvitation']);
    Route::post('/users/{user}/reset-2fa', [UserController::class, 'resetTwoFactor']);
    Route::apiResource('/users', UserController::class);

    // Audit Logs
    Route::get('/audit-logs', [AuditLogController::class, 'index']);

    // System Settings
    Route::get('/system-settings', [SystemSettingController::class, 'index']);
    Route::put('/system-settings', [SystemSettingController::class, 'update']);

    // Master Data (Manajemen Risiko & SPIP)
    Route::prefix('master')->group(function () {
        Route::get('/{entity}', [MasterDataController::class, 'index']);
        Route::get('/{entity}/{id}', [MasterDataController::class, 'show']);
        Route::post('/{entity}', [MasterDataController::class, 'store']);
        Route::put('/{entity}/{id}', [MasterDataController::class, 'update']);
        Route::patch('/{entity}/{id}/toggle', [MasterDataController::class, 'toggleActive']);
        Route::delete('/{entity}/{id}', [MasterDataController::class, 'destroy']);
    });
});


