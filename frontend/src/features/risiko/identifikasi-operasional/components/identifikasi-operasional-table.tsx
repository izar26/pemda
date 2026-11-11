import { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import {
  BrainCircuit,
  CheckCircle2,
  Edit2,
  HelpCircle,
  MoreHorizontal,
  Plus,
  Trash2,
} from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ConfirmDialog } from '@/components/confirm-dialog'
import type { IdentifikasiRisikoOpdOperasionalItem } from '@/types/risiko'
import { risikoService } from '@/services/risiko-service'

interface IdentifikasiOperasionalTableProps {
  dokumenId: string
  items: IdentifikasiRisikoOpdOperasionalItem[]
  canEdit: boolean
  onAddItem: () => void
  onEditItem: (item: IdentifikasiRisikoOpdOperasionalItem) => void
  onRefresh: () => void
}

export function IdentifikasiOperasionalTable({
  dokumenId,
  items,
  canEdit,
  onAddItem,
  onEditItem,
  onRefresh,
}: IdentifikasiOperasionalTableProps) {
  const navigate = useNavigate()
  const [itemToDelete, setItemToDelete] = useState<IdentifikasiRisikoOpdOperasionalItem | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  async function handleDeleteConfirm() {
    if (!itemToDelete) return
    try {
      setIsDeleting(true)
      await risikoService.deleteIdentifikasiOperasionalItem(dokumenId, itemToDelete.id)
      toast.success(`Risiko ${itemToDelete.kode_risiko} berhasil dihapus.`)
      setItemToDelete(null)
      onRefresh()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal menghapus risiko.'
      toast.error(msg)
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div className='min-w-0 space-y-3'>
      {/* Table Action Bar */}
      <div className='flex flex-col sm:flex-row sm:items-center justify-between gap-2'>
        <div className='space-y-0.5'>
          <h3 className='text-sm font-bold text-foreground flex flex-wrap items-center gap-2'>
            <span>Daftar Risiko Operasional Perangkat Daerah</span>
            <Badge variant='outline' className='text-xs font-mono font-semibold'>
              {items.length} Risiko
            </Badge>
          </h3>
          <p className='text-xs text-muted-foreground'>
            Kode risiko berformat otomatis: <code className='font-mono font-semibold text-foreground'>ROO.[Tahun].[Singkatan OPD].[Kategori].[Urutan]</code>
          </p>
        </div>

        {canEdit && (
          <Button
            type='button'
            size='sm'
            onClick={onAddItem}
            className='text-xs h-8 gap-1.5 font-semibold shrink-0'
          >
            <Plus className='h-3.5 w-3.5' />
            Tambah Risiko Baru
          </Button>
        )}
      </div>

      <p className='text-xs text-muted-foreground lg:hidden'>Geser tabel ke samping untuk melihat seluruh kolom.</p>

      {/* Table Container */}
      <div className='@container min-w-0 max-w-full rounded-lg border overflow-hidden shadow-2xs bg-card'>
        <div className='max-w-full overflow-x-auto' role='region' aria-label='Tabel risiko, geser untuk melihat seluruh kolom' tabIndex={0}>
          <table className='w-full text-xs text-start'>
            <thead className='bg-muted/50 border-b text-muted-foreground font-semibold select-none'>
              <tr>
                <th className='p-2.5 text-center w-12'>No</th>
                <th className='p-2.5 text-start min-w-[220px]'>Program / Kegiatan / Sub-Kegiatan</th>
                <th className='p-2.5 text-start min-w-[120px]'>PROBIS</th>
                <th className='p-2.5 text-start min-w-[150px]'>Kategori & Kode Risiko</th>
                <th className='p-2.5 text-start min-w-[220px]'>Pernyataan Risiko</th>
                <th className='p-2.5 text-start min-w-[130px]'>Pemilik Risiko</th>
                <th className='p-2.5 text-start min-w-[200px] bg-amber-500/5 dark:bg-amber-500/10 border-x border-amber-500/20'>
                  <div className='flex items-center gap-1 text-amber-900 dark:text-amber-300 font-bold'>
                    <span>Uraian Sebab & Sumber (RCA)</span>
                  </div>
                </th>
                <th className='p-2.5 text-center w-16'>C/UC</th>
                <th className='p-2.5 text-start min-w-[180px]'>Uraian Dampak</th>
                <th className='p-2.5 text-start min-w-[130px]'>Pihak Terkena</th>
                <th className='p-2.5 text-center w-16'>Aksi</th>
              </tr>
            </thead>
            <tbody className='divide-y divide-border/60'>
              {items.length === 0 ? (
                <tr>
                  <td colSpan={11} className='p-0 text-center text-muted-foreground'>
                    <div className='sticky left-0 flex w-[100cqw] max-w-full flex-col items-center justify-center gap-2 p-6'>
                      <HelpCircle className='h-8 w-8 text-muted-foreground/40' />
                      <p className='font-semibold'>Belum ada butir risiko operasional OPD yang ditambahkan.</p>
                      {canEdit && (
                        <Button
                          type='button'
                          variant='outline'
                          size='sm'
                          onClick={onAddItem}
                          className='text-xs h-7 gap-1 mt-1 font-medium'
                        >
                          <Plus className='h-3 w-3' /> Tambah Risiko Pertama
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                items.map((item, idx) => {
                  const hasRcaData = Boolean(item.uraian_sebab && item.sumber_risiko)

                  return (
                    <tr key={item.id} className='hover:bg-muted/20 transition-colors'>
                      {/* 1. No */}
                      <td className='p-2.5 text-center font-mono text-muted-foreground font-medium'>
                        {item.nomor_urut || idx + 1}
                      </td>

                      {/* 2. Sub-Kegiatan & Indikator */}
                      <td className='p-2.5 space-y-1 align-top'>
                        <div>
                          <span className='font-semibold text-foreground block leading-tight'>
                            {item.resolved_sub_kegiatan || '-'}
                          </span>
                        </div>
                        {(item.resolved_kegiatan || item.resolved_program) && (
                          <div className='text-[10px] text-muted-foreground space-y-0.5 border-l-2 border-primary/20 pl-1.5'>
                            {item.resolved_program && <div>Prog: {item.resolved_program}</div>}
                            {item.resolved_kegiatan && <div>Keg: {item.resolved_kegiatan}</div>}
                          </div>
                        )}
                        {item.resolved_indikator && (
                          <div className='text-[11px] text-muted-foreground flex items-center gap-1 pt-0.5'>
                            <span className='font-semibold text-primary/80'>Keluaran:</span>
                            <span>{item.resolved_indikator}</span>
                          </div>
                        )}
                      </td>

                      {/* 3. PROBIS */}
                      <td className='p-2.5 align-top'>
                        <Badge
                          variant='outline'
                          className='text-[10px] font-semibold bg-sky-50 dark:bg-sky-950/30 text-sky-700 dark:text-sky-300 border-sky-300'
                        >
                          {item.probis || 'Pelaksanaan'}
                        </Badge>
                      </td>

                      {/* 4. Kategori & Kode Risiko */}
                      <td className='p-2.5 space-y-1 align-top'>
                        <Badge
                          variant='secondary'
                          className='text-[10px] font-semibold bg-primary/10 text-primary border-primary/20'
                        >
                          {item.kategori_risiko}
                        </Badge>
                        <div>
                          <Badge
                            className='text-[10px] font-mono font-bold bg-amber-400 text-slate-900 border border-amber-500 shadow-2xs hover:bg-amber-400 select-all'
                          >
                            {item.kode_risiko}
                          </Badge>
                        </div>
                      </td>

                      {/* 5. Pernyataan Risiko */}
                      <td className='p-2.5 align-top'>
                        <p className='font-medium text-foreground leading-snug'>
                          {item.pernyataan_risiko}
                        </p>
                      </td>

                      {/* 6. Pemilik Risiko */}
                      <td className='p-2.5 text-foreground align-top font-medium'>
                        {item.pemilik_risiko || '-'}
                      </td>

                      {/* 7. Uraian Sebab & Sumber (Terkoneksi dari RCA) */}
                      <td className='p-2.5 align-top bg-amber-500/5 dark:bg-amber-500/10 border-x border-amber-500/20 space-y-1.5'>
                        {hasRcaData ? (
                          <>
                            <div className='flex items-center justify-between gap-1'>
                              <Badge
                                variant='outline'
                                className='text-[9px] font-mono bg-background font-semibold'
                              >
                                Sumber: {item.sumber_risiko}
                              </Badge>
                              <span className='text-[10px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-0.5'>
                                <CheckCircle2 className='h-3 w-3' />
                                RCA Terisi
                              </span>
                            </div>
                            <p className='text-xs text-foreground italic leading-tight'>
                              &ldquo;{item.uraian_sebab}&rdquo;
                            </p>
                          </>
                        ) : (
                          <div className='space-y-1 py-1'>
                            <div className='flex items-center gap-1 text-[11px] text-amber-700 dark:text-amber-400 font-medium'>
                              <BrainCircuit className='h-3.5 w-3.5 shrink-0' />
                              <span>Belum dianalisis di RCA</span>
                            </div>
                            <Button
                              type='button'
                              variant='link'
                              size='sm'
                              onClick={() => navigate({ to: '/risiko/rca' })}
                              className='h-auto p-0 text-[11px] text-primary font-semibold hover:underline'
                            >
                              Buka Analisis RCA (5-Whys) &rarr;
                            </Button>
                          </div>
                        )}
                      </td>

                      {/* 8. Sifat Risiko (C / UC) */}
                      <td className='p-2.5 text-center align-top'>
                        <Badge
                          variant={item.sifat_risiko === 'C' ? 'default' : 'destructive'}
                          className='text-[10px] font-mono font-bold px-1.5 py-0.5'
                        >
                          {item.sifat_risiko}
                        </Badge>
                      </td>

                      {/* 9. Uraian Dampak */}
                      <td className='p-2.5 align-top text-muted-foreground leading-snug'>
                        {item.uraian_dampak || '-'}
                      </td>

                      {/* 10. Pihak Terkena */}
                      <td className='p-2.5 align-top text-foreground font-medium'>
                        {item.pihak_terkena || '-'}
                      </td>

                      {/* 11. Aksi Menu */}
                      <td className='p-2.5 text-center align-top'>
                        {canEdit ? (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant='ghost'
                                size='icon'
                                className='h-7 w-7 text-muted-foreground hover:text-foreground'
                              >
                                <MoreHorizontal className='h-4 w-4' />
                                <span className='sr-only'>Aksi menu</span>
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align='end' className='w-40'>
                              <DropdownMenuItem
                                onClick={() => onEditItem(item)}
                                className='gap-2 text-xs font-medium cursor-pointer'
                              >
                                <Edit2 className='h-3.5 w-3.5 text-primary' />
                                Ubah Butir
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => navigate({ to: '/risiko/rca' })}
                                className='gap-2 text-xs font-medium cursor-pointer'
                              >
                                <BrainCircuit className='h-3.5 w-3.5 text-amber-500' />
                                Analisis RCA
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => setItemToDelete(item)}
                                className='gap-2 text-xs font-medium text-destructive focus:text-destructive cursor-pointer'
                              >
                                <Trash2 className='h-3.5 w-3.5' />
                                Hapus Butir
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        ) : (
                          <span className='text-[11px] text-muted-foreground italic'>-</span>
                        )}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={Boolean(itemToDelete)}
        onOpenChange={(open) => {
          if (!open) setItemToDelete(null)
        }}
        handleConfirm={handleDeleteConfirm}
        isLoading={isDeleting}
        title='Hapus Risiko Operasional'
        desc={
          <>
            Apakah Anda yakin ingin menghapus butir risiko{' '}
            <strong className='font-mono text-foreground'>{itemToDelete?.kode_risiko}</strong>?
            Data analisis RCA (5-Whys) terkait risiko ini juga akan dihapus secara otomatis.
          </>
        }
        confirmText='Ya, Hapus'
        destructive
      />
    </div>
  )
}
