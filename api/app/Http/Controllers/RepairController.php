<?php

namespace App\Http\Controllers;

use App\Http\Resources\RepairResource;
use App\Repair;
use App\Vehicle;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Response;

class RepairController extends Controller
{
    /**
     * List repairs for a vehicle, oldest first.
     */
    public function index(Vehicle $vehicle): AnonymousResourceCollection
    {
        return RepairResource::collection(
            $vehicle->repairs()->orderBy('performed_at')->orderBy('id')->get()
        );
    }

    /**
     * Log a repair. Idempotent on client-generated uuid.
     */
    public function store(Request $request, Vehicle $vehicle): JsonResponse
    {
        $validated = $request->validate([
            'uuid' => ['required', 'uuid'],
            'title' => ['required', 'string', 'max:255'],
            'notes' => ['nullable', 'string'],
            'cost' => ['nullable', 'numeric', 'min:0'],
            'performed_at' => ['required', 'date'],
            'odometer_value' => ['required', 'integer', 'min:0'],
        ]);

        $repair = $vehicle->repairs()
            ->firstOrCreate(['uuid' => $validated['uuid']], $validated);

        return (new RepairResource($repair))
            ->response()
            ->setStatusCode($repair->wasRecentlyCreated ? 201 : 200);
    }

    /**
     * Remove a repair.
     */
    public function destroy(Vehicle $vehicle, Repair $repair): Response
    {
        $repair->delete();

        return response()->noContent();
    }
}
