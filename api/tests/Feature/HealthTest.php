<?php

use Illuminate\Support\Facades\DB;

test('health endpoint reports ok with working database', function () {
    $this->getJson('/api/health')
        ->assertOk()
        ->assertExactJson([
            'status' => 'ok',
            'db' => 'ok',
        ]);

    // The endpoint must be backed by a real SQLite connection.
    expect(DB::connection()->getDriverName())->toBe('sqlite');
});
