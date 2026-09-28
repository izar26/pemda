import { LockKeyhole } from 'lucide-react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { AuthLayout } from '../auth-layout'
import { ResetPasswordForm } from './components/reset-password-form'

interface ResetPasswordProps {
  token: string
  email: string
}

export function ResetPassword({ token, email }: ResetPasswordProps) {
  return (
    <AuthLayout>
      <Card className='w-full max-w-lg shadow-xl border-muted/60'>
        <CardHeader className='space-y-2 text-center pb-4'>
          <div className='mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary mb-1'>
            <LockKeyhole className='h-6 w-6' />
          </div>
          <CardTitle className='text-xl font-bold tracking-tight'>
            Atur Ulang Kata Sandi
          </CardTitle>
          <CardDescription className='text-xs text-muted-foreground leading-relaxed'>
            Buat kata sandi baru yang kuat dan unik untuk mengamankan akun Portal Pemda Anda.
          </CardDescription>
        </CardHeader>
        <CardContent className='pt-2'>
          <ResetPasswordForm token={token} email={email} />
        </CardContent>
      </Card>
    </AuthLayout>
  )
}
