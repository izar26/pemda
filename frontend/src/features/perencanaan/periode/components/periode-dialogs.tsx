import { useEffect, useState, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { isAxiosError } from 'axios'
import { toast } from 'sonner'
import {
  CalendarRange,
  Loader2,
  AlertTriangle,
  Power,
  Info,
  Trash2,
} from 'lucide-react'
import { perencanaanService } from '@/services/perencanaan-service'
import type { PeriodeFormData, PeriodePenilaianItem } from '@/types/perencanaan'
import { usePeriode } from './periode-provider'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { ConfirmDialog } from '@/components/confirm-dialog'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

const periodeFormSchema = z
  .object({
    nama_periode: z.string().max(100).optional(),
    tahun_mulai: z
      .number()
      .int()
      .min(2000, 'Minimal tahun 2000')
      .max(2100, 'Maksimal tahun 2100'),
    tahun_akhir: z
      .number()
      .int()
      .min(2000, 'Minimal tahun 2000')
      .max(2100, 'Maksimal tahun 2100'),
    tahun_penilaian: z
      .number()
      .int()
      .min(2000, 'Minimal tahun 2000')
      .max(2100, 'Maksimal tahun 2100'),
    tanggal_mulai: z.string().min(1, 'Tanggal mulai wajib diisi'),
    tanggal_akhir: z.string().min(1, 'Tanggal batas akhir wajib diisi'),
    status: z.enum(['aktif', 'tidak_aktif', 'arsip']),
    keterangan: z.string().max(1000).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.tahun_akhir < data.tahun_mulai) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Tahun akhir tidak boleh lebih kecil dari tahun mulai',
        path: ['tahun_akhir'],
      })
    }
    if (
      data.tahun_penilaian < data.tahun_mulai ||
      data.tahun_penilaian > data.tahun_akhir
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Tahun penilaian harus berada dalam rentang tahun RPJMD',
        path: ['tahun_penilaian'],
      })
    }
    if (data.tanggal_akhir < data.tanggal_mulai) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Tanggal akhir harus sama dengan atau setelah tanggal mulai',
        path: ['tanggal_akhir'],
      })
    }
  })

type PeriodeFormValues = z.infer<typeof periodeFormSchema>

interface PeriodeActionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  currentRow?: PeriodePenilaianItem | null
  onSuccess: () => void
}

