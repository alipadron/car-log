<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Unlock password
    |--------------------------------------------------------------------------
    |
    | The single password that unlocks the app. Exchanged for an API token
    | via POST /api/auth/token. There are no user accounts; this env var
    | is the whole credential.
    |
    */

    'unlock_password' => env('CAR_LOG_UNLOCK_PASSWORD'),

];
