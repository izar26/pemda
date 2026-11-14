<?php

declare(strict_types=1);

namespace App\Http\Resources\Risiko;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class TindakPengendalianResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return (array) $this->resource;
    }
}
