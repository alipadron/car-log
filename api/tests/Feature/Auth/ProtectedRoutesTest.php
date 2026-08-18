<?php

use Illuminate\Support\Facades\Route;

test('api routes reject requests without a token', function () {
    $this->getJson('/api/health')->assertUnauthorized();
});

test('api routes reject requests with an invalid token', function () {
    $this->withHeader('Authorization', 'Bearer not-a-real-token')
        ->getJson('/api/health')
        ->assertUnauthorized();
});

test('api routes accept requests with a valid token', function () {
    $this->withHeader('Authorization', 'Bearer '.issueApiToken())
        ->getJson('/api/health')
        ->assertOk();
});

test('every api route except the token exchange requires an api token', function () {
    $apiRoutes = collect(Route::getRoutes())
        ->filter(fn ($route) => str_starts_with($route->uri(), 'api/') && $route->uri() !== 'api/auth/token');

    expect($apiRoutes)->not->toBeEmpty();

    foreach ($apiRoutes as $route) {
        expect($route->middleware())->toContain('auth.token');
    }
});
