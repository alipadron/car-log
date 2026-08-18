---
paths:
  - 'app/Http/**'
---

# Http

## Sanctum tokens without a user model
Single-user app: no user table, so the auth:sanctum guard is NOT used. POST /api/auth/token (TokenController) checks config('carlog.unlock_password') (env CAR_LOG_UNLOCK_PASSWORD) with hash_equals and mints the token via App\OwnerTokenIssuer::issue() — the single place that writes PersonalAccessToken rows with fixed tokenable_type 'owner' / tokenable_id 1. App\Http\Middleware\RequireApiToken (alias 'auth.token') validates bearer tokens directly via PersonalAccessToken::findToken. Tests create tokens via the issueApiToken() helper in tests/Pest.php (delegates to OwnerTokenIssuer). tests/Feature/Auth/ProtectedRoutesTest.php asserts every api/* route except the token exchange carries auth.token — keep it passing when adding routes.
