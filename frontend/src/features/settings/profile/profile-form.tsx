'use client'

import { useEffect, useState } from 'react'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useQuery } from '@tanstack/react-query'
import { Building2, Loader2, Save, ShieldCheck, User } from 'lucide-react'
import { toast } from 'sonner'
import { isAxiosError } from 'axios'
import { useAuthStore } from '@/stores/auth-store'
import { authService } from '@/services/auth-service'
import { opdService } from '@/services/opd-service'
import { PANGKAT_GOLONGAN_OPTIONS } from '@/features/users/data/pangkat-golongan'
import { Button } from '@/components/ui/button'
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
import { Badge } from '@/components/ui/badge'

const profileSchema = z.object({
  name: z
    .string()
    .min(2, 'Nama lengkap minimal 2 karakter.')
    .max(100, 'Nama lengkap maksimal 100 karakter.'),
  nip: z
    .string()
    .max(30, 'NIP maksimal 30 karakter.')
    .regex(/^[0-9]*$/, 'NIP hanya boleh berisi deretan angka.')
    .optional()
    .or(z.literal('')),
  phone: z
    .string()
    .max(20, 'Nomor telepon maksimal 20 karakter.')
    .optional()
    .or(z.literal('')),
  opd_id: z.string().optional(),
  pangkat_gol: z.string().optional(),
  jabatan: z.string().max(150, 'Jabatan maksimal 150 karakter.').optional(),
})

type ProfileFormValues = z.infer<typeof profileSchema>

