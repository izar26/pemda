import { useEffect, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  Building2,
  Clock,
  KeyRound,
  Lock,
  Mail,
  Phone,
  Save,
  Shield,
} from 'lucide-react'
import { systemSettingService } from '@/services/system-setting-service'
import { usePermissions } from '@/hooks/use-permissions'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { PageHeader } from '@/components/layout/page-header'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'

export function SystemSettings() {
  const queryClient = useQueryClient()
  const { hasPermission } = usePermissions()
  const canEdit = hasPermission('settings.edit')

  const { data: settings = [], isLoading } = useQuery({
    queryKey: ['system-settings'],
    queryFn: () => systemSettingService.getSettings(),
  })

  // Local form state
  const [formData, setFormData] = useState<Record<string, string | boolean | number>>({})

  useEffect(() => {
    if (settings.length > 0) {
      const initial: Record<string, string | boolean | number> = {}
      settings.forEach((s) => {
        if (s.type === 'boolean') {
          initial[s.key] = s.value === '1' || s.value === 'true'
        } else if (s.type === 'integer') {
          initial[s.key] = parseInt(s.value || '0', 10)
        } else {
          initial[s.key] = s.value || ''
        }
      })
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setFormData(initial)
    }
  }, [settings])

  const mutation = useMutation({
    mutationFn: (newSettings: Record<string, unknown>) =>
      systemSettingService.updateSettings(newSettings),
    onSuccess: (res) => {
      toast.success(res.message || 'Pengaturan sistem berhasil disimpan!')
      queryClient.invalidateQueries({ queryKey: ['system-settings'] })
      queryClient.invalidateQueries({ queryKey: ['audit-logs'] })
    },
    onError: () => {
      toast.error('Gagal memperbarui pengaturan sistem.')
    },
  })

  function handleChange(key: string, value: string | boolean | number) {
    setFormData((prev) => ({
      ...prev,
      [key]: value,
    }))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!canEdit) return
    mutation.mutate(formData)
  }

  return (
    <>
      <Header fixed>
        <Search className='me-auto' />
        <ThemeSwitch />
        <ProfileDropdown />
      </Header>

      <Main className='flex flex-1 flex-col gap-5 max-w-5xl mx-auto w-full'>
        {/* Page Title & Status (Sticky) */}
        <PageHeader className='flex flex-wrap items-center justify-between gap-3'>
          <div>
            <div className='flex items-center gap-2'>
              <h2 className='text-xl font-bold tracking-tight text-foreground'>
                Pengaturan Sistem Aplikasi ManRis
              </h2>
              {!canEdit && (
                <Badge variant='outline' className='text-amber-600 bg-amber-500/10 border-amber-200 text-xs'>
                  <Lock className='h-3 w-3 mr-1' /> Mode Hanya-Lihat
                </Badge>
              )}
            </div>
            <p className='text-xs text-muted-foreground mt-0.5'>
              Konfigurasi parameter operasional instansi, batas durasi keamanan sesi, dan kebijakan proteksi portal.
            </p>
          </div>

          {canEdit && (
            <Button
              size='sm'
              className='h-8 text-xs'
              onClick={handleSubmit}
              disabled={mutation.isPending || isLoading}
            >
              <Save className='h-3.5 w-3.5 mr-1.5' />
              {mutation.isPending ? 'Menyimpan...' : 'Simpan Pengaturan'}
            </Button>
          )}
        </PageHeader>

        {/* Form Sections */}
        <form onSubmit={handleSubmit} className='grid gap-5'>
          {/* Card 1: Informasi Instansi & Portal */}
          <Card className='shadow-2xs'>
            <CardHeader className='pb-3'>
              <div className='flex items-center gap-2'>
                <div className='p-1.5 rounded-md bg-primary/10 text-primary'>
                  <Building2 className='h-4 w-4' />
                </div>
                <div>
                  <CardTitle className='text-sm font-semibold'>Identitas & Kontak Instansi</CardTitle>
                  <CardDescription className='text-xs'>
                    Informasi resmi pemerintah daerah yang digunakan pada identitas sistem.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className='grid gap-4 sm:grid-cols-2 text-xs'>
              <div className='space-y-1.5'>
                <Label htmlFor='app_name' className='text-xs font-medium'>
                  Nama Portal Resmi
                </Label>
                <Input
                  id='app_name'
                  value={(formData.app_name as string) || ''}
                  onChange={(e) => handleChange('app_name', e.target.value)}
                  disabled={!canEdit}
                  className='h-8 text-xs bg-muted/20'
                  placeholder='Aplikasi ManRis'
                />
              </div>

              <div className='space-y-1.5'>
                <Label htmlFor='instance_name' className='text-xs font-medium'>
                  Nama Instansi Pemerintah
                </Label>
                <Input
                  id='instance_name'
                  value={(formData.instance_name as string) || ''}
                  onChange={(e) => handleChange('instance_name', e.target.value)}
                  disabled={!canEdit}
                  className='h-8 text-xs bg-muted/20'
                  placeholder='Pemerintah Daerah'
                />
              </div>

              <div className='space-y-1.5'>
                <Label htmlFor='contact_email' className='text-xs font-medium'>
                  Email Layanan / Helpdesk
                </Label>
                <div className='relative'>
                  <Mail className='absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground' />
                  <Input
                    id='contact_email'
                    type='email'
                    value={(formData.contact_email as string) || ''}
                    onChange={(e) => handleChange('contact_email', e.target.value)}
                    disabled={!canEdit}
                    className='h-8 pl-8 text-xs bg-muted/20'
                    placeholder='helpdesk@pemda.go.id'
                  />
                </div>
              </div>

              <div className='space-y-1.5'>
                <Label htmlFor='contact_phone' className='text-xs font-medium'>
                  Nomor Kontak Bantuan TI
                </Label>
                <div className='relative'>
                  <Phone className='absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground' />
                  <Input
                    id='contact_phone'
                    value={(formData.contact_phone as string) || ''}
                    onChange={(e) => handleChange('contact_phone', e.target.value)}
                    disabled={!canEdit}
                    className='h-8 pl-8 text-xs bg-muted/20'
                    placeholder='(021) 1234-5678'
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Card 2: Keamanan & Kebijakan Sesi */}
          <Card className='shadow-2xs'>
            <CardHeader className='pb-3'>
              <div className='flex items-center gap-2'>
                <div className='p-1.5 rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400'>
                  <Shield className='h-4 w-4' />
                </div>
                <div>
                  <CardTitle className='text-sm font-semibold'>Kebijakan Keamanan & Sesi</CardTitle>
                  <CardDescription className='text-xs'>
                    Kontrol otentikasi ketat dan parameter sesi guna mencegah akses tanpa hak.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className='space-y-4 text-xs'>
              <div className='grid gap-4 sm:grid-cols-2'>
                <div className='space-y-1.5'>
                  <Label htmlFor='session_lifetime_minutes' className='text-xs font-medium'>
                    Batas Waktu Sesi Tidak Aktif (Menit)
                  </Label>
                  <div className='relative'>
                    <Clock className='absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground' />
                    <Input
                      id='session_lifetime_minutes'
                      type='number'
                      min={15}
                      max={480}
                      value={(formData.session_lifetime_minutes as number) || 60}
                      onChange={(e) => handleChange('session_lifetime_minutes', parseInt(e.target.value, 10))}
                      disabled={!canEdit}
                      className='h-8 pl-8 text-xs bg-muted/20'
                    />
                  </div>
                  <p className='text-[10px] text-muted-foreground'>
                    Pengguna otomatis logout jika tidak ada interaksi selama durasi ini (rekomendasi: 60 menit).
                  </p>
                </div>

                <div className='space-y-1.5'>
                  <Label htmlFor='max_login_attempts' className='text-xs font-medium'>
                    Batas Maksimal Kesalahan Login
                  </Label>
                  <div className='relative'>
                    <KeyRound className='absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground' />
                    <Input
                      id='max_login_attempts'
                      type='number'
                      min={3}
                      max={10}
                      value={(formData.max_login_attempts as number) || 5}
                      onChange={(e) => handleChange('max_login_attempts', parseInt(e.target.value, 10))}
                      disabled={!canEdit}
                      className='h-8 pl-8 text-xs bg-muted/20'
                    />
                  </div>
                  <p className='text-[10px] text-muted-foreground'>
                    Akun diblokir sementara setelah jumlah kegagalan berturut-turut tercapai.
                  </p>
                </div>
              </div>

              <div className='border-t pt-3.5 space-y-3'>
                <div className='flex items-center justify-between gap-4 p-2.5 rounded-lg border bg-muted/10'>
                  <div>
                    <Label className='text-xs font-semibold'>Wajibkan 2FA untuk Akun Administrator</Label>
                    <p className='text-[11px] text-muted-foreground mt-0.5'>
                      Setiap akun dengan hak akses tingkat tinggi wajib mengaktifkan Google Authenticator.
                    </p>
                  </div>
                  <Switch
                    checked={Boolean(formData.require_2fa_for_admin)}
                    onCheckedChange={(val) => handleChange('require_2fa_for_admin', val)}
                    disabled={!canEdit}
                  />
                </div>

                <div className='flex items-center justify-between gap-4 p-2.5 rounded-lg border bg-amber-500/5 border-amber-200/50'>
                  <div>
                    <div className='flex items-center gap-1.5'>
                      <Label className='text-xs font-semibold text-amber-700 dark:text-amber-400'>
                        Mode Pemeliharaan Sistem (Maintenance)
                      </Label>
                      <Badge variant='outline' className='text-[10px] text-amber-600 border-amber-300'>Kritis</Badge>
                    </div>
                    <p className='text-[11px] text-muted-foreground mt-0.5'>
                      Membatasi login hanya bagi Superadmin selama proses pembaruan basis data server.
                    </p>
                  </div>
                  <Switch
                    checked={Boolean(formData.maintenance_mode)}
                    onCheckedChange={(val) => handleChange('maintenance_mode', val)}
                    disabled={!canEdit}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </form>
      </Main>
    </>
  )
}
