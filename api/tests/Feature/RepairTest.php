<?php

use App\Vehicle;

test('owner can log a repair for a vehicle', function () {
    $vehicle = Vehicle::factory()->create();
    $token = 'Bearer '.issueApiToken();

    $this->withHeader('Authorization', $token)
        ->postJson("/api/vehicles/{$vehicle->id}/repairs", [
            'uuid' => '550e8400-e29b-41d4-a716-446655440000',
            'title' => 'Replaced brake pads',
            'notes' => 'Front and rear',
            'cost' => 150.00,
            'performed_at' => '2026-08-20T10:00:00Z',
            'odometer_value' => 45000,
        ])
        ->assertCreated()
        ->assertJsonPath('data.title', 'Replaced brake pads')
        ->assertJsonPath('data.cost', '150.00')
        ->assertJsonPath('data.odometer_value', 45000)
        ->assertJsonPath('data.vehicle_id', $vehicle->id);
});

test('owner can list repairs for a vehicle', function () {
    $vehicle = Vehicle::factory()->create();
    $token = 'Bearer '.issueApiToken();

    $this->withHeader('Authorization', $token)
        ->postJson("/api/vehicles/{$vehicle->id}/repairs", [
            'uuid' => '550e8400-e29b-41d4-a716-446655440000',
            'title' => 'Oil change',
            'cost' => 50.00,
            'performed_at' => '2026-07-01T10:00:00Z',
            'odometer_value' => 40000,
        ]);

    $this->withHeader('Authorization', $token)
        ->postJson("/api/vehicles/{$vehicle->id}/repairs", [
            'uuid' => '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
            'title' => 'Replaced brake pads',
            'cost' => 150.00,
            'performed_at' => '2026-08-20T10:00:00Z',
            'odometer_value' => 45000,
        ]);

    $this->withHeader('Authorization', $token)
        ->getJson("/api/vehicles/{$vehicle->id}/repairs")
        ->assertOk()
        ->assertJsonCount(2, 'data')
        ->assertJsonPath('data.0.title', 'Oil change')
        ->assertJsonPath('data.1.title', 'Replaced brake pads');
});

test('repair creation is idempotent on client uuid', function () {
    $vehicle = Vehicle::factory()->create();
    $token = 'Bearer '.issueApiToken();
    $uuid = '550e8400-e29b-41d4-a716-446655440000';

    $this->withHeader('Authorization', $token)
        ->postJson("/api/vehicles/{$vehicle->id}/repairs", [
            'uuid' => $uuid,
            'title' => 'Oil change',
            'cost' => 50.00,
            'performed_at' => '2026-08-20T10:00:00Z',
            'odometer_value' => 40000,
        ])
        ->assertCreated();

    // Replay the same uuid — should return 200, not duplicate
    $this->withHeader('Authorization', $token)
        ->postJson("/api/vehicles/{$vehicle->id}/repairs", [
            'uuid' => $uuid,
            'title' => 'Oil change',
            'cost' => 50.00,
            'performed_at' => '2026-08-20T10:00:00Z',
            'odometer_value' => 40000,
        ])
        ->assertOk();

    $this->withHeader('Authorization', $token)
        ->getJson("/api/vehicles/{$vehicle->id}/repairs")
        ->assertOk()
        ->assertJsonCount(1, 'data');
});

test('repair validates required fields', function () {
    $vehicle = Vehicle::factory()->create();
    $token = 'Bearer '.issueApiToken();

    $this->withHeader('Authorization', $token)
        ->postJson("/api/vehicles/{$vehicle->id}/repairs", [])
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['uuid', 'title', 'performed_at', 'odometer_value']);
});

test('repair validates cost is numeric when provided', function () {
    $vehicle = Vehicle::factory()->create();
    $token = 'Bearer '.issueApiToken();

    $this->withHeader('Authorization', $token)
        ->postJson("/api/vehicles/{$vehicle->id}/repairs", [
            'uuid' => '550e8400-e29b-41d4-a716-446655440000',
            'title' => 'Oil change',
            'cost' => 'not-a-number',
            'performed_at' => '2026-08-20T10:00:00Z',
            'odometer_value' => 40000,
        ])
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['cost']);
});

test('repair validates odometer_value is numeric', function () {
    $vehicle = Vehicle::factory()->create();
    $token = 'Bearer '.issueApiToken();

    $this->withHeader('Authorization', $token)
        ->postJson("/api/vehicles/{$vehicle->id}/repairs", [
            'uuid' => '550e8400-e29b-41d4-a716-446655440000',
            'title' => 'Oil change',
            'performed_at' => '2026-08-20T10:00:00Z',
            'odometer_value' => 'not-a-number',
        ])
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['odometer_value']);
});

test('repairs endpoint requires authentication', function () {
    $vehicle = Vehicle::factory()->create();

    $this->getJson("/api/vehicles/{$vehicle->id}/repairs")
        ->assertUnauthorized();

    $this->postJson("/api/vehicles/{$vehicle->id}/repairs", [
        'uuid' => '550e8400-e29b-41d4-a716-446655440000',
        'title' => 'Oil change',
        'performed_at' => '2026-08-20T10:00:00Z',
        'odometer_value' => 40000,
    ])->assertUnauthorized();
});
