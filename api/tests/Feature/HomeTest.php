<?php

use App\MaintenanceEvent;
use App\MaintenanceSchedule;
use App\OdometerEntry;
use App\Repair;
use App\Vehicle;

test('home endpoint returns all vehicles with current odometer', function () {
    $vehicle = Vehicle::factory()->create(['name' => 'My Car']);
    $token = 'Bearer '.issueApiToken();

    OdometerEntry::create([
        'uuid' => fake()->uuid(),
        'vehicle_id' => $vehicle->id,
        'value' => 50000,
        'recorded_at' => '2026-08-20',
    ]);

    $this->withHeader('Authorization', $token)
        ->getJson('/api/home')
        ->assertOk()
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.name', 'My Car')
        ->assertJsonPath('data.0.current_odometer', 50000);
});

test('home endpoint shows due items for schedules', function () {
    $vehicle = Vehicle::factory()->create();
    $token = 'Bearer '.issueApiToken();

    MaintenanceSchedule::create([
        'uuid' => fake()->uuid(),
        'vehicle_id' => $vehicle->id,
        'name' => 'Engine oil',
        'interval_km' => 10000,
        'interval_months' => 12,
    ]);

    OdometerEntry::create([
        'uuid' => fake()->uuid(),
        'vehicle_id' => $vehicle->id,
        'value' => 50000,
        'recorded_at' => '2026-08-20',
    ]);

    $this->withHeader('Authorization', $token)
        ->getJson('/api/home')
        ->assertOk()
        ->assertJsonCount(1, 'data.0.due_items')
        ->assertJsonPath('data.0.due_items.0.name', 'Engine oil')
        ->assertJsonPath('data.0.due_items.0.status', 'never_done');
});

test('home endpoint shows overdue status for exceeded schedule', function () {
    $vehicle = Vehicle::factory()->create();
    $token = 'Bearer '.issueApiToken();

    $schedule = MaintenanceSchedule::create([
        'uuid' => fake()->uuid(),
        'vehicle_id' => $vehicle->id,
        'name' => 'Engine oil',
        'interval_km' => 10000,
        'interval_months' => 12,
    ]);

    MaintenanceEvent::create([
        'uuid' => fake()->uuid(),
        'vehicle_id' => $vehicle->id,
        'schedule_id' => $schedule->id,
        'performed_at' => '2025-01-01',
        'odometer_value' => 40000,
    ]);

    OdometerEntry::create([
        'uuid' => fake()->uuid(),
        'vehicle_id' => $vehicle->id,
        'value' => 55000,
        'recorded_at' => '2026-08-20',
    ]);

    $this->withHeader('Authorization', $token)
        ->getJson('/api/home')
        ->assertOk()
        ->assertJsonPath('data.0.due_items.0.status', 'overdue');
});

test('home endpoint shows recent activity', function () {
    $vehicle = Vehicle::factory()->create();
    $token = 'Bearer '.issueApiToken();

    Repair::create([
        'uuid' => fake()->uuid(),
        'vehicle_id' => $vehicle->id,
        'title' => 'Replaced brake pads',
        'performed_at' => '2026-08-20',
        'odometer_value' => 50000,
    ]);

    MaintenanceEvent::create([
        'uuid' => fake()->uuid(),
        'vehicle_id' => $vehicle->id,
        'notes' => 'Oil change',
        'performed_at' => '2026-07-01',
        'odometer_value' => 45000,
    ]);

    $this->withHeader('Authorization', $token)
        ->getJson('/api/home')
        ->assertOk()
        ->assertJsonCount(2, 'data.0.recent_activity')
        ->assertJsonPath('data.0.recent_activity.0.title', 'Replaced brake pads')
        ->assertJsonPath('data.0.recent_activity.1.title', 'Oil change');
});

test('home endpoint shows current odometer from repair when no odometer entry', function () {
    $vehicle = Vehicle::factory()->create();
    $token = 'Bearer '.issueApiToken();

    Repair::create([
        'uuid' => fake()->uuid(),
        'vehicle_id' => $vehicle->id,
        'title' => 'Brake service',
        'performed_at' => '2026-08-20',
        'odometer_value' => 52000,
    ]);

    $this->withHeader('Authorization', $token)
        ->getJson('/api/home')
        ->assertOk()
        ->assertJsonPath('data.0.current_odometer', 52000);
});

test('home endpoint returns null odometer when no data', function () {
    $vehicle = Vehicle::factory()->create();
    $token = 'Bearer '.issueApiToken();

    $this->withHeader('Authorization', $token)
        ->getJson('/api/home')
        ->assertOk()
        ->assertJsonPath('data.0.current_odometer', null);
});

test('home endpoint requires authentication', function () {
    $this->getJson('/api/home')
        ->assertUnauthorized();
});
