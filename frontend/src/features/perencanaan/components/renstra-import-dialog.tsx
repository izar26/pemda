import { useState, useMemo } from 'react'
import {
  FileSpreadsheet,
  Download,
  Upload,
  AlertTriangle,
  CheckCircle2,
  FileUp,
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import { SearchableSelect, type SearchableSelectOption } from '@/components/searchable-select'
import { perencanaanService } from '@/services/perencanaan-service'
import type { PeriodePenilaian, RenstraImportResult } from '@/types/perencanaan'
import type { Opd } from '@/features/users/data/schema'

interface RenstraImportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  opds: Opd[]
  periodes: PeriodePenilaian[]
  onSuccess: () => void
}

export function RenstraImportDialog({
  open,
  onOpenChange,
  opds,
  periodes,
  onSuccess,
}: RenstraImportDialogProps) {
  const [file, setFile] = useState<File | null>(null)
  const [selectedOpdId, setSelectedOpdId] = useState<number>(0)
  const [selectedPeriodeId, setSelectedPeriodeId] = useState<number>(0)
  const [uploading, setUploading] = useState<boolean>(false)
  const [result, setResult] = useState<RenstraImportResult | null>(null)

  const getOpdName = (opd: Opd) => {
    return opd.nama || (opd as unknown as { nama_opd: string }).nama_opd || 'OPD'
  }

  const opdOptions: SearchableSelectOption[] = useMemo(() => {
    return opds.map((opd) => ({
      value: String(opd.id),
      label: getOpdName(opd),
      group: opd.kategori || 'Perangkat Daerah',
      badge: opd.kategori,
      keywords: [opd.kode, opd.kategori].filter(Boolean) as string[],
    }))
  }, [opds])

  const handleDownloadTemplate = async () => {
    try {
      const blob = await perencanaanService.downloadRenstraTemplate()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'Template_Import_Renstra_SKPD.xlsx'
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.URL.revokeObjectURL(url)
      toast.success('Template Excel Renstra berhasil diunduh.')
    } catch {
      toast.error('Terjadi kesalahan saat mengunduh template.')
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0])
      setResult(null)
    }
  }

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!file) {
      toast.error('Silakan pilih berkas Excel (.xlsx).')
      return
    }
    if (!selectedOpdId || !selectedPeriodeId) {
      toast.error('Pilih OPD dan Periode Penilaian terlebih dahulu.')
      return
    }

    setUploading(true)
    setResult(null)
    try {
      const res = await perencanaanService.importRenstra(file, selectedPeriodeId, selectedOpdId)
      setResult(res)
      if (res.imported.programs > 0 || res.imported.kegiatans > 0 || res.imported.sub_kegiatans > 0) {
        toast.success(
          `Berhasil mengimpor ${res.imported.programs} Program, ${res.imported.kegiatans} Kegiatan, dan ${res.imported.sub_kegiatans} Sub Kegiatan.`
        )
        onSuccess()
      }
    } catch (err: unknown) {
      const errorMsg = (err as { response?: { data?: { message?: string } } }).response?.data?.message || 'Gagal memproses berkas Excel.'
      toast.error(errorMsg)
    } finally {
      setUploading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px]">
        <form onSubmit={handleUpload}>
          <DialogHeader>
            <div className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5 text-emerald-600" />
              <DialogTitle>Impor Excel Renstra SKPD (Program / Kegiatan)</DialogTitle>
            </div>
            <DialogDescription>
              Fitur Impor Berjenjang Hierarki (Indeksasi A, A.1, A.1.1) dari berkas Excel
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {/* Step 1: Download Template */}
            <div className="flex items-center justify-between p-3 rounded-lg border bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-200">
              <div className="space-y-0.5">
                <div className="text-xs font-semibold text-emerald-900 dark:text-emerald-300">
                  Unduh Format Standard Excel
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Gunakan format resmi untuk menghindari kegagalan pembacaan baris hierarki.
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleDownloadTemplate}
                className="gap-1 border-emerald-300 text-emerald-700 hover:bg-emerald-100 dark:text-emerald-300"
              >
                <Download className="h-3.5 w-3.5" /> Template
              </Button>
            </div>

            {/* Context Parameter Selection */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">OPD Target Impor*</Label>
                <SearchableSelect
                  value={selectedOpdId ? String(selectedOpdId) : ''}
                  onValueChange={(val) => setSelectedOpdId(Number(val))}
                  options={opdOptions}
                  placeholder="Pilih Perangkat Daerah..."
                  searchPlaceholder="Cari nama atau singkatan OPD..."
                  emptyMessage="Tidak ada OPD yang cocok."
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Periode Penilaian*</Label>
                <Select
                  value={selectedPeriodeId ? String(selectedPeriodeId) : ''}
                  onValueChange={(val) => setSelectedPeriodeId(Number(val))}
                >
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="Pilih Periode" />
                  </SelectTrigger>
                  <SelectContent>
                    {periodes.map((p) => (
                      <SelectItem key={p.id} value={String(p.id)}>
                        {p.tahun_penilaian} ({p.periode_penilaian})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* File Drop / Selector */}
            <div className="space-y-1.5">
              <Label className="text-xs">Pilih Berkas Excel (.xlsx, .xls)*</Label>
              <div className="border-2 border-dashed rounded-lg p-4 text-center border-slate-300 dark:border-slate-700 hover:border-emerald-500 transition-colors">
                <input
                  type="file"
                  id="excel-file"
                  accept=".xlsx, .xls"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <label htmlFor="excel-file" className="cursor-pointer space-y-2 block">
                  <FileUp className="mx-auto h-8 w-8 text-muted-foreground" />
                  <div className="text-xs">
                    {file ? (
                      <span className="font-semibold text-emerald-600">{file.name}</span>
                    ) : (
                      <span>
                        Klik untuk memilih berkas Excel atau <strong className="text-primary">Drag & Drop</strong>
                      </span>
                    )}
                  </div>
                </label>
              </div>
            </div>

            {/* Result Summary */}
            {result && (
              <div className="space-y-2 border-t pt-3">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  <span className="text-xs font-semibold">Hasil Pengolahan Impor:</span>
                </div>
                <div className="flex gap-2">
                  <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
                    Program: {result.imported.programs}
                  </Badge>
                  <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                    Kegiatan: {result.imported.kegiatans}
                  </Badge>
                  <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                    Sub Kegiatan: {result.imported.sub_kegiatans}
                  </Badge>
                </div>

                {result.errors.length > 0 && (
                  <div className="p-3 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 rounded text-xs space-y-1 max-h-32 overflow-y-auto">
                    <div className="font-semibold text-rose-800 dark:text-rose-400 flex items-center gap-1">
                      <AlertTriangle className="h-3.5 w-3.5" /> Peringatan Baris (Terkendala):
                    </div>
                    {result.errors.map((err, idx) => (
                      <div key={idx} className="text-[11px] text-rose-700 dark:text-rose-300">
                        • {err}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Tutup
            </Button>
            <Button
              type="submit"
              disabled={uploading || !file || !selectedOpdId || !selectedPeriodeId}
              className="bg-emerald-600 hover:bg-emerald-700 gap-1"
            >
              <Upload className="h-4 w-4" />
              {uploading ? 'Memproses Excel...' : 'Mulai Impor Data'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
