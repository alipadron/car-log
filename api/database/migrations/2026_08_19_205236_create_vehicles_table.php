<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('vehicles', function (Blueprint $table) {
            $table->id();
            // Client-generated UUID: makes creates idempotent under outbox replay.
            $table->uuid('uuid')->unique();
            $table->string('name');
            $table->string('type');
            $table->string('make');
            $table->string('model');
            $table->unsignedSmallInteger('year');
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('vehicles');
    }
};
