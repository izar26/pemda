import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/_authenticated/perencanaan/iku/')({
  beforeLoad: () => {
    throw redirect({
      to: '/perencanaan/tujuan',
    })
  },
})
