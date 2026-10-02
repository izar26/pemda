import { useMemo, useState } from 'react'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useNavigate } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import {
  ArrowRight,
  Building2,
  Check,
  CheckCircle2,
  Copy,
  Info,
  Loader2,
  LockKeyhole,
  Sparkles,
  User,
  X,
} from 'lucide-react'
import { toast } from 'sonner'
import { isAxiosError } from 'axios'
import { cn } from '@/lib/utils'
import { authService } from '@/services/auth-service'
import { opdService } from '@/services/opd-service'
import { PANGKAT_GOLONGAN_OPTIONS } from '@/features/users/data/pangkat-golongan'
import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { PasswordInput } from '@/components/password-input'
import { SearchableSelect } from '@/components/searchable-select'
import { Badge } from '@/components/ui/badge'

const activateSchema = z
  .object({
    name: z.string().min(2, 'Nama lengkap minimal 2 karakter.').max(100),
    nip: z
      .string()
      .max(30, 'NIP maksimal 30 karakter.')
      .regex(/^[0-9]*$/, 'NIP hanya boleh berisi deretan angka.')
      .optional()
      .or(z.literal('')),
    opd_id: z.string().optional(),
    jabatan: z.string().max(150, 'Jabatan maksimal 150 karakter.').optional(),
    pangkat_gol: z.string().optional(),
    phone: z
      .string()
      .max(20, 'Nomor telepon maksimal 20 karakter.')
      .optional()
      .or(z.literal('')),
    password: z
      .string()
      .min(8, 'Kata sandi minimal 8 karakter.')
      .regex(/[a-z]/, 'Wajib mengandung huruf kecil (a-z).')
      .regex(/[A-Z]/, 'Wajib mengandung huruf besar (A-Z).')
      .regex(/[0-9]/, 'Wajib mengandung angka (0-9).')
      .regex(/[^a-zA-Z0-9]/, 'Wajib mengandung karakter simbol (!@#$%^&*).'),
    password_confirmation: z
      .string()
      .min(1, 'Konfirmasi kata sandi wajib diisi.'),
  })
  .refine((data) => data.password === data.password_confirmation, {
    message: 'Konfirmasi kata sandi tidak cocok.',
    path: ['password_confirmation'],
  })

type ActivateFormValues = z.infer<typeof activateSchema>

interface ActivateFormProps {
  token: string
  initialData: {
    name: string
    email: string
    role: string
    nip?: string | null
    phone?: string | null
    opd_id?: number | null
    opd?: {
      id: number
      nama: string
      kode: string
      kategori: string
    } | null
    pangkat_gol?: string | null
    jabatan?: string | null
  }
}

