import { useState, useEffect } from 'react'
import { FolderKanban, Calendar, FileText, Landmark, Save, Loader2, CheckCircle2, Tag } from 'lucide-react'
import { toast } from 'sonner'
import { Card, CardContent } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { SearchableSelect } from '@/components/searchable-select'
import type { IdentifikasiRisikoOpdOperasional, IdentifikasiRisikoOpdOperasionalMeta } from '@/types/risiko'
import { risikoService } from '@/services/risiko-service'

interface IdentifikasiOperasionalIdentityCardProps {
  dokumen: IdentifikasiRisikoOpdOperasional | null
  meta: IdentifikasiRisikoOpdOperasionalMeta | null
  opdName: string
  opdId: string
  periodeId?: string
  tahunPenilaian?: number | string
  rentangTahun?: string
  canEdit: boolean
  onSaved: () => void
}

export function IdentifikasiOperasionalIdentityCard({
  dokumen,
  meta,
  opdName,
  opdId,
  periodeId,
  tahunPenilaian,
  rentangTahun,
  canEdit,
  onSaved,
}: IdentifikasiOperasionalIdentityCardProps) {
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
      await risikoService.saveIdentifikasiOperasionalHeader({
        opd_id: opdId,
        periode_penilaian_id: periodeId,
        master_urusan_pemerintahan_id: selectedUrusanId,
        nama_pemda: dokumen?.nama_pemda || 'Pemerintah Kabupaten Cianjur',
        singkatan_opd: singkatanOpd || undefined,
      })
      toast.success('Identitas Form 3C berhasil disimpan.')
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

        <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4'>
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
              disabled={!canEdit}
              placeholder={dokumen?.opd?.singkatan || 'CONTOH: PUTR'}
              maxLength={15}
              className='font-mono font-bold text-xs h-9 uppercase'
            />
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

        {/* 5. Urusan Pemerintahan (Master Data) */}
        <div className='pt-2 border-t flex flex-col md:flex-row md:items-end justify-between gap-3'>
          <div className='space-y-1.5 flex-1 max-w-2xl'>
            <Label className='text-xs font-semibold text-foreground flex items-center gap-1.5'>
              <FileText className='h-3.5 w-3.5 text-primary' />
              Urusan Pemerintahan (Master Data)
              <span className='text-destructive'>*</span>
            </Label>
            <SearchableSelect
              options={urusanOptions}
              value={selectedUrusanId}
              onValueChange={setSelectedUrusanId}
              placeholder='Pilih Urusan Pemerintahan...'
              searchPlaceholder='Cari kode atau nama urusan...'
              disabled={!canEdit}
              className='text-xs'
            />
            <p className='text-[11px] text-muted-foreground'>
              Sesuai amanat BPKP/SPIP, urusan pemerintahan diambil langsung dari data master daerah.
            </p>
          </div>

          {canEdit && (
            <Button
              type='button'
              size='sm'
              onClick={handleSaveHeader}
              disabled={isSaving || !hasChanged || !selectedUrusanId}
              className='h-9 px-4 gap-1.5 font-semibold shrink-0'
            >
              {isSaving ? (
                <>
                  <Loader2 className='h-3.5 w-3.5 animate-spin' />
                  <span>Menyimpan...</span>
                </>
              ) : (
                <>
                  <Save className='h-3.5 w-3.5' />
                  <span>Simpan Identitas</span>
                </>
              )}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
