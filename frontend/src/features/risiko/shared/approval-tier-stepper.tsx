import { useMemo } from 'react'
import { format, parseISO } from 'date-fns'
import { type ReadinessResponse } from '@/services/pengajuan-risiko-service'
import { id as idLocale } from 'date-fns/locale'
import { CheckCircle2, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

interface ApprovalTierStepperProps {
  readiness?: ReadinessResponse
  className?: string
}

type StepState = 'completed' | 'active' | 'rejected' | 'pending'

interface TierNode {
  id: number
  tierName: string
  roleTitle: string
  actorName: string
  state: StepState
  dateText?: string
  statusLabel: string
  description: string
}

export function ApprovalTierStepper({
  readiness,
  className,
}: ApprovalTierStepperProps) {
  const status = readiness?.status
  const tier = readiness?.current_tier
  const submission = readiness?.submission

  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return undefined
    try {
      return format(parseISO(dateStr), 'dd MMM yyyy, HH:mm', {
        locale: idLocale,
      })
    } catch {
      return dateStr
    }
  }

  const nodes: TierNode[] = useMemo(() => {
    // 1. Operator OPD
    let opState: StepState
    let opStatus: string
    if (status === 'draft') {
      opState = 'active'
      opStatus = 'Sedang Menyusun'
    } else if (
      status === 'revision_by_kepala_opd' ||
      status === 'revision_to_operator'
    ) {
      opState = 'rejected'
      opStatus = 'Perlu Revisi Operator'
    } else {
      opState = 'completed'
      opStatus = 'Diajukan'
    }

    // 2. Kepala OPD
    let kepState: StepState
    let kepStatus: string
    if (status === 'submitted_to_kepala_opd') {
      kepState = 'active'
      kepStatus = 'Review Internal'
    } else if (status === 'revision_by_kepala_opd') {
      kepState = 'rejected'
      kepStatus = 'Meminta Revisi'
    } else if (status === 'revision_by_auditor') {
      kepState = 'active'
      kepStatus = 'Arahan Tindak Lanjut'
    } else if (
      submission?.kepala_opd_approved_at ||
      submission?.approved_by_kepala_opd_at ||
      tier === 'auditor' ||
      tier === 'pengawas' ||
      tier === 'completed'
    ) {
      kepState = 'completed'
      kepStatus = 'Disetujui Kepala OPD'
    } else {
      kepState = 'pending'
      kepStatus = 'Menunggu Pengajuan'
    }

    // 3. Auditor Pengawas
    let audState: StepState
    let audStatus: string
    if (
      status === 'submitted_to_auditor' ||
      status === 'in_review_auditor' ||
      status === 'submitted' ||
      status === 'in_review'
    ) {
      audState = 'active'
      audStatus = 'Pemeriksaan Kepatuhan'
    } else if (status === 'revision_by_auditor') {
      audState = 'rejected'
      audStatus = 'Revisi Diminta'
    } else if (status === 'revision_by_pengawas') {
      audState = 'active'
      audStatus = 'Perbaikan Teknis'
    } else if (
      submission?.auditor_reviewed_at ||
      submission?.approved_by_auditor_at ||
      tier === 'pengawas' ||
      tier === 'completed'
    ) {
      audState = 'completed'
      audStatus = 'Disetujui Auditor'
    } else {
      audState = 'pending'
      audStatus = 'Menunggu Penerusan'
    }

    // 4. Pengawas APIP (Inspektorat)
    let pengState: StepState
    let pengStatus: string
    if (status === 'submitted_to_pengawas' || status === 'in_review_pengawas') {
      pengState = 'active'
      pengStatus = 'Pengesahan APIP'
    } else if (status === 'revision_by_pengawas') {
      pengState = 'rejected'
      pengStatus = 'Klarifikasi ke Auditor'
    } else if (
      submission?.pengawas_approved_at ||
      submission?.approved_by_pengawas_at ||
      status === 'approved'
    ) {
      pengState = 'completed'
      pengStatus = 'Disahkan Pengawas'
    } else {
      pengState = 'pending'
      pengStatus = 'Menunggu Auditor'
    }

    // 5. Disahkan Final
    let finState: StepState
    let finStatus: string
    if (status === 'approved') {
      finState = 'completed'
      finStatus = 'Disahkan & Berlaku'
    } else {
      finState = 'pending'
      finStatus = 'Belum Disahkan'
    }

    return [
      {
        id: 1,
        tierName: 'Tier 1',
        roleTitle: 'Operator OPD',
        actorName: submission?.submitted_by?.name || 'Operator OPD',
        state: opState,
        dateText: formatDate(submission?.submitted_at),
        statusLabel: opStatus,
        description:
          'Penyusunan lembar kerja identifikasi dan analisis risiko oleh operator perangkat daerah.',
      },
      {
        id: 2,
        tierName: 'Tier 2',
        roleTitle: 'Kepala OPD',
        actorName: readiness?.kepala_opd?.name || 'Pimpinan OPD',
        state: kepState,
        dateText: formatDate(
          submission?.kepala_opd_approved_at ||
            submission?.approved_by_kepala_opd_at
        ),
        statusLabel: kepStatus,
        description:
          'Tinjauan strategis dan persetujuan internal oleh Kepala Perangkat Daerah.',
      },
      {
        id: 3,
        tierName: 'Tier 3',
        roleTitle: 'Auditor Pengawas',
        actorName: readiness?.assigned_auditor?.name || 'Inspektorat (Auditor)',
        state: audState,
        dateText: formatDate(
          submission?.auditor_reviewed_at || submission?.approved_by_auditor_at
        ),
        statusLabel: audStatus,
        description:
          'Pemeriksaan kesesuaian metodologi, kepatuhan kriteria, dan validasi data oleh Auditor APIP.',
      },
      {
        id: 4,
        tierName: 'Tier 4',
        roleTitle: 'Pengawas APIP',
        actorName: 'Inspektur / Pengawas',
        state: pengState,
        dateText: formatDate(
          submission?.pengawas_approved_at ||
            submission?.approved_by_pengawas_at
        ),
        statusLabel: pengStatus,
        description:
          'Pengesahan berjenjang tingkat inspektorat daerah sebelum berkas ditetapkan sah.',
      },
      {
        id: 5,
        tierName: 'Final',
        roleTitle: 'Disahkan Final',
        actorName: 'Ditetapkan',
        state: finState,
        dateText: formatDate(submission?.approved_at),
        statusLabel: finStatus,
        description:
          'Dokumen Manajemen Risiko resmi disahkan dan menjadi pedoman tindak lanjut instansi.',
      },
    ]
  }, [status, tier, submission, readiness])

  if (!readiness) return null

  const getNodeStyles = (state: StepState) => {
    switch (state) {
      case 'completed':
        return {
          circle:
            'bg-emerald-500 text-white border-emerald-500 shadow-xs shadow-emerald-500/20',
          line: 'bg-emerald-500',
          text: 'text-foreground font-semibold',
          sub: 'text-emerald-600 dark:text-emerald-400 font-medium',
          badge:
            'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30',
        }
      case 'active':
        return {
          circle:
            'bg-background text-primary border-primary ring-4 ring-primary/20 shadow-sm animate-pulse',
          line: 'bg-border',
          text: 'text-foreground font-bold',
          sub: 'text-primary font-medium',
          badge: 'bg-primary/15 text-primary border-primary/30',
        }
      case 'rejected':
        return {
          circle:
            'bg-destructive text-destructive-foreground border-destructive ring-4 ring-destructive/20 shadow-sm',
          line: 'bg-border',
          text: 'text-destructive font-bold',
          sub: 'text-destructive font-medium',
          badge: 'bg-destructive/15 text-destructive border-destructive/30',
        }
      case 'pending':
      default:
        return {
          circle:
            'bg-muted/60 text-muted-foreground border-border/80 group-hover:border-primary/50',
          line: 'bg-border/60',
          text: 'text-muted-foreground font-medium group-hover:text-foreground',
          sub: 'text-muted-foreground/80',
          badge: 'bg-muted/40 text-muted-foreground border-border/40',
        }
    }
  }

  return (
    <TooltipProvider delayDuration={200}>
      <div
        className={cn(
          'w-full rounded-xl border border-border/80 bg-card/60 p-3 shadow-2xs backdrop-blur-xs sm:p-4',
          className
        )}
      >
        <div className='mb-3 flex items-center justify-between px-1'>
          <div className='flex items-center gap-2'>
            <span className='text-xs font-bold tracking-tight text-foreground uppercase'>
              Alur Verifikasi 4-Tier Berjenjang
            </span>
            <span className='text-[11px] text-muted-foreground'>
              (Operator &rarr; Kepala OPD &rarr; Auditor &rarr; Pengawas &rarr;
              Disahkan)
            </span>
          </div>
          <Badge
            variant='outline'
            className='px-2 py-0.5 font-mono text-[10px]'
          >
            Status: {status}
          </Badge>
        </div>

        {/* Stepper Grid / Flex */}
        <div className='relative grid grid-cols-1 gap-3 sm:grid-cols-5 sm:gap-2'>
          {nodes.map((node, index) => {
            const isLast = index === nodes.length - 1
            const styles = getNodeStyles(node.state)

            return (
              <Tooltip key={node.id}>
                <TooltipTrigger asChild>
                  <div className='group relative flex cursor-default cursor-pointer flex-row items-center rounded-lg p-2 text-left transition-colors hover:bg-accent/50 sm:flex-col sm:items-center sm:text-center'>
                    {/* Connecting line for desktop */}
                    {!isLast && (
                      <div
                        className={cn(
                          'absolute top-[22px] right-[-50%] left-[50%] z-0 hidden h-[2px] transition-colors sm:block',
                          styles.line
                        )}
                      />
                    )}

                    {/* Step Icon / Circle */}
                    <div
                      className={cn(
                        'relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 text-xs font-bold transition-all sm:h-9 sm:w-9',
                        styles.circle
                      )}
                    >
                      {node.state === 'completed' ? (
                        <CheckCircle2 className='h-4 w-4' />
                      ) : node.state === 'rejected' ? (
                        <AlertCircle className='h-4 w-4' />
                      ) : (
                        <span>{node.id}</span>
                      )}
                    </div>

                    {/* Node Details */}
                    <div className='ml-3 min-w-0 flex-1 space-y-0.5 sm:mt-2 sm:ml-0'>
                      <div className='flex items-center gap-1.5 sm:justify-center'>
                        <span
                          className={cn('line-clamp-1 text-xs', styles.text)}
                        >
                          {node.roleTitle}
                        </span>
                      </div>
                      <p className='max-w-[150px] truncate text-[11px] text-muted-foreground sm:mx-auto'>
                        {node.actorName}
                      </p>
                      <Badge
                        variant='outline'
                        className={cn(
                          'h-4.5 px-1.5 py-0 text-[10px] leading-none font-medium',
                          styles.badge
                        )}
                      >
                        {node.statusLabel}
                      </Badge>
                      {node.dateText && (
                        <p className='text-[9px] text-muted-foreground/70 sm:mx-auto'>
                          {node.dateText}
                        </p>
                      )}
                    </div>
                  </div>
                </TooltipTrigger>
                <TooltipContent
                  side='bottom'
                  className='max-w-xs space-y-2 p-3 text-xs'
                >
                  <div className='flex items-center justify-between gap-2 border-b border-border/60 pb-1.5'>
                    <span className='text-xs font-bold text-foreground'>
                      {node.tierName}: {node.roleTitle}
                    </span>
                    <Badge
                      variant='outline'
                      className={cn(
                        'px-1.5 py-0 text-[10px] leading-tight font-medium',
                        styles.badge
                      )}
                    >
                      {node.statusLabel}
                    </Badge>
                  </div>
                  <p className='text-[11px] leading-relaxed text-muted-foreground'>
                    {node.description}
                  </p>
                  <div className='space-y-1 border-t border-border/60 pt-1.5 text-[11px]'>
                    <div className='flex items-center justify-between text-muted-foreground'>
                      <span>Penanggung Jawab:</span>
                      <span className='font-semibold text-foreground'>
                        {node.actorName}
                      </span>
                    </div>
                    {node.dateText && (
                      <div className='flex items-center justify-between text-muted-foreground'>
                        <span>Waktu Tindakan:</span>
                        <span className='font-mono text-foreground'>
                          {node.dateText}
                        </span>
                      </div>
                    )}
                  </div>
                </TooltipContent>
              </Tooltip>
            )
          })}
        </div>
      </div>
    </TooltipProvider>
  )
}
