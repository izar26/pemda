import { type SubmissionItem } from '@/services/pengajuan-risiko-service'
import {
  AlertCircle,
  ArrowRightCircle,
  Check,
  CheckCircle2,
  Clock,
  Loader2,
  RefreshCw,
  Send,
  XCircle,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

interface ReviewWizardStepHeaderProps {
  stepNumber: number
  totalSteps: number
  stepCode: string
  stepTitle: string
  stepSubtitle: string
  isApproved: boolean
  isRejected: boolean
  isInRevision?: boolean
  revisionLocation?: string
  revisionNote?: string | null
  isNeedsAction?: boolean
  incomingRevisionSource?: string
  incomingRevisionNote?: string | null
  isDraftSubmission: boolean
  isPendingMutation: boolean
  isPengawasTier?: boolean
  isKepalaTier?: boolean
  informationOnly?: boolean
  canDecide?: boolean
  currentItem?: SubmissionItem
  rejectButtonLabel?: string
  approveButtonLabel?: string
  onApprove: () => void
  onOpenReject: () => void
  onClarifyToPengawas?: () => void
}

export function ReviewWizardStepHeader({
  stepNumber,
  totalSteps,
  stepCode,
  stepTitle,
  stepSubtitle,
  isApproved,
  isRejected,
  isInRevision = false,
  revisionLocation,
  revisionNote,
  isNeedsAction = false,
  incomingRevisionSource,
  incomingRevisionNote,
  isDraftSubmission,
  isPendingMutation,
  isPengawasTier,
  isKepalaTier,
  informationOnly,
  canDecide = true,
  currentItem,
  rejectButtonLabel,
  approveButtonLabel,
  onApprove,
  onOpenReject,
  onClarifyToPengawas,
}: ReviewWizardStepHeaderProps) {
  const effectiveRejectLabel =
    rejectButtonLabel ||
    (isPengawasTier
      ? 'Tolak ke Evaluator'
      : isKepalaTier
        ? 'Tolak ke Operator'
        : 'Tolak ke Kepala OPD')

  const effectiveApproveLabel =
    approveButtonLabel ||
    (isApproved
      ? isPengawasTier
        ? 'Sudah Disetujui Pengawas'
        : 'Sudah Disetujui'
      : `Setujui Form ${stepCode}`)

  const activeNote = revisionNote || currentItem?.catatan_revisi

  return (
    <>
      {/* Step Header with Per-Form Decision Bar */}
      <div className='flex flex-col justify-between gap-3 border-b bg-muted/20 p-3.5 sm:p-4 md:flex-row md:items-center'>
        <div className='space-y-0.5'>
          <div className='flex flex-wrap items-center gap-2'>
            <Badge
              variant='outline'
              className='border-primary/40 bg-primary/5 px-2 py-0.5 font-mono text-xs font-bold text-primary'
            >
              LANGKAH {stepNumber} DARI {totalSteps} • FORM {stepCode}
            </Badge>
            <h3 className='text-sm font-bold text-foreground sm:text-base'>
              {stepTitle}
            </h3>
          </div>
          <p className='text-xs text-muted-foreground'>{stepSubtitle}</p>
        </div>

        {/* Decision Actions for This Step */}
        <div className='flex shrink-0 flex-wrap items-center gap-2'>
          {informationOnly ? (
            <Badge variant='outline'>Informasi saja</Badge>
          ) : (
            <>
              {isApproved && (
                <Badge className='gap-1.5 border border-emerald-500/30 bg-emerald-500/15 px-2.5 py-1 text-xs font-semibold text-emerald-700 dark:text-emerald-400'>
                  <CheckCircle2 className='h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400' />
                  Form Disetujui
                </Badge>
              )}
              {isInRevision && (
                <Badge className='gap-1.5 border border-amber-500/40 bg-amber-500/15 px-2.5 py-1 text-xs font-semibold text-amber-800 dark:text-amber-300'>
                  <RefreshCw className='h-3.5 w-3.5 text-amber-600' />
                  Sedang Direvisi ({revisionLocation || 'Menunggu Perbaikan'})
                </Badge>
              )}
              {isNeedsAction && !isInRevision && (
                <Badge className='gap-1.5 border border-amber-600/40 bg-amber-500/20 px-2.5 py-1 text-xs font-semibold text-amber-900 dark:text-amber-200'>
                  <AlertCircle className='h-3.5 w-3.5 text-amber-600' />
                  Perlu Tindak Lanjut Revisi
                </Badge>
              )}
              {!isApproved && !isInRevision && !isNeedsAction && !isRejected && (
                <Badge className='gap-1.5 border border-slate-400/30 bg-muted px-2.5 py-1 text-xs font-semibold text-muted-foreground'>
                  <Clock className='h-3.5 w-3.5' />
                  Menunggu Penilaian
                </Badge>
              )}

              {canDecide && onClarifyToPengawas && (
                <Button
                  type='button'
                  variant='outline'
                  size='sm'
                  disabled={isPendingMutation || isDraftSubmission}
                  onClick={onClarifyToPengawas}
                  className='h-8 gap-1.5 border-amber-600/40 text-xs font-medium text-amber-800 dark:text-amber-200'
                >
                  <Send className='h-3.5 w-3.5' />
                  <span>Klarifikasi ke Pengawas</span>
                </Button>
              )}

              {canDecide && !isInRevision && (
                <Button
                  type='button'
                  variant='destructive'
                  size='sm'
                  disabled={isPendingMutation || isDraftSubmission}
                  onClick={onOpenReject}
                  className='h-8 gap-1.5 text-xs font-medium'
                >
                  {isNeedsAction ? (
                    <ArrowRightCircle className='h-3.5 w-3.5' />
                  ) : (
                    <XCircle className='h-3.5 w-3.5' />
                  )}
                  <span>{effectiveRejectLabel}</span>
                </Button>
              )}

              {canDecide && !isInRevision && (
                <Button
                  type='button'
                  size='sm'
                  disabled={
                    isPendingMutation || isApproved || isDraftSubmission
                  }
                  onClick={onApprove}
                  className='h-8 gap-1.5 bg-emerald-600 text-xs font-semibold text-white shadow-2xs hover:bg-emerald-700'
                >
                  {isPendingMutation ? (
                    <Loader2 className='h-3.5 w-3.5 animate-spin' />
                  ) : (
                    <Check className='h-3.5 w-3.5' />
                  )}
                  <span>{effectiveApproveLabel}</span>
                </Button>
              )}
            </>
          )}
        </div>
      </div>

      {informationOnly && (
        <p className='mx-4 mt-3 rounded-lg border bg-muted/30 p-3 text-xs text-muted-foreground'>
          Form 4 belum menjadi bagian pengajuan ini. Data ditampilkan sebagai
          informasi dan tidak memengaruhi persetujuan.
        </p>
      )}

      {/* Draft Notice if OPD has not submitted */}
      {isDraftSubmission && (
        <div className='mx-3.5 mt-3 flex items-center gap-2.5 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-800 sm:mx-4 dark:text-amber-400'>
          <Clock className='h-4 w-4 shrink-0 text-amber-600' />
          <span>
            Perangkat daerah belum mengirimkan lembar kerja risiko secara resmi
            (Status: <strong>Draft</strong>). Anda dapat melihat pratinjau data,
            namun tombol persetujuan baru akan aktif setelah OPD melakukan
            pengajuan resmi.
          </span>
        </div>
      )}

      {/* Yellow Revision-In-Progress Banner (Waiting for Lower Tier Fix) */}
      {isInRevision && (
        <div className='m-3.5 mb-0 space-y-1.5 rounded-lg border border-amber-500/40 bg-amber-500/15 p-3 text-xs text-amber-900 shadow-2xs sm:m-4 dark:text-amber-200'>
          <div className='flex items-center gap-2 font-bold'>
            <RefreshCw className='h-4 w-4 shrink-0 text-amber-600' />
            <span>
              Form {stepCode} sedang dalam proses perbaikan (
              {revisionLocation || 'Menunggu Perbaikan'}). Anda tetap dapat
              melanjutkan penilaian pada formulir lainnya.
            </span>
          </div>
          {activeNote && (
            <p className='pl-6 leading-relaxed font-medium text-foreground'>
              Catatan Revisi: "{activeNote}"
            </p>
          )}
        </div>
      )}

      {/* Incoming Revision From Upper Tier (Pre-fill Ready) */}
      {isNeedsAction && !isInRevision && incomingRevisionNote && (
        <div className='m-3.5 mb-0 space-y-1.5 rounded-lg border border-amber-600/40 bg-amber-500/15 p-3 text-xs text-amber-900 shadow-2xs sm:m-4 dark:text-amber-200'>
          <div className='flex items-center gap-2 font-bold'>
            <AlertCircle className='h-4 w-4 shrink-0 text-amber-600' />
            <span>
              Catatan Penolakan dari {incomingRevisionSource || 'Jenjang Atas'}{' '}
              untuk Form {stepCode} (otomatis terisi saat diteruskan):
            </span>
          </div>
          <p className='pl-6 leading-relaxed font-medium text-foreground'>
            "{incomingRevisionNote}"
          </p>
        </div>
      )}

      {/* Approval Banner if Approved */}
      {isApproved && (
        <div className='m-3.5 mb-0 flex items-center justify-between gap-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-2.5 text-xs text-emerald-800 shadow-2xs sm:m-4 sm:p-3 dark:text-emerald-300'>
          <div className='flex items-center gap-2 font-medium'>
            <CheckCircle2 className='h-4 w-4 shrink-0 text-emerald-600' />
            <span>
              Formulir {stepCode} telah diverifikasi dan disetujui pada tahap
              ini.
            </span>
          </div>
          <span className='font-mono text-[10px] text-muted-foreground'>
            {currentItem?.reviewed_at
              ? new Date(currentItem.reviewed_at).toLocaleString('id-ID')
              : 'Disetujui'}
          </span>
        </div>
      )}
    </>
  )
}
