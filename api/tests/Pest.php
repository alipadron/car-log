<?php

use App\OwnerTokenIssuer;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

pest()->extend(TestCase::class)
    ->use(RefreshDatabase::class)
    ->in('Feature');

/**
 * Mint an owner token and return the plain-text bearer token for it.
 */
function issueApiToken(): string
{
    return OwnerTokenIssuer::issue();
}
