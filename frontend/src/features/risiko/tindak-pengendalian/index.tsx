import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { isAxiosError } from 'axios'
import { toast } from 'sonner'
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
import { usePermissions } from '@/hooks/use-permissions'
import {
  RisikoWizardHeader,
  RisikoWorkflowBanners,
} from '../shared/risiko-wizard-header'
import { useRisikoWizardProgress } from '../shared/risiko-wizard-store'
import { WizardFooterNav } from '../shared/wizard-footer-nav'
import { tindakApi, type TindakInput, type TindakRow } from './api'
import { RiskCards } from './risk-cards'
import { TindakDialog } from './tindak-dialog'

export function TindakPengendalianPage({ form = '6' }: { form?: '5' | '6' }) {
  const wizard = useRisikoWizardProgress()
  const { hasPermission } = usePermissions()
  const queryClient = useQueryClient()
  const [selected, setSelected] = useState<TindakRow | null>(null)
  const [source, setSource] = useState('all')
  const [status, setStatus] = useState('all')
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
      status === 'all' ? '' : status,
    ],
    queryFn: () =>
      tindakApi.list(
        opdId,
        periodeId!,
        page,
        search,
        source === 'all' ? '' : source,
        status === 'all' ? '' : status
      ),
    enabled: Boolean(opdId && periodeId && wizard.readiness?.is_4_complete),
  })

  const save = useMutation({
    mutationFn: ({ row, data }: { row: TindakRow; data: TindakInput }) =>
      tindakApi.save(row, data),
    onSuccess: async () => {
      toast.success('Rencana tindak tersimpan.')
      setSelected(null)
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['tindak-pengendalian'] }),
        queryClient.invalidateQueries({ queryKey: ['analisis-risiko'] }),
        wizard.refetchWizardProgress(),
      ])
    },
    onError: (error: unknown) =>
      toast.error(
        isAxiosError<{ message?: string }>(error)
          ? error.response?.data?.message || 'Gagal menyimpan rencana.'
          : 'Gagal menyimpan rencana.'
      ),
  })

  const submission = wizard.readiness?.submission
  const hasBeenSubmitted = Boolean(
    submission && (submission.submitted_at || submission.status !== 'draft')
  )
  const belongsToSubmission =
    !hasBeenSubmitted ||
    Boolean(submission?.items?.some((item) => item.form_code === form))

  const canEdit = (row: TindakRow) =>
    Boolean(
      belongsToSubmission &&
        wizard.hasAuditor &&
        wizard.readiness?.is_4_complete &&
        !wizard.isLocked &&
        !wizard.readiness?.is_6_approved &&
        hasPermission(
          row.source === '3b'
            ? 'identifikasi_risiko_opd.edit'
            : 'identifikasi_risiko_opd_operasional.edit'
        )
    )

  const title =
    form === '5'
      ? 'Daftar Risiko Prioritas (Form 5)'
      : 'Rencana Tindak Pengendalian (Form 6)'

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
          pageTitle={title}
          formCode={form}
          stepNumber={form === '5' ? 8 : 9}
          currentStepId={form}
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
          {form === '5'
            ? 'Daftar ini berasal dari Form 4 yang lengkap dengan evaluasi perlu perlakuan risiko.'
            : 'Isi celah dan rencana pengendalian untuk setiap risiko prioritas.'}
        </p>

        {!wizard.readiness?.is_4_complete ? (
          <p className='rounded-lg border p-4 text-sm'>
            Lengkapi Form 4 sebelum membuka{' '}
            {form === '5' ? 'daftar risiko prioritas' : 'rencana tindak pengendalian'}.
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
                <SelectTrigger className='w-full sm:w-[180px]'>
                  <SelectValue placeholder='Semua sumber' />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='all'>Semua sumber</SelectItem>
                  <SelectItem value='3b'>Strategis OPD</SelectItem>
                  <SelectItem value='3c'>Operasional OPD</SelectItem>
                </SelectContent>
              </Select>

              {form === '6' && (
                <Select
                  value={status}
                  onValueChange={(val) => {
                    setStatus(val)
                    setPage(1)
                  }}
                >
                  <SelectTrigger className='w-full sm:w-[180px]'>
                    <SelectValue placeholder='Semua status' />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='all'>Semua status</SelectItem>
                    <SelectItem value='complete'>Lengkap</SelectItem>
                    <SelectItem value='incomplete'>Belum lengkap</SelectItem>
                  </SelectContent>
                </Select>
              )}
            </div>

            {result.isLoading ? (
              <p role='status'>Memuat data risiko...</p>
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
                form={form}
                onOpen={setSelected}
                canEdit={canEdit}
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
          currentStepId={form}
          isNextDisabled={
            form === '5'
              ? !wizard.readiness?.is_4_complete
              : !wizard.readiness?.is_6_complete
          }
        />
      </Main>

      {selected && (
        <TindakDialog
          row={selected}
          canEdit={canEdit(selected)}
          saving={save.isPending}
          onClose={() => setSelected(null)}
          onSave={(data) => save.mutate({ row: selected, data })}
        />
      )}
    </>
  )
}
