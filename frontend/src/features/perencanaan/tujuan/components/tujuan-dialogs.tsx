import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { isAxiosError } from 'axios'
import { toast } from 'sonner'
import { useQuery } from '@tanstack/react-query'
import {
  AlertTriangle,
  Copy,
  Flag,
  Loader2,
  Calendar,
  Trash2,
} from 'lucide-react'
import { opdService } from '@/services/opd-service'
import { perencanaanService } from '@/services/perencanaan-service'
import type {
  TujuanFormData,
  TujuanPenilaianItem,
} from '@/types/perencanaan'
import { useTujuan } from './tujuan-provider'
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

const tujuanFormSchema = z.object({
  opd_id: z.string().min(1, 'Perangkat Daerah (OPD) wajib dipilih.'),
  kode_tujuan: z.string().max(50).optional(),
  tujuan: z
    .string()
    .min(5, 'Pernyataan tujuan minimal 5 karakter.')
    .max(1000, 'Pernyataan tujuan maksimal 1000 karakter.'),
  urutan: z.number().int().min(1, 'Urutan minimal 1').optional(),
  keterangan: z.string().max(2000).optional(),
})

type TujuanFormValues = z.infer<typeof tujuanFormSchema>

interface TujuanActionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  currentRow?: TujuanPenilaianItem | null
  onSuccess: () => void
}

