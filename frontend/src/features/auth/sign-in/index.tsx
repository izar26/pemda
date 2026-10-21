import { useSearch } from '@tanstack/react-router'
import { Logo } from '@/assets/logo'
import { useAppConfig } from '@/hooks/use-app-config'
import { UserAuthForm } from './components/user-auth-form'
import { LoginBannerCarousel } from './components/login-banner-carousel'

export function SignIn() {
  const { redirect } = useSearch({ from: '/(auth)/sign-in' })
  const { appName, instanceName, appLogoUrl, isLoading } = useAppConfig()

  return (
    <div className='relative container grid min-h-svh flex-col items-center justify-center bg-muted/20 lg:max-w-none lg:grid-cols-2 lg:px-0'>
      <div className='flex h-full w-full items-center justify-center p-4 sm:p-8 lg:p-12'>
        <div className='w-full max-w-md rounded-2xl border border-border/60 bg-card p-6 shadow-xl sm:p-8 transition-all'>
          {/* Header Card */}
          <div className='mb-6 flex flex-col items-center text-center'>
            {appLogoUrl ? (
              <div className='mb-3 flex size-12 shrink-0 items-center justify-center rounded-xl bg-background border border-border/60 p-1.5 shadow-2xs'>
                <img
                  src={appLogoUrl}
                  alt={appName}
                  className='h-full w-full object-contain'
                />
              </div>
            ) : isLoading ? (
              <div className='mb-3 size-12 animate-pulse rounded-xl bg-muted/60 border border-border/40' />
            ) : (
              <div className='mb-3 flex size-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/20 shadow-2xs'>
                <Logo className='size-7 shrink-0' />
              </div>
            )}
            <h1 className='text-2xl font-bold tracking-tight text-foreground'>
              {appName}
            </h1>
            <p className='mt-1 text-xs text-muted-foreground'>
              {instanceName}
            </p>
          </div>

          {/* Form Login */}
          <UserAuthForm redirectTo={redirect} />
        </div>
      </div>

      <LoginBannerCarousel />
    </div>
  )
}
