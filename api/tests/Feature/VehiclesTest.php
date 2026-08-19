<?php

use App\Vehicle;

test('owner can create a vehicle', function () {
    $response = $this->withHeader('Authorization', 'Bearer '.issueApiToken())
        ->postJson('/api/vehicles', [
            'uuid' => 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
            'name' => 'Daily driver',
            'type' => 'car',
            'make' => 'Toyota',
            'model' => 'Corolla',
            'year' => 2015,
        ]);

    $response->assertCreated()
        ->assertJsonPath('data.uuid', 'f47ac10b-58cc-4372-a567-0e02b2c3d479')
        ->assertJsonPath('data.name', 'Daily driver')
        ->assertJsonPath('data.type', 'car')
        ->assertJsonPath('data.make', 'Toyota')
        ->assertJsonPath('data.model', 'Corolla')
        ->assertJsonPath('data.year', 2015);
});

test('replaying a create with the same uuid yields exactly one vehicle', function () {
    $payload = [
        'uuid' => 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
        'name' => 'Daily driver',
        'type' => 'car',
        'make' => 'Toyota',
        'model' => 'Corolla',
        'year' => 2015,
    ];

    $first = $this->withHeader('Authorization', 'Bearer '.issueApiToken())
        ->postJson('/api/vehicles', $payload);

    $second = $this->withHeader('Authorization', 'Bearer '.issueApiToken())
        ->postJson('/api/vehicles', $payload);

    $first->assertCreated();
    $second->assertOk()
        ->assertJsonPath('data.id', $first->json('data.id'));

    $this->withHeader('Authorization', 'Bearer '.issueApiToken())
        ->getJson('/api/vehicles')
        ->assertOk()
        ->assertJsonCount(1, 'data');
});

test('owner can list their vehicles', function () {
    $bike = Vehicle::factory()->create(['type' => 'bike', 'name' => 'Trail bike']);
    $car = Vehicle::factory()->create(['type' => 'car', 'name' => 'Family car']);

    $this->withHeader('Authorization', 'Bearer '.issueApiToken())
        ->getJson('/api/vehicles')
        ->assertOk()
        ->assertJsonCount(2, 'data')
        ->assertJsonPath('data.0.id', $bike->id)
        ->assertJsonPath('data.0.name', 'Trail bike')
        ->assertJsonPath('data.1.id', $car->id)
        ->assertJsonPath('data.1.name', 'Family car');
});

test('owner can edit a vehicle', function () {
    $vehicle = Vehicle::factory()->create();

    $this->withHeader('Authorization', 'Bearer '.issueApiToken())
        ->putJson("/api/vehicles/{$vehicle->id}", [
            'name' => 'Weekend car',
            'type' => 'car',
            'make' => 'Ford',
            'model' => 'Fiesta',
            'year' => 2011,
        ])
        ->assertOk()
        ->assertJsonPath('data.id', $vehicle->id)
        ->assertJsonPath('data.name', 'Weekend car')
        ->assertJsonPath('data.type', 'car')
        ->assertJsonPath('data.make', 'Ford')
        ->assertJsonPath('data.model', 'Fiesta')
        ->assertJsonPath('data.year', 2011);

    expect($vehicle->fresh()->name)->toBe('Weekend car');
});

test('owner can delete a vehicle', function () {
    $vehicle = Vehicle::factory()->create();

    $this->withHeader('Authorization', 'Bearer '.issueApiToken())
        ->deleteJson("/api/vehicles/{$vehicle->id}")
        ->assertNoContent();

    expect(Vehicle::find($vehicle->id))->toBeNull();
});

test('create validates the payload', function (array $override, array $errors) {
    $payload = array_merge([
        'uuid' => 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
        'name' => 'Daily driver',
        'type' => 'car',
        'make' => 'Toyota',
        'model' => 'Corolla',
        'year' => 2015,
    ], $override);

    $this->withHeader('Authorization', 'Bearer '.issueApiToken())
        ->postJson('/api/vehicles', $payload)
        ->assertUnprocessable()
        ->assertJsonValidationErrors($errors);

    expect(Vehicle::count())->toBe(0);
})->with([
    'missing uuid' => [['uuid' => null], ['uuid']],
    'malformed uuid' => [['uuid' => 'not-a-uuid'], ['uuid']],
    'missing name' => [['name' => null], ['name']],
    'invalid type' => [['type' => 'truck'], ['type']],
    'missing make' => [['make' => null], ['make']],
    'missing model' => [['model' => null], ['model']],
    'year too low' => [['year' => 1885], ['year']],
    'year not an integer' => [['year' => 'abc'], ['year']],
]);

test('edit validates the payload', function () {
    $vehicle = Vehicle::factory()->create();

    $this->withHeader('Authorization', 'Bearer '.issueApiToken())
        ->putJson("/api/vehicles/{$vehicle->id}", [
            'name' => null,
            'type' => 'truck',
            'year' => 'abc',
        ])
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['name', 'type', 'make', 'model', 'year']);
});

test('editing or deleting an unknown vehicle returns 404', function () {
    $token = 'Bearer '.issueApiToken();

    $this->withHeader('Authorization', $token)
        ->putJson('/api/vehicles/999', [
            'name' => 'Ghost',
            'type' => 'car',
            'make' => 'Toyota',
            'model' => 'Corolla',
            'year' => 2015,
        ])
        ->assertNotFound();

    $this->withHeader('Authorization', $token)
        ->deleteJson('/api/vehicles/999')
        ->assertNotFound();
});