export function PeriodeActionDialog({
  open,
  onOpenChange,
  currentRow,
  onSuccess,
}: PeriodeActionDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const isEdit = !!currentRow

  const currentYear = new Date().getFullYear()

  const form = useForm<PeriodeFormValues>({
    resolver: zodResolver(periodeFormSchema),
    defaultValues: {
      nama_periode: `RPJMD ${currentYear} - ${currentYear + 4}`,
      tahun_mulai: currentYear,
      tahun_akhir: currentYear + 4,
      tahun_penilaian: currentYear,
      tanggal_mulai: `${currentYear}-01-02`,
      tanggal_akhir: `${currentYear}-12-31`,
      status: 'tidak_aktif',
      keterangan: '',
    },
  })

  // Watch years to dynamically build options and auto-fill values
  const watchedTahunMulai = form.watch('tahun_mulai')
  const watchedTahunAkhir = form.watch('tahun_akhir')
  const watchedStatus = form.watch('status')

  // Generate dynamic array of years between tahun_mulai and tahun_akhir
  const availableYears = useMemo(() => {
    const start = Number(watchedTahunMulai) || currentYear
    const end = Number(watchedTahunAkhir) || start + 4
    if (end < start) return [start]

    const years: number[] = []
    for (let y = start; y <= end; y++) {
      years.push(y)
    }
    return years
  }, [watchedTahunMulai, watchedTahunAkhir, currentYear])

  useEffect(() => {
    if (open) {
      if (currentRow) {
        form.reset({
          nama_periode: currentRow.nama_periode,
          tahun_mulai: currentRow.tahun_mulai,
          tahun_akhir: currentRow.tahun_akhir,
          tahun_penilaian: currentRow.tahun_penilaian,
          tanggal_mulai: currentRow.tanggal_mulai,
          tanggal_akhir: currentRow.tanggal_akhir,
          status: currentRow.status,
          keterangan: currentRow.keterangan || '',
        })
      } else {
        form.reset({
          nama_periode: `RPJMD ${currentYear} - ${currentYear + 4}`,
          tahun_mulai: currentYear,
          tahun_akhir: currentYear + 4,
          tahun_penilaian: currentYear,
          tanggal_mulai: `${currentYear}-01-02`,
          tanggal_akhir: `${currentYear}-12-31`,
          status: 'tidak_aktif',
          keterangan: '',
        })
      }
    }
  }, [open, currentRow, form, currentYear])

  // Smart helper: when user types start year in create mode, auto-suggest end year & period name
  const handleTahunMulaiChange = (val: number) => {
    form.setValue('tahun_mulai', val)
    if (!isEdit) {
      const suggestedEnd = val + 4
      form.setValue('tahun_akhir', suggestedEnd)
      form.setValue('nama_periode', `RPJMD ${val} - ${suggestedEnd}`)
      form.setValue('tahun_penilaian', val)
      form.setValue('tanggal_mulai', `${val}-01-02`)
      form.setValue('tanggal_akhir', `${val}-12-31`)
    }
  }

  // Smart helper: when evaluation year changes, auto-adjust date range
  const handleTahunPenilaianChange = (year: number) => {
    form.setValue('tahun_penilaian', year)
    form.setValue('tanggal_mulai', `${year}-01-02`)
    form.setValue('tanggal_akhir', `${year}-12-31`)
  }

  async function onSubmit(values: PeriodeFormValues) {
    setIsSubmitting(true)
    try {
      const payload: PeriodeFormData = {
        ...values,
        nama_periode: values.nama_periode || `RPJMD ${values.tahun_mulai} - ${values.tahun_akhir}`,
      }
      if (isEdit && currentRow) {
        await perencanaanService.updatePeriode(currentRow.id, payload)
        toast.success('Periode penilaian berhasil diperbarui.')
      } else {
        await perencanaanService.createPeriode(payload)
        toast.success('Periode penilaian berhasil ditambahkan.')
      }
      onSuccess()
      onOpenChange(false)
    } catch (error) {
      if (isAxiosError(error)) {
        const errorData = error.response?.data
        if (errorData?.errors) {
          const firstKey = Object.keys(errorData.errors)[0]
          const firstMessage = errorData.errors[firstKey][0]
          toast.error(firstMessage)
        } else if (errorData?.message) {
          toast.error(errorData.message)
        } else {
          toast.error('Terjadi kesalahan saat menyimpan periode penilaian.')
        }
      } else {
        toast.error('Gagal memproses data periode.')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-xl max-h-[88vh] flex flex-col p-0 gap-0 overflow-hidden shadow-2xl'>
        {/* Pinned Header */}
        <DialogHeader className='px-6 pt-5 pb-4 border-b bg-muted/10 shrink-0 text-start'>
          <div className='flex items-center gap-3'>
            <div className='flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary'>
              <CalendarRange className='h-5 w-5' />
            </div>
            <div>
              <DialogTitle className='text-lg font-bold text-foreground'>
                {isEdit ? `Ubah Periode: ${currentRow?.nama_periode}` : 'Tambah Periode Penilaian Baru'}
              </DialogTitle>
              <DialogDescription className='text-xs text-muted-foreground mt-0.5'>
                {isEdit
                  ? 'Perbarui data siklus RPJMD dan tahun penilaian berjalan.'
                  : 'Tentukan rentang RPJMD 5 tahun dan tahun penilaian yang akan dievaluasi.'}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Scrollable Form Body */}
        <div className='flex-1 overflow-y-auto px-6 py-4 min-h-0'>
          <Form {...form}>
            <form
              id='periode-action-form'
              onSubmit={form.handleSubmit(onSubmit)}
              className='space-y-4'
            >
              {/* Periode Penilaian: Rentang 5 Tahun RPJMD */}
              <div className='p-3.5 rounded-xl bg-muted/40 border border-muted space-y-3'>
                <div className='flex items-center justify-between'>
                  <span className='text-xs font-semibold text-foreground uppercase tracking-wider'>
                    Siklus RPJMD (Rentang 5 Tahun)
                  </span>
                  <span className='px-2.5 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-bold'>
                    {watchedTahunMulai} - {watchedTahunAkhir}
                  </span>
                </div>

                <div className='grid grid-cols-2 gap-3'>
                  <FormField
                    control={form.control}
                    name='tahun_mulai'
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className='text-xs font-semibold'>
                          Tahun Mulai <span className='text-destructive'>*</span>
                        </FormLabel>
                        <FormControl>
                          <Input
                            type='number'
                            placeholder='2026'
                            value={field.value ?? ''}
                            onChange={(e) =>
                              handleTahunMulaiChange(parseInt(e.target.value, 10) || 0)
                            }
                          />
                        </FormControl>
                        <FormDescription className='text-[11px]'>
                          Tahun awal RPJMD
                        </FormDescription>
                        <FormMessage className='text-xs' />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name='tahun_akhir'
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className='text-xs font-semibold'>
                          Tahun Akhir (5 Tahun) <span className='text-destructive'>*</span>
                        </FormLabel>
                        <FormControl>
                          <Input
                            type='number'
                            readOnly
                            className='bg-muted/50 cursor-not-allowed font-medium'
                            value={field.value ?? ''}
                          />
                        </FormControl>
                        <FormDescription className='text-[11px]'>
                          Otomatis terkunci 5 tahun
                        </FormDescription>
                        <FormMessage className='text-xs' />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              {/* Tahun Penilaian & Status */}
              <div className='grid grid-cols-2 gap-3'>
                <FormField
                  control={form.control}
                  name='tahun_penilaian'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className='text-xs font-semibold'>
                        Tahun Penilaian Berjalan <span className='text-destructive'>*</span>
                      </FormLabel>
                      <Select
                        value={field.value ? String(field.value) : ''}
                        onValueChange={(val) =>
                          handleTahunPenilaianChange(parseInt(val, 10))
                        }
                      >
                        <FormControl>
                          <SelectTrigger className='w-full'>
                            <SelectValue placeholder='Pilih tahun berjalan' />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {availableYears.map((yr) => (
                            <SelectItem key={yr} value={String(yr)}>
                              Tahun {yr}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription className='text-[11px]'>
                        Tahun anggaran berjalan
                      </FormDescription>
                      <FormMessage className='text-xs' />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name='status'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className='text-xs font-semibold'>
                        Status Keaktifan <span className='text-destructive'>*</span>
                      </FormLabel>
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                      >
                        <FormControl>
                          <SelectTrigger className='w-full'>
                            <SelectValue placeholder='Pilih status' />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value='aktif'>Aktif (Sedang Berjalan)</SelectItem>
                          <SelectItem value='tidak_aktif'>Tidak Aktif (Draft)</SelectItem>
                          <SelectItem value='arsip'>Arsip</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription className='text-[11px]'>
                        Hanya 1 siklus aktif
                      </FormDescription>
                      <FormMessage className='text-xs' />
                    </FormItem>
                  )}
                />
              </div>

              {/* Alert banner if status is 'aktif' */}
              {watchedStatus === 'aktif' && (
                <div className='flex items-start gap-2.5 p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 text-xs'>
                  <Info className='h-4 w-4 shrink-0 mt-0.5' />
                  <span>
                    <strong>Otomatis Arsip:</strong> Mengaktifkan periode ini akan otomatis mengarsipkan periode yang lebih lampau.
                  </span>
                </div>
              )}

              {/* Rentang Tanggal Mulai dan Selesai */}
              <div className='grid grid-cols-2 gap-3'>
                <FormField
                  control={form.control}
                  name='tanggal_mulai'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className='text-xs font-semibold'>
                        Tanggal Mulai <span className='text-destructive'>*</span>
                      </FormLabel>
                      <FormControl>
                        <Input type='date' {...field} />
                      </FormControl>
                      <FormMessage className='text-xs' />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name='tanggal_akhir'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className='text-xs font-semibold'>
                        Batas Akhir Penilaian <span className='text-destructive'>*</span>
                      </FormLabel>
                      <FormControl>
                        <Input type='date' {...field} />
                      </FormControl>
                      <FormMessage className='text-xs' />
                    </FormItem>
                  )}
                />
              </div>

              {/* Catatan / Keterangan Kebijakan */}
              <FormField
                control={form.control}
                name='keterangan'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className='text-xs font-semibold'>
                      Catatan Kebijakan / Keterangan (Opsional)
                    </FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder='Catatan pelaksanaan penilaian risiko atau instruksi pimpinan daerah...'
                        rows={3}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage className='text-xs' />
                  </FormItem>
                )}
              />
            </form>
          </Form>
        </div>

        {/* Pinned Footer */}
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
            type='submit'
            size='sm'
            form='periode-action-form'
            disabled={isSubmitting}
            className='min-w-[120px]'
          >
            {isSubmitting ? (
              <>
                <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                Menyimpan...
              </>
            ) : isEdit ? (
              'Simpan Perubahan'
            ) : (
              'Tambah Periode'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

interface PeriodeActivateDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  currentRow?: PeriodePenilaianItem | null
  onSuccess: () => void
}

export function PeriodeActivateDialog({
  open,
  onOpenChange,
  currentRow,
  onSuccess,
}: PeriodeActivateDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)

  if (!currentRow) return null

  async function handleActivate() {
    if (!currentRow) return
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
      <div className='p-2.5 rounded-md bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-300 text-[11px] leading-relaxed'>
        ⚠️ Periode aktif berjalan saat ini akan otomatis dinonaktifkan. Seluruh perangkat daerah (OPD) akan diarahkan mengisi dokumen risiko untuk tahun {currentRow.tahun_penilaian}.
      </div>
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
      isLoading={isSubmitting}
      handleConfirm={handleActivate}
      className='sm:max-w-md'
    />
  )
}

