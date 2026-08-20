<?php

namespace App\Http\Controllers;

use App\Http\Resources\MaintenanceEventResource;
use App\MaintenanceEvent;
use App\Vehicle;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class MaintenanceEventController extends Controller
{
    /**
     * List maintenance events for a vehicle, newest first.
     */
    public function index(Vehicle $vehicle): AnonymousResourceCollection
    {
        return MaintenanceEventResource::collection(
            $vehicle->maintenanceEvents()->orderByDesc('performed_at')->orderByDesc('id')->get()
        );
    }

    /**
     * Log a maintenance event (against a schedule or as a one-off).
     * Idempotent on client-generated uuid.
     */
    public function store(Request $request, Vehicle $vehicle): JsonResponse
    {
        $validated = $request->validate([
            'uuid' => ['required', 'uuid'],
            'schedule_id' => ['nullable', 'exists:maintenance_schedules,id'],
            'notes' => ['nullable', 'string'],
            'cost' => ['nullable', 'numeric', 'min:0'],
            'performed_at' => ['required', 'date'],
            'odometer_value' => ['required', 'integer', 'min:0'],
        ]);

        $event = $vehicle->maintenanceEvents()
            ->firstOrCreate(['uuid' => $validated['uuid']], $validated);

        return (new MaintenanceEventResource($event))
            ->response()
            ->setStatusCode($event->wasRecentlyCreated ? 201 : 200);
    }
}
