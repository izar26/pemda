import { useState } from 'react'
import { isAxiosError } from 'axios'
import { toast } from 'sonner'
import { AlertTriangle, Trash2 } from 'lucide-react'
import { perencanaanService } from '@/services/perencanaan-service'
import type { IndikatorPenilaianItem } from '@/types/perencanaan'
import { ConfirmDialog } from '@/components/confirm-dialog'

export interface IkuDeleteDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  currentRow: IndikatorPenilaianItem
  onSuccess: () => void
}

export function IkuDeleteDialog({
  open,
  onOpenChange,
  currentRow,
  onSuccess,
}: IkuDeleteDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const isIku = currentRow.jenis === 'IKU'
  const label = isIku ? 'IKU' : 'Indikator'

  async function handleDelete() {
    setIsSubmitting(true)
    try {
      await perencanaanService.deleteIndikator(currentRow.id)
      toast.success(`${label} Renstra OPD berhasil dihapus.`)
      onSuccess()
      onOpenChange(false)
    } catch (error) {
      if (isAxiosError(error) && error.response?.data?.message) {
        toast.error(error.response.data.message)
      } else {
        toast.error('Gagal menghapus data indikator.')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title={
        <div className='flex items-center gap-2 text-destructive'>
          <AlertTriangle className='h-5 w-5' />
          <span>Hapus {label} Renstra OPD</span>
        </div>
      }
      desc={
        <div className='space-y-2 text-xs'>
          <p>
            Apakah Anda yakin ingin menghapus {label}{' '}
            <strong className='text-foreground'>"{currentRow.indikator}"</strong> untuk instansi{' '}
            <strong className='text-foreground'>{currentRow.opd?.nama}</strong>?
          </p>
          <div className='rounded-md border border-amber-500/20 bg-amber-500/10 p-2.5 text-amber-800 dark:text-amber-300 text-[11px] leading-relaxed'>
            Catatan: Menghapus indikator ini akan mempengaruhi cascading pohon kinerja dan penetapan konteks risiko strategis OPD terkait.
          </div>
        </div>
      }
      destructive
      confirmText={
        <span className='flex items-center gap-1.5'>
          <Trash2 className='h-4 w-4' />
          Hapus {label}
        </span>
      }
      cancelBtnText='Batal'
      isLoading={isSubmitting}
      handleConfirm={handleDelete}
      className='sm:max-w-md'
    />
  )
}
