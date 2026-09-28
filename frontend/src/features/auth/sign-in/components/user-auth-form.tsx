import { useState } from 'react'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link, useNavigate } from '@tanstack/react-router'
import { ArrowLeft, KeyRound, Loader2, LogIn, ShieldCheck } from 'lucide-react'
import { toast } from 'sonner'
import { isAxiosError } from 'axios'
import { useAuthStore } from '@/stores/auth-store'
import { authService } from '@/services/auth-service'
import { cn } from '@/lib/utils'
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

const loginSchema = z.object({
  identifier: z
    .string()
    .min(1, 'Email atau NIP wajib diisi.')
    .max(100, 'Maksimal 100 karakter.'),
  password: z
    .string()
    .min(1, 'Kata sandi wajib diisi.')
    .min(6, 'Kata sandi minimal 6 karakter.'),
})

const twoFactorSchema = z.object({
  code: z
    .string()
    .min(1, 'Kode verifikasi wajib diisi.')
    .max(25, 'Format kode tidak valid.'),
})

type LoginValues = z.infer<typeof loginSchema>
type TwoFactorValues = z.infer<typeof twoFactorSchema>

interface UserAuthFormProps extends React.HTMLAttributes<HTMLDivElement> {
  redirectTo?: string
}

export function UserAuthForm({
  className,
  redirectTo,
  ...props
}: UserAuthFormProps) {
  const [step, setStep] = useState<'login' | '2fa'>('login')
  const [tempToken, setTempToken] = useState<string>('')
  const [useRecoveryCode, setUseRecoveryCode] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const navigate = useNavigate()
  const { auth } = useAuthStore()

  // Form Step 1: Login
  const loginForm = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      identifier: '',
      password: '',
    },
  })

  // Form Step 2: 2FA
  const twoFactorForm = useForm<TwoFactorValues>({
    resolver: zodResolver(twoFactorSchema),
    defaultValues: {
      code: '',
    },
  })

  // Step 1: Submit email/NIP and password
  async function onLoginSubmit(data: LoginValues) {
    setIsLoading(true)
    setErrorMessage(null)

    try {
      const response = await authService.login(data)

      if (response.requires_2fa) {
        setTempToken(response.temp_token)
        setStep('2fa')
        toast.info('Masukkan kode 6-digit Google Authenticator Anda.')
      } else {
        auth.setAccessToken(response.token)
        auth.setUser(response.user)
        toast.success(response.message || `Selamat datang, ${response.user.name}!`)

        const targetPath = redirectTo || '/'
        navigate({ to: targetPath, replace: true })
      }
    } catch (error) {
      if (isAxiosError(error) && error.response?.data?.message) {
        const msg = error.response.data.message
        setErrorMessage(msg)
        toast.error(msg)
      } else {
        const fallback = 'Terjadi gangguan saat menghubungkan ke server. Silakan coba lagi.'
        setErrorMessage(fallback)
        toast.error(fallback)
      }
    } finally {
      setIsLoading(false)
    }
  }

  // Step 2: Submit 2FA Code
  async function onTwoFactorSubmit(data: TwoFactorValues) {
    if (!tempToken) {
      setErrorMessage('Sesi 2FA tidak valid. Silakan masuk kembali.')
      setStep('login')
      return
    }

    setIsLoading(true)
    setErrorMessage(null)

    try {
      const response = await authService.verifyTwoFactor(tempToken, data.code)

      auth.setAccessToken(response.token)
      auth.setUser(response.user)

      if (response.used_backup_code) {
        toast.warning(
          'Anda masuk menggunakan kode pemulihan darurat. Pastikan untuk memperbarui kode cadangan Anda.'
        )
      } else {
        toast.success(response.message || `Selamat datang, ${response.user.name}!`)
      }

      const targetPath = redirectTo || '/'
      navigate({ to: targetPath, replace: true })
    } catch (error) {
      if (isAxiosError(error) && error.response?.data?.message) {
        const msg = error.response.data.message
        setErrorMessage(msg)
        toast.error(msg)
      } else {
        const fallback = 'Kode autentikasi tidak valid atau telah kedaluwarsa.'
        setErrorMessage(fallback)
        toast.error(fallback)
      }
    } finally {
      setIsLoading(false)
    }
  }

  function handleBackToLogin() {
    setStep('login')
    setTempToken('')
    setErrorMessage(null)
    twoFactorForm.reset()
  }

  return (
    <div className={cn('grid gap-4', className)} {...props}>
      {errorMessage && (
        <div
          role='alert'
          className='rounded-md border border-destructive/50 bg-destructive/10 p-3 text-xs font-medium text-destructive'
        >
          {errorMessage}
        </div>
      )}

      {step === 'login' ? (
        <Form {...loginForm}>
          <form
            onSubmit={loginForm.handleSubmit(onLoginSubmit)}
            className='grid gap-3'
          >
            <FormField
              control={loginForm.control}
              name='identifier'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email atau NIP Pegawai</FormLabel>
                  <FormControl>
                    <Input
                      placeholder='admin@pemda.go.id atau 19850101...'
                      autoComplete='username'
                      disabled={isLoading}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={loginForm.control}
              name='password'
              render={({ field }) => (
                <FormItem className='relative'>
                  <FormLabel>Kata Sandi</FormLabel>
                  <FormControl>
                    <PasswordInput
                      placeholder='••••••••'
                      autoComplete='current-password'
                      disabled={isLoading}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                  <Link
                    to='/forgot-password'
                    className='absolute inset-e-0 -top-0.5 text-xs font-medium text-muted-foreground hover:text-primary hover:underline'
                  >
                    Lupa sandi?
                  </Link>
                </FormItem>
              )}
            />

            <Button type='submit' className='mt-2 w-full' disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                  Memverifikasi...
                </>
              ) : (
                <>
                  <LogIn className='mr-2 h-4 w-4' />
                  Masuk ke Sistem
                </>
              )}
            </Button>
          </form>
        </Form>
      ) : (
        <div className='grid gap-4 rounded-lg border bg-card p-4 shadow-xs'>
          <div className='flex items-center gap-2 text-primary'>
            <ShieldCheck className='h-5 w-5' />
            <h3 className='text-sm font-semibold'>Autentikasi Dua Faktor (2FA)</h3>
          </div>
          <p className='text-xs text-muted-foreground'>
            {useRecoveryCode
              ? 'Masukkan salah satu kode pemulihan darurat Anda (format: ABCD-EFGH).'
              : 'Buka aplikasi Google Authenticator di ponsel Anda dan masukkan 6-digit kode yang tertera.'}
          </p>

          <Form {...twoFactorForm}>
            <form
              onSubmit={twoFactorForm.handleSubmit(onTwoFactorSubmit)}
              className='grid gap-3'
            >
              <FormField
                control={twoFactorForm.control}
                name='code'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {useRecoveryCode ? 'Kode Pemulihan' : 'Kode 6-Digit OTP'}
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder={useRecoveryCode ? 'ABCD-EFGH' : '123456'}
                        maxLength={useRecoveryCode ? 25 : 6}
                        className='text-center font-mono text-base tracking-widest'
                        autoFocus
                        disabled={isLoading}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button type='submit' className='w-full' disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                    Memverifikasi OTP...
                  </>
                ) : (
                  <>
                    <KeyRound className='mr-2 h-4 w-4' />
                    Konfirmasi & Masuk
                  </>
                )}
              </Button>

              <div className='flex flex-col gap-2 pt-2 text-center text-xs'>
                <button
                  type='button'
                  onClick={() => {
                    setUseRecoveryCode(!useRecoveryCode)
                    twoFactorForm.reset()
                    setErrorMessage(null)
                  }}
                  className='text-muted-foreground hover:text-primary hover:underline'
                  disabled={isLoading}
                >
                  {useRecoveryCode
                    ? 'Gunakan aplikasi Google Authenticator'
                    : 'Ponsel hilang? Gunakan kode pemulihan darurat'}
                </button>

                <button
                  type='button'
                  onClick={handleBackToLogin}
                  className='inline-flex items-center justify-center gap-1 font-medium text-muted-foreground hover:text-foreground'
                  disabled={isLoading}
                >
                  <ArrowLeft className='h-3 w-3' />
                  Kembali ke form login
                </button>
              </div>
            </form>
          </Form>
        </div>
      )}
    </div>
  )
}
