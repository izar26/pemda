import { useEffect, useRef, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  Building2,
  Clock,
  ImageIcon,
  KeyRound,
  Lock,
  Mail,
  Phone,
  Save,
  Shield,
  Trash2,
  UploadCloud,
  Loader2,
} from 'lucide-react'
import { systemSettingService } from '@/services/system-setting-service'
import { usePermissions } from '@/hooks/use-permissions'
import { Header } from '@/components/layout/header'
import { NavbarStatus } from '@/components/layout/navbar-status'
import { Main } from '@/components/layout/main'
import { PageHeader } from '@/components/layout/page-header'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { ConfigDrawer } from '@/components/config-drawer'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'

export function SystemSettings() {
  const queryClient = useQueryClient()
  const { hasPermission } = usePermissions()
  const canEdit = hasPermission('settings.edit')

  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isUploadingLogo, setIsUploadingLogo] = useState(false)
  const [isDeletingLogo, setIsDeletingLogo] = useState(false)

  const { data: settings = [], isLoading } = useQuery({
    queryKey: ['system-settings'],
    queryFn: () => systemSettingService.getSettings(),
  })

  // Extract current logo asset URL
  const currentLogoUrl = settings.find((s) => s.key === 'app_logo')?.asset_url

  // Local form state
  const [formData, setFormData] = useState<Record<string, string | boolean | number>>({})
  const isLoadedRef = useRef(false)

  useEffect(() => {
    if (settings && settings.length > 0 && !isLoadedRef.current) {
      isLoadedRef.current = true
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
      setFormData(initial)
    }
  }, [settings])

  const mutation = useMutation({
    mutationFn: (newSettings: Record<string, unknown>) =>
      systemSettingService.updateSettings(newSettings),
    onSuccess: (res) => {
      isLoadedRef.current = false
      toast.success(res.message || 'Pengaturan sistem berhasil disimpan!')
      queryClient.invalidateQueries({ queryKey: ['system-settings'] })
      queryClient.invalidateQueries({ queryKey: ['app-config'] })
      queryClient.invalidateQueries({ queryKey: ['audit-logs'] })
    },
    onError: () => {
      toast.error('Gagal memperbarui pengaturan sistem.')
    },
  })

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Ukuran berkas logo maksimal 2 MB.')
      e.target.value = ''
      return
    }

    // Validate mime
    const allowed = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/svg+xml']
    if (!allowed.includes(file.type) && !file.name.endsWith('.svg')) {
      toast.error('Format berkas tidak didukung. Harap pilih PNG, JPG, WebP, atau SVG.')
      e.target.value = ''
      return
    }

    try {
      setIsUploadingLogo(true)
      const res = await systemSettingService.uploadLogo(file)
      toast.success(res.message || 'Logo resmi berhasil diunggah!')
      queryClient.invalidateQueries({ queryKey: ['system-settings'] })
      queryClient.invalidateQueries({ queryKey: ['app-config'] })
      queryClient.invalidateQueries({ queryKey: ['audit-logs'] })
    } catch {
      toast.error('Gagal mengunggah logo aplikasi.')
    } finally {
      setIsUploadingLogo(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  async function handleDeleteLogo() {
    if (!canEdit || isDeletingLogo) return

    try {
      setIsDeletingLogo(true)
      const res = await systemSettingService.deleteLogo()
      toast.success(res.message || 'Logo aplikasi berhasil dihapus.')
      queryClient.invalidateQueries({ queryKey: ['system-settings'] })
      queryClient.invalidateQueries({ queryKey: ['app-config'] })
      queryClient.invalidateQueries({ queryKey: ['audit-logs'] })
    } catch {
      toast.error('Gagal menghapus logo aplikasi.')
    } finally {
      setIsDeletingLogo(false)
    }
  }

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
        <NavbarStatus />
        <ThemeSwitch />
        <ConfigDrawer />
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
              Konfigurasi identitas resmi instansi, kontak layanan terpadu, dan parameter batas sesi keamanan peramban.
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

        {/* Hidden File Input for Logo */}
        <input
          ref={fileInputRef}
          type='file'
          accept='image/png,image/jpeg,image/webp,image/svg+xml'
          className='hidden'
          onChange={handleLogoUpload}
        />

        {/* Form Sections */}
        <form onSubmit={handleSubmit} className='grid gap-5'>
          {/* Card 1: Identitas Visual & Logo Instansi */}
          <Card className='shadow-2xs'>
            <CardHeader className='pb-3'>
              <div className='flex items-center gap-2'>
                <div className='p-1.5 rounded-md bg-primary/10 text-primary'>
                  <ImageIcon className='h-4 w-4' />
                </div>
                <div>
                  <CardTitle className='text-sm font-semibold'>Logo & Identitas Visual Aplikasi</CardTitle>
                  <CardDescription className='text-xs'>
                    Logo resmi pemerintah daerah atau aplikasi yang tampil di sudut kiri atas sidebar navigasi dan halaman login.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className='space-y-4 text-xs'>
              <div className='flex flex-col sm:flex-row items-start sm:items-center gap-5 p-4 rounded-lg border bg-muted/10'>
                {/* Logo Display / Dropzone Box */}
                <div className='relative flex h-24 w-24 shrink-0 items-center justify-center rounded-xl border border-dashed border-border/80 bg-background/80 p-2 shadow-2xs overflow-hidden'>
                  {isUploadingLogo ? (
                    <div className='flex flex-col items-center justify-center gap-1 text-muted-foreground'>
                      <Loader2 className='h-6 w-6 animate-spin text-primary' />
                      <span className='text-[10px]'>Mengunggah...</span>
                    </div>
                  ) : currentLogoUrl ? (
                    <img
                      src={currentLogoUrl}
                      alt='Logo Resmi Aplikasi'
                      className='h-full w-full object-contain'
                    />
                  ) : (
                    <div className='flex flex-col items-center justify-center gap-1 text-muted-foreground text-center'>
                      <UploadCloud className='h-7 w-7 text-muted-foreground/60' />
                      <span className='text-[9px] font-medium'>Bawaan</span>
                    </div>
                  )}
                </div>

                {/* Actions & Information */}
                <div className='space-y-2 flex-1'>
                  <div className='flex flex-wrap items-center gap-2'>
                    <Button
                      type='button'
                      variant='outline'
                      size='sm'
                      className='h-8 text-xs'
                      onClick={() => fileInputRef.current?.click()}
                      disabled={!canEdit || isUploadingLogo || isDeletingLogo}
                    >
                      <UploadCloud className='h-3.5 w-3.5 mr-1.5' />
                      {currentLogoUrl ? 'Ganti Logo' : 'Unggah Logo Baru'}
                    </Button>

                    {currentLogoUrl && canEdit && (
                      <Button
                        type='button'
                        variant='ghost'
                        size='sm'
                        className='h-8 text-xs text-destructive hover:bg-destructive/10'
                        onClick={handleDeleteLogo}
                        disabled={isDeletingLogo || isUploadingLogo}
                      >
                        {isDeletingLogo ? (
                          <Loader2 className='h-3.5 w-3.5 mr-1.5 animate-spin' />
                        ) : (
                          <Trash2 className='h-3.5 w-3.5 mr-1.5' />
                        )}
                        Hapus Logo (Reset)
                      </Button>
                    )}
                  </div>

                  <p className='text-[11px] text-muted-foreground leading-relaxed'>
                    Format didukung: <strong>PNG, WebP, SVG, JPG</strong> (Maks. 2 MB).
                    Disarankan menggunakan gambar berlatar belakang <strong>transparan</strong> agar serasi pada mode terang maupun gelap.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Card 2: Informasi Instansi & Portal */}
          <Card className='shadow-2xs'>
            <CardHeader className='pb-3'>
              <div className='flex items-center gap-2'>
                <div className='p-1.5 rounded-md bg-primary/10 text-primary'>
                  <Building2 className='h-4 w-4' />
                </div>
                <div>
                  <CardTitle className='text-sm font-semibold'>Identitas & Kontak Instansi</CardTitle>
                  <CardDescription className='text-xs'>
                    Informasi resmi pemerintah daerah yang digunakan pada judul sidebar, tab peramban, dan dokumen sistem.
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

          {/* Card 3: Keamanan & Kebijakan Sesi */}
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
            </CardContent>
          </Card>
        </form>
      </Main>
    </>
  )
}
