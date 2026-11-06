import { useState } from 'react'
import { isAxiosError } from 'axios'
import { toast } from 'sonner'
import { AlertTriangle, Lock, Trash2 } from 'lucide-react'
import { perencanaanService } from '@/services/perencanaan-service'
import type { PeriodePenilaianItem } from '@/types/perencanaan'
import { ConfirmDialog } from '@/components/confirm-dialog'

export interface PeriodeDeleteDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  currentRow?: PeriodePenilaianItem | null
  onSuccess: () => void
}

export function PeriodeDeleteDialog({
  open,
  onOpenChange,
  currentRow,
  onSuccess,
}: PeriodeDeleteDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)

  if (!currentRow) return null

  async function handleDelete() {
    if (!currentRow) return
    const hasData = Boolean(
      currentRow.transaction_counts?.has_any_data ??
      currentRow.has_risiko_transactions ??
      currentRow.has_transactions
    )
    if (hasData) {
      toast.error(
        `Periode '${currentRow.nama_periode}' tidak dapat dihapus karena masih memiliki data terkait (Tujuan, Sasaran, atau Dokumen Risiko).`
      )
      return
    }
    setIsSubmitting(true)
    try {
      await perencanaanService.deletePeriode(currentRow.id)
      toast.success('Periode penilaian berhasil dihapus.')
      onSuccess()
      onOpenChange(false)
    } catch (error) {
      if (isAxiosError(error) && error.response?.data?.message) {
        toast.error(error.response.data.message)
      } else {
        toast.error('Gagal menghapus periode penilaian.')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const title = (
    <div className='flex items-center gap-2 text-destructive'>
      <AlertTriangle className='h-5 w-5' />
      <span>Hapus Periode Penilaian</span>
    </div>
  )

  const descContent = (
    <div className='space-y-2 text-xs'>
      <p>
        Tindakan ini akan menghapus data periode <strong className='text-foreground'>{currentRow.nama_periode} (Tahun {currentRow.tahun_penilaian})</strong> dari sistem secara permanen.
      </p>
      <div className='p-2.5 rounded-md bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-300 text-[11px] leading-relaxed'>
        Catatan: Periode yang sedang aktif tidak dapat dihapus. Anda dapat mengubah statusnya menjadi Arsip bila data ingin disimpan untuk rekam jejak.
      </div>
      {Boolean(
        currentRow.transaction_counts?.has_any_data ??
        currentRow.has_risiko_transactions ??
        currentRow.has_transactions
      ) && (
        <div className='p-2.5 rounded-md bg-destructive/10 border border-destructive/20 text-destructive text-[11px] leading-relaxed flex items-start gap-2'>
          <Lock className='h-4 w-4 shrink-0 mt-0.5' />
          <span>
            <strong>Tidak Dapat Dihapus:</strong> Periode ini sudah memiliki data turunan terkait (data Renstra atau Dokumen Risiko). Penghapusan diblokir demi menjaga integritas data dan jejak audit pengawasan.
          </span>
        </div>
      )}
    </div>
  )

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      desc={descContent}
      destructive
      confirmText={
        <span className='flex items-center gap-1.5'>
          <Trash2 className='h-4 w-4' />
          Hapus Periode
        </span>
      }
      cancelBtnText='Batal'
      isLoading={isSubmitting}
      handleConfirm={handleDelete}
      className='sm:max-w-md'
    />
  )
}
