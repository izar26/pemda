import { createFileRoute, redirect } from '@tanstack/react-router'
import { ReviewRisikoManagement } from '@/features/pengawasan/review-risiko'
import { userCanAccessReviewRisiko } from '@/hooks/use-permissions'
import { useAuthStore } from '@/stores/auth-store'

export const Route = createFileRoute(
  '/_authenticated/pengawasan/review-risiko/'
)({
  beforeLoad: () => {
    const user = useAuthStore.getState().auth.user
    if (!userCanAccessReviewRisiko(user)) {
      throw redirect({
        to: '/errors/$error',
        params: { error: 'forbidden' },
      })
    }
  },
  component: ReviewRisikoManagement,
})
