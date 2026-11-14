import { useEffect, useMemo, useState } from 'react'
import { FileSearch, Loader2, Save } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { getSkalaBadgeClass, getSkalaLabel } from './fra-table'
import type {
  FraReferenceOptions,
  FraudRiskAssessmentInput,
  FraudRiskAssessmentRow,
} from './types'

const MATRIX_5X5 = [
  [1, 3, 5, 8, 10],
  [2, 7, 12, 14, 17],
  [4, 11, 15, 19, 21],
  [6, 13, 18, 22, 24],
  [9, 16, 20, 23, 25],
]

function computeMatrixScale(k: number, d: number): number {
  if (k < 1 || k > 5 || d < 1 || d > 5) return 0
  return MATRIX_5X5[k - 1][d - 1]
}

interface FraDialogProps {
  isOpen: boolean
  onClose: () => void
  initialData?: FraudRiskAssessmentRow | null
  referenceOptions?: FraReferenceOptions
  onSubmit: (data: FraudRiskAssessmentInput) => void
  isLoading: boolean
  opdId: string
  periodeId: string
}

export function FraDialog({
  isOpen,
  onClose,
  initialData,
  referenceOptions,
  onSubmit,
  isLoading,
  opdId,
  periodeId,
}: FraDialogProps) {
  const [prosesBisnis, setProsesBisnis] = useState('')
  const [identifikasiRisiko, setIdentifikasiRisiko] = useState('')
  const [skenario, setSkenario] = useState('')
  const [jenisFraudId, setJenisFraudId] = useState('')
  const [pemilikRisiko, setPemilikRisiko] = useState('')
  const [penyebab, setPenyebab] = useState('')
  const [existingControl, setExistingControl] = useState('')
  const [kemungkinanKriteria, setKemungkinanKriteria] = useState('')
  const [kemungkinanSkor, setKemungkinanSkor] = useState(2)
  const [dampakKriteria, setDampakKriteria] = useState('')
  const [dampakSkor, setDampakSkor] = useState(3)
  const [mitigasi, setMitigasi] = useState('')

  const isEditing = Boolean(initialData)

  useEffect(() => {
    if (initialData) {
      setProsesBisnis(initialData.proses_bisnis || '')
      setIdentifikasiRisiko(initialData.identifikasi_risiko_kecurangan || '')
      setSkenario(initialData.skenario_kecurangan || '')
      setJenisFraudId(initialData.jenis_fraud_id || '')
      setPemilikRisiko(initialData.pemilik_risiko || '')
      setPenyebab(initialData.penyebab || '')
      setExistingControl(initialData.existing_control || '')
      setKemungkinanKriteria(initialData.kemungkinan_kriteria || '')
      setKemungkinanSkor(initialData.kemungkinan_skor || 2)
      setDampakKriteria(initialData.dampak_kriteria || '')
      setDampakSkor(initialData.dampak_skor || 3)
      setMitigasi(initialData.mitigasi || '')
    } else {
      setProsesBisnis(referenceOptions?.preset_proses_bisnis?.[0] || 'Pengadaan Barang dan Jasa (PBJ)')
      setIdentifikasiRisiko('')
      setSkenario('')
      setJenisFraudId(referenceOptions?.jenis_fraud?.[0]?.id || '')
      setPemilikRisiko(referenceOptions?.pemilik_risiko?.[0]?.nama || 'Kepala SKPD')
      setPenyebab(referenceOptions?.penyebab?.[0] || 'Kesempatan (Opportunity)')
      setExistingControl('')
      setKemungkinanKriteria(referenceOptions?.kriteria_kemungkinan?.[0] || 'Persentase (dlm 1 tahun)')
      setKemungkinanSkor(2)
      setDampakKriteria(referenceOptions?.kriteria_dampak?.[0] || 'Kerugian negara')
      setDampakSkor(3)
      setMitigasi('')
    }
  }, [initialData, isOpen, referenceOptions])

  const calculatedScale = useMemo(() => {
    return computeMatrixScale(kemungkinanSkor, dampakSkor)
  }, [kemungkinanSkor, dampakSkor])

  const isFormValid = useMemo(() => {
    return (
      prosesBisnis.trim().length > 0 &&
      identifikasiRisiko.trim().length > 0 &&
      skenario.trim().length > 0 &&
      pemilikRisiko.trim().length > 0 &&
      penyebab.trim().length > 0 &&
      existingControl.trim().length > 0 &&
      kemungkinanKriteria.trim().length > 0 &&
      dampakKriteria.trim().length > 0 &&
      mitigasi.trim().length > 0
    )
  }, [
    prosesBisnis,
    identifikasiRisiko,
    skenario,
    pemilikRisiko,
    penyebab,
    existingControl,
    kemungkinanKriteria,
    dampakKriteria,
    mitigasi,
  ])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!isFormValid || isLoading) return

    const selectedJenis = referenceOptions?.jenis_fraud?.find((j) => j.id === jenisFraudId)

    onSubmit({
      opd_id: opdId,
      periode_penilaian_id: periodeId,
      proses_bisnis: prosesBisnis.trim(),
      identifikasi_risiko_kecurangan: identifikasiRisiko.trim(),
      skenario_kecurangan: skenario.trim(),
      jenis_fraud_id: jenisFraudId || null,
      jenis_risiko_kecurangan: selectedJenis?.nama,
      pemilik_risiko: pemilikRisiko.trim(),
      penyebab,
      existing_control: existingControl.trim(),
      kemungkinan_kriteria: kemungkinanKriteria,
      kemungkinan_skor: kemungkinanSkor,
      dampak_kriteria: dampakKriteria,
      dampak_skor: dampakSkor,
      mitigasi: mitigasi.trim(),
    })
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className='max-h-[90vh] max-w-3xl overflow-y-auto'>
        <DialogHeader>
          <DialogTitle className='flex items-center gap-2 text-sm font-bold sm:text-base'>
            <FileSearch className='h-4 w-4 text-primary' />
            <span>
              {isEditing
                ? 'Ubah Penilaian Risiko Kecurangan'
                : 'Tambah Penilaian Risiko Kecurangan (FRA)'}
            </span>
          </DialogTitle>
          <DialogDescription className='text-xs'>
            Isi rincian proses bisnis, skenario kecurangan, analisis matriks kemungkinan & dampak, serta rencana mitigasi fraud.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className='space-y-4 py-2'>
          {/* 1. Proses Bisnis */}
          <div className='space-y-1.5'>
            <Label htmlFor='proses_bisnis'>
              Proses Bisnis / Area Rawan <span className='text-rose-500'>*</span>
            </Label>
            <Input
              id='proses_bisnis'
              list='preset-probis-list'
              value={prosesBisnis}
              onChange={(e) => setProsesBisnis(e.target.value)}
              placeholder='Contoh: Pengadaan Barang dan Jasa (PBJ), Transaksi Keuangan...'
              required
            />
            <datalist id='preset-probis-list'>
              {referenceOptions?.preset_proses_bisnis?.map((p) => (
                <option key={p} value={p} />
              ))}
            </datalist>
          </div>

          {/* 2. Identifikasi Risiko & Skenario */}
          <div className='space-y-1.5'>
            <Label htmlFor='identifikasi_risiko'>
              Pernyataan Risiko Kecurangan <span className='text-rose-500'>*</span>
            </Label>
            <Input
              id='identifikasi_risiko'
              value={identifikasiRisiko}
              onChange={(e) => setIdentifikasiRisiko(e.target.value)}
              placeholder='Contoh: Markup harga perkiraan sendiri (HPS) pengadaan barang dan jasa'
              required
            />
          </div>

          <div className='space-y-1.5'>
            <Label htmlFor='skenario'>
              Skenario Kecurangan / Modus Operandi <span className='text-rose-500'>*</span>
            </Label>
            <Textarea
              id='skenario'
              rows={3}
              value={skenario}
              onChange={(e) => setSkenario(e.target.value)}
              placeholder='Uraikan modus operandi atau skenario terjadinya fraud...'
              required
            />
          </div>

          {/* 3. Jenis Fraud, Pemilik, Penyebab */}
          <div className='grid grid-cols-1 gap-3 sm:grid-cols-3'>
            <div className='space-y-1.5'>
              <Label htmlFor='jenis_fraud'>Jenis Risiko Fraud</Label>
              <Select value={jenisFraudId} onValueChange={setJenisFraudId}>
                <SelectTrigger id='jenis_fraud'>
                  <SelectValue placeholder='Pilih jenis fraud' />
                </SelectTrigger>
                <SelectContent>
                  {referenceOptions?.jenis_fraud?.map((j) => (
                    <SelectItem key={j.id} value={j.id}>
                      {j.nama}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className='space-y-1.5'>
              <Label htmlFor='penyebab'>Penyebab (Fraud Diamond)</Label>
              <Select value={penyebab} onValueChange={setPenyebab}>
                <SelectTrigger id='penyebab'>
                  <SelectValue placeholder='Pilih pemicu' />
                </SelectTrigger>
                <SelectContent>
                  {referenceOptions?.penyebab?.map((p) => (
                    <SelectItem key={p} value={p}>
                      {p}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className='space-y-1.5'>
              <Label htmlFor='pemilik_risiko'>Pemilik Risiko</Label>
              <Input
                id='pemilik_risiko'
                list='preset-pemilik-list'
                value={pemilikRisiko}
                onChange={(e) => setPemilikRisiko(e.target.value)}
                placeholder='Kepala SKPD / Direktur...'
                required
              />
              <datalist id='preset-pemilik-list'>
                {referenceOptions?.pemilik_risiko?.map((p) => (
                  <option key={p.id} value={p.nama} />
                ))}
              </datalist>
            </div>
          </div>

          {/* 4. Existing Control */}
          <div className='space-y-1.5'>
            <Label htmlFor='existing_control'>
              Pengendalian yang Sudah Terpasang (Existing Control) <span className='text-rose-500'>*</span>
            </Label>
            <Textarea
              id='existing_control'
              rows={2}
              value={existingControl}
              onChange={(e) => setExistingControl(e.target.value)}
              placeholder='Sebutkan SOP, mekanisme pengawasan, atau sistem pengendalian eksisting...'
              required
            />
          </div>

          {/* 5. Analisis Risiko (Kemungkinan & Dampak) */}
          <div className='rounded-lg border bg-muted/20 p-3 space-y-3'>
            <div className='flex items-center justify-between'>
              <span className='font-semibold text-xs tracking-wide uppercase text-muted-foreground'>
                Analisis Matriks 5×5
              </span>
              <div className='flex items-center gap-2'>
                <span className='text-xs text-muted-foreground'>Skala Risiko:</span>
                <Badge className={`${getSkalaBadgeClass(calculatedScale)} font-bold text-sm px-2.5 py-0.5`}>
                  {calculatedScale} — {getSkalaLabel(calculatedScale)}
                </Badge>
              </div>
            </div>

            <div className='grid grid-cols-1 gap-3 sm:grid-cols-2'>
              <div className='space-y-2 rounded-md border bg-card p-2.5'>
                <div className='flex items-center justify-between'>
                  <Label className='text-xs font-semibold'>Tingkat Kemungkinan</Label>
                  <Badge variant='outline' className='font-mono text-xs'>
                    Skor: {kemungkinanSkor}
                  </Badge>
                </div>
                <Select
                  value={String(kemungkinanSkor)}
                  onValueChange={(val) => setKemungkinanSkor(Number(val))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='1'>1 - Sangat Rendah</SelectItem>
                    <SelectItem value='2'>2 - Rendah</SelectItem>
                    <SelectItem value='3'>3 - Sedang</SelectItem>
                    <SelectItem value='4'>4 - Tinggi</SelectItem>
                    <SelectItem value='5'>5 - Sangat Tinggi</SelectItem>
                  </SelectContent>
                </Select>

                <div className='space-y-1 pt-1'>
                  <Label className='text-[11px] text-muted-foreground'>Kriteria Kemungkinan</Label>
                  <Select value={kemungkinanKriteria} onValueChange={setKemungkinanKriteria}>
                    <SelectTrigger className='h-8 text-xs'>
                      <SelectValue placeholder='Pilih kriteria' />
                    </SelectTrigger>
                    <SelectContent>
                      {referenceOptions?.kriteria_kemungkinan?.map((k) => (
                        <SelectItem key={k} value={k} className='text-xs'>
                          {k}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className='space-y-2 rounded-md border bg-card p-2.5'>
                <div className='flex items-center justify-between'>
                  <Label className='text-xs font-semibold'>Tingkat Dampak</Label>
                  <Badge variant='outline' className='font-mono text-xs'>
                    Skor: {dampakSkor}
                  </Badge>
                </div>
                <Select
                  value={String(dampakSkor)}
                  onValueChange={(val) => setDampakSkor(Number(val))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='1'>1 - Sangat Rendah</SelectItem>
                    <SelectItem value='2'>2 - Rendah</SelectItem>
                    <SelectItem value='3'>3 - Sedang</SelectItem>
                    <SelectItem value='4'>4 - Tinggi</SelectItem>
                    <SelectItem value='5'>5 - Sangat Tinggi</SelectItem>
                  </SelectContent>
                </Select>

                <div className='space-y-1 pt-1'>
                  <Label className='text-[11px] text-muted-foreground'>Kriteria Dampak</Label>
                  <Select value={dampakKriteria} onValueChange={setDampakKriteria}>
                    <SelectTrigger className='h-8 text-xs'>
                      <SelectValue placeholder='Pilih kriteria' />
                    </SelectTrigger>
                    <SelectContent>
                      {referenceOptions?.kriteria_dampak?.map((d) => (
                        <SelectItem key={d} value={d} className='text-xs'>
                          {d}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </div>

          {/* 6. Mitigasi */}
          <div className='space-y-1.5'>
            <Label htmlFor='mitigasi'>
              Rencana Mitigasi / Tindak Lanjut Pengendalian Fraud <span className='text-rose-500'>*</span>
            </Label>
            <Textarea
              id='mitigasi'
              rows={3}
              value={mitigasi}
              onChange={(e) => setMitigasi(e.target.value)}
              placeholder='Contoh: Supervisi berkala oleh PA/PPK, penerapan probity audit Inspektorat, whistleblowing system...'
              required
            />
          </div>

          <DialogFooter className='border-t pt-3'>
            <Button
              type='button'
              variant='outline'
              size='sm'
              onClick={onClose}
              disabled={isLoading}
            >
              Batal
            </Button>
            <Button
              type='submit'
              size='sm'
              disabled={!isFormValid || isLoading}
              className='gap-1.5'
            >
              {isLoading ? (
                <Loader2 className='h-3.5 w-3.5 animate-spin' />
              ) : (
                <Save className='h-3.5 w-3.5' />
              )}
              <span>
                {isLoading
                  ? 'Menyimpan...'
                  : isEditing
                    ? 'Simpan Perubahan'
                    : 'Tambahkan Catatan FRA'}
              </span>
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
