<?php

use App\Http\Controllers\OdometerEntryController;
use App\Http\Controllers\HomeController;
use App\Http\Controllers\MaintenanceEventController;
use App\Http\Controllers\MaintenanceScheduleController;
use App\Http\Controllers\RepairController;
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

    Route::apiResource('vehicles.odometer-entries', OdometerEntryController::class)
        ->only(['index', 'store', 'destroy']);

    Route::apiResource('vehicles.repairs', RepairController::class)
        ->only(['index', 'store', 'destroy']);

    Route::apiResource('vehicles.maintenance-schedules', MaintenanceScheduleController::class)
        ->only(['index', 'store', 'update', 'destroy']);

    Route::post('vehicles/{vehicle}/maintenance-schedules/seed', [MaintenanceScheduleController::class, 'seed']);

    Route::apiResource('vehicles.maintenance-events', MaintenanceEventController::class)
        ->only(['index', 'store']);

    Route::get('/home', HomeController::class);

    Route::get('/settings', [SettingsController::class, 'show']);
    Route::put('/settings', [SettingsController::class, 'update']);
});
