import { useEffect, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { ArrowLeft, Loader2, ShieldAlert, UserCheck } from 'lucide-react'

import { isAxiosError } from 'axios'
import { authService } from '@/services/auth-service'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { AuthLayout } from '../auth-layout'
import { ActivateForm } from './components/activate-form'

interface ActivateProps {
  token: string
}

interface ValidatedUserData {
  name: string
  email: string
  role: string
}

export function Activate({ token }: ActivateProps) {
  const [isValidating, setIsValidating] = useState(true)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [userData, setUserData] = useState<ValidatedUserData | null>(null)

  useEffect(() => {
    let isMounted = true

    if (!token || token.trim() === '') {
      setErrorMessage('Token aktivasi tidak disertakan pada tautan.')
      setIsValidating(false)
      return
    }

    const checkToken = async () => {
      setIsValidating(true)
      setErrorMessage(null)

      try {
        const response = await authService.validateActivationToken(token)
        if (isMounted) {
          setUserData(response.data)
        }
      } catch (err: unknown) {
        if (!isMounted) return

        if (isAxiosError(err) && err.response?.data) {
          const resData = err.response.data as { message?: string }
          setErrorMessage(
            resData.message ||
              'Token aktivasi tidak valid atau telah melewati batas kedaluwarsa 48 jam.'
          )
        } else {
          setErrorMessage(
            'Tidak dapat memverifikasi token aktivasi. Periksa koneksi internet Anda.'
          )
        }
      } finally {
        if (isMounted) {
          setIsValidating(false)
        }
      }
    }

    checkToken()

    return () => {
      isMounted = false
    }
  }, [token])

  return (
    <AuthLayout>
      <Card className='w-full max-w-lg shadow-xl border-muted/60'>
        {isValidating ? (
          <div className='flex flex-col items-center justify-center py-16 px-6 text-center space-y-3'>
            <Loader2 className='h-8 w-8 animate-spin text-primary' />
            <div className='space-y-1'>
              <h3 className='font-semibold text-sm'>Memeriksa Tautan Aktivasi...</h3>
              <p className='text-xs text-muted-foreground'>
                Sistem sedang memvalidasi token keamanan aktivasi akun Anda.
              </p>
            </div>
          </div>
        ) : errorMessage || !userData ? (
          <div className='p-6 space-y-5 text-center'>
            <div className='mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10 text-destructive'>
              <ShieldAlert className='h-8 w-8' />
            </div>

            <div className='space-y-2'>
              <CardTitle className='text-lg font-bold text-foreground'>
                Tautan Aktivasi Tidak Berlaku
              </CardTitle>
              <CardDescription className='text-xs leading-relaxed text-muted-foreground max-w-sm mx-auto'>
                {errorMessage ||
                  'Tautan aktivasi akun tidak valid atau sudah kedaluwarsa.'}
              </CardDescription>
            </div>

            <div className='rounded-lg border bg-amber-500/5 border-amber-500/20 p-3.5 text-xs text-start text-muted-foreground space-y-1'>
              <span className='font-semibold text-amber-800 dark:text-amber-400 block'>
                Mengapa ini terjadi?
              </span>
              <ul className='list-disc pl-4 space-y-0.5 text-[11px] leading-relaxed'>
                <li>Tautan aktivasi akun telah kedaluwarsa (masa aktif 48 jam).</li>
                <li>Akun telah diaktifkan sebelumnya.</li>
                <li>Tautan terpotong atau token tidak lengkap.</li>
              </ul>
            </div>

            <div className='space-y-2 pt-2'>
              <p className='text-[11px] text-muted-foreground'>
                Silakan hubungi Administrator OPD atau Admin Sistem untuk meminta pengiriman ulang undangan aktivasi.
              </p>
              <Button asChild variant='outline' className='w-full' size='sm'>
                <Link to='/sign-in'>
                  <ArrowLeft className='mr-2 h-4 w-4' /> Kembali ke Halaman Masuk
                </Link>
              </Button>
            </div>
          </div>
        ) : (
          <>
            <CardHeader className='space-y-2 text-center pb-4'>
              <div className='mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary mb-1'>
                <UserCheck className='h-6 w-6' />
              </div>
              <CardTitle className='text-xl font-bold tracking-tight'>
                Aktivasi Akun Pegawai
              </CardTitle>
              <CardDescription className='text-xs text-muted-foreground leading-relaxed'>
                Lengkapi identitas diri dan buat kata sandi aman untuk mulai menggunakan Portal Pemda.
              </CardDescription>
            </CardHeader>
            <CardContent className='pt-2'>
              <ActivateForm token={token} initialData={userData} />
            </CardContent>
          </>
        )}
      </Card>
    </AuthLayout>
  )
}
