import { useState, useEffect } from 'react'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { ArrowLeft, CheckCircle2, Loader2, Mail, Send } from 'lucide-react'
import { toast } from 'sonner'
import { isAxiosError } from 'axios'
import { Link } from '@tanstack/react-router'
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
import { Input } from '@/components/ui/input'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'

const forgotPasswordSchema = z.object({
  email: z
    .string()
    .min(1, 'Alamat email wajib diisi.')
    .email('Format alamat email tidak valid.'),
})

type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>

export function ForgotPasswordForm({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [submittedEmail, setSubmittedEmail] = useState('')
  const [cooldown, setCooldown] = useState(0)

  const form = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: '' },
  })

  // Timer cooldown tick
  useEffect(() => {
    if (cooldown <= 0) return
    const timer = setInterval(() => {
      setCooldown((prev) => (prev > 0 ? prev - 1 : 0))
    }, 1000)
    return () => clearInterval(timer)
  }, [cooldown])

  async function onSubmit(data: ForgotPasswordFormValues) {
    if (cooldown > 0) {
      toast.warning(`Harap tunggu ${cooldown} detik sebelum meminta tautan kembali.`)
      return
    }

    setIsLoading(true)

    try {
      const response = await authService.forgotPassword({ email: data.email })
      setSubmittedEmail(data.email)
      setIsSubmitted(true)
      setCooldown(60) // 60 seconds UI cooldown
      toast.success(response.message || 'Permintaan berhasil diproses.')
    } catch (error) {
      const msg =
        isAxiosError(error) && error.response?.data?.message
          ? error.response.data.message
          : 'Terjadi kendala saat mengirim email. Silakan coba beberapa saat lagi.'
      toast.error(msg)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className={cn('grid gap-4', className)} {...props}>
      {isSubmitted ? (
        <div className='space-y-4'>
          <Alert className='border-emerald-500/50 bg-emerald-50/50 dark:border-emerald-500/30 dark:bg-emerald-950/20'>
            <CheckCircle2 className='h-5 w-5 text-emerald-600 dark:text-emerald-400' />
            <AlertTitle className='font-semibold text-emerald-900 dark:text-emerald-300'>
              Tautan Pemulihan Terkirim
            </AlertTitle>
            <AlertDescription className='text-xs leading-relaxed text-emerald-800 dark:text-emerald-400'>
              Jika alamat <strong className='font-medium'>{submittedEmail}</strong> terdaftar di
              sistem Portal Pemda, kami telah mengirimkan instruksi dan tautan atur ulang kata
              sandi.
            </AlertDescription>
          </Alert>

          <div className='rounded-lg border bg-muted/40 p-3 text-xs text-muted-foreground leading-relaxed'>
            <p className='font-medium text-foreground mb-1'>Catatan Keamanan:</p>
            <ul className='list-disc pl-4 space-y-1'>
              <li>Tautan berlaku selama 30 menit.</li>
              <li>Periksa folder <strong>Spam</strong> jika email belum muncul di kotak masuk.</li>
            </ul>
          </div>

          <div className='space-y-2 pt-2'>
            <Button
              type='button'
              variant='outline'
              className='w-full text-xs'
              disabled={isLoading || cooldown > 0}
              onClick={() => onSubmit({ email: submittedEmail })}
            >
              {isLoading ? (
                <>
                  <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                  Mengirim Ulang...
                </>
              ) : cooldown > 0 ? (
                `Kirim Ulang Email (${cooldown}d)`
              ) : (
                <>
                  <Send className='mr-2 h-3.5 w-3.5' />
                  Kirim Ulang Tautan
                </>
              )}
            </Button>

            <Button
              type='button'
              variant='ghost'
              className='w-full text-xs text-muted-foreground'
              onClick={() => {
                setIsSubmitted(false)
                form.reset({ email: submittedEmail })
              }}
            >
              Gunakan Alamat Email Lain
            </Button>
          </div>
        </div>
      ) : (
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className='grid gap-4'>
            <FormField
              control={form.control}
              name='email'
              render={({ field }) => (
                <FormItem>
                  <FormLabel className='text-xs font-semibold'>
                    Alamat Email Terdaftar
                  </FormLabel>
                  <FormControl>
                    <div className='relative'>
                      <Mail className='absolute left-3 top-2.5 h-4 w-4 text-muted-foreground' />
                      <Input
                        type='email'
                        placeholder='nama@pemda.go.id'
                        autoComplete='email'
                        className='pl-9'
                        disabled={isLoading}
                        {...field}
                      />
                    </div>
                  </FormControl>
                  <FormMessage className='text-xs' />
                </FormItem>
              )}
            />

            <Button type='submit' className='w-full mt-2' disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                  Memproses...
                </>
              ) : (
                <>
                  Kirim Tautan Pemulihan
                  <Send className='ml-2 h-4 w-4' />
                </>
              )}
            </Button>
          </form>
        </Form>
      )}

      <div className='text-center pt-2'>
        <Link
          to='/sign-in'
          className='inline-flex items-center text-xs text-muted-foreground hover:text-foreground transition-colors'
        >
          <ArrowLeft className='mr-1.5 h-3.5 w-3.5' />
          Kembali ke Halaman Masuk
        </Link>
      </div>
    </div>
  )
}
