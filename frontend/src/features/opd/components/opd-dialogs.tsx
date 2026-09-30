import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { isAxiosError } from 'axios'
import { toast } from 'sonner'
import { Building2, Loader2, AlertTriangle } from 'lucide-react'
import { opdService } from '@/services/opd-service'
import { OPD_CATEGORIES, type OpdItem } from '@/types/opd'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
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
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

const opdFormSchema = z.object({
  nama: z.string().min(3, 'Nama perangkat daerah minimal 3 karakter').max(255),
  kode: z.string().min(2, 'Kode instansi minimal 2 karakter').max(50),
  kategori: z.string().min(1, 'Pilih kategori perangkat daerah'),
  kepala: z.string().max(255).optional(),
  urutan: z.number().min(0, 'Nomor urut tidak boleh negatif'),
  is_active: z.boolean(),
})

type OpdFormValues = z.infer<typeof opdFormSchema>

interface OpdActionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  currentRow?: OpdItem | null
  onSuccess: () => void
}

export function OpdActionDialog({
  open,
  onOpenChange,
  currentRow,
  onSuccess,
}: OpdActionDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const isEdit = !!currentRow

  const form = useForm<OpdFormValues>({
    resolver: zodResolver(opdFormSchema),
    defaultValues: {
      nama: '',
      kode: '',
      kategori: 'Dinas',
      kepala: '',
      urutan: 0,
      is_active: true,
    },
  })

  useEffect(() => {
    if (open) {
      if (currentRow) {
        form.reset({
          nama: currentRow.nama,
          kode: currentRow.kode,
          kategori: currentRow.kategori,
          kepala: currentRow.kepala || '',
          urutan: currentRow.urutan,
          is_active: currentRow.is_active,
        })
      } else {
        form.reset({
          nama: '',
          kode: '',
          kategori: 'Dinas',
          kepala: '',
          urutan: 0,
          is_active: true,
        })
      }
    }
  }, [open, currentRow, form])

  async function onSubmit(values: OpdFormValues) {
    setIsSubmitting(true)
    try {
      const payload = {
        nama: values.nama.trim(),
        kode: values.kode.trim(),
        kategori: values.kategori,
        kepala: values.kepala?.trim() || null,
        urutan: values.urutan,
        is_active: values.is_active,
      }

      if (isEdit && currentRow) {
        await opdService.updateOpd(currentRow.id, payload)
        toast.success(`Perangkat daerah "${payload.nama}" berhasil diperbarui.`)
      } else {
        await opdService.createOpd(payload)
        toast.success(`Perangkat daerah "${payload.nama}" berhasil ditambahkan.`)
      }

      onSuccess()
      onOpenChange(false)
    } catch (error) {
      const msg =
        isAxiosError(error) && error.response?.data?.message
          ? error.response.data.message
          : 'Terjadi kesalahan saat menyimpan perangkat daerah.'
      toast.error(msg)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-lg flex flex-col p-0 gap-0 overflow-hidden shadow-2xl'>
        <DialogHeader className='px-6 pt-5 pb-4 border-b bg-muted/10 shrink-0 text-start'>
          <div className='flex items-center gap-3'>
            <div className='flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary'>
              <Building2 className='h-5 w-5' />
            </div>
            <div>
              <DialogTitle className='text-base font-bold text-foreground'>
                {isEdit ? 'Edit Perangkat Daerah' : 'Tambah Perangkat Daerah'}
              </DialogTitle>
              <DialogDescription className='text-xs text-muted-foreground mt-0.5'>
                {isEdit
                  ? 'Perbarui data instansi, kode singkatan, atau kepala perangkat daerah.'
                  : 'Daftarkan instansi perangkat daerah baru ke dalam portal pemerintah daerah.'}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className='px-6 py-4 overflow-y-auto max-h-[70vh]'>
          <Form {...form}>
            <form
              id='opd-action-form'
              onSubmit={form.handleSubmit(onSubmit)}
              className='space-y-4'
            >
              {/* Nama OPD */}
              <FormField
                control={form.control}
                name='nama'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className='text-xs font-semibold'>
                      Nama Perangkat Daerah (OPD) <span className='text-destructive'>*</span>
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder='Contoh: Dinas Komunikasi dan Informatika'
                        disabled={isSubmitting}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage className='text-xs' />
                  </FormItem>
                )}
              />

              <div className='grid grid-cols-1 sm:grid-cols-2 gap-3'>
                {/* Kode OPD */}
                <FormField
                  control={form.control}
                  name='kode'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className='text-xs font-semibold'>
                        Kode / Singkatan <span className='text-destructive'>*</span>
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder='Contoh: Diskominfo, Setda'
                          disabled={isSubmitting}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage className='text-xs' />
                    </FormItem>
                  )}
                />

                {/* Kategori */}
                <FormField
                  control={form.control}
                  name='kategori'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className='text-xs font-semibold'>
                        Kategori Instansi <span className='text-destructive'>*</span>
                      </FormLabel>
                      <Select
                        disabled={isSubmitting}
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger className='w-full'>
                            <SelectValue placeholder='Pilih kategori...' />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {OPD_CATEGORIES.map((kat) => (
                            <SelectItem key={kat} value={kat}>
                              {kat}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage className='text-xs' />
                    </FormItem>
                  )}
                />
              </div>

              {/* Kepala Instansi */}
              <FormField
                control={form.control}
                name='kepala'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className='text-xs font-semibold'>
                      Kepala Perangkat Daerah (Opsional)
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder='Contoh: Dr. H. Fulan, S.Sos., M.Si.'
                        disabled={isSubmitting}
                        {...field}
                      />
                    </FormControl>
                    <FormDescription className='text-[11px] text-muted-foreground'>
                      Nama pejabat pimpinan unit kerja beserta gelar kedinasan.
                    </FormDescription>
                    <FormMessage className='text-xs' />
                  </FormItem>
                )}
              />

              <div className='grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1'>
                {/* Urutan */}
                <FormField
                  control={form.control}
                  name='urutan'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className='text-xs font-semibold'>
                        Nomor Urutan Tampilan
                      </FormLabel>
                      <FormControl>
                        <Input
                          type='number'
                          min={0}
                          placeholder='0'
                          disabled={isSubmitting}
                          value={field.value ?? 0}
                          onChange={(e) =>
                            field.onChange(
                              isNaN(e.target.valueAsNumber)
                                ? 0
                                : e.target.valueAsNumber
                            )
                          }
                        />
                      </FormControl>
                      <FormMessage className='text-xs' />
                    </FormItem>
                  )}
                />

                {/* Status Aktif */}
                <FormField
                  control={form.control}
                  name='is_active'
                  render={({ field }) => (
                    <FormItem className='flex flex-row items-center justify-between rounded-lg border p-3 shadow-2xs'>
                      <div className='space-y-0.5'>
                        <FormLabel className='text-xs font-semibold'>Status Aktif</FormLabel>
                        <FormDescription className='text-[10px] text-muted-foreground'>
                          {field.value ? 'Dapat dipilih pegawai' : 'Dinonaktifkan'}
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          disabled={isSubmitting}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>
            </form>
          </Form>
        </div>

        <DialogFooter className='px-6 py-3 border-t bg-muted/10 shrink-0 gap-2 sm:gap-0'>
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
            form='opd-action-form'
            size='sm'
            disabled={isSubmitting}
            className='gap-2'
          >
            {isSubmitting && <Loader2 className='h-3.5 w-3.5 animate-spin' />}
            {isEdit ? 'Simpan Perubahan' : 'Tambah Instansi'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

interface OpdDeleteDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  currentRow: OpdItem | null
  onSuccess: () => void
}

export function OpdDeleteDialog({
  open,
  onOpenChange,
  currentRow,
  onSuccess,
}: OpdDeleteDialogProps) {
  const [isDeleting, setIsDeleting] = useState(false)

  if (!currentRow) return null

  const hasUsers = (currentRow.users_count ?? 0) > 0

  async function handleDelete() {
    if (!currentRow) return
    setIsDeleting(true)
    try {
      await opdService.deleteOpd(currentRow.id)
      toast.success(`Perangkat daerah "${currentRow.nama}" berhasil dihapus.`)
      onSuccess()
      onOpenChange(false)
    } catch (error) {
      const msg =
        isAxiosError(error) && error.response?.data?.message
          ? error.response.data.message
          : 'Gagal menghapus perangkat daerah.'
      toast.error(msg)
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className='sm:max-w-md'>
        <AlertDialogHeader className='text-start'>
          <div className='flex items-center gap-3'>
            <div className='flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-destructive/10 text-destructive'>
              <AlertTriangle className='h-5 w-5' />
            </div>
            <div>
              <AlertDialogTitle className='text-base font-bold text-foreground'>
                Hapus Perangkat Daerah
              </AlertDialogTitle>
              <AlertDialogDescription className='text-xs text-muted-foreground mt-0.5'>
                Tindakan ini tidak dapat dibatalkan.
              </AlertDialogDescription>
            </div>
          </div>
        </AlertDialogHeader>

        <div className='py-2 text-sm text-muted-foreground'>
          <p>
            Apakah Anda yakin ingin menghapus instansi{' '}
            <strong className='text-foreground'>{currentRow.nama}</strong> ({currentRow.kode})?
          </p>

          {hasUsers && (
            <div className='mt-3 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 text-xs flex items-start gap-2'>
              <AlertTriangle className='h-4 w-4 shrink-0 mt-0.5' />
              <span>
                <strong>Perhatian:</strong> Masih terdapat <strong>{currentRow.users_count} pegawai</strong> yang ditugaskan di instansi ini. Sistem akan menolak penghapusan untuk melindungi integritas data pegawai.
              </span>
            </div>
          )}
        </div>

        <AlertDialogFooter className='gap-2 sm:gap-0'>
          <AlertDialogCancel disabled={isDeleting}>Batal</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault()
              handleDelete()
            }}
            disabled={isDeleting}
            className='bg-destructive text-destructive-foreground hover:bg-destructive/90 gap-2'
          >
            {isDeleting && <Loader2 className='h-3.5 w-3.5 animate-spin' />}
            Hapus Instansi
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
