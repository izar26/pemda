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
import type { IdentifikasiRisikoPemdaItem } from '@/types/risiko'
import { risikoService } from '@/services/risiko-service'

interface IdentifikasiPemdaTableProps {
  dokumenId: string
  items: IdentifikasiRisikoPemdaItem[]
  canEdit: boolean
  onAddItem: () => void
  onEditItem: (item: IdentifikasiRisikoPemdaItem) => void
  onRefresh: () => void
}

export function IdentifikasiPemdaTable({
  dokumenId,
  items,
  canEdit,
  onAddItem,
  onEditItem,
  onRefresh,
}: IdentifikasiPemdaTableProps) {
  const navigate = useNavigate()
  const [itemToDelete, setItemToDelete] = useState<IdentifikasiRisikoPemdaItem | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  async function handleDeleteConfirm() {
    if (!itemToDelete) return
    try {
      setIsDeleting(true)
      await risikoService.deleteIdentifikasiPemdaItem(dokumenId, itemToDelete.id)
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
    <div className='space-y-3'>
      {/* Table Action Bar */}
      <div className='flex flex-col sm:flex-row sm:items-center justify-between gap-2'>
        <div className='space-y-0.5'>
          <h3 className='text-sm font-bold text-foreground flex items-center gap-2'>
            <span>Daftar Risiko Strategis Pemda</span>
            <Badge variant='outline' className='text-xs font-mono font-semibold'>
              {items.length} Risiko
            </Badge>
          </h3>
          <p className='text-xs text-muted-foreground'>
            Kode risiko berformat otomatis: <code className='font-mono font-semibold text-foreground'>RSP.[Tahun].[Kategori].[Urutan]</code>
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

      {/* Table Container */}
      <div className='rounded-lg border overflow-hidden shadow-2xs bg-card'>
        <div className='overflow-x-auto'>
          <table className='w-full text-xs text-start'>
            <thead className='bg-muted/50 border-b text-muted-foreground font-semibold select-none'>
              <tr>
                <th className='p-2.5 text-center w-12'>No</th>
                <th className='p-2.5 text-start min-w-[200px]'>Tujuan / Sasaran & Indikator</th>
                <th className='p-2.5 text-start min-w-[140px]'>Kategori & Kode Risiko</th>
                <th className='p-2.5 text-start min-w-[220px]'>Pernyataan Risiko</th>
                <th className='p-2.5 text-start min-w-[120px]'>Pemilik Risiko</th>
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
                  <td colSpan={10} className='p-8 text-center text-muted-foreground'>
                    <div className='flex flex-col items-center justify-center gap-2'>
                      <HelpCircle className='h-8 w-8 text-muted-foreground/40' />
                      <p className='font-semibold'>Belum ada butir risiko strategis Pemda yang ditambahkan.</p>
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

                      {/* 2. Sasaran & Indikator */}
                      <td className='p-2.5 space-y-1 align-top'>
                        <div>
                          <span className='font-semibold text-foreground block leading-tight'>
                            {item.resolved_sasaran || '-'}
                          </span>
                        </div>
                        {item.resolved_indikator && (
                          <div className='text-[11px] text-muted-foreground flex items-center gap-1'>
                            <span className='font-semibold text-primary/80'>IKU:</span>
                            <span>{item.resolved_indikator}</span>
                          </div>
                        )}
                      </td>

                      {/* 3. Kategori & Kode Risiko (Excel highlight styling) */}
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

                      {/* 4. Pernyataan Risiko */}
                      <td className='p-2.5 align-top'>
                        <p className='font-medium text-foreground leading-snug'>
                          {item.pernyataan_risiko}
                        </p>
                      </td>

                      {/* 5. Pemilik Risiko */}
                      <td className='p-2.5 text-foreground align-top font-medium'>
                        {item.pemilik_risiko || 'Kepala Daerah'}
                      </td>

                      {/* 6. Uraian Sebab & Sumber (Terkoneksi dari RCA) */}
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
                              <span className='text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-0.5'>
                                <CheckCircle2 className='h-3 w-3' /> RCA Selesai
                              </span>
                            </div>
                            <p className='text-xs text-foreground font-medium italic'>
                              "{item.uraian_sebab}"
                            </p>
                          </>
                        ) : (
                          <div className='space-y-1'>
                            <Badge
                              variant='outline'
                              className='text-[10px] text-amber-700 dark:text-amber-300 border-amber-300 bg-amber-100/40 dark:bg-amber-900/30'
                            >
                              Belum Dianalisis di RCA
                            </Badge>
                            <p className='text-[11px] text-muted-foreground'>
                              Sebab & Sumber akan terisi otomatis setelah analisis 5-Whys di Tab RCA.
                            </p>
                          </div>
                        )}
                      </td>

                      {/* 7. C / UC */}
                      <td className='p-2.5 text-center align-top'>
                        <Badge
                          variant='outline'
                          className={
                            item.sifat_risiko === 'C'
                              ? 'text-[10px] font-bold text-emerald-700 bg-emerald-500/10 border-emerald-500/30'
                              : 'text-[10px] font-bold text-amber-700 bg-amber-500/10 border-amber-500/30'
                          }
                        >
                          {item.sifat_risiko || 'C'}
                        </Badge>
                      </td>

                      {/* 8. Uraian Dampak */}
                      <td className='p-2.5 align-top text-muted-foreground'>
                        {item.uraian_dampak || '-'}
                      </td>

                      {/* 9. Pihak Terkena */}
                      <td className='p-2.5 align-top text-foreground font-medium'>
                        {item.pihak_terkena || '-'}
                      </td>

                      {/* 10. Aksi */}
                      <td className='p-2.5 text-center align-top'>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant='ghost'
                              size='icon'
                              className='h-7 w-7'
                              aria-label='Aksi Butir Risiko'
                            >
                              <MoreHorizontal className='h-3.5 w-3.5' />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align='end' className='text-xs'>
                            {canEdit && (
                              <DropdownMenuItem
                                onClick={() => onEditItem(item)}
                                className='gap-2 cursor-pointer'
                              >
                                <Edit2 className='h-3.5 w-3.5 text-muted-foreground' />
                                <span>Ubah Risiko</span>
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem
                              onClick={() => navigate({ to: '/risiko/rca' })}
                              className='gap-2 cursor-pointer'
                            >
                              <BrainCircuit className='h-3.5 w-3.5 text-primary' />
                              <span>Analisis Sebab (RCA)</span>
                            </DropdownMenuItem>
                            {canEdit && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() => setItemToDelete(item)}
                                  className='gap-2 text-destructive cursor-pointer'
                                >
                                  <Trash2 className='h-3.5 w-3.5' />
                                  <span>Hapus Risiko</span>
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Confirmation Dialog for Deleting Risk */}
      <ConfirmDialog
        open={Boolean(itemToDelete)}
        onOpenChange={(open) => !open && setItemToDelete(null)}
        title='Hapus Butir Risiko'
        desc={
          itemToDelete ? (
            <span>
              Apakah Anda yakin ingin menghapus risiko <strong>{itemToDelete.kode_risiko}</strong> (<em>{itemToDelete.pernyataan_risiko}</em>)?
              Data analisis RCA yang terhubung juga akan ikut terhapus. Tindakan ini tidak dapat dibatalkan.
            </span>
          ) : (
            ''
          )
        }
        confirmText='Ya, Hapus Risiko'
        cancelBtnText='Batal'
        destructive
        isLoading={isDeleting}
        handleConfirm={handleDeleteConfirm}
      />
    </div>
  )
}
