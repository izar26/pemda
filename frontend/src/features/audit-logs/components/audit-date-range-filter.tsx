import { useState } from 'react'
import {
  endOfDay,
  endOfMonth,
  format,
  startOfDay,
  startOfMonth,
  subDays,
} from 'date-fns'
import { Calendar as CalendarIcon, RotateCcw } from 'lucide-react'
import type { DateRange } from 'react-day-picker'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Calendar } from '@/components/ui/calendar'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Separator } from '@/components/ui/separator'

export interface AuditDateFilterState {
  preset: 'all' | 'today' | '7days' | '30days' | 'this_month' | 'custom'
  range?: {
    from?: Date
    to?: Date
  }
}

interface AuditDateRangeFilterProps {
  value: AuditDateFilterState
  onChange: (value: AuditDateFilterState) => void
}

export function AuditDateRangeFilter({
  value,
  onChange,
}: AuditDateRangeFilterProps) {
  const [open, setOpen] = useState(false)
  const [tempRange, setTempRange] = useState<DateRange | undefined>(
    value.range ? { from: value.range.from, to: value.range.to } : undefined
  )

  const presets = [
    { id: 'all', label: 'Semua Waktu' },
    { id: 'today', label: 'Hari Ini' },
    { id: '7days', label: '7 Hari Terakhir' },
    { id: '30days', label: '30 Hari Terakhir' },
    { id: 'this_month', label: 'Bulan Ini' },
    { id: 'custom', label: 'Pilih di Kalender' },
  ] as const

  const isActive = value.preset !== 'all' || Boolean(value.range?.from)

  // Label text for button trigger
  let triggerLabel = 'Rentang Waktu'
  if (value.preset === 'today') triggerLabel = 'Hari Ini'
  else if (value.preset === '7days') triggerLabel = '7 Hari Terakhir'
  else if (value.preset === '30days') triggerLabel = '30 Hari Terakhir'
  else if (value.preset === 'this_month') triggerLabel = 'Bulan Ini'
  else if (value.preset === 'custom' && value.range?.from) {
    if (value.range.to) {
      triggerLabel = `${format(value.range.from, 'dd MMM yyyy')} - ${format(value.range.to, 'dd MMM yyyy')}`
    } else {
      triggerLabel = format(value.range.from, 'dd MMM yyyy')
    }
  }

  const handleSelectPreset = (presetId: typeof presets[number]['id']) => {
    const now = new Date()
    if (presetId === 'all') {
      onChange({ preset: 'all', range: undefined })
      setTempRange(undefined)
      setOpen(false)
    } else if (presetId === 'today') {
      const today = { from: startOfDay(now), to: endOfDay(now) }
      onChange({ preset: 'today', range: today })
      setTempRange(today)
      setOpen(false)
    } else if (presetId === '7days') {
      const seven = { from: startOfDay(subDays(now, 6)), to: endOfDay(now) }
      onChange({ preset: '7days', range: seven })
      setTempRange(seven)
      setOpen(false)
    } else if (presetId === '30days') {
      const thirty = { from: startOfDay(subDays(now, 29)), to: endOfDay(now) }
      onChange({ preset: '30days', range: thirty })
      setTempRange(thirty)
      setOpen(false)
    } else if (presetId === 'this_month') {
      const month = { from: startOfMonth(now), to: endOfMonth(now) }
      onChange({ preset: 'this_month', range: month })
      setTempRange(month)
      setOpen(false)
    } else {
      // Custom: keep popover open so user picks a range; commit only via "Terapkan Tanggal"
      setTempRange(undefined)
    }
  }

  const handleApplyCustomCalendar = () => {
    if (tempRange?.from) {
      onChange({
        preset: 'custom',
        range: {
          from: startOfDay(tempRange.from),
          to: tempRange.to ? endOfDay(tempRange.to) : endOfDay(tempRange.from),
        },
      })
      setOpen(false)
    }
  }

  const handleReset = () => {
    onChange({ preset: 'all', range: undefined })
    setTempRange(undefined)
    setOpen(false)
  }

  const handleOpenChange = (nextOpen: boolean) => {
    if (nextOpen) {
      setTempRange(
        value.range?.from ? { from: value.range.from, to: value.range.to } : undefined
      )
    }
    setOpen(nextOpen)
  }

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          variant='outline'
          size='sm'
          className={cn(
            'h-8 border-dashed text-xs gap-1.5 font-normal px-2.5',
            isActive && 'border-primary bg-primary/5 text-primary font-medium'
          )}
        >
          <CalendarIcon className='h-3.5 w-3.5 text-muted-foreground' />
          <span>{triggerLabel}</span>
          {isActive && (
            <Badge
              variant='secondary'
              className='rounded-xs px-1 py-0 font-normal text-[10px] bg-primary/10 text-primary'
            >
              Aktif
            </Badge>
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent
        align='start'
        className='w-auto p-0 shadow-lg border'
      >
        <div className='flex flex-col sm:flex-row'>
          {/* Preset Buttons Panel */}
          <div className='flex flex-col gap-1 p-3 sm:w-44 border-b sm:border-b-0 sm:border-r bg-muted/20'>
            <span className='text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1'>
              Pilihan Cepat
            </span>
            {presets.map((p) => {
              const isSelected = value.preset === p.id
              return (
                <button
                  key={p.id}
                  type='button'
                  onClick={() => handleSelectPreset(p.id)}
                  className={cn(
                    'text-left text-xs py-1.5 px-2.5 rounded-md transition-colors',
                    isSelected
                      ? 'bg-primary text-primary-foreground font-medium'
                      : 'hover:bg-muted text-foreground'
                  )}
                >
                  {p.label}
                </button>
              )
            })}
          </div>

          {/* Calendar Picker Panel */}
          <div className='p-3 flex flex-col justify-between'>
            <div>
              <span className='text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-2 block mb-1'>
                Rentang Tanggal Kalender
              </span>
              <Calendar
                mode='range'
                selected={tempRange}
                onSelect={setTempRange}
                numberOfMonths={1}
                className='rounded-md'
              />
            </div>

            <Separator className='my-2' />

            <div className='flex items-center justify-between gap-2 px-1'>
              <Button
                variant='ghost'
                size='sm'
                onClick={handleReset}
                className='h-7 text-xs px-2 gap-1 text-muted-foreground hover:text-foreground'
              >
                <RotateCcw className='h-3 w-3' />
                Reset
              </Button>
              <Button
                variant='default'
                size='sm'
                onClick={handleApplyCustomCalendar}
                disabled={!tempRange?.from}
                className='h-7 text-xs px-3 bg-primary'
              >
                Terapkan Tanggal
              </Button>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
