import { isAxiosError } from 'axios'
import { createFileRoute, redirect } from '@tanstack/react-router'
import { AuthenticatedLayout } from '@/components/layout/authenticated-layout'
import { authService } from '@/services/auth-service'
import { useAuthStore } from '@/stores/auth-store'

let verifiedToken: string | null = null

export function resetVerifiedToken(): void {
  verifiedToken = null
}

export const Route = createFileRoute('/_authenticated')({
  beforeLoad: async ({ location }) => {
    const { accessToken, setUser, reset } = useAuthStore.getState().auth
    if (!accessToken) {
      verifiedToken = null
      const targetPath = location.href
      const hasSpecificPath = targetPath && targetPath !== '/' && !targetPath.includes('/sign-in')
      throw redirect({
        to: '/sign-in',
        search: hasSpecificPath ? { redirect: targetPath } : undefined,
      })
    }

    if (verifiedToken !== accessToken) {
      try {
        const data = await authService.getProfile(true)
        if (data?.user) {
          setUser(data.user)
          verifiedToken = accessToken
        }
      } catch (error) {
        if (isAxiosError(error) && error.response?.status === 401) {
          verifiedToken = null
          reset()
          const targetPath = location.href
          const hasSpecificPath = targetPath && targetPath !== '/' && !targetPath.includes('/sign-in')
          throw redirect({
            to: '/sign-in',
            search: hasSpecificPath ? { redirect: targetPath } : undefined,
          })
        }
      }
    }
  },
  component: AuthenticatedLayout,
})

