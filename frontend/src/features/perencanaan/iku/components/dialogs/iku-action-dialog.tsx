import { useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { isAxiosError } from 'axios'
import { toast } from 'sonner'
import { useQuery } from '@tanstack/react-query'
import { Loader2, Sparkles } from 'lucide-react'
import { opdService } from '@/services/opd-service'
import { perencanaanService } from '@/services/perencanaan-service'
import type {
  IndikatorFormData,
  IndikatorPenilaianItem,
} from '@/types/perencanaan'
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
import { SearchableSelect } from '@/components/searchable-select'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

const ikuFormSchema = z.object({
  opd_id: z.string().min(1, 'Perangkat Daerah (OPD) wajib dipilih.'),
  sasaran_penilaian_id: z.string().min(1, 'Sasaran strategis terkait wajib dipilih.'),
  jenis: z.enum(['IKU', 'Biasa']),
  kode_indikator: z.string().max(50).optional(),
  indikator: z
    .string()
    .min(5, 'Pernyataan indikator minimal 5 karakter.')
    .max(1000, 'Pernyataan indikator maksimal 1000 karakter.'),
  urutan: z.number().int().min(1, 'Urutan minimal 1').optional(),
  keterangan: z.string().max(2000).optional(),
})

export type IkuFormValues = z.infer<typeof ikuFormSchema>

export interface IkuActionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  currentRow?: IndikatorPenilaianItem | null
  onSuccess: () => void
}

