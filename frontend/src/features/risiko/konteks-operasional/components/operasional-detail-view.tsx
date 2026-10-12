import { useState } from 'react'
import {
  CheckCircle2,
  Clock,
  Download,
  FileText,
  FolderTree,
  Pencil,
  Printer,
  Trash2,
} from 'lucide-react'
import { toast } from 'sonner'
import type {
  KonteksOperasionalItem,
  KonteksOperasionalItemJenis,
  KonteksOperasionalItemNode,
} from '@/types/risiko'
import { risikoService } from '@/services/risiko-service'
import { usePermissions } from '@/hooks/use-permissions'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { OperasionalTreeTable } from './operasional-tree-table'
import { OperasionalItemDialog } from './operasional-item-dialog'

interface OperasionalDetailViewProps {
  konteks: KonteksOperasionalItem
  onEditHeader: () => void
  onDeleted: () => void
  onRefetch: () => void
}

export function OperasionalDetailView({
  konteks,
  onEditHeader,
  onDeleted,
  onRefetch,
}: OperasionalDetailViewProps) {
  const { hasPermission } = usePermissions()
  const [activeTab, setActiveTab] = useState<'dokumen' | 'pohon'>('dokumen')
  const [isExporting, setIsExporting] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  // Item dialog state
  const [itemDialogOpen, setItemDialogOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<KonteksOperasionalItemNode | null>(null)
  const [parentItem, setParentItem] = useState<KonteksOperasionalItemNode | null>(null)
  const [targetJenis, setTargetJenis] = useState<KonteksOperasionalItemJenis>('program')

  const canEdit = hasPermission('konteks_operasional.edit')
  const canDelete = hasPermission('konteks_operasional.delete')
  const canExport =
    hasPermission('konteks_operasional.export') || hasPermission('konteks_operasional.view')

  async function handleExport() {
    setIsExporting(true)
    try {
      const opdCode = konteks.opd?.kode || 'OPD'
      const filename = `Form_2C_Konteks_Risiko_Operasional_${opdCode}_${
        konteks.periode?.tahun_penilaian || ''
      }.xlsx`
      await risikoService.exportOperasionalExcel(konteks.id, filename)
      toast.success('Formulir 2C berhasil diunduh dalam format Excel (.xlsx)')
    } catch {
      toast.error('Gagal mengunduh berkas Excel Form 2C.')
    } finally {
      setIsExporting(false)
    }
  }

  function handlePrint() {
    window.print()
  }

  async function handleDeleteAll() {
    setIsDeleting(true)
    try {
      await risikoService.deleteKonteksOperasional(konteks.id)
      toast.success('Penetapan Konteks Risiko Operasional OPD (Form 2C) berhasil dihapus.')
      setDeleteOpen(false)
      onDeleted()
    } catch {
      toast.error('Gagal menghapus data penetapan konteks operasional.')
    } finally {
      setIsDeleting(false)
    }
  }

  function handleAddProgram() {
    setEditingItem(null)
    setParentItem(null)
    setTargetJenis('program')
    setItemDialogOpen(true)
  }

  function handleAddChild(
    parent: KonteksOperasionalItemNode,
    target: KonteksOperasionalItemJenis
  ) {
    setEditingItem(null)
    setParentItem(parent)
    setTargetJenis(target)
    setItemDialogOpen(true)
  }

  function handleEditItem(item: KonteksOperasionalItemNode) {
    setEditingItem(item)
    setParentItem(null)
    setTargetJenis(item.jenis)
    setItemDialogOpen(true)
  }

  const isFinal = konteks.status === 'final'
  const programs = konteks.programs || []

  // Flattened row generation for Sheet 2C official table view
  // Format: No. | Program | Kegiatan | Sub Kegiatan | Indikator Kinerja | Target Kinerja
  let globalRowCounter = 0

  return (
    <div className='space-y-6'>
      {/* Print media stylesheet */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #print-form-2c, #print-form-2c * {
            visibility: visible;
          }
          #print-form-2c {
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

      {/* Action Toolbar & Tab Switcher */}
      <div className='flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 p-4 rounded-xl border bg-card shadow-2xs'>
        <div className='flex items-center gap-2'>
          <Tabs
            value={activeTab}
            onValueChange={(v) => setActiveTab(v as 'dokumen' | 'pohon')}
            className='w-auto'
          >
            <TabsList className='h-9 bg-muted/60'>
              <TabsTrigger value='dokumen' className='text-xs gap-1.5'>
                <FileText className='h-3.5 w-3.5' />
                <span>Format Resmi Form 2C</span>
              </TabsTrigger>
              <TabsTrigger value='pohon' className='text-xs gap-1.5'>
                <FolderTree className='h-3.5 w-3.5' />
                <span>Pohon Hirarki Operasional</span>
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <Badge
            variant={isFinal ? 'default' : 'secondary'}
            className='text-xs px-2 py-0.5 ml-2'
          >
            {isFinal ? (
              <span className='flex items-center gap-1'>
                <CheckCircle2 className='h-3 w-3' /> Ditetapkan
              </span>
            ) : (
              <span className='flex items-center gap-1'>
                <Clock className='h-3 w-3' /> Draft
              </span>
            )}
          </Badge>
        </div>

        <div className='flex items-center gap-2 flex-wrap'>
          {canExport && (
            <Button
              variant='outline'
              size='sm'
              onClick={handleExport}
              disabled={isExporting}
              className='gap-1.5 text-xs h-8'
            >
              <Download className='h-3.5 w-3.5' />
              <span>{isExporting ? 'Mengunduh...' : 'Unduh Excel (.xlsx)'}</span>
            </Button>
          )}

          <Button
            variant='outline'
            size='sm'
            onClick={handlePrint}
            className='gap-1.5 text-xs h-8'
          >
            <Printer className='h-3.5 w-3.5' />
            <span>Cetak Dokumen</span>
          </Button>

          {canEdit && (
            <Button
              variant='outline'
              size='sm'
              onClick={onEditHeader}
              className='gap-1.5 text-xs h-8'
            >
              <Pencil className='h-3.5 w-3.5' />
              <span>Ubah Header & Pengesahan</span>
            </Button>
          )}

          {canDelete && (
            <Button
              variant='ghost'
              size='sm'
              onClick={() => setDeleteOpen(true)}
              className='gap-1.5 text-xs h-8 text-destructive hover:bg-destructive/10'
            >
              <Trash2 className='h-3.5 w-3.5' />
              <span>Hapus Form 2C</span>
            </Button>
          )}
        </div>
      </div>

      {/* Tabs Content */}
      {activeTab === 'dokumen' ? (
        /* OFFICIAL PAPER VIEW (FORMULIR 2C) */
        <Card className='shadow-xs' id='print-form-2c'>
          <CardContent className='p-6 sm:p-10 space-y-6'>
            {/* Header Form */}
            <div className='border-b-2 border-foreground pb-4 space-y-1 text-center'>
              <Badge variant='outline' className='text-[10px] font-mono mb-1'>
                FORMULIR 2C
              </Badge>
              <h2 className='text-lg sm:text-xl font-bold uppercase tracking-tight text-foreground'>
                PENETAPAN KONTEKS RISIKO OPERASIONAL OPD
              </h2>
              <p className='text-xs text-muted-foreground'>
                Tingkat Program, Kegiatan, dan Sub-Kegiatan beserta Indikator & Target Kinerja
              </p>
            </div>

            {/* Metadata Table */}
            <div className='rounded-lg border overflow-hidden text-xs'>
              <table className='w-full border-collapse'>
                <tbody>
                  <tr className='border-b'>
                    <td className='py-2 px-3 font-semibold w-1/3 bg-muted/40 border-r'>
                      Pemerintah Daerah
                    </td>
                    <td className='py-2 px-3 font-medium text-foreground'>
                      {konteks.nama_pemda || 'Pemerintah Kabupaten Cianjur'}
                    </td>
                  </tr>
                  <tr className='border-b'>
                    <td className='py-2 px-3 font-semibold bg-muted/40 border-r'>
                      Nama Perangkat Daerah (OPD)
                    </td>
                    <td className='py-2 px-3 font-bold text-foreground'>
                      {konteks.opd?.nama} ({konteks.opd?.kode})
                    </td>
                  </tr>
                  <tr className='border-b'>
                    <td className='py-2 px-3 font-semibold bg-muted/40 border-r'>
                      Tahun Penilaian
                    </td>
                    <td className='py-2 px-3 font-medium text-foreground'>
                      Tahun {konteks.periode?.tahun_penilaian || '-'} (Periode{' '}
                      {konteks.periode?.rentang_tahun || '-'})
                    </td>
                  </tr>
                  <tr className='border-b'>
                    <td className='py-2 px-3 font-semibold bg-muted/40 border-r'>
                      Tujuan Strategis OPD (Form 2B)
                    </td>
                    <td className='py-2 px-3 font-semibold text-primary'>
                      {konteks.tujuan_strategis ? (
                        <>
                          <span className='font-mono font-bold mr-1'>
                            [{konteks.tujuan_strategis.kode_tujuan || 'TUJUAN'}]
                          </span>
                          {konteks.tujuan_strategis.tujuan}
                        </>
                      ) : (
                        <span className='text-muted-foreground italic font-normal'>
                          Belum terhubung dengan Form 2B (Konteks Strategis belum ditetapkan)
                        </span>
                      )}
                    </td>
                  </tr>
                  <tr className='border-b'>
                    <td className='py-2 px-3 font-semibold bg-muted/40 border-r'>
                      Keterangan Sumber Data
                    </td>
                    <td className='py-2 px-3 text-foreground'>
                      {konteks.sumber_data?.nama || 'Renstra / Renja OPD'}
                    </td>
                  </tr>
                  <tr>
                    <td className='py-2 px-3 font-semibold bg-muted/40 border-r'>
                      Informasi Lain yang Relevan
                    </td>
                    <td className='py-2 px-3 text-foreground italic whitespace-pre-wrap'>
                      {konteks.informasi_lain || '-'}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Official Table matching Sheet 2C */}
            <div className='rounded-lg border overflow-x-auto'>
              <table className='w-full border-collapse text-xs text-left'>
                <thead>
                  <tr className='bg-muted/80 border-b border-border text-foreground font-bold text-center text-[11px]'>
                    <th className='py-2.5 px-2 border-r w-10'>No.</th>
                    <th className='py-2.5 px-3 border-r min-w-[200px]'>Program</th>
                    <th className='py-2.5 px-3 border-r min-w-[200px]'>Kegiatan</th>
                    <th className='py-2.5 px-3 border-r min-w-[220px]'>Sub Kegiatan</th>
                    <th className='py-2.5 px-3 border-r min-w-[200px]'>Indikator Kinerja</th>
                    <th className='py-2.5 px-3 w-32'>Target Kinerja</th>
                  </tr>
                  <tr className='bg-muted/40 border-b border-border text-muted-foreground font-mono text-[10px] text-center'>
                    <th className='py-1 px-1 border-r'>(1)</th>
                    <th className='py-1 px-1 border-r'>(2)</th>
                    <th className='py-1 px-1 border-r'>(3)</th>
                    <th className='py-1 px-1 border-r'>(4)</th>
                    <th className='py-1 px-1 border-r'>(5)</th>
                    <th className='py-1 px-1'>(6)</th>
                  </tr>
                </thead>
                <tbody className='divide-y divide-border/60'>
                  {programs.length === 0 ? (
                    <tr>
                      <td colSpan={6} className='py-10 text-center text-muted-foreground italic'>
                        Belum ada data Program, Kegiatan, dan Sub-Kegiatan yang dimasukkan.
                      </td>
                    </tr>
                  ) : (
                    programs.map((prog) => {
                      return prog.children?.map((keg) => {
                        return keg.children?.map((sub) => {
                          globalRowCounter++
                          const rowNum = globalRowCounter

                          return (
                            <tr key={sub.id} className='hover:bg-muted/30 transition-colors'>
                              <td className='py-2 px-2 border-r text-center font-mono text-[11px] align-top'>
                                {rowNum}
                              </td>
                              <td className='py-2 px-3 border-r align-top'>
                                <span className='font-mono font-bold text-primary mr-1 text-[11px]'>
                                  {prog.kode}
                                </span>
                                <span className='font-medium text-foreground'>{prog.nama}</span>
                              </td>
                              <td className='py-2 px-3 border-r align-top'>
                                <span className='font-mono font-semibold text-muted-foreground mr-1 text-[11px]'>
                                  {keg.kode}
                                </span>
                                <span className='text-foreground'>{keg.nama}</span>
                              </td>
                              <td className='py-2 px-3 border-r align-top'>
                                <span className='font-mono text-muted-foreground mr-1 text-[11px]'>
                                  {sub.kode}
                                </span>
                                <span className='text-foreground font-medium'>{sub.nama}</span>
                              </td>
                              <td className='py-2 px-3 border-r align-top'>
                                {sub.indikators && sub.indikators.length > 0 ? (
                                  <div className='space-y-1'>
                                    {sub.indikators.map((ind, i) => (
                                      <div key={ind.id || i} className='text-foreground text-xs'>
                                        • {ind.indikator}
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <span className='text-muted-foreground italic text-[11px]'>-</span>
                                )}
                              </td>
                              <td className='py-2 px-3 text-center align-top'>
                                {sub.indikators && sub.indikators.length > 0 ? (
                                  <div className='space-y-1'>
                                    {sub.indikators.map((ind, i) => (
                                      <Badge
                                        key={ind.id || i}
                                        variant='outline'
                                        className='text-[10px] font-mono'
                                      >
                                        {ind.target} {ind.satuan || ''}
                                      </Badge>
                                    ))}
                                  </div>
                                ) : (
                                  <span className='text-muted-foreground italic text-[11px]'>-</span>
                                )}
                              </td>
                            </tr>
                          )
                        })
                      })
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Signature Block */}
            <div className='pt-8 flex justify-end'>
              <div className='text-center min-w-[280px] space-y-1 text-xs'>
                <p className='text-muted-foreground'>
                  Cianjur,{' '}
                  {konteks.tanggal_penetapan
                    ? new Date(konteks.tanggal_penetapan).toLocaleDateString('id-ID', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                      })
                    : new Date().toLocaleDateString('id-ID', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                      })}
                </p>
                <p className='font-semibold text-foreground'>
                  {konteks.jabatan_kepala || `Kepala ${konteks.opd?.nama || 'OPD'}`}
                </p>
                <div className='h-16' /> {/* Signature space */}
                <p className='font-bold underline text-foreground'>
                  {konteks.nama_kepala || '...........................................'}
                </p>
                <p className='text-muted-foreground font-mono text-[11px]'>
                  NIP. {konteks.nip_kepala || '...........................................'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        /* INTERACTIVE TREE TABLE VIEW */
        <OperasionalTreeTable
          konteksId={konteks.id}
          programs={programs}
          canEdit={canEdit}
          onAddProgram={handleAddProgram}
          onAddChild={handleAddChild}
          onEditItem={handleEditItem}
          onRefetch={onRefetch}
        />
      )}

      {/* Item Add/Edit Dialog */}
      <OperasionalItemDialog
        open={itemDialogOpen}
        onOpenChange={setItemDialogOpen}
        konteksId={konteks.id}
        editingItem={editingItem}
        parentItem={parentItem}
        targetJenis={targetJenis}
        programsList={programs}
        onSuccess={() => {
          onRefetch()
        }}
      />

      {/* Delete Entire Form 2C Confirm Dialog */}
      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title='Hapus Penetapan Konteks Risiko Operasional (Form 2C)'
        desc='Apakah Anda yakin ingin menghapus seluruh penetapan konteks risiko operasional OPD ini beserta seluruh rincian program, kegiatan, sub-kegiatan, dan indikatornya?'
        confirmText='Ya, Hapus Semua'
        destructive
        isLoading={isDeleting}
        handleConfirm={handleDeleteAll}
      />
    </div>
  )
}
