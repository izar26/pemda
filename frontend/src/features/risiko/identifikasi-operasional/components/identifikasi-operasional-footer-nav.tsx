import { useNavigate } from '@tanstack/react-router'
import { ArrowLeft, ArrowRight, BrainCircuit, Lock } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface IdentifikasiOperasionalFooterNavProps {
  canEdit: boolean
  hasAuditor: boolean
  is3CApproved: boolean
  isLocked: boolean
  hasItems: boolean
}

export function IdentifikasiOperasionalFooterNav({
  canEdit,
  hasAuditor,
  is3CApproved,
  isLocked,
  hasItems,
}: IdentifikasiOperasionalFooterNavProps) {
  const navigate = useNavigate()

  return (
    <div className='bg-muted/40 px-5 py-4 rounded-lg border flex flex-col sm:flex-row sm:items-center justify-between gap-3'>
      {/* Back to Form 3B */}
      <Button
        type='button'
        variant='outline'
        size='sm'
        onClick={() => navigate({ to: '/risiko/identifikasi-opd' })}
        className='gap-1.5'
      >
        <ArrowLeft className='h-4 w-4' />
        <span>Kembali ke Identifikasi OPD (3B)</span>
      </Button>

      <div className='flex items-center justify-end gap-2.5 flex-wrap'>
        {!canEdit && (
          <div className='flex items-center gap-2 text-xs text-muted-foreground italic py-1 px-3 rounded-md bg-background border'>
            <Lock className='h-3.5 w-3.5 shrink-0 text-amber-500' />
            <span>
              {!hasAuditor
                ? 'Formulir terkunci: Belum memiliki Auditor Pengawas yang ditugaskan.'
                : is3CApproved
                  ? 'Form 3C telah disetujui Auditor Pengawas (read-only).'
                  : isLocked
                    ? 'Formulir terkunci karena sedang diajukan atau dalam pemeriksaan.'
                    : 'Formulir sedang dalam pemeriksaan (read-only).'}
            </span>
          </div>
        )}

        {/* Forward to Form RCA */}
        <Button
          type='button'
          size='sm'
          onClick={() => navigate({ to: '/risiko/rca' })}
          className='gap-1.5 shadow-2xs font-semibold'
        >
          <BrainCircuit className='h-4 w-4' />
          <span>Lanjut ke Analisis Akar Masalah (RCA)</span>
          {hasItems && <span className='text-[10px] bg-primary-foreground/20 px-1.5 py-0.5 rounded'>Siap</span>}
          <ArrowRight className='h-4 w-4' />
        </Button>
      </div>
    </div>
  )
}
