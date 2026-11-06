import { useState } from 'react'
import { isAxiosError } from 'axios'
import { toast } from 'sonner'
import { Power, Lock } from 'lucide-react'
import { perencanaanService } from '@/services/perencanaan-service'
import type { PeriodePenilaianItem } from '@/types/perencanaan'
import { usePeriode } from '../periode-provider'
import { ConfirmDialog } from '@/components/confirm-dialog'

export interface PeriodeActivateDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  currentRow?: PeriodePenilaianItem | null
  activeWithRisk?: PeriodePenilaianItem | null
  onSuccess: () => void
}

export function PeriodeActivateDialog({
  open,
  onOpenChange,
  currentRow,
  activeWithRisk: propActiveWithRisk,
  onSuccess,
}: PeriodeActivateDialogProps) {
  const { activeWithRisk: ctxActiveWithRisk } = usePeriode()
  const activeWithRisk = propActiveWithRisk ?? ctxActiveWithRisk ?? null
  const [isSubmitting, setIsSubmitting] = useState(false)

  if (!currentRow) return null

  const isBlocked = Boolean(activeWithRisk && activeWithRisk.id !== currentRow.id)
  const activeRiskCount = activeWithRisk?.risiko_transactions_count ?? activeWithRisk?.total_transactions ?? 0

  async function handleActivate() {
    if (!currentRow) return
    if (isBlocked && activeWithRisk) {
      toast.error(
        `Tidak dapat mengaktifkan periode '${currentRow.nama_periode}'. Siklus '${activeWithRisk.nama_periode}' (Tahun ${activeWithRisk.tahun_penilaian}) sedang berjalan aktif dengan ${activeRiskCount} data pengisian Pengelolaan Risiko OPD. Silakan selesaikan atau jadikan arsip siklus aktif terlebih dahulu.`
      )
      return
    }

    setIsSubmitting(true)
    try {
      await perencanaanService.activatePeriode(currentRow.id)
      toast.success(
        `Periode ${currentRow.nama_periode} (Tahun ${currentRow.tahun_penilaian}) berhasil diaktifkan.`
      )
      onSuccess()
      onOpenChange(false)
    } catch (error) {
      if (isAxiosError(error) && error.response?.data?.message) {
        toast.error(error.response.data.message)
      } else {
        toast.error('Gagal mengaktifkan periode penilaian.')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const title = (
    <div className='flex items-center gap-2 text-primary'>
      <Power className='h-5 w-5' />
      <span>Jadikan Periode Aktif</span>
    </div>
  )

  const descContent = (
    <div className='space-y-2 text-xs'>
      <p>
        Anda akan mengaktifkan <strong className='text-foreground'>{currentRow.nama_periode}</strong> untuk tahun penilaian <strong className='text-foreground'>{currentRow.tahun_penilaian}</strong>.
      </p>
      {isBlocked && activeWithRisk ? (
        <div className='p-2.5 rounded-md bg-destructive/10 border border-destructive/20 text-destructive text-[11px] leading-relaxed flex items-start gap-2'>
          <Lock className='h-4 w-4 shrink-0 mt-0.5' />
          <span>
            <strong>Aktivasi Diblokir:</strong> Siklus <strong>{activeWithRisk.nama_periode}</strong> (Tahun {activeWithRisk.tahun_penilaian}) sedang berjalan aktif dengan {activeRiskCount} data pengisian Pengelolaan Risiko OPD. Selama siklus aktif memiliki transaksi risiko berjalan, perpindahan atau aktivasi siklus lain diblokir demi integritas data dan jejak audit pengawasan.
          </span>
        </div>
      ) : (
        <div className='p-2.5 rounded-md bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-300 text-[11px] leading-relaxed'>
          ⚠️ Periode aktif berjalan saat ini akan otomatis dinonaktifkan. Seluruh perangkat daerah (OPD) akan diarahkan mengisi dokumen risiko untuk tahun {currentRow.tahun_penilaian}.
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
      confirmText={
        <span className='flex items-center gap-1.5'>
          <Power className='h-4 w-4' />
          Aktifkan Periode
        </span>
      }
      cancelBtnText='Batal'
      disabled={isBlocked}
      isLoading={isSubmitting}
      handleConfirm={handleActivate}
      className='sm:max-w-md'
    />
  )
}
