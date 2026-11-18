import { Card, CardContent } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { SearchableSelect } from '@/components/searchable-select'
import {
  RISIKO_WIZARD_STEPS,
  type RisikoWizardStepConfig,
} from '@/features/risiko/shared/risiko-wizard-store'

interface LaporanFilterBarProps {
  selectedFormId: string
  onSelectFormId: (id: string) => void
  effectiveOpdId: string
  onSelectOpdId: (id: string) => void
  opdOptions: Array<{ value: string; label: string }>
  isLoadingOpds: boolean
  isOpdLocked: boolean
  isScopedAuditor?: boolean
  tahunAktif?: string | number
}

export function LaporanFilterBar({
  selectedFormId,
  onSelectFormId,
  effectiveOpdId,
  onSelectOpdId,
  opdOptions,
  isLoadingOpds,
  isOpdLocked,
  isScopedAuditor,
  tahunAktif,
}: LaporanFilterBarProps) {
  return (
    <Card className='print:hidden border-border/80 shadow-xs'>
      <CardContent className='p-4'>
        <div
          className={`grid grid-cols-1 sm:grid-cols-2 ${
            isOpdLocked ? '' : 'lg:grid-cols-3'
          } gap-4 items-center`}
        >
          {/* 1. Pilih Formulir */}
          <div className='space-y-1.5'>
            <label className='text-xs font-semibold text-foreground flex items-center justify-between'>
              <span>Pilih Formulir Laporan</span>
              <span className='text-[10px] text-muted-foreground'>
                14 Formulir SPIP
              </span>
            </label>
            <Select value={selectedFormId} onValueChange={onSelectFormId}>
              <SelectTrigger className='h-9 text-xs font-medium'>
                <SelectValue placeholder='Pilih formulir laporan...' />
              </SelectTrigger>
              <SelectContent className='max-h-80'>
                {RISIKO_WIZARD_STEPS.map((stg: RisikoWizardStepConfig) => (
                  <SelectItem
                    key={stg.id}
                    value={stg.id}
                    className='text-xs cursor-pointer'
                  >
                    <span className='font-medium'>{stg.title}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 2. Pilih OPD (dihilangkan untuk Kepala OPD / Operator OPD yang terkunci ke OPD sendiri) */}
          {!isOpdLocked && (
            <div className='space-y-1.5'>
              <label className='text-xs font-semibold text-foreground flex items-center justify-between'>
                <span>Perangkat Daerah (OPD)</span>
                {isScopedAuditor && (
                  <span className='text-[10px] text-blue-600 dark:text-blue-400 font-medium'>
                    OPD Binaan Anda ({opdOptions.length})
                  </span>
                )}
              </label>
              {isScopedAuditor && !isLoadingOpds && opdOptions.length === 0 ? (
                <div className='h-9 px-3 flex items-center rounded-md border border-amber-500/30 bg-amber-500/10 text-xs font-medium text-amber-700 dark:text-amber-400 truncate'>
                  Belum ada penugasan OPD binaan
                </div>
              ) : (
                <SearchableSelect
                  options={opdOptions}
                  value={effectiveOpdId}
                  onValueChange={onSelectOpdId}
                  placeholder={
                    isScopedAuditor
                      ? 'Pilih OPD binaan...'
                      : 'Pilih perangkat daerah...'
                  }
                  searchPlaceholder='Cari OPD...'
                  className='h-9 text-xs font-medium'
                  allowClear={false}
                  disabled={isLoadingOpds || opdOptions.length === 0}
                />
              )}
            </div>
          )}

          {/* 3. Status Tahun Penilaian */}
          <div className='space-y-1.5'>
            <label className='text-xs font-semibold text-foreground block'>
              Tahun Anggaran & Format
            </label>
            <div className='h-9 px-3 flex items-center justify-between rounded-md border bg-muted/20 text-xs'>
              <span className='text-muted-foreground'>Tahun Penilaian:</span>
              <span className='font-bold text-foreground'>
                {tahunAktif || '-'} (Aktif)
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
