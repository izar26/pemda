import { useState, useMemo, useEffect } from 'react'
import {
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Trash2,
  Pencil,
  ArrowRight,
  ShieldAlert,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { usePeriode } from './periode-provider'
import {
  usePeriodeOverview,
  usePeriodeMutations,
} from '../../hooks/use-periode-query'
import type { PeriodeStatus } from '@/types/perencanaan'

export function PeriodeDialogs() {
  const { open, setOpen, currentRow, setCurrentRow } = usePeriode()
  const { data: overview } = usePeriodeOverview()
  const { createCycle, updateCycle, deleteCycle } = usePeriodeMutations()

  const cycles = overview?.data || []

  // Create Form State - Controlled Numeric & Structured
  const [startYear, setStartYear] = useState<number>(2026)
  const [duration, setDuration] = useState<number>(5)
  const [activeYear, setActiveYear] = useState<number>(2026)
  const [customName, setCustomName] = useState<string>('')
  const [createKeterangan, setCreateKeterangan] = useState<string>('')
  const [isImmediatelyActive, setIsImmediatelyActive] = useState<boolean>(true)

  // Edit Form State
  const [editName, setEditName] = useState<string>('')
  const [editKeterangan, setEditKeterangan] = useState<string>('')
  const [editStatus, setEditStatus] = useState<PeriodeStatus>('inactive')

  // Auto-calculated End Year
  const endYear = useMemo(() => {
    return startYear + duration - 1
  }, [startYear, duration])

  // Generated evaluation years list [startYear .. endYear]
  const generatedYears = useMemo(() => {
    const list: number[] = []
    if (startYear >= 2020 && endYear <= 2055 && startYear <= endYear) {
      for (let y = startYear; y <= endYear; y++) {
        list.push(y)
      }
    }
    return list
  }, [startYear, endYear])

  // Reset form when dialog opens
  useEffect(() => {
    if (open === 'create') {
      // Find highest year from existing cycles to suggest the next logical cycle
      const lastEnd =
        cycles.length > 0 ? Math.max(...cycles.map((c) => Number(c.tahun_selesai))) : 2025
      const nextStart = lastEnd >= 2025 ? lastEnd + 1 : 2026
      setStartYear(nextStart)
      setDuration(5)
      setActiveYear(nextStart)
      setCustomName('')
      setCreateKeterangan('')
      setIsImmediatelyActive(cycles.length === 0)
    }
    if (open === 'edit' && currentRow) {
      setEditName(currentRow.nama || '')
      setEditKeterangan(currentRow.keterangan || '')
      setEditStatus(currentRow.status)
    }
  }, [open, currentRow, cycles])

  // Sync active year choice if startYear or duration changes and activeYear is out of range
  useEffect(() => {
    if (activeYear < startYear || activeYear > endYear) {
      setActiveYear(startYear)
    }
  }, [startYear, endYear, activeYear])

  // Strict Real-Time Anti-Overlap Check
  const overlapConflict = useMemo(() => {
    if (open !== 'create') return null
    if (!startYear || !endYear) return null

    return cycles.find((c) => {
      const cStart = Number(c.tahun_mulai)
      const cEnd = Number(c.tahun_selesai)
      return startYear <= cEnd && endYear >= cStart
    })
  }, [cycles, startYear, endYear, open])

  const isValidYearRange = startYear >= 2020 && startYear <= 2050 && duration >= 1 && duration <= 6

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isValidYearRange || Boolean(overlapConflict)) return

    const defaultNama = `RPJMD ${startYear} - ${endYear}`
    const finalNama = customName.trim() ? customName.trim() : defaultNama

    await createCycle.mutateAsync({
      nama: finalNama,
      tahun_mulai: startYear,
      tahun_selesai: endYear,
      durasi_tahun: duration,
      tahun_aktif: activeYear,
      status: isImmediatelyActive ? 'Aktif' : 'Tidak Aktif',
      keterangan: createKeterangan.trim() || null,
    })

    setOpen(null)
  }

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!currentRow) return

    await updateCycle.mutateAsync({
      id: currentRow.id,
      payload: {
        nama: editName.trim() || currentRow.nama,
        status: editStatus,
        keterangan: editKeterangan.trim() || null,
      },
    })

    setOpen(null)
    setCurrentRow(null)
  }

  const handleDeleteConfirm = async () => {
    if (!currentRow) return
    await deleteCycle.mutateAsync(currentRow.id)
    setOpen(null)
    setCurrentRow(null)
  }

  return (
    <>
      {/* 1. DIALOG TAMBAH SIKLUS PERIODE PERENCANAAN */}
      <Dialog
        open={open === 'create'}
        onOpenChange={(isOpen) => !isOpen && setOpen(null)}
      >
        <DialogContent className='sm:max-w-lg p-0 overflow-hidden shadow-2xl'>
          <DialogHeader className='px-6 pt-5 pb-4 border-b bg-muted/15 text-start'>
            <div className='flex items-center gap-3'>
              <div className='flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary'>
                <Calendar className='h-5 w-5' />
              </div>
              <div>
                <DialogTitle className='text-base font-bold text-foreground'>
                  Tambah Periode Perencanaan (RPJMD)
                </DialogTitle>
                <DialogDescription className='text-xs text-muted-foreground mt-0.5'>
                  Tentukan tahun awal siklus 5 tahunan. Slot evaluasi tahunan akan digenerate otomatis.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <form onSubmit={handleCreateSubmit} className='px-6 py-4 space-y-4'>
            {/* Grid Input Tahun Mulai & Durasi */}
            <div className='grid grid-cols-2 gap-3.5'>
              <div className='space-y-1.5'>
                <Label htmlFor='input_tahun_mulai' className='text-xs font-semibold'>
                  Tahun Mulai*
                </Label>
                <Input
                  id='input_tahun_mulai'
                  type='number'
                  min={2020}
                  max={2050}
                  value={startYear || ''}
                  onChange={(e) => {
                    const raw = e.target.value.replace(/\D/g, '').slice(0, 4)
                    const val = parseInt(raw, 10)
                    if (!isNaN(val)) setStartYear(val)
                    else if (raw === '') setStartYear(0)
                  }}
                  placeholder='2026'
                  className='text-xs h-9 font-mono font-semibold'
                  required
                />
                <p className='text-[10px] text-muted-foreground'>
                  Awal periode RPJMD (contoh: 2026)
                </p>
              </div>

              <div className='space-y-1.5'>
                <Label htmlFor='select_durasi' className='text-xs font-semibold'>
                  Durasi Siklus*
                </Label>
                <Select
                  value={String(duration)}
                  onValueChange={(val) => setDuration(Number(val))}
                >
                  <SelectTrigger id='select_durasi' className='text-xs h-9 font-medium'>
                    <SelectValue placeholder='Pilih Durasi' />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='5' className='text-xs font-medium'>
                      5 Tahun (Standar RPJMD)
                    </SelectItem>
                    <SelectItem value='6' className='text-xs font-medium'>
                      6 Tahun (Siklus Transisi)
                    </SelectItem>
                    <SelectItem value='4' className='text-xs font-medium'>
                      4 Tahun
                    </SelectItem>
                    <SelectItem value='3' className='text-xs font-medium'>
                      3 Tahun
                    </SelectItem>
                    <SelectItem value='1' className='text-xs font-medium'>
                      1 Tahun (RPD Transisi)
                    </SelectItem>
                  </SelectContent>
                </Select>
                <p className='text-[10px] text-muted-foreground'>
                  Rentang siklus rencana pembangunan
                </p>
              </div>
            </div>

            {/* Preview Rentang & Slot Evaluasi yang Terbentuk */}
            <div className='rounded-lg border bg-muted/30 p-3 space-y-2'>
              <div className='flex items-center justify-between text-xs'>
                <span className='font-semibold text-foreground flex items-center gap-1.5'>
                  <Calendar className='h-3.5 w-3.5 text-primary' />
                  Rentang Siklus Terbentuk:
                </span>
                <span className='font-mono font-bold text-sm text-primary flex items-center gap-1'>
                  {startYear || '...'} <ArrowRight className='h-3 w-3 inline text-muted-foreground' /> {endYear || '...'}
                  <Badge variant='outline' className='ml-1.5 text-[10px] py-0 font-normal'>
                    {duration} Tahun
                  </Badge>
                </span>
              </div>

              {/* Slot Tahun Otomatis */}
              <div className='flex items-center gap-1.5 flex-wrap pt-0.5'>
                <span className='text-[10px] text-muted-foreground'>Slot Evaluasi:</span>
                {generatedYears.map((y) => (
                  <Badge
                    key={y}
                    variant='secondary'
                    className='text-[10px] font-mono px-1.5 py-0 bg-background border text-foreground'
                  >
                    {y}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Banner Anti-Bentrok Real-time */}
            {overlapConflict ? (
              <div className='rounded-md border border-rose-200 dark:border-rose-900 bg-rose-50/70 dark:bg-rose-950/40 p-2.5 flex items-start gap-2.5 text-xs text-rose-700 dark:text-rose-300'>
                <ShieldAlert className='h-4 w-4 shrink-0 mt-0.5 text-rose-600 dark:text-rose-400' />
                <div className='space-y-0.5 leading-tight'>
                  <span className='font-bold block'>
                    Konflik Rentang Terdeteksi!
                  </span>
                  <p className='text-[11px] text-rose-600/90 dark:text-rose-300/90'>
                    Rentang {startYear} - {endYear} bentrok dengan siklus{' '}
                    <strong>{overlapConflict.nama}</strong> ({overlapConflict.tahun_mulai} - {overlapConflict.tahun_selesai}).
                    Periode perencanaan tidak boleh tumpang tindih. Silakan ubah Tahun Mulai.
                  </p>
                </div>
              </div>
            ) : isValidYearRange ? (
              <div className='rounded-md border border-emerald-200 dark:border-emerald-900 bg-emerald-50/70 dark:bg-emerald-950/40 p-2.5 flex items-center gap-2 text-xs text-emerald-700 dark:text-emerald-300'>
                <CheckCircle2 className='h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400' />
                <span>
                  Rentang <strong>{startYear} - {endYear}</strong> tersedia dan siap dibuat.
                </span>
              </div>
            ) : (
              <div className='rounded-md border border-amber-200 bg-amber-50/70 p-2 text-xs text-amber-700 flex items-center gap-1.5'>
                <AlertTriangle className='h-3.5 w-3.5 shrink-0' />
                <span>Masukkan tahun mulai yang valid (antara 2020 s/d 2050).</span>
              </div>
            )}

            {/* Tahun Aktif Pertama */}
            <div className='space-y-1.5'>
              <Label htmlFor='select_first_active_year' className='text-xs font-semibold'>
                Tahun Evaluasi Aktif Pertama*
              </Label>
              <Select
                value={String(activeYear)}
                onValueChange={(val) => setActiveYear(Number(val))}
                disabled={generatedYears.length === 0}
              >
                <SelectTrigger id='select_first_active_year' className='text-xs h-9 font-mono'>
                  <SelectValue placeholder='Pilih Tahun Aktif' />
                </SelectTrigger>
                <SelectContent>
                  {generatedYears.map((y) => (
                    <SelectItem key={y} value={String(y)} className='text-xs font-mono'>
                      Tahun {y}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className='text-[10px] text-muted-foreground'>
                Tahun yang langsung menjadi tahun aktif penilaian saat periode ini disimpan.
              </p>
            </div>

            {/* Nama Siklus (Opsional) */}
            <div className='space-y-1.5'>
              <div className='flex items-center justify-between'>
                <Label htmlFor='input_nama_siklus' className='text-xs font-semibold'>
                  Nama Siklus (Opsional)
                </Label>
                <span className='text-[10px] text-muted-foreground'>
                  Default: RPJMD {startYear} - {endYear}
                </span>
              </div>
              <Input
                id='input_nama_siklus'
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                placeholder={`RPJMD ${startYear} - ${endYear}`}
                className='text-xs h-9'
              />
            </div>

            {/* Keterangan (Opsional) */}
            <div className='space-y-1.5'>
              <Label htmlFor='input_create_ket' className='text-xs font-semibold'>
                Keterangan / Dasar Hukum (Opsional)
              </Label>
              <Input
                id='input_create_ket'
                value={createKeterangan}
                onChange={(e) => setCreateKeterangan(e.target.value)}
                placeholder='contoh: Perda Kab. Cianjur No. 5 Tahun 2026'
                className='text-xs h-9'
              />
            </div>

            {/* Opsi Aktifkan Langsung */}
            <div className='flex items-center space-x-2 pt-1'>
              <Checkbox
                id='check_immediately_active'
                checked={isImmediatelyActive}
                onCheckedChange={(checked) => setIsImmediatelyActive(Boolean(checked))}
              />
              <Label
                htmlFor='check_immediately_active'
                className='text-xs font-medium cursor-pointer text-foreground'
              >
                Jadikan sebagai Siklus Aktif Global sekarang
              </Label>
            </div>

            <DialogFooter className='pt-2'>
              <Button
                type='button'
                variant='outline'
                size='sm'
                onClick={() => setOpen(null)}
                className='text-xs h-9'
              >
                Batal
              </Button>
              <Button
                type='submit'
                size='sm'
                disabled={createCycle.isPending || Boolean(overlapConflict) || !isValidYearRange}
                className='text-xs h-9 min-w-[130px]'
              >
                {createCycle.isPending ? (
                  <>
                    <Loader2 className='h-3.5 w-3.5 mr-1.5 animate-spin' /> Menyimpan...
                  </>
                ) : (
                  'Simpan & Buat Siklus'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* 2. DIALOG EDIT PERIODE */}
      <Dialog
        open={open === 'edit' && Boolean(currentRow)}
        onOpenChange={(isOpen) => {
          if (!isOpen) {
            setOpen(null)
            setCurrentRow(null)
          }
        }}
      >
        <DialogContent className='sm:max-w-md p-0 overflow-hidden shadow-2xl'>
          <DialogHeader className='px-6 pt-5 pb-4 border-b bg-muted/15 text-start'>
            <div className='flex items-center gap-3'>
              <div className='flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600'>
                <Pencil className='h-5 w-5' />
              </div>
              <div>
                <DialogTitle className='text-base font-bold text-foreground'>
                  Edit Siklus Perencanaan
                </DialogTitle>
                <DialogDescription className='text-xs text-muted-foreground mt-0.5'>
                  Perbarui nama, status, atau catatan keterangan periode.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <form onSubmit={handleEditSubmit} className='px-6 py-4 space-y-4'>
            {/* Rentang Tahun (Read-Only demi integritas referensi) */}
            <div className='space-y-1.5'>
              <Label className='text-xs font-semibold'>Rentang Tahun Siklus</Label>
              <div className='flex items-center justify-between px-3 py-2 rounded-md border bg-muted/40 font-mono text-xs'>
                <span className='font-bold text-foreground'>
                  {currentRow?.tahun_mulai} - {currentRow?.tahun_selesai}
                </span>
                <Badge variant='outline' className='text-[10px]'>
                  {currentRow?.durasi_tahun} Tahun Siklus
                </Badge>
              </div>
              <p className='text-[10px] text-muted-foreground'>
                Rentang tahun terkunci untuk menjaga konsistensi cascading tujuan dan sasaran.
              </p>
            </div>

            {/* Nama Siklus */}
            <div className='space-y-1.5'>
              <Label htmlFor='edit_nama_siklus' className='text-xs font-semibold'>
                Nama Siklus
              </Label>
              <Input
                id='edit_nama_siklus'
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className='text-xs h-9'
                placeholder='Nama RPJMD...'
              />
            </div>

            {/* Status Periode */}
            <div className='space-y-1.5'>
              <Label className='text-xs font-semibold'>Status Siklus</Label>
              <Select
                value={editStatus}
                onValueChange={(val: PeriodeStatus) => setEditStatus(val)}
              >
                <SelectTrigger className='text-xs h-9'>
                  <SelectValue placeholder='Pilih Status' />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='Aktif' className='text-xs'>
                    Aktif Global
                  </SelectItem>
                  <SelectItem value='Tidak Aktif' className='text-xs'>
                    Nonaktif
                  </SelectItem>
                  <SelectItem value='Arsip' className='text-xs'>
                    Arsip
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Keterangan */}
            <div className='space-y-1.5'>
              <Label htmlFor='edit_ket' className='text-xs font-semibold'>
                Keterangan
              </Label>
              <Input
                id='edit_ket'
                value={editKeterangan}
                onChange={(e) => setEditKeterangan(e.target.value)}
                className='text-xs h-9'
                placeholder='Catatan atau dasar hukum...'
              />
            </div>

            <DialogFooter className='pt-2'>
              <Button
                type='button'
                variant='outline'
                size='sm'
                onClick={() => {
                  setOpen(null)
                  setCurrentRow(null)
                }}
                className='text-xs h-9'
              >
                Batal
              </Button>
              <Button
                type='submit'
                size='sm'
                disabled={updateCycle.isPending}
                className='text-xs h-9 min-w-[130px]'
              >
                {updateCycle.isPending ? (
                  <>
                    <Loader2 className='h-3.5 w-3.5 mr-1.5 animate-spin' /> Menyimpan...
                  </>
                ) : (
                  'Simpan Perubahan'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* 3. DIALOG HAPUS PERIODE (ConfirmDialog) */}
      <ConfirmDialog
        open={open === 'delete' && Boolean(currentRow)}
        onOpenChange={(isOpen) => {
          if (!isOpen) {
            setOpen(null)
            setCurrentRow(null)
          }
        }}
        handleConfirm={handleDeleteConfirm}
        isLoading={deleteCycle.isPending}
        destructive
        title={
          <div className='flex items-center gap-2 text-destructive'>
            <Trash2 className='h-5 w-5' />
            <span>Hapus Siklus Perencanaan</span>
          </div>
        }
        desc={
          currentRow ? (
            <div className='space-y-2 text-xs'>
              <p>
                Apakah Anda yakin ingin menghapus siklus{' '}
                <strong className='text-foreground'>{currentRow.nama}</strong> ({currentRow.tahun_mulai} - {currentRow.tahun_selesai})?
              </p>
              <p className='text-muted-foreground'>
                Sistem akan memverifikasi integritas data: Siklus tidak dapat dihapus jika tahun di dalamnya sudah memiliki data Cascading (Tujuan/Sasaran) atau Renstra OPD.
              </p>
            </div>
          ) : (
            ''
          )
        }
        confirmText='Hapus Siklus'
        cancelBtnText='Batal'
      />
    </>
  )
}
