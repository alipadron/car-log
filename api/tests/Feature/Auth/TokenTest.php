<?php

use Laravel\Sanctum\PersonalAccessToken;

beforeEach(function () {
    config()->set('carlog.unlock_password', 'secret-password');
});

test('exchanging the correct password returns an api token', function () {
    $response = $this->postJson('/api/auth/token', ['password' => 'secret-password']);

    $response->assertCreated()->assertJsonStructure(['token']);

    $plainTextToken = $response->json('token');
    [$id, $secret] = explode('|', $plainTextToken);

    $token = PersonalAccessToken::findOrFail($id);
    expect($token->token)->toBe(hash('sha256', $secret))
        ->and($token->abilities)->toBe(['*'])
        ->and($token->expires_at)->toBeNull();
});

test('a wrong password is rejected', function () {
    $this->postJson('/api/auth/token', ['password' => 'wrong-password'])
        ->assertUnauthorized();

    expect(PersonalAccessToken::count())->toBe(0);
});

test('the password field is required', function () {
    $this->postJson('/api/auth/token', [])
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['password']);
});
