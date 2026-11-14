import { PetaRisikoView } from '@/features/risiko/peta-risiko/components/peta-risiko-view'
import type { PetaRisikoData } from '@/features/risiko/peta-risiko/types'

interface ReviewStep7Props {
  data: PetaRisikoData | null
  isLoading: boolean
}

export function ReviewStep7({ data, isLoading }: ReviewStep7Props) {
  return (
    <div className='p-1'>
      <PetaRisikoView
        data={data}
        isLoading={isLoading}
        showSourceFilter={false}
      />
    </div>
  )
}
