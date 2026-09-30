import * as React from 'react'
import { Check, ChevronsUpDown, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'

export interface SearchableSelectOption {
  value: string
  label: string
  group?: string
  badge?: string
  description?: string
  keywords?: string[]
}

export interface SearchableSelectProps {
  value?: string
  onValueChange?: (value: string) => void
  options: SearchableSelectOption[]
  placeholder?: string
  searchPlaceholder?: string
  emptyMessage?: string
  disabled?: boolean
  className?: string
  allowClear?: boolean
  id?: string
}

export function SearchableSelect({
  value,
  onValueChange,
  options = [],
  placeholder = 'Pilih salah satu...',
  searchPlaceholder = 'Cari opsi...',
  emptyMessage = 'Tidak ada hasil ditemukan.',
  disabled = false,
  className,
  allowClear = true,
  id,
}: SearchableSelectProps) {
  const [open, setOpen] = React.useState(false)

  const selectedOption = React.useMemo(() => {
    return options.find((opt) => opt.value === value)
  }, [options, value])

  // Group options if any option specifies a group
  const groupedOptions = React.useMemo(() => {
    const hasGroups = options.some((opt) => Boolean(opt.group))
    if (!hasGroups) {
      return { '': options }
    }

    const groups: Record<string, SearchableSelectOption[]> = {}
    options.forEach((opt) => {
      const g = opt.group || 'Lainnya'
      if (!groups[g]) groups[g] = []
      groups[g].push(opt)
    })
    return groups
  }, [options])

  const handleSelect = (optionValue: string) => {
    onValueChange?.(optionValue)
    setOpen(false)
  }

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation()
    onValueChange?.('')
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type='button'
          variant='outline'
          role='combobox'
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            'h-9 w-full justify-between px-3 text-xs font-normal border-input bg-transparent hover:bg-muted/30 focus-visible:ring-1 focus-visible:ring-ring shadow-2xs',
            !selectedOption && 'text-muted-foreground',
            className
          )}
        >
          <div className='flex items-center gap-2 truncate text-left min-w-0 flex-1'>
            {selectedOption ? (
              <>
                <span className='truncate text-foreground font-medium'>
                  {selectedOption.label}
                </span>
                {selectedOption.badge && (
                  <Badge
                    variant='secondary'
                    className='text-[10px] px-1.5 py-0 shrink-0 font-normal'
                  >
                    {selectedOption.badge}
                  </Badge>
                )}
              </>
            ) : (
              <span>{placeholder}</span>
            )}
          </div>

          <div className='flex items-center gap-1 shrink-0 ml-2'>
            {allowClear && selectedOption && !disabled && (
              <span
                role='button'
                tabIndex={0}
                onClick={handleClear}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    handleClear(e as unknown as React.MouseEvent)
                  }
                }}
                className='p-0.5 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer'
                title='Hapus pilihan'
              >
                <X className='h-3 w-3' />
              </span>
            )}
            <ChevronsUpDown className='h-3.5 w-3.5 opacity-50' />
          </div>
        </Button>
      </PopoverTrigger>

      <PopoverContent
        align='start'
        className='w-[--radix-popover-trigger-width] min-w-[280px] p-0 shadow-lg border'
      >
        <Command
          filter={(itemValue, search) => {
            const cleanSearch = search.toLowerCase().trim()
            if (!cleanSearch) return 1
            return itemValue.toLowerCase().includes(cleanSearch) ? 1 : 0
          }}
        >
          <CommandInput placeholder={searchPlaceholder} className='h-9 text-xs' />
          <CommandList className='max-h-64 overflow-y-auto p-1'>
            <CommandEmpty className='py-6 text-center text-xs text-muted-foreground'>
              {emptyMessage}
            </CommandEmpty>

            {Object.entries(groupedOptions).map(([groupTitle, groupItems]) => {
              const content = groupItems.map((opt) => {
                const isSelected = opt.value === value
                // Searchable text token containing label, keywords, badge, and group
                const searchToken = [
                  opt.label,
                  opt.value,
                  opt.badge || '',
                  opt.group || '',
                  ...(opt.keywords || []),
                ]
                  .filter(Boolean)
                  .join(' ')

                return (
                  <CommandItem
                    key={opt.value}
                    value={searchToken}
                    onSelect={() => handleSelect(opt.value)}
                    className='flex items-center justify-between py-2 px-2.5 text-xs cursor-pointer'
                  >
                    <div className='flex items-center gap-2 min-w-0 flex-1 pr-2'>
                      <Check
                        className={cn(
                          'h-3.5 w-3.5 shrink-0 text-primary',
                          isSelected ? 'opacity-100' : 'opacity-0'
                        )}
                      />
                      <div className='flex flex-col min-w-0'>
                        <span className='truncate font-medium text-foreground leading-tight'>
                          {opt.label}
                        </span>
                        {opt.description && (
                          <span className='text-[10px] text-muted-foreground truncate mt-0.5'>
                            {opt.description}
                          </span>
                        )}
                      </div>
                    </div>

                    {opt.badge && (
                      <Badge
                        variant='outline'
                        className='text-[10px] px-1.5 py-0 font-normal shrink-0 bg-muted/40 text-muted-foreground'
                      >
                        {opt.badge}
                      </Badge>
                    )}
                  </CommandItem>
                )
              })

              if (!groupTitle) {
                return content
              }

              return (
                <CommandGroup
                  key={groupTitle}
                  heading={groupTitle}
                  className='text-xs'
                >
                  {content}
                </CommandGroup>
              )
            })}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
