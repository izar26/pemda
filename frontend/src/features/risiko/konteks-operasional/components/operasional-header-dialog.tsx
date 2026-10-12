import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { isAxiosError } from 'axios'
import { toast } from 'sonner'
import { useQuery } from '@tanstack/react-query'
import {
  Building2,
  Calendar,
  FileSpreadsheet,
  Loader2,
  Sparkles,
  User,
} from 'lucide-react'
import { masterDataService } from '@/services/master-data-service'
import { risikoService } from '@/services/risiko-service'
import type { KonteksOperasionalFormData, KonteksOperasionalItem } from '@/types/risiko'
import { Button } from '@/components/ui/button'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'

const headerFormSchema = z.object({
  opd_id: z.string().min(1, 'Perangkat Daerah harus ditentukan.'),
  periode_penilaian_id: z.string().optional(),
  sumber_data_id: z.string().optional(),
  informasi_lain: z.string().max(5000).optional(),
  nama_pemda: z.string().max(150).optional(),
  nama_kepala: z.string().max(150).optional(),
  nip_kepala: z.string().max(50).optional(),
  jabatan_kepala: z.string().max(150).optional(),
  tanggal_penetapan: z.string().optional(),
  status: z.enum(['draft', 'final']),
})

type HeaderFormValues = z.infer<typeof headerFormSchema>

interface OperasionalHeaderDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  currentKonteks?: KonteksOperasionalItem | null
  opdId: string
  opdName?: string
  opdKepala?: string | null
  periodeId?: string
  tahunPenilaian?: number
  onSuccess: () => void
}

