<?php

declare(strict_types=1);

namespace App\Services\Risiko\Registry;

use App\Contracts\Risiko\RiskFormHandlerInterface;
use App\Models\Risiko\PengajuanPenilaianRisiko;
use Illuminate\Support\Collection;

class RiskFormRegistry
{
    /**
     * @var array<string, class-string<RiskFormHandlerInterface>>
     */
    protected array $handlerClasses = [];

    /**
     * @var array<string, RiskFormHandlerInterface>
     */
    protected array $instances = [];

    /**
     * Register a handler class name lazily without instantiating it.
     *
     * @param  class-string<RiskFormHandlerInterface>  $handlerClass
     */
    public function register(string|int $code, string $handlerClass): void
    {
        $this->handlerClasses[strtolower(trim((string) $code))] = $handlerClass;
    }

    public function get(string|int $code): RiskFormHandlerInterface
    {
        $clean = strtolower(trim((string) $code));

        if (isset($this->instances[$clean])) {
            return $this->instances[$clean];
        }

        if (! isset($this->handlerClasses[$clean])) {
            abort(404, "Handler formulir risiko [{$code}] tidak ditemukan.");
        }

        /** @var RiskFormHandlerInterface $instance */
        $instance = app($this->handlerClasses[$clean]);

        return $this->instances[$clean] = $instance;
    }

    public function has(string|int $code): bool
    {
        return isset($this->handlerClasses[strtolower(trim((string) $code))]);
    }

    /**
     * @return Collection<string, RiskFormHandlerInterface>
     */
    public function all(): Collection
    {
        $collection = collect();
        foreach (array_keys($this->handlerClasses) as $code) {
            $stringCode = (string) $code;
            $collection->put($stringCode, $this->get($stringCode));
        }

        return $collection->sortBy(fn (RiskFormHandlerInterface $h) => $h->getOrder());
    }

    /**
     * @return array<int, string>
     */
    public function getCodes(): array
    {
        return array_map('strval', array_keys($this->handlerClasses));
    }

    /**
     * @return array<int, string>
     */
    public function getRequiredCodes(PengajuanPenilaianRisiko $submission): array
    {
        return $this->all()
            ->filter(fn (RiskFormHandlerInterface $h) => $h->isRequired($submission))
            ->keys()
            ->map('strval')
            ->values()
            ->all();
    }
}
