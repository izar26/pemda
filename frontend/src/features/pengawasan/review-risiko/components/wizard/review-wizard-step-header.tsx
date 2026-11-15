import { type SubmissionItem } from '@/services/pengajuan-risiko-service'
import {
  AlertCircle,
  Check,
  CheckCircle2,
  Clock,
  Loader2,
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
  isDraftSubmission: boolean
  isPendingMutation: boolean
  isPengawasTier?: boolean
  isKepalaTier?: boolean
  informationOnly?: boolean
  canDecide?: boolean
  currentItem?: SubmissionItem
  onApprove: () => void
  onOpenReject: () => void
}

export function ReviewWizardStepHeader({
  stepNumber,
  totalSteps,
  stepCode,
  stepTitle,
  stepSubtitle,
  isApproved,
  isRejected,
  isDraftSubmission,
  isPendingMutation,
  isPengawasTier,
  isKepalaTier,
  informationOnly,
  canDecide = true,
  currentItem,
  onApprove,
  onOpenReject,
}: ReviewWizardStepHeaderProps) {
  return (
    <>
      {/* Step Header with Auditor / Pengawas Action Bar */}
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
          ) : isKepalaTier ? (
            <Badge className='gap-1.5 border border-sky-500/30 bg-sky-500/15 px-2.5 py-1 text-xs font-semibold text-sky-700 dark:text-sky-400'>
              <Clock className='h-3.5 w-3.5 animate-pulse text-sky-600' />
              Tahap Persetujuan Kepala OPD
            </Badge>
          ) : (
            <>
              {isApproved && (
                <Badge className='gap-1.5 border border-emerald-500/30 bg-emerald-500/15 px-2.5 py-1 text-xs font-semibold text-emerald-700 dark:text-emerald-400'>
                  <CheckCircle2 className='h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400' />
                  {isPengawasTier
                    ? 'Form Telah Disahkan Final'
                    : 'Form Telah Disetujui'}
                </Badge>
              )}
              {isRejected && (
                <Badge className='gap-1.5 border border-destructive/30 bg-destructive/15 px-2.5 py-1 text-xs font-semibold text-destructive'>
                  <XCircle className='h-3.5 w-3.5 text-destructive' />
                  {isPengawasTier ? 'Ditolak ke Evaluator' : 'Perlu Revisi OPD'}
                </Badge>
              )}
              {!isApproved && !isRejected && (
                <Badge className='gap-1.5 border border-amber-500/30 bg-amber-500/15 px-2.5 py-1 text-xs font-semibold text-amber-700 dark:text-amber-400'>
                  <Clock className='h-3.5 w-3.5 animate-pulse text-amber-600' />
                  {isPengawasTier
                    ? 'Menunggu Pengesahan Pengawas'
                    : 'Menunggu Penilaian'}
                </Badge>
              )}

              {canDecide && (
                <Button
                  type='button'
                  variant={isRejected ? 'secondary' : 'destructive'}
                  size='sm'
                  disabled={isPendingMutation || isDraftSubmission}
                  onClick={onOpenReject}
                  className='h-8 gap-1.5 text-xs font-medium'
                >
                  <XCircle className='h-3.5 w-3.5' />
                  <span>
                    {isRejected
                      ? 'Ubah Catatan'
                      : isPengawasTier
                        ? 'Kembalikan ke Evaluator'
                        : 'Tolak ke Kepala OPD'}
                  </span>
                </Button>
              )}

              {canDecide && (
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
                  <span>
                    {isApproved
                      ? isPengawasTier
                        ? 'Sudah Disahkan'
                        : 'Sudah Disetujui'
                      : isPengawasTier
                        ? `Sahkan Form ${stepCode}`
                        : `Setujui Form ${stepCode}`}
                  </span>
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

      {/* Existing Auditor Revision Note Alert if Rejected */}
      {isRejected && currentItem?.catatan_revisi && (
        <div className='m-3.5 mb-0 space-y-1.5 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive shadow-2xs sm:m-4'>
          <div className='flex items-center justify-between'>
            <div className='flex items-center gap-2 font-bold'>
              <AlertCircle className='h-4 w-4 shrink-0' />
              <span>
                Instruksi Catatan Revisi Evaluator untuk Form {stepCode}:
              </span>
            </div>
            {canDecide && (
              <Button
                variant='ghost'
                size='sm'
                onClick={onOpenReject}
                className='h-6 px-2 text-[11px] text-destructive hover:bg-destructive/15'
              >
                Ubah Catatan
              </Button>
            )}
          </div>
          <p className='pl-6 leading-relaxed font-medium text-foreground'>
            "{currentItem.catatan_revisi}"
          </p>
        </div>
      )}

      {/* Approval Banner if Approved */}
      {isApproved && (
        <div className='m-3.5 mb-0 flex items-center justify-between gap-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-2.5 text-xs text-emerald-800 shadow-2xs sm:m-4 sm:p-3 dark:text-emerald-300'>
          <div className='flex items-center gap-2 font-medium'>
            <CheckCircle2 className='h-4 w-4 shrink-0 text-emerald-600' />
            <span>
              Formulir {stepCode} telah diverifikasi dan disetujui resmi oleh
              Evaluator Pengawas.
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
