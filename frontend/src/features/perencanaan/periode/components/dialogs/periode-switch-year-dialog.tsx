import { useState } from 'react'
import { isAxiosError } from 'axios'
import { toast } from 'sonner'
import { CalendarRange, Lock } from 'lucide-react'
import { perencanaanService } from '@/services/perencanaan-service'
import type { PeriodePenilaianItem } from '@/types/perencanaan'
import { usePeriode } from '../periode-provider'
import { ConfirmDialog } from '@/components/confirm-dialog'

export interface PeriodeSwitchYearDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  currentRow?: PeriodePenilaianItem | null
  targetYear?: number | null
  activeWithRisk?: PeriodePenilaianItem | null
  onSuccess: () => void
}

export function PeriodeSwitchYearDialog({
  open,
  onOpenChange,
  currentRow,
  targetYear,
  activeWithRisk: propActiveWithRisk,
  onSuccess,
}: PeriodeSwitchYearDialogProps) {
  const { activeWithRisk: ctxActiveWithRisk } = usePeriode()
  const activeWithRisk = propActiveWithRisk ?? ctxActiveWithRisk ?? null
  const [isSubmitting, setIsSubmitting] = useState(false)

  if (!currentRow || !targetYear) return null

  const isSwitchingCycle = !currentRow.is_aktif
  const isBlockedByActiveCycle =
    isSwitchingCycle && Boolean(activeWithRisk && activeWithRisk.id !== currentRow.id)
  const isBlockedBySameCycleRisk =
    Boolean(currentRow.has_risiko_transactions ?? currentRow.has_transactions) &&
    targetYear !== currentRow.tahun_penilaian

  const isSwitchBlocked = isBlockedByActiveCycle || isBlockedBySameCycleRisk
  const riskCount = currentRow.risiko_transactions_count ?? currentRow.total_transactions ?? 0
  const activeRiskCount = activeWithRisk?.risiko_transactions_count ?? activeWithRisk?.total_transactions ?? 0

  async function handleSwitchYear() {
    if (!currentRow || !targetYear) return
    if (isBlockedByActiveCycle && activeWithRisk) {
      toast.error(
        `Perpindahan siklus diblokir. Siklus '${activeWithRisk.nama_periode}' (Tahun ${activeWithRisk.tahun_penilaian}) sedang berjalan aktif dengan ${activeRiskCount} data pengisian Pengelolaan Risiko OPD. Silakan selesaikan atau jadikan arsip siklus aktif terlebih dahulu.`
      )
      return
    }
    if (isBlockedBySameCycleRisk) {
      toast.error(
        `Tahun penilaian tidak dapat dialihkan karena periode '${currentRow.nama_periode}' sudah memiliki data pengisian Pengelolaan Risiko OPD (${riskCount} data).`
      )
      return
    }
    setIsSubmitting(true)
    try {
      await perencanaanService.switchTahun(currentRow.id, targetYear)
      toast.success(
        `Berhasil beralih ke Tahun Penilaian ${targetYear} (${currentRow.nama_periode}).`
      )
      onSuccess()
      onOpenChange(false)
    } catch (error) {
      if (isAxiosError(error) && error.response?.data?.message) {
        toast.error(error.response.data.message)
      } else {
        toast.error('Gagal mengubah tahun penilaian aktif.')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const title = (
    <div className='flex items-center gap-2 text-emerald-600 dark:text-emerald-400'>
      <CalendarRange className='h-5 w-5' />
      <span>{isSwitchingCycle ? `Aktifkan Siklus di Tahun ${targetYear}?` : `Beralih ke Tahun Penilaian ${targetYear}?`}</span>
    </div>
  )

  const descContent = (
    <div className='space-y-2 text-xs'>
      <p>
        Tahun penilaian aktif untuk <strong className='text-foreground'>{currentRow.nama_periode}</strong> akan diubah ke <strong className='text-foreground'>Tahun {targetYear}</strong>.
      </p>
      {isSwitchingCycle ? (
        <div className='p-2.5 rounded-md bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-300 text-[11px] leading-relaxed'>
          💡 <strong>Otomatis Arsip:</strong> Siklus RPJMD sebelumnya yang lampau akan otomatis diarsipkan oleh sistem.
        </div>
      ) : (
        <div className='p-2.5 rounded-md bg-muted/60 border border-muted text-muted-foreground text-[11px] leading-relaxed'>
          Sistem akan menyelaraskan batas waktu penilaian dan evaluasi kinerja ke tahun anggaran berjalan <strong>{targetYear}</strong>.
        </div>
      )}
      {isBlockedByActiveCycle && activeWithRisk && (
        <div className='p-2.5 rounded-md bg-destructive/10 border border-destructive/20 text-destructive text-[11px] leading-relaxed flex items-start gap-2'>
          <Lock className='h-4 w-4 shrink-0 mt-0.5' />
          <span>
            <strong>Perpindahan Siklus Diblokir:</strong> Siklus <strong>{activeWithRisk.nama_periode}</strong> (Tahun {activeWithRisk.tahun_penilaian}) sedang berjalan aktif dengan {activeRiskCount} data pengisian Pengelolaan Risiko OPD. Selama siklus aktif memiliki data risiko berjalan, perpindahan ke siklus RPJMD lain diblokir demi integritas data dan jejak audit pengawasan.
          </span>
        </div>
      )}
      {!isBlockedByActiveCycle && isBlockedBySameCycleRisk && (
        <div className='p-2.5 rounded-md bg-destructive/10 border border-destructive/20 text-destructive text-[11px] leading-relaxed flex items-start gap-2'>
          <Lock className='h-4 w-4 shrink-0 mt-0.5' />
          <span>
            <strong>Terkunci:</strong> Periode ini sudah memiliki {riskCount} data pengisian Pengelolaan Risiko OPD. Tahun penilaian telah dikunci demi integritas data dan jejak audit pengawasan.
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
      confirmText={
        <span className='flex items-center gap-1.5'>
          <CalendarRange className='h-4 w-4' />
          Ya, Beralih ke Tahun {targetYear}
        </span>
      }
      cancelBtnText='Batal'
      disabled={isSwitchBlocked}
      isLoading={isSubmitting}
      handleConfirm={handleSwitchYear}
      className='sm:max-w-md'
    />
  )
}
