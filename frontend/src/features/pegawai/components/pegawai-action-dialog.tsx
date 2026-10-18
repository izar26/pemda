'use client'

import { useEffect, useMemo, useState } from 'react'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  AlertTriangle,
  ArrowRightLeft,
  Award,
  Building2,
  CheckCircle2,
  Loader2,
  UserCheck,
  UserPlus,
  Users,
} from 'lucide-react'
import { toast } from 'sonner'
import { isAxiosError } from 'axios'
import { opdService } from '@/services/opd-service'
import { userService } from '@/services/user-service'
import { PANGKAT_GOLONGAN_OPTIONS } from '@/features/users/data/pangkat-golongan'
import { type User } from '@/features/users/data/schema'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { SearchableSelect } from '@/components/searchable-select'
import { Switch } from '@/components/ui/switch'
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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'

const pegawaiFormSchema = z.object({
  name: z
    .string()
    .min(1, 'Nama lengkap beserta gelar wajib diisi.')
    .min(2, 'Nama lengkap minimal 2 karakter.')
    .max(100, 'Maksimal 100 karakter.'),
  email: z
    .string()
    .min(1, 'Email resmi / dinas wajib diisi.')
    .email('Format email dinas tidak valid.')
    .max(100, 'Maksimal 100 karakter.'),
  nip: z
    .string()
    .min(1, 'NIP (Nomor Induk Pegawai) wajib diisi.')
    .max(30, 'NIP maksimal 30 karakter.'),
  phone: z
    .string()
    .min(1, 'Nomor WhatsApp wajib diisi.')
    .max(20, 'Nomor WhatsApp maksimal 20 karakter.'),
  opd_id: z
    .string()
    .min(1, 'Instansi / Perangkat Daerah (OPD) wajib dipilih.'),
  pangkat_gol: z
    .string()
    .min(1, 'Pangkat / Golongan Ruang wajib dipilih.'),
  jabatan: z.enum(['Kepala OPD', 'Pegawai'], {
    message: 'Jabatan wajib dipilih (Kepala OPD atau Pegawai).',
  }),
  replace_kepala: z.boolean(),
})

type PegawaiFormValues = z.infer<typeof pegawaiFormSchema>

