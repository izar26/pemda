import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { AlertTriangle, Loader2, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { isAxiosError } from 'axios'
import { auditService } from '@/services/audit-service'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { PasswordInput } from '@/components/password-input'

interface AuditDestroyAllDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

export function AuditDestroyAllDialog({
  open,
  onOpenChange,
  onSuccess,
}: AuditDestroyAllDialogProps) {
  const queryClient = useQueryClient()
  const [password, setPassword] = useState('')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const destroyMutation = useMutation({
    mutationFn: async (pwd: string) => {
      return auditService.destroyAllLogs(pwd)
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['audit-logs'] })
      queryClient.invalidateQueries({ queryKey: ['audit-stats'] })
      toast.success(res.message)
      setPassword('')
      setErrorMessage(null)
      onOpenChange(false)
      onSuccess?.()
    },
    onError: (err) => {
      if (isAxiosError(err) && err.response?.data) {
        const data = err.response.data as {
          message?: string
          errors?: { password?: string[] }
        }
        const msg = data.errors?.password?.[0] || data.message || 'Gagal menghapus log audit.'
        setErrorMessage(msg)
        toast.error(msg)
      } else {
        const msg = 'Terjadi kesalahan sistem saat menghapus log audit.'
        setErrorMessage(msg)
        toast.error(msg)
      }
    },
  })

  const handleClose = (nextOpen: boolean) => {
    if (!nextOpen) {
      setPassword('')
      setErrorMessage(null)
    }
    onOpenChange(nextOpen)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!password.trim()) {
      setErrorMessage('Kata sandi Superadmin wajib dimasukkan untuk otorisasi.')
      return
    }
    setErrorMessage(null)
    destroyMutation.mutate(password)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className='max-w-md'>
        <form onSubmit={handleSubmit} className='space-y-4'>
          <DialogHeader>
            <div className='flex items-center gap-2 text-destructive'>
              <div className='flex h-9 w-9 items-center justify-center rounded-lg bg-destructive/10'>
                <AlertTriangle className='h-5 w-5 text-destructive' />
              </div>
              <div>
                <DialogTitle className='text-lg font-bold text-destructive'>
                  Hapus Permanen Seluruh Log
                </DialogTitle>
                <DialogDescription className='text-xs'>
                  Tindakan berisiko tinggi khusus Superadmin
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className='rounded-lg border border-destructive/30 bg-destructive/5 p-3.5 text-xs text-destructive-foreground'>
            <p className='font-semibold text-destructive'>
              Peringatan Kritis:
            </p>
            <p className='mt-1 leading-relaxed text-muted-foreground'>
              Aksi ini akan menghapus <span className='font-bold text-foreground'>SELURUH data log audit operasional</span> secara permanen dari basis data. Data yang telah dihapus <span className='font-bold text-destructive'>tidak dapat dipulihkan</span> kembali.
            </p>
          </div>

          <div className='space-y-2'>
            <Label htmlFor='superadmin-password' className='text-xs font-semibold'>
              Konfirmasi Kata Sandi Superadmin <span className='text-destructive'>*</span>
            </Label>
            <PasswordInput
              id='superadmin-password'
              placeholder='Masukkan kata sandi akun Anda...'
              value={password}
              onChange={(e) => {
                setPassword(e.target.value)
                if (errorMessage) setErrorMessage(null)
              }}
              autoFocus
              disabled={destroyMutation.isPending}
            />
            {errorMessage && (
              <p className='text-xs text-destructive font-medium'>
                {errorMessage}
              </p>
            )}
          </div>

          <DialogFooter className='gap-2 sm:gap-0 pt-2'>
            <Button
              type='button'
              variant='outline'
              onClick={() => handleClose(false)}
              disabled={destroyMutation.isPending}
            >
              Batal
            </Button>
            <Button
              type='submit'
              variant='destructive'
              disabled={destroyMutation.isPending || !password.trim()}
              className='gap-1.5'
            >
              {destroyMutation.isPending ? (
                <>
                  <Loader2 className='h-4 w-4 animate-spin' />
                  Menghapus Seluruh Log...
                </>
              ) : (
                <>
                  <Trash2 className='h-4 w-4' />
                  Hapus Seluruh Log Sekarang
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
