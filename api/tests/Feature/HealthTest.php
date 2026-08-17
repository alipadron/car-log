<?php

namespace Tests\Feature;

use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class HealthTest extends TestCase
{
    public function test_health_endpoint_reports_ok_with_working_database(): void
    {
        $response = $this->getJson('/api/health');

        $response->assertOk()->assertExactJson([
            'status' => 'ok',
            'db' => 'ok',
        ]);

        // The endpoint must be backed by a real SQLite connection.
        $this->assertSame('sqlite', DB::connection()->getDriverName());
    }
}
