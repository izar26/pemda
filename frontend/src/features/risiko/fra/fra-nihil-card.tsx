import {
  RisikoNihilStatusCard,
} from '../shared/risiko-nihil-status-card'

export interface FraNihilCardProps {
  isNihil: boolean
  nihilInfo?: {
    confirmed_by: string | null
    confirmed_at: string | null
    catatan?: string | null
  } | null
  hasItems: boolean
  canEdit: boolean
  isLoading: boolean
  onToggleNihil: (nextNihil: boolean) => void
}

export function FraNihilCard({
  isNihil,
  nihilInfo,
  hasItems,
  canEdit,
  isLoading,
  onToggleNihil,
}: FraNihilCardProps) {
  return (
    <RisikoNihilStatusCard
      title='Pernyataan Status Penilaian Risiko Kecurangan (FRA)'
      isNihil={isNihil}
      nihilInfo={nihilInfo}
      hasItems={hasItems}
      canEdit={canEdit}
      isLoading={isLoading}
      confirmedMessage='Perangkat Daerah telah mengonfirmasi bahwa berdasarkan penilaian awal tidak ditemukan risiko kecurangan yang signifikan pada tahun berjalan.'
      unconfirmedEmptyMessage='Jika seluruh proses bisnis perangkat daerah telah diuji dan tidak ditemukan risiko kecurangan, Anda dapat mengonfirmasi Status Nihil untuk memenuhi kelayakan pengajuan.'
      unconfirmedHasItemsMessage='Terdapat catatan risiko kecurangan terdaftar pada tabel di bawah.'
      badgeConfirmedText='Status Nihil Risiko Kecurangan Dikonfirmasi'
      onToggleNihil={onToggleNihil}
    />
  )
}
