<?php

use App\Vehicle;

// --- CRUD tests ---

test('owner can create a maintenance schedule for a vehicle', function () {
    $vehicle = Vehicle::factory()->create();
    $token = 'Bearer '.issueApiToken();

    $this->withHeader('Authorization', $token)
        ->postJson("/api/vehicles/{$vehicle->id}/maintenance-schedules", [
            'uuid' => '550e8400-e29b-41d4-a716-446655440000',
            'name' => 'Engine oil',
            'interval_km' => 10000,
            'interval_months' => 12,
        ])
        ->assertCreated()
        ->assertJsonPath('data.name', 'Engine oil')
        ->assertJsonPath('data.interval_km', 10000)
        ->assertJsonPath('data.interval_months', 12)
        ->assertJsonPath('data.vehicle_id', $vehicle->id);
});

test('owner can list maintenance schedules for a vehicle', function () {
    $vehicle = Vehicle::factory()->create();
    $token = 'Bearer '.issueApiToken();

    $this->withHeader('Authorization', $token)
        ->postJson("/api/vehicles/{$vehicle->id}/maintenance-schedules", [
            'uuid' => '550e8400-e29b-41d4-a716-446655440000',
            'name' => 'Engine oil',
            'interval_km' => 10000,
            'interval_months' => 12,
        ]);

    $this->withHeader('Authorization', $token)
        ->postJson("/api/vehicles/{$vehicle->id}/maintenance-schedules", [
            'uuid' => '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
            'name' => 'Air filter',
            'interval_km' => 20000,
        ]);

    $this->withHeader('Authorization', $token)
        ->getJson("/api/vehicles/{$vehicle->id}/maintenance-schedules")
        ->assertOk()
        ->assertJsonCount(2, 'data')
        ->assertJsonPath('data.0.name', 'Engine oil')
        ->assertJsonPath('data.1.name', 'Air filter');
});

test('owner can update a maintenance schedule', function () {
    $vehicle = Vehicle::factory()->create();
    $token = 'Bearer '.issueApiToken();

    $this->withHeader('Authorization', $token)
        ->postJson("/api/vehicles/{$vehicle->id}/maintenance-schedules", [
            'uuid' => '550e8400-e29b-41d4-a716-446655440000',
            'name' => 'Engine oil',
            'interval_km' => 10000,
            'interval_months' => 12,
        ]);

    $this->withHeader('Authorization', $token)
        ->putJson("/api/vehicles/{$vehicle->id}/maintenance-schedules/1", [
            'name' => 'Oil change',
            'interval_km' => 8000,
        ])
        ->assertOk()
        ->assertJsonPath('data.name', 'Oil change')
        ->assertJsonPath('data.interval_km', 8000);
});

test('owner can delete a maintenance schedule', function () {
    $vehicle = Vehicle::factory()->create();
    $token = 'Bearer '.issueApiToken();

    $this->withHeader('Authorization', $token)
        ->postJson("/api/vehicles/{$vehicle->id}/maintenance-schedules", [
            'uuid' => '550e8400-e29b-41d4-a716-446655440000',
            'name' => 'Engine oil',
            'interval_km' => 10000,
        ]);

    $this->withHeader('Authorization', $token)
        ->deleteJson("/api/vehicles/{$vehicle->id}/maintenance-schedules/1")
        ->assertNoContent();

    $this->withHeader('Authorization', $token)
        ->getJson("/api/vehicles/{$vehicle->id}/maintenance-schedules")
        ->assertOk()
        ->assertJsonCount(0, 'data');
});

test('schedule creation is idempotent on client uuid', function () {
    $vehicle = Vehicle::factory()->create();
    $token = 'Bearer '.issueApiToken();
    $uuid = '550e8400-e29b-41d4-a716-446655440000';

    $this->withHeader('Authorization', $token)
        ->postJson("/api/vehicles/{$vehicle->id}/maintenance-schedules", [
            'uuid' => $uuid,
            'name' => 'Engine oil',
            'interval_km' => 10000,
        ])
        ->assertCreated();

    // Replay the same uuid — should return 200, not duplicate
    $this->withHeader('Authorization', $token)
        ->postJson("/api/vehicles/{$vehicle->id}/maintenance-schedules", [
            'uuid' => $uuid,
            'name' => 'Engine oil',
            'interval_km' => 10000,
        ])
        ->assertOk();

    $this->withHeader('Authorization', $token)
        ->getJson("/api/vehicles/{$vehicle->id}/maintenance-schedules")
        ->assertOk()
        ->assertJsonCount(1, 'data');
});

