<?php

use App\Vehicle;

test('owner can log an odometer entry for a vehicle', function () {
    $vehicle = Vehicle::factory()->create();
    $token = 'Bearer '.issueApiToken();

    $this->withHeader('Authorization', $token)
        ->postJson("/api/vehicles/{$vehicle->id}/odometer-entries", [
            'uuid' => '550e8400-e29b-41d4-a716-446655440000',
            'value' => 12345,
            'recorded_at' => '2026-08-20T10:00:00Z',
        ])
        ->assertCreated()
        ->assertJsonPath('data.value', 12345)
        ->assertJsonPath('data.vehicle_id', $vehicle->id);
});

test('owner can list odometer entries for a vehicle', function () {
    $vehicle = Vehicle::factory()->create();
    $token = 'Bearer '.issueApiToken();

    $this->withHeader('Authorization', $token)
        ->postJson("/api/vehicles/{$vehicle->id}/odometer-entries", [
            'uuid' => '550e8400-e29b-41d4-a716-446655440000',
            'value' => 10000,
            'recorded_at' => '2026-08-01T10:00:00Z',
        ]);

    $this->withHeader('Authorization', $token)
        ->postJson("/api/vehicles/{$vehicle->id}/odometer-entries", [
            'uuid' => '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
            'value' => 12345,
            'recorded_at' => '2026-08-20T10:00:00Z',
        ]);

    $this->withHeader('Authorization', $token)
        ->getJson("/api/vehicles/{$vehicle->id}/odometer-entries")
        ->assertOk()
        ->assertJsonCount(2, 'data')
        ->assertJsonPath('data.0.value', 10000)
        ->assertJsonPath('data.1.value', 12345);
});

test('odometer entry creation is idempotent on client uuid', function () {
    $vehicle = Vehicle::factory()->create();
    $token = 'Bearer '.issueApiToken();
    $uuid = '550e8400-e29b-41d4-a716-446655440000';

    $this->withHeader('Authorization', $token)
        ->postJson("/api/vehicles/{$vehicle->id}/odometer-entries", [
            'uuid' => $uuid,
            'value' => 10000,
            'recorded_at' => '2026-08-20T10:00:00Z',
        ])
        ->assertCreated();

    // Replay the same uuid — should return 200, not duplicate
    $this->withHeader('Authorization', $token)
        ->postJson("/api/vehicles/{$vehicle->id}/odometer-entries", [
            'uuid' => $uuid,
            'value' => 10000,
            'recorded_at' => '2026-08-20T10:00:00Z',
        ])
        ->assertOk();

    $this->withHeader('Authorization', $token)
        ->getJson("/api/vehicles/{$vehicle->id}/odometer-entries")
        ->assertOk()
        ->assertJsonCount(1, 'data');
});

test('odometer entry validates required fields', function () {
    $vehicle = Vehicle::factory()->create();
    $token = 'Bearer '.issueApiToken();

    $this->withHeader('Authorization', $token)
        ->postJson("/api/vehicles/{$vehicle->id}/odometer-entries", [])
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['uuid', 'value', 'recorded_at']);
});

test('odometer entry validates value is numeric', function () {
    $vehicle = Vehicle::factory()->create();
    $token = 'Bearer '.issueApiToken();

    $this->withHeader('Authorization', $token)
        ->postJson("/api/vehicles/{$vehicle->id}/odometer-entries", [
            'uuid' => '550e8400-e29b-41d4-a716-446655440000',
            'value' => 'not-a-number',
            'recorded_at' => '2026-08-20T10:00:00Z',
        ])
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['value']);
});

test('odometer entries endpoint requires authentication', function () {
    $vehicle = Vehicle::factory()->create();

    $this->getJson("/api/vehicles/{$vehicle->id}/odometer-entries")
        ->assertUnauthorized();

    $this->postJson("/api/vehicles/{$vehicle->id}/odometer-entries", [
        'uuid' => '550e8400-e29b-41d4-a716-446655440000',
        'value' => 10000,
        'recorded_at' => '2026-08-20T10:00:00Z',
    ])->assertUnauthorized();
});
