import { z } from 'zod'
import { createFileRoute } from '@tanstack/react-router'
import { Activate } from '@/features/auth/activate'

const activateSearchSchema = z.object({
  token: z.string().optional().catch(''),
})

export const Route = createFileRoute('/(auth)/activate')({
  component: ActivateRoute,
  validateSearch: activateSearchSchema,
})

function ActivateRoute() {
  const search = Route.useSearch()

  let token = search.token || ''

  if (typeof window !== 'undefined') {
    const rawSearch = window.location.search
    const params = new URLSearchParams(rawSearch)

    if (!token) {
      token = params.get('token') || ''
    }

    // Edge case: if URL was pasted with literal &amp; in raw text
    if (token.includes('&amp;')) {
      const parts = token.split('&amp;')
      token = parts[0]
    }
  }

  return <Activate token={token} />
}
