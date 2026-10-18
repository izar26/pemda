import { Loader2, RefreshCw, RotateCcw, ShieldAlert } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

interface StrategisImpactDialogProps {
  open: boolean
  isSubmitting: boolean
  changedSumberData: boolean
  changedTujuan: boolean
  programsCount: number
  kegiatansCount: number
  subKegiatansCount: number
  impactMode: 'keep' | 'reset'
  onImpactModeChange: (mode: 'keep' | 'reset') => void
  onCancel: () => void
  onConfirm: () => void
}

export function StrategisImpactDialog({
  open,
  isSubmitting,
  changedSumberData,
  changedTujuan,
  programsCount,
  kegiatansCount,
  subKegiatansCount,
  impactMode,
  onImpactModeChange,
  onCancel,
  onConfirm,
}: StrategisImpactDialogProps) {
  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => !nextOpen && !isSubmitting && onCancel()}
    >
      <DialogContent className='sm:max-w-lg'>
        <DialogHeader>
          <div className='flex items-center gap-2.5'>
            <div className='flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400'>
              <ShieldAlert className='h-5 w-5' />
            </div>
            <div>
              <DialogTitle className='text-base font-bold'>
                Konfirmasi Dampak Perubahan Krusial (2B &rarr; 2C)
              </DialogTitle>
              <DialogDescription className='text-xs'>
                Perubahan pada Form 2B ini berdampak langsung pada Form 2C (Konteks Operasional).
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className='space-y-3 py-2 text-xs'>
          <div className='rounded-lg border border-amber-500/30 bg-amber-500/5 p-3.5 space-y-1.5'>
            <p className='font-semibold text-foreground'>
              Perubahan Krusial yang Terdeteksi di Form 2B:
            </p>
            <ul className='list-disc pl-4 space-y-1 text-muted-foreground'>
              {changedSumberData && (
                <li>
                  Perubahan <strong>Sumber Data</strong> acuan dokumen perencanaan.
                </li>
              )}
              {changedTujuan && (
                <li>
                  Pergantian <strong>Tujuan Strategis OPD</strong> yang menjadi induk konteks operasional.
                </li>
              )}
            </ul>
            <p className='pt-1 text-muted-foreground'>
              Saat ini pada <strong>Langkah 2 (Form 2C)</strong> telah tercatat:{' '}
              <strong className='text-foreground'>
                {programsCount} Program, {kegiatansCount} Kegiatan, dan{' '}
                {subKegiatansCount} Sub Kegiatan
              </strong>
              .
            </p>
          </div>

          <div className='space-y-2'>
            <p className='font-semibold text-foreground'>
              Pilih tindakan terhadap data rincian di Form 2C:
            </p>

            <label
              onClick={() => onImpactModeChange('keep')}
              className={cn(
                'flex items-start gap-3 rounded-lg border p-3 cursor-pointer transition-all',
                impactMode === 'keep'
                  ? 'border-primary bg-primary/5 ring-1 ring-primary/25'
                  : 'border-border hover:bg-muted/40'
              )}
            >
              <RefreshCw className='h-4 w-4 text-primary shrink-0 mt-0.5' />
              <div className='space-y-0.5'>
                <p className='font-semibold text-foreground'>
                  Pertahankan Rincian 2C & Perbarui Acuan (Recommended)
                </p>
                <p className='text-[11px] text-muted-foreground'>
                  Daftar Program, Kegiatan, dan Sub Kegiatan di 2C tetap disimpan, dan acuan Sumber Data serta Tujuan Strategis otomatis disinkronkan mengikuti perubahan 2B.
                </p>
              </div>
            </label>

            <label
              onClick={() => onImpactModeChange('reset')}
              className={cn(
                'flex items-start gap-3 rounded-lg border p-3 cursor-pointer transition-all',
                impactMode === 'reset'
                  ? 'border-destructive bg-destructive/5 ring-1 ring-destructive/25'
                  : 'border-border hover:bg-muted/40'
              )}
            >
              <RotateCcw className='h-4 w-4 text-destructive shrink-0 mt-0.5' />
              <div className='space-y-0.5'>
                <p className='font-semibold text-destructive'>
                  Reset / Kosongkan Rincian Form 2C dari Nol
                </p>
                <p className='text-[11px] text-muted-foreground'>
                  Hapus seluruh rincian Program, Kegiatan, dan Sub Kegiatan yang ada di Form 2C agar dapat diisi ulang dari awal sesuai Tujuan Strategis baru.
                </p>
              </div>
            </label>
          </div>
        </div>

        <DialogFooter className='gap-2 sm:gap-0'>
          <Button
            type='button'
            variant='outline'
            size='sm'
            disabled={isSubmitting}
            onClick={onCancel}
          >
            Batal
          </Button>
          <Button
            type='button'
            size='sm'
            variant={impactMode === 'reset' ? 'destructive' : 'default'}
            disabled={isSubmitting}
            onClick={onConfirm}
            className='gap-1.5'
          >
            {isSubmitting && <Loader2 className='h-4 w-4 animate-spin' />}
            <span>
              {impactMode === 'reset'
                ? 'Ya, Simpan 2B & Reset Rincian 2C'
                : 'Ya, Simpan & Sinkronkan ke 2C'}
            </span>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
