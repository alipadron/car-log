<?php

namespace App\Http\Controllers;

use App\Http\Resources\OdometerEntryResource;
use App\OdometerEntry;
use App\Vehicle;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Response;

class OdometerEntryController extends Controller
{
    /**
     * List odometer entries for a vehicle, oldest first.
     */
    public function index(Vehicle $vehicle): AnonymousResourceCollection
    {
        return OdometerEntryResource::collection(
            $vehicle->odometerEntries()->orderBy('recorded_at')->orderBy('id')->get()
        );
    }

    /**
     * Log an odometer entry. Idempotent on client-generated uuid.
     */
    public function store(Request $request, Vehicle $vehicle): JsonResponse
    {
        $validated = $request->validate([
            'uuid' => ['required', 'uuid'],
            'value' => ['required', 'integer', 'min:0'],
            'recorded_at' => ['required', 'date'],
        ]);

        $entry = $vehicle->odometerEntries()
            ->firstOrCreate(['uuid' => $validated['uuid']], $validated);

        return (new OdometerEntryResource($entry))
            ->response()
            ->setStatusCode($entry->wasRecentlyCreated ? 201 : 200);
    }

    /**
     * Remove an odometer entry.
     */
    public function destroy(Vehicle $vehicle, OdometerEntry $odometerEntry): Response
    {
        $odometerEntry->delete();

        return response()->noContent();
    }
}
