import { useNavigate } from '@tanstack/react-router'
import { ArrowLeft, CheckCircle2, Lock } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface RcaFooterNavProps {
  canEdit: boolean
  hasAuditor: boolean
  isRcaApproved: boolean
  allComplete: boolean
  isLocked: boolean
  canContinue: boolean
}

export function RcaFooterNav({
  canEdit,
  hasAuditor,
  isRcaApproved,
  allComplete,
  isLocked,
  canContinue,
}: RcaFooterNavProps) {
  const navigate = useNavigate()

  return (
    <div className='bg-muted/40 px-3 sm:px-5 py-4 rounded-lg border flex min-w-0 flex-col lg:flex-row lg:items-center justify-between gap-3'>
      {/* Back to Form 3C */}
      <Button
        type='button'
        variant='outline'
        size='sm'
        onClick={() => navigate({ to: '/risiko/identifikasi-operasional' })}
        className='h-auto min-h-9 w-full whitespace-normal py-2 text-center sm:w-auto gap-1.5'
      >
        <ArrowLeft className='h-4 w-4' />
        <span>Kembali ke Identifikasi Risiko Operasional (3C)</span>
      </Button>

      <div className='flex min-w-0 items-center justify-end gap-2.5 flex-wrap'>
        <Button size='sm' disabled={!canContinue} onClick={() => navigate({ to: '/risiko/analisis-risiko' })}>Lanjut ke Analisis Risiko (4)</Button>
        {!canContinue && <span className='text-xs text-muted-foreground'>Lengkapi RCA sebelum melanjutkan.</span>}
        {allComplete && !isLocked && (
          <div className='flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-semibold py-1 px-3 rounded-md bg-emerald-500/10 border border-emerald-500/20'>
            <CheckCircle2 className='h-4 w-4' />
            <span>Seluruh lembar kerja (14/14) telah lengkap & siap diajukan.</span>
          </div>
        )}

        {!canEdit && (
          <div className='flex items-center gap-2 text-xs text-muted-foreground italic py-1 px-3 rounded-md bg-background border'>
            <Lock className='h-3.5 w-3.5 shrink-0 text-amber-500' />
            <span>
              {!hasAuditor
                ? 'Formulir terkunci: Belum memiliki Auditor Pengawas yang ditugaskan.'
                : isRcaApproved
                  ? 'Form RCA telah disetujui Auditor Pengawas (read-only).'
                  : 'Formulir sedang dalam pemeriksaan (read-only).'}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
