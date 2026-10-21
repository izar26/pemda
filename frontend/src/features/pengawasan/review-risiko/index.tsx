import { useState, useEffect, useMemo } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  AlertCircle,
  Building2,
  Calendar,
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
import { Header } from '@/components/layout/header'
import { NavbarStatus } from '@/components/layout/navbar-status'
import { Main } from '@/components/layout/main'
import { PageHeader } from '@/components/layout/page-header'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { ConfigDrawer } from '@/components/config-drawer'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
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
import {
  pengajuanRisikoService,
  type OpdReviewListItem,
} from '@/services/pengajuan-risiko-service'
import { perencanaanService } from '@/services/perencanaan-service'
import { ReviewRisikoWizard } from './components/review-risiko-wizard'

type StatusFilter = 'semua' | 'submitted' | 'revision_requested' | 'approved' | 'belum_mengirim'

export function ReviewRisikoManagement() {
  const queryClient = useQueryClient()
  const [searchTerm, setSearchTerm] = useState('')
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('semua')

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
    queryKey: [
      'pengawasan',
      'review-list',
      activePeriode?.id,
    ],
    queryFn: () =>
      pengajuanRisikoService.getAuditorReviewList({
        periode_penilaian_id: activePeriode?.id,
        per_page: 200,
      }),
    enabled: Boolean(activePeriode?.id),
    staleTime: 30_000,
  })

  const rawOpdList = reviewResponse?.data || []

  // Calculate accurate summary metrics
  const metrics = useMemo(() => {
    let total = rawOpdList.length
    let menunggu = 0
    let revisi = 0
    let disetujui = 0
    let belumKirim = 0

    for (const opd of rawOpdList) {
      const s = opd.pengajuan_risiko?.[0]?.status
      if (!s || s === 'draft') {
        belumKirim++
      } else if (s === 'submitted' || s === 'in_review') {
        menunggu++
      } else if (s === 'revision_requested') {
        revisi++
      } else if (s === 'approved') {
        disetujui++
      }
    }

    return { total, menunggu, revisi, disetujui, belumKirim }
  }, [rawOpdList])

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
          return s === 'submitted' || s === 'in_review'
        }
        if (statusFilter === 'revision_requested') {
          return s === 'revision_requested'
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

    return list
  }, [rawOpdList, debouncedSearchTerm, statusFilter])

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ['pengawasan'] })
    refetch()
  }

  const getStatusBadge = (submission?: any) => {
    if (!submission || submission.status === 'draft') {
      return (
        <Badge
          variant='outline'
          className='text-xs py-0.5 px-2 bg-muted/40 text-muted-foreground gap-1.5 border-dashed font-normal'
        >
          <Clock className='h-3 w-3 text-muted-foreground' />
          Belum Mengirim
        </Badge>
      )
    }

    switch (submission.status) {
      case 'submitted':
      case 'in_review':
        return (
          <Badge className='text-xs bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30 gap-1.5 py-0.5 px-2.5 shadow-2xs font-medium'>
            <Clock className='h-3 w-3 text-amber-600 dark:text-amber-400 animate-pulse' />
            Menunggu Review
          </Badge>
        )
      case 'revision_requested':
        return (
          <Badge className='text-xs bg-destructive/15 text-destructive border border-destructive/30 gap-1.5 py-0.5 px-2.5 shadow-2xs font-medium'>
            <XCircle className='h-3 w-3 text-destructive' />
            Perlu Revisi
          </Badge>
        )
      case 'approved':
        return (
          <Badge className='text-xs bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 gap-1.5 py-0.5 px-2.5 shadow-2xs font-medium'>
            <CheckCircle2 className='h-3 w-3 text-emerald-600 dark:text-emerald-400' />
            Disetujui
          </Badge>
        )
      default:
        return (
          <Badge variant='outline' className='text-xs font-mono'>
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
            <PageHeader className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4'>
              <div className='space-y-1 min-w-0 flex-1'>
                <div className='flex items-center gap-2.5 flex-wrap'>
                  <h2 className='text-2xl font-bold tracking-tight text-foreground flex items-center gap-2'>
                    <ClipboardCheck className='h-6 w-6 text-primary' />
                    Review Risiko OPD
                  </h2>
                  {activePeriode && (
                    <Badge variant='outline' className='font-mono text-xs gap-1.5 py-0.5 px-2.5 bg-muted/30'>
                      <Calendar className='h-3 w-3 text-primary' />
                      {activePeriode.nama_periode}
                    </Badge>
                  )}
                </div>
                <p className='text-xs text-muted-foreground'>
                  Pemeriksaan, pemberian catatan revisi, dan persetujuan lembar kerja pengelolaan risiko perangkat daerah binaan Inspektorat.
                </p>
              </div>

              <div className='flex items-center gap-2 shrink-0'>
                <Button
                  variant='outline'
                  size='sm'
                  className='h-9 text-xs'
                  onClick={handleRefresh}
                  disabled={isLoading || isRefetching}
                >
                  <RefreshCw
                    className={`h-3.5 w-3.5 mr-1.5 ${isRefetching ? 'animate-spin' : ''}`}
                  />
                  Segarkan
                </Button>
              </div>
            </PageHeader>

            {/* 2. Interactive KPI / Metric Summary Cards */}
            <div className='grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3'>
              {/* Card 1: Total */}
              <Card
                onClick={() => setStatusFilter('semua')}
                className={`p-3.5 rounded-xl border transition-all cursor-pointer hover:shadow-sm ${
                  statusFilter === 'semua'
                    ? 'border-primary ring-2 ring-primary/20 bg-primary/5'
                    : 'hover:bg-muted/30'
                }`}
              >
                <div className='flex items-center justify-between'>
                  <span className='text-xs font-medium text-muted-foreground'>Total Binaan</span>
                  <Building2 className='h-4 w-4 text-primary' />
                </div>
                <div className='mt-2 flex items-baseline justify-between'>
                  <span className='text-2xl font-bold font-mono tracking-tight text-foreground'>
                    {metrics.total}
                  </span>
                  <span className='text-[11px] text-muted-foreground'>Perangkat Daerah</span>
                </div>
              </Card>

              {/* Card 2: Menunggu Review */}
              <Card
                onClick={() => setStatusFilter('submitted')}
                className={`p-3.5 rounded-xl border transition-all cursor-pointer hover:shadow-sm ${
                  statusFilter === 'submitted'
                    ? 'border-amber-500 ring-2 ring-amber-500/20 bg-amber-500/5'
                    : 'hover:bg-muted/30'
                }`}
              >
                <div className='flex items-center justify-between'>
                  <span className='text-xs font-medium text-muted-foreground'>Menunggu Review</span>
                  <Clock className='h-4 w-4 text-amber-500' />
                </div>
                <div className='mt-2 flex items-baseline justify-between'>
                  <span className='text-2xl font-bold font-mono tracking-tight text-amber-600 dark:text-amber-400'>
                    {metrics.menunggu}
                  </span>
                  <span className='text-[11px] text-muted-foreground'>Perlu Diperiksa</span>
                </div>
              </Card>

              {/* Card 3: Perlu Revisi */}
              <Card
                onClick={() => setStatusFilter('revision_requested')}
                className={`p-3.5 rounded-xl border transition-all cursor-pointer hover:shadow-sm ${
                  statusFilter === 'revision_requested'
                    ? 'border-destructive ring-2 ring-destructive/20 bg-destructive/5'
                    : 'hover:bg-muted/30'
                }`}
              >
                <div className='flex items-center justify-between'>
                  <span className='text-xs font-medium text-muted-foreground'>Perlu Revisi</span>
                  <AlertCircle className='h-4 w-4 text-destructive' />
                </div>
                <div className='mt-2 flex items-baseline justify-between'>
                  <span className='text-2xl font-bold font-mono tracking-tight text-destructive'>
                    {metrics.revisi}
                  </span>
                  <span className='text-[11px] text-muted-foreground'>Catatan Perbaikan</span>
                </div>
              </Card>

              {/* Card 4: Disetujui */}
              <Card
                onClick={() => setStatusFilter('approved')}
                className={`p-3.5 rounded-xl border transition-all cursor-pointer hover:shadow-sm ${
                  statusFilter === 'approved'
                    ? 'border-emerald-500 ring-2 ring-emerald-500/20 bg-emerald-500/5'
                    : 'hover:bg-muted/30'
                }`}
              >
                <div className='flex items-center justify-between'>
                  <span className='text-xs font-medium text-muted-foreground'>Telah Disetujui</span>
                  <CheckCircle2 className='h-4 w-4 text-emerald-500' />
                </div>
                <div className='mt-2 flex items-baseline justify-between'>
                  <span className='text-2xl font-bold font-mono tracking-tight text-emerald-600 dark:text-emerald-400'>
                    {metrics.disetujui}
                  </span>
                  <span className='text-[11px] text-muted-foreground'>Final Disetujui</span>
                </div>
              </Card>

              {/* Card 5: Belum Mengirim */}
              <Card
                onClick={() => setStatusFilter('belum_mengirim')}
                className={`p-3.5 rounded-xl border transition-all cursor-pointer hover:shadow-sm col-span-2 sm:col-span-1 ${
                  statusFilter === 'belum_mengirim'
                    ? 'border-muted-foreground ring-2 ring-muted/50 bg-muted/30'
                    : 'hover:bg-muted/30'
                }`}
              >
                <div className='flex items-center justify-between'>
                  <span className='text-xs font-medium text-muted-foreground'>Belum Mengirim</span>
                  <FileEdit className='h-4 w-4 text-muted-foreground' />
                </div>
                <div className='mt-2 flex items-baseline justify-between'>
                  <span className='text-2xl font-bold font-mono tracking-tight text-muted-foreground'>
                    {metrics.belumKirim}
                  </span>
                  <span className='text-[11px] text-muted-foreground'>Belum Ada Draft</span>
                </div>
              </Card>
            </div>

            {/* 3. Filter Toolbar & Tabs */}
            <div className='flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3'>
              {/* Search input with clear button */}
              <div className='relative flex-1 max-w-md'>
                <SearchIcon className='absolute left-3 top-2.5 h-4 w-4 text-muted-foreground' />
                <Input
                  type='text'
                  placeholder='Cari nama dinas atau kode OPD...'
                  className='pl-9 pr-8 h-9 text-xs'
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                {searchTerm && (
                  <button
                    type='button'
                    onClick={() => setSearchTerm('')}
                    className='absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground'
                  >
                    <X className='h-4 w-4' />
                  </button>
                )}
              </div>

              {/* Status Tabs with count badges */}
              <div className='flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0'>
                {[
                  { id: 'semua', label: 'Semua', count: metrics.total },
                  { id: 'submitted', label: 'Menunggu Review', count: metrics.menunggu },
                  { id: 'revision_requested', label: 'Perlu Revisi', count: metrics.revisi },
                  { id: 'approved', label: 'Disetujui', count: metrics.disetujui },
                  { id: 'belum_mengirim', label: 'Belum Mengirim', count: metrics.belumKirim },
                ].map((tab) => {
                  const isActive = statusFilter === tab.id
                  return (
                    <Button
                      key={tab.id}
                      variant={isActive ? 'default' : 'outline'}
                      size='sm'
                      className='h-8 text-xs shrink-0 gap-1.5 font-medium'
                      onClick={() => setStatusFilter(tab.id as StatusFilter)}
                    >
                      <span>{tab.label}</span>
                      <span
                        className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full ${
                          isActive
                            ? 'bg-primary-foreground/20 text-primary-foreground font-bold'
                            : 'bg-muted text-muted-foreground'
                        }`}
                      >
                        {tab.count}
                      </span>
                    </Button>
                  )
                })}
              </div>
            </div>

            {/* 4. OPD Submissions Data Table */}
            <div className='rounded-xl border bg-card overflow-hidden shadow-2xs'>
              <Table>
                <TableHeader className='bg-muted/40'>
                  <TableRow>
                    <TableHead className='w-[48px] text-center text-xs font-semibold'>No</TableHead>
                    <TableHead className='text-xs font-semibold'>Perangkat Daerah (OPD)</TableHead>
                    <TableHead className='text-xs font-semibold'>Auditor Pengawas</TableHead>
                    <TableHead className='text-xs font-semibold'>Status Pengajuan</TableHead>
                    <TableHead className='text-xs font-semibold'>Status Lembar Kerja</TableHead>
                    <TableHead className='text-xs font-semibold text-right pr-6'>Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={6} className='h-48 text-center text-xs text-muted-foreground'>
                        <div className='flex flex-col items-center justify-center gap-2'>
                          <Loader2 className='h-6 w-6 animate-spin text-primary' />
                          Memuat daftar pengajuan risiko OPD...
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : filteredOpdList.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className='h-48 text-center text-xs text-muted-foreground'>
                        <div className='flex flex-col items-center justify-center gap-2 max-w-sm mx-auto p-4'>
                          <ClipboardCheck className='h-8 w-8 text-muted-foreground/60' />
                          <p className='font-semibold text-foreground text-sm'>
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
                              className='h-8 text-xs mt-2'
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
                    filteredOpdList.map((opd: OpdReviewListItem, index: number) => {
                      const submission = opd.pengajuan_risiko?.[0]
                      const auditorInfo = opd.auditor_assignments?.[0]?.auditor
                      const item2b = submission?.items?.find((i) => i.form_code === '2b')
                      const item2c = submission?.items?.find((i) => i.form_code === '2c')

                      const hasSubmitted =
                        submission?.status === 'submitted' ||
                        submission?.status === 'in_review' ||
                        submission?.status === 'revision_requested' ||
                        submission?.status === 'approved'

                      return (
                        <TableRow key={opd.id} className='hover:bg-muted/30 transition-colors'>
                          <TableCell className='text-center text-xs text-muted-foreground font-mono'>
                            {index + 1}
                          </TableCell>
                          <TableCell>
                            <div className='space-y-1'>
                              <div className='font-semibold text-xs text-foreground'>
                                {opd.nama}
                              </div>
                              <div className='flex items-center gap-1.5 text-[11px] text-muted-foreground'>
                                <Badge variant='outline' className='font-mono text-[10px] py-0 px-1.5 bg-muted/40'>
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
                                <div className='text-xs font-medium text-foreground flex items-center gap-1.5'>
                                  <User className='h-3 w-3 text-primary shrink-0' />
                                  <span>{auditorInfo.name}</span>
                                </div>
                                <div className='text-[10px] text-muted-foreground font-mono pl-4.5'>
                                  {auditorInfo.nip ? `NIP. ${auditorInfo.nip}` : auditorInfo.email}
                                </div>
                              </div>
                            ) : (
                              <Badge variant='outline' className='text-[10px] text-destructive border-destructive/30 bg-destructive/5 font-normal'>
                                Belum Ada Auditor
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>{getStatusBadge(submission)}</TableCell>
                          <TableCell>
                            <div className='flex items-center gap-1.5'>
                              <Badge
                                variant='outline'
                                className={`text-[10px] py-0 px-1.5 font-mono ${
                                  item2b?.status === 'approved'
                                    ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30'
                                    : item2b?.status === 'rejected'
                                    ? 'bg-destructive/10 text-destructive border-destructive/30'
                                    : item2b?.status === 'submitted'
                                    ? 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30'
                                    : 'text-muted-foreground'
                                }`}
                              >
                                2B: {item2b?.status || 'draft'}
                              </Badge>
                              <Badge
                                variant='outline'
                                className={`text-[10px] py-0 px-1.5 font-mono ${
                                  item2c?.status === 'approved'
                                    ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30'
                                    : item2c?.status === 'rejected'
                                    ? 'bg-destructive/10 text-destructive border-destructive/30'
                                    : item2c?.status === 'submitted'
                                    ? 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30'
                                    : 'text-muted-foreground'
                                }`}
                              >
                                2C: {item2c?.status || 'draft'}
                              </Badge>
                            </div>
                          </TableCell>
                          <TableCell className='text-right pr-6'>
                            <TooltipProvider delayDuration={150}>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span>
                                    <Button
                                      size='sm'
                                      disabled={!hasSubmitted}
                                      variant={
                                        submission?.status === 'submitted' || submission?.status === 'in_review'
                                          ? 'default'
                                          : 'outline'
                                      }
                                      className={`h-8 text-xs gap-1.5 ${
                                        submission?.status === 'submitted' || submission?.status === 'in_review'
                                          ? 'bg-primary hover:bg-primary/90 text-primary-foreground shadow-2xs font-semibold'
                                          : ''
                                      }`}
                                      onClick={() => {
                                        if (submission?.id) {
                                          setActiveReview({
                                            submissionId: submission.id,
                                            opdId: opd.id,
                                            periodeId: activePeriode?.id || '',
                                          })
                                        }
                                      }}
                                    >
                                      {submission?.status === 'submitted' || submission?.status === 'in_review' ? (
                                        <>
                                          <ClipboardCheck className='h-3.5 w-3.5' />
                                          Periksa Pengajuan
                                        </>
                                      ) : submission?.status === 'revision_requested' ? (
                                        <>
                                          <Eye className='h-3.5 w-3.5' />
                                          Lihat Revisi
                                        </>
                                      ) : submission?.status === 'approved' ? (
                                        <>
                                          <Eye className='h-3.5 w-3.5' />
                                          Lihat Dokumen
                                        </>
                                      ) : (
                                        <>
                                          <Clock className='h-3.5 w-3.5 text-muted-foreground' />
                                          Belum Mengirim
                                        </>
                                      )}
                                    </Button>
                                  </span>
                                </TooltipTrigger>
                                {!hasSubmitted && (
                                  <TooltipContent side='left' className='text-xs'>
                                    OPD ini belum mengajukan formulir risiko kepada auditor.
                                  </TooltipContent>
                                )}
                              </Tooltip>
                            </TooltipProvider>
                          </TableCell>
                        </TableRow>
                      )
                    })
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Footer Summary */}
            <div className='flex items-center justify-between text-xs text-muted-foreground px-1'>
              <span>
                Menampilkan <strong>{filteredOpdList.length}</strong> dari <strong>{metrics.total}</strong> perangkat daerah
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
