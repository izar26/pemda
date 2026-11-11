import { useNavigate } from '@tanstack/react-router'
import { ArrowLeft, ArrowRight, Building2, Lock } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface IdentifikasiPemdaFooterNavProps {
  canEdit: boolean
  hasAuditor: boolean
  is3AApproved: boolean
  isLocked: boolean
  hasItems: boolean
}

export function IdentifikasiPemdaFooterNav({
  canEdit,
  hasAuditor,
  is3AApproved,
  isLocked,
  hasItems,
}: IdentifikasiPemdaFooterNavProps) {
  const navigate = useNavigate()

  return (
    <div className='bg-muted/40 px-3 sm:px-5 py-4 rounded-lg border flex min-w-0 flex-col lg:flex-row lg:items-center justify-between gap-3'>
      {/* Back to Form 2C */}
      <Button
        type='button'
        variant='outline'
        size='sm'
        onClick={() => navigate({ to: '/risiko/konteks-operasional' })}
        className='h-auto min-h-9 w-full whitespace-normal py-2 text-center sm:w-auto gap-1.5'
      >
        <ArrowLeft className='h-4 w-4' />
        <span>Kembali ke Konteks Operasional (2C)</span>
      </Button>

      <div className='flex min-w-0 items-center justify-end gap-2.5 flex-wrap'>
        {!hasItems && (
          <span className='text-xs text-muted-foreground'>Tambahkan minimal satu risiko sebelum melanjutkan.</span>
        )}
        {!canEdit && (
          <div className='flex items-center gap-2 text-xs text-muted-foreground italic py-1 px-3 rounded-md bg-background border'>
            <Lock className='h-3.5 w-3.5 shrink-0 text-amber-500' />
            <span>
              {!hasAuditor
                ? 'Formulir terkunci: Belum memiliki Auditor Pengawas yang ditugaskan.'
                : is3AApproved
                  ? 'Form 3A telah disetujui Auditor Pengawas (read-only).'
                  : isLocked
                    ? 'Formulir terkunci karena sedang diajukan atau dalam pemeriksaan.'
                    : 'Formulir sedang dalam pemeriksaan (read-only).'}
            </span>
          </div>
        )}

        {/* Forward to Form 3B */}
        <Button
          type='button'
          size='sm'
          disabled={!hasItems}
          onClick={() => navigate({ to: '/risiko/identifikasi-opd' })}
          className='h-auto min-h-9 w-full whitespace-normal py-2 text-center sm:w-auto gap-1.5 shadow-2xs font-semibold'
        >
          <Building2 className='h-4 w-4' />
          <span>Lanjut ke Identifikasi Risiko OPD (3B)</span>
          {hasItems && <span className='text-[10px] bg-primary-foreground/20 px-1.5 py-0.5 rounded'>Siap</span>}
          <ArrowRight className='h-4 w-4' />
        </Button>
      </div>
    </div>
  )
}
