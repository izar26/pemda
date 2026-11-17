import { z } from 'zod'
import { createFileRoute, redirect } from '@tanstack/react-router'
import { SignIn } from '@/features/auth/sign-in'
import { useAuthStore } from '@/stores/auth-store'

const searchSchema = z.object({
  redirect: z.string().optional(),
})

export const Route = createFileRoute('/(auth)/sign-in')({
  beforeLoad: ({ search }) => {
    const { accessToken } = useAuthStore.getState().auth
    if (accessToken) {
      const target =
        search?.redirect && !search.redirect.includes('/sign-in')
          ? search.redirect
          : '/'
      throw redirect({ to: target })
    }
  },
  component: SignIn,
  validateSearch: searchSchema,
})