export function ProfileForm() {
  const currentUser = useAuthStore((state) => state.auth.user)
  const setUser = useAuthStore((state) => state.auth.setUser)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Fetch dynamic OPDs
  const { data: opds = [], isLoading: isLoadingOpds } = useQuery({
    queryKey: ['opds'],
    queryFn: () => opdService.getOpds(),
    staleTime: 5 * 60 * 1000,
  })

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: currentUser?.name || '',
      nip: currentUser?.nip || '',
      phone: currentUser?.phone || '',
      opd_id: currentUser?.opd_id ? String(currentUser.opd_id) : '',
      pangkat_gol: currentUser?.pangkat_gol || '',
      jabatan: currentUser?.jabatan || '',
    },
    mode: 'onChange',
  })

  useEffect(() => {
    if (currentUser) {
      form.reset({
        name: currentUser.name || '',
        nip: currentUser.nip || '',
        phone: currentUser.phone || '',
        opd_id: currentUser.opd_id ? String(currentUser.opd_id) : '',
        pangkat_gol: currentUser.pangkat_gol || '',
        jabatan: currentUser.jabatan || '',
      })
    }
  }, [currentUser, form])

  async function onSubmit(data: ProfileFormValues) {
    setIsSubmitting(true)
    try {
      const response = await authService.updateProfile({
        name: data.name.trim(),
        nip: data.nip ? data.nip.trim() : null,
        phone: data.phone ? data.phone.trim() : null,
        opd_id: data.opd_id ? Number(data.opd_id) : null,
        pangkat_gol: data.pangkat_gol || null,
        jabatan: data.jabatan ? data.jabatan.trim() : null,
      })

      setUser(response.user)
      toast.success('Profil Berhasil Diperbarui', {
        description: 'Informasi biodata pegawai Anda telah berhasil disimpan.',
      })
    } catch (error) {
      const msg =
        isAxiosError(error) && error.response?.data?.message
          ? error.response.data.message
          : 'Gagal memperbarui profil pegawai.'
      toast.error(msg)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className='space-y-6'>
      {/* Account Overview Header Card */}
      <div className='flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-xl border bg-muted/20'>
        <div className='flex items-center gap-3.5'>
          <div className='flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary font-bold text-base shadow-2xs'>
            {currentUser?.name
              ? currentUser.name
                  .split(' ')
                  .map((n) => n[0])
                  .slice(0, 2)
                  .join('')
                  .toUpperCase()
              : <User className='h-6 w-6' />}
          </div>
          <div>
            <div className='flex items-center gap-2'>
              <h3 className='font-bold text-base text-foreground leading-tight'>
                {currentUser?.name || 'Pegawai Pemda'}
              </h3>
              <Badge variant='outline' className='text-[11px] font-medium'>
                {currentUser?.role || 'Staff'}
              </Badge>
            </div>
            <p className='text-xs text-muted-foreground mt-0.5'>
              {currentUser?.email}
            </p>
          </div>
        </div>

        <div className='flex items-center gap-2'>
          {currentUser?.two_factor_enabled ? (
            <Badge
              variant='outline'
              className='text-xs border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300 gap-1.5 py-1'
            >
              <ShieldCheck className='h-3.5 w-3.5' />
              2FA Aktif
            </Badge>
          ) : (
            <Badge variant='outline' className='text-xs text-muted-foreground border-dashed py-1'>
              2FA Belum Aktif
            </Badge>
          )}
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-5'>
          {/* Nama Lengkap */}
          <FormField
            control={form.control}
            name='name'
            render={({ field }) => (
              <FormItem>
                <FormLabel className='text-xs font-semibold'>
                  Nama Lengkap Beserta Gelar <span className='text-destructive'>*</span>
                </FormLabel>
                <FormControl>
                  <Input
                    placeholder='Contoh: Dr. H. Mulyadi, M.Si'
                    disabled={isSubmitting}
                    {...field}
                  />
                </FormControl>
                <FormDescription className='text-[11px]'>
                  Nama resmi kedinasan sesuai dengan SK pengangkatan atau ijazah terakhir.
                </FormDescription>
                <FormMessage className='text-xs' />
              </FormItem>
            )}
          />

          <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
            {/* Email (Read-Only) */}
            <div className='space-y-2'>
              <label className='text-xs font-semibold text-foreground'>
                Email Resmi Kedinasan
              </label>
              <Input
                value={currentUser?.email || ''}
                disabled
                className='bg-muted/50 cursor-not-allowed text-muted-foreground'
              />
              <p className='text-[11px] text-muted-foreground'>
                Email terdaftar digunakan untuk akses login portal. Hubungi Administrator jika ingin mengubah email.
              </p>
            </div>

            {/* NIP */}
            <FormField
              control={form.control}
              name='nip'
              render={({ field }) => (
                <FormItem>
                  <FormLabel className='text-xs font-semibold'>
                    NIP (Nomor Induk Pegawai)
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder='198501012010011001'
                      maxLength={30}
                      disabled={isSubmitting}
                      {...field}
                    />
                  </FormControl>
                  <FormDescription className='text-[11px]'>
                    18 digit NIP resmi BKN tanpa spasi atau tanda baca.
                  </FormDescription>
                  <FormMessage className='text-xs' />
                </FormItem>
              )}
            />
          </div>

          {/* Instansi / OPD */}
          <FormField
            control={form.control}
            name='opd_id'
            render={({ field }) => (
              <FormItem>
                <FormLabel className='text-xs font-semibold flex items-center gap-1.5'>
                  <Building2 className='h-3.5 w-3.5 text-muted-foreground' />
                  Instansi / Perangkat Daerah (OPD)
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
                            : 'Pilih perangkat daerah unit kerja...'
                        }
                      />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent className='max-h-64'>
                    {opds.map((opd) => (
                      <SelectItem key={opd.id} value={String(opd.id)}>
                        <div className='flex items-center justify-between gap-3'>
                          <span>{opd.nama}</span>
                          <span className='text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded'>
                            {opd.kategori}
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormDescription className='text-[11px]'>
                  Pilih unit kerja dinas, badan, sekretariat, atau kecamatan tempat Anda bertugas.
                </FormDescription>
                <FormMessage className='text-xs' />
              </FormItem>
            )}
          />

          <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
            {/* Jabatan Kedinasan */}
            <FormField
              control={form.control}
              name='jabatan'
              render={({ field }) => (
                <FormItem>
                  <FormLabel className='text-xs font-semibold'>
                    Jabatan Kedinasan
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder='Contoh: Kepala Bidang Aplikasi Informatika'
                      maxLength={150}
                      disabled={isSubmitting}
                      {...field}
                    />
                  </FormControl>
                  <FormDescription className='text-[11px]'>
                    Nama jabatan struktural atau fungsional kedinasan.
                  </FormDescription>
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
                    Pangkat / Golongan Ruang
                  </FormLabel>
                  <Select
                    disabled={isSubmitting}
                    onValueChange={field.onChange}
                    value={field.value}
                  >
                    <FormControl>
                      <SelectTrigger className='w-full'>
                        <SelectValue placeholder='Pilih pangkat / golongan ruang...' />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className='max-h-64'>
                      {PANGKAT_GOLONGAN_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription className='text-[11px]'>
                    Pangkat dan golongan ruang BKN (PNS, PPPK, atau Non-ASN).
                  </FormDescription>
                  <FormMessage className='text-xs' />
                </FormItem>
              )}
            />
          </div>

          {/* Nomor WhatsApp / Telepon */}
          <FormField
            control={form.control}
            name='phone'
            render={({ field }) => (
              <FormItem>
                <FormLabel className='text-xs font-semibold'>
                  Nomor WhatsApp / HP Kontak
                </FormLabel>
                <FormControl>
                  <Input
                    placeholder='081234567890'
                    maxLength={20}
                    disabled={isSubmitting}
                    {...field}
                  />
                </FormControl>
                <FormDescription className='text-[11px]'>
                  Nomor aktif yang dapat dihubungi untuk koordinasi kedinasan.
                </FormDescription>
                <FormMessage className='text-xs' />
              </FormItem>
            )}
          />

          <div className='flex items-center justify-end pt-3 border-t'>
            <Button type='submit' disabled={isSubmitting} className='min-w-[140px]'>
              {isSubmitting ? (
                <>
                  <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                  Menyimpan...
                </>
              ) : (
                <>
                  <Save className='mr-2 h-4 w-4' />
                  Simpan Perubahan
                </>
              )}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  )
}
