import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { isAxiosError } from 'axios'
import { toast } from 'sonner'
import { FileCheck2, Loader2, Sparkles, Target } from 'lucide-react'
import { perencanaanService } from '@/services/perencanaan-service'
import type {
  IndikatorFormData,
  IndikatorPenilaianItem,
  SasaranPenilaianItem,
} from '@/types/perencanaan'
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

export const indikatorFormSchema = z.object({
  sasaran_penilaian_id: z.string().min(1, 'Sasaran terkait wajib dipilih.'),
  jenis: z.enum(['IKU', 'Biasa']),
  indikator: z
    .string()
    .min(5, 'Pernyataan indikator minimal 5 karakter.')
    .max(1000, 'Pernyataan indikator maksimal 1000 karakter.'),
})

export type IndikatorFormValues = z.infer<typeof indikatorFormSchema>

export interface IndikatorActionDialogProps {
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
