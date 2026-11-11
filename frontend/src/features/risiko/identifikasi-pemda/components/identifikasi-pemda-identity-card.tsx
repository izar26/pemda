import { useState, useEffect } from 'react'
import { Building2, Calendar, FileText, Landmark, Loader2, CheckCircle2 } from 'lucide-react'
import { toast } from 'sonner'
import { Card, CardContent } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { SearchableSelect } from '@/components/searchable-select'
import type { IdentifikasiRisikoPemda, IdentifikasiRisikoPemdaMeta } from '@/types/risiko'
import { risikoService } from '@/services/risiko-service'

interface IdentifikasiPemdaIdentityCardProps {
  dokumen: IdentifikasiRisikoPemda | null
  meta: IdentifikasiRisikoPemdaMeta | null
  opdName: string
  opdId: string
  periodeId?: string
  tahunPenilaian?: number | string
  rentangTahun?: string
  canEdit: boolean
  onSaved: () => void
}

export function IdentifikasiPemdaIdentityCard({
  dokumen,
  meta,
  opdName,
  opdId,
  periodeId,
  tahunPenilaian,
  rentangTahun,
  canEdit,
  onSaved,
}: IdentifikasiPemdaIdentityCardProps) {
  const [selectedUrusanId, setSelectedUrusanId] = useState<string>('')
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    setSelectedUrusanId(dokumen?.master_urusan_pemerintahan_id || '')
  }, [dokumen?.master_urusan_pemerintahan_id])

  const urusanOptions = (meta?.urusan_pemerintahans || []).map((u) => ({
    value: u.id,
    label: `${u.kode} - ${u.nama}`,
  }))

  async function handleSaveHeader(urusanId: string) {
    if (!urusanId || urusanId === dokumen?.master_urusan_pemerintahan_id) return
    setSelectedUrusanId(urusanId)
    try {
      setIsSaving(true)
      await risikoService.saveIdentifikasiPemdaHeader({
        opd_id: opdId,
        periode_penilaian_id: periodeId,
        master_urusan_pemerintahan_id: urusanId,
        nama_pemda: dokumen?.nama_pemda || 'Pemerintah Kabupaten Cianjur',
      })
      toast.success('Urusan Pemerintahan berhasil disimpan.')
      onSaved()
    } catch (err: unknown) {
      setSelectedUrusanId(dokumen?.master_urusan_pemerintahan_id || '')
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
              <Landmark className='h-5 w-5' />
            </div>
            <div>
              <h2 className='text-sm sm:text-base font-bold text-foreground'>
                Identitas Lembar Kerja Form 3A
              </h2>
              <p className='text-xs text-muted-foreground'>
                Kertas Kerja Identifikasi Risiko Strategis Pemerintah Daerah
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
              <Building2 className='h-3.5 w-3.5' /> Nama Pemda
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

          {/* 3. OPD Pengisi */}
          <div className='space-y-1 p-2.5 rounded-md bg-muted/40 border border-border/60'>
            <span className='text-[11px] text-muted-foreground font-medium flex items-center gap-1'>
              <Building2 className='h-3.5 w-3.5' /> Perangkat Daerah (OPD)
            </span>
            <p className='font-semibold text-foreground truncate' title={opdName}>
              {opdName}
            </p>
          </div>

          {/* 4. Selector Urusan Pemerintahan (Master Data) */}
          <div className='space-y-1.5 p-2.5 rounded-md bg-primary/5 border border-primary/20'>
            <div className='flex items-center justify-between'>
              <Label className='text-[11px] font-bold text-foreground flex items-center gap-1'>
                <FileText className='h-3.5 w-3.5 text-primary' /> Urusan Pemerintahan <span className='text-destructive'>*</span>
              </Label>
              {isSaving && <span className='flex items-center gap-1 text-muted-foreground'><Loader2 className='h-3 w-3 animate-spin' /> Menyimpan...</span>}
            </div>

            {canEdit ? (
              <SearchableSelect
                options={urusanOptions}
                value={selectedUrusanId}
                onValueChange={handleSaveHeader}
                disabled={isSaving}
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