export function OperasionalHeaderDialog({
  open,
  onOpenChange,
  currentKonteks,
  opdId,
  opdName,
  opdKepala,
  periodeId,
  tahunPenilaian,
  onSuccess,
}: OperasionalHeaderDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)

  const form = useForm<HeaderFormValues>({
    resolver: zodResolver(headerFormSchema),
    defaultValues: {
      opd_id: opdId,
      periode_penilaian_id: periodeId || '',
      sumber_data_id: '',
      informasi_lain: '',
      nama_pemda: 'Pemerintah Kabupaten Cianjur',
      nama_kepala: '',
      nip_kepala: '',
      jabatan_kepala: '',
      tanggal_penetapan: new Date().toISOString().slice(0, 10),
      status: 'draft',
    },
  })

  // Fetch Sumber Data Master
  const { data: sumberDataRes } = useQuery({
    queryKey: ['master-sumber-data', 'all'],
    queryFn: () => masterDataService.getItems('sumber-data'),
    staleTime: 5 * 60 * 1000,
  })
  const sumberDataList = sumberDataRes?.data || []

  // Sync form when dialog opens or data changes
  useEffect(() => {
    if (open) {
      if (currentKonteks) {
        form.reset({
          opd_id: currentKonteks.opd_id,
          periode_penilaian_id: currentKonteks.periode_penilaian_id,
          sumber_data_id: currentKonteks.sumber_data_id || '',
          informasi_lain: currentKonteks.informasi_lain || '',
          nama_pemda: currentKonteks.nama_pemda || 'Pemerintah Kabupaten Cianjur',
          nama_kepala: currentKonteks.nama_kepala || '',
          nip_kepala: currentKonteks.nip_kepala || '',
          jabatan_kepala: currentKonteks.jabatan_kepala || '',
          tanggal_penetapan: currentKonteks.tanggal_penetapan
            ? currentKonteks.tanggal_penetapan.slice(0, 10)
            : new Date().toISOString().slice(0, 10),
          status: currentKonteks.status || 'draft',
        })
      } else {
        form.reset({
          opd_id: opdId,
          periode_penilaian_id: periodeId || '',
          sumber_data_id: '',
          informasi_lain: '',
          nama_pemda: 'Pemerintah Kabupaten Cianjur',
          nama_kepala: opdKepala || '',
          nip_kepala: '',
          jabatan_kepala: opdName ? `Kepala ${opdName}` : '',
          tanggal_penetapan: new Date().toISOString().slice(0, 10),
          status: 'draft',
        })
      }
    }
  }, [open, currentKonteks, opdId, opdName, opdKepala, periodeId, form])

  async function onSubmit(values: HeaderFormValues) {
    setIsSubmitting(true)
    try {
      const payload: KonteksOperasionalFormData = {
        opd_id: values.opd_id,
        periode_penilaian_id: values.periode_penilaian_id,
        sumber_data_id: values.sumber_data_id || undefined,
        informasi_lain: values.informasi_lain || undefined,
        nama_pemda: values.nama_pemda || 'Pemerintah Kabupaten Cianjur',
        nama_kepala: values.nama_kepala || undefined,
        nip_kepala: values.nip_kepala || undefined,
        jabatan_kepala: values.jabatan_kepala || undefined,
        tanggal_penetapan: values.tanggal_penetapan || undefined,
        status: values.status,
      }

      if (currentKonteks?.id) {
        await risikoService.updateKonteksOperasional(currentKonteks.id, payload)
        toast.success('Pengesahan dan Header Form 2C berhasil diperbarui.')
      } else {
        await risikoService.saveKonteksOperasional(payload)
        toast.success('Penetapan Konteks Risiko Operasional OPD (Form 2C) berhasil dibuat.')
      }

      onOpenChange(false)
      onSuccess()
    } catch (error: unknown) {
      if (isAxiosError(error) && error.response?.data?.message) {
        toast.error(error.response.data.message)
      } else {
        toast.error('Gagal menyimpan penetapan konteks risiko operasional.')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const isEditing = Boolean(currentKonteks?.id)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-2xl max-h-[90vh] overflow-y-auto'>
        <DialogHeader>
          <div className='flex items-center gap-2'>
            <div className='flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary'>
              <FileSpreadsheet className='h-5 w-5' />
            </div>
            <div>
              <DialogTitle className='text-base font-bold'>
                {isEditing
                  ? 'Ubah Pengesahan & Informasi Form 2C'
                  : 'Inisialisasi Penetapan Konteks Operasional (Form 2C)'}
              </DialogTitle>
              <DialogDescription className='text-xs'>
                Formulir 2C: Penetapan Konteks Risiko Operasional OPD Tingkat Program, Kegiatan & Sub-Kegiatan
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-4 pt-2'>
            {/* Context Info Banner */}
            <div className='p-3 rounded-lg border bg-muted/40 space-y-1.5'>
              <div className='flex items-center justify-between text-xs'>
                <span className='text-muted-foreground flex items-center gap-1.5 font-medium'>
                  <Building2 className='h-3.5 w-3.5' /> Perangkat Daerah:
                </span>
                <span className='font-semibold text-foreground'>{opdName || 'OPD Terpilih'}</span>
              </div>
              <div className='flex items-center justify-between text-xs'>
                <span className='text-muted-foreground flex items-center gap-1.5 font-medium'>
                  <Calendar className='h-3.5 w-3.5' /> Tahun Penilaian:
                </span>
                <span className='font-semibold text-foreground'>
                  Tahun {tahunPenilaian || new Date().getFullYear()}
                </span>
              </div>
              {currentKonteks?.tujuan_strategis && (
                <div className='pt-1.5 border-t border-border/60 text-xs'>
                  <span className='text-muted-foreground block text-[11px] mb-0.5'>
                    Tujuan Strategis OPD (Tersinkronisasi otomatis dari Form 2B):
                  </span>
                  <span className='font-medium text-foreground italic'>
                    "{currentKonteks.tujuan_strategis.tujuan}"
                  </span>
                </div>
              )}
            </div>

            {/* Sumber Data & Status */}
            <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
              <FormField
                control={form.control}
                name='sumber_data_id'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className='text-xs font-semibold'>Keterangan Sumber Data</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || ''}>
                      <FormControl>
                        <SelectTrigger className='text-xs h-9'>
                          <SelectValue placeholder='Pilih sumber data...' />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {sumberDataList.map((item) => (
                          <SelectItem key={item.id} value={String(item.id)} className='text-xs'>
                            {item.nama}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription className='text-[11px]'>
                      Dokumen rujukan operasional Renstra / Renja OPD.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name='status'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className='text-xs font-semibold'>Status Dokumen</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className='text-xs h-9'>
                          <SelectValue placeholder='Pilih status...' />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value='draft' className='text-xs'>
                          Draft (Dalam Penyusunan)
                        </SelectItem>
                        <SelectItem value='final' className='text-xs'>
                          Final (Telah Ditetapkan)
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription className='text-[11px]'>
                      Status penetapan resmi dokumen Form 2C.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Informasi Lain yang Relevan */}
            <FormField
              control={form.control}
              name='informasi_lain'
              render={({ field }) => (
                <FormItem>
                  <FormLabel className='text-xs font-semibold'>Informasi Lain yang Relevan</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder='Catatan operasional, lingkup urusan, atau dasar hukum khusus (opsional)...'
                      className='text-xs min-h-[70px] resize-none'
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Fieldset Data Pengesahan */}
            <div className='pt-2 space-y-3'>
              <div className='flex items-center gap-2 border-b pb-1.5'>
                <User className='h-4 w-4 text-primary' />
                <h4 className='text-xs font-bold text-foreground uppercase tracking-wide'>
                  Data Pengesahan & Tanda Tangan
                </h4>
              </div>

              <div className='grid grid-cols-1 sm:grid-cols-2 gap-3'>
                <FormField
                  control={form.control}
                  name='nama_pemda'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className='text-xs'>Pemerintah Daerah</FormLabel>
                      <FormControl>
                        <Input className='text-xs h-8' {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name='tanggal_penetapan'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className='text-xs'>Tanggal Penetapan</FormLabel>
                      <FormControl>
                        <Input type='date' className='text-xs h-8' {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name='nama_kepala'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className='text-xs'>Nama Kepala OPD</FormLabel>
                      <FormControl>
                        <Input
                          placeholder='e.g. Dr. H. Irawan, M.Si.'
                          className='text-xs h-8'
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name='nip_kepala'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className='text-xs'>NIP Kepala OPD</FormLabel>
                      <FormControl>
                        <Input
                          placeholder='e.g. 19750510 200003 1 004'
                          className='text-xs h-8'
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className='sm:col-span-2'>
                  <FormField
                    control={form.control}
                    name='jabatan_kepala'
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className='text-xs'>Jabatan Kepala OPD</FormLabel>
                        <FormControl>
                          <Input
                            placeholder='e.g. Kepala Dinas Pekerjaan Umum dan Penataan Ruang'
                            className='text-xs h-8'
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            </div>

            <DialogFooter className='pt-3 gap-2 sm:gap-0'>
              <Button
                type='button'
                variant='outline'
                size='sm'
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                Batal
              </Button>
              <Button type='submit' size='sm' disabled={isSubmitting} className='gap-2'>
                {isSubmitting ? (
                  <Loader2 className='h-4 w-4 animate-spin' />
                ) : (
                  <Sparkles className='h-4 w-4' />
                )}
                <span>{isEditing ? 'Simpan Perubahan' : 'Tetapkan Form 2C'}</span>
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