interface PegawaiActionDialogProps {
  currentRow?: User | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function PegawaiActionDialog({
  currentRow,
  open,
  onOpenChange,
}: PegawaiActionDialogProps) {
  const isEdit = Boolean(currentRow)
  const queryClient = useQueryClient()
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Fetch dynamic OPDs for the dropdown
  const { data: opds = [], isLoading: isLoadingOpds } = useQuery({
    queryKey: ['opds', 'list'],
    queryFn: () => opdService.getOpds(),
    enabled: open,
    staleTime: 5 * 60 * 1000,
  })

  const opdOptions = useMemo(() => {
    return (Array.isArray(opds) ? opds : []).map((opd) => ({
      value: String(opd.id),
      label: opd.nama,
      group: opd.kategori || 'Perangkat Daerah',
      badge: opd.kategori,
      keywords: [opd.kode, opd.kategori],
    }))
  }, [opds])

  const pangkatOptions = useMemo(() => {
    return PANGKAT_GOLONGAN_OPTIONS.map((opt) => ({
      value: opt.value,
      label: opt.label,
      group: opt.golongan,
      badge: opt.golongan,
      keywords: [opt.golongan],
    }))
  }, [])

  const form = useForm<PegawaiFormValues>({
    resolver: zodResolver(pegawaiFormSchema),
    defaultValues: {
      name: '',
      email: '',
      nip: '',
      phone: '',
      opd_id: '',
      pangkat_gol: '',
      jabatan: 'Pegawai',
      replace_kepala: false,
    },
    mode: 'onChange',
  })

  const watchedOpdId = form.watch('opd_id')
  const watchedJabatan = form.watch('jabatan')
  const watchedReplaceKepala = form.watch('replace_kepala')

  // Check if selected OPD already has a Kepala OPD
  const { data: kepalaCheck, isLoading: isCheckingKepala } = useQuery({
    queryKey: ['pegawai', 'check-kepala', watchedOpdId, currentRow?.id],
    queryFn: () => userService.checkKepalaOpd(watchedOpdId, currentRow?.id),
    enabled: open && Boolean(watchedOpdId) && watchedJabatan === 'Kepala OPD',
    staleTime: 0,
  })

  const hasExistingKepala = Boolean(
    watchedJabatan === 'Kepala OPD' &&
      watchedOpdId &&
      kepalaCheck?.has_kepala &&
      kepalaCheck?.kepala
  )

  const requiresHandoverConfirmation =
    hasExistingKepala && !watchedReplaceKepala

  // Detect OPD mutation when editing
  const isMutatingOpd =
    isEdit &&
    Boolean(currentRow?.opd_id) &&
    Boolean(watchedOpdId) &&
    String(currentRow?.opd_id) !== String(watchedOpdId)

  // Reset replace_kepala when OPD or Jabatan changes
  useEffect(() => {
    form.setValue('replace_kepala', false)
  }, [watchedOpdId, watchedJabatan, form])

  useEffect(() => {
    if (open) {
      if (currentRow) {
        const normalizedJabatan =
          currentRow.jabatan === 'Kepala OPD' ? 'Kepala OPD' : 'Pegawai'
        form.reset({
          name: currentRow.name,
          email: currentRow.email,
          nip: currentRow.nip || '',
          phone: currentRow.phone || '',
          opd_id: currentRow.opd_id ? String(currentRow.opd_id) : '',
          pangkat_gol: currentRow.pangkat_gol || '',
          jabatan: normalizedJabatan,
          replace_kepala: false,
        })
      } else {
        form.reset({
          name: '',
          email: '',
          nip: '',
          phone: '',
          opd_id: '',
          pangkat_gol: '',
          jabatan: 'Pegawai',
          replace_kepala: false,
        })
      }
    }
  }, [open, currentRow, form])

  async function onSubmit(data: PegawaiFormValues) {
    if (requiresHandoverConfirmation) {
      toast.error(
        'Silakan aktifkan konfirmasi pergantian Kepala OPD terlebih dahulu.'
      )
      return
    }

    setIsSubmitting(true)
    try {
      const payload = {
        name: data.name.trim(),
        email: data.email.trim(),
        nip: data.nip.trim(),
        phone: data.phone.trim(),
        opd_id: data.opd_id,
        pangkat_gol: data.pangkat_gol,
        jabatan: data.jabatan,
        replace_kepala: data.replace_kepala,
      }

      if (isEdit && currentRow) {
        await userService.updatePegawai(currentRow.id, payload)
        toast.success(`Data pegawai "${data.name}" berhasil diperbarui.`)
      } else {
        await userService.createPegawai(payload)
        toast.success(`Pegawai "${data.name}" berhasil ditambahkan.`)
      }

      queryClient.invalidateQueries({ queryKey: ['pegawai'] })
      queryClient.invalidateQueries({ queryKey: ['opds'] })
      queryClient.invalidateQueries({ queryKey: ['user-accounts'] })
      queryClient.invalidateQueries({ queryKey: ['users'] })
      onOpenChange(false)
    } catch (error) {
      if (isAxiosError(error) && error.response?.data) {
        const errorData = error.response.data as {
          message?: string
          errors?: Record<string, string[]>
        }
        const firstFieldError = errorData.errors
          ? Object.values(errorData.errors)[0]?.[0]
          : undefined
        toast.error(
          firstFieldError ||
            errorData.message ||
            'Terjadi kesalahan saat menyimpan data pegawai.'
        )
      } else {
        toast.error('Terjadi kesalahan saat menyimpan data pegawai.')
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
              {isEdit ? (
                <UserCheck className='h-5 w-5' />
              ) : (
                <UserPlus className='h-5 w-5' />
              )}
            </div>
            <div>
              <DialogTitle className='text-lg font-bold text-foreground'>
                {isEdit
                  ? `Edit Data Pegawai: ${currentRow?.name}`
                  : 'Tambah Data Pegawai'}
              </DialogTitle>
              <DialogDescription className='text-xs text-muted-foreground mt-0.5'>
                {isEdit
                  ? 'Perbarui biodata pegawai, penugasan OPD, atau jabatan kedinasan.'
                  : 'Tambahkan biodata pegawai resmi ke direktori perangkat daerah.'}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className='flex-1 overflow-y-auto px-6 py-4 min-h-0'>
          <Form {...form}>
            <form
              id='pegawai-dialog-form'
              onSubmit={form.handleSubmit(onSubmit)}
              className='space-y-4'
            >
              {/* Instansi / OPD */}
              <FormField
                control={form.control}
                name='opd_id'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className='text-xs font-semibold flex items-center gap-1.5'>
                      <Building2 className='h-3.5 w-3.5 text-muted-foreground' />
                      Instansi / Perangkat Daerah (OPD){' '}
                      <span className='text-destructive'>*</span>
                    </FormLabel>
                    <FormControl>
                      <SearchableSelect
                        disabled={isSubmitting || isLoadingOpds}
                        value={field.value}
                        onValueChange={field.onChange}
                        options={opdOptions}
                        placeholder={
                          isLoadingOpds
                            ? 'Memuat daftar OPD...'
                            : 'Pilih perangkat daerah...'
                        }
                        searchPlaceholder='Cari nama atau singkatan OPD (misal: Disdik, Setda, Bappeda)...'
                        emptyMessage='Tidak ada perangkat daerah yang cocok.'
                      />
                    </FormControl>
                    {isMutatingOpd && (
                      <div className='flex items-center gap-1.5 text-[11px] text-blue-600 dark:text-blue-400 bg-blue-500/10 border border-blue-500/20 rounded-md px-2.5 py-1.5 mt-1'>
                        <ArrowRightLeft className='h-3.5 w-3.5 shrink-0' />
                        <span>
                          Mutasi Instansi: Pegawai akan dipindahkan dari{' '}
                          <strong>{currentRow?.opd?.nama}</strong> ke OPD baru.
                        </span>
                      </div>
                    )}
                    <FormMessage className='text-xs' />
                  </FormItem>
                )}
              />

              {/* Jabatan (Strictly 2 Options: Pegawai | Kepala OPD) */}
              <FormField
                control={form.control}
                name='jabatan'
                render={({ field }) => (
                  <FormItem className='space-y-2'>
                    <FormLabel className='text-xs font-semibold'>
                      Jabatan Kedinasan <span className='text-destructive'>*</span>
                    </FormLabel>
                    <FormControl>
                      <RadioGroup
                        onValueChange={field.onChange}
                        value={field.value}
                        className='grid grid-cols-2 gap-3'
                      >
                        <FormItem className='flex items-center space-x-2.5 space-y-0 rounded-lg border p-3 text-xs font-medium cursor-pointer transition-colors [&:has([data-state=checked])]:border-primary [&:has([data-state=checked])]:bg-primary/5'>
                          <FormControl>
                            <RadioGroupItem value='Pegawai' />
                          </FormControl>
                          <div className='flex items-center gap-2 cursor-pointer'>
                            <Users className='h-4 w-4 text-muted-foreground' />
                            <div>
                              <FormLabel className='font-semibold cursor-pointer text-xs block'>
                                Pegawai
                              </FormLabel>
                              <span className='text-[10px] text-muted-foreground font-normal'>
                                Staf / Pejabat Pelaksana OPD
                              </span>
                            </div>
                          </div>
                        </FormItem>

                        <FormItem className='flex items-center space-x-2.5 space-y-0 rounded-lg border p-3 text-xs font-medium cursor-pointer transition-colors [&:has([data-state=checked])]:border-amber-500 [&:has([data-state=checked])]:bg-amber-500/5'>
                          <FormControl>
                            <RadioGroupItem value='Kepala OPD' />
                          </FormControl>
                          <div className='flex items-center gap-2 cursor-pointer'>
                            <Award className='h-4 w-4 text-amber-600 dark:text-amber-400' />
                            <div>
                              <FormLabel className='font-semibold cursor-pointer text-xs block'>
                                Kepala OPD
                              </FormLabel>
                              <span className='text-[10px] text-muted-foreground font-normal'>
                                Pimpinan Perangkat Daerah (Maks. 1)
                              </span>
                            </div>
                          </div>
                        </FormItem>
                      </RadioGroup>
                    </FormControl>
                    <FormMessage className='text-xs' />
                  </FormItem>
                )}
              />

              {/* Interactive Validation & Handover Mechanism for Kepala OPD */}
              {watchedJabatan === 'Kepala OPD' && watchedOpdId && (
                <div className='rounded-lg border p-3 text-xs transition-all'>
                  {isCheckingKepala ? (
                    <div className='flex items-center gap-2 text-muted-foreground'>
                      <Loader2 className='h-4 w-4 animate-spin' />
                      <span>Memeriksa status Kepala OPD pada instansi terpilih...</span>
                    </div>
                  ) : hasExistingKepala && kepalaCheck?.kepala ? (
                    <div className='space-y-3'>
                      <div className='flex items-start gap-2.5 text-amber-800 dark:text-amber-300'>
                        <AlertTriangle className='h-4 w-4 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400' />
                        <div className='space-y-1'>
                          <p className='font-semibold text-xs'>
                            Instansi ini sudah memiliki Kepala OPD aktif
                          </p>
                          <p className='text-[11px] leading-relaxed text-muted-foreground'>
                            Saat ini jabatan Kepala OPD dipegang oleh{' '}
                            <strong className='text-foreground'>
                              {kepalaCheck.kepala.name}
                            </strong>{' '}
                            (NIP. {kepalaCheck.kepala.nip}). Setiap perangkat daerah hanya
                            boleh memiliki 1 Kepala OPD.
                          </p>
                        </div>
                      </div>

                      <FormField
                        control={form.control}
                        name='replace_kepala'
                        render={({ field }) => (
                          <FormItem className='flex flex-row items-center justify-between rounded-md border border-amber-500/30 bg-amber-500/10 p-2.5 space-y-0'>
                            <div className='space-y-0.5 pr-3'>
                              <FormLabel className='text-xs font-semibold text-amber-900 dark:text-amber-200 cursor-pointer'>
                                Gantikan Pejabat Kepala OPD Saat Ini
                              </FormLabel>
                              <p className='text-[11px] text-amber-800/80 dark:text-amber-300/80'>
                                Otomatis mengubah jabatan{' '}
                                <strong>{kepalaCheck.kepala?.name}</strong> menjadi{' '}
                                <strong>Pegawai</strong> dan menyinkronkan data Perangkat
                                Daerah.
                              </p>
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
                  ) : (
                    <div className='flex items-center gap-2 text-emerald-700 dark:text-emerald-400'>
                      <CheckCircle2 className='h-4 w-4 shrink-0' />
                      <span className='text-[11px]'>
                        Jabatan <strong>Kepala OPD</strong> tersedia untuk instansi ini dan
                        akan otomatis disinkronkan ke menu Perangkat Daerah.
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Nama Lengkap */}
              <FormField
                control={form.control}
                name='name'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className='text-xs font-semibold'>
                      Nama Lengkap Beserta Gelar{' '}
                      <span className='text-destructive'>*</span>
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder='Contoh: Dr. H. Ahmad Sudrajat, M.Si'
                        disabled={isSubmitting}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage className='text-xs' />
                  </FormItem>
                )}
              />

              <div className='grid grid-cols-1 sm:grid-cols-2 gap-3'>
                {/* NIP */}
                <FormField
                  control={form.control}
                  name='nip'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className='text-xs font-semibold'>
                        NIP (Nomor Induk Pegawai){' '}
                        <span className='text-destructive'>*</span>
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder='198503152010011002'
                          maxLength={30}
                          disabled={isSubmitting}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage className='text-xs' />
                    </FormItem>
                  )}
                />

                {/* Pangkat / Golongan */}
                <FormField
                  control={form.control}
                  name='pangkat_gol'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className='text-xs font-semibold'>
                        Pangkat / Golongan Ruang{' '}
                        <span className='text-destructive'>*</span>
                      </FormLabel>
                      <FormControl>
                        <SearchableSelect
                          disabled={isSubmitting}
                          value={field.value}
                          onValueChange={field.onChange}
                          options={pangkatOptions}
                          placeholder='Pilih pangkat / golongan...'
                          searchPlaceholder='Cari nama pangkat atau ruang (misal: Pembina, III/a)...'
                          emptyMessage='Tidak ada pangkat yang cocok.'
                        />
                      </FormControl>
                      <FormMessage className='text-xs' />
                    </FormItem>
                  )}
                />
              </div>

              <div className='grid grid-cols-1 sm:grid-cols-2 gap-3'>
                {/* Email Dinas */}
                <FormField
                  control={form.control}
                  name='email'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className='text-xs font-semibold'>
                        Email Resmi / Dinas{' '}
                        <span className='text-destructive'>*</span>
                      </FormLabel>
                      <FormControl>
                        <Input
                          type='email'
                          placeholder='ahmad.sudrajat@pemda.go.id'
                          disabled={isSubmitting}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage className='text-xs' />
                    </FormItem>
                  )}
                />

                {/* No WhatsApp Unik */}
                <FormField
                  control={form.control}
                  name='phone'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className='text-xs font-semibold'>
                        No. WhatsApp{' '}
                        <span className='text-destructive'>*</span>
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder='081234567890'
                          maxLength={20}
                          disabled={isSubmitting}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage className='text-xs' />
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
            form='pegawai-dialog-form'
            disabled={isSubmitting || isCheckingKepala || requiresHandoverConfirmation}
            className={cn('min-w-[130px]')}
          >
            {isSubmitting ? (
              <>
                <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                Menyimpan...
              </>
            ) : isEdit ? (
              'Simpan Perubahan'
            ) : (
              'Tambah Pegawai'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
