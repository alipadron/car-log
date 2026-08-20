<?php

use App\MaintenanceSchedule;
use App\Vehicle;

test('owner can log a maintenance event for a vehicle', function () {
    $vehicle = Vehicle::factory()->create();
    $token = 'Bearer '.issueApiToken();

    $this->withHeader('Authorization', $token)
        ->postJson("/api/vehicles/{$vehicle->id}/maintenance-events", [
            'uuid' => '550e8400-e29b-41d4-a716-446655440000',
            'notes' => 'Changed oil and filter',
            'cost' => 75.00,
            'performed_at' => '2026-08-20T10:00:00Z',
            'odometer_value' => 45000,
        ])
        ->assertCreated()
        ->assertJsonPath('data.notes', 'Changed oil and filter')
        ->assertJsonPath('data.cost', '75.00')
        ->assertJsonPath('data.odometer_value', 45000)
        ->assertJsonPath('data.vehicle_id', $vehicle->id)
        ->assertJsonPath('data.schedule_id', null);
});

test('owner can log a maintenance event against a schedule', function () {
    $vehicle = Vehicle::factory()->create();
    $schedule = MaintenanceSchedule::create([
        'uuid' => 'aaa-bbb',
        'vehicle_id' => $vehicle->id,
        'name' => 'Engine oil',
        'interval_km' => 10000,
        'interval_months' => 12,
    ]);
    $token = 'Bearer '.issueApiToken();

    $this->withHeader('Authorization', $token)
        ->postJson("/api/vehicles/{$vehicle->id}/maintenance-events", [
            'uuid' => '550e8400-e29b-41d4-a716-446655440000',
            'schedule_id' => $schedule->id,
            'cost' => 75.00,
            'performed_at' => '2026-08-20T10:00:00Z',
            'odometer_value' => 45000,
        ])
        ->assertCreated()
        ->assertJsonPath('data.schedule_id', $schedule->id);
});

test('owner can list maintenance events for a vehicle', function () {
    $vehicle = Vehicle::factory()->create();
    $token = 'Bearer '.issueApiToken();

    $this->withHeader('Authorization', $token)
        ->postJson("/api/vehicles/{$vehicle->id}/maintenance-events", [
            'uuid' => '550e8400-e29b-41d4-a716-446655440000',
            'notes' => 'Oil change',
            'performed_at' => '2026-07-01T10:00:00Z',
            'odometer_value' => 40000,
        ]);

    $this->withHeader('Authorization', $token)
        ->postJson("/api/vehicles/{$vehicle->id}/maintenance-events", [
            'uuid' => '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
            'notes' => 'Brake service',
            'performed_at' => '2026-08-20T10:00:00Z',
            'odometer_value' => 45000,
        ]);

    $this->withHeader('Authorization', $token)
        ->getJson("/api/vehicles/{$vehicle->id}/maintenance-events")
        ->assertOk()
        ->assertJsonCount(2, 'data')
        // Newest first
        ->assertJsonPath('data.0.notes', 'Brake service')
        ->assertJsonPath('data.1.notes', 'Oil change');
});

test('maintenance event creation is idempotent on client uuid', function () {
    $vehicle = Vehicle::factory()->create();
    $token = 'Bearer '.issueApiToken();
    $uuid = '550e8400-e29b-41d4-a716-446655440000';

    $this->withHeader('Authorization', $token)
        ->postJson("/api/vehicles/{$vehicle->id}/maintenance-events", [
            'uuid' => $uuid,
            'notes' => 'Oil change',
            'performed_at' => '2026-08-20T10:00:00Z',
            'odometer_value' => 40000,
        ])
        ->assertCreated();

    $this->withHeader('Authorization', $token)
        ->postJson("/api/vehicles/{$vehicle->id}/maintenance-events", [
            'uuid' => $uuid,
            'notes' => 'Oil change',
            'performed_at' => '2026-08-20T10:00:00Z',
            'odometer_value' => 40000,
        ])
        ->assertOk();

    $this->withHeader('Authorization', $token)
        ->getJson("/api/vehicles/{$vehicle->id}/maintenance-events")
        ->assertOk()
        ->assertJsonCount(1, 'data');
});

test('maintenance event validates required fields', function () {
    $vehicle = Vehicle::factory()->create();
    $token = 'Bearer '.issueApiToken();

    $this->withHeader('Authorization', $token)
        ->postJson("/api/vehicles/{$vehicle->id}/maintenance-events", [])
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['uuid', 'performed_at', 'odometer_value']);
});

test('maintenance event validates cost is numeric when provided', function () {
    $vehicle = Vehicle::factory()->create();
    $token = 'Bearer '.issueApiToken();

    $this->withHeader('Authorization', $token)
        ->postJson("/api/vehicles/{$vehicle->id}/maintenance-events", [
            'uuid' => '550e8400-e29b-41d4-a716-446655440000',
            'cost' => 'not-a-number',
            'performed_at' => '2026-08-20T10:00:00Z',
            'odometer_value' => 40000,
        ])
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['cost']);
});

test('maintenance events endpoint requires authentication', function () {
    $vehicle = Vehicle::factory()->create();

    $this->getJson("/api/vehicles/{$vehicle->id}/maintenance-events")
        ->assertUnauthorized();

    $this->postJson("/api/vehicles/{$vehicle->id}/maintenance-events", [
        'uuid' => '550e8400-e29b-41d4-a716-446655440000',
        'performed_at' => '2026-08-20T10:00:00Z',
        'odometer_value' => 40000,
    ])->assertUnauthorized();
});
