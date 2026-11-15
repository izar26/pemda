import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { isAxiosError } from 'axios'
import { toast } from 'sonner'
import { ConfigDrawer } from '@/components/config-drawer'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { NavbarStatus } from '@/components/layout/navbar-status'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
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
import { pemantauanApi, type PemantauanInput, type PemantauanRow } from './api'
import { PemantauanCards } from './pemantauan-cards'
import { PemantauanDialog } from './pemantauan-dialog'

export function PemantauanPengendalianPage() {
  const wizard = useRisikoWizardProgress()
  const { hasPermission } = usePermissions()
  const queryClient = useQueryClient()
  const [selected, setSelected] = useState<PemantauanRow | null>(null)
  const [source, setSource] = useState('')
  const [status, setStatus] = useState('')
  const [search, setSearch] = useState('')
  const [pageState, setPageState] = useState({ context: '', page: 1 })

  const opdId = wizard.effectiveOpdId
  const periodeId = wizard.activePeriode?.id
  const context = `${opdId || ''}:${periodeId || ''}`
  const page = pageState.context === context ? pageState.page : 1
  const setPage = (value: number) => setPageState({ context, page: value })

  const result = useQuery({
    queryKey: [
      'pemantauan-pengendalian',
      opdId,
      periodeId,
      page,
      search,
      source,
      status,
    ],
    queryFn: () =>
      pemantauanApi.list(opdId, periodeId!, page, search, source, status),
    enabled: Boolean(opdId && periodeId && wizard.readiness?.is_6_complete),
  })

  const save = useMutation({
    mutationFn: ({
      row,
      data,
    }: {
      row: PemantauanRow
      data: PemantauanInput
    }) => pemantauanApi.save(row, data),
    onSuccess: async () => {
      toast.success('Rancangan pemantauan pengendalian tersimpan.')
      setSelected(null)
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ['pemantauan-pengendalian'],
        }),
        wizard.refetchWizardProgress(),
      ])
    },
    onError: (error: unknown) => {
      toast.error(
        isAxiosError<{ message?: string }>(error)
          ? error.response?.data?.message || 'Gagal menyimpan pemantauan.'
          : 'Gagal menyimpan pemantauan.'
      )
    },
  })

  const submission = wizard.readiness?.submission
  const hasBeenSubmitted = Boolean(
    submission && (submission.submitted_at || submission.status !== 'draft')
  )
  const belongsToSubmission =
    !hasBeenSubmitted ||
    Boolean(submission?.items?.some((item) => item.form_code === '9'))

  const canEdit = (row: PemantauanRow) =>
    Boolean(
      belongsToSubmission &&
        wizard.hasAuditor &&
        wizard.readiness?.is_6_complete &&
        !wizard.isLocked &&
        !wizard.readiness?.is_9_approved &&
        hasPermission(
          row.source === '3b'
            ? 'identifikasi_risiko_opd.edit'
            : 'identifikasi_risiko_opd_operasional.edit'
        )
    )

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
          pageTitle='Rancangan Pemantauan atas Pengendalian Intern (Form 9)'
          formCode='9'
          stepNumber={12}
          currentStepId='9'
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
          Susun rancangan bentuk pemantauan, penanggung jawab (Irban APIP),
          serta jadwal pemantauan triwulanan atas pengendalian intern.
        </p>

        {!wizard.readiness?.is_6_complete ? (
          <p className='rounded-lg border p-4 text-sm'>
            Lengkapi Rencana Tindak Pengendalian (Form 6) terlebih dahulu.
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
                value={source || 'all'}
                onValueChange={(val) => {
                  setSource(val === 'all' ? '' : val)
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

              <Select
                value={status || 'all'}
                onValueChange={(val) => {
                  setStatus(val === 'all' ? '' : val)
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
            </div>

            {result.isLoading ? (
              <p role='status'>Memuat data pemantauan pengendalian...</p>
            ) : result.isError ? (
              <div role='alert' className='space-y-2 rounded-lg border p-4'>
                <p>Data pemantauan pengendalian tidak dapat dimuat.</p>
                <Button variant='outline' onClick={() => void result.refetch()}>
                  Coba lagi
                </Button>
              </div>
            ) : (
              <PemantauanCards
                items={result.data?.data || []}
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
          currentStepId='9'
          isNextDisabled={!wizard.readiness?.is_9_complete}
        />
      </Main>

      {selected && (
        <PemantauanDialog
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
