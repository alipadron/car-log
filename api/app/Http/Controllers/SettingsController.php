<?php

namespace App\Http\Controllers;

use App\Http\Resources\SettingsResource;
use App\Setting;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SettingsController extends Controller
{
    /**
     * Display the owner's settings (singleton row).
     */
    public function show(): JsonResponse
    {
        return (new SettingsResource(Setting::singleton()))
            ->response()
            ->setStatusCode(200);
    }

    /**
     * Update the owner's settings.
     */
    public function update(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'language' => ['sometimes', 'string', 'in:en,es'],
            'distance_unit' => ['sometimes', 'string', 'in:km,mi'],
            'currency' => ['sometimes', 'string', 'max:10', 'min:1'],
        ]);

        $setting = Setting::singleton();
        $setting->update($validated);

        return (new SettingsResource($setting))
            ->response()
            ->setStatusCode(200);
    }
}
