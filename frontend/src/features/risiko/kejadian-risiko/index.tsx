import { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { isAxiosError } from 'axios'
import { Plus } from 'lucide-react'
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
import { RisikoNihilStatusCard } from '../shared/risiko-nihil-status-card'
import { WizardFooterNav } from '../shared/wizard-footer-nav'
import { kejadianRisikoApi } from './api'
import { KejadianDialog } from './kejadian-dialog'
import { KejadianTable } from './kejadian-table'
import type { KejadianRisikoInput, KejadianRisikoRow } from './types'

export function KejadianRisikoPage() {
  const navigate = useNavigate()
  const wizard = useRisikoWizardProgress()
  const { hasPermission } = usePermissions()
  const queryClient = useQueryClient()

  const [selectedIncident, setSelectedIncident] =
    useState<KejadianRisikoRow | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [sourceFilter, setSourceFilter] = useState('')
  const [search, setSearch] = useState('')
  const [pageState, setPageState] = useState({ context: '', page: 1 })

  const opdId = wizard.effectiveOpdId
  const periodeId = wizard.activePeriode?.id
  const context = `${opdId || ''}:${periodeId || ''}`
  const page = pageState.context === context ? pageState.page : 1
  const setPage = (value: number) => setPageState({ context, page: value })

  // 1. Fetch Incidents List
  const listQuery = useQuery({
    queryKey: [
      'kejadian-risiko-list',
      opdId,
      periodeId,
      page,
      search,
      sourceFilter,
    ],
    queryFn: () =>
      kejadianRisikoApi.list({
        opdId,
        periodeId: periodeId!,
        page,
        perPage: 20,
        search,
        source: sourceFilter,
      }),
    enabled: Boolean(opdId && periodeId),
  })

  // 2. Fetch Risk Options for Dialog
  const optionsQuery = useQuery({
    queryKey: ['kejadian-risiko-options', opdId, periodeId],
    queryFn: () => kejadianRisikoApi.getRiskOptions(opdId, periodeId!),
    enabled: Boolean(opdId && periodeId),
  })

  // 3. Store Mutation
  const storeMutation = useMutation({
    mutationFn: (data: KejadianRisikoInput) => kejadianRisikoApi.store(data),
    onSuccess: async () => {
      toast.success('Catatan kejadian risiko berhasil disimpan.')
      setIsDialogOpen(false)
      setSelectedIncident(null)
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['kejadian-risiko-list'] }),
        queryClient.invalidateQueries({
          queryKey: ['risiko-pengajuan-readiness'],
        }),
        wizard.refetchWizardProgress(),
      ])
    },
    onError: (error: unknown) => {
      const message = isAxiosError<{ message?: string }>(error)
        ? error.response?.data?.message ||
          'Gagal menyimpan catatan kejadian risiko.'
        : 'Gagal menyimpan catatan kejadian risiko.'
      toast.error(message)
    },
  })

  // 4. Update Mutation
  const updateMutation = useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string
      data: Partial<KejadianRisikoInput>
    }) => kejadianRisikoApi.update(id, data),
    onSuccess: async () => {
      toast.success('Catatan kejadian risiko berhasil diperbarui.')
      setIsDialogOpen(false)
      setSelectedIncident(null)
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['kejadian-risiko-list'] }),
        queryClient.invalidateQueries({
          queryKey: ['risiko-pengajuan-readiness'],
        }),
        wizard.refetchWizardProgress(),
      ])
    },
    onError: (error: unknown) => {
      const message = isAxiosError<{ message?: string }>(error)
        ? error.response?.data?.message ||
          'Gagal memperbarui catatan kejadian risiko.'
        : 'Gagal memperbarui catatan kejadian risiko.'
      toast.error(message)
    },
  })

  // 5. Delete Mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => kejadianRisikoApi.destroy(id),
    onSuccess: async () => {
      toast.success('Catatan kejadian risiko berhasil dihapus.')
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['kejadian-risiko-list'] }),
        queryClient.invalidateQueries({
          queryKey: ['risiko-pengajuan-readiness'],
        }),
        wizard.refetchWizardProgress(),
      ])
    },
    onError: (error: unknown) => {
      const message = isAxiosError<{ message?: string }>(error)
        ? error.response?.data?.message ||
          'Gagal menghapus catatan kejadian risiko.'
        : 'Gagal menghapus catatan kejadian risiko.'
      toast.error(message)
    },
  })

  // 6. Confirm Nihil Mutation
  const confirmNihilMutation = useMutation({
    mutationFn: (nextNihil: boolean) =>
      kejadianRisikoApi.confirmNihil({
        opd_id: opdId,
        periode_penilaian_id: periodeId!,
        is_nihil: nextNihil,
      }),
    onSuccess: async (data) => {
      toast.success(
        data.is_nihil
          ? 'Status nihil kejadian risiko berhasil dikonfirmasi.'
          : 'Konfirmasi status nihil kejadian risiko berhasil dibatalkan.'
      )
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['kejadian-risiko-list'] }),
        queryClient.invalidateQueries({
          queryKey: ['risiko-pengajuan-readiness'],
        }),
        wizard.refetchWizardProgress(),
      ])
    },
    onError: (error: unknown) => {
      const message = isAxiosError<{ message?: string }>(error)
        ? error.response?.data?.message || 'Gagal mengubah status nihil.'
        : 'Gagal mengubah status nihil.'
      toast.error(message)
    },
  })

  const submission = wizard.readiness?.submission
  const hasBeenSubmitted = Boolean(
    submission && (submission.submitted_at || submission.status !== 'draft')
  )
  const belongsToSubmission =
    !hasBeenSubmitted ||
    Boolean(submission?.items?.some((item) => item.form_code === '10'))

  const canEdit = Boolean(
    belongsToSubmission &&
      wizard.hasAuditor &&
      !wizard.isLocked &&
      !wizard.readiness?.is_10_approved &&
      (hasPermission('identifikasi_risiko_opd.edit') ||
        hasPermission('identifikasi_risiko_opd_operasional.edit') ||
        hasPermission('identifikasi_risiko_pemda.edit'))
  )

  const items = listQuery.data?.data || []
  const isNihil = listQuery.data?.is_nihil || false
  const nihilInfo = listQuery.data?.nihil_info || null
  const meta = listQuery.data?.meta
  const allRiskOptions = optionsQuery.data?.all || []

  const handleOpenAddDialog = () => {
    setSelectedIncident(null)
    setIsDialogOpen(true)
  }

  const handleOpenEditDialog = (incident: KejadianRisikoRow) => {
    setSelectedIncident(incident)
    setIsDialogOpen(true)
  }

  const handleDeleteIncident = (incident: KejadianRisikoRow) => {
    if (
      window.confirm(
        `Apakah Anda yakin ingin menghapus catatan kejadian untuk risiko "${incident.kode_risiko}"?`
      )
    ) {
      deleteMutation.mutate(incident.id)
    }
  }

  const handleDialogSubmit = (data: KejadianRisikoInput) => {
    if (selectedIncident) {
      updateMutation.mutate({ id: selectedIncident.id, data })
    } else {
      storeMutation.mutate(data)
    }
  }

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
          pageTitle='Pencatatan Kejadian Risiko (Risk Event Log) & RTP (Form 10)'
          formCode='10'
          stepNumber={13}
          currentStepId='10'
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
          Catat peristiwa risiko konkret yang terjadi pada tahun berjalan
          berdasarkan risiko teridentifikasi (3A, 3B, dan 3C), serta pantau
          realisasi pelaksanaan Rencana Tindak Pengendalian (RTP Form 6).
        </p>

        {/* 1. Status Nihil Confirmation Card */}
        <RisikoNihilStatusCard
          title='Pernyataan Status Kejadian Risiko Tahun Berjalan'
          isNihil={isNihil}
          nihilInfo={nihilInfo}
          hasItems={items.length > 0}
          canEdit={canEdit}
          isLoading={confirmNihilMutation.isPending}
          confirmedMessage='Perangkat Daerah telah mengonfirmasi bahwa tidak ada kejadian risiko nyata yang terjadi sepanjang tahun berjalan.'
          unconfirmedEmptyMessage='Jika selama tahun berjalan tidak terdapat insiden risiko yang terjadi, OPD dapat mengonfirmasi status nihil untuk melengkapi Form 10.'
          unconfirmedHasItemsMessage='Perangkat Daerah telah mencatat kejadian risiko nyata pada tabel di bawah.'
          onToggleNihil={(nextNihil) => confirmNihilMutation.mutate(nextNihil)}
        />

        {/* 2. Action Toolbar & Filter */}
        <div className='flex flex-wrap items-center justify-between gap-3'>
          <div className='flex flex-1 flex-wrap items-center gap-2'>
            <Input
              aria-label='Cari kejadian risiko'
              className='min-w-48 max-w-xs'
              placeholder='Cari sebab, dampak, kode risiko...'
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setPage(1)
              }}
            />
            <Select
              value={sourceFilter || 'all'}
              onValueChange={(val) => {
                setSourceFilter(val === 'all' ? '' : val)
                setPage(1)
              }}
            >
              <SelectTrigger className='w-full sm:w-[220px]'>
                <SelectValue placeholder='Semua Sumber Risiko' />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='all'>Semua Sumber Risiko</SelectItem>
                <SelectItem value='3a'>3A - Strategis Pemda</SelectItem>
                <SelectItem value='3b'>3B - Strategis OPD</SelectItem>
                <SelectItem value='3c'>3C - Operasional OPD</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {canEdit && (
            <Button
              size='sm'
              className='gap-1.5'
              onClick={handleOpenAddDialog}
              disabled={isNihil}
              title={
                isNihil
                  ? 'Batalkan status nihil terlebih dahulu jika ingin menambahkan kejadian'
                  : 'Tambah Catatan Kejadian'
              }
            >
              <Plus className='h-4 w-4' />
              <span>Tambah Kejadian Risiko</span>
            </Button>
          )}
        </div>

        {/* 3. Incidents Table */}
        {listQuery.isLoading ? (
          <p role='status' className='text-sm text-muted-foreground'>
            Memuat data catatan kejadian risiko...
          </p>
        ) : listQuery.isError ? (
          <div role='alert' className='space-y-2 rounded-lg border p-4'>
            <p className='text-sm text-destructive'>
              Data catatan kejadian risiko tidak dapat dimuat.
            </p>
            <Button variant='outline' size='sm' onClick={() => void listQuery.refetch()}>
              Coba lagi
            </Button>
          </div>
        ) : (
          <div className='space-y-4'>
            <KejadianTable
              items={items}
              canEdit={canEdit}
              onEdit={handleOpenEditDialog}
              onDelete={handleDeleteIncident}
              page={page}
              perPage={20}
            />

            {/* Pagination Controls */}
            {meta && meta.last_page > 1 && (
              <div className='flex items-center justify-between text-xs text-muted-foreground'>
                <span>
                  Menampilkan {items.length} dari {meta.total} catatan kejadian
                </span>
                <div className='flex items-center gap-2'>
                  <Button
                    variant='outline'
                    size='sm'
                    disabled={page <= 1}
                    onClick={() => setPage(page - 1)}
                  >
                    Sebelumnya
                  </Button>
                  <span>
                    Halaman {page} dari {meta.last_page}
                  </span>
                  <Button
                    variant='outline'
                    size='sm'
                    disabled={page >= meta.last_page}
                    onClick={() => setPage(page + 1)}
                  >
                    Selanjutnya
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 4. Bottom Navigation */}
        <WizardFooterNav
          currentStepId='10'
          isNextDisabled={!listQuery.data?.is_complete}
        />

        {/* 5. Add / Edit Dialog */}
        <KejadianDialog
          isOpen={isDialogOpen}
          onClose={() => {
            setIsDialogOpen(false)
            setSelectedIncident(null)
          }}
          initialData={selectedIncident}
          riskOptions={allRiskOptions}
          onSubmit={handleDialogSubmit}
          isLoading={storeMutation.isPending || updateMutation.isPending}
          opdId={opdId}
          periodeId={periodeId!}
        />
      </Main>
    </>
  )
}
