import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  CheckCircle2,
  ClipboardCheck,
  Clock,
  Eye,
  Loader2,
  RefreshCw,
  Search,
  XCircle,
} from 'lucide-react'
import { Header } from '@/components/layout/header'
import { NavbarStatus } from '@/components/layout/navbar-status'
import { Main } from '@/components/layout/main'
import { PageHeader } from '@/components/layout/page-header'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { ThemeSwitch } from '@/components/theme-switch'
import { ConfigDrawer } from '@/components/config-drawer'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { toast } from 'sonner'
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
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('semua')

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
      searchTerm,
      statusFilter === 'semua' ? '' : statusFilter,
    ],
    queryFn: () =>
      pengajuanRisikoService.getAuditorReviewList({
        search: searchTerm || undefined,
        status: statusFilter === 'semua' ? undefined : statusFilter,
        periode_penilaian_id: activePeriode?.id,
        per_page: 100,
      }),
    enabled: Boolean(activePeriode?.id),
    staleTime: 30_000,
  })

  const opdList = reviewResponse?.data || []

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ['pengawasan'] })
    refetch()
  }

  const getStatusBadge = (submission?: any) => {
    if (!submission || submission.status === 'draft') {
      return (
        <Badge variant='outline' className='text-xs py-0.5 px-2 bg-muted/40 text-muted-foreground'>
          Belum Mengirim
        </Badge>
      )
    }

    switch (submission.status) {
      case 'submitted':
      case 'in_review':
        return (
          <Badge className='text-xs bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30 gap-1.5 py-0.5 px-2'>
            <Clock className='h-3 w-3' />
            Menunggu Review
          </Badge>
        )
      case 'revision_requested':
        return (
          <Badge className='text-xs bg-destructive/15 text-destructive border border-destructive/30 gap-1.5 py-0.5 px-2'>
            <XCircle className='h-3 w-3' />
            Perlu Revisi
          </Badge>
        )
      case 'approved':
        return (
          <Badge className='text-xs bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 gap-1.5 py-0.5 px-2'>
            <CheckCircle2 className='h-3 w-3' />
            Disetujui
          </Badge>
        )
      default:
        return (
          <Badge variant='outline' className='text-xs'>
            {submission.status}
          </Badge>
        )
    }
  }

  return (
    <>
      <Header fixed>
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
            {/* Sticky Page Header */}
        <PageHeader className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4'>
          <div className='space-y-0.5 min-w-0 flex-1'>
            <h2 className='text-2xl font-bold tracking-tight text-foreground flex items-center gap-2'>
              <ClipboardCheck className='h-6 w-6 text-primary' />
              Review & Persetujuan Risiko OPD
            </h2>
            <p className='text-xs text-muted-foreground'>
              Pemeriksaan, pemberian catatan revisi, dan persetujuan lembar kerja risiko perangkat daerah (OPD) binaan.
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

        {/* Filter Toolbar */}
        <div className='flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3'>
          <div className='relative flex-1 max-w-sm'>
            <Search className='absolute left-3 top-2.5 h-4 w-4 text-muted-foreground' />
            <Input
              type='text'
              placeholder='Cari nama atau kode dinas OPD...'
              className='pl-9 h-9 text-xs'
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Status Tabs */}
          <div className='flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0'>
            {[
              { id: 'semua', label: 'Semua Status' },
              { id: 'submitted', label: 'Menunggu Review' },
              { id: 'revision_requested', label: 'Perlu Revisi' },
              { id: 'approved', label: 'Disetujui' },
              { id: 'belum_mengirim', label: 'Belum Mengirim' },
            ].map((tab) => (
              <Button
                key={tab.id}
                variant={statusFilter === tab.id ? 'default' : 'outline'}
                size='sm'
                className='h-8 text-xs shrink-0'
                onClick={() => setStatusFilter(tab.id as StatusFilter)}
              >
                {tab.label}
              </Button>
            ))}
          </div>
        </div>

        {/* OPD Submissions Data Table */}
        <div className='rounded-xl border bg-card overflow-hidden shadow-2xs'>
          <Table>
            <TableHeader className='bg-muted/40'>
              <TableRow>
                <TableHead className='w-[40px] text-center text-xs'>No</TableHead>
                <TableHead className='text-xs'>Perangkat Daerah (OPD)</TableHead>
                <TableHead className='text-xs'>Auditor Pengawas</TableHead>
                <TableHead className='text-xs'>Status Pengajuan</TableHead>
                <TableHead className='text-xs'>Pemeriksaan Form</TableHead>
                <TableHead className='text-xs text-right pr-6'>Aksi</TableHead>
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
              ) : opdList.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className='h-40 text-center text-xs text-muted-foreground'>
                    Tidak ada perangkat daerah yang sesuai dengan filter.
                  </TableCell>
                </TableRow>
              ) : (
                opdList.map((opd: OpdReviewListItem, index: number) => {
                  const submission = opd.pengajuan_risiko?.[0]
                  const auditorInfo = opd.auditor_assignments?.[0]?.auditor
                  const item2b = submission?.items?.find((i) => i.form_code === '2b')
                  const item2c = submission?.items?.find((i) => i.form_code === '2c')

                  return (
                    <TableRow key={opd.id} className='hover:bg-muted/30 transition-colors'>
                      <TableCell className='text-center text-xs text-muted-foreground font-mono'>
                        {index + 1}
                      </TableCell>
                      <TableCell>
                        <div className='space-y-0.5'>
                          <div className='font-semibold text-xs text-foreground'>
                            {opd.nama}
                          </div>
                          <div className='flex items-center gap-1.5 text-[11px] text-muted-foreground font-mono'>
                            <span>[{opd.kode || '-'}]</span>
                            <span>•</span>
                            <span>{opd.kategori || 'Dinas'}</span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {auditorInfo ? (
                          <div className='space-y-0.5'>
                            <div className='text-xs font-medium text-foreground'>
                              {auditorInfo.name}
                            </div>
                            <div className='text-[10px] text-muted-foreground font-mono'>
                              {auditorInfo.nip ? `NIP. ${auditorInfo.nip}` : auditorInfo.email}
                            </div>
                          </div>
                        ) : (
                          <span className='text-xs text-destructive italic'>
                            Belum Ada Auditor
                          </span>
                        )}
                      </TableCell>
                      <TableCell>{getStatusBadge(submission)}</TableCell>
                      <TableCell>
                        <div className='flex items-center gap-1.5'>
                          <Badge
                            variant='outline'
                            className={`text-[10px] py-0 px-1.5 ${
                              item2b?.status === 'approved'
                                ? 'bg-emerald-500/10 text-emerald-700 border-emerald-500/20'
                                : item2b?.status === 'rejected'
                                ? 'bg-destructive/10 text-destructive border-destructive/20'
                                : 'text-muted-foreground'
                            }`}
                          >
                            2B: {item2b?.status || 'draft'}
                          </Badge>
                          <Badge
                            variant='outline'
                            className={`text-[10px] py-0 px-1.5 ${
                              item2c?.status === 'approved'
                                ? 'bg-emerald-500/10 text-emerald-700 border-emerald-500/20'
                                : item2c?.status === 'rejected'
                                ? 'bg-destructive/10 text-destructive border-destructive/20'
                                : 'text-muted-foreground'
                            }`}
                          >
                            2C: {item2c?.status || 'draft'}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell className='text-right pr-6'>
                        <Button
                          size='sm'
                          variant={
                            submission?.status === 'submitted' || submission?.status === 'in_review'
                              ? 'default'
                              : 'outline'
                          }
                          className='h-8 text-xs gap-1.5'
                          onClick={() => {
                            if (submission?.id) {
                              setActiveReview({
                                submissionId: submission.id,
                                opdId: opd.id,
                                periodeId: activePeriode?.id || '',
                              })
                            } else {
                              toast.info('OPD ini belum mengirimkan pengajuan lembar kerja risiko.')
                            }
                          }}
                        >
                          <Eye className='h-3.5 w-3.5' />
                          Periksa
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </div>
          </>
        )}
      </Main>
    </>
  )
}
