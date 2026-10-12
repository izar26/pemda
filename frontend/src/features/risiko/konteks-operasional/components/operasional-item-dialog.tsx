import { useEffect, useState } from 'react'
import { useFieldArray, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { isAxiosError } from 'axios'
import { toast } from 'sonner'
import {
  FolderTree,
  Loader2,
  Plus,
  Sparkles,
  Trash2,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'

const itemFormSchema = z.object({
  jenis: z.enum(['program', 'kegiatan', 'sub_kegiatan']),
  parent_id: z.string().nullable().optional(),
  kode: z.string().min(1, 'Kode harus diisi.').max(50, 'Kode maksimal 50 karakter.'),
  nama: z.string().min(3, 'Nama harus diisi minimal 3 karakter.'),
  urutan: z.number().int().min(1).optional(),
  indikators: z.array(
    z.object({
      id: z.string().optional(),
      indikator: z.string().min(1, 'Nama indikator harus diisi.'),
      target: z.string().min(1, 'Target harus diisi.').max(100),
      satuan: z.string().max(50).optional().nullable(),
      urutan: z.number().int().min(1).optional(),
    })
  ).optional(),
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

  const defaultJenis = editingItem ? editingItem.jenis : targetJenis

  const form = useForm<ItemFormValues>({
    resolver: zodResolver(itemFormSchema),
    defaultValues: {
      jenis: defaultJenis,
      parent_id: null,
      kode: '',
      nama: '',
      urutan: 1,
      indikators: [],
    },
  })

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'indikators',
  })

  const watchedJenis = form.watch('jenis')

  // Prepare list of possible parents based on selected `jenis`
  // If jenis === 'kegiatan' -> parent must be a program
  // If jenis === 'sub_kegiatan' -> parent must be a kegiatan
  const availableParents = (() => {
    if (watchedJenis === 'kegiatan') {
      return programsList.map((p) => ({
        id: p.id,
        label: `${p.kode} - ${p.nama}`,
      }))
    }
    if (watchedJenis === 'sub_kegiatan') {
      const kegiatans: { id: string; label: string }[] = []
      programsList.forEach((prog) => {
        prog.children?.forEach((keg) => {
          kegiatans.push({
            id: keg.id,
            label: `[${prog.kode}] ${keg.kode} - ${keg.nama}`,
          })
        })
      })
      return kegiatans
    }
    return []
  })()

  // Reset form when opening or item changes
  useEffect(() => {
    if (open) {
      if (editingItem) {
        form.reset({
          jenis: editingItem.jenis,
          parent_id: editingItem.parent_id,
          kode: editingItem.kode,
          nama: editingItem.nama,
          urutan: editingItem.urutan || 1,
          indikators: editingItem.indikators?.map((ind, idx) => ({
            id: ind.id,
            indikator: ind.indikator,
            target: ind.target,
            satuan: ind.satuan || '',
            urutan: ind.urutan || idx + 1,
          })) || [],
        })
      } else {
        const initialParentId = parentItem?.id || null
        form.reset({
          jenis: targetJenis,
          parent_id: initialParentId,
          kode: '',
          nama: '',
          urutan: 1,
          indikators: [
            {
              indikator: '',
              target: '1',
              satuan: 'Dokumen',
              urutan: 1,
            },
          ],
        })
      }
    }
  }, [open, editingItem, parentItem, targetJenis, form])

  async function onSubmit(values: ItemFormValues) {
    setIsSubmitting(true)
    try {
      const payload: KonteksOperasionalItemFormData = {
        jenis: values.jenis,
        parent_id: values.jenis === 'program' ? null : values.parent_id || null,
        kode: values.kode.trim(),
        nama: values.nama.trim(),
        urutan: values.urutan,
        indikators: values.indikators?.map((ind, idx) => ({
          id: ind.id,
          indikator: ind.indikator.trim(),
          target: ind.target.trim(),
          satuan: ind.satuan?.trim() || null,
          urutan: ind.urutan || idx + 1,
        })),
      }

      if (editingItem) {
        await risikoService.updateKonteksOperasionalItem(konteksId, editingItem.id, payload)
        toast.success(`Data ${getItemJenisLabel(values.jenis)} berhasil diperbarui.`)
      } else {
        await risikoService.saveKonteksOperasionalItem(konteksId, payload)
        toast.success(`Data ${getItemJenisLabel(values.jenis)} berhasil ditambahkan.`)
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

  function getItemJenisLabel(jenis: KonteksOperasionalItemJenis): string {
    switch (jenis) {
      case 'program':
        return 'Program'
      case 'kegiatan':
        return 'Kegiatan'
      case 'sub_kegiatan':
        return 'Sub-Kegiatan'
      default:
        return 'Item'
    }
  }

  const isEditing = Boolean(editingItem)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-2xl max-h-[90vh] overflow-y-auto'>
        <DialogHeader>
          <div className='flex items-center gap-2'>
            <div className='flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary'>
              <FolderTree className='h-5 w-5' />
            </div>
            <div>
              <DialogTitle className='text-base font-bold'>
                {isEditing
                  ? `Ubah ${getItemJenisLabel(editingItem!.jenis)}`
                  : `Tambah ${getItemJenisLabel(targetJenis)} Baru`}
              </DialogTitle>
              <DialogDescription className='text-xs'>
                Formulir 2C: Pohon Operasional Program, Kegiatan, dan Sub-Kegiatan beserta Indikator & Target
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-4 pt-2'>
            {/* Tingkatan / Jenis Item */}
            <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
              <FormField
                control={form.control}
                name='jenis'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className='text-xs font-semibold'>Tingkatan Hirarki</FormLabel>
                    <Select
                      onValueChange={(val) => {
                        field.onChange(val)
                        if (val === 'program') {
                          form.setValue('parent_id', null)
                        }
                      }}
                      value={field.value}
                      disabled={isEditing || Boolean(parentItem)}
                    >
                      <FormControl>
                        <SelectTrigger className='text-xs h-9'>
                          <SelectValue placeholder='Pilih tingkatan...' />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value='program' className='text-xs'>
                          Level 1 - Program
                        </SelectItem>
                        <SelectItem value='kegiatan' className='text-xs'>
                          Level 2 - Kegiatan
                        </SelectItem>
                        <SelectItem value='sub_kegiatan' className='text-xs'>
                          Level 3 - Sub-Kegiatan
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Parent Selector if not program */}
              {watchedJenis !== 'program' && (
                <FormField
                  control={form.control}
                  name='parent_id'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className='text-xs font-semibold'>
                        Induk ({watchedJenis === 'kegiatan' ? 'Program' : 'Kegiatan'})
                      </FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value || ''}
                        disabled={Boolean(parentItem)}
                      >
                        <FormControl>
                          <SelectTrigger className='text-xs h-9'>
                            <SelectValue
                              placeholder={`Pilih ${
                                watchedJenis === 'kegiatan' ? 'Program' : 'Kegiatan'
                              } Induk...`}
                            />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className='max-h-56'>
                          {availableParents.map((p) => (
                            <SelectItem key={p.id} value={p.id} className='text-xs'>
                              {p.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </div>

            {/* Kode & Nama */}
            <div className='grid grid-cols-1 sm:grid-cols-4 gap-3'>
              <div className='sm:col-span-1'>
                <FormField
                  control={form.control}
                  name='kode'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className='text-xs font-semibold'>Kode</FormLabel>
                      <FormControl>
                        <Input
                          placeholder={
                            watchedJenis === 'program'
                              ? '01'
                              : watchedJenis === 'kegiatan'
                              ? '01.2.01'
                              : '01.2.01.2.01'
                          }
                          className='text-xs font-mono h-9'
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className='sm:col-span-3'>
                <FormField
                  control={form.control}
                  name='nama'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className='text-xs font-semibold'>
                        Nama {getItemJenisLabel(watchedJenis)}
                      </FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder={`Tuliskan nama lengkap ${getItemJenisLabel(watchedJenis).toLowerCase()}...`}
                          className='text-xs min-h-[50px] resize-none'
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Indikator & Target Kinerja Section */}
            <div className='space-y-3 pt-2 border-t'>
              <div className='flex items-center justify-between'>
                <div>
                  <h4 className='text-xs font-bold text-foreground uppercase tracking-wide'>
                    Indikator Kinerja & Target (Kolom 5 & 6)
                  </h4>
                  <p className='text-[11px] text-muted-foreground'>
                    Dapat ditambahkan lebih dari 1 indikator kinerja untuk item ini bila diperlukan.
                  </p>
                </div>
                <Button
                  type='button'
                  variant='outline'
                  size='sm'
                  onClick={() =>
                    append({
                      indikator: '',
                      target: '1',
                      satuan: '',
                      urutan: fields.length + 1,
                    })
                  }
                  className='h-7 text-xs gap-1'
                >
                  <Plus className='h-3 w-3' />
                  <span>Tambah Indikator</span>
                </Button>
              </div>

              {fields.length === 0 ? (
                <div className='p-4 text-center rounded-lg border border-dashed text-xs text-muted-foreground'>
                  Belum ada indikator yang ditambahkan untuk item ini.
                </div>
              ) : (
                <div className='space-y-2.5'>
                  {fields.map((field, index) => (
                    <div
                      key={field.id}
                      className='p-3 rounded-lg border bg-card/60 space-y-2 relative group'
                    >
                      <div className='flex items-center justify-between'>
                        <Badge variant='outline' className='text-[10px] font-mono'>
                          Indikator #{index + 1}
                        </Badge>
                        <Button
                          type='button'
                          variant='ghost'
                          size='icon'
                          onClick={() => remove(index)}
                          className='h-6 w-6 text-muted-foreground hover:text-destructive'
                        >
                          <Trash2 className='h-3.5 w-3.5' />
                        </Button>
                      </div>

                      <div className='grid grid-cols-1 sm:grid-cols-12 gap-2'>
                        <div className='sm:col-span-6'>
                          <FormField
                            control={form.control}
                            name={`indikators.${index}.indikator`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className='text-[11px] font-medium'>
                                  Nama Indikator Kinerja
                                </FormLabel>
                                <FormControl>
                                  <Input
                                    placeholder='e.g. Jumlah Dokumen Perencanaan yang Disusun'
                                    className='text-xs h-8'
                                    {...field}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        <div className='sm:col-span-3'>
                          <FormField
                            control={form.control}
                            name={`indikators.${index}.target`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className='text-[11px] font-medium'>
                                  Nilai Target
                                </FormLabel>
                                <FormControl>
                                  <Input
                                    placeholder='e.g. 1 / 100'
                                    className='text-xs h-8'
                                    {...field}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        <div className='sm:col-span-3'>
                          <FormField
                            control={form.control}
                            name={`indikators.${index}.satuan`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className='text-[11px] font-medium'>
                                  Satuan Target
                                </FormLabel>
                                <FormControl>
                                  <Input
                                    placeholder='e.g. Dokumen / %'
                                    className='text-xs h-8'
                                    value={field.value || ''}
                                    onChange={field.onChange}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
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
                <span>{isEditing ? 'Simpan Perubahan' : 'Tambahkan Item'}</span>
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
