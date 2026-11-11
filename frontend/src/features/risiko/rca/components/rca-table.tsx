import { useMemo, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { BrainCircuit, Search } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type { RootCauseAnalysis } from '@/types/risiko'

interface RcaTableProps {
  rcaList: RootCauseAnalysis[]
  canEdit: boolean
  onEditRca: (rca: RootCauseAnalysis) => void
}

type FormFilter = 'all' | '3a' | '3b' | '3c'

function sourceOf(rca: RootCauseAnalysis): Exclude<FormFilter, 'all'> {
  if (rca.source_type === '3c' || rca.identifikasi_risiko_opd_operasional_item_id) return '3c'
  if (rca.source_type === '3b' || rca.identifikasi_risiko_opd_item_id) return '3b'
  return '3a'
}

function isComplete(rca: RootCauseAnalysis) {
  return Boolean(rca.akar_penyebab?.trim() && rca.jenis_penyebab?.trim())
}

export function RcaTable({ rcaList, canEdit, onEditRca }: RcaTableProps) {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<FormFilter>('all')
  const [onlyIncomplete, setOnlyIncomplete] = useState(false)
  const [search, setSearch] = useState('')
  const completed = rcaList.filter(isComplete).length
  const visible = useMemo(() => {
    const query = search.trim().toLocaleLowerCase()
    return rcaList.filter((rca) => {
      const matchesForm = activeTab === 'all' || sourceOf(rca) === activeTab
      const matchesStatus = !onlyIncomplete || !isComplete(rca)
      const matchesSearch = !query || [rca.item?.kode_risiko, rca.item?.pernyataan_risiko, rca.akar_penyebab]
        .some((value) => value?.toLocaleLowerCase().includes(query))
      return matchesForm && matchesStatus && matchesSearch
    })
  }, [rcaList, activeTab, onlyIncomplete, search])

  return (
    <section className='min-w-0 space-y-4' aria-label='Daftar analisis risiko'>
      <div className='flex flex-wrap items-start justify-between gap-3'>
        <div className='space-y-1'>
          <h3 className='flex items-center gap-2 text-base font-bold'>
            <BrainCircuit className='h-4 w-4 text-primary' /> Analisis Akar Masalah
          </h3>
          <p className='text-sm text-muted-foreground'>Pilih risiko, lalu telusuri penyebabnya sampai menemukan akar masalah.</p>
        </div>
        <Badge variant='outline' className='text-xs'>{completed} dari {rcaList.length} analisis lengkap</Badge>
      </div>

      <div className='space-y-3 rounded-lg border bg-card p-3 sm:p-4'>
        <div className='flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between'>
          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as FormFilter)} className='min-w-0'>
            <TabsList className='flex h-auto w-full flex-wrap justify-start gap-1 p-1'>
              {([['all', 'Semua'], ['3a', 'Pemda (3A)'], ['3b', 'OPD (3B)'], ['3c', 'Operasional (3C)']] as const).map(([id, label]) => (
                <TabsTrigger key={id} value={id} className='min-h-8 text-xs'>
                  {label} <span className='ml-1 text-muted-foreground'>({id === 'all' ? rcaList.length : rcaList.filter((r) => sourceOf(r) === id).length})</span>
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
          <div className='relative w-full lg:max-w-xs'>
            <Search aria-hidden='true' className='absolute left-3 top-2.5 h-4 w-4 text-muted-foreground' />
            <Input aria-label='Cari risiko atau akar penyebab' value={search} onChange={(event) => setSearch(event.target.value)} placeholder='Cari kode, risiko, atau penyebab' className='pl-9' />
          </div>
        </div>
        <div className='flex flex-wrap items-center justify-between gap-2'>
          <label className='flex cursor-pointer items-center gap-2 text-sm'>
            <input type='checkbox' checked={onlyIncomplete} onChange={(event) => setOnlyIncomplete(event.target.checked)} className='h-4 w-4 accent-primary' />
            Hanya yang belum lengkap
          </label>
          <span className='text-xs text-muted-foreground'>{visible.length} risiko ditampilkan</span>
        </div>
      </div>

      {visible.length === 0 ? (
        <div className='rounded-lg border bg-card p-6 text-center text-sm text-muted-foreground'>
          {rcaList.length === 0 ? (
            <div className='space-y-3'><p>Belum ada risiko untuk dianalisis. Tambahkan risiko pada Form 3A, 3B, atau 3C.</p><Button type='button' variant='outline' size='sm' onClick={() => navigate({ to: '/risiko/identifikasi-pemda' })}>Buka Form 3A</Button></div>
          ) : <p>Tidak ada risiko yang sesuai dengan filter. Ubah pencarian atau filter untuk melihat risiko lainnya.</p>}
        </div>
      ) : (
        <ul className='space-y-3'>
          {visible.map((rca) => {
            const complete = isComplete(rca)
            const started = Boolean(rca.why_1 || rca.why_2 || rca.why_3 || rca.why_4 || rca.why_5)
            return (
              <li key={rca.id} className='min-w-0 rounded-lg border bg-card p-4 shadow-xs'>
                <div className='flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between'>
                  <div className='min-w-0 flex-1 space-y-2'>
                    <div className='flex flex-wrap items-center gap-2'>
                      <Badge variant='outline'>Form {sourceOf(rca).toUpperCase()}</Badge>
                      <span className='break-all font-mono text-xs font-semibold'>{rca.item?.kode_risiko || 'Kode belum tersedia'}</span>
                      <Badge variant='outline' className={complete ? 'border-emerald-500/30 text-emerald-700 dark:text-emerald-400' : 'border-amber-500/40 text-amber-700 dark:text-amber-400'}>{complete ? 'Lengkap' : 'Belum lengkap'}</Badge>
                    </div>
                    <p className='break-words text-sm font-semibold leading-relaxed'>{rca.item?.pernyataan_risiko || 'Pernyataan risiko tidak tersedia'}</p>
                    {rca.item?.sub_kegiatan && <p className='text-xs text-muted-foreground'>Sub-kegiatan: {rca.item.sub_kegiatan}</p>}
                    <div className='rounded-md bg-muted/50 p-3 text-sm'>
                      <span className='block text-xs font-medium text-muted-foreground'>Akar penyebab</span>
                      <p className='mt-1 break-words'>{rca.akar_penyebab || 'Belum ditentukan'}</p>
                      {rca.jenis_penyebab && <p className='mt-1 text-xs text-muted-foreground'>Jenis penyebab: {rca.jenis_penyebab}</p>}
                    </div>
                  </div>
                  <Button type='button' variant={complete || !canEdit ? 'outline' : 'default'} size='sm' onClick={() => onEditRca(rca)} className='w-full shrink-0 sm:w-auto'>
                    {!canEdit ? 'Lihat Analisis' : started ? 'Lihat / Ubah Analisis' : 'Mulai Analisis'}
                  </Button>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
