import { Badge } from '@/components/ui/badge'

export interface RiskContextExtraItem {
  label: string
  value?: string | number | null
}

export interface RiskContextCardProps {
  source?: '3a' | '3b' | '3c' | string | null
  kodeRisiko: string
  pernyataanRisiko: string
  kategoriRisiko?: string | null
  pemilikRisiko?: string | null
  extraItems?: RiskContextExtraItem[]
  className?: string
}

export function RiskContextCard({
  source,
  kodeRisiko,
  pernyataanRisiko,
  kategoriRisiko,
  pemilikRisiko,
  extraItems = [],
  className = '',
}: RiskContextCardProps) {
  const sourceLabel = source
    ? source.toLowerCase() === '3a'
      ? 'Form 3A (Pemda)'
      : source.toLowerCase() === '3b'
        ? 'Form 3B (Strategis OPD)'
        : source.toLowerCase() === '3c'
          ? 'Form 3C (Operasional OPD)'
          : `Form ${source.toUpperCase()}`
    : null

  return (
    <div
      className={`space-y-2 rounded-lg border bg-muted/40 p-3 text-xs ${className}`}
    >
      <div className='flex flex-wrap items-center gap-2'>
        {sourceLabel && (
          <Badge variant='secondary' className='text-[10px] font-semibold'>
            {sourceLabel}
          </Badge>
        )}
        <span className='rounded border bg-background px-1.5 py-0.5 font-mono text-[11px] font-bold text-foreground'>
          {kodeRisiko}
        </span>
        {kategoriRisiko && (
          <Badge
            variant='outline'
            className='text-[10px] text-muted-foreground'
          >
            {kategoriRisiko}
          </Badge>
        )}
      </div>

      <p className='break-words font-semibold leading-relaxed text-foreground text-xs sm:text-sm'>
        {pernyataanRisiko}
      </p>

      {(pemilikRisiko || extraItems.length > 0) && (
        <div className='space-y-1 border-t border-border/60 pt-1 text-[11px] text-muted-foreground sm:text-xs'>
          {pemilikRisiko && (
            <p>
              <span className='font-medium text-foreground'>
                Pemilik Risiko:
              </span>{' '}
              {pemilikRisiko}
            </p>
          )}
          {extraItems.map(
            (item, idx) =>
              item.value && (
                <p key={idx}>
                  <span className='font-medium text-foreground'>
                    {item.label}:
                  </span>{' '}
                  {item.value}
                </p>
              )
          )}
        </div>
      )}
    </div>
  )
}
