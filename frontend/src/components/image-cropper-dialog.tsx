import { useState, useCallback } from 'react'
import Cropper, { type Area } from 'react-easy-crop'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { getCroppedImg, type PixelCrop } from '@/lib/crop-image'
import { ZoomIn, ZoomOut, RotateCw, Crop, Loader2, Check } from 'lucide-react'

interface ImageCropperDialogProps {
  open: boolean
  imageSrc: string | null
  onOpenChange: (open: boolean) => void
  onCropComplete: (croppedFile: File, previewUrl: string) => void
  aspectRatio?: number
}

export function ImageCropperDialog({
  open,
  imageSrc,
  onOpenChange,
  onCropComplete,
  aspectRatio = 9 / 16,
}: ImageCropperDialogProps) {
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [rotation, setRotation] = useState(0)
  const [selectedRatio, setSelectedRatio] = useState<number>(aspectRatio)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<PixelCrop | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)

  const handleCropComplete = useCallback((_croppedArea: Area, croppedAreaPixels: Area) => {
    setCroppedAreaPixels(croppedAreaPixels)
  }, [])

  const handleApply = async () => {
    if (!imageSrc || !croppedAreaPixels) return

    try {
      setIsProcessing(true)
      const croppedFile = await getCroppedImg(
        imageSrc,
        croppedAreaPixels,
        `banner-${Date.now()}.jpg`
      )
      const previewUrl = URL.createObjectURL(croppedFile)
      onCropComplete(croppedFile, previewUrl)
      onOpenChange(false)
    } catch (error) {
      console.error('Failed to crop image:', error)
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-2xl max-h-[92vh] flex flex-col p-0 gap-0 overflow-hidden shadow-2xl'>
        {/* Pinned Header */}
        <DialogHeader className='px-6 pt-5 pb-4 border-b bg-muted/10 shrink-0 text-start'>
          <div className='flex items-center gap-3'>
            <div className='flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary'>
              <Crop className='h-5 w-5' />
            </div>
            <div>
              <DialogTitle className='text-lg font-bold text-foreground'>
                Sesuaikan & Potong Gambar
              </DialogTitle>
              <DialogDescription className='text-xs text-muted-foreground mt-0.5'>
                Geser dan sesuaikan zoom untuk memastikan konten visual berada di area fokus utama.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Scrollable / Flexible Body */}
        <div className='flex-1 overflow-y-auto px-6 py-4 min-h-0 space-y-4'>
          {imageSrc && (
            <>
              {/* Cropper Container */}
              <div className='relative h-[320px] sm:h-[380px] w-full overflow-hidden rounded-lg bg-neutral-950 border'>
                <Cropper
                  image={imageSrc}
                  crop={crop}
                  zoom={zoom}
                  rotation={rotation}
                  aspect={selectedRatio}
                  onCropChange={setCrop}
                  onZoomChange={setZoom}
                  onCropComplete={handleCropComplete}
                  showGrid
                />
              </div>

              {/* Controls */}
              <div className='flex flex-wrap items-center justify-between gap-3 p-2.5 rounded-lg border bg-muted/15'>
                {/* Ratio Presets */}
                <div className='flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground'>
                  <span className='font-semibold text-foreground text-xs me-1'>Rasio:</span>
                  <Button
                    type='button'
                    size='sm'
                    variant={selectedRatio === 9 / 16 ? 'default' : 'outline'}
                    className='h-7 text-xs px-2.5'
                    onClick={() => setSelectedRatio(9 / 16)}
                  >
                    9:16 (Login Vertikal)
                  </Button>
                  <Button
                    type='button'
                    size='sm'
                    variant={selectedRatio === 3 / 4 ? 'default' : 'outline'}
                    className='h-7 text-xs px-2.5'
                    onClick={() => setSelectedRatio(3 / 4)}
                  >
                    3:4 (Portrait)
                  </Button>
                  <Button
                    type='button'
                    size='sm'
                    variant={selectedRatio === 16 / 9 ? 'default' : 'outline'}
                    className='h-7 text-xs px-2.5'
                    onClick={() => setSelectedRatio(16 / 9)}
                  >
                    16:9 (Landscape)
                  </Button>
                </div>

                {/* Zoom & Rotation Controls */}
                <div className='flex items-center gap-3 ms-auto'>
                  <div className='flex items-center gap-2'>
                    <ZoomOut className='h-4 w-4 text-muted-foreground' />
                    <input
                      type='range'
                      min={1}
                      max={3}
                      step={0.05}
                      value={zoom}
                      onChange={(e) => setZoom(Number(e.target.value))}
                      className='h-1.5 w-24 cursor-pointer accent-primary'
                    />
                    <ZoomIn className='h-4 w-4 text-muted-foreground' />
                  </div>
                  <Button
                    type='button'
                    size='icon'
                    variant='outline'
                    className='h-8 w-8'
                    onClick={() => setRotation((r) => (r + 90) % 360)}
                    title='Putar 90°'
                  >
                    <RotateCw className='h-4 w-4' />
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Pinned Footer (Selalu kelihatan & tidak pernah terpotong) */}
        <DialogFooter className='px-6 py-3 border-t bg-muted/10 shrink-0 flex items-center justify-end gap-2'>
          <Button
            type='button'
            variant='outline'
            size='sm'
            onClick={() => onOpenChange(false)}
            disabled={isProcessing}
          >
            Batal
          </Button>
          <Button
            type='button'
            size='sm'
            onClick={handleApply}
            disabled={isProcessing}
            className='min-w-[140px]'
          >
            {isProcessing ? (
              <>
                <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                Memotong...
              </>
            ) : (
              <>
                <Check className='mr-1.5 h-4 w-4' />
                Terapkan Potongan
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
