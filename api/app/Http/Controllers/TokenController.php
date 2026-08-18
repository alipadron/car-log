<?php

namespace App\Http\Controllers;

use App\OwnerTokenIssuer;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class TokenController extends Controller
{
    /**
     * Exchange the single unlock password for a Sanctum API token.
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'password' => ['required', 'string'],
        ]);

        $password = config('carlog.unlock_password');

        abort_if(! is_string($password) || $password === '', 500, 'Unlock password is not configured.');

        if (! hash_equals($password, $validated['password'])) {
            return response()->json(['message' => 'Invalid password.'], 401);
        }

        return response()->json(['token' => OwnerTokenIssuer::issue()], 201);
    }
}
