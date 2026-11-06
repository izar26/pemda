import type { ReactNode } from 'react'
import { Building2, ChevronDown, ChevronRight, Flag, Gauge, Plus, Target } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type { OpdGroupItem } from './types'

interface TujuanOpdGroupProps {
  opdGroup: OpdGroupItem
  isOpdExpanded: boolean
  toggleOpd: (opdId: string) => void
  canCreate: boolean
  onCreateTujuanForOpd: (opdId: string) => void
  children: ReactNode
}

export function TujuanOpdGroup({
  opdGroup,
  isOpdExpanded,
  toggleOpd,
  canCreate,
  onCreateTujuanForOpd,
  children,
}: TujuanOpdGroupProps) {
  return (
    <div className='rounded-2xl border bg-card/60 shadow-xs transition-all overflow-hidden'>
      {/* Header Pembungkus OPD */}
      <div
        onClick={() => toggleOpd(opdGroup.opdId)}
        className='flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-3.5 cursor-pointer bg-gradient-to-r from-primary/[0.04] via-muted/20 to-transparent hover:bg-muted/40 transition-colors select-none'
      >
        <div className='flex items-center gap-3 min-w-0 flex-1'>
          <div
            className='flex h-7 w-7 shrink-0 items-center justify-center rounded-md border bg-background text-muted-foreground hover:text-foreground transition-transform'
            title={isOpdExpanded ? 'Tutup OPD' : 'Buka OPD'}
          >
            {isOpdExpanded ? (
              <ChevronDown className='h-4 w-4' />
            ) : (
              <ChevronRight className='h-4 w-4' />
            )}
          </div>

          <div className='flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary shrink-0'>
            <Building2 className='h-4 w-4' />
          </div>

          <div className='space-y-0.5 min-w-0 flex-1'>
            <div className='flex flex-wrap items-center gap-2'>
              <h3 className='text-sm font-bold text-foreground leading-snug break-words'>
                {opdGroup.opdNama}
              </h3>
              {opdGroup.opdKode && (
                <Badge
                  variant='outline'
                  className='text-[10px] font-semibold uppercase tracking-wider bg-background'
                >
                  {opdGroup.opdKode}
                </Badge>
              )}
            </div>
            <p className='text-xs text-muted-foreground'>
              Klik untuk {isOpdExpanded ? 'menutup' : 'melihat'} pohon kinerja instansi ini
            </p>
          </div>
        </div>

        <div className='flex items-center gap-2 shrink-0 self-end sm:self-center flex-wrap sm:flex-nowrap'>
          <Badge
            variant='secondary'
            className='text-xs font-semibold bg-primary/10 text-primary border-primary/20'
          >
            <Flag className='h-3 w-3 mr-1 text-primary' />
            {opdGroup.tujuans.length} Tujuan
          </Badge>

          <Badge
            variant='outline'
            className='text-xs font-medium bg-background text-muted-foreground'
          >
            <Target className='h-3 w-3 mr-1' />
            {opdGroup.totalSasaran} Sasaran
          </Badge>

          <Badge
            variant='outline'
            className='text-xs font-medium bg-background text-muted-foreground'
          >
            <Gauge className='h-3 w-3 mr-1' />
            {opdGroup.totalIndikator} Indikator
          </Badge>

          {canCreate && (
            <Button
              variant='outline'
              size='sm'
              className='h-8 px-2.5 text-xs border-primary/30 text-primary hover:bg-primary/10 ml-1'
              onClick={(e) => {
                e.stopPropagation()
                onCreateTujuanForOpd(opdGroup.opdId)
              }}
            >
              <Plus className='h-3.5 w-3.5 mr-1' />
              Tujuan
            </Button>
          )}
        </div>
      </div>

      {/* Konten Pohon Kinerja di Dalam OPD (Saat Dibuka) */}
      {isOpdExpanded && (
        <div className='border-t bg-muted/[0.04] p-3.5 sm:p-4 space-y-3'>
          {children}
        </div>
      )}
    </div>
  )
}
