import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute(
  '/_authenticated/pengawasan/penugasan-auditor/'
)({
  beforeLoad: () => {
    throw redirect({
      to: '/pengawasan/penugasan-evaluator',
    })
  },
})
