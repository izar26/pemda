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
  Target,
  Trash2,
} from 'lucide-react'
import { opdService } from '@/services/opd-service'
import { perencanaanService } from '@/services/perencanaan-service'
import type {
  SasaranFormData,
  SasaranPenilaianItem,
} from '@/types/perencanaan'
import { useSasaran } from './sasaran-provider'
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

const sasaranFormSchema = z.object({
  opd_id: z.string().min(1, 'Perangkat Daerah (OPD) wajib dipilih.'),
  tujuan_penilaian_id: z.string().min(1, 'Tujuan Renstra terkait wajib dipilih.'),
  kode_sasaran: z.string().max(50).optional(),
  sasaran: z
    .string()
    .min(5, 'Pernyataan sasaran minimal 5 karakter.')
    .max(1000, 'Pernyataan sasaran maksimal 1000 karakter.'),
  urutan: z.number().int().min(1, 'Urutan minimal 1').optional(),
  keterangan: z.string().max(2000).optional(),
})

type SasaranFormValues = z.infer<typeof sasaranFormSchema>

interface SasaranActionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  currentRow?: SasaranPenilaianItem | null
  onSuccess: () => void
}

export function SasaranActionDialog({
  open,
  onOpenChange,
  currentRow,
  onSuccess,
}: SasaranActionDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const isEdit = Boolean(currentRow)

  // Fetch list of OPDs for searchable select
  const { data: opdList = [], isLoading: isLoadingOpd } = useQuery({
    queryKey: ['opds', 'all-for-sasaran'],
    queryFn: () => opdService.getOpds({ all: true }),
    staleTime: 5 * 60 * 1000,
  })

  // Fetch all Goals for the active period
  const { data: tujuanData, isLoading: isLoadingTujuan } = useQuery({
    queryKey: ['tujuan', 'all-for-sasaran-dialog'],
    queryFn: () => perencanaanService.getPaginatedTujuan({ all: true }),
    staleTime: 60 * 1000,
  })

  const form = useForm<SasaranFormValues>({
    resolver: zodResolver(sasaranFormSchema),
    defaultValues: {
      opd_id: '',
      tujuan_penilaian_id: '',
      kode_sasaran: 'SAS-01',
      sasaran: '',
      urutan: 1,
      keterangan: '',
    },
  })

  // Watch selected OPD to filter available Tujuan
  const watchedOpdId = form.watch('opd_id')

  const availableTujuanList = useMemo(() => {
    const list = tujuanData?.data || []
    if (!watchedOpdId) return list
    return list.filter((t) => t.opd_id === watchedOpdId)
  }, [tujuanData?.data, watchedOpdId])

  useEffect(() => {
    if (open) {
      if (currentRow) {
        form.reset({
          opd_id: currentRow.opd_id,
          tujuan_penilaian_id: currentRow.tujuan_penilaian_id,
          kode_sasaran: currentRow.kode_sasaran || '',
          sasaran: currentRow.sasaran,
          urutan: currentRow.urutan,
          keterangan: currentRow.keterangan || '',
        })
      } else {
        form.reset({
          opd_id: opdList[0]?.id ? String(opdList[0].id) : '',
          tujuan_penilaian_id: '',
          kode_sasaran: 'SAS-01',
          sasaran: '',
          urutan: 1,
          keterangan: '',
        })
      }
    }
  }, [open, currentRow, form, opdList])

  async function onSubmit(values: SasaranFormValues) {
    setIsSubmitting(true)
    try {
      const payload: SasaranFormData = {
        opd_id: values.opd_id,
        tujuan_penilaian_id: values.tujuan_penilaian_id,
        kode_sasaran: values.kode_sasaran?.trim() || undefined,
        sasaran: values.sasaran.trim(),
        urutan: values.urutan,
        keterangan: values.keterangan?.trim() || undefined,
      }

      if (isEdit && currentRow) {
        await perencanaanService.updateSasaran(currentRow.id, payload)
        toast.success('Sasaran strategis Renstra OPD berhasil diperbarui.')
      } else {
        await perencanaanService.createSasaran(payload)
        toast.success('Sasaran strategis Renstra OPD berhasil ditambahkan.')
      }

      onSuccess()
      onOpenChange(false)
    } catch (error) {
      if (isAxiosError(error) && error.response?.data?.errors) {
        const errors = error.response.data.errors
        Object.keys(errors).forEach((key) => {
          form.setError(key as keyof SasaranFormValues, {
            type: 'manual',
            message: errors[key][0],
          })
        })
        toast.error('Periksa kembali isian formulir sasaran.')
      } else if (isAxiosError(error) && error.response?.data?.message) {
        toast.error(error.response.data.message)
      } else {
        toast.error('Terjadi kesalahan saat menyimpan data sasaran.')
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

  const tujuanOptions = useMemo(() => {
    return availableTujuanList.map((t) => ({
      value: String(t.id),
      label: `${t.kode_tujuan ? `[${t.kode_tujuan}] ` : ''}${t.tujuan}`,
    }))
  }, [availableTujuanList])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-2xl max-h-[88vh] flex flex-col p-0 gap-0 overflow-hidden shadow-2xl'>
        {/* Pinned Header */}
        <DialogHeader className='px-6 pt-5 pb-4 border-b bg-muted/10 shrink-0 text-start'>
          <div className='flex items-center gap-3'>
            <div className='flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary'>
              <Target className='h-5 w-5' />
            </div>
            <div>
              <DialogTitle className='text-lg font-bold text-foreground'>
                {isEdit ? 'Ubah Sasaran Renstra OPD' : 'Tambah Sasaran Renstra OPD'}
              </DialogTitle>
              <DialogDescription className='text-xs text-muted-foreground mt-0.5'>
                {isEdit
                  ? 'Perbarui rumusan sasaran strategis atau penugasan tujuan terkait.'
                  : 'Definisikan rumusan sasaran strategis Renstra yang diturunkan dari tujuan OPD.'}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Scrollable Form Body */}
        <div className='flex-1 overflow-y-auto px-6 py-4'>
          <Form {...form}>
            <form
              id='sasaran-action-form'
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
                          // Reset tujuan selection if not in new OPD
                          form.setValue('tujuan_penilaian_id', '')
                        }}
                        placeholder='Pilih instansi perangkat daerah...'
                        searchPlaceholder='Cari OPD / Dinas...'
                        emptyMessage='Perangkat daerah tidak ditemukan.'
                        disabled={isSubmitting || isLoadingOpd}
                      />
                    </FormControl>
                    <FormDescription className='text-[11px]'>
                      Instansi pengampu sasaran strategis Renstra.
                    </FormDescription>
                    <FormMessage className='text-xs' />
                  </FormItem>
                )}
              />

              {/* Cascading Tujuan Selector */}
              <FormField
                control={form.control}
                name='tujuan_penilaian_id'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className='text-xs font-semibold'>
                      Tujuan Strategis Renstra Terkait <span className='text-destructive'>*</span>
                    </FormLabel>
                    <FormControl>
                      <SearchableSelect
                        options={tujuanOptions}
                        value={field.value}
                        onValueChange={field.onChange}
                        placeholder={
                          watchedOpdId
                            ? availableTujuanList.length > 0
                              ? 'Pilih tujuan Renstra pengampu...'
                              : 'Belum ada tujuan untuk OPD ini (buat tujuan dahulu)'
                            : 'Pilih OPD terlebih dahulu...'
                        }
                        searchPlaceholder='Cari pernyataan tujuan...'
                        emptyMessage='Tujuan Renstra tidak ditemukan.'
                        disabled={isSubmitting || isLoadingTujuan || !watchedOpdId || availableTujuanList.length === 0}
                      />
                    </FormControl>
                    <FormDescription className='text-[11px]'>
                      Cascading makro: setiap sasaran wajib terhubung ke satu rumusan tujuan Renstra.
                    </FormDescription>
                    <FormMessage className='text-xs' />
                  </FormItem>
                )}
              />

              {/* Kode Sasaran & Urutan Grid */}
              <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
                <FormField
                  control={form.control}
                  name='kode_sasaran'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className='text-xs font-semibold'>
                        Kode Sasaran (Opsional)
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder='Contoh: SAS-01, SAS.1'
                          disabled={isSubmitting}
                          {...field}
                        />
                      </FormControl>
                      <FormDescription className='text-[11px]'>
                        Otomatis diisi sistem (misal SAS-01) jika dikosongkan.
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
                        Urutan posisi dalam dokumen Renstra.
                      </FormDescription>
                      <FormMessage className='text-xs' />
                    </FormItem>
                  )}
                />
              </div>

              {/* Sasaran Textarea */}
              <FormField
                control={form.control}
                name='sasaran'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className='text-xs font-semibold'>
                      Pernyataan Sasaran Strategis <span className='text-destructive'>*</span>
                    </FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder='Contoh: Terwujudnya konektivitas dan kondisi jalan serta jembatan yang mantap dan andal...'
                        rows={3}
                        disabled={isSubmitting}
                        {...field}
                      />
                    </FormControl>
                    <FormDescription className='text-[11px]'>
                      Tuliskan kondisi kinerja yang ingin dicapai OPD secara terukur dan spesifik.
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
                        placeholder='Contoh: Renstra SKPD Bab IV Sasaran Bidang Bina Marga...'
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
            form='sasaran-action-form'
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
              'Tambah Sasaran'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

