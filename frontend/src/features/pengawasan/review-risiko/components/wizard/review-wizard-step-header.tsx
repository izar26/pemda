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
import { type SubmissionItem } from '@/services/pengajuan-risiko-service'

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
  currentItem,
  onApprove,
  onOpenReject,
}: ReviewWizardStepHeaderProps) {
  return (
    <>
      {/* Step Header with Auditor / Pengawas Action Bar */}
      <div className='p-3.5 sm:p-4 border-b bg-muted/20 flex flex-col md:flex-row md:items-center justify-between gap-3'>
        <div className='space-y-0.5'>
          <div className='flex items-center gap-2 flex-wrap'>
            <Badge
              variant='outline'
              className='font-mono text-xs font-bold px-2 py-0.5 border-primary/40 text-primary bg-primary/5'
            >
              LANGKAH {stepNumber} DARI {totalSteps} • FORM {stepCode}
            </Badge>
            <h3 className='text-sm sm:text-base font-bold text-foreground'>{stepTitle}</h3>
          </div>
          <p className='text-xs text-muted-foreground'>{stepSubtitle}</p>
        </div>

        {/* Decision Actions for This Step */}
        <div className='flex items-center gap-2 shrink-0 flex-wrap'>
          {isKepalaTier ? (
            <Badge className='bg-sky-500/15 text-sky-700 dark:text-sky-400 border border-sky-500/30 text-xs py-1 px-2.5 gap-1.5 font-semibold'>
              <Clock className='h-3.5 w-3.5 text-sky-600 animate-pulse' />
              Tahap Persetujuan Kepala OPD
            </Badge>
          ) : (
            <>
              {isApproved && (
                <Badge className='bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 text-xs py-1 px-2.5 gap-1.5 font-semibold'>
                  <CheckCircle2 className='h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400' />
                  {isPengawasTier ? 'Form Telah Disahkan Final' : 'Form Telah Disetujui'}
                </Badge>
              )}
              {isRejected && (
                <Badge className='bg-destructive/15 text-destructive border border-destructive/30 text-xs py-1 px-2.5 gap-1.5 font-semibold'>
                  <XCircle className='h-3.5 w-3.5 text-destructive' />
                  {isPengawasTier ? 'Ditolak ke Auditor' : 'Perlu Revisi OPD'}
                </Badge>
              )}
              {!isApproved && !isRejected && (
                <Badge className='bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30 text-xs py-1 px-2.5 gap-1.5 font-semibold'>
                  <Clock className='h-3.5 w-3.5 text-amber-600 animate-pulse' />
                  {isPengawasTier ? 'Menunggu Pengesahan Pengawas' : 'Menunggu Penilaian'}
                </Badge>
              )}

              <Button
                type='button'
                variant={isRejected ? 'secondary' : 'destructive'}
                size='sm'
                disabled={isPendingMutation || isDraftSubmission}
                onClick={onOpenReject}
                className='h-8 text-xs gap-1.5 font-medium'
              >
                <XCircle className='h-3.5 w-3.5' />
                <span>
                  {isRejected
                    ? 'Ubah Catatan'
                    : isPengawasTier
                    ? 'Kembalikan ke Auditor'
                    : 'Tolak ke Kepala OPD'}
                </span>
              </Button>

              <Button
                type='button'
                size='sm'
                disabled={isPendingMutation || isApproved || isDraftSubmission}
                onClick={onApprove}
                className='h-8 text-xs gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs font-semibold'
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
            </>
          )}
        </div>
      </div>

      {/* Draft Notice if OPD has not submitted */}
      {isDraftSubmission && (
        <div className='p-3 mx-3.5 sm:mx-4 mt-3 rounded-lg border border-amber-500/30 bg-amber-500/10 text-amber-800 dark:text-amber-400 text-xs flex items-center gap-2.5'>
          <Clock className='h-4 w-4 shrink-0 text-amber-600' />
          <span>
            Perangkat daerah belum mengirimkan lembar kerja risiko secara resmi (Status:{' '}
            <strong>Draft</strong>). Anda dapat melihat pratinjau data, namun tombol persetujuan baru
            akan aktif setelah OPD melakukan pengajuan resmi.
          </span>
        </div>
      )}

      {/* Existing Auditor Revision Note Alert if Rejected */}
      {isRejected && currentItem?.catatan_revisi && (
        <div className='m-3.5 sm:m-4 mb-0 p-3 rounded-lg border border-destructive/30 bg-destructive/10 text-destructive text-xs space-y-1.5 shadow-2xs'>
          <div className='flex items-center justify-between'>
            <div className='flex items-center gap-2 font-bold'>
              <AlertCircle className='h-4 w-4 shrink-0' />
              <span>Instruksi Catatan Revisi Auditor untuk Form {stepCode}:</span>
            </div>
            <Button
              variant='ghost'
              size='sm'
              onClick={onOpenReject}
              className='h-6 px-2 text-[11px] text-destructive hover:bg-destructive/15'
            >
              Ubah Catatan
            </Button>
          </div>
          <p className='leading-relaxed pl-6 text-foreground font-medium'>
            "{currentItem.catatan_revisi}"
          </p>
        </div>
      )}

      {/* Approval Banner if Approved */}
      {isApproved && (
        <div className='m-3.5 sm:m-4 mb-0 p-2.5 sm:p-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 text-xs flex items-center justify-between gap-3 shadow-2xs'>
          <div className='flex items-center gap-2 font-medium'>
            <CheckCircle2 className='h-4 w-4 text-emerald-600 shrink-0' />
            <span>
              Formulir {stepCode} telah diverifikasi dan disetujui resmi oleh Auditor Pengawas.
            </span>
          </div>
          <span className='text-[10px] font-mono text-muted-foreground'>
            {currentItem?.reviewed_at
              ? new Date(currentItem.reviewed_at).toLocaleString('id-ID')
              : 'Disetujui'}
          </span>
        </div>
      )}
    </>
  )
}
