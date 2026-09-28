import { Shield } from 'lucide-react'

type AuthLayoutProps = {
  children: React.ReactNode
}

export function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className='container grid min-h-svh max-w-none items-center justify-center p-4'>
      <div className='mx-auto flex w-full flex-col justify-center space-y-4 py-8 sm:p-8'>
        <div className='flex items-center justify-center gap-2.5'>
          <div className='flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-md'>
            <Shield className='h-5 w-5' />
          </div>
          <div className='flex flex-col text-left'>
            <h1 className='text-lg font-bold tracking-tight text-foreground leading-tight'>
              Portal Pemerintah Daerah
            </h1>
            <p className='text-xs text-muted-foreground'>
              Sistem Autentikasi & Keamanan Terpadu
            </p>
          </div>
        </div>
        {children}
      </div>
    </div>
  )
}
