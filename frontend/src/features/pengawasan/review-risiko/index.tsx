import { useState, useEffect, useMemo } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  pengajuanRisikoService,
  type OpdReviewListItem,
  type PengajuanPenilaianRisiko,
} from '@/services/pengajuan-risiko-service'
import { perencanaanService } from '@/services/perencanaan-service'
import {
  AlertCircle,
  Building2,
  CheckCircle2,
  ClipboardCheck,
  Clock,
  Eye,
  FileEdit,
  Loader2,
  RefreshCw,
  Search as SearchIcon,
  User,
  X,
  XCircle,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { ConfigDrawer } from '@/components/config-drawer'
import { KpiStatsCards, type KpiStatItem } from '@/components/kpi-stat-cards'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { NavbarStatus } from '@/components/layout/navbar-status'
import { PageHeader } from '@/components/layout/page-header'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { ReviewRisikoWizard } from './components/review-risiko-wizard'

type StatusFilter =
  | 'semua'
  | 'submitted'
  | 'revision_requested'
  | 'approved'
  | 'belum_mengirim'
type TierFilter = 'all' | 'kepala' | 'auditor' | 'pengawas' | 'approved' | 'opd'

export function ReviewRisikoManagement() {
  const queryClient = useQueryClient()
  const [searchTerm, setSearchTerm] = useState('')
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('semua')
  const [tierFilter, setTierFilter] = useState<TierFilter>('all')

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm)
    }, 300)
    return () => clearTimeout(timer)
  }, [searchTerm])

  // Review Dialog state
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

  // Tier Counts for Berjenjang Tabs
  const tierCounts = useMemo(() => {
    let kepala = 0
    let auditor = 0
    let pengawas = 0
    let approved = 0
    let opd = 0

    for (const item of rawOpdList) {
      const s = item.pengajuan_risiko?.[0]?.status
      if (s === 'submitted_to_kepala_opd' || s === 'revision_by_auditor') {
        kepala++
      } else if (
        s === 'submitted_to_auditor' ||
        s === 'in_review_auditor' ||
        s === 'revision_by_pengawas' ||
        s === 'submitted' ||
        s === 'in_review'
      ) {
        auditor++
      } else if (s === 'submitted_to_pengawas' || s === 'in_review_pengawas') {
        pengawas++
      } else if (s === 'approved') {
        approved++
      } else {
        opd++
      }
    }

    return { all: rawOpdList.length, kepala, auditor, pengawas, approved, opd }
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
        subtitle: 'Belum Ada Draft',
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

  // Filtered OPDs based on search term & status filter
  const filteredOpdList = useMemo(() => {
    let list = rawOpdList

    if (debouncedSearchTerm.trim()) {
      const term = debouncedSearchTerm.toLowerCase().trim()
      list = list.filter((opd) => {
        const matchName = opd.nama?.toLowerCase().includes(term)
        const matchKode = opd.kode?.toLowerCase().includes(term)
        const matchAuditor = opd.auditor_assignments?.some(
          (a) =>
            a.auditor?.name?.toLowerCase().includes(term) ||
            a.auditor?.nip?.toLowerCase().includes(term)
        )
        return matchName || matchKode || matchAuditor
      })
    }

    if (statusFilter !== 'semua') {
      list = list.filter((opd) => {
        const s = opd.pengajuan_risiko?.[0]?.status
        if (statusFilter === 'submitted') {
          return (
            s === 'submitted' ||
            s === 'in_review' ||
            s === 'submitted_to_kepala_opd' ||
            s === 'submitted_to_auditor' ||
            s === 'in_review_auditor' ||
            s === 'submitted_to_pengawas' ||
            s === 'in_review_pengawas'
          )
        }
        if (statusFilter === 'revision_requested') {
          return (
            s === 'revision_requested' ||
            s === 'revision_by_kepala_opd' ||
            s === 'revision_by_auditor' ||
            s === 'revision_to_operator' ||
            s === 'revision_by_pengawas'
          )
        }
        if (statusFilter === 'approved') {
          return s === 'approved'
        }
        if (statusFilter === 'belum_mengirim') {
          return !s || s === 'draft'
        }
        return true
      })
    }

    if (tierFilter !== 'all') {
      list = list.filter((opd) => {
        const s = opd.pengajuan_risiko?.[0]?.status
        if (tierFilter === 'kepala') {
          return s === 'submitted_to_kepala_opd' || s === 'revision_by_auditor'
        }
        if (tierFilter === 'auditor') {
          return (
            s === 'submitted_to_auditor' ||
            s === 'in_review_auditor' ||
            s === 'revision_by_pengawas' ||
            s === 'submitted' ||
            s === 'in_review'
          )
        }
        if (tierFilter === 'pengawas') {
          return s === 'submitted_to_pengawas' || s === 'in_review_pengawas'
        }
        if (tierFilter === 'approved') {
          return s === 'approved'
        }
        if (tierFilter === 'opd') {
          return (
            !s ||
            s === 'draft' ||
            s === 'revision_by_kepala_opd' ||
            s === 'revision_to_operator'
          )
        }
        return true
      })
    }

    return list
  }, [rawOpdList, debouncedSearchTerm, statusFilter, tierFilter])

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ['pengawasan'] })
    refetch()
  }

  const getStatusBadge = (
    submission?: Partial<PengajuanPenilaianRisiko> | null
  ) => {
    if (!submission || submission.status === 'draft') {
      return (
        <Badge
          variant='outline'
          className='gap-1.5 border-dashed bg-muted/40 px-2 py-0.5 text-xs font-normal text-muted-foreground'
        >
          <Clock className='h-3 w-3 text-muted-foreground' />
          Belum Mengirim
        </Badge>
      )
    }

    switch (submission.status) {
      case 'submitted_to_kepala_opd':
        return (
          <Badge className='gap-1.5 border border-sky-500/30 bg-sky-500/15 px-2.5 py-0.5 text-xs font-medium text-sky-700 shadow-2xs dark:text-sky-400'>
            <Clock className='h-3 w-3 animate-pulse text-sky-600' />
            Review Kepala OPD
          </Badge>
        )
      case 'revision_by_kepala_opd':
        return (
          <Badge className='gap-1.5 border border-destructive/30 bg-destructive/15 px-2.5 py-0.5 text-xs font-medium text-destructive shadow-2xs'>
            <XCircle className='h-3 w-3 text-destructive' />
            Revisi Kepala OPD
          </Badge>
        )
      case 'submitted_to_auditor':
      case 'in_review_auditor':
      case 'submitted':
      case 'in_review':
        return (
          <Badge className='gap-1.5 border border-amber-500/30 bg-amber-500/15 px-2.5 py-0.5 text-xs font-medium text-amber-700 shadow-2xs dark:text-amber-400'>
            <Clock className='h-3 w-3 animate-pulse text-amber-600 dark:text-amber-400' />
            Pemeriksaan Auditor
          </Badge>
        )
      case 'revision_by_auditor':
        return (
          <Badge className='gap-1.5 border border-amber-500/30 bg-amber-500/15 px-2.5 py-0.5 text-xs font-medium text-amber-800 shadow-2xs dark:text-amber-300'>
            <AlertCircle className='h-3 w-3 text-amber-600' />
            Revisi dari Auditor
          </Badge>
        )
      case 'revision_to_operator':
        return (
          <Badge className='gap-1.5 border border-destructive/30 bg-destructive/15 px-2.5 py-0.5 text-xs font-medium text-destructive shadow-2xs'>
            <XCircle className='h-3 w-3 text-destructive' />
            Revisi Operator
          </Badge>
        )
      case 'submitted_to_pengawas':
      case 'in_review_pengawas':
        return (
          <Badge className='gap-1.5 border border-purple-500/30 bg-purple-500/15 px-2.5 py-0.5 text-xs font-medium text-purple-700 shadow-2xs dark:text-purple-400'>
            <Clock className='h-3 w-3 animate-pulse text-purple-600' />
            Pengesahan Pengawas
          </Badge>
        )
      case 'revision_by_pengawas':
        return (
          <Badge className='gap-1.5 border border-destructive/30 bg-destructive/15 px-2.5 py-0.5 text-xs font-medium text-destructive shadow-2xs'>
            <XCircle className='h-3 w-3 text-destructive' />
            Revisi Pengawas
          </Badge>
        )
      case 'revision_requested':
        return (
          <Badge className='gap-1.5 border border-destructive/30 bg-destructive/15 px-2.5 py-0.5 text-xs font-medium text-destructive shadow-2xs'>
            <XCircle className='h-3 w-3 text-destructive' />
            Perlu Revisi
          </Badge>
        )
      case 'approved':
        return (
          <Badge className='gap-1.5 border border-emerald-500/30 bg-emerald-500/15 px-2.5 py-0.5 text-xs font-medium text-emerald-700 shadow-2xs dark:text-emerald-400'>
            <CheckCircle2 className='h-3 w-3 text-emerald-600 dark:text-emerald-400' />
            Disahkan Final
          </Badge>
        )
      default:
        return (
          <Badge variant='outline' className='font-mono text-xs'>
            {submission.status}
          </Badge>
        )
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
            {/* 1. Page Header */}
            <PageHeader className='flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between'>
              <div className='min-w-0 flex-1 space-y-1'>
                <div className='flex flex-wrap items-center gap-2.5'>
                  <h2 className='flex items-center gap-2 text-2xl font-bold tracking-tight text-foreground'>
                    <ClipboardCheck className='h-6 w-6 text-primary' />
                    Review & Persetujuan Risiko Perangkat Daerah
                  </h2>
                </div>
                <p className='text-xs text-muted-foreground'>
                  Telaah berjenjang internal pimpinan OPD, pemeriksaan kepatuhan
                  auditor APIP, dan pengesahan final Pengawas Inspektorat.
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

            {/* 2. Interactive KPI / Metric Summary Cards (Consistent with other pages) */}
            <KpiStatsCards
              items={kpiItems}
              isLoading={isLoading}
              count={5}
              className='grid-cols-2 sm:grid-cols-3 lg:grid-cols-5'
            />

            {/* 3. Standard Filter Toolbar (Search + 2 Dropdown Filters) */}
            <div className='flex flex-col items-stretch justify-between gap-3 md:flex-row md:items-center'>
              {/* Left: Search input with clear button */}
              <div className='relative max-w-sm flex-1'>
                <SearchIcon className='absolute top-2.5 left-3 h-4 w-4 text-muted-foreground' />
                <Input
                  type='text'
                  placeholder='Cari nama dinas atau kode OPD...'
                  className='h-9 pr-8 pl-9 text-xs'
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                {searchTerm && (
                  <button
                    type='button'
                    onClick={() => setSearchTerm('')}
                    className='absolute top-2.5 right-2.5 text-muted-foreground hover:text-foreground'
                  >
                    <X className='h-4 w-4' />
                  </button>
                )}
              </div>

              {/* Right: Dropdown 1 (Tahap Approval) + Dropdown 2 (Status Review) + Reset */}
              <div className='flex flex-wrap items-center gap-2 sm:flex-nowrap'>
                {/* Dropdown 1: Tahap Approval */}
                <Select
                  value={tierFilter}
                  onValueChange={(val) => setTierFilter(val as TierFilter)}
                >
                  <SelectTrigger className='h-9 w-full text-xs sm:w-[220px]'>
                    <SelectValue placeholder='Tahap Approval' />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='all' className='text-xs'>
                      Semua Tahap ({tierCounts.all})
                    </SelectItem>
                    <SelectItem value='kepala' className='text-xs'>
                      Tier 2: Kepala OPD ({tierCounts.kepala})
                    </SelectItem>
                    <SelectItem value='auditor' className='text-xs'>
                      Tier 3: Auditor ({tierCounts.auditor})
                    </SelectItem>
                    <SelectItem value='pengawas' className='text-xs'>
                      Tier 4: Pengawas ({tierCounts.pengawas})
                    </SelectItem>
                    <SelectItem value='approved' className='text-xs'>
                      Disahkan Final ({tierCounts.approved})
                    </SelectItem>
                    <SelectItem value='opd' className='text-xs'>
                      Tier 1: Draf Operator ({tierCounts.opd})
                    </SelectItem>
                  </SelectContent>
                </Select>

                {/* Dropdown 2: Status Review */}
                <Select
                  value={statusFilter}
                  onValueChange={(val) => setStatusFilter(val as StatusFilter)}
                >
                  <SelectTrigger className='h-9 w-full text-xs sm:w-[190px]'>
                    <SelectValue placeholder='Status Review' />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='semua' className='text-xs'>
                      Semua Status ({metrics.total})
                    </SelectItem>
                    <SelectItem value='submitted' className='text-xs'>
                      Menunggu Review ({metrics.menunggu})
                    </SelectItem>
                    <SelectItem value='revision_requested' className='text-xs'>
                      Perlu Revisi ({metrics.revisi})
                    </SelectItem>
                    <SelectItem value='approved' className='text-xs'>
                      Telah Disetujui ({metrics.disetujui})
                    </SelectItem>
                    <SelectItem value='belum_mengirim' className='text-xs'>
                      Belum Mengirim ({metrics.belumKirim})
                    </SelectItem>
                  </SelectContent>
                </Select>

                {/* Reset Filter Button */}
                {(searchTerm ||
                  statusFilter !== 'semua' ||
                  tierFilter !== 'all') && (
                  <Button
                    variant='ghost'
                    size='sm'
                    className='h-9 shrink-0 gap-1.5 px-2.5 text-xs text-muted-foreground hover:text-foreground'
                    onClick={() => {
                      setSearchTerm('')
                      setStatusFilter('semua')
                      setTierFilter('all')
                    }}
                  >
                    <X className='h-3.5 w-3.5' />
                    <span>Reset</span>
                  </Button>
                )}
              </div>
            </div>

            {/* 4. OPD Submissions Data Table */}
            <div className='overflow-hidden rounded-xl border bg-card shadow-2xs'>
              <Table>
                <TableHeader className='bg-muted/40'>
                  <TableRow>
                    <TableHead className='w-[48px] text-center text-xs font-semibold'>
                      No
                    </TableHead>
                    <TableHead className='text-xs font-semibold'>
                      Perangkat Daerah (OPD)
                    </TableHead>
                    <TableHead className='text-xs font-semibold'>
                      Auditor Pengawas
                    </TableHead>
                    <TableHead className='text-xs font-semibold'>
                      Status Pengajuan
                    </TableHead>
                    <TableHead className='text-xs font-semibold'>
                      Status Lembar Kerja
                    </TableHead>
                    <TableHead className='pr-6 text-right text-xs font-semibold'>
                      Aksi
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell
                        colSpan={6}
                        className='h-48 text-center text-xs text-muted-foreground'
                      >
                        <div className='flex flex-col items-center justify-center gap-2'>
                          <Loader2 className='h-6 w-6 animate-spin text-primary' />
                          Memuat daftar pengajuan risiko OPD...
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : filteredOpdList.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={6}
                        className='h-48 text-center text-xs text-muted-foreground'
                      >
                        <div className='mx-auto flex max-w-sm flex-col items-center justify-center gap-2 p-4'>
                          <ClipboardCheck className='h-8 w-8 text-muted-foreground/60' />
                          <p className='text-sm font-semibold text-foreground'>
                            Tidak ada data yang sesuai filter
                          </p>
                          <p className='text-xs text-muted-foreground'>
                            {searchTerm
                              ? `Pencarian "${searchTerm}" tidak ditemukan.`
                              : 'Tidak ada perangkat daerah pada filter status ini.'}
                          </p>
                          {(searchTerm || statusFilter !== 'semua') && (
                            <Button
                              variant='outline'
                              size='sm'
                              className='mt-2 h-8 text-xs'
                              onClick={() => {
                                setSearchTerm('')
                                setStatusFilter('semua')
                              }}
                            >
                              Reset Filter
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredOpdList.map(
                      (opd: OpdReviewListItem, index: number) => {
                        const submission = opd.pengajuan_risiko?.[0]
                        const auditorInfo =
                          opd.auditor_assignments?.[0]?.auditor
                        const item2b = submission?.items?.find(
                          (i) => i.form_code === '2b'
                        )
                        const item2c = submission?.items?.find(
                          (i) => i.form_code === '2c'
                        )

                        const hasSubmitted = Boolean(
                          submission?.status && submission.status !== 'draft'
                        )

                        const isPendingReview =
                          submission?.status === 'submitted_to_kepala_opd' ||
                          submission?.status === 'submitted_to_auditor' ||
                          submission?.status === 'in_review_auditor' ||
                          submission?.status === 'submitted_to_pengawas' ||
                          submission?.status === 'in_review_pengawas' ||
                          submission?.status === 'submitted' ||
                          submission?.status === 'in_review'

                        const isRevisionState =
                          submission?.status === 'revision_requested' ||
                          submission?.status === 'revision_by_kepala_opd' ||
                          submission?.status === 'revision_by_auditor' ||
                          submission?.status === 'revision_to_operator' ||
                          submission?.status === 'revision_by_pengawas'

                        return (
                          <TableRow
                            key={opd.id}
                            className='transition-colors hover:bg-muted/30'
                          >
                            <TableCell className='text-center font-mono text-xs text-muted-foreground'>
                              {index + 1}
                            </TableCell>
                            <TableCell>
                              <div className='space-y-1'>
                                <div className='text-xs font-semibold text-foreground'>
                                  {opd.nama}
                                </div>
                                <div className='flex items-center gap-1.5 text-[11px] text-muted-foreground'>
                                  <Badge
                                    variant='outline'
                                    className='bg-muted/40 px-1.5 py-0 font-mono text-[10px]'
                                  >
                                    {opd.kode || '-'}
                                  </Badge>
                                  <span>•</span>
                                  <span>{opd.kategori || 'Dinas'}</span>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              {auditorInfo ? (
                                <div className='space-y-0.5'>
                                  <div className='flex items-center gap-1.5 text-xs font-medium text-foreground'>
                                    <User className='h-3 w-3 shrink-0 text-primary' />
                                    <span>{auditorInfo.name}</span>
                                  </div>
                                  <div className='pl-4.5 font-mono text-[10px] text-muted-foreground'>
                                    {auditorInfo.nip
                                      ? `NIP. ${auditorInfo.nip}`
                                      : auditorInfo.email}
                                  </div>
                                </div>
                              ) : (
                                <Badge
                                  variant='outline'
                                  className='border-destructive/30 bg-destructive/5 text-[10px] font-normal text-destructive'
                                >
                                  Belum Ada Auditor
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell>
                              <div className='flex flex-col items-start gap-1'>
                                {getStatusBadge(submission)}
                                {/* Post-Revision Change Detection Highlight */}
                                {submission?.histories?.some(
                                  (h) =>
                                    h.action.includes('reject') ||
                                    h.action.includes('revision')
                                ) &&
                                  (submission.status ===
                                    'submitted_to_auditor' ||
                                    submission.status ===
                                      'submitted_to_pengawas') && (
                                    <Badge
                                      variant='outline'
                                      className='gap-1 border-blue-500/30 bg-blue-500/10 px-1.5 py-0 text-[10px] font-medium text-blue-700 dark:text-blue-400'
                                    >
                                      <RefreshCw className='h-2.5 w-2.5' />
                                      Revisi Selesai Diperbaiki
                                    </Badge>
                                  )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className='flex items-center gap-1.5'>
                                <Badge
                                  variant='outline'
                                  className={`px-1.5 py-0 font-mono text-[10px] ${
                                    item2b?.status === 'approved'
                                      ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                                      : item2b?.status === 'rejected'
                                        ? 'border-destructive/30 bg-destructive/10 text-destructive'
                                        : item2b?.status === 'submitted'
                                          ? 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400'
                                          : 'text-muted-foreground'
                                  }`}
                                >
                                  2B: {item2b?.status || 'draft'}
                                </Badge>
                                <Badge
                                  variant='outline'
                                  className={`px-1.5 py-0 font-mono text-[10px] ${
                                    item2c?.status === 'approved'
                                      ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                                      : item2c?.status === 'rejected'
                                        ? 'border-destructive/30 bg-destructive/10 text-destructive'
                                        : item2c?.status === 'submitted'
                                          ? 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400'
                                          : 'text-muted-foreground'
                                  }`}
                                >
                                  2C: {item2c?.status || 'draft'}
                                </Badge>
                              </div>
                            </TableCell>
                            <TableCell className='pr-6 text-right'>
                              <TooltipProvider delayDuration={150}>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <span>
                                      <Button
                                        size='sm'
                                        disabled={!hasSubmitted}
                                        variant={
                                          isPendingReview
                                            ? 'default'
                                            : 'outline'
                                        }
                                        className={`h-8 gap-1.5 text-xs ${
                                          isPendingReview
                                            ? 'bg-primary font-semibold text-primary-foreground shadow-2xs hover:bg-primary/90'
                                            : ''
                                        }`}
                                        onClick={() => {
                                          if (submission?.id) {
                                            setActiveReview({
                                              submissionId: submission.id,
                                              opdId:
                                                submission.opd_id || opd.id,
                                              periodeId:
                                                submission.periode_penilaian_id ||
                                                activePeriode?.id ||
                                                '',
                                            })
                                          }
                                        }}
                                      >
                                        {isPendingReview ? (
                                          <>
                                            <ClipboardCheck className='h-3.5 w-3.5' />
                                            Periksa Pengajuan
                                          </>
                                        ) : isRevisionState ? (
                                          <>
                                            <Eye className='h-3.5 w-3.5' />
                                            Pantau Revisi
                                          </>
                                        ) : submission?.status ===
                                          'approved' ? (
                                          <>
                                            <CheckCircle2 className='h-3.5 w-3.5 text-emerald-600' />
                                            Lihat Berkas Final
                                          </>
                                        ) : (
                                          <>
                                            <Eye className='h-3.5 w-3.5' />
                                            Pratinjau Draf
                                          </>
                                        )}
                                      </Button>
                                    </span>
                                  </TooltipTrigger>
                                  {!hasSubmitted && (
                                    <TooltipContent
                                      side='left'
                                      className='text-xs'
                                    >
                                      OPD ini belum mengajukan formulir risiko
                                      kepada auditor.
                                    </TooltipContent>
                                  )}
                                </Tooltip>
                              </TooltipProvider>
                            </TableCell>
                          </TableRow>
                        )
                      }
                    )
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Footer Summary */}
            <div className='flex items-center justify-between px-1 text-xs text-muted-foreground'>
              <span>
                Menampilkan <strong>{filteredOpdList.length}</strong> dari{' '}
                <strong>{metrics.total}</strong> perangkat daerah
              </span>
              <span>
                Status: <strong>{statusFilter.toUpperCase()}</strong>
              </span>
            </div>
          </>
        )}
      </Main>
    </>
  )
}
