import { CalendarDays, Clock } from 'lucide-react'
import { formatIndonesianDateTime, useServerClock } from '@/lib/server-time'

export function NavbarClock() {
  const currentTime = useServerClock()
  const { datePart, shortDate, timePart } = formatIndonesianDateTime(currentTime)

  return (
    <div className='flex items-center gap-2 px-2.5 py-1 rounded-md text-xs text-muted-foreground bg-muted/20 border border-border/40 select-none cursor-default shrink-0 whitespace-nowrap'>
      <CalendarDays className='h-3.5 w-3.5 text-primary shrink-0' />
      <div className='flex flex-col text-left justify-center leading-tight'>
        {/* Baris 1: Hari & Tanggal */}
        <span className='hidden md:inline text-[11px] font-sans font-medium text-foreground whitespace-nowrap'>
          {datePart}
        </span>
        <span className='inline md:hidden text-[11px] font-sans font-medium text-foreground whitespace-nowrap'>
          {shortDate}
        </span>
        {/* Baris 2: Jam */}
        <div className='flex items-center gap-1 text-[10px] text-muted-foreground whitespace-nowrap'>
          <Clock className='h-2.5 w-2.5 text-muted-foreground/70 shrink-0' />
          <span className='font-mono font-semibold text-foreground/90 tracking-tight'>
            {timePart}
          </span>
        </div>
      </div>
    </div>
  )
}
