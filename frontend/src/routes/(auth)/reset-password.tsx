import { z } from 'zod'
import { createFileRoute } from '@tanstack/react-router'
import { ResetPassword } from '@/features/auth/reset-password'

const resetPasswordSearchSchema = z.object({
  token: z.string().optional().catch(''),
  email: z.string().optional().catch(''),
  'amp;email': z.string().optional().catch(''),
})

export const Route = createFileRoute('/(auth)/reset-password')({
  component: ResetPasswordRoute,
  validateSearch: resetPasswordSearchSchema,
})

function ResetPasswordRoute() {
  const search = Route.useSearch()

  // Resiliently resolve token & email from TanStack Router search or window.location.search
  let token = search.token || ''
  let email = search.email || search['amp;email'] || ''

  if (typeof window !== 'undefined') {
    const rawSearch = window.location.search
    const params = new URLSearchParams(rawSearch)

    if (!token) {
      token = params.get('token') || ''
    }

    if (!email) {
      email =
        params.get('email') ||
        params.get('amp;email') ||
        params.get('amp%3Bemail') ||
        ''
    }

    // Edge case: if URL was pasted with literal &amp; in raw text that became part of token
    if (token.includes('&amp;')) {
      const parts = token.split('&amp;')
      token = parts[0]
      for (const part of parts.slice(1)) {
        if (part.startsWith('email=')) {
          email = decodeURIComponent(part.replace('email=', ''))
        }
      }
    }
  }

  return <ResetPassword token={token} email={email} />
}
