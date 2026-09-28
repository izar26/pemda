import { useState } from 'react'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useNavigate, Link } from '@tanstack/react-router'
import {
  AlertTriangle,
  ArrowRight,
  Check,
  CheckCircle2,
  Copy,
  Info,
  Loader2,
  ShieldCheck,
  Sparkles,
  X,
} from 'lucide-react'
import { toast } from 'sonner'
import { isAxiosError } from 'axios'
import { cn } from '@/lib/utils'
import { authService } from '@/services/auth-service'
import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { PasswordInput } from '@/components/password-input'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'

const resetPasswordSchema = z
  .object({
    password: z
      .string()
      .min(8, 'Kata sandi minimal 8 karakter.')
      .regex(/[a-z]/, 'Wajib mengandung huruf kecil (a-z).')
      .regex(/[A-Z]/, 'Wajib mengandung huruf besar (A-Z).')
      .regex(/[0-9]/, 'Wajib mengandung angka (0-9).')
      .regex(/[^a-zA-Z0-9]/, 'Wajib mengandung karakter simbol (!@#$%^&*).'),
    password_confirmation: z.string().min(1, 'Konfirmasi kata sandi wajib diisi.'),
  })
  .refine((data) => data.password === data.password_confirmation, {
    message: 'Konfirmasi kata sandi tidak cocok.',
    path: ['password_confirmation'],
  })

type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>

interface ResetPasswordFormProps extends React.HTMLAttributes<HTMLDivElement> {
  token: string
  email: string
}

export function ResetPasswordForm({
  token,
  email,
  className,
  ...props
}: ResetPasswordFormProps) {
  const navigate = useNavigate()
  const [isLoading, setIsLoading] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)

  const form = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
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

  // Quick copy password
  function handleCopyPassword() {
    if (!watchedPassword) return
    navigator.clipboard.writeText(watchedPassword)
    toast.success('Kata sandi disalin ke clipboard.')
  }

  async function onSubmit(data: ResetPasswordFormValues) {
    if (!token || !email) {
      toast.error('Token atau parameter email tidak ditemukan.')
      return
    }

    setIsLoading(true)

    try {
      const response = await authService.resetPassword({
        token,
        email,
        password: data.password,
        password_confirmation: data.password_confirmation,
      })

      setIsSuccess(true)
      toast.success(response.message || 'Kata sandi berhasil diperbarui!')
    } catch (error) {
      const msg =
        isAxiosError(error) && error.response?.data?.message
          ? error.response.data.message
          : 'Gagal memperbarui kata sandi. Tautan mungkin telah kedaluwarsa.'
      toast.error(msg)
    } finally {
      setIsLoading(false)
    }
  }

  // Missing parameter state
  if (!token || !email) {
    return (
      <div className={cn('grid gap-4', className)} {...props}>
        <Alert variant='destructive'>
          <AlertTriangle className='h-4 w-4' />
          <AlertTitle>Tautan Tidak Valid</AlertTitle>
          <AlertDescription className='text-xs leading-relaxed'>
            Tautan pemulihan kata sandi tidak lengkap atau parameter token tidak ditemukan.
            Harap minta tautan baru melalui halaman Lupa Kata Sandi.
          </AlertDescription>
        </Alert>

        <Button asChild className='w-full text-xs'>
          <Link to='/forgot-password'>Minta Tautan Baru</Link>
        </Button>
      </div>
    )
  }

  // Success state
  if (isSuccess) {
    return (
      <div className={cn('grid gap-4', className)} {...props}>
        <Alert className='border-emerald-500/50 bg-emerald-50/50 dark:border-emerald-500/30 dark:bg-emerald-950/20'>
          <CheckCircle2 className='h-5 w-5 text-emerald-600 dark:text-emerald-400' />
          <AlertTitle className='font-semibold text-emerald-900 dark:text-emerald-300'>
            Kata Sandi Berhasil Diperbarui!
          </AlertTitle>
          <AlertDescription className='text-xs leading-relaxed text-emerald-800 dark:text-emerald-400'>
            Kata sandi untuk akun <strong className='font-medium'>{email}</strong> telah
            berhasil diubah. Seluruh sesi aktif pada perangkat lain telah dihentikan demi
            menjaga keamanan akun kedinasan Anda.
          </AlertDescription>
        </Alert>

        <Button
          type='button'
          className='w-full mt-2'
          onClick={() => navigate({ to: '/sign-in' })}
        >
          Masuk ke Portal Sekarang
          <ArrowRight className='ml-2 h-4 w-4' />
        </Button>
      </div>
    )
  }

  return (
    <div className={cn('grid gap-5', className)} {...props}>
      {/* Target Account Badge */}
      <div className='flex items-center justify-between rounded-lg bg-muted/50 border px-3 py-2 text-xs'>
        <span className='text-muted-foreground'>Akun Pemohon:</span>
        <span className='font-mono font-medium text-foreground'>{email}</span>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className='grid gap-4'>
          {/* Kata Sandi Baru */}
          <FormField
            control={form.control}
            name='password'
            render={({ field }) => (
              <FormItem className='space-y-1.5'>
                <div className='flex items-center justify-between'>
                  <FormLabel className='text-xs font-semibold'>Kata Sandi Baru</FormLabel>
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
                    placeholder='Masukkan kata sandi baru'
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
                      <Check className='h-3 w-3 shrink-0' />
                    ) : (
                      <span className='h-1.5 w-1.5 rounded-full bg-muted-foreground/40 shrink-0' />
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
                    Ulangi Kata Sandi Baru
                  </FormLabel>
                  {hasTypedConfirm && (
                    <span
                      className={cn(
                        'text-[11px] font-medium flex items-center gap-1',
                        isMatch ? 'text-emerald-600 dark:text-emerald-400' : 'text-destructive'
                      )}
                    >
                      {isMatch ? (
                        <>
                          <Check className='h-3 w-3' />
                          Kata sandi cocok
                        </>
                      ) : (
                        <>
                          <X className='h-3 w-3' />
                          Belum cocok
                        </>
                      )}
                    </span>
                  )}
                </div>
                <FormControl>
                  <PasswordInput
                    placeholder='Ketik ulang kata sandi baru'
                    disabled={isLoading}
                    autoComplete='new-password'
                    className={cn({
                      'border-emerald-500 focus-visible:ring-emerald-500': isMatch,
                      'border-destructive focus-visible:ring-destructive': isMismatch,
                    })}
                    {...field}
                  />
                </FormControl>
                <FormMessage className='text-xs' />
              </FormItem>
            )}
          />

          {/* Security Advisory */}
          <div className='flex items-start gap-2 rounded-lg bg-muted/40 p-2.5 text-[11px] text-muted-foreground leading-relaxed'>
            <Info className='h-4 w-4 text-primary shrink-0 mt-0.5' />
            <span>
              Gunakan kata sandi unik yang belum pernah Anda gunakan di platform lain. Jangan
              berikan kata sandi ini kepada pihak lain demi menjaga keamanan data kedinasan.
            </span>
          </div>

          <Button
            type='submit'
            className='w-full mt-1'
            disabled={isLoading || !isAllValid || !isMatch}
          >
            {isLoading ? (
              <>
                <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                Menyimpan Perubahan...
              </>
            ) : (
              <>
                <ShieldCheck className='mr-2 h-4 w-4' />
                Simpan Kata Sandi Baru
              </>
            )}
          </Button>
        </form>
      </Form>
    </div>
  )
}
