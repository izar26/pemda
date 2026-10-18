import { useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { isAxiosError } from 'axios'
import { toast } from 'sonner'
import {
  FileText,
  FolderTree,
  Loader2,
  Save,
  Target,
} from 'lucide-react'
import { risikoService } from '@/services/risiko-service'
import type {
  KonteksOperasionalItemFormData,
  KonteksOperasionalItemJenis,
  KonteksOperasionalItemNode,
} from '@/types/risiko'
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
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'

const itemFormSchema = z.object({
  jenis: z.enum(['program', 'kegiatan', 'sub_kegiatan']),
  parent_id: z.string().nullable().optional(),
  nama: z
    .string()
    .min(3, 'Nama harus diisi minimal 3 karakter.')
    .max(2000, 'Nama maksimal 2000 karakter.'),
  indikator: z
    .string()
    .min(1, 'Nama indikator kinerja wajib diisi.')
    .max(2000, 'Indikator maksimal 2000 karakter.'),
  target: z
    .string()
    .min(1, 'Target wajib diisi.')
    .max(100, 'Target maksimal 100 karakter.'),
})

type ItemFormValues = z.infer<typeof itemFormSchema>

interface OperasionalItemDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  konteksId: string
  editingItem?: KonteksOperasionalItemNode | null
  parentItem?: KonteksOperasionalItemNode | null
  targetJenis?: KonteksOperasionalItemJenis
  programsList: KonteksOperasionalItemNode[]
  onSuccess: () => void
}

function indexToAlpha(num: number): string {
  let alpha = ''
  let n = num
  while (n > 0) {
    const mod = (n - 1) % 26
    alpha = String.fromCharCode(65 + mod) + alpha
    n = Math.floor((n - mod) / 26)
  }
  return alpha || 'A'
}

