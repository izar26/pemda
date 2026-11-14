import {
  RisikoNihilStatusCard,
} from '../shared/risiko-nihil-status-card'

export interface NihilConfirmationCardProps {
  isNihil: boolean
  nihilInfo?: {
    confirmed_by: string | null
    confirmed_at: string | null
  } | null
  hasIncidents: boolean
  canEdit: boolean
  isLoading: boolean
  onToggleNihil: (nextNihil: boolean) => void
}

export function NihilConfirmationCard({
  isNihil,
  nihilInfo,
  hasIncidents,
  canEdit,
  isLoading,
  onToggleNihil,
}: NihilConfirmationCardProps) {
  return (
    <RisikoNihilStatusCard
      title='Pernyataan Status Kejadian Risiko Tahun Berjalan'
      isNihil={isNihil}
      nihilInfo={nihilInfo}
      hasItems={hasIncidents}
      canEdit={canEdit}
      isLoading={isLoading}
      confirmedMessage='Perangkat Daerah telah mengonfirmasi bahwa tidak ada kejadian risiko nyata yang terjadi sepanjang tahun berjalan.'
      unconfirmedEmptyMessage='Jika selama tahun berjalan tidak terdapat insiden risiko yang terjadi, OPD dapat mengonfirmasi status nihil untuk melengkapi Form 10.'
      unconfirmedHasItemsMessage='Perangkat Daerah telah mencatat kejadian risiko nyata pada tabel di bawah.'
      onToggleNihil={onToggleNihil}
    />
  )
}