export function IkuActionDialog({
  open,
  onOpenChange,
  currentRow,
  onSuccess,
}: IkuActionDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const isEdit = Boolean(currentRow)

  const { data: opdList = [], isLoading: isLoadingOpd } = useQuery({
    queryKey: ['opds', 'all-for-iku'],
    queryFn: () => opdService.getOpds({ all: true }),
    staleTime: 5 * 60 * 1000,
  })

  const { data: sasaranData, isLoading: isLoadingSasaran } = useQuery({
    queryKey: ['sasaran', 'all-for-iku-dialog'],
    queryFn: () => perencanaanService.getPaginatedSasaran({ all: true }),
    staleTime: 60 * 1000,
  })

  const form = useForm<IkuFormValues>({
    resolver: zodResolver(ikuFormSchema),
    defaultValues: {
      opd_id: '',
      sasaran_penilaian_id: '',
      jenis: 'IKU',
      kode_indikator: 'IKU-01',
      indikator: '',
      urutan: 1,
      keterangan: '',
    },
  })

  const watchedOpdId = form.watch('opd_id')
  const watchedJenis = form.watch('jenis')

  const availableSasaranList = useMemo(() => {
    const list = sasaranData?.data || []
    if (!watchedOpdId) return list
    return list.filter((s) => s.opd_id === watchedOpdId)
  }, [sasaranData?.data, watchedOpdId])

  useEffect(() => {
    if (open) {
      if (currentRow) {
        form.reset({
          opd_id: currentRow.opd_id,
          sasaran_penilaian_id: currentRow.sasaran_penilaian_id,
          jenis: currentRow.jenis,
          kode_indikator: currentRow.kode_indikator || '',
          indikator: currentRow.indikator,
          urutan: currentRow.urutan,
          keterangan: currentRow.keterangan || '',
        })
      } else {
        form.reset({
          opd_id: opdList[0]?.id ? String(opdList[0].id) : '',
          sasaran_penilaian_id: '',
          jenis: 'IKU',
          kode_indikator: 'IKU-01',
          indikator: '',
          urutan: 1,
          keterangan: '',
        })
      }
    }
  }, [open, currentRow, form, opdList])

  async function onSubmit(values: IkuFormValues) {
    setIsSubmitting(true)
    try {
      const payload: IndikatorFormData = {
        opd_id: values.opd_id,
        sasaran_penilaian_id: values.sasaran_penilaian_id,
        jenis: values.jenis,
        kode_indikator: values.kode_indikator?.trim() || undefined,
        indikator: values.indikator.trim(),
        urutan: values.urutan,
        keterangan: values.keterangan?.trim() || undefined,
      }

      if (isEdit && currentRow) {
        await perencanaanService.updateIndikator(currentRow.id, payload)
        toast.success(
          values.jenis === 'IKU'
            ? 'Indikator Kinerja Utama (IKU) berhasil diperbarui.'
            : 'Indikator Renstra OPD berhasil diperbarui.'
        )
      } else {
        await perencanaanService.createIndikator(payload)
        toast.success(
          values.jenis === 'IKU'
            ? 'Indikator Kinerja Utama (IKU) berhasil ditambahkan.'
            : 'Indikator Renstra OPD berhasil ditambahkan.'
        )
      }

      onSuccess()
      onOpenChange(false)
    } catch (error) {
      if (isAxiosError(error) && error.response?.data?.errors) {
        const errors = error.response.data.errors
        Object.keys(errors).forEach((key) => {
          form.setError(key as keyof IkuFormValues, {
            type: 'manual',
            message: errors[key][0],
          })
        })
        toast.error('Periksa kembali isian formulir indikator.')
      } else if (isAxiosError(error) && error.response?.data?.message) {
        toast.error(error.response.data.message)
      } else {
        toast.error('Terjadi kesalahan saat menyimpan data indikator.')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const opdOptions = useMemo(() => {
    return opdList.map((opd) => ({
      value: String(opd.id),
      label: `${opd.nama} (${opd.kode})`,
    }))
  }, [opdList])

  const sasaranOptions = useMemo(() => {
    return availableSasaranList.map((s) => ({
      value: String(s.id),
      label: `${s.kode_sasaran ? `[${s.kode_sasaran}] ` : ''}${s.sasaran}`,
      description: s.tujuan ? `Tujuan: ${s.tujuan.tujuan}` : undefined,
    }))
  }, [availableSasaranList])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-2xl max-h-[88vh] flex flex-col p-0 gap-0 overflow-hidden shadow-2xl'>
        <DialogHeader className='px-6 pt-5 pb-4 border-b bg-muted/10 shrink-0 text-start'>
          <div className='flex items-center gap-3'>
            <div className='flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400'>
              <Sparkles className='h-5 w-5' />
            </div>
            <div>
              <DialogTitle className='text-lg font-bold text-foreground'>
                {isEdit ? 'Ubah Indikator / IKU Renstra' : 'Tambah Indikator / IKU Renstra'}
              </DialogTitle>
              <DialogDescription className='text-xs text-muted-foreground mt-0.5'>
                {isEdit
                  ? 'Perbarui rumusan tolok ukur kinerja atau catatan dokumen Renstra.'
                  : 'Tetapkan Indikator Kinerja Utama (IKU) atau Indikator Sasaran Renstra OPD.'}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className='flex-1 overflow-y-auto px-6 py-4'>
          <Form {...form}>
            <form
              id='iku-action-form'
              onSubmit={form.handleSubmit(onSubmit)}
              className='space-y-4'
            >
              <FormField
                control={form.control}
                name='opd_id'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className='text-xs font-semibold'>
                      Perangkat Daerah (OPD) <span className='text-destructive'>*</span>
                    </FormLabel>
                    <FormControl>
                      <SearchableSelect
                        options={opdOptions}
                        value={field.value}
                        onValueChange={(val) => {
                          field.onChange(val)
                          form.setValue('sasaran_penilaian_id', '')
                        }}
                        placeholder='Pilih instansi perangkat daerah...'
                        searchPlaceholder='Cari OPD / Dinas...'
                        emptyMessage='Perangkat daerah tidak ditemukan.'
                        disabled={isSubmitting || isLoadingOpd}
                      />
                    </FormControl>
                    <FormDescription className='text-[11px]'>
                      Instansi pengampu indikator kinerja Renstra.
                    </FormDescription>
                    <FormMessage className='text-xs' />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name='sasaran_penilaian_id'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className='text-xs font-semibold'>
                      Sasaran Strategis Renstra Terkait <span className='text-destructive'>*</span>
                    </FormLabel>
                    <FormControl>
                      <SearchableSelect
                        options={sasaranOptions}
                        value={field.value}
                        onValueChange={field.onChange}
                        placeholder={
                          watchedOpdId
                            ? availableSasaranList.length > 0
                              ? 'Pilih sasaran Renstra pengampu...'
                              : 'Belum ada sasaran untuk OPD ini (buat sasaran dahulu)'
                            : 'Pilih OPD terlebih dahulu...'
                        }
                        searchPlaceholder='Cari rumusan sasaran...'
                        emptyMessage='Sasaran Renstra tidak ditemukan.'
                        disabled={isSubmitting || isLoadingSasaran || !watchedOpdId || availableSasaranList.length === 0}
                      />
                    </FormControl>
                    <FormDescription className='text-[11px]'>
                      Pohon kinerja: setiap indikator wajib terikat ke sasaran strategis Renstra OPD.
                    </FormDescription>
                    <FormMessage className='text-xs' />
                  </FormItem>
                )}
              />

              <div className='grid grid-cols-1 sm:grid-cols-3 gap-4'>
                <FormField
                  control={form.control}
                  name='jenis'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className='text-xs font-semibold'>
                        Klasifikasi Jenis <span className='text-destructive'>*</span>
                      </FormLabel>
                      <Select
                        value={field.value}
                        onValueChange={(val: 'IKU' | 'Biasa') => {
                          field.onChange(val)
                          if (!isEdit && !form.getValues('kode_indikator')) {
                            form.setValue('kode_indikator', val === 'IKU' ? 'IKU-01' : 'IND-01')
                          }
                        }}
                        disabled={isSubmitting}
                      >
                        <FormControl>
                          <SelectTrigger className='w-full'>
                            <SelectValue placeholder='Pilih jenis...' />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value='IKU'>IKU (Indikator Kinerja Utama)</SelectItem>
                          <SelectItem value='Biasa'>Indikator Renstra Biasa</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage className='text-xs' />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name='kode_indikator'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className='text-xs font-semibold'>
                        Kode Indikator (Opsional)
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder={watchedJenis === 'IKU' ? 'Contoh: IKU-01' : 'Contoh: IND-01'}
                          disabled={isSubmitting}
                          {...field}
                        />
                      </FormControl>
                      <FormDescription className='text-[11px]'>
                        Otomatis sistem jika dikosongkan.
                      </FormDescription>
                      <FormMessage className='text-xs' />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name='urutan'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className='text-xs font-semibold'>
                        Nomor Urut Tampilan
                      </FormLabel>
                      <FormControl>
                        <Input
                          type='number'
                          min={1}
                          disabled={isSubmitting}
                          value={field.value ?? 1}
                          onChange={(e) => field.onChange(e.target.valueAsNumber || 1)}
                        />
                      </FormControl>
                      <FormDescription className='text-[11px]'>
                        Urutan posisi dalam Renstra.
                      </FormDescription>
                      <FormMessage className='text-xs' />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name='indikator'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className='text-xs font-semibold'>
                      Pernyataan Indikator / IKU Renstra <span className='text-destructive'>*</span>
                    </FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder='Contoh: Persentase aksesibilitas jalan Kabupaten terhadap pusat - pusat kegiatan dalam kondisi mantap (%)'
                        rows={3}
                        disabled={isSubmitting}
                        {...field}
                      />
                    </FormControl>
                    <FormDescription className='text-[11px]'>
                      Tuliskan rumusan tolok ukur pencapaian kinerja secara objektif dan terukur.
                    </FormDescription>
                    <FormMessage className='text-xs' />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name='keterangan'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className='text-xs font-semibold'>
                      Sumber Dokumen / Catatan Kebijakan (Opsional)
                    </FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder='Contoh: Renstra SKPD Bab IV Indikator Kinerja Utama Dinas PUPR...'
                        rows={2}
                        disabled={isSubmitting}
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
            form='iku-action-form'
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
              'Tambah Indikator'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
