import { Building2, CalendarRange, UserCheck } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { SearchableSelect } from '@/components/searchable-select'

interface StrategisIdentityCardProps {
  namaPemda?: string
  tahunPenilaian?: number | string
  rentangTahun?: string
  isOpdRole: boolean
  isScopedAuditor: boolean
  resolvedOpdName: string
  effectiveOpdId: string
  onOpdChange: (opdId: string) => void
  opds: Array<{ id: string | number; kode: string; nama: string }>
  resolvedKepalaNama: string
  resolvedKepalaNip: string
}

export function StrategisIdentityCard({
  namaPemda = 'Pemerintah Kabupaten Cianjur',
  tahunPenilaian = '-',
  rentangTahun = '-',
  isOpdRole,
  isScopedAuditor,
  resolvedOpdName,
  effectiveOpdId,
  onOpdChange,
  opds,
  resolvedKepalaNama,
  resolvedKepalaNip,
}: StrategisIdentityCardProps) {
  return (
    <div className='rounded-xl border bg-card shadow-2xs overflow-hidden'>
      <div className='border-b bg-muted/40 px-5 py-3.5 flex items-center justify-between gap-2 flex-wrap'>
        <div className='flex items-center gap-2'>
          <Building2 className='h-4 w-4 text-primary' />
          <h3 className='text-xs font-bold uppercase tracking-wider text-foreground'>
            Identitas Penilaian &amp; Perangkat Daerah
          </h3>
        </div>
        <div className='flex items-center gap-2 text-[11px] text-muted-foreground'>
          <UserCheck className='h-3.5 w-3.5 text-emerald-600' />
          <span>
            Kepala OPD:{' '}
            <strong className='text-foreground'>{resolvedKepalaNama}</strong>
            {resolvedKepalaNip !== '-' && ` (NIP. ${resolvedKepalaNip})`}
          </span>
        </div>
      </div>

      <div className='p-5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4'>
        {/* Nama Pemda */}
        <div className='space-y-1.5'>
          <label className='text-xs font-semibold text-muted-foreground'>
            Nama Pemda <span className='text-destructive'>*</span>
          </label>
          <Input
            value={namaPemda}
            disabled
            className='h-9 text-xs bg-muted/60 font-medium'
          />
        </div>

        {/* Tahun Penilaian */}
        <div className='space-y-1.5'>
          <label className='text-xs font-semibold text-muted-foreground flex items-center gap-1.5'>
            <CalendarRange className='h-3.5 w-3.5 text-primary' />
            <span>
              Tahun Penilaian <span className='text-destructive'>*</span>
            </span>
          </label>
          <Input
            value={String(tahunPenilaian)}
            disabled
            className='h-9 text-xs bg-muted/60 font-mono font-bold'
          />
        </div>

        {/* Periode yang Dinilai */}
        <div className='space-y-1.5'>
          <label className='text-xs font-semibold text-muted-foreground'>
            Periode yang Dinilai <span className='text-destructive'>*</span>
          </label>
          <Input
            value={rentangTahun}
            disabled
            className='h-9 text-xs bg-muted/60 font-mono font-medium'
          />
        </div>

        {/* OPD yang Dinilai */}
        <div className='space-y-1.5'>
          <label className='text-xs font-semibold text-muted-foreground flex items-center justify-between'>
            <span>
              OPD yang Dinilai <span className='text-destructive'>*</span>
            </span>
            {isScopedAuditor && (
              <span className='text-[10px] text-blue-600 dark:text-blue-400 font-medium'>
                OPD Binaan Anda ({opds.length})
              </span>
            )}
          </label>
          {isOpdRole ? (
            <Input
              value={resolvedOpdName}
              disabled
              className='h-9 text-xs bg-muted/60 font-semibold'
            />
          ) : isScopedAuditor && opds.length === 0 ? (
            <div className='h-9 px-3 flex items-center rounded-md border border-amber-500/30 bg-amber-500/10 text-xs font-medium text-amber-700 dark:text-amber-400 truncate'>
              Belum ada penugasan OPD binaan
            </div>
          ) : (
            <SearchableSelect
              value={effectiveOpdId}
              onValueChange={onOpdChange}
              placeholder={isScopedAuditor ? 'Pilih OPD binaan...' : 'Pilih Perangkat Daerah...'}
              searchPlaceholder='Cari kode atau nama OPD...'
              emptyMessage='Perangkat daerah tidak ditemukan.'
              options={opds.map((opd) => ({
                value: String(opd.id),
                label: `${opd.kode} - ${opd.nama}`,
              }))}
              disabled={opds.length === 0}
            />
          )}
        </div>
      </div>
    </div>
  )
}
