import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { NavbarStatus } from '@/components/layout/navbar-status'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { ConfigDrawer } from '@/components/config-drawer'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { AlertCircle, RefreshCw } from 'lucide-react'
import {
  RisikoWizardHeader,
  RisikoWorkflowBanners,
} from '../shared/risiko-wizard-header'
import { useRisikoWizardProgress } from '../shared/risiko-wizard-store'
import { petaRisikoApi } from './api'
import { PetaRisikoView } from './components/peta-risiko-view'

export function PetaRisikoPage() {
  const wizard = useRisikoWizardProgress()
  const navigate = useNavigate()
  const [source, setSource] = useState<string>('')

  const opdId = wizard.effectiveOpdId
  const periodeId = wizard.activePeriode?.id

  const isForm4Complete = Boolean(wizard.readiness?.is_4_complete)
  const isForm6Complete = Boolean(wizard.readiness?.is_6_complete)
  const isPrerequisitesMet = isForm4Complete && isForm6Complete

  const {
    data: petaData,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['peta-risiko', opdId, periodeId, source],
    queryFn: () =>
      petaRisikoApi.get({
        opd_id: opdId,
        periode_penilaian_id: periodeId!,
        source: source || undefined,
      }),
    enabled: Boolean(opdId && periodeId),
  })

  return (
    <>
      <Header fixed>
        <Search className='me-auto' />
        <NavbarStatus />
        <ThemeSwitch />
        <ConfigDrawer />
        <ProfileDropdown />
      </Header>

      <Main className='mx-auto min-w-0 max-w-7xl space-y-4 px-3 py-4 sm:space-y-6 sm:px-6 sm:py-6'>
        <RisikoWizardHeader
          pageTitle='Peta Risiko (Form 7)'
          formCode='7'
          stepNumber={10}
          currentStepId='7'
          steps={wizard.steps}
          completedCount={wizard.completedCount}
          totalSteps={wizard.totalSteps}
          progressPercentage={wizard.progressPercentage}
          readiness={wizard.readiness}
          effectiveOpdId={opdId}
          activePeriodeId={periodeId}
          onSubmissionSuccess={wizard.refetchWizardProgress}
        />

        <RisikoWorkflowBanners readiness={wizard.readiness} />

        {!isPrerequisitesMet ? (
          <Card className='border-amber-200 dark:border-amber-800 bg-amber-50/40 dark:bg-amber-950/20'>
            <CardContent className='flex items-start gap-3 p-4 text-sm text-amber-800 dark:text-amber-200'>
              <AlertCircle className='h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5' />
              <div>
                <p className='font-semibold'>Lembar Kerja Sebelumnya Belum Lengkap</p>
                <p className='text-xs mt-0.5 text-amber-700 dark:text-amber-300'>
                  Untuk melihat pemetaan profil risiko yang akurat, pastikan Analisis Risiko (Form 4) dan Rencana Tindak Pengendalian (Form 6) telah diisi lengkap.
                </p>
              </div>
            </CardContent>
          </Card>
        ) : null}

        {isError ? (
          <Card className='border-destructive/40 bg-destructive/5'>
            <CardContent className='flex flex-col items-center justify-center p-6 text-center space-y-3'>
              <p className='text-sm text-destructive font-medium'>
                Gagal memuat data visualisasi Peta Risiko.
              </p>
              <Button
                variant='outline'
                size='sm'
                onClick={() => void refetch()}
                className='gap-2'
              >
                <RefreshCw className='h-4 w-4' />
                Coba Lagi
              </Button>
            </CardContent>
          </Card>
        ) : (
          <PetaRisikoView
            data={petaData || null}
            isLoading={isLoading}
            selectedSource={source}
            onSourceChange={setSource}
            showSourceFilter={true}
          />
        )}

        <div className='flex justify-between items-center gap-2 pt-4 border-t'>
          <Button
            variant='outline'
            onClick={() => navigate({ to: '/risiko/tindak-pengendalian' })}
          >
            Kembali ke Form 6
          </Button>

          {wizard.canSubmit && (
            <p className='text-xs text-muted-foreground'>
              Seluruh lembar kerja telah siap. Anda dapat mengajukan berkas melalui tombol di header wizard.
            </p>
          )}
        </div>
      </Main>
    </>
  )
}
