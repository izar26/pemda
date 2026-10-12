import { useState } from 'react'
import {
  CheckCircle2,
  Clock,
  Download,
  FileSpreadsheet,
  FileText,
  GitBranch,
  Pencil,
  Printer,
  Trash2,
} from 'lucide-react'
import { toast } from 'sonner'
import type { KonteksPenilaianItem } from '@/types/risiko'
import { risikoService } from '@/services/risiko-service'
import { usePermissions } from '@/hooks/use-permissions'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
} from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { KonteksTreeView } from './konteks-tree-view'

interface KonteksDetailViewProps {
  konteks: KonteksPenilaianItem
  onEdit: () => void
  onDeleted: () => void
}

export function KonteksDetailView({
  konteks,
  onEdit,
  onDeleted,
}: KonteksDetailViewProps) {
  const { hasPermission } = usePermissions()
  const [activeTab, setActiveTab] = useState<'dokumen' | 'pohon'>('dokumen')
  const [isExporting, setIsExporting] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const canEdit = hasPermission('konteks_risiko.edit')
  const canDelete = hasPermission('konteks_risiko.delete')
  const canExport = hasPermission('konteks_risiko.export') || hasPermission('konteks_risiko.view')

  async function handleExport() {
    setIsExporting(true)
    try {
      const opdCode = konteks.opd?.kode || 'OPD'
      const filename = `Form_2B_Konteks_Risiko_Strategis_${opdCode}_${konteks.periode?.tahun_penilaian || ''}.xlsx`
      await risikoService.exportExcel(konteks.id, filename)
      toast.success('Formulir 2B berhasil diunduh dalam format Excel (.xlsx)')
    } catch {
      toast.error('Gagal mengunduh berkas Excel.')
    } finally {
      setIsExporting(false)
    }
  }

  function handlePrint() {
    window.print()
  }

  async function handleDelete() {
    setIsDeleting(true)
    try {
      await risikoService.deleteKonteks(konteks.id)
      toast.success('Penetapan Konteks Risiko Strategis OPD (Form 2B) berhasil dihapus.')
      setDeleteOpen(false)
      onDeleted()
    } catch {
      toast.error('Gagal menghapus data penetapan konteks risiko.')
    } finally {
      setIsDeleting(false)
    }
  }

  const isFinal = konteks.status === 'final'

  return (
    <div className='space-y-6'>
      {/* Print media stylesheet */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #print-form-2b, #print-form-2b * {
            visibility: visible;
          }
          #print-form-2b {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            margin: 0;
            padding: 20px;
            background: white !important;
            color: black !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      {/* Top Action Toolbar */}
      <div className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-xl border bg-card p-4 shadow-2xs no-print'>
        <div className='flex items-center gap-3'>
          <div className='flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary'>
            <FileSpreadsheet className='h-5 w-5' />
          </div>
          <div>
            <div className='flex items-center gap-2'>
              <h2 className='text-base font-bold text-foreground'>
                Form 2B: Penetapan Konteks Risiko Strategis OPD
              </h2>
              {isFinal ? (
                <Badge variant='default' className='gap-1 text-[10px]'>
                  <CheckCircle2 className='h-3 w-3' />
                  Final / Ditetapkan
                </Badge>
              ) : (
                <Badge variant='secondary' className='gap-1 text-[10px]'>
                  <Clock className='h-3 w-3' />
                  Konsep / Draft
                </Badge>
              )}
            </div>
            <p className='text-xs text-muted-foreground mt-0.5'>
              Tahun Penilaian: <strong className='text-foreground'>{konteks.periode?.tahun_penilaian}</strong> ({konteks.periode?.nama_periode}) • OPD: <strong className='text-foreground'>{konteks.opd?.nama}</strong>
            </p>
          </div>
        </div>

        <div className='flex items-center gap-2 flex-wrap'>
          <Button
            variant='outline'
            size='sm'
            onClick={handlePrint}
            className='gap-1.5 text-xs'
            title='Cetak lembar Form 2B atau simpan sebagai PDF'
          >
            <Printer className='h-3.5 w-3.5' />
            <span>Cetak Dokumen</span>
          </Button>

          {canExport && (
            <Button
              variant='outline'
              size='sm'
              onClick={handleExport}
              disabled={isExporting}
              className='gap-1.5 text-xs'
            >
              <Download className='h-3.5 w-3.5' />
              <span>{isExporting ? 'Mengunduh...' : 'Unduh Excel (.xlsx)'}</span>
            </Button>
          )}

          {canEdit && (
            <Button
              size='sm'
              onClick={onEdit}
              className='gap-1.5 text-xs'
            >
              <Pencil className='h-3.5 w-3.5' />
              <span>Ubah Konteks</span>
            </Button>
          )}

          {canDelete && (
            <Button
              variant='destructive'
              size='sm'
              onClick={() => setDeleteOpen(true)}
              className='gap-1.5 text-xs'
            >
              <Trash2 className='h-3.5 w-3.5' />
              <span>Hapus</span>
            </Button>
          )}
        </div>
      </div>

      {/* Tabs Navigation: Format Resmi Dokumen vs Visual Tree Hierarchy */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'dokumen' | 'pohon')}>
        <TabsList className='grid grid-cols-2 w-full max-w-md no-print'>
          <TabsTrigger value='dokumen' className='gap-2 text-xs'>
            <FileText className='h-3.5 w-3.5' />
            <span>Format Resmi Dokumen (2B)</span>
          </TabsTrigger>
          <TabsTrigger value='pohon' className='gap-2 text-xs'>
            <GitBranch className='h-3.5 w-3.5' />
            <span>Pohon Kinerja Makro</span>
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: FORMULIR DOKUMEN RESMI (Sesuai Excel Form 2B) */}
        <TabsContent value='dokumen' className='mt-4'>
          <Card id='print-form-2b' className='border shadow-xs overflow-hidden bg-card'>
            {/* Kop Dokumen Resmi */}
            <div className='border-b bg-muted/15 p-6 md:p-8 text-center'>
              <div className='max-w-3xl mx-auto space-y-1.5'>
                <p className='text-xs font-semibold tracking-widest uppercase text-muted-foreground'>
                  PEMERINTAH KABUPATEN CIANJUR
                </p>
                <h1 className='text-lg md:text-xl font-bold tracking-tight uppercase text-foreground'>
                  PENETAPAN KONTEKS RISIKO STRATEGIS OPD
                </h1>
                <p className='text-xs font-medium text-muted-foreground'>
                  FORMULIR 2B • SISTEM INFORMASI MANAJEMEN RISIKO PEMERINTAH DAERAH
                </p>
              </div>
            </div>

            <CardContent className='p-6 md:p-8 space-y-8'>
              {/* TABEL PARAMETER DOKUMEN (Sesuai Baris 3-10 Excel 2B) */}
              <div className='rounded-lg border overflow-hidden'>
                <table className='w-full text-xs text-left divide-y'>
                  <tbody className='divide-y'>
                    <tr className='hover:bg-muted/10 transition-colors'>
                      <td className='w-48 md:w-64 px-4 py-3 font-semibold text-muted-foreground bg-muted/20'>
                        Nama Pemda
                      </td>
                      <td className='w-4 px-2 py-3 text-muted-foreground'>:</td>
                      <td className='px-4 py-3 font-medium text-foreground'>
                        {konteks.nama_pemda}
                      </td>
                    </tr>
                    <tr className='hover:bg-muted/10 transition-colors'>
                      <td className='px-4 py-3 font-semibold text-muted-foreground bg-muted/20'>
                        Tahun Penilaian
                      </td>
                      <td className='px-2 py-3 text-muted-foreground'>:</td>
                      <td className='px-4 py-3 font-bold text-foreground'>
                        {konteks.periode?.tahun_penilaian}
                      </td>
                    </tr>
                    <tr className='hover:bg-muted/10 transition-colors'>
                      <td className='px-4 py-3 font-semibold text-muted-foreground bg-muted/20'>
                        Periode yang Dinilai
                      </td>
                      <td className='px-2 py-3 text-muted-foreground'>:</td>
                      <td className='px-4 py-3 font-medium text-foreground'>
                        {konteks.periode?.rentang_tahun} ({konteks.periode?.nama_periode})
                      </td>
                    </tr>
                    <tr className='hover:bg-muted/10 transition-colors'>
                      <td className='px-4 py-3 font-semibold text-muted-foreground bg-muted/20'>
                        OPD yang Dinilai
                      </td>
                      <td className='px-2 py-3 text-muted-foreground'>:</td>
                      <td className='px-4 py-3 font-bold text-foreground'>
                        {konteks.opd?.nama} ({konteks.opd?.kode})
                      </td>
                    </tr>
                    <tr className='hover:bg-muted/10 transition-colors'>
                      <td className='px-4 py-3 font-semibold text-muted-foreground bg-muted/20'>
                        Sumber Data
                      </td>
                      <td className='px-2 py-3 text-muted-foreground'>:</td>
                      <td className='px-4 py-3 font-medium text-foreground'>
                        {konteks.sumber_data?.nama || 'Renstra SKPD'}
                      </td>
                    </tr>
                    <tr className='bg-primary/5'>
                      <td className='px-4 py-3.5 font-bold text-primary bg-primary/10'>
                        Tujuan Strategis Renstra OPD
                      </td>
                      <td className='px-2 py-3.5 text-primary font-bold'>:</td>
                      <td className='px-4 py-3.5 font-bold text-foreground leading-relaxed'>
                        {konteks.tujuan ? (
                          <div className='flex items-start gap-2 flex-wrap'>
                            {konteks.tujuan.kode_tujuan && (
                              <Badge variant='outline' className='font-mono text-[10px] bg-background'>
                                {konteks.tujuan.kode_tujuan}
                              </Badge>
                            )}
                            <span className='flex-1'>{konteks.tujuan.tujuan}</span>
                          </div>
                        ) : (
                          <span className='italic text-muted-foreground'>Belum ditentukan</span>
                        )}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* SECTION: SASARAN STRATEGIS YANG DINILAI */}
              <div className='space-y-3'>
                <div className='flex items-center justify-between border-b pb-2'>
                  <div className='flex items-center gap-2'>
                    <span className='flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground text-[11px] font-bold'>
                      A
                    </span>
                    <h3 className='text-xs font-bold uppercase tracking-wider text-foreground'>
                      Sasaran Strategis yang Dilakukan Penilaian Risiko ({konteks.sasarans?.length || 0} Sasaran Terpilih)
                    </h3>
                  </div>
                </div>

                <div className='rounded-lg border overflow-hidden'>
                  <table className='w-full text-xs text-left divide-y'>
                    <thead className='bg-muted/20 text-muted-foreground uppercase text-[10px] font-bold tracking-wider'>
                      <tr>
                        <th className='w-12 px-3 py-2.5 text-center'>No</th>
                        <th className='w-28 px-3 py-2.5'>Kode</th>
                        <th className='px-4 py-2.5'>Sasaran Strategis Renstra</th>
                      </tr>
                    </thead>
                    <tbody className='divide-y bg-background'>
                      {konteks.sasarans && konteks.sasarans.length > 0 ? (
                        konteks.sasarans.map((sas, idx) => (
                          <tr key={sas.id} className='hover:bg-muted/10 transition-colors'>
                            <td className='px-3 py-3 text-center font-medium text-muted-foreground'>
                              {idx + 1}
                            </td>
                            <td className='px-3 py-3 font-mono font-semibold text-foreground'>
                              {sas.kode_sasaran || '-'}
                            </td>
                            <td className='px-4 py-3 font-medium text-foreground leading-relaxed'>
                              {sas.sasaran}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={3} className='p-4 text-center text-xs text-muted-foreground italic'>
                            Belum ada sasaran strategis yang dipilih.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* SECTION: IKU RENSTRA OPD YANG DINILAI */}
              <div className='space-y-3'>
                <div className='flex items-center justify-between border-b pb-2'>
                  <div className='flex items-center gap-2'>
                    <span className='flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground text-[11px] font-bold'>
                      B
                    </span>
                    <h3 className='text-xs font-bold uppercase tracking-wider text-foreground'>
                      IKU / Indikator Renstra OPD yang Dilakukan Penilaian Risiko ({konteks.indikators?.length || 0} Indikator Terpilih)
                    </h3>
                  </div>
                </div>

                <div className='rounded-lg border overflow-hidden'>
                  <table className='w-full text-xs text-left divide-y'>
                    <thead className='bg-muted/20 text-muted-foreground uppercase text-[10px] font-bold tracking-wider'>
                      <tr>
                        <th className='w-12 px-3 py-2.5 text-center'>No</th>
                        <th className='w-28 px-3 py-2.5'>Kode</th>
                        <th className='w-32 px-3 py-2.5'>Kategori</th>
                        <th className='px-4 py-2.5'>Rumusan IKU / Indikator Renstra</th>
                      </tr>
                    </thead>
                    <tbody className='divide-y bg-background'>
                      {konteks.indikators && konteks.indikators.length > 0 ? (
                        konteks.indikators.map((ind, idx) => {
                          const isIku = ind.jenis === 'IKU'
                          return (
                            <tr key={ind.id} className='hover:bg-muted/10 transition-colors'>
                              <td className='px-3 py-3 text-center font-medium text-muted-foreground'>
                                {idx + 1}
                              </td>
                              <td className='px-3 py-3 font-mono font-semibold'>
                                {ind.kode_indikator || '-'}
                              </td>
                              <td className='px-3 py-3'>
                                <Badge
                                  variant={isIku ? 'default' : 'secondary'}
                                  className='text-[10px] px-1.5 py-0'
                                >
                                  {isIku ? 'IKU Utama' : 'Indikator Renstra'}
                                </Badge>
                              </td>
                              <td className='px-4 py-3 font-medium text-foreground leading-relaxed'>
                                {ind.indikator}
                              </td>
                            </tr>
                          )
                        })
                      ) : (
                        <tr>
                          <td colSpan={4} className='p-4 text-center text-xs text-muted-foreground italic'>
                            Belum ada IKU atau indikator yang dipilih.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* SECTION: INFORMASI LAIN */}
              <div className='space-y-2'>
                <div className='flex items-center gap-2 border-b pb-2'>
                  <span className='flex h-5 w-5 items-center justify-center rounded-full bg-muted text-muted-foreground text-[11px] font-bold'>
                    C
                  </span>
                  <h3 className='text-xs font-bold uppercase tracking-wider text-muted-foreground'>
                    Informasi Lain / Isu Strategis Lingkungan Risiko
                  </h3>
                </div>
                <div className='rounded-lg border bg-muted/10 p-4 text-xs text-foreground leading-relaxed whitespace-pre-line'>
                  {konteks.informasi_lain && konteks.informasi_lain.trim() !== '-'
                    ? konteks.informasi_lain
                    : 'Tidak ada catatan informasi tambahan.'}
                </div>
              </div>

              {/* SECTION: LEMBAR PENGESAHAN KEPALA OPD */}
              <div className='pt-6 border-t flex flex-col sm:flex-row justify-end'>
                <div className='text-center sm:text-end space-y-1 min-w-[300px]'>
                  <p className='text-xs text-muted-foreground'>
                    Cianjur, {konteks.tanggal_penetapan ? new Date(konteks.tanggal_penetapan).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : '....................................'}
                  </p>
                  <p className='text-xs font-semibold text-foreground leading-tight'>
                    {konteks.jabatan_kepala || `Kepala ${konteks.opd?.nama || 'OPD'}`}
                  </p>
                  <p className='text-[11px] text-muted-foreground'>
                    Kabupaten Cianjur
                  </p>
                  <div className='h-20 flex items-center justify-center sm:justify-end'>
                    <div className='h-12 border-b border-dashed w-56 border-muted-foreground/40' />
                  </div>
                  <p className='text-xs font-bold text-foreground underline'>
                    {konteks.nama_kepala || '(................................................)'}
                  </p>
                  <p className='text-[11px] text-muted-foreground font-mono'>
                    NIP. {konteks.nip_kepala || '....................................'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 2: POHON KINERJA MAKRO (Interactive Tree Diagram) */}
        <TabsContent value='pohon' className='mt-4'>
          <KonteksTreeView konteks={konteks} />
        </TabsContent>
      </Tabs>

      {/* Delete Confirmation Modal */}
      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title='Hapus Penetapan Konteks Risiko (Form 2B)?'
        desc='Tindakan ini akan menghapus dokumen penetapan konteks risiko strategis OPD tahun berjalan. Data sasaran dan IKU makro di menu Perencanaan tidak akan terhapus.'
        confirmText={isDeleting ? 'Menghapus...' : 'Ya, Hapus Dokumen'}
        destructive
        handleConfirm={handleDelete}
        isLoading={isDeleting}
      />
    </div>
  )
}
