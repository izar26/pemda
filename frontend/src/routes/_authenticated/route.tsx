import { isAxiosError } from 'axios'
import { createFileRoute, redirect } from '@tanstack/react-router'
import { AuthenticatedLayout } from '@/components/layout/authenticated-layout'
import { authService } from '@/services/auth-service'
import { useAuthStore } from '@/stores/auth-store'

let verifiedToken: string | null = null

export const Route = createFileRoute('/_authenticated')({
  beforeLoad: async ({ location }) => {
    const { accessToken, setUser, reset } = useAuthStore.getState().auth
    if (!accessToken) {
      verifiedToken = null
      throw redirect({
        to: '/sign-in',
        search: {
          redirect: location.href,
        },
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
          throw redirect({
            to: '/sign-in',
            search: {
              redirect: location.href,
            },
          })
        }
      }
    }
  },
  component: AuthenticatedLayout,
})

