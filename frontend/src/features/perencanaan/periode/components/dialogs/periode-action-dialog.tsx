import { useEffect, useState, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { isAxiosError } from 'axios'
import { toast } from 'sonner'
import { CalendarRange, Loader2, Lock, Info } from 'lucide-react'
import { cn } from '@/lib/utils'
import { perencanaanService } from '@/services/perencanaan-service'
import type { PeriodeFormData, PeriodePenilaianItem } from '@/types/perencanaan'
import { usePeriode } from '../periode-provider'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
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

export type PeriodeFormValues = z.infer<typeof periodeFormSchema>

export interface PeriodeActionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  currentRow?: PeriodePenilaianItem | null
  activeWithRisk?: PeriodePenilaianItem | null
  onSuccess: () => void
}

export function PeriodeActionDialog({
  open,
  onOpenChange,
  currentRow,
  activeWithRisk: propActiveWithRisk,
  onSuccess,
}: PeriodeActionDialogProps) {
  const { activeWithRisk: ctxActiveWithRisk } = usePeriode()
  const activeWithRisk = propActiveWithRisk ?? ctxActiveWithRisk ?? null

  const [isSubmitting, setIsSubmitting] = useState(false)
  const isEdit = !!currentRow
  const isLocked = isEdit && Boolean(currentRow?.has_risiko_transactions ?? currentRow?.has_transactions)
  const riskCount = currentRow?.risiko_transactions_count ?? currentRow?.total_transactions ?? 0
  const isBlockedFromActivating = Boolean(
    activeWithRisk && (!currentRow || currentRow.id !== activeWithRisk.id)
  )

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

  const watchedTahunMulai = form.watch('tahun_mulai')
  const watchedTahunAkhir = form.watch('tahun_akhir')
  const watchedStatus = form.watch('status')

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

  const handleTahunMulaiChange = (val: number) => {
    if (isLocked) return
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

  const handleTahunPenilaianChange = (year: number) => {
    if (isLocked) return
    form.setValue('tahun_penilaian', year)
    form.setValue('tanggal_mulai', `${year}-01-02`)
    form.setValue('tanggal_akhir', `${year}-12-31`)
  }

  async function onSubmit(values: PeriodeFormValues) {
    if (values.status === 'aktif' && isBlockedFromActivating && activeWithRisk) {
      toast.error(
        `Tidak dapat mengaktifkan periode ini. Siklus '${activeWithRisk.nama_periode}' (Tahun ${activeWithRisk.tahun_penilaian}) sedang berjalan aktif dengan ${activeWithRisk.risiko_transactions_count ?? 10} data pengisian Pengelolaan Risiko OPD. Silakan selesaikan atau jadikan arsip siklus aktif terlebih dahulu.`
      )
      return
    }

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

        <div className='flex-1 overflow-y-auto px-6 py-4 min-h-0'>
          <Form {...form}>
            <form
              id='periode-action-form'
              onSubmit={form.handleSubmit(onSubmit)}
              className='space-y-4'
            >
              {isLocked && (
                <div className='p-3.5 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-800 dark:text-amber-300 text-xs flex items-start gap-3'>
                  <Lock className='h-4.5 w-4.5 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400' />
                  <div className='space-y-1 flex-1'>
                    <div className='flex items-center gap-2'>
                      <span className='font-bold text-foreground'>
                        Tahun Penilaian & Siklus RPJMD Terkunci
                      </span>
                      <span className='px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-900 dark:text-amber-200 text-[10px] font-mono font-bold'>
                        {riskCount} Pengisian Risiko OPD
                      </span>
                    </div>
                    <p className='text-muted-foreground text-[11px] leading-relaxed'>
                      Periode ini sudah memiliki data pengisian Pengelolaan Risiko OPD (Form 2B Konteks Strategis, Form 2C Konteks Operasional, atau Pengajuan Review). Tahun penilaian dan rentang RPJMD tidak dapat diubah demi menjaga integritas data dan jejak audit. Anda tetap dapat memperpanjang tanggal batas akhir dan memperbarui keterangan.
                    </p>
                  </div>
                </div>
              )}

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
                          <span>Tahun Mulai</span>
                          {isLocked && <Lock className='h-3 w-3 text-amber-600' />}
                          <span className='text-destructive'>*</span>
                        </FormLabel>
                        <FormControl>
                          <Input
                            type='number'
                            placeholder='2026'
                            disabled={isLocked}
                            className={cn(isLocked && 'bg-muted/50 cursor-not-allowed font-medium')}
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

              <div className='grid grid-cols-2 gap-3'>
                <FormField
                  control={form.control}
                  name='tahun_penilaian'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className='text-xs font-semibold'>
                        <span className='flex items-center gap-1.5'>
                          <span>Tahun Penilaian Berjalan</span>
                          {isLocked && <Lock className='h-3 w-3 text-amber-600' />}
                        </span>
                        <span className='text-destructive'>*</span>
                      </FormLabel>
                      <Select
                        value={field.value ? String(field.value) : ''}
                        disabled={isLocked}
                        onValueChange={(val) =>
                          handleTahunPenilaianChange(parseInt(val, 10))
                        }
                      >
                        <FormControl>
                          <SelectTrigger className={cn('w-full', isLocked && 'bg-muted/50 cursor-not-allowed font-medium')}>
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
                          <SelectItem
                            value='aktif'
                            disabled={isBlockedFromActivating}
                          >
                            Aktif (Sedang Berjalan) {isBlockedFromActivating ? '(Terkunci)' : ''}
                          </SelectItem>
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

              {watchedStatus === 'aktif' && (
                isBlockedFromActivating && activeWithRisk ? (
                  <div className='flex items-start gap-2.5 p-2.5 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-xs'>
                    <Lock className='h-4 w-4 shrink-0 mt-0.5' />
                    <span>
                      <strong>Aktivasi Diblokir:</strong> Siklus <strong>{activeWithRisk.nama_periode}</strong> (Tahun {activeWithRisk.tahun_penilaian}) sedang berjalan aktif dengan {activeWithRisk.risiko_transactions_count ?? 10} data transaksi risiko OPD. Status aktif pada siklus ini diblokir demi integritas data dan jejak audit pengawasan.
                    </span>
                  </div>
                ) : (
                  <div className='flex items-start gap-2.5 p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 text-xs'>
                    <Info className='h-4 w-4 shrink-0 mt-0.5' />
                    <span>
                      <strong>Otomatis Arsip:</strong> Mengaktifkan periode ini akan otomatis mengarsipkan periode yang lebih lampau.
                    </span>
                  </div>
                )
              )}

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
            disabled={isSubmitting || (watchedStatus === 'aktif' && isBlockedFromActivating)}
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
