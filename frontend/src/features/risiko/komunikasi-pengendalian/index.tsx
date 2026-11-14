import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
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
import { usePermissions } from '@/hooks/use-permissions'
import {
  RisikoWizardHeader,
  RisikoWorkflowBanners,
} from '../shared/risiko-wizard-header'
import { useRisikoWizardProgress } from '../shared/risiko-wizard-store'
import { komunikasiApi, type KomunikasiInput, type KomunikasiRow } from './api'
import { KomunikasiCards } from './komunikasi-cards'
import { KomunikasiDialog } from './komunikasi-dialog'

export function KomunikasiPengendalianPage() {
  const wizard = useRisikoWizardProgress()
  const { hasPermission } = usePermissions()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [selected, setSelected] = useState<KomunikasiRow | null>(null)
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
      'komunikasi-pengendalian',
      opdId,
      periodeId,
      page,
      search,
      source,
      status,
    ],
    queryFn: () =>
      komunikasiApi.list(opdId, periodeId!, page, search, source, status),
    enabled: Boolean(opdId && periodeId && wizard.readiness?.is_6_complete),
  })

  const save = useMutation({
    mutationFn: ({
      row,
      data,
    }: {
      row: KomunikasiRow
      data: KomunikasiInput
    }) => komunikasiApi.save(row, data),
    onSuccess: async () => {
      toast.success('Pengkomunikasian pengendalian tersimpan.')
      setSelected(null)
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ['komunikasi-pengendalian'],
        }),
        wizard.refetchWizardProgress(),
      ])
    },
    onError: (error: unknown) => {
      toast.error(
        isAxiosError<{ message?: string }>(error)
          ? error.response?.data?.message || 'Gagal menyimpan komunikasi.'
          : 'Gagal menyimpan komunikasi.'
      )
    },
  })

  const submission = wizard.readiness?.submission
  const hasBeenSubmitted = Boolean(
    submission && (submission.submitted_at || submission.status !== 'draft')
  )
  const belongsToSubmission =
    !hasBeenSubmitted ||
    Boolean(submission?.items?.some((item) => item.form_code === '8'))

  const canEdit = (row: KomunikasiRow) =>
    Boolean(
      belongsToSubmission &&
        wizard.hasAuditor &&
        wizard.readiness?.is_6_complete &&
        !wizard.isLocked &&
        !wizard.readiness?.is_8_approved &&
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
          pageTitle='Pengkomunikasian Pengendalian yang Dibangun (Form 8)'
          formCode='8'
          stepNumber={11}
          currentStepId='8'
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
          Tentukan media komunikasi, penyedia dan penerima informasi, serta
          jadwal pengkomunikasian untuk setiap risiko prioritas.
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
              <select
                aria-label='Sumber risiko'
                className='h-9 rounded-md border bg-background px-2 text-sm'
                value={source}
                onChange={(e) => {
                  setSource(e.target.value)
                  setPage(1)
                }}
              >
                <option value=''>Semua sumber</option>
                <option value='3b'>Strategis OPD</option>
                <option value='3c'>Operasional OPD</option>
              </select>
              <select
                aria-label='Status kelengkapan'
                className='h-9 rounded-md border bg-background px-2 text-sm'
                value={status}
                onChange={(e) => {
                  setStatus(e.target.value)
                  setPage(1)
                }}
              >
                <option value=''>Semua status</option>
                <option value='complete'>Lengkap</option>
                <option value='incomplete'>Belum lengkap</option>
              </select>
            </div>

            {result.isLoading ? (
              <p role='status'>Memuat data komunikasi pengendalian...</p>
            ) : result.isError ? (
              <div role='alert' className='space-y-2 rounded-lg border p-4'>
                <p>Data komunikasi pengendalian tidak dapat dimuat.</p>
                <Button variant='outline' onClick={() => void result.refetch()}>
                  Coba lagi
                </Button>
              </div>
            ) : (
              <KomunikasiCards
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

        <div className='flex justify-between gap-2'>
          <Button
            variant='outline'
            onClick={() => navigate({ to: '/risiko/peta-risiko' })}
          >
            Kembali ke Peta Risiko
          </Button>
          <Button
            disabled={!wizard.readiness?.is_8_complete}
            onClick={() => navigate({ to: '/risiko/pemantauan-pengendalian' })}
          >
            Lanjut ke Form 9 (Pemantauan)
          </Button>
        </div>
      </Main>

      {selected && (
        <KomunikasiDialog
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