export function TujuanActionDialog({
  open,
  onOpenChange,
  currentRow,
  onSuccess,
}: TujuanActionDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const isEdit = Boolean(currentRow)

  // Fetch list of OPDs for searchable select
  const { data: opdList = [], isLoading: isLoadingOpd } = useQuery({
    queryKey: ['opds', 'all-for-tujuan'],
    queryFn: () => opdService.getOpds({ all: true }),
    staleTime: 5 * 60 * 1000,
  })

  const form = useForm<TujuanFormValues>({
    resolver: zodResolver(tujuanFormSchema),
    defaultValues: {
      opd_id: '',
      kode_tujuan: 'TUJ-01',
      tujuan: '',
      urutan: 1,
      keterangan: '',
    },
  })

  useEffect(() => {
    if (open) {
      if (currentRow) {
        form.reset({
          opd_id: currentRow.opd_id,
          kode_tujuan: currentRow.kode_tujuan || 'TUJ-01',
          tujuan: currentRow.tujuan,
          urutan: currentRow.urutan,
          keterangan: currentRow.keterangan || '',
        })
      } else {
        form.reset({
          opd_id: '',
          kode_tujuan: 'TUJ-01',
          tujuan: '',
          urutan: 1,
          keterangan: '',
        })
      }
    }
  }, [open, currentRow, form])

  async function onSubmit(values: TujuanFormValues) {
    setIsSubmitting(true)
    try {
      const payload: TujuanFormData = {
        opd_id: values.opd_id,
        kode_tujuan: values.kode_tujuan?.trim() || undefined,
        tujuan: values.tujuan.trim(),
        urutan: values.urutan,
        keterangan: values.keterangan?.trim() || undefined,
      }

      if (isEdit && currentRow) {
        await perencanaanService.updateTujuan(currentRow.id, payload)
        toast.success('Data tujuan strategis Renstra berhasil diperbarui.')
      } else {
        await perencanaanService.createTujuan(payload)
        toast.success('Tujuan strategis Renstra berhasil ditambahkan.')
      }

      onSuccess()
      onOpenChange(false)
    } catch (error) {
      if (isAxiosError(error) && error.response?.data?.message) {
        toast.error(error.response.data.message)
      } else {
        toast.error('Gagal menyimpan data tujuan perencanaan.')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const opdOptions = opdList.map((o: { id: string | number; nama: string; kode: string }) => ({
    value: String(o.id),
    label: `${o.nama} (${o.kode})`,
  }))

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-xl max-h-[88vh] flex flex-col p-0 gap-0 overflow-hidden shadow-2xl'>
        {/* Pinned Header */}
        <DialogHeader className='px-6 pt-5 pb-4 border-b bg-muted/10 shrink-0 text-start'>
          <div className='flex items-center gap-3'>
            <div className='flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary'>
              <Flag className='h-5 w-5' />
            </div>
            <div>
              <DialogTitle className='text-lg font-bold text-foreground'>
                {isEdit ? 'Ubah Tujuan Renstra OPD' : 'Tambah Tujuan Renstra OPD'}
              </DialogTitle>
              <DialogDescription className='text-xs text-muted-foreground mt-0.5'>
                {isEdit
                  ? 'Perbarui rumusan tujuan strategis Renstra dan referensi kebijakannya.'
                  : 'Daftarkan rumusan tujuan Renstra OPD dalam siklus perencanaan aktif.'}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Scrollable Form Body */}
        <div className='flex-1 overflow-y-auto px-6 py-4 min-h-0'>
          <Form {...form}>
            <form
              id='tujuan-action-form'
              onSubmit={form.handleSubmit(onSubmit)}
              className='space-y-4'
            >
              {/* OPD Select */}
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
                        onValueChange={field.onChange}
                        placeholder={
                          isLoadingOpd
                            ? 'Memuat data perangkat daerah...'
                            : 'Pilih perangkat daerah pengampu...'
                        }
                        disabled={isSubmitting || isLoadingOpd}
                      />
                    </FormControl>
                    <FormDescription className='text-[11px]'>
                      Instansi penanggung jawab rumusan tujuan ini.
                    </FormDescription>
                    <FormMessage className='text-xs' />
                  </FormItem>
                )}
              />

              <div className='grid grid-cols-2 gap-3'>
                {/* Kode Tujuan */}
                <FormField
                  control={form.control}
                  name='kode_tujuan'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className='text-xs font-semibold'>
                        Kode Tujuan
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder='Contoh: TUJ-01'
                          disabled={isSubmitting}
                          {...field}
                        />
                      </FormControl>
                      <FormDescription className='text-[11px]'>
                        Penomoran kode identifikasi
                      </FormDescription>
                      <FormMessage className='text-xs' />
                    </FormItem>
                  )}
                />

                {/* Urutan */}
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
                          onChange={(e) =>
                            field.onChange(parseInt(e.target.value, 10) || 1)
                          }
                        />
                      </FormControl>
                      <FormDescription className='text-[11px]'>
                        Urutan prioritas dalam laporan
                      </FormDescription>
                      <FormMessage className='text-xs' />
                    </FormItem>
                  )}
                />
              </div>

              {/* Pernyataan Tujuan */}
              <FormField
                control={form.control}
                name='tujuan'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className='text-xs font-semibold'>
                      Pernyataan Tujuan Strategis (Renstra) <span className='text-destructive'>*</span>
                    </FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder='Contoh: Meningkatkan kualitas penyediaan infrastruktur jalan, drainase, dan sumber daya air yang sesuai tata ruang...'
                        rows={3}
                        disabled={isSubmitting}
                        {...field}
                      />
                    </FormControl>
                    <FormDescription className='text-[11px]'>
                      Gunakan kalimat hasil/dampak yang ingin dicapai sesuai dokumen Renstra SKPD.
                    </FormDescription>
                    <FormMessage className='text-xs' />
                  </FormItem>
                )}
              />

              {/* Catatan / Keterangan Sumber Dokumen */}
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
                        placeholder='Contoh: Renstra SKPD Bab IV Sasaran Strategis Dinas PUPR...'
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
            form='tujuan-action-form'
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
              'Tambah Tujuan'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

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
  const [selectedOpdId, setSelectedOpdId] = useState<string>('all')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Fetch available evaluation periods to copy from
  const { data: periodesData } = useQuery({
    queryKey: ['periodes', 'for-copy-source'],
    queryFn: () => perencanaanService.getPaginatedPeriodes({ all: true }),
    staleTime: 5 * 60 * 1000,
  })

  // Fetch list of OPDs
  const { data: opdList = [] } = useQuery({
    queryKey: ['opds', 'all-for-copy'],
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
      const res = await perencanaanService.copyTujuan({
        source_periode_id: sourcePeriodeId,
        opd_id: selectedOpdId === 'all' ? undefined : selectedOpdId,
      })
      toast.success(res.message || 'Data tujuan berhasil disalin ke periode aktif.')
      onSuccess()
      onOpenChange(false)
    } catch (error) {
      if (isAxiosError(error) && error.response?.data?.message) {
        toast.error(error.response.data.message)
      } else {
        toast.error('Gagal menyalin data tujuan dari periode lain.')
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
                Salin Tujuan dari Periode Lain
              </DialogTitle>
              <DialogDescription className='text-xs text-muted-foreground mt-0.5'>
                Duplikasi rumusan tujuan Renstra dari siklus lampau ke periode aktif berjalan.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Form Body */}
        <div className='flex-1 overflow-y-auto px-6 py-4 space-y-4'>
          <div className='p-3 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-700 dark:text-blue-400 text-xs flex items-start gap-2'>
            <Calendar className='h-4 w-4 shrink-0 mt-0.5' />
            <span>
              Fitur ini membantu Bapperida menyalin seluruh tujuan yang rumusannya masih berlaku tanpa perlu input ulang manual. Rumusan yang identik tidak akan diduplikasi ganda.
            </span>
          </div>

          <div className='space-y-1.5'>
            <label className='text-xs font-semibold text-foreground'>
              Periode Sumber (Asal) <span className='text-destructive'>*</span>
            </label>
            <Select value={sourcePeriodeId} onValueChange={setSourcePeriodeId}>
              <SelectTrigger className='w-full'>
                <SelectValue placeholder='Pilih siklus RPJMD sumber...' />
              </SelectTrigger>
              <SelectContent>
                {pastPeriodes.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.nama_periode} (Tahun {p.tahun_penilaian}) - {p.status === 'arsip' ? 'Arsip' : 'Draft'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className='space-y-1.5'>
            <label className='text-xs font-semibold text-foreground'>
              Cakupan Perangkat Daerah (OPD)
            </label>
            <Select value={selectedOpdId} onValueChange={setSelectedOpdId}>
              <SelectTrigger className='w-full'>
                <SelectValue placeholder='Pilih cakupan OPD...' />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='all'>Semua Perangkat Daerah (Seluruh OPD)</SelectItem>
                {opdList.map((opd: { id: string | number; nama: string; kode: string }) => (
                  <SelectItem key={String(opd.id)} value={String(opd.id)}>
                    {opd.nama} ({opd.kode})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
            className='min-w-[120px] gap-2'
          >
            {isSubmitting ? (
              <>
                <Loader2 className='h-4 w-4 animate-spin' />
                <span>Menyalin...</span>
              </>
            ) : (
              <span>Salin Sekarang</span>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

interface TujuanDeleteDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  currentRow?: TujuanPenilaianItem | null
  onSuccess: () => void
}

export function TujuanDeleteDialog({
  open,
  onOpenChange,
  currentRow,
  onSuccess,
}: TujuanDeleteDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)

  if (!currentRow) return null

  async function handleDelete() {
    if (!currentRow) return
    setIsSubmitting(true)
    try {
      await perencanaanService.deleteTujuan(currentRow.id)
      toast.success('Data tujuan strategis berhasil dihapus.')
      onSuccess()
      onOpenChange(false)
    } catch (error) {
      if (isAxiosError(error) && error.response?.data?.message) {
        toast.error(error.response.data.message)
      } else {
        toast.error('Gagal menghapus data tujuan perencanaan.')
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
          <span>Hapus Tujuan Renstra OPD</span>
        </div>
      }
      desc={
        <div className='space-y-2 text-xs'>
          <p>
            Apakah Anda yakin ingin menghapus tujuan{' '}
            <strong className='text-foreground'>"{currentRow.tujuan}"</strong> untuk instansi{' '}
            <strong className='text-foreground'>{currentRow.opd?.nama}</strong>?
          </p>
          <div className='rounded-md border border-amber-500/20 bg-amber-500/10 p-2.5 text-amber-800 dark:text-amber-300 text-[11px] leading-relaxed'>
            Catatan: Pastikan tidak ada sasaran strategis turunan yang masih aktif sebelum menghapus tujuan ini.
          </div>
        </div>
      }
      destructive
      confirmText={
        <span className='flex items-center gap-1.5'>
          <Trash2 className='h-4 w-4' />
          Hapus Tujuan
        </span>
      }
      cancelBtnText='Batal'
      isLoading={isSubmitting}
      handleConfirm={handleDelete}
      className='sm:max-w-md'
    />
  )
}

export function TujuanDialogs({ onSuccess }: { onSuccess: () => void }) {
  const { open, setOpen, currentRow, setCurrentRow } = useTujuan()

  const handleClose = () => {
    setOpen(null)
    setTimeout(() => {
      setCurrentRow(null)
    }, 300)
  }

  return (
    <>
      <TujuanActionDialog
        key='tujuan-add'
        open={open === 'create'}
        onOpenChange={(val) => {
          if (!val) handleClose()
        }}
        onSuccess={() => {
          onSuccess()
          handleClose()
        }}
      />

      <TujuanCopyDialog
        key='tujuan-copy'
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
          <TujuanActionDialog
            key={`tujuan-edit-${currentRow.id}`}
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

          <TujuanDeleteDialog
            key={`tujuan-delete-${currentRow.id}`}
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
