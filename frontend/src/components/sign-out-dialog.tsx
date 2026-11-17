import { useNavigate, useLocation, useRouter } from '@tanstack/react-router'
import { queryClient } from '@/lib/query-client'
import { useAuthStore } from '@/stores/auth-store'
import { authService } from '@/services/auth-service'
import { resetVerifiedToken } from '@/routes/_authenticated/route'
import { ConfirmDialog } from '@/components/confirm-dialog'

interface SignOutDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function SignOutDialog({ open, onOpenChange }: SignOutDialogProps) {
  const router = useRouter()
  const navigate = useNavigate()
  const location = useLocation()
  const { auth } = useAuthStore()

  const handleSignOut = async () => {
    try {
      await authService.logout()
    } catch {
      // Ignore network errors on logout to allow clean local exit
    } finally {
      resetVerifiedToken()
      auth.reset()
      queryClient.clear()
      if (router?.invalidate) {
        await router.invalidate()
      }

      const currentPath = location.href
      const hasSpecificRedirect =
        Boolean(currentPath) &&
        currentPath !== '/' &&
        !currentPath.includes('/sign-in')

      await navigate({
        to: '/sign-in',
        search: hasSpecificRedirect ? { redirect: currentPath } : undefined,
        replace: true,
      })
    }
  }

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title='Keluar dari Sistem'
      desc='Apakah Anda yakin ingin keluar? Anda harus memasukkan kredensial dan verifikasi keamanan kembali untuk mengakses sistem.'
      confirmText='Keluar'
      destructive
      handleConfirm={handleSignOut}
      className='sm:max-w-sm'
    />
  )
}
