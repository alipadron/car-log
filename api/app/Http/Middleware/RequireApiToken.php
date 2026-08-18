<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Laravel\Sanctum\PersonalAccessToken;
use Symfony\Component\HttpFoundation\Response;

class RequireApiToken
{
    /**
     * Reject requests without a valid Sanctum bearer token.
     *
     * Validates the token directly against personal_access_tokens (there is
     * no authenticatable user model in this single-user app), so the
     * auth:sanctum guard is not used.
     */
    public function handle(Request $request, Closure $next): Response
    {
        $bearerToken = $request->bearerToken();

        if ($bearerToken === null || $bearerToken === '' || PersonalAccessToken::findToken($bearerToken) === null) {
            return response()->json(['message' => 'Unauthenticated.'], 401);
        }

        return $next($request);
    }
}
