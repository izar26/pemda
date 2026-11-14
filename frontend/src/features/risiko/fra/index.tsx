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
import { fraApi } from './api'
import { FraDialog } from './fra-dialog'
import { FraNihilCard } from './fra-nihil-card'
import { FraTable } from './fra-table'
import type { FraudRiskAssessmentInput, FraudRiskAssessmentRow } from './types'

export function FraudRiskAssessmentPage() {
  const navigate = useNavigate()
  const wizard = useRisikoWizardProgress()
  const { hasPermission } = usePermissions()
  const queryClient = useQueryClient()

  const [selectedItem, setSelectedItem] = useState<FraudRiskAssessmentRow | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [prosesBisnisFilter, setProsesBisnisFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [pageState, setPageState] = useState({ context: '', page: 1 })

  const opdId = wizard.effectiveOpdId
  const periodeId = wizard.activePeriode?.id
  const context = `${opdId || ''}:${periodeId || ''}`
  const page = pageState.context === context ? pageState.page : 1
  const setPage = (value: number) => setPageState({ context, page: value })

  // 1. Fetch List
  const listQuery = useQuery({
    queryKey: [
      'fra-list',
      opdId,
      periodeId,
      page,
      search,
      prosesBisnisFilter,
    ],
    queryFn: () =>
      fraApi.list({
        opdId,
        periodeId: periodeId!,
        page,
        perPage: 20,
        search,
        prosesBisnis: prosesBisnisFilter === 'all' ? undefined : prosesBisnisFilter,
      }),
    enabled: Boolean(opdId && periodeId),
  })

  // 2. Fetch Reference Options
  const referenceQuery = useQuery({
    queryKey: ['fra-reference-options'],
    queryFn: () => fraApi.getReferenceOptions(),
  })

  // 3. Store Mutation
  const storeMutation = useMutation({
    mutationFn: (data: FraudRiskAssessmentInput) => fraApi.store(data),
    onSuccess: async () => {
      toast.success('Catatan penilaian risiko kecurangan (FRA) berhasil disimpan.')
      setIsDialogOpen(false)
      setSelectedItem(null)
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['fra-list'] }),
        queryClient.invalidateQueries({ queryKey: ['risiko-pengajuan-readiness'] }),
        wizard.refetchWizardProgress(),
      ])
    },
    onError: (error: unknown) => {
      const message = isAxiosError<{ message?: string }>(error)
        ? error.response?.data?.message || 'Gagal menyimpan catatan risiko kecurangan.'
        : 'Gagal menyimpan catatan risiko kecurangan.'
      toast.error(message)
    },
  })

  // 4. Update Mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<FraudRiskAssessmentInput> }) =>
      fraApi.update(id, data),
    onSuccess: async () => {
      toast.success('Catatan risiko kecurangan berhasil diperbarui.')
      setIsDialogOpen(false)
      setSelectedItem(null)
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['fra-list'] }),
        queryClient.invalidateQueries({ queryKey: ['risiko-pengajuan-readiness'] }),
        wizard.refetchWizardProgress(),
      ])
    },
    onError: (error: unknown) => {
      const message = isAxiosError<{ message?: string }>(error)
        ? error.response?.data?.message || 'Gagal memperbarui catatan risiko kecurangan.'
        : 'Gagal memperbarui catatan risiko kecurangan.'
      toast.error(message)
    },
  })

  // 5. Delete Mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => fraApi.destroy(id),
    onSuccess: async () => {
      toast.success('Catatan risiko kecurangan berhasil dihapus.')
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['fra-list'] }),
        queryClient.invalidateQueries({ queryKey: ['risiko-pengajuan-readiness'] }),
        wizard.refetchWizardProgress(),
      ])
    },
    onError: (error: unknown) => {
      const message = isAxiosError<{ message?: string }>(error)
        ? error.response?.data?.message || 'Gagal menghapus catatan risiko kecurangan.'
        : 'Gagal menghapus catatan risiko kecurangan.'
      toast.error(message)
    },
  })

  // 6. Confirm Nihil Mutation
  const nihilMutation = useMutation({
    mutationFn: (isNihil: boolean) =>
      fraApi.confirmNihil({
        opd_id: opdId,
        periode_penilaian_id: periodeId!,
        is_nihil: isNihil,
      }),
    onSuccess: async (_, isNihil) => {
      toast.success(
        isNihil
          ? 'Pernyataan Status Nihil FRA berhasil dikonfirmasi.'
          : 'Status Nihil FRA dibatalkan.'
      )
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['fra-list'] }),
        queryClient.invalidateQueries({ queryKey: ['risiko-pengajuan-readiness'] }),
        wizard.refetchWizardProgress(),
      ])
    },
    onError: (error: unknown) => {
      const message = isAxiosError<{ message?: string }>(error)
        ? error.response?.data?.message || 'Gagal memperbarui status nihil risiko kecurangan.'
        : 'Gagal memperbarui status nihil risiko kecurangan.'
      toast.error(message)
    },
  })

  const submission = wizard.readiness?.submission
  const hasBeenSubmitted = Boolean(
    submission && (submission.submitted_at || submission.status !== 'draft')
  )
  const belongsToSubmission =
    !hasBeenSubmitted ||
    Boolean(submission?.items?.some((item) => item.form_code === 'fra'))

  const canEdit = Boolean(
    belongsToSubmission &&
      wizard.hasAuditor &&
      !wizard.isLocked &&
      !wizard.readiness?.is_fra_approved &&
      (hasPermission('identifikasi_risiko_opd.edit') ||
        hasPermission('identifikasi_risiko_opd_operasional.edit') ||
        hasPermission('identifikasi_risiko_pemda.edit'))
  )

  const data = listQuery.data
  const items = data?.data || []
  const hasItems = items.length > 0
  const isNihil = Boolean(data?.is_nihil)

  const handleEdit = (item: FraudRiskAssessmentRow) => {
    setSelectedItem(item)
    setIsDialogOpen(true)
  }

  const handleDelete = (item: FraudRiskAssessmentRow) => {
    if (
      window.confirm(
        `Apakah Anda yakin ingin menghapus catatan risiko kecurangan "${item.identifikasi_risiko_kecurangan}"?`
      )
    ) {
      deleteMutation.mutate(item.id)
    }
  }

  const handleDialogSubmit = (formData: FraudRiskAssessmentInput) => {
    if (selectedItem) {
      updateMutation.mutate({ id: selectedItem.id, data: formData })
    } else {
      storeMutation.mutate(formData)
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
          pageTitle='Penilaian Risiko Kecurangan (Fraud Risk Assessment / FRA)'
          formCode='fra'
          stepNumber={14}
          currentStepId='fra'
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

        {/* 1. Nihil Confirmation Card */}
        <FraNihilCard
          isNihil={isNihil}
          nihilInfo={data?.nihil_info}
          hasItems={hasItems}
          canEdit={canEdit}
          isLoading={nihilMutation.isPending}
          onToggleNihil={(nextNihil) => nihilMutation.mutate(nextNihil)}
        />

        {/* 2. Filter Bar & Add Button */}
        {!isNihil && (
          <div className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
            <div className='flex flex-1 flex-wrap items-center gap-2'>
              <Input
                placeholder='Cari proses bisnis, skenario, mitigasi...'
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value)
                  setPage(1)
                }}
                className='w-full sm:max-w-xs'
              />

              <Select
                value={prosesBisnisFilter}
                onValueChange={(val) => {
                  setProsesBisnisFilter(val)
                  setPage(1)
                }}
              >
                <SelectTrigger className='w-full sm:w-[220px]'>
                  <SelectValue placeholder='Semua Proses Bisnis' />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='all'>Semua Proses Bisnis</SelectItem>
                  {referenceQuery.data?.preset_proses_bisnis?.map((p) => (
                    <SelectItem key={p} value={p}>
                      {p}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {canEdit && (
              <Button
                onClick={() => {
                  setSelectedItem(null)
                  setIsDialogOpen(true)
                }}
                className='gap-1.5'
              >
                <Plus className='h-4 w-4' />
                Tambah Catatan FRA
              </Button>
            )}
          </div>
        )}

        {/* 3. Main Data Table */}
        {!isNihil && (
          <div className='space-y-4'>
            <FraTable
              items={items}
              canEdit={canEdit}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />

            {data?.meta && data.meta.total > data.meta.per_page && (
              <div className='flex items-center justify-between text-xs text-muted-foreground'>
                <span>
                  Menampilkan {(data.meta.current_page - 1) * data.meta.per_page + 1} -{' '}
                  {Math.min(data.meta.current_page * data.meta.per_page, data.meta.total)}{' '}
                  dari {data.meta.total} catatan
                </span>
                <div className='flex gap-1'>
                  <Button
                    variant='outline'
                    size='sm'
                    disabled={data.meta.current_page <= 1}
                    onClick={() => setPage(data.meta.current_page - 1)}
                  >
                    Sebelumnya
                  </Button>
                  <Button
                    variant='outline'
                    size='sm'
                    disabled={data.meta.current_page >= data.meta.last_page}
                    onClick={() => setPage(data.meta.current_page + 1)}
                  >
                    Selanjutnya
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 4. Bottom Navigation */}
        <div className='flex justify-between gap-2 pt-2'>
          <Button
            variant='outline'
            onClick={() => navigate({ to: '/risiko/kejadian-risiko' })}
          >
            Kembali ke Form 10 (Kejadian Risiko)
          </Button>
        </div>

        {/* 5. Add / Edit Dialog */}
        <FraDialog
          isOpen={isDialogOpen}
          onClose={() => {
            setIsDialogOpen(false)
            setSelectedItem(null)
          }}
          initialData={selectedItem}
          referenceOptions={referenceQuery.data}
          onSubmit={handleDialogSubmit}
          isLoading={storeMutation.isPending || updateMutation.isPending}
          opdId={opdId}
          periodeId={periodeId!}
        />
      </Main>
    </>
  )
}
