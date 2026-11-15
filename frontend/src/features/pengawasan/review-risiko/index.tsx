import { useMemo, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  AlertCircle,
  Building2,
  CheckCircle2,
  Clock,
  FileEdit,
  Loader2,
  RefreshCw,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ConfigDrawer } from '@/components/config-drawer'
import { KpiStatsCards, type KpiStatItem } from '@/components/kpi-stat-cards'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { NavbarStatus } from '@/components/layout/navbar-status'
import { PageHeader } from '@/components/layout/page-header'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { pengajuanRisikoService } from '@/services/pengajuan-risiko-service'
import { perencanaanService } from '@/services/perencanaan-service'
import { ReviewRisikoWizard } from './components/review-risiko-wizard'
import { ReviewTable } from './components/review-table'
import type { StatusCategory } from './components/review-columns'

export function ReviewRisikoManagement() {
  const queryClient = useQueryClient()
  const [statusFilter, setStatusFilter] = useState<StatusCategory | 'semua'>('semua')

  // Review Dialog / Wizard state
  const [activeReview, setActiveReview] = useState<{
    submissionId: string
    opdId: string
    periodeId: string
  } | null>(null)

  // 1. Fetch active evaluation period
  const { data: activePeriode } = useQuery({
    queryKey: ['periode-active'],
    queryFn: () => perencanaanService.getActivePeriode(),
    staleTime: 60_000,
  })

  // 2. Fetch list of OPD submissions
  const {
    data: reviewResponse,
    isLoading,
    isRefetching,
    refetch,
  } = useQuery({
    queryKey: ['pengawasan', 'review-list', activePeriode?.id],
    queryFn: () =>
      pengajuanRisikoService.getAuditorReviewList({
        periode_penilaian_id: activePeriode?.id,
        per_page: 200,
      }),
    enabled: Boolean(activePeriode?.id),
    staleTime: 30_000,
  })

  const rawOpdList = useMemo(
    () => reviewResponse?.data || [],
    [reviewResponse?.data]
  )

  // Calculate accurate summary metrics
  const metrics = useMemo(() => {
    const total = rawOpdList.length
    let menunggu = 0
    let revisi = 0
    let disetujui = 0
    let belumKirim = 0

    for (const opd of rawOpdList) {
      const s = opd.pengajuan_risiko?.[0]?.status
      if (!s || s === 'draft') {
        belumKirim++
      } else if (
        s === 'submitted' ||
        s === 'in_review' ||
        s === 'submitted_to_kepala_opd' ||
        s === 'submitted_to_auditor' ||
        s === 'in_review_auditor' ||
        s === 'submitted_to_pengawas' ||
        s === 'in_review_pengawas'
      ) {
        menunggu++
      } else if (
        s === 'revision_requested' ||
        s === 'revision_by_kepala_opd' ||
        s === 'revision_by_auditor' ||
        s === 'revision_to_operator' ||
        s === 'revision_by_pengawas'
      ) {
        revisi++
      } else if (s === 'approved') {
        disetujui++
      }
    }

    return { total, menunggu, revisi, disetujui, belumKirim }
  }, [rawOpdList])

  // KPI Items using the standard unified KpiStatsCards
  const kpiItems: KpiStatItem[] = useMemo(
    () => [
      {
        title: 'Total Binaan',
        value: metrics.total,
        subtitle: 'Perangkat Daerah',
        icon: Building2,
        color: 'bg-primary/10 text-primary',
        onClick: () => setStatusFilter('semua'),
        isActive: statusFilter === 'semua',
        activeClassName: 'border-primary ring-2 ring-primary/20 bg-primary/5',
      },
      {
        title: 'Menunggu Review',
        value: metrics.menunggu,
        subtitle: 'Perlu Diperiksa',
        icon: Clock,
        color: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
        valueColor: 'text-amber-600 dark:text-amber-400',
        onClick: () => setStatusFilter('submitted'),
        isActive: statusFilter === 'submitted',
        activeClassName:
          'border-amber-500 ring-2 ring-amber-500/20 bg-amber-500/5',
      },
      {
        title: 'Perlu Revisi',
        value: metrics.revisi,
        subtitle: 'Catatan Perbaikan',
        icon: AlertCircle,
        color: 'bg-destructive/10 text-destructive',
        valueColor: 'text-destructive',
        onClick: () => setStatusFilter('revision_requested'),
        isActive: statusFilter === 'revision_requested',
        activeClassName:
          'border-destructive ring-2 ring-destructive/20 bg-destructive/5',
      },
      {
        title: 'Telah Disetujui',
        value: metrics.disetujui,
        subtitle: 'Final Disetujui',
        icon: CheckCircle2,
        color: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
        valueColor: 'text-emerald-600 dark:text-emerald-400',
        onClick: () => setStatusFilter('approved'),
        isActive: statusFilter === 'approved',
        activeClassName:
          'border-emerald-500 ring-2 ring-emerald-500/20 bg-emerald-500/5',
      },
      {
        title: 'Belum Mengirim',
        value: metrics.belumKirim,
        subtitle: 'Belum Ada Draf',
        icon: FileEdit,
        color: 'bg-muted text-muted-foreground',
        valueColor: 'text-muted-foreground',
        onClick: () => setStatusFilter('belum_mengirim'),
        isActive: statusFilter === 'belum_mengirim',
        activeClassName:
          'border-muted-foreground/60 ring-2 ring-muted/40 bg-muted/20',
      },
    ],
    [metrics, statusFilter]
  )

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ['pengawasan'] })
    refetch()
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

      <Main className='flex flex-1 flex-col gap-5 sm:gap-6'>
        {activeReview ? (
          <ReviewRisikoWizard
            submissionId={activeReview.submissionId}
            opdId={activeReview.opdId}
            periodeId={activeReview.periodeId}
            onBack={() => setActiveReview(null)}
            onSuccess={() => {
              queryClient.invalidateQueries({ queryKey: ['pengawasan'] })
            }}
          />
        ) : (
          <>
            {/* 1. Page Header: Consistent standard without icon in H2 and with Total count */}
            <PageHeader className='flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between'>
              <div className='min-w-0 flex-1 space-y-1'>
                <h2 className='text-2xl font-bold tracking-tight text-foreground'>
                  Review Risiko Perangkat Daerah (Total: {rawOpdList.length})
                </h2>
                <p className='text-xs text-muted-foreground'>
                  Telaah berjenjang internal pimpinan OPD, pemeriksaan kepatuhan
                  evaluator Inspektorat, dan pengesahan final Pengawas.
                </p>
              </div>

              <div className='flex shrink-0 items-center gap-2'>
                <Button
                  variant='outline'
                  size='sm'
                  className='h-9 text-xs'
                  onClick={handleRefresh}
                  disabled={isLoading || isRefetching}
                >
                  <RefreshCw
                    className={`mr-1.5 h-3.5 w-3.5 ${isRefetching ? 'animate-spin' : ''}`}
                  />
                  Segarkan
                </Button>
              </div>
            </PageHeader>

            {/* 2. Interactive KPI / Metric Summary Cards */}
            <KpiStatsCards
              items={kpiItems}
              isLoading={isLoading}
              count={5}
              className='grid-cols-2 sm:grid-cols-3 lg:grid-cols-5'
            />

            {/* 3. Standard TanStack Data Table */}
            {isLoading ? (
              <div className='flex flex-col items-center justify-center h-64 gap-2 rounded-lg border bg-card/50'>
                <Loader2 className='h-8 w-8 animate-spin text-primary' />
                <p className='text-xs text-muted-foreground'>
                  Memuat daftar pengajuan risiko perangkat daerah...
                </p>
              </div>
            ) : (
              <ReviewTable
                data={rawOpdList}
                onOpenReview={setActiveReview}
                activePeriodeId={activePeriode?.id}
                statusFilter={statusFilter}
                onStatusFilterChange={setStatusFilter}
              />
            )}
          </>
        )}
      </Main>
    </>
  )
}

export default ReviewRisikoManagement
