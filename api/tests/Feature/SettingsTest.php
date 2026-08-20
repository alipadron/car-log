<?php

test('owner can get default settings', function () {
    $this->withHeader('Authorization', 'Bearer '.issueApiToken())
        ->getJson('/api/settings')
        ->assertOk()
        ->assertJsonPath('data.language', 'en')
        ->assertJsonPath('data.distance_unit', 'km')
        ->assertJsonPath('data.currency', 'USD');
});

test('owner can update settings', function () {
    $token = 'Bearer '.issueApiToken();

    $this->withHeader('Authorization', $token)
        ->putJson('/api/settings', [
            'language' => 'es',
            'distance_unit' => 'mi',
            'currency' => 'EUR',
        ])
        ->assertOk()
        ->assertJsonPath('data.language', 'es')
        ->assertJsonPath('data.distance_unit', 'mi')
        ->assertJsonPath('data.currency', 'EUR');

    // Round-trip: GET returns the saved values
    $this->withHeader('Authorization', $token)
        ->getJson('/api/settings')
        ->assertOk()
        ->assertJsonPath('data.language', 'es')
        ->assertJsonPath('data.distance_unit', 'mi')
        ->assertJsonPath('data.currency', 'EUR');
});

test('owner can partially update settings', function () {
    $token = 'Bearer '.issueApiToken();

    $this->withHeader('Authorization', $token)
        ->putJson('/api/settings', ['language' => 'es'])
        ->assertOk()
        ->assertJsonPath('data.language', 'es')
        ->assertJsonPath('data.distance_unit', 'km')
        ->assertJsonPath('data.currency', 'USD');
});

test('invalid language is rejected', function () {
    $this->withHeader('Authorization', 'Bearer '.issueApiToken())
        ->putJson('/api/settings', ['language' => 'fr'])
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['language']);
});

test('invalid distance_unit is rejected', function () {
    $this->withHeader('Authorization', 'Bearer '.issueApiToken())
        ->putJson('/api/settings', ['distance_unit' => 'ft'])
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['distance_unit']);
});

test('empty currency is rejected', function () {
    $this->withHeader('Authorization', 'Bearer '.issueApiToken())
        ->putJson('/api/settings', ['currency' => ''])
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['currency']);
});

test('settings endpoint requires authentication', function () {
    $this->getJson('/api/settings')
        ->assertUnauthorized();

    $this->putJson('/api/settings', ['language' => 'en'])
        ->assertUnauthorized();
});
