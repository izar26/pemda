import { ArrowLeft, ArrowRight, Loader2, Lock, Save } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface StrategisFooterNavProps {
  canEdit: boolean
  hasAuditor: boolean
  is2BApproved: boolean
  isSubmitting: boolean
  submitIntent: 'save' | 'save_and_next'
  onSetSubmitIntent: (intent: 'save' | 'save_and_next') => void
}

export function StrategisFooterNav({
  canEdit,
  hasAuditor,
  is2BApproved,
  isSubmitting,
  submitIntent,
  onSetSubmitIntent,
}: StrategisFooterNavProps) {
  return (
    <div className='bg-muted/40 px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3'>
      <Button
        type='button'
        variant='outline'
        size='sm'
        disabled
        className='gap-1.5 opacity-50'
      >
        <ArrowLeft className='h-4 w-4' />
        <span>Kembali</span>
      </Button>

      <div className='flex items-center justify-end gap-2.5 flex-wrap'>
        {canEdit ? (
          <>
            <Button
              type='submit'
              variant='outline'
              size='sm'
              disabled={isSubmitting}
              onClick={() => onSetSubmitIntent('save')}
              className='gap-1.5'
            >
              {isSubmitting && submitIntent === 'save' ? (
                <Loader2 className='h-4 w-4 animate-spin' />
              ) : (
                <Save className='h-4 w-4' />
              )}
              <span>Simpan</span>
            </Button>

            <Button
              type='submit'
              size='sm'
              disabled={isSubmitting}
              onClick={() => onSetSubmitIntent('save_and_next')}
              className='gap-1.5 shadow-2xs'
            >
              {isSubmitting && submitIntent === 'save_and_next' ? (
                <Loader2 className='h-4 w-4 animate-spin' />
              ) : (
                <>
                  <span>Simpan dan Lanjutkan</span>
                  <ArrowRight className='h-4 w-4' />
                </>
              )}
            </Button>
          </>
        ) : (
          <div className='flex items-center gap-2 text-xs text-muted-foreground italic py-1.5 px-3 rounded-lg bg-muted/40 border'>
            <Lock className='h-3.5 w-3.5 shrink-0 text-amber-500' />
            <span>
              {!hasAuditor
                ? 'Formulir terkunci: Perangkat Daerah belum memiliki Auditor Pengawas yang ditugaskan oleh Inspektorat.'
                : is2BApproved
                  ? 'Formulir 2B telah disetujui Auditor Pengawas (read-only).'
                  : 'Formulir sedang dalam pemeriksaan auditor (read-only).'}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
