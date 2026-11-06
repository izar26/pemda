import { useState } from 'react'
import { isAxiosError } from 'axios'
import { toast } from 'sonner'
import { AlertTriangle, Trash2 } from 'lucide-react'
import { perencanaanService } from '@/services/perencanaan-service'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { useTujuan } from '../tujuan-provider'

export interface TujuanDeleteDialogsProps {
  onSuccess: () => void
}

export function TujuanDeleteDialogs({ onSuccess }: { onSuccess: () => void }) {
  const {
    open,
    setOpen,
    currentRow,
    setCurrentRow,
    currentSasaran,
    setCurrentSasaran,
    currentIndikator,
    setCurrentIndikator,
  } = useTujuan()
  const [isDeleting, setIsDeleting] = useState(false)

  async function handleDeleteTujuan() {
    if (!currentRow) return
    setIsDeleting(true)
    try {
      const res = await perencanaanService.deleteTujuan(currentRow.id)
      toast.success(res.message)
      onSuccess()
      setOpen(null)
      setCurrentRow(null)
    } catch (error) {
      if (isAxiosError(error) && error.response?.data?.message) {
        toast.error(error.response.data.message)
      } else {
        toast.error('Gagal menghapus data tujuan.')
      }
    } finally {
      setIsDeleting(false)
    }
  }

  async function handleDeleteSasaran() {
    if (!currentSasaran) return
    setIsDeleting(true)
    try {
      const res = await perencanaanService.deleteSasaran(currentSasaran.id)
      toast.success(res.message)
      onSuccess()
      setOpen(null)
      setCurrentSasaran(null)
    } catch (error) {
      if (isAxiosError(error) && error.response?.data?.message) {
        toast.error(error.response.data.message)
      } else {
        toast.error('Gagal menghapus data sasaran.')
      }
    } finally {
      setIsDeleting(false)
    }
  }

  async function handleDeleteIndikator() {
    if (!currentIndikator) return
    setIsDeleting(true)
    try {
      const res = await perencanaanService.deleteIndikator(currentIndikator.id)
      toast.success(res.message)
      onSuccess()
      setOpen(null)
      setCurrentIndikator(null)
    } catch (error) {
      if (isAxiosError(error) && error.response?.data?.message) {
        toast.error(error.response.data.message)
      } else {
        toast.error('Gagal menghapus data indikator.')
      }
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <>
      {/* Delete Tujuan */}
      {currentRow && (
        <ConfirmDialog
          open={open === 'delete'}
          onOpenChange={(val) => {
            if (!val) {
              setOpen(null)
              setCurrentRow(null)
            }
          }}
          handleConfirm={handleDeleteTujuan}
          isLoading={isDeleting}
          title={
            <span className='flex items-center gap-2 text-destructive'>
              <AlertTriangle className='h-5 w-5' />
              Hapus Tujuan Strategis
            </span>
          }
          desc={
            <div className='space-y-2 text-xs'>
              <p>
                Apakah Anda yakin ingin menghapus tujuan pada{' '}
                <span className='font-semibold text-foreground'>
                  {currentRow.opd?.nama}
                </span>
                ?
              </p>
              <div className='rounded-md bg-muted/60 p-2.5 border text-foreground font-medium'>
                &ldquo;{currentRow.tujuan}&rdquo;
              </div>
              <p className='text-destructive font-medium'>
                Perhatian: Penghapusan akan ditolak oleh sistem jika tujuan ini masih memiliki Sasaran/Indikator atau digunakan pada Konteks Penilaian (Form 2B). Bersihkan data dari bawah terlebih dahulu.
              </p>
            </div>
          }
          confirmText={
            <span className='flex items-center gap-1.5'>
              <Trash2 className='h-3.5 w-3.5' />
              Ya, Hapus Tujuan
            </span>
          }
          destructive
        />
      )}

      {/* Delete Sasaran */}
      {currentSasaran && (
        <ConfirmDialog
          open={open === 'delete-sasaran'}
          onOpenChange={(val) => {
            if (!val) {
              setOpen(null)
              setCurrentSasaran(null)
            }
          }}
          handleConfirm={handleDeleteSasaran}
          isLoading={isDeleting}
          title={
            <span className='flex items-center gap-2 text-destructive'>
              <AlertTriangle className='h-5 w-5' />
              Hapus Sasaran Strategis
            </span>
          }
          desc={
            <div className='space-y-2 text-xs'>
              <p>Apakah Anda yakin ingin menghapus sasaran ini?</p>
              <div className='rounded-md bg-muted/60 p-2.5 border text-foreground font-medium'>
                &ldquo;{currentSasaran.sasaran}&rdquo;
              </div>
              <p className='text-destructive font-medium'>
                Perhatian: Penghapusan akan ditolak oleh sistem jika sasaran ini masih memiliki Indikator atau digunakan pada Konteks Penilaian (Form 2B). Bersihkan data dari bawah terlebih dahulu.
              </p>
            </div>
          }
          confirmText={
            <span className='flex items-center gap-1.5'>
              <Trash2 className='h-3.5 w-3.5' />
              Ya, Hapus Sasaran
            </span>
          }
          destructive
        />
      )}

      {/* Delete Indikator */}
      {currentIndikator && (
        <ConfirmDialog
          open={open === 'delete-indikator'}
          onOpenChange={(val) => {
            if (!val) {
              setOpen(null)
              setCurrentIndikator(null)
            }
          }}
          handleConfirm={handleDeleteIndikator}
          isLoading={isDeleting}
          title={
            <span className='flex items-center gap-2 text-destructive'>
              <AlertTriangle className='h-5 w-5' />
              Hapus Indikator Kinerja
            </span>
          }
          desc={
            <div className='space-y-2 text-xs'>
              <p>
                Apakah Anda yakin ingin menghapus indikator{' '}
                <span className='font-semibold text-foreground'>
                  ({currentIndikator.jenis})
                </span>{' '}
                berikut?
              </p>
              <div className='rounded-md bg-muted/60 p-2.5 border text-foreground font-medium'>
                &ldquo;{currentIndikator.indikator}&rdquo;
              </div>
            </div>
          }
          confirmText={
            <span className='flex items-center gap-1.5'>
              <Trash2 className='h-3.5 w-3.5' />
              Ya, Hapus Indikator
            </span>
          }
          destructive
        />
      )}
    </>
  )
}
