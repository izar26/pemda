import type { TindakRow } from '@/features/risiko/tindak-pengendalian/api'
import { RiskCards } from '@/features/risiko/tindak-pengendalian/risk-cards'

interface ReviewStep5Props {
  items: TindakRow[]
  isLoading: boolean
}

export function ReviewStep5({ items, isLoading }: ReviewStep5Props) {
  if (isLoading) {
    return (
      <p role='status' className='p-4 text-sm'>
        Memuat risiko prioritas...
      </p>
    )
  }
  return <RiskCards items={items || []} form='5' />
}
