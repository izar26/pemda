import { useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { isAxiosError } from 'axios'
import { toast } from 'sonner'
import { useQuery } from '@tanstack/react-query'
import {
  AlertTriangle,
  Building2,
  Calendar,
  Copy,
  FileCheck2,
  Flag,
  Loader2,
  Sparkles,
  Target,
  Trash2,
} from 'lucide-react'
import { masterDataService } from '@/services/master-data-service'
import { opdService } from '@/services/opd-service'
import { perencanaanService } from '@/services/perencanaan-service'
import type {
  IndikatorFormData,
  IndikatorPenilaianItem,
  SasaranFormData,
  SasaranPenilaianItem,
  TujuanFormData,
  TujuanPenilaianItem,
} from '@/types/perencanaan'
import { useTujuan } from './tujuan-provider'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/confirm-dialog'
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
import { SearchableSelect } from '@/components/searchable-select'
import { Textarea } from '@/components/ui/textarea'

// ==========================================
// 1. FORM TUJUAN (LEVEL 1)
// ==========================================

const tujuanFormSchema = z.object({
  opd_id: z.string().min(1, 'Perangkat Daerah (OPD) wajib dipilih.'),
  sumber_data_id: z.string().min(1, 'Sumber Data wajib dipilih.'),
  tujuan: z
    .string()
    .min(5, 'Pernyataan tujuan minimal 5 karakter.')
    .max(1000, 'Pernyataan tujuan maksimal 1000 karakter.'),
})

type TujuanFormValues = z.infer<typeof tujuanFormSchema>

interface TujuanActionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  currentRow?: TujuanPenilaianItem | null
  defaultOpdId?: string
  onSuccess: () => void
}

