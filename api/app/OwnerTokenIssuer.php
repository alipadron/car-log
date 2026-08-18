<?php

namespace App;

use Illuminate\Support\Str;
use Laravel\Sanctum\PersonalAccessToken;

class OwnerTokenIssuer
{
    /**
     * Mint a Sanctum personal access token for the single owner and return
     * its plain-text value ("<id>|<secret>").
     *
     * There is no user table (single-user app); tokens use a fixed "owner"
     * tokenable stand-in and are checked by the auth.token middleware.
     */
    public static function issue(): string
    {
        $plainTextToken = Str::random(40);

        $token = new PersonalAccessToken;
        $token->forceFill([
            'tokenable_type' => 'owner',
            'tokenable_id' => 1,
            'name' => 'device',
            'token' => hash('sha256', $plainTextToken),
            'abilities' => ['*'],
        ])->save();

        return $token->id.'|'.$plainTextToken;
    }
}
