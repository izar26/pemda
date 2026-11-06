import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { isAxiosError } from 'axios'
import { toast } from 'sonner'
import { Building2, Flag, Loader2, Target } from 'lucide-react'
import { perencanaanService } from '@/services/perencanaan-service'
import type {
  SasaranFormData,
  SasaranPenilaianItem,
  TujuanPenilaianItem,
} from '@/types/perencanaan'
import { Badge } from '@/components/ui/badge'
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
import { Textarea } from '@/components/ui/textarea'

export const sasaranFormSchema = z.object({
  tujuan_penilaian_id: z.string().min(1, 'Tujuan terkait wajib dipilih.'),
  sasaran: z
    .string()
    .min(5, 'Pernyataan sasaran minimal 5 karakter.')
    .max(1000, 'Pernyataan sasaran maksimal 1000 karakter.'),
})

export type SasaranFormValues = z.infer<typeof sasaranFormSchema>

export interface SasaranActionDialogProps {
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
