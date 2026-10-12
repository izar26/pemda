import { useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { isAxiosError } from 'axios'
import { toast } from 'sonner'
import { useQuery } from '@tanstack/react-query'
import {
  AlertTriangle,
  Calendar,
  Copy,
  Loader2,
  Sparkles,
  Trash2,
} from 'lucide-react'
import { opdService } from '@/services/opd-service'
import { perencanaanService } from '@/services/perencanaan-service'
import type {
  IndikatorFormData,
  IndikatorPenilaianItem,
} from '@/types/perencanaan'
import { useIku } from './iku-provider'
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

type IkuFormValues = z.infer<typeof ikuFormSchema>

interface IkuActionDialogProps {
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

  // Fetch list of OPDs
  const { data: opdList = [], isLoading: isLoadingOpd } = useQuery({
    queryKey: ['opds', 'all-for-iku'],
    queryFn: () => opdService.getOpds({ all: true }),
    staleTime: 5 * 60 * 1000,
  })

  // Fetch all Sasarans for the active period
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

  // Filter available Sasaran according to selected OPD
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
        {/* Pinned Header */}
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

        {/* Scrollable Form Body */}
        <div className='flex-1 overflow-y-auto px-6 py-4'>
          <Form {...form}>
            <form
              id='iku-action-form'
              onSubmit={form.handleSubmit(onSubmit)}
              className='space-y-4'
            >
              {/* OPD Selector */}
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

              {/* Cascading Sasaran Selector */}
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

              {/* Grid: Klasifikasi Jenis, Kode Indikator & Nomor Urut */}
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

              {/* Indikator Textarea */}
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

              {/* Keterangan / Sumber Dokumen */}
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

interface IkuCopyDialogProps {
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

  // Fetch available evaluation periods to copy from
  const { data: periodesData } = useQuery({
    queryKey: ['periodes', 'for-copy-source-iku'],
    queryFn: () => perencanaanService.getPaginatedPeriodes({ all: true }),
    staleTime: 5 * 60 * 1000,
  })

  // Fetch list of OPDs
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
        {/* Pinned Header */}
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

        {/* Form Body */}
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
            </Select>
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

interface IkuDeleteDialogProps {
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

export function IkuDialogs({ onSuccess }: { onSuccess: () => void }) {
  const { open, setOpen, currentRow, setCurrentRow } = useIku()

  const handleClose = () => {
    setOpen(null)
    setTimeout(() => {
      setCurrentRow(null)
    }, 300)
  }

  return (
    <>
      <IkuActionDialog
        key='iku-add'
        open={open === 'create'}
        onOpenChange={(val) => {
          if (!val) handleClose()
        }}
        onSuccess={() => {
          onSuccess()
          handleClose()
        }}
      />

      <IkuCopyDialog
        key='iku-copy'
        open={open === 'copy'}
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
          <IkuActionDialog
            key={`iku-edit-${currentRow.id}`}
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

          <IkuDeleteDialog
            key={`iku-delete-${currentRow.id}`}
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
