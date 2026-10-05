import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Archive,
  Calendar,
  Loader2,
  Lock,
} from 'lucide-react'
import { toast } from 'sonner'
import { isAxiosError } from 'axios'
import { format, parseISO } from 'date-fns'
import { id as idLocale } from 'date-fns/locale'
import { auditService } from '@/services/audit-service'
import { cn } from '@/lib/utils'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Calendar as DayCalendar } from '@/components/ui/calendar'
import { Label } from '@/components/ui/label'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'

interface AuditPurgeDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

export function AuditPurgeDialog({
  open,
  onOpenChange,
  onSuccess,
}: AuditPurgeDialogProps) {
  const queryClient = useQueryClient()
  const [selectedThreshold, setSelectedThreshold] = useState<number>(90)
  const [customCutoffDate, setCustomCutoffDate] = useState<string>('')
  const [useCustomDate, setUseCustomDate] = useState<boolean>(false)

  // Fetch current stats
  const { data: statsResponse, isLoading: isLoadingStats } = useQuery({
    queryKey: ['audit-stats'],
    queryFn: () => auditService.getStats(),
    enabled: open,
  })

  const stats = statsResponse?.data

  const purgeMutation = useMutation({
    mutationFn: async () => {
      if (useCustomDate && customCutoffDate) {
        return auditService.triggerArchivePurge({ cutoff_date: customCutoffDate })
      }
      return auditService.triggerArchivePurge({ days: selectedThreshold })
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['audit-logs'] })
      queryClient.invalidateQueries({ queryKey: ['audit-archives'] })
      queryClient.invalidateQueries({ queryKey: ['audit-stats'] })
      toast.success(res.message)
      onOpenChange(false)
      onSuccess?.()
    },
    onError: (err) => {
      const msg =
        isAxiosError(err) && err.response?.data?.message
          ? err.response.data.message
          : 'Gagal menjalankan pengarsipan dan pembersihan log audit.'
      toast.error(msg)
    },
  })

  const presets = [
    { label: '> 30 Hari', days: 30, desc: 'Paling agresif, server super ringan' },
    { label: '> 90 Hari', days: 90, desc: 'Standar triwulan (Disarankan)', recommended: true },
    { label: '> 180 Hari', days: 180, desc: 'Standar semester (6 bulan)' },
    { label: '> 1 Tahun', days: 365, desc: 'Simpan 1 tahun aktif di operasional' },
  ]

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='max-w-xl'>
        <DialogHeader>
          <div className='flex items-center gap-2 text-primary'>
            <div className='flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10'>
              <Archive className='h-5 w-5 text-primary' />
            </div>
            <div>
              <DialogTitle className='text-lg'>
                Arsipkan & Bersihkan Log Operasional
              </DialogTitle>
              <DialogDescription className='text-xs'>
                Pindahkan data log lama ke Kubah Arsip Permanen (WORM) dan bersihkan tabel aktif.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className='space-y-4 py-2 text-xs'>
          {/* Status Metrik Saat Ini */}
          <div className='grid grid-cols-2 sm:grid-cols-3 gap-2.5 rounded-lg border bg-muted/40 p-3'>
            <div>
              <span className='text-[11px] text-muted-foreground block'>Log Aktif Berjalan</span>
              <span className='text-base font-bold text-foreground'>
                {isLoadingStats ? '...' : (stats?.active_logs_count ?? 0).toLocaleString('id-ID')}
              </span>
            </div>
            <div>
              <span className='text-[11px] text-muted-foreground block'>Tersimpan di Kubah Arsip</span>
              <span className='text-base font-bold text-emerald-600 dark:text-emerald-400'>
                {isLoadingStats ? '...' : (stats?.archived_logs_count ?? 0).toLocaleString('id-ID')}
              </span>
            </div>
            <div className='col-span-2 sm:col-span-1'>
              <span className='text-[11px] text-muted-foreground block'>Log Aktif Terlama</span>
              <span className='text-[11px] font-mono text-foreground line-clamp-1 mt-1'>
                {isLoadingStats
                  ? '...'
                  : stats?.oldest_active_log
                    ? new Date(stats.oldest_active_log).toLocaleDateString('id-ID', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })
                    : 'Belum ada data'}
              </span>
            </div>
          </div>

          {/* Security Notice */}
          <div className='flex items-start gap-2.5 rounded-lg border border-blue-200 bg-blue-50/70 dark:border-blue-900/60 dark:bg-blue-950/30 p-3'>
            <Lock className='h-4 w-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5' />
            <div className='text-xs text-blue-950 dark:text-blue-200 leading-relaxed'>
              <span className='font-semibold'>Jaminan Integritas & Anti-Hilang:</span> Seluruh log yang melewati batas tanggal akan <strong>disalin ke Kubah Arsip Permanen</strong> terlebih dahulu sebelum dihapus dari tabel operasional. Catatan di Kubah Arsip dilindungi proteksi database <em>Write-Once-Read-Many</em> dan <strong>tidak dapat dihapus selamanya</strong>.
            </div>
          </div>

          {/* Preset Buttons */}
          <div className='space-y-2'>
            <Label className='text-xs font-semibold text-foreground'>
              Pilih Ambang Batas Retensi Log Aktif:
            </Label>
            <div className='grid grid-cols-2 gap-2'>
              {presets.map((preset) => (
                <button
                  key={preset.days}
                  type='button'
                  onClick={() => {
                    setSelectedThreshold(preset.days)
                    setUseCustomDate(false)
                  }}
                  className={`flex flex-col text-left p-2.5 rounded-lg border transition-all text-xs ${
                    !useCustomDate && selectedThreshold === preset.days
                      ? 'border-primary bg-primary/5 ring-1 ring-primary text-foreground'
                      : 'border-border bg-card hover:bg-muted/50 text-muted-foreground'
                  }`}
                >
                  <div className='flex items-center justify-between font-semibold'>
                    <span className={!useCustomDate && selectedThreshold === preset.days ? 'text-primary' : ''}>
                      {preset.label}
                    </span>
                    {preset.recommended && (
                      <span className='text-[10px] bg-primary/10 text-primary px-1.5 py-0.2 rounded font-normal'>
                        Disarankan
                      </span>
                    )}
                  </div>
                  <span className='text-[11px] text-muted-foreground mt-0.5'>
                    {preset.desc}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Custom Date Option */}
          <div className='pt-1'>
            <button
              type='button'
              onClick={() => setUseCustomDate(!useCustomDate)}
              className='text-xs font-medium text-primary hover:underline flex items-center gap-1.5'
            >
              <Calendar className='h-3.5 w-3.5' />
              {useCustomDate ? 'Kembali ke pilihan preset' : 'Gunakan tanggal batas kustom (Cutoff)'}
            </button>

            {useCustomDate && (
              <div className='mt-2.5 space-y-1.5'>
                <Label className='text-xs'>
                  Arsipkan seluruh log yang dibuat <strong>sebelum</strong> tanggal:
                </Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      type='button'
                      variant='outline'
                      size='sm'
                      className={cn(
                        'h-8 w-full max-w-xs justify-start gap-2 text-xs font-normal',
                        !customCutoffDate && 'text-muted-foreground'
                      )}
                    >
                      <Calendar className='h-3.5 w-3.5' />
                      {customCutoffDate
                        ? format(parseISO(customCutoffDate), 'dd MMMM yyyy', { locale: idLocale })
                        : 'Pilih tanggal batas'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent align='start' className='w-auto p-0'>
                    <DayCalendar
                      mode='single'
                      selected={customCutoffDate ? parseISO(customCutoffDate) : undefined}
                      onSelect={(date) =>
                        setCustomCutoffDate(date ? format(date, 'yyyy-MM-dd') : '')
                      }
                      disabled={{ after: new Date() }}
                    />
                  </PopoverContent>
                </Popover>
                <p className='text-[11px] text-muted-foreground'>
                  Log pada tanggal yang dipilih dan sesudahnya tetap berada di tabel aktif.
                </p>
              </div>
            )}
          </div>
        </div>

        <DialogFooter className='gap-2 sm:gap-0'>
          <Button
            type='button'
            variant='outline'
            size='sm'
            onClick={() => onOpenChange(false)}
            disabled={purgeMutation.isPending}
            className='text-xs'
          >
            Batal
          </Button>
          <Button
            type='button'
            variant='default'
            size='sm'
            onClick={() => purgeMutation.mutate()}
            disabled={purgeMutation.isPending || (useCustomDate && !customCutoffDate)}
            className='text-xs gap-1.5 bg-primary'
          >
            {purgeMutation.isPending ? (
              <>
                <Loader2 className='h-3.5 w-3.5 animate-spin' />
                Memproses Pengarsipan...
              </>
            ) : (
              <>
                <Archive className='h-3.5 w-3.5' />
                Eksekusi Pengarsipan & Bersihkan
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
