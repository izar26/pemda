import { ContentSection } from '../components/content-section'
import { TwoFactorSection } from './two-factor-section'
import { ChangePasswordForm } from './change-password-form'
import { Separator } from '@/components/ui/separator'

export function SettingsAccount() {
  return (
    <ContentSection
      title='Keamanan Akun'
      desc='Kelola keamanan autentikasi akun Anda: Autentikasi Dua Faktor (2FA) Google Authenticator dan pembaruan kata sandi.'
    >
      <div className='space-y-6'>
        <TwoFactorSection />
        <Separator />
        <ChangePasswordForm />
      </div>
    </ContentSection>
  )
}
