'use client'

import { useEffect, useState } from 'react'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useQuery } from '@tanstack/react-query'
import { Building2, Database, Loader2, Save } from 'lucide-react'
import { toast } from 'sonner'
import { isAxiosError } from 'axios'
import { masterDataService } from '@/services/master-data-service'
import { opdService } from '@/services/opd-service'
import type {
  MasterDataBaseItem,
  MasterDataPayload,
  MasterEntityMeta,
  MasterSubUnsurSpipItem,
} from '@/types/master-data'
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
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

const formSchema = z.object({
  nama: z.string().min(1, 'Nama wajib diisi.').max(255, 'Maksimal 255 karakter.'),
  kode: z.string().max(20, 'Kode maksimal 20 karakter.').optional(),
  nomor: z.string().max(10, 'Nomor maksimal 10 karakter.').optional(),
  deskripsi: z.string().optional(),
  urutan: z.number().min(0, 'Urutan minimal 0.'),
  is_active: z.boolean(),
  opd_id: z.string().optional(),
})

type FormValues = z.infer<typeof formSchema>

interface MasterActionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  entity: MasterEntityMeta
  currentItem?: MasterDataBaseItem | MasterSubUnsurSpipItem | null
  unsurSpipId?: number
  onSuccess: () => void
}

export function MasterActionDialog({
  open,
  onOpenChange,
  entity,
  currentItem,
  unsurSpipId,
  onSuccess,
}: MasterActionDialogProps) {
  const isEdit = Boolean(currentItem)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Fetch OPDs only if entity is entitas-penilaian
  const { data: opds = [], isLoading: isLoadingOpds } = useQuery({
    queryKey: ['opds'],
    queryFn: () => opdService.getOpds(),
    enabled: open && entity.key === 'entitas-penilaian',
    staleTime: 5 * 60 * 1000,
  })

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema) as any,
    defaultValues: {
      nama: '',
      kode: '',
      nomor: '',
      deskripsi: '',
      urutan: 0,
      is_active: true,
      opd_id: '',
    },
  })

  useEffect(() => {
    if (open) {
      if (currentItem) {
        const itemAny = currentItem as unknown as Record<string, unknown>
        const descVal =
          (itemAny.definisi as string) || (itemAny.deskripsi as string) || ''

        form.reset({
          nama: currentItem.nama || '',
          kode: (itemAny.kode as string) || '',
          nomor: (itemAny.nomor as string) || '',
          deskripsi: descVal,
          urutan: currentItem.urutan ?? 0,
          is_active: currentItem.is_active ?? true,
          opd_id: itemAny.opd_id ? String(itemAny.opd_id) : '',
        })
      } else {
        form.reset({
          nama: '',
          kode: '',
          nomor: '',
          deskripsi: '',
          urutan: 0,
          is_active: true,
          opd_id: '',
        })
      }
    }
  }, [open, currentItem, form])

  async function onSubmit(values: FormValues) {
    setIsSubmitting(true)
    try {
      const payload: Record<string, unknown> = {
        nama: values.nama.trim(),
        urutan: values.urutan,
        is_active: values.is_active,
      }

      if (entity.hasCode && values.kode) {
        payload.kode = values.kode.trim()
      }

      if (entity.key === 'unsur-spip' && values.nomor) {
        payload.nomor = values.nomor.trim()
      }

      if (entity.key === 'sub-unsur-spip' && unsurSpipId) {
        payload.unsur_spip_id = unsurSpipId
      }

      if (entity.descField && values.deskripsi) {
        payload[entity.descField] = values.deskripsi.trim()
      }

      if (entity.key === 'entitas-penilaian') {
        payload.opd_id = values.opd_id ? Number(values.opd_id) : null
      }

      const typedPayload = payload as unknown as MasterDataPayload

      if (isEdit && currentItem) {
        await masterDataService.updateItem(entity.key, currentItem.id, typedPayload)
        toast.success(`Data ${entity.label} berhasil diperbarui.`)
      } else {
        await masterDataService.createItem(entity.key, typedPayload)
        toast.success(`Data ${entity.label} baru berhasil ditambahkan.`)
      }

      onSuccess()
      onOpenChange(false)
    } catch (error) {
      const msg =
        isAxiosError(error) && error.response?.data?.message
          ? error.response.data.message
          : 'Terjadi kesalahan saat menyimpan data master.'
      toast.error(msg)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-lg max-h-[85vh] flex flex-col p-0 gap-0 overflow-hidden shadow-2xl'>
        <DialogHeader className='px-6 pt-5 pb-4 border-b bg-muted/10 shrink-0 text-start'>
          <div className='flex items-center gap-3'>
            <div className='flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary'>
              <Database className='h-5 w-5' />
            </div>
            <div>
              <DialogTitle className='text-base font-bold text-foreground'>
                {isEdit ? `Edit: ${entity.label}` : `Tambah ${entity.label}`}
              </DialogTitle>
              <DialogDescription className='text-xs text-muted-foreground mt-0.5'>
                {isEdit
                  ? `Perbarui informasi entri ${entity.label}.`
                  : `Tambahkan entri referensi baru untuk ${entity.label}.`}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className='flex-1 overflow-y-auto px-6 py-4 min-h-0'>
          <Form {...form}>
            <form
              id='master-action-form'
              onSubmit={form.handleSubmit(onSubmit)}
              className='space-y-4'
            >
              {/* Kode / Nomor Field if applicable */}
              {entity.hasCode && (
                <FormField
                  control={form.control}
                  name='kode'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className='text-xs font-semibold'>
                        Kode Referensi <span className='text-destructive'>*</span>
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder='Contoh: RP, RS, ROO, atau nomor urut'
                          maxLength={20}
                          disabled={isSubmitting}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage className='text-xs' />
                    </FormItem>
                  )}
                />
              )}

              {entity.key === 'unsur-spip' && (
                <FormField
                  control={form.control}
                  name='nomor'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className='text-xs font-semibold'>
                        Nomor Unsur <span className='text-destructive'>*</span>
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder='Contoh: 1, 2, 3'
                          maxLength={10}
                          disabled={isSubmitting}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage className='text-xs' />
                    </FormItem>
                  )}
                />
              )}

              {/* Nama Field */}
              <FormField
                control={form.control}
                name='nama'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className='text-xs font-semibold'>
                      Nama {entity.label} <span className='text-destructive'>*</span>
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder={`Masukkan nama ${entity.label.toLowerCase()}...`}
                        maxLength={255}
                        disabled={isSubmitting}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage className='text-xs' />
                  </FormItem>
                )}
              />

              {/* Entitas Penilaian: OPD Mapping */}
              {entity.key === 'entitas-penilaian' && (
                <FormField
                  control={form.control}
                  name='opd_id'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className='text-xs font-semibold flex items-center gap-1.5'>
                        <Building2 className='h-3.5 w-3.5 text-muted-foreground' />
                        Tautkan ke Perangkat Daerah / OPD (Opsional)
                      </FormLabel>
                      <Select
                        disabled={isSubmitting || isLoadingOpds}
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger className='w-full'>
                            <SelectValue
                              placeholder={
                                isLoadingOpds
                                  ? 'Memuat daftar OPD...'
                                  : 'Pilih OPD terkait...'
                              }
                            />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className='max-h-60'>
                          <SelectItem value=''>-- Tanpa Relasi OPD --</SelectItem>
                          {opds.map((opd) => (
                            <SelectItem key={opd.id} value={String(opd.id)}>
                              <div className='flex items-center justify-between gap-2'>
                                <span>{opd.nama}</span>
                                <span className='text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded'>
                                  {opd.kategori}
                                </span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage className='text-xs' />
                    </FormItem>
                  )}
                />
              )}

              {/* Definisi / Deskripsi */}
              {entity.descField && (
                <FormField
                  control={form.control}
                  name='deskripsi'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className='text-xs font-semibold'>
                        {entity.descLabel || 'Deskripsi / Keterangan'}
                      </FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder={`Penjelasan rinci mengenai ${entity.label.toLowerCase()}...`}
                          rows={3}
                          className='resize-none text-xs'
                          disabled={isSubmitting}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage className='text-xs' />
                    </FormItem>
                  )}
                />
              )}

              <div className='grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1'>
                {/* Urutan */}
                <FormField
                  control={form.control}
                  name='urutan'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className='text-xs font-semibold'>
                        Urutan Tampilan
                      </FormLabel>
                      <FormControl>
                        <Input
                          type='number'
                          min={0}
                          disabled={isSubmitting}
                          value={field.value ?? 0}
                          onChange={(e) =>
                            field.onChange(
                              e.target.value === '' ? 0 : Number(e.target.value)
                            )
                          }
                        />
                      </FormControl>
                      <FormDescription className='text-[11px]'>
                        Angka untuk mengurutkan posisi entri.
                      </FormDescription>
                      <FormMessage className='text-xs' />
                    </FormItem>
                  )}
                />

                {/* Status Aktif */}
                <FormField
                  control={form.control}
                  name='is_active'
                  render={({ field }) => (
                    <FormItem className='flex flex-row items-center justify-between rounded-lg border p-3 shadow-2xs mt-auto'>
                      <div className='space-y-0.5'>
                        <FormLabel className='text-xs font-semibold'>
                          Status Aktif
                        </FormLabel>
                        <FormDescription className='text-[11px]'>
                          {field.value
                            ? 'Aktif digunakan'
                            : 'Dinonaktifkan'}
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
            form='master-action-form'
            disabled={isSubmitting}
            className='min-w-[120px]'
          >
            {isSubmitting ? (
              <>
                <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                Menyimpan...
              </>
            ) : (
              <>
                <Save className='mr-2 h-4 w-4' />
                {isEdit ? 'Simpan Perubahan' : 'Tambah Data'}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
