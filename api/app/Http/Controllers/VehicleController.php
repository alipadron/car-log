<?php

namespace App\Http\Controllers;

use App\Http\Resources\VehicleResource;
use App\Vehicle;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Response;

class VehicleController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(): AnonymousResourceCollection
    {
        return VehicleResource::collection(
            Vehicle::orderBy('created_at')->orderBy('id')->get()
        );
    }

    /**
     * Store a newly created resource in storage.
     *
     * Creates are idempotent on the client-generated uuid: replaying an
     * accepted uuid returns the original record instead of duplicating it.
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'uuid' => ['required', 'uuid'],
            ...$this->vehicleRules(),
        ]);

        $vehicle = Vehicle::firstOrCreate(['uuid' => $validated['uuid']], $validated);

        return (new VehicleResource($vehicle))
            ->response()
            ->setStatusCode($vehicle->wasRecentlyCreated ? 201 : 200);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, Vehicle $vehicle): VehicleResource
    {
        $vehicle->update($request->validate($this->vehicleRules()));

        return new VehicleResource($vehicle);
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(Vehicle $vehicle): Response
    {
        $vehicle->delete();

        return response()->noContent();
    }

    /**
     * The shared validation rules for a vehicle's editable attributes.
     *
     * @return array<string, list<string>>
     */
    private function vehicleRules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],
            'type' => ['required', 'string', 'in:car,bike'],
            'make' => ['required', 'string', 'max:255'],
            'model' => ['required', 'string', 'max:255'],
            'year' => ['required', 'integer', 'min:1886', 'max:2100'],
        ];
    }
}
