<?php

declare(strict_types=1);

namespace App\Providers;

use App\Services\Risiko\Handlers\AnalisisRisiko4Handler;
use App\Services\Risiko\Handlers\IdentifikasiOpd3BHandler;
use App\Services\Risiko\Handlers\IdentifikasiOperasional3CHandler;
use App\Services\Risiko\Handlers\IdentifikasiPemda3AHandler;
use App\Services\Risiko\Handlers\KomunikasiPengendalian8Handler;
use App\Services\Risiko\Handlers\KonteksOperasional2CHandler;
use App\Services\Risiko\Handlers\KonteksPenilaian2BHandler;
use App\Services\Risiko\Handlers\PemantauanPengendalian9Handler;
use App\Services\Risiko\Handlers\PetaRisiko7Handler;
use App\Services\Risiko\Handlers\RisikoPrioritas5Handler;
use App\Services\Risiko\Handlers\RootCauseAnalysisHandler;
use App\Services\Risiko\Handlers\TindakPengendalian6Handler;
use App\Services\Risiko\Registry\RiskFormRegistry;
use Illuminate\Support\ServiceProvider;

class RiskFormServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->app->singleton(RiskFormRegistry::class, function () {
            $registry = new RiskFormRegistry;

            $registry->register('2b', KonteksPenilaian2BHandler::class);
            $registry->register('2c', KonteksOperasional2CHandler::class);
            $registry->register('3a', IdentifikasiPemda3AHandler::class);
            $registry->register('3b', IdentifikasiOpd3BHandler::class);
            $registry->register('3c', IdentifikasiOperasional3CHandler::class);
            $registry->register('rca', RootCauseAnalysisHandler::class);
            $registry->register('4', AnalisisRisiko4Handler::class);
            $registry->register('5', RisikoPrioritas5Handler::class);
            $registry->register('6', TindakPengendalian6Handler::class);
            $registry->register('7', PetaRisiko7Handler::class);
            $registry->register('8', KomunikasiPengendalian8Handler::class);
            $registry->register('9', PemantauanPengendalian9Handler::class);

            return $registry;
        });
    }

    public function boot(): void {}
}
