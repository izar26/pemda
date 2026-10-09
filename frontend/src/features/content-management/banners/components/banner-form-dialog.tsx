import { useState, useRef, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { ImageCropperDialog } from '@/components/image-cropper-dialog'
import { bannerService } from '@/services/banner-service'
import { toast } from 'sonner'
import {
  UploadCloud,
  Image as ImageIcon,
  Crop,
  Loader2,
  Save,
} from 'lucide-react'
import type { Banner } from '@/types/banner'

interface BannerFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  banner?: Banner | null
  onSuccess: () => void
}

export function BannerFormDialog({
  open,
  onOpenChange,
  banner,
  onSuccess,
}: BannerFormDialogProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [placement, setPlacement] = useState('login')
  const [isActive, setIsActive] = useState(true)

  // Cropper states
  const [rawImageSrc, setRawImageSrc] = useState<string | null>(null)
  const [cropperOpen, setCropperOpen] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Reset or initialize on open
  useEffect(() => {
    if (open) {
      if (banner) {
        setTitle(banner.title || '')
        setDescription(banner.description || '')
        setPlacement(banner.placement || 'login')
        setIsActive(banner.is_active)
        setPreviewUrl(banner.image_url)
        setSelectedFile(null)
      } else {
        setTitle('')
        setDescription('')
        setPlacement('login')
        setIsActive(true)
        setPreviewUrl(null)
        setSelectedFile(null)
      }
      setRawImageSrc(null)
    }
  }, [open, banner])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      toast.error('File yang dipilih harus berupa format gambar')
      return
    }

    const reader = new FileReader()
    reader.onload = () => {
      setRawImageSrc(reader.result as string)
      setCropperOpen(true)
    }
    reader.readAsDataURL(file)

    // Reset input value so same file can be chosen again if needed
    e.target.value = ''
  }

  const handleCropComplete = (croppedFile: File, newPreviewUrl: string) => {
    setSelectedFile(croppedFile)
    setPreviewUrl(newPreviewUrl)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!banner && !selectedFile) {
      toast.error('Silakan pilih dan sesuaikan gambar banner terlebih dahulu')
      return
    }

    try {
      setIsSubmitting(true)
      const formData = new FormData()
      if (title.trim()) formData.append('title', title.trim())
      if (description.trim()) formData.append('description', description.trim())
      formData.append('placement', placement)
      formData.append('is_active', isActive ? '1' : '0')

      if (selectedFile) {
        formData.append('image', selectedFile)
      }

      if (banner) {
        await bannerService.updateBanner(banner.id, formData)
        toast.success('Banner berhasil diperbarui')
      } else {
        await bannerService.createBanner(formData)
        toast.success('Banner berhasil ditambahkan dan dioptimasi')
      }

      onSuccess()
      onOpenChange(false)
    } catch (error: any) {
      const msg = error?.response?.data?.message || 'Gagal menyimpan banner'
      toast.error(msg)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className='sm:max-w-xl max-h-[88vh] flex flex-col p-0 gap-0 overflow-hidden shadow-2xl'>
          {/* Pinned Header (Konsisten dengan Dialog sistem) */}
          <DialogHeader className='px-6 pt-5 pb-4 border-b bg-muted/10 shrink-0 text-start'>
            <div className='flex items-center gap-3'>
              <div className='flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary'>
                <ImageIcon className='h-5 w-5' />
              </div>
              <div>
                <DialogTitle className='text-lg font-bold text-foreground'>
                  {banner ? 'Edit Banner Konten' : 'Tambah Banner Baru'}
                </DialogTitle>
                <DialogDescription className='text-xs text-muted-foreground mt-0.5'>
                  {banner
                    ? 'Perbarui informasi judul atau ganti gambar banner.'
                    : 'Unggah gambar banner. Gambar akan otomatis dikompresi ke WebP & dioptimasi di server.'}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {/* Scrollable Form Body (Bisa di-scroll bebas & tidak memotong footer) */}
          <div className='flex-1 overflow-y-auto px-6 py-4 min-h-0'>
            <form id='banner-dialog-form' onSubmit={handleSubmit} className='space-y-4'>
              {/* Image Upload & Preview */}
              <div className='space-y-2'>
                <Label className='text-xs font-semibold'>
                  Gambar Banner {banner ? '(Opsional ganti)' : <span className='text-destructive'>*</span>}
                </Label>
                <input
                  ref={fileInputRef}
                  type='file'
                  accept='image/*'
                  className='hidden'
                  onChange={handleFileChange}
                />

                {previewUrl ? (
                  <div className='overflow-hidden rounded-lg border bg-muted/20 p-3'>
                    <div className='relative aspect-[9/16] max-h-52 mx-auto overflow-hidden rounded-md bg-neutral-900 flex items-center justify-center border shadow-xs'>
                      <img
                        src={previewUrl}
                        alt='Preview banner'
                        className='h-full w-full object-cover'
                      />
                    </div>
                    <div className='mt-3 flex items-center justify-center gap-2'>
                      <Button
                        type='button'
                        variant='outline'
                        size='sm'
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isSubmitting}
                      >
                        <UploadCloud className='me-1.5 h-3.5 w-3.5' />
                        Ganti Foto
                      </Button>
                      {rawImageSrc && (
                        <Button
                          type='button'
                          variant='secondary'
                          size='sm'
                          onClick={() => setCropperOpen(true)}
                          disabled={isSubmitting}
                        >
                          <Crop className='me-1.5 h-3.5 w-3.5' />
                          Atur Potongan Ulang
                        </Button>
                      )}
                    </div>
                  </div>
                ) : (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className='flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-muted-foreground/30 p-8 text-center hover:bg-muted/30 cursor-pointer transition-colors'
                  >
                    <div className='rounded-full bg-primary/10 p-3 text-primary'>
                      <UploadCloud className='h-6 w-6' />
                    </div>
                    <div className='text-sm font-semibold text-foreground'>
                      Klik untuk memilih & potong gambar
                    </div>
                    <p className='text-xs text-muted-foreground'>
                      Format didukung: JPG, PNG, WebP (Rasio ideal 9:16 untuk login)
                    </p>
                  </div>
                )}
              </div>

              {/* Title */}
              <div className='space-y-1.5'>
                <Label htmlFor='banner-title' className='text-xs font-semibold'>
                  Judul Banner (Opsional)
                </Label>
                <Input
                  id='banner-title'
                  placeholder='Contoh: Selamat Datang di Portal PEMDA'
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  disabled={isSubmitting}
                  maxLength={255}
                />
              </div>

              {/* Description */}
              <div className='space-y-1.5'>
                <Label htmlFor='banner-description' className='text-xs font-semibold'>
                  Keterangan / Slogan (Opsional)
                </Label>
                <Input
                  id='banner-description'
                  placeholder='Contoh: Penerapan Manajemen Risiko Terintegrasi'
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  disabled={isSubmitting}
                  maxLength={500}
                />
              </div>

              {/* Placement */}
              <div className='space-y-1.5'>
                <Label htmlFor='banner-placement' className='text-xs font-semibold'>
                  Penempatan Konten
                </Label>
                <select
                  id='banner-placement'
                  value={placement}
                  onChange={(e) => setPlacement(e.target.value)}
                  disabled={isSubmitting}
                  className='flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring'
                >
                  <option value='login'>Halaman Login (Login Carousel)</option>
                  <option value='homepage'>Dashboard / Homepage Publik</option>
                </select>
              </div>

              {/* Status Switch */}
              <div className='flex items-center justify-between rounded-lg border p-3.5 bg-muted/10'>
                <div className='space-y-0.5'>
                  <Label htmlFor='banner-active' className='text-xs font-semibold cursor-pointer'>
                    Status Tayang
                  </Label>
                  <p className='text-[11px] text-muted-foreground'>
                    {isActive ? 'Banner aktif dan tayang di halaman terpilih' : 'Banner nonaktif (disimpan sebagai draft)'}
                  </p>
                </div>
                <Switch
                  id='banner-active'
                  checked={isActive}
                  onCheckedChange={setIsActive}
                  disabled={isSubmitting}
                />
              </div>
            </form>
          </div>

          {/* Pinned Footer (Selalu terlihat di bawah, tidak pernah terpotong) */}
          <DialogFooter className='px-6 py-3 border-t bg-muted/10 shrink-0 flex items-center justify-end gap-2'>
            <Button
              type='button'
              variant='outline'
              size='sm'
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Batal
            </Button>
            <Button
              type='submit'
              size='sm'
              form='banner-dialog-form'
              disabled={isSubmitting}
              className='min-w-[120px]'
            >
              {isSubmitting ? (
                <>
                  <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                  Menyimpan...
                </>
              ) : (
                <>
                  <Save className='mr-1.5 h-4 w-4' />
                  {banner ? 'Simpan Perubahan' : 'Simpan Banner'}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Embedded Cropper Modal */}
      <ImageCropperDialog
        open={cropperOpen}
        imageSrc={rawImageSrc}
        onOpenChange={setCropperOpen}
        onCropComplete={handleCropComplete}
        aspectRatio={9 / 16}
      />
    </>
  )
}