export function OperasionalItemDialog({
  open,
  onOpenChange,
  konteksId,
  editingItem,
  parentItem,
  targetJenis = 'program',
  programsList,
  onSuccess,
}: OperasionalItemDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)

  const activeJenis = editingItem ? editingItem.jenis : targetJenis
  const isEditing = Boolean(editingItem)

  // Compute automatic preview code (A, A.1, A.1.1)
  const previewCode = useMemo(() => {
    if (editingItem) return editingItem.kode
    if (activeJenis === 'program') {
      return indexToAlpha(programsList.length + 1)
    }
    if (parentItem) {
      const nextNum = (parentItem.children?.length || 0) + 1
      return `${parentItem.kode}.${nextNum}`
    }
    return 'A'
  }, [editingItem, activeJenis, programsList.length, parentItem])

  const form = useForm<ItemFormValues>({
    resolver: zodResolver(itemFormSchema),
    defaultValues: {
      jenis: activeJenis,
      parent_id: null,
      nama: '',
      indikator: '',
      target: '',
    },
  })

  useEffect(() => {
    if (open) {
      if (editingItem) {
        const firstInd = editingItem.indikators?.[0]
        form.reset({
          jenis: editingItem.jenis,
          parent_id: editingItem.parent_id,
          nama: editingItem.nama,
          indikator: firstInd?.indikator || '',
          target: firstInd?.target || '',
        })
      } else {
        form.reset({
          jenis: targetJenis,
          parent_id: parentItem?.id || null,
          nama: '',
          indikator: '',
          target: '',
        })
      }
    }
  }, [open, editingItem, parentItem, targetJenis, form])

  function getItemJenisLabel(jenis: KonteksOperasionalItemJenis): string {
    switch (jenis) {
      case 'program':
        return 'Program'
      case 'kegiatan':
        return 'Kegiatan'
      case 'sub_kegiatan':
        return 'Sub Kegiatan'
    }
  }

  async function onSubmit(values: ItemFormValues) {
    setIsSubmitting(true)
    try {
      const existingIndikatorId = editingItem?.indikators?.[0]?.id

      const payload: KonteksOperasionalItemFormData = {
        jenis: values.jenis,
        parent_id: values.jenis === 'program' ? null : values.parent_id || null,
        kode: previewCode,
        nama: values.nama.trim(),
        indikators: [
          {
            ...(existingIndikatorId ? { id: existingIndikatorId } : {}),
            indikator: values.indikator.trim(),
            target: values.target.trim(),
            urutan: 1,
          },
        ],
      }

      if (editingItem) {
        await risikoService.updateKonteksOperasionalItem(
          konteksId,
          editingItem.id,
          payload
        )
        toast.success(
          `${getItemJenisLabel(values.jenis)} (${previewCode}) berhasil diperbarui.`
        )
      } else {
        await risikoService.saveKonteksOperasionalItem(konteksId, payload)
        toast.success(
          `${getItemJenisLabel(values.jenis)} (${previewCode}) berhasil ditambahkan.`
        )
      }

      onOpenChange(false)
      onSuccess()
    } catch (error: unknown) {
      if (isAxiosError(error) && error.response?.data?.message) {
        toast.error(error.response.data.message)
      } else {
        toast.error('Gagal menyimpan rincian operasional.')
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
              {activeJenis === 'program' ? (
                <FolderTree className='h-5 w-5' />
              ) : activeJenis === 'kegiatan' ? (
                <Target className='h-5 w-5 text-emerald-600 dark:text-emerald-400' />
              ) : (
                <FileText className='h-5 w-5 text-blue-600 dark:text-blue-400' />
              )}
            </div>
            <div className='min-w-0 flex-1'>
              <div className='flex items-center gap-2 flex-wrap'>
                <DialogTitle className='text-base font-bold text-foreground'>
                  {isEditing
                    ? `Ubah ${getItemJenisLabel(activeJenis)}`
                    : `Tambah ${getItemJenisLabel(activeJenis)}`}
                </DialogTitle>
                <Badge
                  variant='outline'
                  className='font-mono text-xs px-2 py-0 border-primary/30 text-primary bg-primary/5'
                >
                  NO: {previewCode}
                </Badge>
              </div>
              <DialogDescription className='text-xs text-muted-foreground mt-0.5'>
                {activeJenis === 'program'
                  ? 'Program kerja utama (Level 1) beserta indikator kinerja dan targetnya.'
                  : activeJenis === 'kegiatan'
                  ? 'Kegiatan operasional (Level 2) yang menginduk pada Program terpilih.'
                  : 'Sub Kegiatan teknis (Level 3) yang menginduk pada Kegiatan terpilih.'}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <Form {...form}>
          <form
            id='operasional-item-form'
            onSubmit={form.handleSubmit(onSubmit)}
            className='flex-1 flex flex-col min-h-0'
          >
            <div className='flex-1 overflow-y-auto px-6 py-5 space-y-4'>
              {/* Parent Banner when adding Sub item (Kegiatan under Program, or Sub-Kegiatan under Kegiatan) */}
              {parentItem && (
                <div className='rounded-lg border bg-muted/30 p-3 text-xs space-y-1'>
                  <span className='text-[10px] font-mono uppercase tracking-wider text-muted-foreground font-semibold'>
                    Induk {parentItem.jenis === 'program' ? 'Program' : 'Kegiatan'}
                  </span>
                  <div className='font-semibold text-foreground flex items-center gap-1.5'>
                    <Badge variant='outline' className='font-mono text-[11px] px-1.5 py-0'>
                      {parentItem.kode}
                    </Badge>
                    <span>{parentItem.nama}</span>
                  </div>
                </div>
              )}

              {/* Nama FormField */}
              <FormField
                control={form.control}
                name='nama'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className='text-xs font-bold'>
                      Nama {getItemJenisLabel(activeJenis)}{' '}
                      <span className='text-destructive'>*</span>
                    </FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder={`Tuliskan nama ${getItemJenisLabel(activeJenis).toLowerCase()}...`}
                        className='text-xs min-h-[75px]'
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Single Indikator & Target Section */}
              <div className='grid grid-cols-1 sm:grid-cols-12 gap-3 pt-3 border-t'>
                <div className='sm:col-span-8'>
                  <FormField
                    control={form.control}
                    name='indikator'
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className='text-xs font-bold'>
                          Indikator Kinerja <span className='text-destructive'>*</span>
                        </FormLabel>
                        <FormControl>
                          <Input
                            placeholder='Contoh: Indeks Kepuasan Layanan Informasi Publik'
                            className='text-xs h-9 bg-background'
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className='sm:col-span-4'>
                  <FormField
                    control={form.control}
                    name='target'
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className='text-xs font-bold'>
                          Target <span className='text-destructive'>*</span>
                        </FormLabel>
                        <FormControl>
                          <Input
                            placeholder='Contoh: 85.50 atau 100%'
                            className='text-xs h-9 font-mono bg-background'
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

            <DialogFooter className='px-6 py-3.5 border-t bg-muted/10 shrink-0 gap-2'>
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
                form='operasional-item-form'
                size='sm'
                disabled={isSubmitting}
                className='text-xs min-w-[120px] gap-1.5'
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className='h-3.5 w-3.5 animate-spin' />
                    <span>Menyimpan...</span>
                  </>
                ) : (
                  <>
                    <Save className='h-3.5 w-3.5' />
                    <span>{isEditing ? 'Simpan Perubahan' : 'Tambahkan'}</span>
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
