import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  Image as ImageIcon,
  Plus,
  Trash2,
  Edit,
  ArrowUp,
  ArrowDown,
  CheckCircle2,
  XCircle,
  Sparkles,
} from 'lucide-react'
import { bannerService } from '@/services/banner-service'
import { usePermissions } from '@/hooks/use-permissions'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { PageHeader } from '@/components/layout/page-header'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { ThemeSwitch } from '@/components/theme-switch'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { BannerFormDialog } from './components/banner-form-dialog'
import type { Banner } from '@/types/banner'

export function BannersManagement() {
  const queryClient = useQueryClient()
  const { hasPermission } = usePermissions()
  const canManage = hasPermission('content.manage')

  const [filterPlacement, setFilterPlacement] = useState<string>('login')
  const [formDialogOpen, setFormDialogOpen] = useState(false)
  const [editingBanner, setEditingBanner] = useState<Banner | null>(null)
  const [deleteBannerId, setDeleteBannerId] = useState<string | null>(null)

  // Fetch banners
  const { data: response, isLoading } = useQuery({
    queryKey: ['admin-banners', filterPlacement],
    queryFn: () => bannerService.getBanners({ placement: filterPlacement }),
  })

  const banners = response?.data || []

  // Toggle active mutation
  const toggleMutation = useMutation({
    mutationFn: (id: string) => bannerService.toggleActive(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-banners'] })
      queryClient.invalidateQueries({ queryKey: ['public-banners'] })
      toast.success('Status tayang banner berhasil diperbarui')
    },
    onError: () => {
      toast.error('Gagal mengubah status banner')
    },
  })

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => bannerService.deleteBanner(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-banners'] })
      queryClient.invalidateQueries({ queryKey: ['public-banners'] })
      toast.success('Banner berhasil dihapus')
      setDeleteBannerId(null)
    },
    onError: () => {
      toast.error('Gagal menghapus banner')
    },
  })

  // Reorder mutation
  const reorderMutation = useMutation({
    mutationFn: (bannerIds: string[]) => bannerService.reorderBanners(bannerIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-banners'] })
      queryClient.invalidateQueries({ queryKey: ['public-banners'] })
      toast.success('Urutan banner berhasil diperbarui')
    },
    onError: () => {
      toast.error('Gagal memperbarui urutan banner')
    },
  })

  const handleMove = (index: number, direction: 'up' | 'down') => {
    if (!canManage) return
    const targetIndex = direction === 'up' ? index - 1 : index + 1
    if (targetIndex < 0 || targetIndex >= banners.length) return

    const newBanners = [...banners]
    const temp = newBanners[index]
    newBanners[index] = newBanners[targetIndex]
    newBanners[targetIndex] = temp

    const ids = newBanners.map((b) => b.id)
    reorderMutation.mutate(ids)
  }

  const handleOpenAdd = () => {
    setEditingBanner(null)
    setFormDialogOpen(true)
  }

  const handleOpenEdit = (banner: Banner) => {
    setEditingBanner(banner)
    setFormDialogOpen(true)
  }

  return (
    <>
      <Header fixed>
        <div className='ms-auto flex items-center space-x-4'>
          <ThemeSwitch />
          <ProfileDropdown />
        </div>
      </Header>

      <Main>
        <PageHeader className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4'>
          <div className='space-y-0.5 min-w-0 flex-1'>
            <h2 className='text-2xl font-bold tracking-tight text-foreground'>
              Manajemen Banner Publik
            </h2>
            <p className='text-sm text-muted-foreground'>
              Kelola gambar slider/carousel dinamis untuk halaman login dan portal publik.
            </p>
          </div>
          {canManage && (
            <Button onClick={handleOpenAdd} className='gap-2'>
              <Plus className='h-4 w-4' />
              Tambah Banner
            </Button>
          )}
        </PageHeader>

        {/* Filter Tab & Info Bar */}
        <div className='mb-6 flex flex-wrap items-center justify-between gap-4'>
          <div className='flex items-center gap-2'>
            <Button
              variant={filterPlacement === 'login' ? 'default' : 'outline'}
              size='sm'
              onClick={() => setFilterPlacement('login')}
            >
              Banner Login ({banners.filter((b) => b.placement === 'login').length})
            </Button>
            <Button
              variant={filterPlacement === 'homepage' ? 'default' : 'outline'}
              size='sm'
              onClick={() => setFilterPlacement('homepage')}
            >
              Banner Homepage
            </Button>
          </div>

          <div className='flex items-center gap-2 text-xs text-muted-foreground'>
            <Sparkles className='h-4 w-4 text-primary' />
            <span>Gambar otomatis dikompresi ke WebP & dioptimasi untuk UX cepat</span>
          </div>
        </div>

        {/* Banner List Grid */}
        {isLoading ? (
          <div className='grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3'>
            {[1, 2, 3].map((i) => (
              <Card key={i} className='animate-pulse'>
                <div className='aspect-[9/16] max-h-64 w-full bg-muted' />
                <CardHeader className='space-y-2'>
                  <div className='h-4 w-3/4 rounded bg-muted' />
                  <div className='h-3 w-1/2 rounded bg-muted' />
                </CardHeader>
              </Card>
            ))}
          </div>
        ) : banners.length === 0 ? (
          <Card className='border-dashed'>
            <CardContent className='flex flex-col items-center justify-center py-12 text-center'>
              <div className='rounded-full bg-muted p-4 text-muted-foreground'>
                <ImageIcon className='h-8 w-8' />
              </div>
              <h3 className='mt-4 text-lg font-semibold'>Belum Ada Banner</h3>
              <p className='mt-1 max-w-md text-sm text-muted-foreground'>
                {filterPlacement === 'login'
                  ? 'Saat belum ada banner kustom, halaman login otomatis memakai gambar dashboard bawaan sistem.'
                  : 'Belum ada banner publik untuk penempatan ini.'}
              </p>
              {canManage && (
                <Button onClick={handleOpenAdd} className='mt-6 gap-2'>
                  <Plus className='h-4 w-4' />
                  Unggah Banner Pertama
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className='grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'>
            {banners.map((banner, index) => (
              <Card key={banner.id} className='overflow-hidden flex flex-col group'>
                {/* Image Container */}
                <div className='relative aspect-[9/16] max-h-72 w-full overflow-hidden bg-neutral-900'>
                  <img
                    src={banner.image_url}
                    alt={banner.title || 'Banner'}
                    className='h-full w-full object-cover transition-transform duration-300 group-hover:scale-105'
                  />

                  {/* Badges Overlay */}
                  <div className='absolute top-3 left-3 flex items-center gap-1.5'>
                    <Badge variant='secondary' className='text-xs font-mono bg-black/60 text-white backdrop-blur-xs'>
                      #{index + 1}
                    </Badge>
                    {banner.is_active ? (
                      <Badge className='bg-emerald-600/90 text-white text-xs backdrop-blur-xs'>
                        <CheckCircle2 className='me-1 h-3 w-3' /> Aktif
                      </Badge>
                    ) : (
                      <Badge variant='destructive' className='text-xs backdrop-blur-xs'>
                        <XCircle className='me-1 h-3 w-3' /> Nonaktif
                      </Badge>
                    )}
                  </div>

                  {banner.meta?.size && (
                    <div className='absolute bottom-3 right-3'>
                      <Badge variant='secondary' className='text-[10px] font-mono bg-black/60 text-white backdrop-blur-xs'>
                        {Math.round(banner.meta.size / 1024)} KB WebP
                      </Badge>
                    </div>
                  )}
                </div>

                {/* Details */}
                <CardHeader className='p-4 pb-2 flex-1'>
                  <CardTitle className='text-base line-clamp-1'>
                    {banner.title || 'Tanpa Judul'}
                  </CardTitle>
                  <CardDescription className='text-xs line-clamp-2'>
                    {banner.description || 'Tidak ada keterangan tambahan.'}
                  </CardDescription>
                </CardHeader>

                {/* Actions Footer */}
                <CardContent className='p-4 pt-2 border-t mt-auto flex items-center justify-between gap-2 bg-muted/20'>
                  {/* Status Toggle */}
                  <div className='flex items-center gap-2'>
                    <Switch
                      checked={banner.is_active}
                      onCheckedChange={() => toggleMutation.mutate(banner.id)}
                      disabled={!canManage || toggleMutation.isPending}
                    />
                    <span className='text-xs text-muted-foreground'>
                      {banner.is_active ? 'Tayang' : 'Mati'}
                    </span>
                  </div>

                  {/* Reorder and Edit Actions */}
                  <div className='flex items-center gap-1'>
                    {canManage && (
                      <>
                        <Button
                          variant='ghost'
                          size='icon'
                          className='h-7 w-7'
                          disabled={index === 0 || reorderMutation.isPending}
                          onClick={() => handleMove(index, 'up')}
                          title='Geser ke atas'
                        >
                          <ArrowUp className='h-3.5 w-3.5' />
                        </Button>
                        <Button
                          variant='ghost'
                          size='icon'
                          className='h-7 w-7'
                          disabled={index === banners.length - 1 || reorderMutation.isPending}
                          onClick={() => handleMove(index, 'down')}
                          title='Geser ke bawah'
                        >
                          <ArrowDown className='h-3.5 w-3.5' />
                        </Button>
                        <Button
                          variant='ghost'
                          size='icon'
                          className='h-7 w-7'
                          onClick={() => handleOpenEdit(banner)}
                          title='Edit banner'
                        >
                          <Edit className='h-3.5 w-3.5' />
                        </Button>
                        <Button
                          variant='ghost'
                          size='icon'
                          className='h-7 w-7 text-destructive hover:text-destructive'
                          onClick={() => setDeleteBannerId(banner.id)}
                          title='Hapus banner'
                        >
                          <Trash2 className='h-3.5 w-3.5' />
                        </Button>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </Main>

      {/* Form Dialog */}
      <BannerFormDialog
        open={formDialogOpen}
        onOpenChange={setFormDialogOpen}
        banner={editingBanner}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['admin-banners'] })
          queryClient.invalidateQueries({ queryKey: ['public-banners'] })
        }}
      />

      {/* Delete Confirmation Alert */}
      <AlertDialog
        open={!!deleteBannerId}
        onOpenChange={(open) => !open && setDeleteBannerId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Banner?</AlertDialogTitle>
            <AlertDialogDescription>
              Tindakan ini tidak dapat dibatalkan. File gambar banner akan dihapus permanen dari server.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteBannerId && deleteMutation.mutate(deleteBannerId)}
              className='bg-destructive text-destructive-foreground hover:bg-destructive/90'
            >
              Hapus Sekarang
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
