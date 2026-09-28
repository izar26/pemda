import { ContentSection } from '../components/content-section'
import { ProfileForm } from './profile-form'

export function SettingsProfile() {
  return (
    <ContentSection
      title='Profil Kedinasan Pegawai'
      desc='Kelola data identitas, NIP, instansi perangkat daerah, jabatan, dan golongan kedinasan Anda.'
    >
      <ProfileForm />
    </ContentSection>
  )
}
