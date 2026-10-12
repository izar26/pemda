import { Fragment, useMemo, useState } from 'react'
import {
  ChevronDown,
  ChevronRight,
  Edit,
  FolderTree,
  Plus,
  Search,
  Trash2,
} from 'lucide-react'
import { toast } from 'sonner'
import { risikoService } from '@/services/risiko-service'
import type {
  KonteksOperasionalItemJenis,
  KonteksOperasionalItemNode,
} from '@/types/risiko'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ConfirmDialog } from '@/components/confirm-dialog'

interface OperasionalTreeTableProps {
  konteksId: string
  programs: KonteksOperasionalItemNode[]
  canEdit: boolean
  onAddProgram: () => void
  onAddChild: (parent: KonteksOperasionalItemNode, targetJenis: KonteksOperasionalItemJenis) => void
  onEditItem: (item: KonteksOperasionalItemNode) => void
  onRefetch: () => void
}

export function OperasionalTreeTable({
  konteksId,
  programs,
  canEdit,
  onAddProgram,
  onAddChild,
  onEditItem,
  onRefetch,
}: OperasionalTreeTableProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => {
    // Default: expand all programs
    const initial = new Set<string>()
    programs.forEach((p) => {
      initial.add(p.id)
      p.children?.forEach((k) => initial.add(k.id))
    })
    return initial
  })

  // Delete state
  const [deleteTarget, setDeleteTarget] = useState<KonteksOperasionalItemNode | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  // Toggle single item expansion
  function toggleExpand(id: string) {
    setExpandedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  // Expand all / Collapse all
  function expandAll() {
    const all = new Set<string>()
    programs.forEach((p) => {
      all.add(p.id)
      p.children?.forEach((k) => all.add(k.id))
    })
    setExpandedIds(all)
  }

  function collapseAll() {
    setExpandedIds(new Set())
  }

  // Handle delete item
  async function handleDelete() {
    if (!deleteTarget) return
    setIsDeleting(true)
    try {
      await risikoService.deleteKonteksOperasionalItem(konteksId, deleteTarget.id)
      toast.success(
        `Data ${getItemLabel(deleteTarget.jenis)} "${deleteTarget.nama}" berhasil dihapus.`
      )
      setDeleteTarget(null)
      onRefetch()
    } catch {
      toast.error('Gagal menghapus rincian operasional.')
    } finally {
      setIsDeleting(false)
    }
  }

  function getItemLabel(jenis: KonteksOperasionalItemJenis) {
    switch (jenis) {
      case 'program':
        return 'Program'
      case 'kegiatan':
        return 'Kegiatan'
      case 'sub_kegiatan':
        return 'Sub-Kegiatan'
    }
  }

  // Filter tree items according to search query
  const filteredPrograms = useMemo(() => {
    if (!searchQuery.trim()) return programs
    const q = searchQuery.toLowerCase()

    return programs
      .map((prog) => {
        const progMatches =
          prog.kode.toLowerCase().includes(q) ||
          prog.nama.toLowerCase().includes(q) ||
          prog.indikators?.some((ind) => ind.indikator.toLowerCase().includes(q))

        const filteredKegiatans =
          prog.children
            ?.map((keg) => {
              const kegMatches =
                keg.kode.toLowerCase().includes(q) ||
                keg.nama.toLowerCase().includes(q) ||
                keg.indikators?.some((ind) => ind.indikator.toLowerCase().includes(q))

              const filteredSub =
                keg.children?.filter((sub) => {
                  return (
                    sub.kode.toLowerCase().includes(q) ||
                    sub.nama.toLowerCase().includes(q) ||
                    sub.indikators?.some((ind) => ind.indikator.toLowerCase().includes(q))
                  )
                }) || []

              if (kegMatches || filteredSub.length > 0) {
                return {
                  ...keg,
                  children: kegMatches ? keg.children : filteredSub,
                }
              }
              return null
            })
            .filter(Boolean) as KonteksOperasionalItemNode[] || []

        if (progMatches || filteredKegiatans.length > 0) {
          return {
            ...prog,
            children: progMatches ? prog.children : filteredKegiatans,
          }
        }
        return null
      })
      .filter(Boolean) as KonteksOperasionalItemNode[]
  }, [programs, searchQuery])

  // Count summary
  const summary = useMemo(() => {
    let totalKeg = 0
    let totalSub = 0
    let totalInd = 0
    programs.forEach((p) => {
      totalInd += p.indikators?.length || 0
      p.children?.forEach((k) => {
        totalKeg++
        totalInd += k.indikators?.length || 0
        k.children?.forEach((s) => {
          totalSub++
          totalInd += s.indikators?.length || 0
        })
      })
    })
    return {
      progCount: programs.length,
      kegCount: totalKeg,
      subCount: totalSub,
      indCount: totalInd,
    }
  }, [programs])

  return (
    <div className='space-y-4'>
      {/* Search and Action Bar */}
      <div className='flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 rounded-xl border bg-card'>
        <div className='flex items-center gap-2 flex-1 max-w-md'>
          <div className='relative w-full'>
            <Search className='absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground' />
            <Input
              type='search'
              placeholder='Cari kode, nama program, kegiatan, atau indikator...'
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className='pl-8 text-xs h-9'
            />
          </div>
        </div>

        <div className='flex items-center gap-2 shrink-0 flex-wrap'>
          <div className='flex items-center gap-1.5 text-xs text-muted-foreground mr-1'>
            <span className='font-semibold text-foreground'>{summary.progCount}</span> Program ·
            <span className='font-semibold text-foreground'>{summary.kegCount}</span> Kegiatan ·
            <span className='font-semibold text-foreground'>{summary.subCount}</span> Sub-Kegiatan
          </div>

          <Button
            type='button'
            variant='outline'
            size='sm'
            onClick={expandedIds.size > 0 ? collapseAll : expandAll}
            className='h-8 text-xs'
          >
            {expandedIds.size > 0 ? 'Tutup Semua' : 'Buka Semua'}
          </Button>

          {canEdit && (
            <Button
              type='button'
              size='sm'
              onClick={onAddProgram}
              className='h-8 text-xs gap-1.5 shadow-2xs'
            >
              <Plus className='h-3.5 w-3.5' />
              <span>Tambah Program</span>
            </Button>
          )}
        </div>
      </div>

      {/* Tree Table Card */}
      <div className='rounded-xl border bg-card overflow-hidden shadow-2xs'>
        <div className='overflow-x-auto'>
          <table className='w-full text-left border-collapse text-xs'>
            <thead>
              <tr className='border-b bg-muted/60 text-muted-foreground font-semibold text-[11px] uppercase tracking-wider'>
                <th className='py-3 px-3 w-12 text-center'>Level</th>
                <th className='py-3 px-3 min-w-[280px]'>Kode & Nama Rincian Operasional</th>
                <th className='py-3 px-3 min-w-[220px]'>Indikator Kinerja</th>
                <th className='py-3 px-3 w-32 text-center'>Target Kinerja</th>
                {canEdit && <th className='py-3 px-3 w-36 text-center'>Aksi</th>}
              </tr>
            </thead>
            <tbody className='divide-y divide-border/50'>
              {filteredPrograms.length === 0 ? (
                <tr>
                  <td
                    colSpan={canEdit ? 5 : 4}
                    className='py-12 text-center text-muted-foreground'
                  >
                    <div className='flex flex-col items-center justify-center gap-2'>
                      <FolderTree className='h-8 w-8 text-muted-foreground/60' />
                      <p className='text-xs font-medium'>
                        {searchQuery
                          ? 'Tidak ada rincian operasional yang cocok dengan kata kunci pencarian.'
                          : 'Belum ada rincian Program, Kegiatan, dan Sub-Kegiatan yang terdaftar.'}
                      </p>
                      {canEdit && !searchQuery && (
                        <Button
                          variant='outline'
                          size='sm'
                          onClick={onAddProgram}
                          className='mt-2 text-xs gap-1'
                        >
                          <Plus className='h-3 w-3' />
                          <span>Mulai Tambah Program Pertama</span>
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                filteredPrograms.map((program) => {
                  const isProgExpanded = expandedIds.has(program.id)
                  const hasKegiatans = (program.children?.length || 0) > 0

                  return (
                    <Fragment key={program.id}>
                      {/* PROGRAM ROW (LEVEL 1) */}
                      <tr className='bg-primary/5 hover:bg-primary/10 transition-colors font-semibold border-t-2 border-border/70'>
                        <td className='py-2.5 px-3 text-center'>
                          <Badge variant='default' className='text-[10px] font-mono px-1.5 py-0'>
                            PROGRAM
                          </Badge>
                        </td>
                        <td className='py-2.5 px-3'>
                          <div className='flex items-center gap-2'>
                            {hasKegiatans ? (
                              <button
                                type='button'
                                onClick={() => toggleExpand(program.id)}
                                className='p-0.5 rounded hover:bg-muted text-muted-foreground transition-colors'
                              >
                                {isProgExpanded ? (
                                  <ChevronDown className='h-4 w-4' />
                                ) : (
                                  <ChevronRight className='h-4 w-4' />
                                )}
                              </button>
                            ) : (
                              <span className='w-5' />
                            )}
                            <span className='font-mono text-xs text-primary font-bold'>
                              {program.kode}
                            </span>
                            <span className='text-xs font-bold text-foreground'>
                              {program.nama}
                            </span>
                          </div>
                        </td>
                        <td className='py-2.5 px-3'>
                          {program.indikators && program.indikators.length > 0 ? (
                            <div className='space-y-1'>
                              {program.indikators.map((ind, i) => (
                                <div key={ind.id || i} className='text-xs text-foreground font-medium'>
                                  • {ind.indikator}
                                </div>
                              ))}
                            </div>
                          ) : (
                            <span className='text-muted-foreground italic text-[11px]'>-</span>
                          )}
                        </td>
                        <td className='py-2.5 px-3 text-center'>
                          {program.indikators && program.indikators.length > 0 ? (
                            <div className='space-y-1'>
                              {program.indikators.map((ind, i) => (
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
                        {canEdit && (
                          <td className='py-2.5 px-3 text-center'>
                            <div className='flex items-center justify-center gap-1'>
                              <Button
                                type='button'
                                variant='outline'
                                size='icon'
                                title='Tambah Kegiatan'
                                onClick={() => onAddChild(program, 'kegiatan')}
                                className='h-7 w-7'
                              >
                                <Plus className='h-3.5 w-3.5' />
                              </Button>
                              <Button
                                type='button'
                                variant='ghost'
                                size='icon'
                                title='Ubah Program'
                                onClick={() => onEditItem(program)}
                                className='h-7 w-7 text-muted-foreground hover:text-foreground'
                              >
                                <Edit className='h-3.5 w-3.5' />
                              </Button>
                              <Button
                                type='button'
                                variant='ghost'
                                size='icon'
                                title='Hapus Program'
                                onClick={() => setDeleteTarget(program)}
                                className='h-7 w-7 text-muted-foreground hover:text-destructive'
                              >
                                <Trash2 className='h-3.5 w-3.5' />
                              </Button>
                            </div>
                          </td>
                        )}
                      </tr>

                      {/* KEGIATAN ROWS (LEVEL 2) */}
                      {isProgExpanded &&
                        program.children?.map((kegiatan) => {
                          const isKegExpanded = expandedIds.has(kegiatan.id)
                          const hasSubKegiatans = (kegiatan.children?.length || 0) > 0

                          return (
                            <Fragment key={kegiatan.id}>
                              <tr className='bg-card hover:bg-muted/30 transition-colors'>
                                <td className='py-2 px-3 text-center'>
                                  <Badge
                                    variant='secondary'
                                    className='text-[10px] font-mono px-1 py-0'
                                  >
                                    KEGIATAN
                                  </Badge>
                                </td>
                                <td className='py-2 px-3 pl-8'>
                                  <div className='flex items-center gap-2'>
                                    {hasSubKegiatans ? (
                                      <button
                                        type='button'
                                        onClick={() => toggleExpand(kegiatan.id)}
                                        className='p-0.5 rounded hover:bg-muted text-muted-foreground transition-colors'
                                      >
                                        {isKegExpanded ? (
                                          <ChevronDown className='h-3.5 w-3.5' />
                                        ) : (
                                          <ChevronRight className='h-3.5 w-3.5' />
                                        )}
                                      </button>
                                    ) : (
                                      <span className='w-4 text-muted-foreground/60 text-xs'>↳</span>
                                    )}
                                    <span className='font-mono text-xs font-semibold text-muted-foreground'>
                                      {kegiatan.kode}
                                    </span>
                                    <span className='text-xs font-medium text-foreground'>
                                      {kegiatan.nama}
                                    </span>
                                  </div>
                                </td>
                                <td className='py-2 px-3'>
                                  {kegiatan.indikators && kegiatan.indikators.length > 0 ? (
                                    <div className='space-y-1'>
                                      {kegiatan.indikators.map((ind, i) => (
                                        <div key={ind.id || i} className='text-xs text-foreground'>
                                          • {ind.indikator}
                                        </div>
                                      ))}
                                    </div>
                                  ) : (
                                    <span className='text-muted-foreground italic text-[11px]'>-</span>
                                  )}
                                </td>
                                <td className='py-2 px-3 text-center'>
                                  {kegiatan.indikators && kegiatan.indikators.length > 0 ? (
                                    <div className='space-y-1'>
                                      {kegiatan.indikators.map((ind, i) => (
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
                                {canEdit && (
                                  <td className='py-2 px-3 text-center'>
                                    <div className='flex items-center justify-center gap-1'>
                                      <Button
                                        type='button'
                                        variant='outline'
                                        size='icon'
                                        title='Tambah Sub-Kegiatan'
                                        onClick={() => onAddChild(kegiatan, 'sub_kegiatan')}
                                        className='h-6 w-6'
                                      >
                                        <Plus className='h-3 w-3' />
                                      </Button>
                                      <Button
                                        type='button'
                                        variant='ghost'
                                        size='icon'
                                        title='Ubah Kegiatan'
                                        onClick={() => onEditItem(kegiatan)}
                                        className='h-6 w-6 text-muted-foreground hover:text-foreground'
                                      >
                                        <Edit className='h-3 w-3' />
                                      </Button>
                                      <Button
                                        type='button'
                                        variant='ghost'
                                        size='icon'
                                        title='Hapus Kegiatan'
                                        onClick={() => setDeleteTarget(kegiatan)}
                                        className='h-6 w-6 text-muted-foreground hover:text-destructive'
                                      >
                                        <Trash2 className='h-3 w-3' />
                                      </Button>
                                    </div>
                                  </td>
                                )}
                              </tr>

                              {/* SUB-KEGIATAN ROWS (LEVEL 3) */}
                              {isKegExpanded &&
                                kegiatan.children?.map((subKegiatan) => (
                                  <tr
                                    key={subKegiatan.id}
                                    className='bg-muted/20 hover:bg-muted/40 transition-colors'
                                  >
                                    <td className='py-1.5 px-3 text-center'>
                                      <Badge
                                        variant='outline'
                                        className='text-[9px] font-mono px-1 py-0 text-muted-foreground'
                                      >
                                        SUB
                                      </Badge>
                                    </td>
                                    <td className='py-1.5 px-3 pl-16'>
                                      <div className='flex items-center gap-2'>
                                        <span className='text-muted-foreground/60 text-xs'>↳</span>
                                        <span className='font-mono text-[11px] text-muted-foreground'>
                                          {subKegiatan.kode}
                                        </span>
                                        <span className='text-xs text-foreground/90'>
                                          {subKegiatan.nama}
                                        </span>
                                      </div>
                                    </td>
                                    <td className='py-1.5 px-3'>
                                      {subKegiatan.indikators &&
                                      subKegiatan.indikators.length > 0 ? (
                                        <div className='space-y-0.5'>
                                          {subKegiatan.indikators.map((ind, i) => (
                                            <div
                                              key={ind.id || i}
                                              className='text-[11px] text-foreground'
                                            >
                                              • {ind.indikator}
                                            </div>
                                          ))}
                                        </div>
                                      ) : (
                                        <span className='text-muted-foreground italic text-[11px]'>
                                          -
                                        </span>
                                      )}
                                    </td>
                                    <td className='py-1.5 px-3 text-center'>
                                      {subKegiatan.indikators &&
                                      subKegiatan.indikators.length > 0 ? (
                                        <div className='space-y-0.5'>
                                          {subKegiatan.indikators.map((ind, i) => (
                                            <Badge
                                              key={ind.id || i}
                                              variant='outline'
                                              className='text-[9px] font-mono'
                                            >
                                              {ind.target} {ind.satuan || ''}
                                            </Badge>
                                          ))}
                                        </div>
                                      ) : (
                                        <span className='text-muted-foreground italic text-[11px]'>
                                          -
                                        </span>
                                      )}
                                    </td>
                                    {canEdit && (
                                      <td className='py-1.5 px-3 text-center'>
                                        <div className='flex items-center justify-center gap-1'>
                                          <Button
                                            type='button'
                                            variant='ghost'
                                            size='icon'
                                            title='Ubah Sub-Kegiatan'
                                            onClick={() => onEditItem(subKegiatan)}
                                            className='h-6 w-6 text-muted-foreground hover:text-foreground'
                                          >
                                            <Edit className='h-3 w-3' />
                                          </Button>
                                          <Button
                                            type='button'
                                            variant='ghost'
                                            size='icon'
                                            title='Hapus Sub-Kegiatan'
                                            onClick={() => setDeleteTarget(subKegiatan)}
                                            className='h-6 w-6 text-muted-foreground hover:text-destructive'
                                          >
                                            <Trash2 className='h-3 w-3' />
                                          </Button>
                                        </div>
                                      </td>
                                    )}
                                  </tr>
                                ))}
                            </Fragment>
                          )
                        })}
                    </Fragment>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title={`Hapus ${deleteTarget ? getItemLabel(deleteTarget.jenis) : 'Item'}`}
        desc={
          deleteTarget?.jenis === 'program'
            ? `Apakah Anda yakin ingin menghapus Program "${deleteTarget.nama}"? Seluruh Kegiatan dan Sub-Kegiatan di bawahnya akan ikut terhapus.`
            : deleteTarget?.jenis === 'kegiatan'
            ? `Apakah Anda yakin ingin menghapus Kegiatan "${deleteTarget.nama}"? Seluruh Sub-Kegiatan di bawahnya akan ikut terhapus.`
            : `Apakah Anda yakin ingin menghapus Sub-Kegiatan "${deleteTarget?.nama}"?`
        }
        confirmText='Ya, Hapus'
        destructive
        isLoading={isDeleting}
        handleConfirm={handleDelete}
      />
    </div>
  )
}
