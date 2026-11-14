import type { TindakRow } from '@/features/risiko/tindak-pengendalian/api'
import { RiskCards } from '@/features/risiko/tindak-pengendalian/risk-cards'

interface ReviewStep6Props {
  items: TindakRow[]
  isLoading: boolean
}

export function ReviewStep6({ items, isLoading }: ReviewStep6Props) {
  if (isLoading) {
    return (
      <p role='status' className='p-4 text-sm'>
        Memuat rencana tindak pengendalian...
      </p>
    )
  }
  return <RiskCards items={items || []} form='6' />
}
