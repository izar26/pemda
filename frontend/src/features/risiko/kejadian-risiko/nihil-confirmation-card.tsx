import { CheckCircle2, AlertCircle } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

interface NihilConfirmationCardProps {
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
                Pernyataan Status Kejadian Risiko Tahun Berjalan
              </h3>
              {isNihil ? (
                <Badge
                  variant='outline'
                  className='border-emerald-300 bg-emerald-100 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300'
                >
                  Status Nihil Dikonfirmasi
                </Badge>
              ) : (
                <Badge variant='outline' className='text-muted-foreground'>
                  Belum Dikonfirmasi Nihil
                </Badge>
              )}
            </div>
            <p className='text-xs text-muted-foreground sm:text-sm'>
              {isNihil
                ? `Perangkat Daerah telah mengonfirmasi bahwa tidak ada kejadian risiko nyata yang terjadi sepanjang tahun berjalan.${
                    nihilInfo?.confirmed_by
                      ? ` Dikonfirmasi oleh ${nihilInfo.confirmed_by}${
                          nihilInfo.confirmed_at
                            ? ` pada ${new Date(nihilInfo.confirmed_at).toLocaleDateString('id-ID', { dateStyle: 'medium' })}`
                            : ''
                        }.`
                      : ''
                  }`
                : hasIncidents
                  ? 'Perangkat Daerah telah mencatat kejadian risiko nyata pada tabel di bawah.'
                  : 'Jika selama tahun berjalan tidak terdapat insiden risiko yang terjadi, OPD dapat mengonfirmasi status nihil untuk melengkapi Form 10.'}
            </p>
          </div>
        </div>

        {canEdit && (
          <div className='flex items-center shrink-0'>
            {isNihil ? (
              <Button
                variant='outline'
                size='sm'
                disabled={isLoading}
                onClick={() => onToggleNihil(false)}
              >
                Batalkan Status Nihil
              </Button>
            ) : (
              <Button
                variant='default'
                size='sm'
                className='bg-emerald-600 text-white hover:bg-emerald-700 dark:bg-emerald-700 dark:hover:bg-emerald-800'
                disabled={isLoading || hasIncidents}
                title={
                  hasIncidents
                    ? 'Hapus seluruh catatan kejadian terlebih dahulu jika ingin mengonfirmasi status nihil'
                    : 'Konfirmasi bahwa tidak ada kejadian risiko tahun ini'
                }
                onClick={() => onToggleNihil(true)}
              >
                Konfirmasi Status Nihil
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