test('schedule validates required fields', function () {
    $vehicle = Vehicle::factory()->create();
    $token = 'Bearer '.issueApiToken();

    $this->withHeader('Authorization', $token)
        ->postJson("/api/vehicles/{$vehicle->id}/maintenance-schedules", [])
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['uuid', 'name']);
});

test('schedule requires at least one interval', function () {
    $vehicle = Vehicle::factory()->create();
    $token = 'Bearer '.issueApiToken();

    $this->withHeader('Authorization', $token)
        ->postJson("/api/vehicles/{$vehicle->id}/maintenance-schedules", [
            'uuid' => '550e8400-e29b-41d4-a716-446655440000',
            'name' => 'Engine oil',
        ])
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['interval_km', 'interval_months']);
});

test('schedule allows only interval_km without months', function () {
    $vehicle = Vehicle::factory()->create();
    $token = 'Bearer '.issueApiToken();

    $this->withHeader('Authorization', $token)
        ->postJson("/api/vehicles/{$vehicle->id}/maintenance-schedules", [
            'uuid' => '550e8400-e29b-41d4-a716-446655440000',
            'name' => 'Air filter',
            'interval_km' => 20000,
        ])
        ->assertCreated()
        ->assertJsonPath('data.interval_km', 20000)
        ->assertJsonPath('data.interval_months', null);
});

test('schedule allows only interval_months without km', function () {
    $vehicle = Vehicle::factory()->create();
    $token = 'Bearer '.issueApiToken();

    $this->withHeader('Authorization', $token)
        ->postJson("/api/vehicles/{$vehicle->id}/maintenance-schedules", [
            'uuid' => '550e8400-e29b-41d4-a716-446655440000',
            'name' => 'Inspection',
            'interval_months' => 12,
        ])
        ->assertCreated()
        ->assertJsonPath('data.interval_months', 12)
        ->assertJsonPath('data.interval_km', null);
});

test('maintenance schedules endpoint requires authentication', function () {
    $vehicle = Vehicle::factory()->create();

    $this->getJson("/api/vehicles/{$vehicle->id}/maintenance-schedules")
        ->assertUnauthorized();

    $this->postJson("/api/vehicles/{$vehicle->id}/maintenance-schedules", [
        'uuid' => '550e8400-e29b-41d4-a716-446655440000',
        'name' => 'Engine oil',
        'interval_km' => 10000,
    ])->assertUnauthorized();
});

// --- Template seeding tests ---

test('owner can seed car templates for a vehicle', function () {
    $vehicle = Vehicle::factory()->create(['type' => 'car']);
    $token = 'Bearer '.issueApiToken();

    $this->withHeader('Authorization', $token)
        ->postJson("/api/vehicles/{$vehicle->id}/maintenance-schedules/seed")
        ->assertOk()
        ->assertJsonCount(7, 'data');
});

test('owner can seed bike templates for a vehicle', function () {
    $vehicle = Vehicle::factory()->create(['type' => 'bike']);
    $token = 'Bearer '.issueApiToken();

    $this->withHeader('Authorization', $token)
        ->postJson("/api/vehicles/{$vehicle->id}/maintenance-schedules/seed")
        ->assertOk()
        ->assertJsonCount(6, 'data');
});

test('seeding twice adds nothing', function () {
    $vehicle = Vehicle::factory()->create(['type' => 'car']);
    $token = 'Bearer '.issueApiToken();

    $this->withHeader('Authorization', $token)
        ->postJson("/api/vehicles/{$vehicle->id}/maintenance-schedules/seed")
        ->assertOk();

    $this->withHeader('Authorization', $token)
        ->postJson("/api/vehicles/{$vehicle->id}/maintenance-schedules/seed")
        ->assertOk();

    $this->withHeader('Authorization', $token)
        ->getJson("/api/vehicles/{$vehicle->id}/maintenance-schedules")
        ->assertOk()
        ->assertJsonCount(7, 'data');
});

test('seeded schedules have correct template data for car', function () {
    $vehicle = Vehicle::factory()->create(['type' => 'car']);
    $token = 'Bearer '.issueApiToken();

    $response = $this->withHeader('Authorization', $token)
        ->postJson("/api/vehicles/{$vehicle->id}/maintenance-schedules/seed")
        ->assertOk();

    $names = collect($response->json('data'))->pluck('name')->all();
    expect($names)->toContain('Engine oil');
    expect($names)->toContain('Air filter');
    expect($names)->toContain('Brake fluid');
});

test('seed endpoint requires authentication', function () {
    $vehicle = Vehicle::factory()->create();

    $this->postJson("/api/vehicles/{$vehicle->id}/maintenance-schedules/seed")
        ->assertUnauthorized();
});
