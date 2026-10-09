import * as React from 'react'
import { CheckIcon, PlusCircledIcon } from '@radix-ui/react-icons'
import { type Column } from '@tanstack/react-table'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Separator } from '@/components/ui/separator'

type DataTableFacetedFilterProps<TData, TValue> = {
  column?: Column<TData, TValue>
  title?: string
  options: {
    label: string
    value: string
    icon?: React.ComponentType<{ className?: string }>
  }[]
  values?: string[]
  onValuesChange?: (values: string[]) => void
}

export function DataTableFacetedFilter<TData, TValue>({
  column,
  title,
  options,
  values,
  onValuesChange,
}: DataTableFacetedFilterProps<TData, TValue>) {
  const facets = column?.getFacetedUniqueValues()

  const rawColumnValue = column?.getFilterValue()
  const columnValues = Array.isArray(rawColumnValue)
    ? (rawColumnValue as string[])
    : rawColumnValue
      ? [String(rawColumnValue)]
      : []

  const selectedValues = new Set(values ?? columnValues)

  const handleSelect = (optionValue: string) => {
    const nextSet = new Set(selectedValues)
    if (nextSet.has(optionValue)) {
      nextSet.delete(optionValue)
    } else {
      nextSet.add(optionValue)
    }
    const filterValues = Array.from(nextSet)

    if (onValuesChange) {
      onValuesChange(filterValues)
    } else if (column) {
      column.setFilterValue(filterValues.length ? filterValues : undefined)
    }
  }

  const handleClear = () => {
    if (onValuesChange) {
      onValuesChange([])
    } else if (column) {
      column.setFilterValue(undefined)
    }
  }

  const filterPlaceholder = title ? `Cari ${title.toLowerCase()}...` : 'Cari...'

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant='outline' size='sm' className='h-8 border-dashed'>
          <PlusCircledIcon className='size-4' />
          {title}
          {selectedValues?.size > 0 && (
            <>
              <Separator orientation='vertical' className='mx-2 h-4' />
              <Badge
                variant='secondary'
                className='rounded-sm px-1 font-normal lg:hidden'
              >
                {selectedValues.size}
              </Badge>
              <div className='hidden space-x-1 lg:flex'>
                {selectedValues.size > 2 ? (
                  <Badge
                    variant='secondary'
                    className='rounded-sm px-1 font-normal'
                  >
                    {selectedValues.size} dipilih
                  </Badge>
                ) : (
                  options
                    .filter((option) => selectedValues.has(option.value))
                    .map((option) => (
                      <Badge
                        variant='secondary'
                        key={option.value}
                        className='rounded-sm px-1 font-normal'
                      >
                        {option.label}
                      </Badge>
                    ))
                )}
              </div>
            </>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className='min-w-[220px] max-w-[280px] w-auto p-0 shadow-lg'
        align='start'
        collisionPadding={12}
        sideOffset={6}
      >
        <Command className='max-h-[min(380px,var(--radix-popover-content-available-height,380px))] flex flex-col'>
          <CommandInput placeholder={filterPlaceholder} />
          <CommandList className='max-h-[220px] overflow-y-auto overscroll-contain p-1'>
            <CommandEmpty className='py-4 text-center text-xs text-muted-foreground'>
              Tidak ada opsi ditemukan.
            </CommandEmpty>
            <CommandGroup>
              {options.map((option) => {
                const isSelected = selectedValues.has(option.value)
                return (
                  <CommandItem
                    key={option.value}
                    onSelect={() => handleSelect(option.value)}
                  >
                    <div
                      className={cn(
                        'flex size-4 items-center justify-center rounded-sm border border-primary shrink-0',
                        isSelected
                          ? 'bg-primary text-primary-foreground'
                          : 'opacity-50 [&_svg]:invisible'
                      )}
                    >
                      <CheckIcon className={cn('h-4 w-4 text-background')} />
                    </div>
                    {option.icon && (
                      <option.icon className='size-4 text-muted-foreground shrink-0' />
                    )}
                    <span className='truncate'>{option.label}</span>
                    {facets?.get(option.value) !== undefined && (
                      <span className='ms-auto flex h-4 min-w-[1.25rem] px-1 items-center justify-center font-mono text-[11px] text-muted-foreground'>
                        {facets.get(option.value)}
                      </span>
                    )}
                  </CommandItem>
                )
              })}
            </CommandGroup>
          </CommandList>
          {selectedValues.size > 0 && (
            <div className='border-t border-border/60 p-1 bg-muted/20'>
              <Button
                type='button'
                variant='ghost'
                size='sm'
                onClick={handleClear}
                className='w-full h-8 text-xs font-medium justify-center text-muted-foreground hover:text-foreground'
              >
                Hapus filter ({selectedValues.size})
              </Button>
            </div>
          )}
        </Command>
      </PopoverContent>
    </Popover>
  )
}
