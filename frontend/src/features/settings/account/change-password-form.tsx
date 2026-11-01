import { useState } from 'react'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { isAxiosError } from 'axios'
import { toast } from 'sonner'
import { KeyRound, Loader2, Lock, ShieldCheck } from 'lucide-react'
import { authService } from '@/services/auth-service'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { PasswordInput } from '@/components/password-input'

const changePasswordSchema = z
  .object({
    current_password: z.string().min(1, 'Kata sandi saat ini wajib diisi'),
    password: z.string().min(8, 'Kata sandi baru minimal harus 8 karakter'),
    password_confirmation: z.string().min(1, 'Konfirmasi kata sandi baru wajib diisi'),
  })
  .superRefine((data, ctx) => {
    if (data.password && data.current_password && data.password === data.current_password) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Kata sandi baru harus berbeda dari kata sandi saat ini',
        path: ['password'],
      })
    }
    if (data.password && data.password_confirmation && data.password !== data.password_confirmation) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Konfirmasi kata sandi baru tidak cocok',
        path: ['password_confirmation'],
      })
    }
  })

type ChangePasswordFormValues = z.infer<typeof changePasswordSchema>

export function ChangePasswordForm() {
  const [isSubmitting, setIsSubmitting] = useState(false)

  const form = useForm<ChangePasswordFormValues>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: {
      current_password: '',
      password: '',
      password_confirmation: '',
    },
  })

  async function onSubmit(data: ChangePasswordFormValues) {
    setIsSubmitting(true)
    try {
      const response = await authService.changePassword(data)
      toast.success(response.message || 'Kata sandi berhasil diperbarui.')
      form.reset({
        current_password: '',
        password: '',
        password_confirmation: '',
      })
    } catch (error) {
      if (isAxiosError(error) && error.response?.data) {
        const errorData = error.response.data
        if (errorData.errors) {
          if (errorData.errors.current_password) {
            form.setError('current_password', {
              type: 'server',
              message: errorData.errors.current_password[0],
            })
          }
          if (errorData.errors.password) {
            form.setError('password', {
              type: 'server',
              message: errorData.errors.password[0],
            })
          }
          if (errorData.errors.password_confirmation) {
            form.setError('password_confirmation', {
              type: 'server',
              message: errorData.errors.password_confirmation[0],
            })
          }
        } else if (errorData.message) {
          toast.error(errorData.message)
        } else {
          toast.error('Gagal memperbarui kata sandi. Silakan coba lagi.')
        }
      } else {
        toast.error('Terjadi kesalahan jaringan atau server.')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Card className='border shadow-sm'>
      <CardHeader className='pb-4'>
        <div className='flex items-center gap-2 text-primary'>
          <KeyRound className='h-5 w-5' />
          <CardTitle className='text-base font-semibold text-foreground'>
            Ganti Kata Sandi
          </CardTitle>
        </div>
        <CardDescription className='text-xs text-muted-foreground'>
          Perbarui kata sandi akun Anda secara berkala untuk menjaga keamanan akses sistem.
        </CardDescription>
      </CardHeader>

      <CardContent>
        <Form {...form}>
          <form
            id='change-password-form'
            onSubmit={form.handleSubmit(onSubmit)}
            className='space-y-4 max-w-xl'
          >
            <FormField
              control={form.control}
              name='current_password'
              render={({ field }) => (
                <FormItem>
                  <FormLabel className='text-xs font-semibold'>
                    Kata Sandi Saat Ini <span className='text-destructive'>*</span>
                  </FormLabel>
                  <FormControl>
                    <PasswordInput
                      placeholder='Masukkan kata sandi akun saat ini'
                      {...field}
                    />
                  </FormControl>
                  <FormMessage className='text-xs' />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name='password'
              render={({ field }) => (
                <FormItem>
                  <FormLabel className='text-xs font-semibold'>
                    Kata Sandi Baru <span className='text-destructive'>*</span>
                  </FormLabel>
                  <FormControl>
                    <PasswordInput
                      placeholder='Minimal 8 karakter'
                      {...field}
                    />
                  </FormControl>
                  <FormDescription className='text-[11px] text-muted-foreground'>
                    Gunakan minimal 8 karakter dengan kombinasi huruf, angka, atau simbol.
                  </FormDescription>
                  <FormMessage className='text-xs' />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name='password_confirmation'
              render={({ field }) => (
                <FormItem>
                  <FormLabel className='text-xs font-semibold'>
                    Konfirmasi Kata Sandi Baru <span className='text-destructive'>*</span>
                  </FormLabel>
                  <FormControl>
                    <PasswordInput
                      placeholder='Ulangi kata sandi baru Anda'
                      {...field}
                    />
                  </FormControl>
                  <FormMessage className='text-xs' />
                </FormItem>
              )}
            />
          </form>
        </Form>
      </CardContent>

      <CardFooter className='border-t bg-muted/10 px-6 py-3.5 flex justify-between items-center'>
        <div className='flex items-center gap-1.5 text-[11px] text-muted-foreground'>
          <ShieldCheck className='h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400' />
          <span>Sesi aktif pada perangkat lain akan otomatis dicabut demi keamanan.</span>
        </div>
        <Button
          type='submit'
          form='change-password-form'
          disabled={isSubmitting}
          className='gap-2 text-xs h-9'
        >
          {isSubmitting ? (
            <>
              <Loader2 className='h-3.5 w-3.5 animate-spin' />
              <span>Menyimpan...</span>
            </>
          ) : (
            <>
              <Lock className='h-3.5 w-3.5' />
              <span>Simpan Kata Sandi Baru</span>
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  )
}
