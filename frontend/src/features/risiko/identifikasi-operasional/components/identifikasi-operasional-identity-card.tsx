import { useState, useEffect, useRef } from 'react'
import { FolderKanban, Calendar, FileText, Landmark, Loader2, CheckCircle2, Tag } from 'lucide-react'
import { toast } from 'sonner'
import { Card, CardContent } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import type { IdentifikasiRisikoOpdOperasional } from '@/types/risiko'
import { risikoService } from '@/services/risiko-service'

interface IdentifikasiOperasionalIdentityCardProps {
  dokumen: IdentifikasiRisikoOpdOperasional | null
  urusan: { id: string; kode: string; nama: string } | null
  opdName: string
  opdId: string
  periodeId?: string
  tahunPenilaian?: number | string
  rentangTahun?: string
  canEdit: boolean
  onSaved: () => Promise<void>
}

export function IdentifikasiOperasionalIdentityCard({
  dokumen,
  urusan,
  opdName,
  opdId,
  periodeId,
  tahunPenilaian,
  rentangTahun,
  canEdit,
  onSaved,
}: IdentifikasiOperasionalIdentityCardProps) {
  const initialized = useRef('')
  const [singkatanOpd, setSingkatanOpd] = useState<string>('')
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (dokumen?.singkatan_opd) {
      setSingkatanOpd(dokumen.singkatan_opd)
    }
  }, [dokumen?.singkatan_opd])

  useEffect(() => {
    const key = `${opdId}:${periodeId}`
    if (dokumen || !canEdit || !urusan || !opdId || !periodeId || initialized.current === key) return
    initialized.current = key
    void risikoService.saveIdentifikasiOperasionalHeader({ opd_id: opdId, periode_penilaian_id: periodeId })
      .then(() => onSaved())
      .catch((err: unknown) => {
        toast.error(err instanceof Error ? err.message : 'Gagal menyiapkan identitas dokumen.')
      })
  }, [dokumen, canEdit, urusan, opdId, periodeId, onSaved])

  async function handleSaveHeader() {
    if (!dokumen || isSaving) return
    const value = singkatanOpd.trim().toUpperCase()
    if (value === (dokumen.singkatan_opd || '')) return
    if (!value) {
      setSingkatanOpd(dokumen.singkatan_opd || '')
      toast.error('Singkatan OPD tidak boleh kosong.')
      return
    }

    try {
      setSingkatanOpd(value)
      setIsSaving(true)
      await risikoService.saveIdentifikasiOperasionalHeader({
        opd_id: opdId,
        periode_penilaian_id: periodeId,
        singkatan_opd: value,
      })
      await onSaved()
    } catch (err: unknown) {
      setSingkatanOpd(dokumen.singkatan_opd || '')
      const msg = err instanceof Error ? err.message : 'Gagal menyimpan singkatan OPD.'
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
              <FolderKanban className='h-5 w-5' />
            </div>
            <div>
              <h2 className='text-sm sm:text-base font-bold text-foreground'>
                Identitas Lembar Kerja Form 3C
              </h2>
              <p className='text-xs text-muted-foreground'>
                Kertas Kerja Identifikasi Risiko Operasional Perangkat Daerah (OPD)
              </p>
            </div>
          </div>
          {dokumen?.master_urusan_pemerintahan_id && (
            <div className='flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-semibold'>
              <CheckCircle2 className='h-4 w-4' />
              <span>Identitas & Kode Risiko Terkonfigurasi</span>
            </div>
          )}
        </div>

        <div className='grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4'>
          {/* 1. Nama Pemda */}
          <div className='space-y-1.5'>
            <Label className='text-xs font-semibold text-muted-foreground flex items-center gap-1.5'>
              <Landmark className='h-3.5 w-3.5 text-primary' />
              Nama Pemda
            </Label>
            <Input
              value={dokumen?.nama_pemda || 'Pemerintah Kabupaten Cianjur'}
              readOnly
              disabled
              className='bg-muted/40 font-medium text-xs h-9 cursor-not-allowed'
            />
          </div>

          {/* 2. Nama Perangkat Daerah & Singkatan */}
          <div className='space-y-1.5'>
            <Label className='text-xs font-semibold text-muted-foreground flex items-center gap-1.5'>
              <FolderKanban className='h-3.5 w-3.5 text-primary' />
              Nama Perangkat Daerah
            </Label>
            <Input
              value={opdName}
              readOnly
              disabled
              className='bg-muted/40 font-semibold text-xs h-9 cursor-not-allowed'
            />
          </div>

          {/* 3. Singkatan OPD (untuk prefix kode risiko) */}
          <div className='space-y-1.5'>
            <Label className='text-xs font-semibold text-muted-foreground flex items-center gap-1.5'>
              <Tag className='h-3.5 w-3.5 text-primary' />
              Singkatan OPD (Formula Kode)
            </Label>
            <Input
              value={singkatanOpd}
              onChange={(e) => setSingkatanOpd(e.target.value.toUpperCase())}
              onBlur={handleSaveHeader}
              onKeyDown={(event) => { if (event.key === 'Enter') event.currentTarget.blur() }}
              disabled={!canEdit || !dokumen || isSaving}
              placeholder={dokumen?.opd?.singkatan || 'CONTOH: PUTR'}
              maxLength={15}
              className='font-mono font-bold text-xs h-9 uppercase'
            />
            {isSaving && <span className='flex items-center gap-1 text-xs text-muted-foreground' role='status'><Loader2 className='h-3 w-3 animate-spin' /> Menyimpan...</span>}
          </div>

          <div className='space-y-1.5'>
            <Label className='text-xs font-semibold text-muted-foreground flex items-center gap-1.5'>
              <FileText className='h-3.5 w-3.5 text-primary' />
              Urusan Pemerintahan
            </Label>
            <div className='min-h-9 rounded-md border bg-muted/40 px-3 py-2 text-xs font-medium break-words'>
              {urusan ? `${urusan.kode} - ${urusan.nama}` : 'Belum ditentukan'}
            </div>
          </div>

          {/* 4. Tahun Penilaian & Periode */}
          <div className='space-y-1.5'>
            <Label className='text-xs font-semibold text-muted-foreground flex items-center gap-1.5'>
              <Calendar className='h-3.5 w-3.5 text-primary' />
              Tahun / Periode Penilaian
            </Label>
            <div className='flex items-center gap-2'>
              <Input
                value={tahunPenilaian ? `Tahun ${tahunPenilaian}` : '-'}
                readOnly
                disabled
                className='bg-muted/40 font-medium text-xs h-9 cursor-not-allowed w-28'
              />
              <Input
                value={rentangTahun || '-'}
                readOnly
                disabled
                className='bg-muted/40 font-medium text-xs h-9 cursor-not-allowed flex-1'
              />
            </div>
          </div>
        </div>

      </CardContent>
    </Card>
  )
}
