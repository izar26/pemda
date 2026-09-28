import { ContentSection } from '../components/content-section'
import { TwoFactorSection } from './two-factor-section'
import { AccountForm } from './account-form'
import { Separator } from '@/components/ui/separator'

export function SettingsAccount() {
  return (
    <ContentSection
      title='Akun & Keamanan'
      desc='Kelola preferensi akun dan tingkatkan perlindungan dengan Autentikasi Dua Faktor (2FA).'
    >
      <div className='space-y-6'>
        <TwoFactorSection />
        <Separator />
        <AccountForm />
      </div>
    </ContentSection>
  )
}