interface PeriodeSwitchYearDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  currentRow?: PeriodePenilaianItem | null
  targetYear?: number | null
  onSuccess: () => void
}

export function PeriodeSwitchYearDialog({
  open,
  onOpenChange,
  currentRow,
  targetYear,
  onSuccess,
}: PeriodeSwitchYearDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)

  if (!currentRow || !targetYear) return null

  const isSwitchingCycle = !currentRow.is_aktif

  async function handleSwitchYear() {
    if (!currentRow || !targetYear) return
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
      isLoading={isSubmitting}
      handleConfirm={handleSwitchYear}
      className='sm:max-w-md'
    />
  )
}

interface PeriodeDeleteDialogProps {
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

export function PeriodeDialogs({ onSuccess }: { onSuccess: () => void }) {
  const { open, setOpen, currentRow, setCurrentRow, targetYear, setTargetYear } = usePeriode()

  const handleClose = () => {
    setOpen(null)
    setTimeout(() => {
      setCurrentRow(null)
      setTargetYear(null)
    }, 300)
  }

  return (
    <>
      <PeriodeActionDialog
        key='periode-add'
        open={open === 'create'}
        onOpenChange={(val) => {
          if (!val) handleClose()
        }}
        onSuccess={() => {
          onSuccess()
          handleClose()
        }}
      />

      {currentRow && (
        <>
          <PeriodeActionDialog
            key={`periode-edit-${currentRow.id}`}
            open={open === 'edit'}
            onOpenChange={(val) => {
              if (!val) handleClose()
            }}
            currentRow={currentRow}
            onSuccess={() => {
              onSuccess()
              handleClose()
            }}
          />

          <PeriodeActivateDialog
            key={`periode-activate-${currentRow.id}`}
            open={open === 'activate'}
            onOpenChange={(val) => {
              if (!val) handleClose()
            }}
            currentRow={currentRow}
            onSuccess={() => {
              onSuccess()
              handleClose()
            }}
          />

          {targetYear && (
            <PeriodeSwitchYearDialog
              key={`periode-switch-${currentRow.id}-${targetYear}`}
              open={open === 'switch-year'}
              onOpenChange={(val) => {
                if (!val) handleClose()
              }}
              currentRow={currentRow}
              targetYear={targetYear}
              onSuccess={() => {
                onSuccess()
                handleClose()
              }}
            />
          )}

          <PeriodeDeleteDialog
            key={`periode-delete-${currentRow.id}`}
            open={open === 'delete'}
            onOpenChange={(val) => {
              if (!val) handleClose()
            }}
            currentRow={currentRow}
            onSuccess={() => {
              onSuccess()
              handleClose()
            }}
          />
        </>
      )}
    </>
  )
}
