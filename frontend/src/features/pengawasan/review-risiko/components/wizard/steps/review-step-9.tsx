import type { PemantauanRow } from '@/features/risiko/pemantauan-pengendalian/api'
import { PemantauanCards } from '@/features/risiko/pemantauan-pengendalian/pemantauan-cards'

interface ReviewStep9Props {
  items: PemantauanRow[]
  isLoading: boolean
}

export function ReviewStep9({ items, isLoading }: ReviewStep9Props) {
  if (isLoading) {
    return (
      <p role='status' className='p-4 text-sm'>
        Memuat data pemantauan pengendalian intern...
      </p>
    )
  }
  return <PemantauanCards items={items || []} />
}
