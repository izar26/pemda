import { useState } from 'react'
import { isAxiosError } from 'axios'
import { toast } from 'sonner'
import { useQuery } from '@tanstack/react-query'
import { Copy, Calendar, Loader2 } from 'lucide-react'
import { opdService } from '@/services/opd-service'
import { perencanaanService } from '@/services/perencanaan-service'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

export interface IkuCopyDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

export function IkuCopyDialog({
  open,
  onOpenChange,
  onSuccess,
}: IkuCopyDialogProps) {
  const [sourcePeriodeId, setSourcePeriodeId] = useState('')
  const [selectedOpdId, setSelectedOpdId] = useState<string>('all')
  const [selectedJenis, setSelectedJenis] = useState<string>('all')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const { data: periodesData } = useQuery({
    queryKey: ['periodes', 'for-copy-source-iku'],
    queryFn: () => perencanaanService.getPaginatedPeriodes({ all: true }),
    staleTime: 5 * 60 * 1000,
  })

  const { data: opdList = [] } = useQuery({
    queryKey: ['opds', 'all-for-copy-iku'],
    queryFn: () => opdService.getOpds({ all: true }),
    staleTime: 5 * 60 * 1000,
  })

  const periodes = periodesData?.data || []
  const pastPeriodes = periodes.filter((p) => !p.is_aktif)

  async function handleCopy() {
    if (!sourcePeriodeId) {
      toast.error('Silakan pilih periode asal terlebih dahulu.')
      return
    }

    setIsSubmitting(true)
    try {
      const res = await perencanaanService.copyIndikator({
        source_periode_id: sourcePeriodeId,
        opd_id: selectedOpdId === 'all' ? undefined : selectedOpdId,
        jenis: selectedJenis === 'all' ? undefined : selectedJenis,
      })
      toast.success(res.message || 'Data indikator/IKU berhasil disalin ke periode aktif.')
      onSuccess()
      onOpenChange(false)
    } catch (error) {
      if (isAxiosError(error) && error.response?.data?.message) {
        toast.error(error.response.data.message)
      } else {
        toast.error('Gagal menyalin data indikator/IKU dari periode lain.')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-lg max-h-[88vh] flex flex-col p-0 gap-0 overflow-hidden shadow-2xl'>
        <DialogHeader className='px-6 pt-5 pb-4 border-b bg-muted/10 shrink-0 text-start'>
          <div className='flex items-center gap-3'>
            <div className='flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary'>
              <Copy className='h-5 w-5' />
            </div>
            <div>
              <DialogTitle className='text-lg font-bold text-foreground'>
                Salin Indikator / IKU dari Periode Lain
              </DialogTitle>
              <DialogDescription className='text-xs text-muted-foreground mt-0.5'>
                Duplikasi rumusan tolok ukur IKU dan Indikator Renstra dari siklus lampau ke periode aktif berjalan.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className='flex-1 overflow-y-auto px-6 py-4 space-y-4'>
          <div className='p-3 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-700 dark:text-blue-400 text-xs flex items-start gap-2'>
            <Calendar className='h-4 w-4 shrink-0 mt-0.5' />
            <span>
              Sistem akan memetakan indikator ke sasaran dan tujuan terkait di periode aktif. Bila pohon sasaran induk belum ada di periode aktif, sistem akan menyalinnya secara otomatis.
            </span>
          </div>

          <div className='space-y-1.5'>
            <label className='text-xs font-semibold text-foreground'>
              Periode Sumber (Asal) <span className='text-destructive'>*</span>
            </label>
            <Select value={sourcePeriodeId} onValueChange={setSourcePeriodeId}>
              <SelectTrigger className='w-full'>
                <SelectValue placeholder='Pilih periode lampau sumber...' />
              </SelectTrigger>
            </Select>
            <SelectContent>
              {pastPeriodes.length === 0 ? (
                <div className='p-2 text-center text-xs text-muted-foreground'>
                  Tidak ada periode lampau lain yang tersedia.
                </div>
              ) : (
                pastPeriodes.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.nama_periode} (Tahun {p.tahun_penilaian})
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </div>

          <div className='space-y-1.5'>
            <label className='text-xs font-semibold text-foreground'>
              Filter Klasifikasi Jenis
            </label>
            <Select value={selectedJenis} onValueChange={setSelectedJenis}>
              <SelectTrigger className='w-full'>
                <SelectValue placeholder='Semua Jenis Indikator' />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='all'>Semua Jenis (IKU & Indikator Renstra)</SelectItem>
                <SelectItem value='IKU'>Hanya IKU (Indikator Kinerja Utama)</SelectItem>
                <SelectItem value='Biasa'>Hanya Indikator Renstra Biasa</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className='space-y-1.5'>
            <label className='text-xs font-semibold text-foreground'>
              Filter Perangkat Daerah (Opsional)
            </label>
            <Select value={selectedOpdId} onValueChange={setSelectedOpdId}>
              <SelectTrigger className='w-full'>
                <SelectValue placeholder='Semua Perangkat Daerah' />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='all'>Semua Perangkat Daerah (Seluruh OPD)</SelectItem>
                {opdList.map((opd) => (
                  <SelectItem key={opd.id} value={String(opd.id)}>
                    {opd.nama}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className='text-[11px] text-muted-foreground'>
              Pilih satu OPD tertentu jika hanya ingin menyalin indikator pada instansi tersebut.
            </p>
          </div>
        </div>

        <DialogFooter className='px-6 py-3 border-t bg-muted/10 shrink-0 flex items-center justify-end gap-2'>
          <Button
            type='button'
            variant='outline'
            size='sm'
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Batal
          </Button>
          <Button
            type='button'
            size='sm'
            onClick={handleCopy}
            disabled={isSubmitting || !sourcePeriodeId}
            className='min-w-[120px]'
          >
            {isSubmitting ? (
              <>
                <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                Menyalin...
              </>
            ) : (
              'Salin Indikator'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
