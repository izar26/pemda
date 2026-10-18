import { useSearch } from '@tanstack/react-router'
import { Logo } from '@/assets/logo'
import { useAppConfig } from '@/hooks/use-app-config'
import { UserAuthForm } from './components/user-auth-form'
import { LoginBannerCarousel } from './components/login-banner-carousel'

export function SignIn() {
  const { redirect } = useSearch({ from: '/(auth)/sign-in' })
  const { appName, instanceName, appLogoUrl } = useAppConfig()

  return (
    <div className='relative container grid h-svh flex-col items-center justify-center lg:max-w-none lg:grid-cols-2 lg:px-0'>
      <div className='lg:p-8'>
        <div className='mx-auto flex w-full flex-col justify-center space-y-2 py-8 sm:w-120 sm:p-8'>
          <div className='mb-4 flex items-center justify-center gap-3'>
            {appLogoUrl ? (
              <div className='flex size-11 shrink-0 items-center justify-center rounded-xl bg-background border border-border/60 p-1 shadow-2xs'>
                <img
                  src={appLogoUrl}
                  alt={appName}
                  className='h-full w-full object-contain'
                />
              </div>
            ) : (
              <Logo className='size-8 shrink-0' />
            )}
            <div className='text-start'>
              <h1 className='text-lg font-bold leading-tight tracking-tight text-foreground'>
                {appName}
              </h1>
              <p className='text-xs text-muted-foreground leading-snug'>
                {instanceName}
              </p>
            </div>
          </div>
        </div>
        <div className='mx-auto flex w-full max-w-sm flex-col justify-center space-y-2'>
          <UserAuthForm redirectTo={redirect} />
        </div>
      </div>

      <LoginBannerCarousel />
    </div>
  )
}