export function TujuanActionDialog({
  open,
  onOpenChange,
  currentRow,
  defaultOpdId,
  onSuccess,
}: TujuanActionDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const isEdit = Boolean(currentRow)

  const { data: opdData, isLoading: isLoadingOpd } = useQuery({
    queryKey: ['opds', 'all-for-tujuan'],
    queryFn: () => opdService.getOpds({ all: true }),
    staleTime: 5 * 60 * 1000,
    enabled: open,
  })

  const { data: sumberDataResp, isLoading: isLoadingSumber } = useQuery({
    queryKey: ['master-data', 'sumber-data', 'all-active'],
    queryFn: () => masterDataService.getItems('sumber-data'),
    staleTime: 5 * 60 * 1000,
    enabled: open,
  })

  const opdOptions = useMemo(
    () =>
      (opdData || []).map((o: { id: string | number; nama: string; kode: string }) => ({
        value: String(o.id),
        label: `${o.nama} (${o.kode})`,
      })),
    [opdData]
  )

  const sumberDataOptions = useMemo(
    () =>
      (sumberDataResp?.data || [])
        .filter((s) => s.is_active)
        .map((s) => ({
          value: String(s.id),
          label: s.nama,
        })),
    [sumberDataResp?.data]
  )

  const defaultSumberId = useMemo(() => {
    const renstra = sumberDataOptions.find((opt) => opt.label.toLowerCase().includes('renstra'))
    return renstra?.value || sumberDataOptions[0]?.value || ''
  }, [sumberDataOptions])

  const form = useForm<TujuanFormValues>({
    resolver: zodResolver(tujuanFormSchema),
    defaultValues: {
      opd_id: '',
      sumber_data_id: '',
      tujuan: '',
    },
  })

  const currentRowId = currentRow?.id

  useEffect(() => {
    if (!open) return
    if (currentRow) {
      form.reset({
        opd_id: currentRow.opd_id,
        sumber_data_id: currentRow.sumber_data_id || defaultSumberId,
        tujuan: currentRow.tujuan,
      })
    } else {
      form.reset({
        opd_id: defaultOpdId && defaultOpdId !== 'all' ? defaultOpdId : '',
        sumber_data_id: defaultSumberId,
        tujuan: '',
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, currentRowId])

  // Auto-populate default Sumber Data once master data finishes loading if field is still empty
  useEffect(() => {
    if (open && !currentRow && defaultSumberId && !form.getValues('sumber_data_id')) {
      form.setValue('sumber_data_id', defaultSumberId, { shouldValidate: false })
    }
  }, [open, currentRow, defaultSumberId, form])

  async function onSubmit(values: TujuanFormValues) {
    setIsSubmitting(true)
    try {
      const payload: TujuanFormData = {
        opd_id: values.opd_id,
        sumber_data_id: values.sumber_data_id || null,
        tujuan: values.tujuan.trim(),
      }

      if (isEdit && currentRow) {
        await perencanaanService.updateTujuan(currentRow.id, payload)
        toast.success('Data tujuan berhasil diperbarui.')
      } else {
        await perencanaanService.createTujuan(payload)
        toast.success('Tujuan berhasil ditambahkan.')
      }

      onSuccess()
      onOpenChange(false)
    } catch (error) {
      if (isAxiosError(error) && error.response?.data?.message) {
        toast.error(error.response.data.message)
      } else {
        toast.error('Gagal menyimpan data tujuan.')
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
              <Flag className='h-5 w-5' />
            </div>
            <div>
              <DialogTitle className='text-lg font-bold text-foreground'>
                {isEdit ? 'Ubah Tujuan' : 'Tambah Tujuan'}
              </DialogTitle>
              <DialogDescription className='text-xs text-muted-foreground mt-0.5'>
                {isEdit
                  ? 'Perbarui rumusan tujuan perangkat daerah.'
                  : 'Tambahkan rumusan tujuan untuk perangkat daerah pada tahun penilaian aktif.'}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className='flex-1 overflow-y-auto px-6 py-4 min-h-0'>
          <Form {...form}>
            <form
              id='tujuan-action-form'
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
                    <SearchableSelect
                      options={opdOptions}
                      value={field.value}
                      onValueChange={field.onChange}
                      placeholder={
                        isLoadingOpd
                          ? 'Memuat daftar OPD...'
                          : 'Pilih perangkat daerah...'
                      }
                      searchPlaceholder='Cari nama atau kode OPD...'
                      emptyMessage='OPD tidak ditemukan.'
                      disabled={isLoadingOpd || isSubmitting}
                    />
                    <FormMessage className='text-xs' />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name='sumber_data_id'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className='text-xs font-semibold'>
                      Sumber Data <span className='text-destructive'>*</span>
                    </FormLabel>
                    <SearchableSelect
                      options={sumberDataOptions}
                      value={field.value}
                      onValueChange={field.onChange}
                      allowClear={false}
                      placeholder={
                        isLoadingSumber
                          ? 'Memuat sumber data...'
                          : 'Pilih sumber data...'
                      }
                      searchPlaceholder='Cari sumber data...'
                      emptyMessage='Sumber data tidak ditemukan.'
                      disabled={isLoadingSumber || isSubmitting}
                    />
                    <FormDescription className='text-[11px]'>
                      Referensi diambil dari menu Data Master &rarr; Tab Sumber Data.
                    </FormDescription>
                    <FormMessage className='text-xs' />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name='tujuan'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className='text-xs font-semibold'>
                      Tujuan <span className='text-destructive'>*</span>
                    </FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder='Contoh: Meningkatkan kualitas infrastruktur jalan dan jembatan daerah yang berkeselamatan...'
                        className='min-h-[96px] text-xs resize-none leading-relaxed'
                        disabled={isSubmitting}
                        {...field}
                      />
                    </FormControl>
                    <FormDescription className='text-[11px]'>
                      Boleh lebih dari 1 tujuan untuk masing-masing OPD.
                    </FormDescription>
                    <FormMessage className='text-xs' />
                  </FormItem>
                )}
              />
            </form>
          </Form>
        </div>

        <DialogFooter className='px-6 py-3.5 border-t bg-muted/10 shrink-0'>
          <Button
            type='button'
            variant='outline'
            size='sm'
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
            className='text-xs'
          >
            Batal
          </Button>
          <Button
            type='submit'
            form='tujuan-action-form'
            size='sm'
            disabled={isSubmitting}
            className='text-xs min-w-[130px]'
          >
            {isSubmitting ? (
              <>
                <Loader2 className='mr-1.5 h-3.5 w-3.5 animate-spin' />
                Menyimpan...
              </>
            ) : isEdit ? (
              'Simpan Perubahan'
            ) : (
              'Simpan Tujuan'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ==========================================
// 2. FORM SASARAN (LEVEL 2 — CASCADING DARI TUJUAN)
// ==========================================

const sasaranFormSchema = z.object({
  tujuan_penilaian_id: z.string().min(1, 'Tujuan terkait wajib dipilih.'),
  sasaran: z
    .string()
    .min(5, 'Pernyataan sasaran minimal 5 karakter.')
    .max(1000, 'Pernyataan sasaran maksimal 1000 karakter.'),
})

type SasaranFormValues = z.infer<typeof sasaranFormSchema>

interface SasaranActionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  parentTujuan?: TujuanPenilaianItem | null
  currentSasaran?: SasaranPenilaianItem | null
  onSuccess: () => void
}

export function SasaranActionDialog({
  open,
  onOpenChange,
  parentTujuan,
  currentSasaran,
  onSuccess,
}: SasaranActionDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const isEdit = Boolean(currentSasaran)

  const form = useForm<SasaranFormValues>({
    resolver: zodResolver(sasaranFormSchema),
    defaultValues: {
      tujuan_penilaian_id: '',
      sasaran: '',
    },
  })

  const currentSasaranId = currentSasaran?.id
  const parentTujuanId = parentTujuan?.id

  useEffect(() => {
    if (!open) return
    if (currentSasaran) {
      form.reset({
        tujuan_penilaian_id: currentSasaran.tujuan_penilaian_id,
        sasaran: currentSasaran.sasaran,
      })
    } else if (parentTujuan) {
      form.reset({
        tujuan_penilaian_id: parentTujuan.id,
        sasaran: '',
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, currentSasaranId, parentTujuanId])

  async function onSubmit(values: SasaranFormValues) {
    setIsSubmitting(true)
    try {
      const payload: SasaranFormData = {
        tujuan_penilaian_id: values.tujuan_penilaian_id,
        opd_id: parentTujuan?.opd_id || currentSasaran?.opd_id,
        sasaran: values.sasaran.trim(),
      }

      if (isEdit && currentSasaran) {
        await perencanaanService.updateSasaran(currentSasaran.id, payload)
        toast.success('Data sasaran berhasil diperbarui.')
      } else {
        await perencanaanService.createSasaran(payload)
        toast.success('Sasaran berhasil ditambahkan.')
      }

      onSuccess()
      onOpenChange(false)
    } catch (error) {
      if (isAxiosError(error) && error.response?.data?.message) {
        toast.error(error.response.data.message)
      } else {
        toast.error('Gagal menyimpan data sasaran.')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const displayTujuanText = parentTujuan?.tujuan || currentSasaran?.tujuan?.tujuan || '-'
  const displayOpdName = parentTujuan?.opd?.nama || currentSasaran?.opd?.nama || '-'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-lg max-h-[88vh] flex flex-col p-0 gap-0 overflow-hidden shadow-2xl'>
        <DialogHeader className='px-6 pt-5 pb-4 border-b bg-muted/10 shrink-0 text-start'>
          <div className='flex items-center gap-3'>
            <div className='flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary'>
              <Target className='h-5 w-5' />
            </div>
            <div>
              <DialogTitle className='text-lg font-bold text-foreground'>
                {isEdit ? 'Ubah Sasaran' : 'Tambah Sasaran'}
              </DialogTitle>
              <DialogDescription className='text-xs text-muted-foreground mt-0.5'>
                {isEdit
                  ? 'Perbarui rumusan sasaran terkait tujuan terpilih.'
                  : 'Tambahkan rumusan sasaran yang menginduk pada tujuan ini.'}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className='flex-1 overflow-y-auto px-6 py-4 min-h-0'>
          <Form {...form}>
            <form
              id='sasaran-action-form'
              onSubmit={form.handleSubmit(onSubmit)}
              className='space-y-4'
            >
              {/* Locked Parent Tujuan Context Card */}
              <div className='rounded-lg border bg-muted/20 p-3.5 space-y-1.5'>
                <div className='flex items-center justify-between gap-2'>
                  <span className='text-[10px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5'>
                    <Flag className='h-3 w-3 text-primary' />
                    Tujuan Terkait (Cascading)
                  </span>
                  <Badge variant='outline' className='text-[10px] font-medium'>
                    <Building2 className='h-2.5 w-2.5 mr-1' />
                    {displayOpdName}
                  </Badge>
                </div>
                <p className='text-xs font-medium text-foreground leading-relaxed'>
                  {displayTujuanText}
                </p>
              </div>

              <FormField
                control={form.control}
                name='sasaran'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className='text-xs font-semibold'>
                      Sasaran <span className='text-destructive'>*</span>
                    </FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder='Contoh: Meningkatnya kemantapan jalan kabupaten dan jembatan dalam kondisi mantap...'
                        className='min-h-[96px] text-xs resize-none leading-relaxed'
                        disabled={isSubmitting}
                        {...field}
                      />
                    </FormControl>
                    <FormDescription className='text-[11px]'>
                      Boleh lebih dari 1 sasaran untuk masing-masing tujuan.
                    </FormDescription>
                    <FormMessage className='text-xs' />
                  </FormItem>
                )}
              />
            </form>
          </Form>
        </div>

        <DialogFooter className='px-6 py-3.5 border-t bg-muted/10 shrink-0'>
          <Button
            type='button'
            variant='outline'
            size='sm'
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
            className='text-xs'
          >
            Batal
          </Button>
          <Button
            type='submit'
            form='sasaran-action-form'
            size='sm'
            disabled={isSubmitting}
            className='text-xs min-w-[130px]'
          >
            {isSubmitting ? (
              <>
                <Loader2 className='mr-1.5 h-3.5 w-3.5 animate-spin' />
                Menyimpan...
              </>
            ) : isEdit ? (
              'Simpan Perubahan'
            ) : (
              'Simpan Sasaran'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ==========================================
// 3. FORM INDIKATOR (LEVEL 3 — CASCADING DARI SASARAN)
// ==========================================

const indikatorFormSchema = z.object({
  sasaran_penilaian_id: z.string().min(1, 'Sasaran terkait wajib dipilih.'),
  jenis: z.enum(['IKU', 'Biasa']),
  indikator: z
    .string()
    .min(5, 'Pernyataan indikator minimal 5 karakter.')
    .max(1000, 'Pernyataan indikator maksimal 1000 karakter.'),
})

type IndikatorFormValues = z.infer<typeof indikatorFormSchema>

interface IndikatorActionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  parentSasaran?: SasaranPenilaianItem | null
  currentIndikator?: IndikatorPenilaianItem | null
  onSuccess: () => void
}

export function IndikatorActionDialog({
  open,
  onOpenChange,
  parentSasaran,
  currentIndikator,
  onSuccess,
}: IndikatorActionDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const isEdit = Boolean(currentIndikator)

  const form = useForm<IndikatorFormValues>({
    resolver: zodResolver(indikatorFormSchema),
    defaultValues: {
      sasaran_penilaian_id: '',
      jenis: 'IKU',
      indikator: '',
    },
  })

  const currentIndikatorId = currentIndikator?.id
  const parentSasaranId = parentSasaran?.id

  useEffect(() => {
    if (!open) return
    if (currentIndikator) {
      form.reset({
        sasaran_penilaian_id: currentIndikator.sasaran_penilaian_id,
        jenis: currentIndikator.jenis,
        indikator: currentIndikator.indikator,
      })
    } else if (parentSasaran) {
      form.reset({
        sasaran_penilaian_id: parentSasaran.id,
        jenis: 'IKU',
        indikator: '',
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, currentIndikatorId, parentSasaranId])

  async function onSubmit(values: IndikatorFormValues) {
    setIsSubmitting(true)
    try {
      const payload: IndikatorFormData = {
        sasaran_penilaian_id: values.sasaran_penilaian_id,
        tujuan_penilaian_id:
          parentSasaran?.tujuan_penilaian_id || currentIndikator?.tujuan_penilaian_id,
        opd_id: parentSasaran?.opd_id || currentIndikator?.opd_id,
        jenis: values.jenis,
        indikator: values.indikator.trim(),
      }

      if (isEdit && currentIndikator) {
        await perencanaanService.updateIndikator(currentIndikator.id, payload)
        toast.success('Data indikator berhasil diperbarui.')
      } else {
        await perencanaanService.createIndikator(payload)
        toast.success('Indikator berhasil ditambahkan.')
      }

      onSuccess()
      onOpenChange(false)
    } catch (error) {
      if (isAxiosError(error) && error.response?.data?.message) {
        toast.error(error.response.data.message)
      } else {
        toast.error('Gagal menyimpan data indikator.')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const displaySasaranText =
    parentSasaran?.sasaran || currentIndikator?.sasaran?.sasaran || '-'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-lg max-h-[88vh] flex flex-col p-0 gap-0 overflow-hidden shadow-2xl'>
        <DialogHeader className='px-6 pt-5 pb-4 border-b bg-muted/10 shrink-0 text-start'>
          <div className='flex items-center gap-3'>
            <div className='flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary'>
              <Sparkles className='h-5 w-5' />
            </div>
            <div>
              <DialogTitle className='text-lg font-bold text-foreground'>
                {isEdit ? 'Ubah Indikator' : 'Tambah Indikator'}
              </DialogTitle>
              <DialogDescription className='text-xs text-muted-foreground mt-0.5'>
                {isEdit
                  ? 'Perbarui rumusan dan jenis indikator terkait sasaran.'
                  : 'Tambahkan indikator kinerja (IKU atau Biasa) pada sasaran ini.'}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className='flex-1 overflow-y-auto px-6 py-4 min-h-0'>
          <Form {...form}>
            <form
              id='indikator-action-form'
              onSubmit={form.handleSubmit(onSubmit)}
              className='space-y-4'
            >
              {/* Locked Parent Sasaran Context Card */}
              <div className='rounded-lg border bg-muted/20 p-3.5 space-y-1.5'>
                <span className='text-[10px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5'>
                  <Target className='h-3 w-3 text-primary' />
                  Sasaran Terkait (Cascading)
                </span>
                <p className='text-xs font-medium text-foreground leading-relaxed'>
                  {displaySasaranText}
                </p>
              </div>

              <FormField
                control={form.control}
                name='jenis'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className='text-xs font-semibold'>
                      Jenis Indikator <span className='text-destructive'>*</span>
                    </FormLabel>
                    <div className='grid grid-cols-2 gap-2.5'>
                      <button
                        type='button'
                        disabled={isSubmitting}
                        onClick={() => field.onChange('IKU')}
                        className={`flex items-center gap-2.5 rounded-lg border p-3 text-left transition-all ${
                          field.value === 'IKU'
                            ? 'border-primary bg-primary/10 ring-1 ring-primary'
                            : 'hover:bg-muted/40 border-border'
                        }`}
                      >
                        <div
                          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md ${
                            field.value === 'IKU'
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-muted text-muted-foreground'
                          }`}
                        >
                          <Sparkles className='h-3.5 w-3.5' />
                        </div>
                        <div className='min-w-0'>
                          <p className='text-xs font-bold text-foreground'>IKU</p>
                          <p className='text-[10px] text-muted-foreground truncate'>
                            Indikator Kinerja Utama
                          </p>
                        </div>
                      </button>

                      <button
                        type='button'
                        disabled={isSubmitting}
                        onClick={() => field.onChange('Biasa')}
                        className={`flex items-center gap-2.5 rounded-lg border p-3 text-left transition-all ${
                          field.value === 'Biasa'
                            ? 'border-primary bg-primary/10 ring-1 ring-primary'
                            : 'hover:bg-muted/40 border-border'
                        }`}
                      >
                        <div
                          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md ${
                            field.value === 'Biasa'
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-muted text-muted-foreground'
                          }`}
                        >
                          <FileCheck2 className='h-3.5 w-3.5' />
                        </div>
                        <div className='min-w-0'>
                          <p className='text-xs font-bold text-foreground'>Biasa</p>
                          <p className='text-[10px] text-muted-foreground truncate'>
                            Indikator Sasaran Biasa
                          </p>
                        </div>
                      </button>
                    </div>
                    <FormMessage className='text-xs' />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name='indikator'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className='text-xs font-semibold'>
                      Indikator <span className='text-destructive'>*</span>
                    </FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder='Contoh: Persentase jalan kabupaten dalam kondisi mantap (%)'
                        className='min-h-[96px] text-xs resize-none leading-relaxed'
                        disabled={isSubmitting}
                        {...field}
                      />
                    </FormControl>
                    <FormDescription className='text-[11px]'>
                      Boleh lebih dari 1 indikator untuk masing-masing sasaran.
                    </FormDescription>
                    <FormMessage className='text-xs' />
                  </FormItem>
                )}
              />
            </form>
          </Form>
        </div>

        <DialogFooter className='px-6 py-3.5 border-t bg-muted/10 shrink-0'>
          <Button
            type='button'
            variant='outline'
            size='sm'
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
            className='text-xs'
          >
            Batal
          </Button>
          <Button
            type='submit'
            form='indikator-action-form'
            size='sm'
            disabled={isSubmitting}
            className='text-xs min-w-[130px]'
          >
            {isSubmitting ? (
              <>
                <Loader2 className='mr-1.5 h-3.5 w-3.5 animate-spin' />
                Menyimpan...
              </>
            ) : isEdit ? (
              'Simpan Perubahan'
            ) : (
              'Simpan Indikator'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ==========================================
// 4. SALIN POHON KINERJA DARI PERIODE LAIN
// ==========================================

interface TujuanCopyDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

export function TujuanCopyDialog({
  open,
  onOpenChange,
  onSuccess,
}: TujuanCopyDialogProps) {
  const [sourcePeriodeId, setSourcePeriodeId] = useState('')
  const [selectedOpdId, setSelectedOpdId] = useState('all')
  const [isCopying, setIsCopying] = useState(false)

  const { data: periodesResp, isLoading: isLoadingPeriodes } = useQuery({
    queryKey: ['perencanaan', 'periode', 'all-for-copy'],
    queryFn: () => perencanaanService.getPaginatedPeriodes({ all: true }),
    enabled: open,
  })

  const { data: opdData, isLoading: isLoadingOpd } = useQuery({
    queryKey: ['opds', 'all-for-tujuan-copy'],
    queryFn: () => opdService.getOpds({ all: true }),
    staleTime: 5 * 60 * 1000,
    enabled: open,
  })

  const periodes = useMemo(() => periodesResp?.data || [], [periodesResp?.data])
  const activePeriode = useMemo(
    () => periodes.find((p) => p.is_aktif || p.status === 'aktif'),
    [periodes]
  )
  const sourcePeriodes = useMemo(
    () => periodes.filter((p) => !p.is_aktif && p.status !== 'aktif'),
    [periodes]
  )

  const periodeOptions = useMemo(
    () =>
      sourcePeriodes.map((p) => ({
        value: String(p.id),
        label: `${p.nama_periode} — Tahun ${p.tahun_penilaian} (${p.status === 'arsip' ? 'Arsip' : 'Draft'})`,
      })),
    [sourcePeriodes]
  )

  const opdOptions = useMemo(
    () => [
      { value: 'all', label: 'Semua Perangkat Daerah (Salin Massal)' },
      ...(opdData || []).map((opd: { id: string | number; nama: string; kode: string }) => ({
        value: String(opd.id),
        label: `${opd.nama} (${opd.kode})`,
      })),
    ],
    [opdData]
  )

  const defaultSourcePeriodeId = periodeOptions[0]?.value || ''
  const effectiveSourcePeriodeId = sourcePeriodeId || defaultSourcePeriodeId

  const [prevOpen, setPrevOpen] = useState(open)
  if (open !== prevOpen) {
    setPrevOpen(open)
    if (open) {
      setSelectedOpdId('all')
      setSourcePeriodeId('')
    }
  }

  async function handleCopy() {
    if (!effectiveSourcePeriodeId) {
      toast.error('Silakan pilih periode sumber terlebih dahulu.')
      return
    }

    setIsCopying(true)
    try {
      const res = await perencanaanService.copyTujuan({
        source_periode_id: effectiveSourcePeriodeId,
        opd_id: selectedOpdId !== 'all' ? selectedOpdId : undefined,
      })

      toast.success(res.message)
      onSuccess()
      onOpenChange(false)
    } catch (error) {
      if (isAxiosError(error)) {
        const errors = error.response?.data?.errors
        if (errors?.source_periode_id) {
          toast.error(errors.source_periode_id[0])
        } else {
          toast.error(
            error.response?.data?.message || 'Gagal menyalin data dari periode sumber.'
          )
        }
      } else {
        toast.error('Terjadi kesalahan saat menyalin data.')
      }
    } finally {
      setIsCopying(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-lg max-h-[85vh] flex flex-col p-0 gap-0 overflow-hidden shadow-2xl'>
        <DialogHeader className='px-6 pt-5 pb-4 border-b bg-muted/10 shrink-0 text-start'>
          <div className='flex items-center gap-3'>
            <div className='flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary'>
              <Copy className='h-5 w-5' />
            </div>
            <div>
              <DialogTitle className='text-lg font-bold text-foreground'>
                Salin dari Periode Sebelumnya
              </DialogTitle>
              <DialogDescription className='text-xs text-muted-foreground mt-0.5'>
                Salin satu paket pohon Tujuan, Sasaran &amp; Indikator dari tahun/periode sebelumnya ke tahun penilaian aktif.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className='flex-1 overflow-y-auto px-6 py-4 min-h-0 space-y-4'>
          <div className='rounded-lg border bg-primary/5 border-primary/20 p-3.5 space-y-1'>
            <div className='flex items-center gap-1.5 text-xs font-semibold text-primary'>
              <Calendar className='h-3.5 w-3.5' />
              Target Tahun Penilaian Aktif:
            </div>
            {activePeriode ? (
              <p className='text-xs font-medium text-foreground'>
                {activePeriode.nama_periode} (Tahun Penilaian{' '}
                <span className='font-bold'>{activePeriode.tahun_penilaian}</span>)
              </p>
            ) : (
              <p className='text-xs text-destructive font-medium'>
                Belum ada periode penilaian yang aktif!
              </p>
            )}
          </div>

          <div className='space-y-1.5'>
            <label className='text-xs font-semibold text-foreground'>
              Pilih Periode Sumber <span className='text-destructive'>*</span>
            </label>
            <SearchableSelect
              options={periodeOptions}
              value={sourcePeriodeId}
              onValueChange={setSourcePeriodeId}
              allowClear={false}
              placeholder={
                isLoadingPeriodes
                  ? 'Memuat daftar periode...'
                  : periodeOptions.length === 0
                    ? 'Tidak ada periode sumber lain yang tersedia'
                    : 'Pilih siklus periode sumber...'
              }
              searchPlaceholder='Cari nama atau tahun periode...'
              emptyMessage='Tidak ada periode lain yang tersedia.'
              disabled={isLoadingPeriodes || isCopying || periodeOptions.length === 0}
            />
          </div>

          <div className='space-y-1.5'>
            <label className='text-xs font-semibold text-foreground'>
              Filter Perangkat Daerah (Opsional)
            </label>
            <SearchableSelect
              options={opdOptions}
              value={selectedOpdId}
              onValueChange={(val) => setSelectedOpdId(val || 'all')}
              allowClear={false}
              placeholder={
                isLoadingOpd
                  ? 'Memuat daftar OPD...'
                  : 'Semua Perangkat Daerah (Salin Massal)'
              }
              searchPlaceholder='Cari nama atau kode OPD...'
              emptyMessage='OPD tidak ditemukan.'
              disabled={isLoadingOpd || isCopying}
            />
            <p className='text-[11px] text-muted-foreground'>
              Data yang sudah ada tidak akan ditimpa (duplikasi dicegah otomatis).
            </p>
          </div>
        </div>

        <DialogFooter className='px-6 py-3.5 border-t bg-muted/10 shrink-0'>
          <Button
            type='button'
            variant='outline'
            size='sm'
            onClick={() => onOpenChange(false)}
            disabled={isCopying}
            className='text-xs'
          >
            Batal
          </Button>
          <Button
            type='button'
            size='sm'
            onClick={handleCopy}
            disabled={isCopying || !activePeriode || !sourcePeriodeId}
            className='text-xs min-w-[130px]'
          >
            {isCopying ? (
              <>
                <Loader2 className='mr-1.5 h-3.5 w-3.5 animate-spin' />
                Menyalin...
              </>
            ) : (
              <>
                <Copy className='mr-1.5 h-3.5 w-3.5' />
                Salin Sekarang
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ==========================================
// 5. ORCHESTRATOR DIALOGS (CREATE / EDIT / DELETE / COPY)
// ==========================================

export function TujuanDialogs({ onSuccess }: { onSuccess: () => void }) {
  const {
    open,
    setOpen,
    currentRow,
    setCurrentRow,
    currentSasaran,
    setCurrentSasaran,
    currentIndikator,
    setCurrentIndikator,
    tableFilters,
  } = useTujuan()
  const [isDeleting, setIsDeleting] = useState(false)

  async function handleDeleteTujuan() {
    if (!currentRow) return
    setIsDeleting(true)
    try {
      const res = await perencanaanService.deleteTujuan(currentRow.id)
      toast.success(res.message)
      onSuccess()
      setOpen(null)
      setCurrentRow(null)
    } catch (error) {
      if (isAxiosError(error) && error.response?.data?.message) {
        toast.error(error.response.data.message)
      } else {
        toast.error('Gagal menghapus data tujuan.')
      }
    } finally {
      setIsDeleting(false)
    }
  }

  async function handleDeleteSasaran() {
    if (!currentSasaran) return
    setIsDeleting(true)
    try {
      const res = await perencanaanService.deleteSasaran(currentSasaran.id)
      toast.success(res.message)
      onSuccess()
      setOpen(null)
      setCurrentSasaran(null)
    } catch (error) {
      if (isAxiosError(error) && error.response?.data?.message) {
        toast.error(error.response.data.message)
      } else {
        toast.error('Gagal menghapus data sasaran.')
      }
    } finally {
      setIsDeleting(false)
    }
  }

  async function handleDeleteIndikator() {
    if (!currentIndikator) return
    setIsDeleting(true)
    try {
      const res = await perencanaanService.deleteIndikator(currentIndikator.id)
      toast.success(res.message)
      onSuccess()
      setOpen(null)
      setCurrentIndikator(null)
    } catch (error) {
      if (isAxiosError(error) && error.response?.data?.message) {
        toast.error(error.response.data.message)
      } else {
        toast.error('Gagal menghapus data indikator.')
      }
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <>
      {/* Level 1: Create / Edit Tujuan */}
      <TujuanActionDialog
        open={open === 'create' || open === 'edit'}
        onOpenChange={(val) => {
          if (!val) {
            setOpen(null)
            setCurrentRow(null)
          }
        }}
        currentRow={open === 'edit' ? currentRow : null}
        defaultOpdId={tableFilters?.opd_id as string | undefined}
        onSuccess={onSuccess}
      />

      {/* Level 2: Create / Edit Sasaran */}
      <SasaranActionDialog
        open={open === 'create-sasaran' || open === 'edit-sasaran'}
        onOpenChange={(val) => {
          if (!val) {
            setOpen(null)
            setCurrentSasaran(null)
          }
        }}
        parentTujuan={currentRow}
        currentSasaran={open === 'edit-sasaran' ? currentSasaran : null}
        onSuccess={onSuccess}
      />

      {/* Level 3: Create / Edit Indikator */}
      <IndikatorActionDialog
        open={open === 'create-indikator' || open === 'edit-indikator'}
        onOpenChange={(val) => {
          if (!val) {
            setOpen(null)
            setCurrentIndikator(null)
          }
        }}
        parentSasaran={currentSasaran}
        currentIndikator={open === 'edit-indikator' ? currentIndikator : null}
        onSuccess={onSuccess}
      />

      {/* Copy from Another Period */}
      <TujuanCopyDialog
        open={open === 'copy'}
        onOpenChange={(val) => {
          if (!val) setOpen(null)
        }}
        onSuccess={onSuccess}
      />

      {/* Delete Tujuan */}
      {currentRow && (
        <ConfirmDialog
          open={open === 'delete'}
          onOpenChange={(val) => {
            if (!val) {
              setOpen(null)
              setCurrentRow(null)
            }
          }}
          handleConfirm={handleDeleteTujuan}
          isLoading={isDeleting}
          title={
            <span className='flex items-center gap-2 text-destructive'>
              <AlertTriangle className='h-5 w-5' />
              Hapus Tujuan Strategis
            </span>
          }
          desc={
            <div className='space-y-2 text-xs'>
              <p>
                Apakah Anda yakin ingin menghapus tujuan pada{' '}
                <span className='font-semibold text-foreground'>
                  {currentRow.opd?.nama}
                </span>
                ?
              </p>
              <div className='rounded-md bg-muted/60 p-2.5 border text-foreground font-medium'>
                &ldquo;{currentRow.tujuan}&rdquo;
              </div>
              <p className='text-destructive font-medium'>
                Perhatian: Penghapusan akan ditolak oleh sistem jika tujuan ini masih memiliki Sasaran/Indikator atau digunakan pada Konteks Penilaian (Form 2B). Bersihkan data dari bawah terlebih dahulu.
              </p>
            </div>
          }
          confirmText={
            <span className='flex items-center gap-1.5'>
              <Trash2 className='h-3.5 w-3.5' />
              Ya, Hapus Tujuan
            </span>
          }
          destructive
        />
      )}

      {/* Delete Sasaran */}
      {currentSasaran && (
        <ConfirmDialog
          open={open === 'delete-sasaran'}
          onOpenChange={(val) => {
            if (!val) {
              setOpen(null)
              setCurrentSasaran(null)
            }
          }}
          handleConfirm={handleDeleteSasaran}
          isLoading={isDeleting}
          title={
            <span className='flex items-center gap-2 text-destructive'>
              <AlertTriangle className='h-5 w-5' />
              Hapus Sasaran Strategis
            </span>
          }
          desc={
            <div className='space-y-2 text-xs'>
              <p>Apakah Anda yakin ingin menghapus sasaran ini?</p>
              <div className='rounded-md bg-muted/60 p-2.5 border text-foreground font-medium'>
                &ldquo;{currentSasaran.sasaran}&rdquo;
              </div>
              <p className='text-destructive font-medium'>
                Perhatian: Penghapusan akan ditolak oleh sistem jika sasaran ini masih memiliki Indikator atau digunakan pada Konteks Penilaian (Form 2B). Bersihkan data dari bawah terlebih dahulu.
              </p>
            </div>
          }
          confirmText={
            <span className='flex items-center gap-1.5'>
              <Trash2 className='h-3.5 w-3.5' />
              Ya, Hapus Sasaran
            </span>
          }
          destructive
        />
      )}

      {/* Delete Indikator */}
      {currentIndikator && (
        <ConfirmDialog
          open={open === 'delete-indikator'}
          onOpenChange={(val) => {
            if (!val) {
              setOpen(null)
              setCurrentIndikator(null)
            }
          }}
          handleConfirm={handleDeleteIndikator}
          isLoading={isDeleting}
          title={
            <span className='flex items-center gap-2 text-destructive'>
              <AlertTriangle className='h-5 w-5' />
              Hapus Indikator Kinerja
            </span>
          }
          desc={
            <div className='space-y-2 text-xs'>
              <p>
                Apakah Anda yakin ingin menghapus indikator{' '}
                <span className='font-semibold text-foreground'>
                  ({currentIndikator.jenis})
                </span>{' '}
                berikut?
              </p>
              <div className='rounded-md bg-muted/60 p-2.5 border text-foreground font-medium'>
                &ldquo;{currentIndikator.indikator}&rdquo;
              </div>
            </div>
          }
          confirmText={
            <span className='flex items-center gap-1.5'>
              <Trash2 className='h-3.5 w-3.5' />
              Ya, Hapus Indikator
            </span>
          }
          destructive
        />
      )}
    </>
  )
}
