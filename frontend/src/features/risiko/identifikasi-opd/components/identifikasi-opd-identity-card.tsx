import { useState, useEffect } from 'react'
import { Building2, Calendar, FileText, Landmark, Save, Loader2, CheckCircle2, Tag } from 'lucide-react'
import { toast } from 'sonner'
import { Card, CardContent } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { SearchableSelect } from '@/components/searchable-select'
import type { IdentifikasiRisikoOpd, IdentifikasiRisikoOpdMeta } from '@/types/risiko'
import { risikoService } from '@/services/risiko-service'

interface IdentifikasiOpdIdentityCardProps {
  dokumen: IdentifikasiRisikoOpd | null
  meta: IdentifikasiRisikoOpdMeta | null
  opdName: string
  opdId: string
  periodeId?: string
  tahunPenilaian?: number | string
  rentangTahun?: string
  canEdit: boolean
  onSaved: () => void
}

export function IdentifikasiOpdIdentityCard({
  dokumen,
  meta,
  opdName,
  opdId,
  periodeId,
  tahunPenilaian,
  rentangTahun,
  canEdit,
  onSaved,
}: IdentifikasiOpdIdentityCardProps) {
  const [selectedUrusanId, setSelectedUrusanId] = useState<string>('')
  const [singkatanOpd, setSingkatanOpd] = useState<string>('')
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (dokumen?.master_urusan_pemerintahan_id) {
      setSelectedUrusanId(dokumen.master_urusan_pemerintahan_id)
    }
    if (dokumen?.singkatan_opd) {
      setSingkatanOpd(dokumen.singkatan_opd)
    }
  }, [dokumen?.master_urusan_pemerintahan_id, dokumen?.singkatan_opd])

  const urusanOptions = (meta?.urusan_pemerintahans || []).map((u) => ({
    value: u.id,
    label: `${u.kode} - ${u.nama}`,
  }))

  const hasUrusanChanged = selectedUrusanId !== (dokumen?.master_urusan_pemerintahan_id || '')
  const hasSingkatanChanged = singkatanOpd !== (dokumen?.singkatan_opd || '')
  const hasChanged = hasUrusanChanged || hasSingkatanChanged

  async function handleSaveHeader() {
    if (!selectedUrusanId) {
      toast.warning('Silakan pilih Urusan Pemerintahan dari master data terlebih dahulu.')
      return
    }

    try {
      setIsSaving(true)
      await risikoService.saveIdentifikasiOpdHeader({
        opd_id: opdId,
        periode_penilaian_id: periodeId,
        master_urusan_pemerintahan_id: selectedUrusanId,
        nama_pemda: dokumen?.nama_pemda || 'Pemerintah Kabupaten Cianjur',
        singkatan_opd: singkatanOpd || undefined,
      })
      toast.success('Identitas Form 3B berhasil disimpan.')
      onSaved()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal menyimpan identitas dokumen.'
      toast.error(msg)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Card className='border shadow-xs bg-card'>
      <CardContent className='p-4 sm:p-5 space-y-4'>
        <div className='flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b pb-3'>
          <div className='flex items-center gap-2'>
            <div className='p-2 rounded-lg bg-primary/10 text-primary'>
              <Building2 className='h-5 w-5' />
            </div>
            <div>
              <h2 className='text-sm sm:text-base font-bold text-foreground'>
                Identitas Lembar Kerja Form 3B
              </h2>
              <p className='text-xs text-muted-foreground'>
                Kertas Kerja Identifikasi Risiko Strategis Perangkat Daerah (OPD)
              </p>
            </div>
          </div>
          {dokumen?.master_urusan_pemerintahan_id && (
            <div className='flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-semibold'>
              <CheckCircle2 className='h-4 w-4' />
              <span>Urusan Terhubung</span>
            </div>
          )}
        </div>

        <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-xs'>
          {/* 1. Nama Pemda */}
          <div className='space-y-1 p-2.5 rounded-md bg-muted/40 border border-border/60'>
            <span className='text-[11px] text-muted-foreground font-medium flex items-center gap-1'>
              <Landmark className='h-3.5 w-3.5' /> Nama Pemda
            </span>
            <p className='font-semibold text-foreground truncate'>
              {dokumen?.nama_pemda || 'Pemerintah Kabupaten Cianjur'}
            </p>
          </div>

          {/* 2. Tahun & Periode */}
          <div className='space-y-1 p-2.5 rounded-md bg-muted/40 border border-border/60'>
            <span className='text-[11px] text-muted-foreground font-medium flex items-center gap-1'>
              <Calendar className='h-3.5 w-3.5' /> Tahun / Periode Penilaian
            </span>
            <p className='font-semibold text-foreground'>
              Tahun {tahunPenilaian || '2026'} ({rentangTahun || '2026 - 2030'})
            </p>
          </div>

          {/* 3. OPD Pengisi & Singkatan */}
          <div className='space-y-1 p-2.5 rounded-md bg-muted/40 border border-border/60'>
            <div className='flex items-center justify-between'>
              <span className='text-[11px] text-muted-foreground font-medium flex items-center gap-1'>
                <Building2 className='h-3.5 w-3.5' /> Perangkat Daerah (OPD)
              </span>
              <span className='text-[10px] text-muted-foreground flex items-center gap-0.5'>
                <Tag className='h-3 w-3' /> Singkatan:
              </span>
            </div>
            <div className='flex items-center justify-between gap-2'>
              <p className='font-semibold text-foreground truncate' title={opdName}>
                {opdName}
              </p>
              {canEdit ? (
                <Input
                  value={singkatanOpd}
                  onChange={(e) => setSingkatanOpd(e.target.value.toUpperCase())}
                  placeholder='PUTR'
                  className='h-6 w-20 text-[11px] font-mono font-bold uppercase text-center px-1'
                  maxLength={10}
                />
              ) : (
                <span className='text-xs font-mono font-bold text-primary'>
                  {dokumen?.singkatan_opd || 'OPD'}
                </span>
              )}
            </div>
          </div>

          {/* 4. Selector Urusan Pemerintahan (Master Data) */}
          <div className='space-y-1.5 p-2.5 rounded-md bg-primary/5 border border-primary/20'>
            <div className='flex items-center justify-between'>
              <Label className='text-[11px] font-bold text-foreground flex items-center gap-1'>
                <FileText className='h-3.5 w-3.5 text-primary' /> Urusan Pemerintahan <span className='text-destructive'>*</span>
              </Label>
              {canEdit && hasChanged && (
                <Button
                  type='button'
                  size='sm'
                  onClick={handleSaveHeader}
                  disabled={isSaving || !selectedUrusanId}
                  className='h-6 px-2 text-[10px] gap-1 font-semibold'
                >
                  {isSaving ? <Loader2 className='h-3 w-3 animate-spin' /> : <Save className='h-3 w-3' />}
                  Simpan
                </Button>
              )}
            </div>

            {canEdit ? (
              <SearchableSelect
                options={urusanOptions}
                value={selectedUrusanId}
                onValueChange={(val: string) => setSelectedUrusanId(val)}
                placeholder='Pilih Urusan Pemerintahan...'
                className='text-xs h-8'
              />
            ) : (
              <p className='font-semibold text-foreground py-1'>
                {dokumen?.urusan_pemerintahan
                  ? `${dokumen.urusan_pemerintahan.kode} - ${dokumen.urusan_pemerintahan.nama}`
                  : 'Belum ditentukan'}
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
