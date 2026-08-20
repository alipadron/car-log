<?php

use App\Http\Controllers\SettingsController;
use App\Http\Controllers\TokenController;
use App\Http\Controllers\VehicleController;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Route;

Route::post('/auth/token', [TokenController::class, 'store'])
    ->middleware('throttle:6,1');

Route::middleware('auth.token')->group(function () {
    Route::get('/health', function () {
        DB::select('select 1');

        return response()->json([
            'status' => 'ok',
            'db' => 'ok',
        ]);
    });

    Route::apiResource('vehicles', VehicleController::class)
        ->only(['index', 'store', 'update', 'destroy']);

    Route::get('/settings', [SettingsController::class, 'show']);
    Route::put('/settings', [SettingsController::class, 'update']);
});