export function ActivateForm({ token, initialData }: ActivateFormProps) {
  const navigate = useNavigate()
  const [isLoading, setIsLoading] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)

  // Fetch dynamic OPDs
  const { data: opds = [], isLoading: isLoadingOpds } = useQuery({
    queryKey: ['opds'],
    queryFn: () => opdService.getOpds(),
    staleTime: 5 * 60 * 1000,
  })

  const opdOptions = useMemo(() => {
    return opds.map((opd) => ({
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

  const form = useForm<ActivateFormValues>({
    resolver: zodResolver(activateSchema),
    defaultValues: {
      name: initialData.name || '',
      nip: initialData.nip || '',
      opd_id: initialData.opd_id ? String(initialData.opd_id) : '',
      jabatan: initialData.jabatan || '',
      pangkat_gol: initialData.pangkat_gol || '',
      phone: initialData.phone || '',
      password: '',
      password_confirmation: '',
    },
    mode: 'onChange',
  })

  const watchedPassword = form.watch('password') || ''
  const watchedConfirm = form.watch('password_confirmation') || ''

  // Validation criteria checklist
  const criteria = [
    { id: 'min_length', label: 'Min. 8 Karakter', valid: watchedPassword.length >= 8 },
    { id: 'uppercase', label: 'Huruf Besar (A-Z)', valid: /[A-Z]/.test(watchedPassword) },
    { id: 'lowercase', label: 'Huruf Kecil (a-z)', valid: /[a-z]/.test(watchedPassword) },
    { id: 'number', label: 'Angka (0-9)', valid: /[0-9]/.test(watchedPassword) },
    {
      id: 'symbol',
      label: 'Simbol Unik (!@#$%)',
      valid: /[^a-zA-Z0-9]/.test(watchedPassword),
    },
  ]

  const validCount = criteria.filter((c) => c.valid).length
  const isAllValid = validCount === criteria.length

  // Match indicator
  const hasTypedConfirm = watchedConfirm.length > 0
  const isMatch = hasTypedConfirm && watchedConfirm === watchedPassword
  const isMismatch = hasTypedConfirm && watchedConfirm !== watchedPassword

  // Generator: creates a high-entropy, 12-char secure password
  function handleGeneratePassword() {
    const uppers = 'ABCDEFGHJKLMNPQRSTUVWXYZ'
    const lowers = 'abcdefghijkmnpqrstuvwxyz'
    const numbers = '23456789'
    const symbols = '!@#$%&*?'

    let pwd = ''
    for (let i = 0; i < 3; i++) pwd += uppers[Math.floor(Math.random() * uppers.length)]
    for (let i = 0; i < 4; i++) pwd += lowers[Math.floor(Math.random() * lowers.length)]
    for (let i = 0; i < 3; i++) pwd += numbers[Math.floor(Math.random() * numbers.length)]
    for (let i = 0; i < 2; i++) pwd += symbols[Math.floor(Math.random() * symbols.length)]

    // Shuffle characters
    const generated = pwd
      .split('')
      .sort(() => 0.5 - Math.random())
      .join('')

    form.setValue('password', generated, { shouldValidate: true })
    form.setValue('password_confirmation', generated, { shouldValidate: true })

    navigator.clipboard.writeText(generated)
    toast.success('Kata sandi kuat berhasil dibuat dan disalin ke clipboard!')
  }

  function handleCopyPassword() {
    if (!watchedPassword) return
    navigator.clipboard.writeText(watchedPassword)
    toast.info('Kata sandi disalin ke clipboard!')
  }

  const onSubmit = async (values: ActivateFormValues) => {
    setIsLoading(true)
    try {
      await authService.activateUser({
        token,
        name: values.name.trim(),
        nip: values.nip ? values.nip.trim() : undefined,
        phone: values.phone ? values.phone.trim() : undefined,
        opd_id: values.opd_id ? Number(values.opd_id) : undefined,
        jabatan: values.jabatan ? values.jabatan.trim() : undefined,
        pangkat_gol: values.pangkat_gol || undefined,
        password: values.password,
        password_confirmation: values.password_confirmation,
      })

      setIsSuccess(true)
      toast.success('Akun Anda Berhasil Diaktifkan!', {
        description: 'Silakan masuk ke Portal Pemda menggunakan kredensial baru Anda.',
      })
    } catch (error: unknown) {
      if (isAxiosError(error) && error.response?.data) {
        const errorData = error.response.data as {
          message?: string
          errors?: Record<string, string[]>
        }

        if (errorData.errors) {
          Object.entries(errorData.errors).forEach(([field, msgs]) => {
            const formField = field as keyof ActivateFormValues
            if (formField in form.getValues()) {
              form.setError(formField, {
                type: 'server',
                message: msgs[0],
              })
            }
          })
        }

        toast.error('Aktivasi Akun Gagal', {
          description:
            errorData.message ||
            'Terjadi kesalahan saat memproses aktivasi akun. Silakan periksa formulir.',
        })
      } else {
        toast.error('Kesalahan Jaringan', {
          description: 'Tidak dapat terhubung ke server. Silakan coba kembali.',
        })
      }
    } finally {
      setIsLoading(false)
    }
  }

  if (isSuccess) {
    return (
      <div className='space-y-6 text-center py-4 animate-in fade-in duration-300'>
        <div className='mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400'>
          <CheckCircle2 className='h-10 w-10' />
        </div>

        <div className='space-y-2'>
          <h3 className='text-xl font-bold tracking-tight text-foreground'>
            Akun Pegawai Berhasil Diaktifkan!
          </h3>
          <p className='text-xs text-muted-foreground max-w-sm mx-auto leading-relaxed'>
            Selamat! Kata sandi dan data profil pegawai Anda telah berhasil tersimpan dengan aman di sistem pemerintah daerah.
          </p>
        </div>

        <div className='rounded-lg border bg-muted/30 p-4 text-start text-xs space-y-2'>
          <div className='flex justify-between items-center text-muted-foreground'>
            <span>Nama:</span>
            <span className='font-semibold text-foreground'>{form.getValues('name')}</span>
          </div>
          <div className='flex justify-between items-center text-muted-foreground'>
            <span>Email Login:</span>
            <span className='font-semibold text-foreground'>{initialData.email}</span>
          </div>
          <div className='flex justify-between items-center text-muted-foreground'>
            <span>Peran Akses:</span>
            <span className='font-semibold text-foreground'>{initialData.role}</span>
          </div>
        </div>

        <Button
          className='w-full shadow-md'
          size='lg'
          onClick={() => navigate({ to: '/sign-in' })}
        >
          Masuk ke Portal Pemda <ArrowRight className='ml-2 h-4 w-4' />
        </Button>
      </div>
    )
  }

  return (
    <div className='space-y-6'>
      {/* Account Info Banner */}
      <div className='flex items-center gap-3 p-3.5 rounded-lg border bg-primary/5 border-primary/20 text-xs'>
        <div className='flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-bold'>
          <User className='h-4 w-4' />
        </div>
        <div className='min-w-0 flex-1'>
          <div className='flex items-center gap-2'>
            <span className='font-semibold text-foreground truncate'>
              {initialData.email}
            </span>
            <span className='px-2 py-0.5 rounded-full text-[10px] font-semibold bg-primary/15 text-primary border border-primary/30'>
              {initialData.role}
            </span>
          </div>
          <p className='text-[11px] text-muted-foreground mt-0.5'>
            Lengkapi data profil dan tetapkan kata sandi Anda di bawah ini.
          </p>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-4'>
          {/* Data Profil Pegawai */}
          <div className='grid gap-3.5'>
            {/* Nama Lengkap */}
            <FormField
              control={form.control}
              name='name'
              render={({ field }) => (
                <FormItem className='space-y-1.5'>
                  <FormLabel className='text-xs font-semibold'>
                    Nama Lengkap beserta Gelar <span className='text-destructive'>*</span>
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder='Contoh: Drs. H. Ahmad Fauzi, M.Si'
                      disabled={isLoading}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage className='text-xs' />
                </FormItem>
              )}
            />

            {/* NIP (Nomor Induk Pegawai) */}
            <FormField
              control={form.control}
              name='nip'
              render={({ field }) => (
                <FormItem className='space-y-1.5'>
                  <FormLabel className='text-xs font-semibold'>
                    NIP (Nomor Induk Pegawai)
                    <span className='text-[10px] text-muted-foreground ml-1 font-normal'>
                      (Opsional)
                    </span>
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder='199001012015011001'
                      maxLength={30}
                      disabled={isLoading}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage className='text-xs' />
                </FormItem>
              )}
            />

            {/* Instansi / OPD */}
            <FormField
              control={form.control}
              name='opd_id'
              render={({ field }) => (
                <FormItem className='space-y-1.5'>
                  <FormLabel className='text-xs font-semibold flex items-center gap-1.5'>
                    <Building2 className='h-3.5 w-3.5 text-muted-foreground' />
                    Instansi / Perangkat Daerah (OPD)
                  </FormLabel>
                  <FormControl>
                    <SearchableSelect
                      disabled={isLoading || isLoadingOpds}
                      value={field.value}
                      onValueChange={field.onChange}
                      options={opdOptions}
                      placeholder={
                        isLoadingOpds
                          ? 'Memuat daftar OPD...'
                          : 'Pilih perangkat daerah unit kerja...'
                      }
                      searchPlaceholder='Cari nama atau singkatan OPD (misal: Disdik, Setda, Bappeda)...'
                      emptyMessage='Tidak ada perangkat daerah yang cocok.'
                    />
                  </FormControl>
                  <FormMessage className='text-xs' />
                </FormItem>
              )}
            />

            <div className='grid grid-cols-1 sm:grid-cols-2 gap-3'>
              {/* Jabatan Kedinasan */}
              <FormField
                control={form.control}
                name='jabatan'
                render={({ field }) => (
                  <FormItem className='space-y-1.5'>
                    <FormLabel className='text-xs font-semibold'>
                      Jabatan Kedinasan
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder='Contoh: Analis Kebijakan'
                        maxLength={150}
                        disabled={isLoading}
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
                  <FormItem className='space-y-1.5'>
                    <FormLabel className='text-xs font-semibold'>
                      Pangkat / Golongan
                    </FormLabel>
                    <FormControl>
                      <SearchableSelect
                        disabled={isLoading}
                        value={field.value}
                        onValueChange={field.onChange}
                        options={pangkatOptions}
                        placeholder='Pilih golongan...'
                        searchPlaceholder='Cari nama pangkat atau ruang (misal: Pembina, III/a, PPPK)...'
                        emptyMessage='Tidak ada pangkat yang cocok.'
                      />
                    </FormControl>
                    <FormMessage className='text-xs' />
                  </FormItem>
                )}
              />
            </div>

            {/* Nomor HP / WhatsApp */}
            <FormField
              control={form.control}
              name='phone'
              render={({ field }) => (
                <FormItem className='space-y-1.5'>
                  <FormLabel className='text-xs font-semibold'>
                    Nomor Kontak / WhatsApp
                    <span className='text-[10px] text-muted-foreground ml-1 font-normal'>
                      (Opsional)
                    </span>
                  </FormLabel>
                  <FormControl>
                    <Input
                      type='tel'
                      placeholder='081234567890'
                      disabled={isLoading}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage className='text-xs' />
                </FormItem>
              )}
            />
          </div>

          {/* Pemisah Bagian Kata Sandi */}
          <div className='pt-3 border-t space-y-4'>
            {/* Kata Sandi Baru */}
            <FormField
              control={form.control}
              name='password'
              render={({ field }) => (
                <FormItem className='space-y-1.5'>
                  <div className='flex items-center justify-between'>
                    <FormLabel className='text-xs font-semibold'>
                      Kata Sandi Baru <span className='text-destructive'>*</span>
                    </FormLabel>
                    <div className='flex items-center gap-1.5'>
                      {watchedPassword.length > 0 && (
                        <Button
                          type='button'
                          variant='ghost'
                          size='sm'
                          className='h-6 px-1.5 text-[11px] text-muted-foreground hover:text-foreground'
                          onClick={handleCopyPassword}
                        >
                          <Copy className='h-3 w-3 mr-1' />
                          Salin
                        </Button>
                      )}
                      <Button
                        type='button'
                        variant='outline'
                        size='sm'
                        className='h-6 px-2 text-[11px] font-medium text-primary hover:text-primary hover:bg-primary/10 border-primary/30'
                        onClick={handleGeneratePassword}
                      >
                        <Sparkles className='h-3 w-3 mr-1 text-primary animate-pulse' />
                        Buat Sandi Otomatis
                      </Button>
                    </div>
                  </div>
                  <FormControl>
                    <PasswordInput
                      placeholder='Masukkan kata sandi baru yang aman'
                      disabled={isLoading}
                      autoComplete='new-password'
                      {...field}
                    />
                  </FormControl>
                  <FormMessage className='text-xs' />
                </FormItem>
              )}
            />

            {/* Interactive Strength Meter & Rules */}
            <div className='space-y-2.5 rounded-lg border bg-card/60 p-3.5 shadow-2xs'>
              {/* Visual Strength Bar */}
              <div className='space-y-1.5'>
                <div className='flex items-center justify-between text-xs'>
                  <span className='text-muted-foreground text-[11px]'>Kekuatan Sandi:</span>
                  <span
                    className={cn('font-semibold text-[11px] transition-colors', {
                      'text-muted-foreground': validCount === 0,
                      'text-destructive': validCount > 0 && validCount <= 2,
                      'text-amber-500': validCount === 3 || validCount === 4,
                      'text-emerald-600 dark:text-emerald-400': isAllValid,
                    })}
                  >
                    {validCount === 0 && 'Belum Diisi'}
                    {validCount > 0 && validCount <= 2 && 'Lemah (Belum Memenuhi Syarat)'}
                    {(validCount === 3 || validCount === 4) && 'Sedang'}
                    {isAllValid && 'Sangat Kuat (Memenuhi Standar Keamanan)'}
                  </span>
                </div>

                {/* Segmented Strength Bar */}
                <div className='grid grid-cols-5 gap-1.5 h-1.5'>
                  {[1, 2, 3, 4, 5].map((level) => (
                    <div
                      key={level}
                      className={cn(
                        'h-full rounded-full transition-all duration-300',
                        validCount >= level
                          ? validCount <= 2
                            ? 'bg-destructive'
                            : validCount <= 4
                              ? 'bg-amber-500'
                              : 'bg-emerald-500'
                          : 'bg-muted'
                      )}
                    />
                  ))}
                </div>
              </div>

              {/* Checklist Badges / Pills */}
              <div className='pt-1'>
                <p className='text-[11px] font-medium text-muted-foreground mb-1.5'>
                  Syarat kata sandi yang aman:
                </p>
                <div className='flex flex-wrap gap-1.5'>
                  {criteria.map((item) => (
                    <Badge
                      key={item.id}
                      variant={item.valid ? 'default' : 'outline'}
                      className={cn(
                        'text-[10px] font-normal transition-all duration-200 py-0.5 px-2 gap-1 select-none',
                        item.valid
                          ? 'bg-emerald-600 hover:bg-emerald-600 text-white dark:bg-emerald-500 dark:text-emerald-950 font-medium'
                          : 'text-muted-foreground border-border/80 bg-muted/30'
                      )}
                    >
                      {item.valid ? (
                        <Check className='h-2.5 w-2.5 text-white dark:text-emerald-950 stroke-[3]' />
                      ) : (
                        <span className='h-1.5 w-1.5 rounded-full bg-muted-foreground/40' />
                      )}
                      {item.label}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>

            {/* Konfirmasi Kata Sandi */}
            <FormField
              control={form.control}
              name='password_confirmation'
              render={({ field }) => (
                <FormItem className='space-y-1.5'>
                  <div className='flex items-center justify-between'>
                    <FormLabel className='text-xs font-semibold'>
                      Konfirmasi Kata Sandi <span className='text-destructive'>*</span>
                    </FormLabel>
                    {hasTypedConfirm && (
                      <span
                        className={cn(
                          'flex items-center gap-1 text-[11px] font-medium animate-in fade-in',
                          isMatch
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : 'text-destructive'
                        )}
                      >
                        {isMatch ? (
                          <>
                            <Check className='h-3 w-3 stroke-[3]' />
                            Kata Sandi Cocok
                          </>
                        ) : (
                          <>
                            <X className='h-3 w-3 stroke-[3]' />
                            Belum Cocok
                          </>
                        )}
                      </span>
                    )}
                  </div>
                  <FormControl>
                    <PasswordInput
                      placeholder='Ketik ulang kata sandi baru Anda'
                      disabled={isLoading}
                      autoComplete='new-password'
                      className={cn(
                        hasTypedConfirm &&
                          (isMatch
                            ? 'border-emerald-500 focus-visible:ring-emerald-500'
                            : isMismatch
                              ? 'border-destructive focus-visible:ring-destructive'
                              : '')
                      )}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage className='text-xs' />
                </FormItem>
              )}
            />
          </div>

          {/* Privacy & Governance Notice */}
          <div className='rounded-lg border bg-muted/40 p-3 text-[11px] text-muted-foreground flex items-start gap-2.5 leading-relaxed'>
            <Info className='h-4 w-4 shrink-0 text-primary mt-0.5' />
            <span>
              Dengan mengaktifkan akun, Anda terikat pada ketentuan keamanan data, kerahasiaan kedinasan, dan tata kelola akun resmi Pemerintah Daerah.
            </span>
          </div>

          {/* Tombol Simpan & Aktifkan */}
          <Button
            type='submit'
            className='w-full shadow-md font-semibold'
            size='lg'
            disabled={isLoading || !isAllValid || isMismatch}
          >
            {isLoading ? (
              <>
                <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                Mengaktifkan Akun Pegawai...
              </>
            ) : (
              <>
                <LockKeyhole className='mr-2 h-4 w-4' />
                Aktifkan Akun & Simpan Profil
              </>
            )}
          </Button>
        </form>
      </Form>
    </div>
  )
}
