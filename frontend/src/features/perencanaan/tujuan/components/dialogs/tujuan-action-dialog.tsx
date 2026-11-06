import { useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { isAxiosError } from 'axios'
import { toast } from 'sonner'
import { useQuery } from '@tanstack/react-query'
import { Flag, Loader2 } from 'lucide-react'
import { masterDataService } from '@/services/master-data-service'
import { opdService } from '@/services/opd-service'
import { perencanaanService } from '@/services/perencanaan-service'
import type { TujuanFormData, TujuanPenilaianItem } from '@/types/perencanaan'
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
import { SearchableSelect } from '@/components/searchable-select'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { useAuthStore } from '@/stores/auth-store'

export const tujuanFormSchema = z.object({
  opd_id: z.string().min(1, 'Perangkat Daerah (OPD) wajib dipilih.'),
  sumber_data_id: z.string().min(1, 'Sumber Data wajib dipilih.'),
  tujuan: z
    .string()
    .min(5, 'Pernyataan tujuan minimal 5 karakter.')
    .max(1000, 'Pernyataan tujuan maksimal 1000 karakter.'),
})

export type TujuanFormValues = z.infer<typeof tujuanFormSchema>

export interface TujuanActionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  currentRow?: TujuanPenilaianItem | null
  defaultOpdId?: string
  onSuccess: () => void
  isOpdRole?: boolean
}

export function TujuanActionDialog({
  open,
  onOpenChange,
  currentRow,
  defaultOpdId,
  onSuccess,
  isOpdRole = false,
}: TujuanActionDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const isEdit = Boolean(currentRow)
  const user = useAuthStore((state) => state.auth.user)
  const effectiveOpdId =
    isOpdRole && user?.opd_id
      ? String(user.opd_id)
      : defaultOpdId && defaultOpdId !== 'all'
      ? defaultOpdId
      : ''

  const { data: opdData, isLoading: isLoadingOpd } = useQuery({
    queryKey: ['opds', 'all-for-tujuan'],
    queryFn: () => opdService.getOpds({ all: true }),
    staleTime: 5 * 60 * 1000,
    enabled: open && !isOpdRole,
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
        opd_id: effectiveOpdId,
        sumber_data_id: defaultSumberId,
        tujuan: '',
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, currentRowId, effectiveOpdId])

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
              {isOpdRole ? (
                <div className='space-y-1.5'>
                  <label className='text-xs font-semibold text-muted-foreground'>
                    Perangkat Daerah (OPD)
                  </label>
                  <Input
                    value={
                      user?.opd?.nama
                        ? `${user.opd.nama} (${user.opd.kode})`
                        : 'Perangkat Daerah Anda'
                    }
                    disabled
                    className='h-9 text-xs bg-muted/60 font-semibold text-foreground'
                  />
                </div>
              ) : (
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
              )}

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