interface SasaranCopyDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

export function SasaranCopyDialog({
  open,
  onOpenChange,
  onSuccess,
}: SasaranCopyDialogProps) {
  const [sourcePeriodeId, setSourcePeriodeId] = useState('')
  const [selectedOpdId, setSelectedOpdId] = useState<string>('all')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Fetch available evaluation periods to copy from
  const { data: periodesData } = useQuery({
    queryKey: ['periodes', 'for-copy-source-sasaran'],
    queryFn: () => perencanaanService.getPaginatedPeriodes({ all: true }),
    staleTime: 5 * 60 * 1000,
  })

  // Fetch list of OPDs
  const { data: opdList = [] } = useQuery({
    queryKey: ['opds', 'all-for-copy-sasaran'],
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
      const res = await perencanaanService.copySasaran({
        source_periode_id: sourcePeriodeId,
        opd_id: selectedOpdId === 'all' ? undefined : selectedOpdId,
      })
      toast.success(res.message || 'Data sasaran berhasil disalin ke periode aktif.')
      onSuccess()
      onOpenChange(false)
    } catch (error) {
      if (isAxiosError(error) && error.response?.data?.message) {
        toast.error(error.response.data.message)
      } else {
        toast.error('Gagal menyalin data sasaran dari periode lain.')
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
                Salin Sasaran dari Periode Lain
              </DialogTitle>
              <DialogDescription className='text-xs text-muted-foreground mt-0.5'>
                Duplikasi rumusan sasaran Renstra dari siklus lampau ke periode aktif berjalan.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Form Body */}
        <div className='flex-1 overflow-y-auto px-6 py-4 space-y-4'>
          <div className='p-3 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-700 dark:text-blue-400 text-xs flex items-start gap-2'>
            <Calendar className='h-4 w-4 shrink-0 mt-0.5' />
            <span>
              Sistem akan memetakan sasaran ke tujuan Renstra terkait di periode aktif. Bila tujuan induk belum ada di periode aktif, sistem akan menyalinnya secara otomatis.
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
              Pilih satu OPD tertentu jika hanya ingin menyalin sasaran pada instansi tersebut.
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
              'Salin Sasaran'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

interface SasaranDeleteDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  currentRow: SasaranPenilaianItem
  onSuccess: () => void
}

export function SasaranDeleteDialog({
  open,
  onOpenChange,
  currentRow,
  onSuccess,
}: SasaranDeleteDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleDelete() {
    setIsSubmitting(true)
    try {
      await perencanaanService.deleteSasaran(currentRow.id)
      toast.success('Sasaran strategis Renstra OPD berhasil dihapus.')
      onSuccess()
      onOpenChange(false)
    } catch (error) {
      if (isAxiosError(error) && error.response?.data?.message) {
        toast.error(error.response.data.message)
      } else {
        toast.error('Gagal menghapus data sasaran.')
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
          <span>Hapus Sasaran Renstra OPD</span>
        </div>
      }
      desc={
        <div className='space-y-2 text-xs'>
          <p>
            Apakah Anda yakin ingin menghapus sasaran{' '}
            <strong className='text-foreground'>"{currentRow.sasaran}"</strong> untuk instansi{' '}
            <strong className='text-foreground'>{currentRow.opd?.nama}</strong>?
          </p>
          <div className='rounded-md border border-amber-500/20 bg-amber-500/10 p-2.5 text-amber-800 dark:text-amber-300 text-[11px] leading-relaxed'>
            Catatan: Pastikan tidak ada indikator kinerja (IKU/Indikator Renstra) yang masih terikat sebelum menghapus sasaran ini.
          </div>
        </div>
      }
      destructive
      confirmText={
        <span className='flex items-center gap-1.5'>
          <Trash2 className='h-4 w-4' />
          Hapus Sasaran
        </span>
      }
      cancelBtnText='Batal'
      isLoading={isSubmitting}
      handleConfirm={handleDelete}
      className='sm:max-w-md'
    />
  )
}

export function SasaranDialogs({ onSuccess }: { onSuccess: () => void }) {
  const { open, setOpen, currentRow, setCurrentRow } = useSasaran()

  const handleClose = () => {
    setOpen(null)
    setTimeout(() => {
      setCurrentRow(null)
    }, 300)
  }

  return (
    <>
      <SasaranActionDialog
        key='sasaran-add'
        open={open === 'create'}
        onOpenChange={(val) => {
          if (!val) handleClose()
        }}
        onSuccess={() => {
          onSuccess()
          handleClose()
        }}
      />

      <SasaranCopyDialog
        key='sasaran-copy'
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
          <SasaranActionDialog
            key={`sasaran-edit-${currentRow.id}`}
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

          <SasaranDeleteDialog
            key={`sasaran-delete-${currentRow.id}`}
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
