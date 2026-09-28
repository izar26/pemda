import { KeyRound } from 'lucide-react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { AuthLayout } from '../auth-layout'
import { ForgotPasswordForm } from './components/forgot-password-form'

export function ForgotPassword() {
  return (
    <AuthLayout>
      <Card className='w-full max-w-md shadow-lg border-muted/60'>
        <CardHeader className='space-y-2 text-center pb-4'>
          <div className='mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary mb-1'>
            <KeyRound className='h-6 w-6' />
          </div>
          <CardTitle className='text-xl font-bold tracking-tight'>
            Lupa Kata Sandi?
          </CardTitle>
          <CardDescription className='text-xs text-muted-foreground leading-relaxed'>
            Masukkan alamat email kedinasan Anda yang terdaftar. Kami akan mengirimkan tautan aman untuk mengatur ulang kata sandi Anda.
          </CardDescription>
        </CardHeader>
        <CardContent className='pt-2'>
          <ForgotPasswordForm />
        </CardContent>
      </Card>
    </AuthLayout>
  )
}
