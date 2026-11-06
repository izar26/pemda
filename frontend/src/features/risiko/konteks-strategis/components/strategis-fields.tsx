import type { UseFormReturn } from 'react-hook-form'
import {
  AlertTriangle,
  CheckCircle2,
  Database,
  Info,
  ListChecks,
  Target,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { SearchableSelect } from '@/components/searchable-select'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import type {
  IndikatorPenilaianItem,
  SasaranPenilaianItem,
  TujuanPenilaianItem,
} from '@/types/perencanaan'
import type { Form2BValues } from '../schema'

interface StrategisFieldsProps {
  form: UseFormReturn<Form2BValues>
  canEdit: boolean
  watchedSumberDataId: string
  watchedTujuanId: string
  watchedSasaranIds: string[]
  watchedIndikatorIds: string[]
  sumberDataList: Array<{ id: string; nama: string }>
  isLoadingSumberData: boolean
  tujuanList: TujuanPenilaianItem[]
  isLoadingTujuan: boolean
  sasaranList: SasaranPenilaianItem[]
  isLoadingSasaran: boolean
  availableIndikators: IndikatorPenilaianItem[]
  isLoadingIndikator: boolean
  handleSumberDataChange: (id: string) => void
  handleTujuanChange: (id: string) => void
  toggleSasaran: (id: string, checked: boolean) => void
  toggleAllSasaran: () => void
  toggleIndikator: (id: string, checked: boolean) => void
  toggleAllIndikators: () => void
}

export function StrategisFields({
  form,
  canEdit,
  watchedSumberDataId,
  watchedTujuanId,
  watchedSasaranIds,
  watchedIndikatorIds,
  sumberDataList,
  isLoadingSumberData,
  tujuanList,
  isLoadingTujuan,
  sasaranList,
  isLoadingSasaran,
  availableIndikators,
  isLoadingIndikator,
  handleSumberDataChange,
  handleTujuanChange,
  toggleSasaran,
  toggleAllSasaran,
  toggleIndikator,
  toggleAllIndikators,
}: StrategisFieldsProps) {
  return (
    <div className='divide-y'>
      {/* STEP FIELD 1: SUMBER DATA */}
      <div className='p-5 space-y-3'>
        <FormField
          control={form.control}
          name='sumber_data_id'
          render={({ field }) => (
            <FormItem className='max-w-xl'>
              <div className='flex items-center gap-2'>
                <span className='flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-primary text-[11px] font-bold font-mono'>
                  1
                </span>
                <FormLabel className='text-xs font-bold uppercase tracking-wide flex items-center gap-1.5'>
                  <Database className='h-3.5 w-3.5 text-primary' />
                  <span>
                    Sumber Data <span className='text-destructive'>*</span>
                  </span>
                </FormLabel>
              </div>
              <p className='text-[11px] text-muted-foreground pl-7'>
                Pilih sumber dokumen perencanaan terlebih dahulu untuk menampilkan daftar Tujuan Strategis yang tersedia.
              </p>
              <div className='pl-7 pt-1'>
                <FormControl>
                  <SearchableSelect
                    value={field.value}
                    onValueChange={handleSumberDataChange}
                    disabled={!canEdit || isLoadingSumberData}
                    placeholder={
                      isLoadingSumberData
                        ? 'Memuat master sumber data...'
                        : 'Pilih Sumber Data (misal: Renstra SKPD)...'
                    }
                    searchPlaceholder='Cari sumber data...'
                    options={sumberDataList.map((sd) => ({
                      value: sd.id,
                      label: sd.nama,
                    }))}
                  />
                </FormControl>
                <FormMessage className='mt-1.5' />
              </div>
            </FormItem>
          )}
        />
      </div>

      {/* STEP FIELD 2: TUJUAN STRATEGIS (1 OPD = 1 TUJUAN) */}
      <div className='p-5 space-y-3'>
        <FormField
          control={form.control}
          name='tujuan_penilaian_id'
          render={({ field }) => (
            <FormItem>
              <div className='flex items-center justify-between gap-2 flex-wrap'>
                <div className='flex items-center gap-2'>
                  <span
                    className={cn(
                      'flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-bold font-mono',
                      watchedSumberDataId
                        ? 'bg-primary/10 text-primary'
                        : 'bg-muted text-muted-foreground'
                    )}
                  >
                    2
                  </span>
                  <FormLabel className='text-xs font-bold uppercase tracking-wide flex items-center gap-1.5'>
                    <Target className='h-3.5 w-3.5 text-primary' />
                    <span>
                      Tujuan Strategis <span className='text-destructive'>*</span>
                    </span>
                  </FormLabel>
                </div>
                <Badge variant='secondary' className='text-[10px] font-medium'>
                  1 OPD Hanya Boleh Memilih 1 Tujuan Strategis
                </Badge>
              </div>
              <p className='text-[11px] text-muted-foreground pl-7'>
                Diambil dari Tujuan Strategis pada Sumber Data terpilih yang diatur di Perencanaan Kinerja.
              </p>

              <div className='pl-7 pt-1'>
                {!watchedSumberDataId ? (
                  <div className='rounded-lg border border-dashed bg-muted/20 p-4 text-xs text-muted-foreground flex items-center gap-2'>
                    <Info className='h-4 w-4 shrink-0 text-muted-foreground' />
                    <span>
                      Silakan pilih <strong>Sumber Data</strong> pada bagian (1) terlebih dahulu untuk memuat daftar Tujuan Strategis.
                    </span>
                  </div>
                ) : isLoadingTujuan ? (
                  <div className='space-y-2'>
                    <Skeleton className='h-12 w-full rounded-lg' />
                    <Skeleton className='h-12 w-full rounded-lg' />
                  </div>
                ) : tujuanList.length === 0 ? (
                  <div className='rounded-lg border border-amber-500/30 bg-amber-500/5 p-4 text-xs text-amber-700 dark:text-amber-400 flex items-start gap-2.5'>
                    <AlertTriangle className='h-4 w-4 shrink-0 mt-0.5' />
                    <div className='space-y-1'>
                      <p className='font-semibold'>
                        Tidak Ada Tujuan Strategis pada Sumber Data Ini
                      </p>
                      <p className='text-[11px] opacity-90'>
                        Belum ada Tujuan Strategis untuk OPD dan Sumber Data yang dipilih pada periode aktif ini. Silakan periksa menu <strong>Perencanaan Kinerja &rarr; Tujuan, Sasaran &amp; Indikator</strong>.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className='grid grid-cols-1 gap-2'>
                    {tujuanList.map((tujuan) => {
                      const isSelected = field.value === tujuan.id
                      return (
                        <label
                          key={tujuan.id}
                          onClick={() => canEdit && handleTujuanChange(tujuan.id)}
                          className={cn(
                            'flex items-start gap-3 rounded-lg border p-3.5 transition-all select-none',
                            canEdit ? 'cursor-pointer' : 'cursor-not-allowed opacity-60 pointer-events-none',
                            isSelected
                              ? 'border-primary bg-primary/5 ring-1 ring-primary/25 shadow-2xs'
                              : 'border-border bg-card hover:bg-muted/40'
                          )}
                        >
                          <div
                            className={cn(
                              'mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border transition-colors',
                              isSelected
                                ? 'border-primary bg-primary text-primary-foreground'
                                : 'border-muted-foreground/40 bg-background'
                            )}
                          >
                            {isSelected && (
                              <span className='h-1.5 w-1.5 rounded-full bg-primary-foreground' />
                            )}
                          </div>
                          <div className='space-y-1 min-w-0 flex-1'>
                            <div className='flex items-center gap-2 flex-wrap'>
                              {tujuan.kode_tujuan && (
                                <Badge
                                  variant={isSelected ? 'default' : 'outline'}
                                  className='text-[10px] font-mono px-1.5 py-0'
                                >
                                  {tujuan.kode_tujuan}
                                </Badge>
                              )}
                              {tujuan.sumber_data?.nama && (
                                <Badge
                                  variant='secondary'
                                  className='text-[10px] px-1.5 py-0 font-normal'
                                >
                                  {tujuan.sumber_data.nama}
                                </Badge>
                              )}
                              <span className='text-xs font-semibold text-foreground leading-relaxed'>
                                {tujuan.tujuan}
                              </span>
                            </div>
                          </div>
                        </label>
                      )
                    })}
                  </div>
                )}
                <FormMessage className='mt-1.5' />
              </div>
            </FormItem>
          )}
        />
      </div>

      {/* STEP FIELD 3: SASARAN STRATEGIS (DYNAMIC MULTI-SELECT) */}
      <div className='p-5 space-y-3'>
        <FormField
          control={form.control}
          name='sasaran_ids'
          render={() => (
            <FormItem>
              <div className='flex items-center justify-between gap-2 flex-wrap'>
                <div className='flex items-center gap-2'>
                  <span
                    className={cn(
                      'flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-bold font-mono',
                      watchedTujuanId
                        ? 'bg-primary/10 text-primary'
                        : 'bg-muted text-muted-foreground'
                    )}
                  >
                    3
                  </span>
                  <FormLabel className='text-xs font-bold uppercase tracking-wide flex items-center gap-1.5'>
                    <ListChecks className='h-3.5 w-3.5 text-primary' />
                    <span>
                      Sasaran Strategis <span className='text-destructive'>*</span>
                    </span>
                  </FormLabel>
                </div>

                {watchedTujuanId && sasaranList.length > 0 && canEdit && (
                  <div className='flex items-center gap-2'>
                    <Badge variant='outline' className='text-[10px] font-mono'>
                      {watchedSasaranIds.length} / {sasaranList.length} dipilih
                    </Badge>
                    <Button
                      type='button'
                      variant='ghost'
                      size='sm'
                      onClick={toggleAllSasaran}
                      className='h-7 text-xs px-2'
                    >
                      {watchedSasaranIds.length === sasaranList.length
                        ? 'Batal Pilih Semua'
                        : 'Pilih Semua Sasaran'}
                    </Button>
                  </div>
                )}
              </div>
              <p className='text-[11px] text-muted-foreground pl-7'>
                Muncul secara dinamis berdasarkan Tujuan Strategis yang dipilih. Anda dapat memilih satu atau lebih Sasaran Strategis.
              </p>

              <div className='pl-7 pt-1'>
                {!watchedTujuanId ? (
                  <div className='rounded-lg border border-dashed bg-muted/20 p-4 text-xs text-muted-foreground flex items-center gap-2'>
                    <Info className='h-4 w-4 shrink-0' />
                    <span>
                      Pilih <strong>Tujuan Strategis</strong> pada bagian (2) terlebih dahulu untuk menampilkan Sasaran Strategis.
                    </span>
                  </div>
                ) : isLoadingSasaran ? (
                  <div className='space-y-2'>
                    <Skeleton className='h-11 w-full rounded-lg' />
                    <Skeleton className='h-11 w-full rounded-lg' />
                  </div>
                ) : sasaranList.length === 0 ? (
                  <div className='rounded-lg border border-dashed p-4 text-xs text-muted-foreground'>
                    Belum ada data Sasaran Strategis yang terhubung dengan Tujuan Strategis ini.
                  </div>
                ) : (
                  <div className='grid grid-cols-1 gap-2'>
                    {sasaranList.map((sasaran, idx) => {
                      const isChecked = watchedSasaranIds.includes(sasaran.id)
                      return (
                        <label
                          key={sasaran.id}
                          className={cn(
                            'flex items-start gap-3 rounded-lg border p-3 transition-all select-none',
                            canEdit ? 'cursor-pointer' : 'cursor-not-allowed opacity-60 pointer-events-none',
                            isChecked
                              ? 'border-primary/60 bg-primary/5 shadow-2xs'
                              : 'border-border bg-card hover:bg-muted/40'
                          )}
                        >
                          <Checkbox
                            checked={isChecked}
                            disabled={!canEdit}
                            onCheckedChange={(checked) =>
                              toggleSasaran(sasaran.id, Boolean(checked))
                            }
                            className='mt-0.5'
                          />
                          <div className='text-xs leading-relaxed flex-1'>
                            <span className='font-semibold text-muted-foreground mr-1.5'>
                              {idx + 1}.
                            </span>
                            {sasaran.kode_sasaran && (
                              <Badge
                                variant='outline'
                                className='mr-1.5 text-[10px] font-mono px-1.5 py-0'
                              >
                                {sasaran.kode_sasaran}
                              </Badge>
                            )}
                            <span className='font-medium text-foreground'>
                              {sasaran.sasaran}
                            </span>
                          </div>
                        </label>
                      )
                    })}
                  </div>
                )}
                <FormMessage className='mt-1.5' />
              </div>
            </FormItem>
          )}
        />
      </div>

      {/* STEP FIELD 4: IKU RENSTRA OPD YANG AKAN DILAKUKAN PENILAIAN */}
      <div className='p-5 space-y-3'>
        <FormField
          control={form.control}
          name='indikator_ids'
          render={() => (
            <FormItem>
              <div className='flex items-center justify-between gap-2 flex-wrap'>
                <div className='flex items-center gap-2'>
                  <span
                    className={cn(
                      'flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-bold font-mono',
                      watchedSasaranIds.length > 0
                        ? 'bg-primary/10 text-primary'
                        : 'bg-muted text-muted-foreground'
                    )}
                  >
                    4
                  </span>
                  <FormLabel className='text-xs font-bold uppercase tracking-wide flex items-center gap-1.5'>
                    <CheckCircle2 className='h-3.5 w-3.5 text-primary' />
                    <span>
                      IKU Renstra OPD yang Akan Dilakukan Penilaian{' '}
                      <span className='text-destructive'>*</span>
                    </span>
                  </FormLabel>
                </div>

                {watchedSasaranIds.length > 0 &&
                  availableIndikators.length > 0 &&
                  canEdit && (
                    <div className='flex items-center gap-2'>
                      <Badge variant='outline' className='text-[10px] font-mono'>
                        {watchedIndikatorIds.length} / {availableIndikators.length}{' '}
                        dipilih
                      </Badge>
                      <Button
                        type='button'
                        variant='ghost'
                        size='sm'
                        onClick={toggleAllIndikators}
                        className='h-7 text-xs px-2'
                      >
                        {watchedIndikatorIds.length === availableIndikators.length
                          ? 'Batal Pilih Semua'
                          : 'Pilih Semua Indikator'}
                      </Button>
                    </div>
                  )}
              </div>
              <p className='text-[11px] text-muted-foreground pl-7'>
                Muncul secara dinamis berdasarkan Sasaran Strategis yang dipilih. Boleh memilih lebih dari satu indikator.
              </p>

              <div className='pl-7 pt-1'>
                {watchedSasaranIds.length === 0 ? (
                  <div className='rounded-lg border border-dashed bg-muted/20 p-4 text-xs text-muted-foreground flex items-center gap-2'>
                    <Info className='h-4 w-4 shrink-0' />
                    <span>
                      Centang minimal satu <strong>Sasaran Strategis</strong> pada bagian (3) untuk menampilkan daftar IKU / Indikator Renstra OPD.
                    </span>
                  </div>
                ) : isLoadingIndikator ? (
                  <div className='space-y-2'>
                    <Skeleton className='h-11 w-full rounded-lg' />
                    <Skeleton className='h-11 w-full rounded-lg' />
                  </div>
                ) : availableIndikators.length === 0 ? (
                  <div className='rounded-lg border border-dashed p-4 text-xs text-muted-foreground'>
                    Tidak ditemukan IKU / Indikator untuk Sasaran Strategis yang dipilih.
                  </div>
                ) : (
                  <div className='space-y-3'>
                    {sasaranList
                      .filter((s) => watchedSasaranIds.includes(s.id))
                      .map((sasaran) => {
                        const indsForSasaran = availableIndikators.filter(
                          (i) => i.sasaran_penilaian_id === sasaran.id
                        )
                        if (indsForSasaran.length === 0) return null

                        return (
                          <div
                            key={sasaran.id}
                            className='rounded-lg border bg-muted/15 p-3 space-y-2'
                          >
                            <p className='text-[11px] font-semibold text-muted-foreground'>
                              Sasaran: <span className='text-foreground'>{sasaran.sasaran}</span>
                            </p>
                            <div className='grid grid-cols-1 gap-1.5'>
                              {indsForSasaran.map((ind, idx) => {
                                const isChecked = watchedIndikatorIds.includes(ind.id)
                                return (
                                  <label
                                    key={ind.id}
                                    className={cn(
                                      'flex items-start gap-3 rounded-md border p-2.5 transition-all select-none',
                                      canEdit ? 'cursor-pointer' : 'cursor-not-allowed opacity-60 pointer-events-none',
                                      isChecked
                                        ? 'border-primary/60 bg-primary/5'
                                        : 'border-border bg-card hover:bg-muted/40'
                                    )}
                                  >
                                    <Checkbox
                                      checked={isChecked}
                                      disabled={!canEdit}
                                      onCheckedChange={(checked) =>
                                        toggleIndikator(ind.id, Boolean(checked))
                                      }
                                      className='mt-0.5'
                                    />
                                    <div className='text-xs leading-relaxed flex-1 flex items-center justify-between gap-2 flex-wrap'>
                                      <div>
                                        <span className='font-semibold text-muted-foreground mr-1.5'>
                                          {idx + 1}.
                                        </span>
                                        {ind.kode_indikator && (
                                          <span className='font-mono text-[11px] text-muted-foreground mr-1.5'>
                                            [{ind.kode_indikator}]
                                          </span>
                                        )}
                                        <span className='font-medium text-foreground'>
                                          {ind.indikator}
                                        </span>
                                        {ind.satuan && (
                                          <span className='text-muted-foreground ml-1'>
                                            ({ind.satuan})
                                          </span>
                                        )}
                                      </div>
                                      <Badge
                                        className={cn(
                                          'text-[9px] px-1.5 py-0 h-4 shrink-0 font-semibold',
                                          ind.jenis === 'IKU'
                                            ? 'bg-emerald-600 hover:bg-emerald-600 text-white'
                                            : 'bg-secondary text-secondary-foreground'
                                        )}
                                      >
                                        {ind.jenis || 'Indikator'}
                                      </Badge>
                                    </div>
                                  </label>
                                )
                              })}
                            </div>
                          </div>
                        )
                      })}
                  </div>
                )}
                <FormMessage className='mt-1.5' />
              </div>
            </FormItem>
          )}
        />
      </div>

      {/* STEP FIELD 5: INFORMASI LAIN */}
      <div className='p-5 space-y-3'>
        <FormField
          control={form.control}
          name='informasi_lain'
          render={({ field }) => (
            <FormItem>
              <div className='flex items-center gap-2'>
                <span className='flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-primary text-[11px] font-bold font-mono'>
                  5
                </span>
                <FormLabel className='text-xs font-bold uppercase tracking-wide'>
                  Informasi Lain
                </FormLabel>
              </div>
              <div className='pl-7 pt-1'>
                <FormControl>
                  <Textarea
                    placeholder='Tuliskan informasi lain atau isu strategis terkait konteks risiko OPD (isi "-" bila tidak ada)...'
                    disabled={!canEdit}
                    className='text-xs min-h-[80px]'
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </div>
            </FormItem>
          )}
        />
      </div>
    </div>
  )
}
