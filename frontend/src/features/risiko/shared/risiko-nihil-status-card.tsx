import { CheckCircle2, AlertCircle } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

export interface RisikoNihilStatusCardProps {
  title: string
  isNihil: boolean
  nihilInfo?: {
    confirmed_by: string | null
    confirmed_at: string | null
    catatan?: string | null
  } | null
  hasItems: boolean
  canEdit: boolean
  isLoading: boolean
  confirmedMessage: string
  unconfirmedEmptyMessage: string
  unconfirmedHasItemsMessage?: string
  badgeConfirmedText?: string
  badgeUnconfirmedText?: string
  buttonConfirmText?: string
  buttonCancelText?: string
  onToggleNihil: (nextNihil: boolean) => void
}

export function RisikoNihilStatusCard({
  title,
  isNihil,
  nihilInfo,
  hasItems,
  canEdit,
  isLoading,
  confirmedMessage,
  unconfirmedEmptyMessage,
  unconfirmedHasItemsMessage,
  badgeConfirmedText = 'Status Nihil Dikonfirmasi',
  badgeUnconfirmedText = 'Belum Dikonfirmasi Nihil',
  buttonConfirmText = 'Konfirmasi Status Nihil',
  buttonCancelText = 'Batalkan Status Nihil',
  onToggleNihil,
}: RisikoNihilStatusCardProps) {
  return (
    <Card
      className={`border transition-colors ${
        isNihil
          ? 'border-emerald-200 bg-emerald-50/50 dark:border-emerald-900/50 dark:bg-emerald-950/20'
          : 'border-border bg-card'
      }`}
    >
      <CardContent className='flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between'>
        <div className='flex items-start gap-3'>
          {isNihil ? (
            <div className='mt-0.5 rounded-full bg-emerald-100 p-1.5 text-emerald-600 dark:bg-emerald-900/50 dark:text-emerald-400'>
              <CheckCircle2 className='h-5 w-5' />
            </div>
          ) : (
            <div className='mt-0.5 rounded-full bg-amber-100 p-1.5 text-amber-600 dark:bg-amber-900/50 dark:text-amber-400'>
              <AlertCircle className='h-5 w-5' />
            </div>
          )}
          <div className='space-y-1'>
            <div className='flex flex-wrap items-center gap-2'>
              <h3 className='font-semibold text-foreground text-sm sm:text-base'>
                {title}
              </h3>
              {isNihil ? (
                <Badge
                  variant='outline'
                  className='border-emerald-300 bg-emerald-100 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300'
                >
                  {badgeConfirmedText}
                </Badge>
              ) : (
                <Badge variant='outline' className='text-muted-foreground'>
                  {badgeUnconfirmedText}
                </Badge>
              )}
            </div>
            <p className='text-xs text-muted-foreground sm:text-sm'>
              {isNihil
                ? `${confirmedMessage}${
                    nihilInfo?.confirmed_by
                      ? ` Dikonfirmasi oleh ${nihilInfo.confirmed_by}${
                          nihilInfo.confirmed_at
                            ? ` pada ${new Date(nihilInfo.confirmed_at).toLocaleDateString('id-ID', { dateStyle: 'medium' })}`
                            : ''
                        }.`
                      : ''
                  }`
                : hasItems
                  ? unconfirmedHasItemsMessage ||
                    'Perangkat Daerah telah mencatat item pada tabel di bawah.'
                  : unconfirmedEmptyMessage}
            </p>
            {isNihil && nihilInfo?.catatan && (
              <p className='text-xs italic text-muted-foreground'>
                Catatan: {nihilInfo.catatan}
              </p>
            )}
            {hasItems && !isNihil && (
              <p className='text-xs text-muted-foreground'>
                (Terdapat catatan terdaftar. Status nihil hanya dapat dikonfirmasi jika tabel catatan kosong)
              </p>
            )}
          </div>
        </div>

        {canEdit && (
          <div className='flex items-center shrink-0 self-end sm:self-center'>
            {isNihil ? (
              <Button
                variant='outline'
                size='sm'
                disabled={isLoading}
                onClick={() => onToggleNihil(false)}
              >
                {buttonCancelText}
              </Button>
            ) : (
              <Button
                variant='default'
                size='sm'
                className='bg-emerald-600 text-white hover:bg-emerald-700 dark:bg-emerald-700 dark:hover:bg-emerald-800'
                disabled={isLoading || hasItems}
                title={
                  hasItems
                    ? 'Hapus seluruh catatan terlebih dahulu jika ingin mengonfirmasi status nihil'
                    : undefined
                }
                onClick={() => onToggleNihil(true)}
              >
                {buttonConfirmText}
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
