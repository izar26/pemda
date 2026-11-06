import { useMemo, useState } from 'react'
import { isAxiosError } from 'axios'
import { toast } from 'sonner'
import { useQuery } from '@tanstack/react-query'
import { Calendar, Copy, Loader2 } from 'lucide-react'
import { opdService } from '@/services/opd-service'
import { perencanaanService } from '@/services/perencanaan-service'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { SearchableSelect } from '@/components/searchable-select'
import { useAuthStore } from '@/stores/auth-store'

export interface TujuanCopyDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
  isOpdRole?: boolean
}

export function TujuanCopyDialog({
  open,
  onOpenChange,
  onSuccess,
  isOpdRole = false,
}: TujuanCopyDialogProps) {
  const [sourcePeriodeId, setSourcePeriodeId] = useState('')
  const [selectedOpdId, setSelectedOpdId] = useState('all')
  const [isCopying, setIsCopying] = useState(false)
  const user = useAuthStore((state) => state.auth.user)

  const { data: periodesResp, isLoading: isLoadingPeriodes } = useQuery({
    queryKey: ['perencanaan', 'periode', 'all-for-copy'],
    queryFn: () => perencanaanService.getPaginatedPeriodes({ all: true }),
    enabled: open,
  })

  const { data: opdData, isLoading: isLoadingOpd } = useQuery({
    queryKey: ['opds', 'all-for-tujuan-copy'],
    queryFn: () => opdService.getOpds({ all: true }),
    staleTime: 5 * 60 * 1000,
    enabled: open && !isOpdRole,
  })

  const periodes = useMemo(() => periodesResp?.data || [], [periodesResp?.data])
  const activePeriode = useMemo(
    () => periodes.find((p) => p.is_aktif || p.status === 'aktif'),
    [periodes]
  )
  const sourcePeriodes = useMemo(
    () => periodes.filter((p) => !p.is_aktif && p.status !== 'aktif'),
    [periodes]
  )

  const periodeOptions = useMemo(
    () =>
      sourcePeriodes.map((p) => ({
        value: String(p.id),
        label: `${p.nama_periode} — Tahun ${p.tahun_penilaian} (${p.status === 'arsip' ? 'Arsip' : 'Draft'})`,
      })),
    [sourcePeriodes]
  )

  const opdOptions = useMemo(
    () => [
      { value: 'all', label: 'Semua Perangkat Daerah (Salin Massal)' },
      ...(opdData || []).map((opd: { id: string | number; nama: string; kode: string }) => ({
        value: String(opd.id),
        label: `${opd.nama} (${opd.kode})`,
      })),
    ],
    [opdData]
  )

  const defaultSourcePeriodeId = periodeOptions[0]?.value || ''
  const effectiveSourcePeriodeId = sourcePeriodeId || defaultSourcePeriodeId

  const [prevOpen, setPrevOpen] = useState(open)
  if (open !== prevOpen) {
    setPrevOpen(open)
    if (open) {
      setSelectedOpdId('all')
      setSourcePeriodeId('')
    }
  }

  async function handleCopy() {
    if (!effectiveSourcePeriodeId) {
      toast.error('Silakan pilih periode sumber terlebih dahulu.')
      return
    }

    setIsCopying(true)
    try {
      const targetOpdId = isOpdRole
        ? user?.opd_id
          ? String(user.opd_id)
          : undefined
        : selectedOpdId !== 'all'
        ? selectedOpdId
        : undefined

      const res = await perencanaanService.copyTujuan({
        source_periode_id: effectiveSourcePeriodeId,
        opd_id: targetOpdId,
      })

      toast.success(res.message)
      onSuccess()
      onOpenChange(false)
    } catch (error) {
      if (isAxiosError(error)) {
        const errors = error.response?.data?.errors
        if (errors?.source_periode_id) {
          toast.error(errors.source_periode_id[0])
        } else {
          toast.error(
            error.response?.data?.message || 'Gagal menyalin data dari periode sumber.'
          )
        }
      } else {
        toast.error('Terjadi kesalahan saat menyalin data.')
      }
    } finally {
      setIsCopying(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-lg max-h-[85vh] flex flex-col p-0 gap-0 overflow-hidden shadow-2xl'>
        <DialogHeader className='px-6 pt-5 pb-4 border-b bg-muted/10 shrink-0 text-start'>
          <div className='flex items-center gap-3'>
            <div className='flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary'>
              <Copy className='h-5 w-5' />
            </div>
            <div>
              <DialogTitle className='text-lg font-bold text-foreground'>
                Salin dari Periode Sebelumnya
              </DialogTitle>
              <DialogDescription className='text-xs text-muted-foreground mt-0.5'>
                Salin satu paket pohon Tujuan, Sasaran &amp; Indikator dari tahun/periode sebelumnya ke tahun penilaian aktif.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className='flex-1 overflow-y-auto px-6 py-4 min-h-0 space-y-4'>
          <div className='rounded-lg border bg-primary/5 border-primary/20 p-3.5 space-y-1'>
            <div className='flex items-center gap-1.5 text-xs font-semibold text-primary'>
              <Calendar className='h-3.5 w-3.5' />
              Target Tahun Penilaian Aktif:
            </div>
            {activePeriode ? (
              <p className='text-xs font-medium text-foreground'>
                {activePeriode.nama_periode} (Tahun Penilaian{' '}
                <span className='font-bold'>{activePeriode.tahun_penilaian}</span>)
              </p>
            ) : (
              <p className='text-xs text-destructive font-medium'>
                Belum ada periode penilaian yang aktif!
              </p>
            )}
          </div>

          <div className='space-y-1.5'>
            <label className='text-xs font-semibold text-foreground'>
              Pilih Periode Sumber <span className='text-destructive'>*</span>
            </label>
            <SearchableSelect
              options={periodeOptions}
              value={sourcePeriodeId}
              onValueChange={setSourcePeriodeId}
              allowClear={false}
              placeholder={
                isLoadingPeriodes
                  ? 'Memuat daftar periode...'
                  : periodeOptions.length === 0
                    ? 'Tidak ada periode sumber lain yang tersedia'
                    : 'Pilih siklus periode sumber...'
              }
              searchPlaceholder='Cari nama atau tahun periode...'
              emptyMessage='Tidak ada periode lain yang tersedia.'
              disabled={isLoadingPeriodes || isCopying || periodeOptions.length === 0}
            />
          </div>

          {!isOpdRole && (
            <div className='space-y-1.5'>
              <label className='text-xs font-semibold text-foreground'>
                Filter Perangkat Daerah (Opsional)
              </label>
              <SearchableSelect
                options={opdOptions}
                value={selectedOpdId}
                onValueChange={(val) => setSelectedOpdId(val || 'all')}
                allowClear={false}
                placeholder={
                  isLoadingOpd
                    ? 'Memuat daftar OPD...'
                    : 'Semua Perangkat Daerah (Salin Massal)'
                }
                searchPlaceholder='Cari nama atau kode OPD...'
                emptyMessage='OPD tidak ditemukan.'
                disabled={isLoadingOpd || isCopying}
              />
              <p className='text-[11px] text-muted-foreground'>
                Data yang sudah ada tidak akan ditimpa (duplikasi dicegah otomatis).
              </p>
            </div>
          )}
        </div>

        <DialogFooter className='px-6 py-3.5 border-t bg-muted/10 shrink-0'>
          <Button
            type='button'
            variant='outline'
            size='sm'
            onClick={() => onOpenChange(false)}
            disabled={isCopying}
            className='text-xs'
          >
            Batal
          </Button>
          <Button
            type='button'
            size='sm'
            onClick={handleCopy}
            disabled={isCopying || !activePeriode || !sourcePeriodeId}
            className='text-xs min-w-[130px]'
          >
            {isCopying ? (
              <>
                <Loader2 className='mr-1.5 h-3.5 w-3.5 animate-spin' />
                Menyalin...
              </>
            ) : (
              <>
                <Copy className='mr-1.5 h-3.5 w-3.5' />
                Salin Sekarang
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
