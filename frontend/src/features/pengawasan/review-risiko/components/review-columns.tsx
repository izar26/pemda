import type { ColumnDef } from '@tanstack/react-table'
import {
  AlertCircle,
  CheckCircle2,
  ClipboardCheck,
  Clock,
  Eye,
  RefreshCw,
  User,
  XCircle,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { DataTableColumnHeader } from '@/components/data-table'
import type {
  OpdReviewListItem,
  PengajuanPenilaianRisiko,
} from '@/services/pengajuan-risiko-service'

export type TierCategory = 'kepala' | 'auditor' | 'pengawas' | 'approved' | 'opd'
export type StatusCategory =
  | 'submitted'
  | 'revision_requested'
  | 'approved'
  | 'belum_mengirim'

export function getTierCategory(status?: string): TierCategory {
  if (status === 'submitted_to_kepala_opd' || status === 'revision_by_auditor') {
    return 'kepala'
  }
  if (
    status === 'submitted_to_auditor' ||
    status === 'in_review_auditor' ||
    status === 'revision_by_pengawas' ||
    status === 'submitted' ||
    status === 'in_review'
  ) {
    return 'auditor'
  }
  if (status === 'submitted_to_pengawas' || status === 'in_review_pengawas') {
    return 'pengawas'
  }
  if (status === 'approved') {
    return 'approved'
  }
  return 'opd'
}

export function getStatusCategory(status?: string): StatusCategory {
  if (!status || status === 'draft') {
    return 'belum_mengirim'
  }
  if (
    status === 'submitted' ||
    status === 'in_review' ||
    status === 'submitted_to_kepala_opd' ||
    status === 'submitted_to_auditor' ||
    status === 'in_review_auditor' ||
    status === 'submitted_to_pengawas' ||
    status === 'in_review_pengawas'
  ) {
    return 'submitted'
  }
  if (
    status === 'revision_requested' ||
    status === 'revision_by_kepala_opd' ||
    status === 'revision_by_auditor' ||
    status === 'revision_to_operator' ||
    status === 'revision_by_pengawas'
  ) {
    return 'revision_requested'
  }
  if (status === 'approved') {
    return 'approved'
  }
  return 'belum_mengirim'
}

function renderStatusBadge(submission?: Partial<PengajuanPenilaianRisiko> | null) {
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
          Pemeriksaan Evaluator
        </Badge>
      )
    case 'revision_by_auditor':
      return (
        <Badge className='gap-1.5 border border-amber-500/30 bg-amber-500/15 px-2.5 py-0.5 text-xs font-medium text-amber-800 shadow-2xs dark:text-amber-300'>
          <AlertCircle className='h-3 w-3 text-amber-600' />
          Revisi Evaluator
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

interface ReviewColumnsProps {
  onOpenReview: (params: {
    submissionId: string
    opdId: string
    periodeId: string
  }) => void
  activePeriodeId?: string
}

export function getReviewColumns({
  onOpenReview,
  activePeriodeId,
}: ReviewColumnsProps): ColumnDef<OpdReviewListItem>[] {
  return [
    {
      id: 'index',
      header: () => <div className='w-8 text-center'>No</div>,
      cell: ({ row }) => (
        <div className='w-8 text-center font-mono text-xs text-muted-foreground'>
          {row.index + 1}
        </div>
      ),
      meta: {
        className: 'w-12',
      },
    },
    {
      id: 'nama',
      accessorKey: 'nama',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title='Perangkat Daerah (OPD)' />
      ),
      cell: ({ row }) => {
        const opd = row.original
        return (
          <div className='space-y-1 min-w-[200px] py-0.5'>
            <div className='text-xs font-semibold text-foreground leading-snug'>
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
              <span>{opd.kategori || 'Perangkat Daerah'}</span>
            </div>
          </div>
        )
      },
      filterFn: (row, _id, value) => {
        const search = String(value || '').toLowerCase()
        const opd = row.original
        const auditor = opd.auditor_assignments?.[0]?.auditor

        const matchNama = (opd.nama || '').toLowerCase().includes(search)
        const matchKode = (opd.kode || '').toLowerCase().includes(search)
        const matchAuditor = auditor
          ? (auditor.name || '').toLowerCase().includes(search) ||
            (auditor.nip || '').toLowerCase().includes(search) ||
            (auditor.email || '').toLowerCase().includes(search)
          : false

        return matchNama || matchKode || matchAuditor
      },
      enableSorting: true,
    },
    {
      id: 'evaluator',
      accessorFn: (row) => row.auditor_assignments?.[0]?.auditor?.name || '',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title='Evaluator Pengawas' />
      ),
      cell: ({ row }) => {
        const auditorInfo = row.original.auditor_assignments?.[0]?.auditor
        if (!auditorInfo) {
          return (
            <Badge
              variant='outline'
              className='border-destructive/30 bg-destructive/5 text-[10px] font-normal text-destructive'
            >
              Belum Ada Evaluator
            </Badge>
          )
        }

        return (
          <div className='space-y-0.5 min-w-[160px] py-0.5'>
            <div className='flex items-center gap-1.5 text-xs font-medium text-foreground'>
              <User className='h-3 w-3 shrink-0 text-primary' />
              <span className='truncate'>{auditorInfo.name}</span>
            </div>
            <div className='pl-4.5 font-mono text-[10px] text-muted-foreground truncate'>
              {auditorInfo.nip ? `NIP. ${auditorInfo.nip}` : auditorInfo.email}
            </div>
          </div>
        )
      },
      enableSorting: true,
    },
    {
      id: 'tier',
      accessorFn: (row) => getTierCategory(row.pengajuan_risiko?.[0]?.status),
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title='Tahap Approval' />
      ),
      cell: ({ row }) => {
        const tier = row.getValue('tier') as TierCategory
        switch (tier) {
          case 'kepala':
            return (
              <Badge className='text-[10px] font-medium bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20'>
                Tier 2: Kepala OPD
              </Badge>
            )
          case 'auditor':
            return (
              <Badge className='text-[10px] font-medium bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'>
                Tier 3: Evaluator
              </Badge>
            )
          case 'pengawas':
            return (
              <Badge className='text-[10px] font-medium bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20'>
                Tier 4: Pengawas
              </Badge>
            )
          case 'approved':
            return (
              <Badge className='text-[10px] font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'>
                Disahkan Final
              </Badge>
            )
          case 'opd':
          default:
            return (
              <Badge variant='outline' className='text-[10px] font-medium bg-muted text-muted-foreground border-border'>
                Tier 1: Draf Operator
              </Badge>
            )
        }
      },
      filterFn: (row, id, value) => {
        return Array.isArray(value) ? value.includes(row.getValue(id)) : row.getValue(id) === value
      },
      enableSorting: true,
    },
    {
      id: 'status_review',
      accessorFn: (row) => getStatusCategory(row.pengajuan_risiko?.[0]?.status),
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title='Status Review' />
      ),
      cell: ({ row }) => {
        const submission = row.original.pengajuan_risiko?.[0]
        const hasRevisions = submission?.histories?.some(
          (h) => h.action.includes('reject') || h.action.includes('revision')
        )
        const isBackInReview =
          submission?.status === 'submitted_to_auditor' ||
          submission?.status === 'submitted_to_pengawas'

        return (
          <div className='flex flex-col items-start gap-1 py-0.5'>
            {renderStatusBadge(submission)}
            {hasRevisions && isBackInReview && (
              <Badge
                variant='outline'
                className='gap-1 border-blue-500/30 bg-blue-500/10 px-1.5 py-0 text-[10px] font-medium text-blue-700 dark:text-blue-400'
              >
                <RefreshCw className='h-2.5 w-2.5' />
                Revisi Selesai Diperbaiki
              </Badge>
            )}
          </div>
        )
      },
      filterFn: (row, id, value) => {
        return Array.isArray(value) ? value.includes(row.getValue(id)) : row.getValue(id) === value
      },
      enableSorting: true,
    },
    {
      id: 'lembar_kerja',
      header: () => <div className='text-xs font-semibold'>Status Lembar Kerja</div>,
      cell: ({ row }) => {
        const submission = row.original.pengajuan_risiko?.[0]
        const item2b = submission?.items?.find((i) => i.form_code === '2b')
        const item2c = submission?.items?.find((i) => i.form_code === '2c')

        return (
          <div className='flex items-center gap-1.5 py-0.5'>
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
        )
      },
    },
    {
      id: 'actions',
      header: () => <div className='pr-4 text-right'>Aksi</div>,
      cell: ({ row }) => {
        const opd = row.original
        const submission = opd.pengajuan_risiko?.[0]
        const hasSubmitted = Boolean(submission?.status && submission.status !== 'draft')

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
          <div className='flex items-center justify-end pr-4 py-0.5'>
            <TooltipProvider delayDuration={150}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span>
                    <Button
                      size='sm'
                      disabled={!hasSubmitted}
                      variant={isPendingReview ? 'default' : 'outline'}
                      className={`h-8 gap-1.5 text-xs ${
                        isPendingReview
                          ? 'bg-primary font-semibold text-primary-foreground shadow-2xs hover:bg-primary/90'
                          : ''
                      }`}
                      onClick={() => {
                        if (submission?.id) {
                          onOpenReview({
                            submissionId: submission.id,
                            opdId: submission.opd_id || opd.id,
                            periodeId:
                              submission.periode_penilaian_id ||
                              activePeriodeId ||
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
                      ) : submission?.status === 'approved' ? (
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
                  <TooltipContent side='left' className='text-xs'>
                    OPD ini belum mengajukan formulir risiko kepada evaluator.
                  </TooltipContent>
                )}
              </Tooltip>
            </TooltipProvider>
          </div>
        )
      },
      meta: {
        className: 'text-right',
      },
    },
  ]
}
