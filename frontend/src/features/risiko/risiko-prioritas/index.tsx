import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { NavbarStatus } from '@/components/layout/navbar-status'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { ConfigDrawer } from '@/components/config-drawer'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  RisikoWizardHeader,
  RisikoWorkflowBanners,
} from '../shared/risiko-wizard-header'
import { useRisikoWizardProgress } from '../shared/risiko-wizard-store'
import { WizardFooterNav } from '../shared/wizard-footer-nav'
import { tindakApi } from '../tindak-pengendalian/api'
import { RiskCards } from '../tindak-pengendalian/risk-cards'

export function RisikoPrioritasPage() {
  const wizard = useRisikoWizardProgress()
  const [source, setSource] = useState('all')
  const [search, setSearch] = useState('')
  const [pageState, setPageState] = useState({ context: '', page: 1 })

  const opdId = wizard.effectiveOpdId
  const periodeId = wizard.activePeriode?.id
  const context = `${opdId || ''}:${periodeId || ''}`
  const page = pageState.context === context ? pageState.page : 1
  const setPage = (value: number) => setPageState({ context, page: value })

  const result = useQuery({
    queryKey: [
      'tindak-pengendalian',
      opdId,
      periodeId,
      page,
      search,
      source === 'all' ? '' : source,
      '',
    ],
    queryFn: () =>
      tindakApi.list(
        opdId,
        periodeId!,
        page,
        search,
        source === 'all' ? '' : source,
        ''
      ),
    enabled: Boolean(opdId && periodeId && wizard.readiness?.is_4_complete),
  })

  const submission = wizard.readiness?.submission
  const hasBeenSubmitted = Boolean(
    submission && (submission.submitted_at || submission.status !== 'draft')
  )
  const belongsToSubmission =
    !hasBeenSubmitted ||
    Boolean(submission?.items?.some((item) => item.form_code === '5'))

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
          pageTitle='Daftar Risiko Prioritas (Form 5)'
          formCode='5'
          stepNumber={8}
          currentStepId='5'
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
        {!belongsToSubmission && (
          <p className='rounded-lg border bg-muted/40 p-3 text-sm'>
            Formulir ini tidak termasuk dalam pengajuan yang telah dikirim dan
            hanya dapat dilihat.
          </p>
        )}
        <p className='text-sm text-muted-foreground'>
          Daftar ini berasal dari Form 4 yang lengkap dengan evaluasi perlu
          perlakuan risiko.
        </p>

        {!wizard.readiness?.is_4_complete ? (
          <p className='rounded-lg border p-4 text-sm'>
            Lengkapi Form 4 sebelum membuka daftar risiko prioritas.
          </p>
        ) : (
          <>
            <div className='flex flex-wrap gap-2 rounded-lg border bg-card p-3'>
              <Input
                aria-label='Cari risiko'
                className='min-w-48 flex-1'
                placeholder='Cari kode atau pernyataan risiko'
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value)
                  setPage(1)
                }}
              />
              <Select
                value={source}
                onValueChange={(val) => {
                  setSource(val)
                  setPage(1)
                }}
              >
                <SelectTrigger className='w-full sm:w-[200px]'>
                  <SelectValue placeholder='Semua sumber' />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='all'>Semua sumber</SelectItem>
                  <SelectItem value='3b'>Strategis OPD</SelectItem>
                  <SelectItem value='3c'>Operasional OPD</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {result.isLoading ? (
              <p role='status'>Memuat risiko prioritas...</p>
            ) : result.isError ? (
              <div role='alert'>
                <p>Daftar risiko tidak dapat dimuat.</p>
                <Button variant='outline' onClick={() => void result.refetch()}>
                  Coba lagi
                </Button>
              </div>
            ) : (
              <RiskCards
                items={result.data?.data || []}
                form='5'
                onOpen={() => {}}
                canEdit={() => false}
              />
            )}

            {result.data && (
              <div className='flex items-center justify-between text-xs'>
                <span>
                  {result.data.meta.total} risiko · Halaman{' '}
                  {result.data.meta.current_page} dari{' '}
                  {result.data.meta.last_page}
                </span>
                <div className='flex gap-2'>
                  <Button
                    variant='outline'
                    size='sm'
                    disabled={page <= 1}
                    onClick={() => setPage(page - 1)}
                  >
                    Sebelumnya
                  </Button>
                  <Button
                    variant='outline'
                    size='sm'
                    disabled={page >= result.data.meta.last_page}
                    onClick={() => setPage(page + 1)}
                  >
                    Berikutnya
                  </Button>
                </div>
              </div>
            )}
          </>
        )}

        <WizardFooterNav
          currentStepId='5'
          isNextDisabled={!wizard.readiness?.is_4_complete}
        />
      </Main>
    </>
  )
}
