import { Badge } from '@/components/ui/badge'

interface LaporanRiskCodeBadgeProps {
  code?: string | null
  sourceLabel?: string | null
  inline?: boolean
}

export function LaporanRiskCodeBadge({
  code,
  sourceLabel,
  inline = false,
}: LaporanRiskCodeBadgeProps) {
  return (
    <div
      className={
        inline
          ? 'flex flex-wrap items-center gap-1'
          : 'flex flex-col items-start gap-1'
      }
    >
      {sourceLabel && (
        <Badge
          variant='outline'
          className='text-[9px] font-medium text-muted-foreground border-border/80 bg-muted/30 print:border-slate-400 print:bg-white print:text-black'
        >
          {sourceLabel}
        </Badge>
      )}
      <Badge
        variant='outline'
        className='border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800/80 font-mono text-[10px] font-bold text-slate-900 dark:text-slate-100 print:border-slate-500 print:bg-slate-100 print:text-black'
      >
        {code || '-'}
      </Badge>
    </div>
  )
}
