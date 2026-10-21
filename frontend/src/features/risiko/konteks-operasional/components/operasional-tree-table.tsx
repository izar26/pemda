import { useEffect, useMemo, useState } from 'react'
import { isAxiosError } from 'axios'
import {
  ArrowDown,
  ArrowUp,
  ChevronDown,
  ChevronRight,
  FolderTree,
  Pencil,
  Plus,
  Search,
  Target,
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
  onAddChild: (
    parent: KonteksOperasionalItemNode,
    targetJenis: KonteksOperasionalItemJenis
  ) => void
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
  const [collapsedPrograms, setCollapsedPrograms] = useState<Record<string, boolean>>({})
  const [collapsedKegiatans, setCollapsedKegiatans] = useState<Record<string, boolean>>({})
  const [deleteTarget, setDeleteTarget] = useState<KonteksOperasionalItemNode | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  // Auto-expand all matching nodes when user types in search
  useEffect(() => {
    if (searchQuery.trim()) {
      setCollapsedPrograms({})
      setCollapsedKegiatans({})
    }
  }, [searchQuery])

  function toggleCollapseProgram(id: string) {
    setCollapsedPrograms((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  function toggleCollapseKegiatan(id: string) {
    setCollapsedKegiatans((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  const allExpanded = useMemo(() => {
    if (programs.length === 0) return true
    const anyProgCollapsed = programs.some((p) => Boolean(collapsedPrograms[p.id]))
    const anyKegCollapsed = programs.some((p) =>
      p.children?.some((k) => Boolean(collapsedKegiatans[k.id]))
    )
    return !anyProgCollapsed && !anyKegCollapsed
  }, [programs, collapsedPrograms, collapsedKegiatans])

  function handleToggleAll() {
    if (allExpanded) {
      const nextProg: Record<string, boolean> = {}
      const nextKeg: Record<string, boolean> = {}
      programs.forEach((p) => {
        nextProg[p.id] = true
        p.children?.forEach((k) => {
          nextKeg[k.id] = true
        })
      })
      setCollapsedPrograms(nextProg)
      setCollapsedKegiatans(nextKeg)
    } else {
      setCollapsedPrograms({})
      setCollapsedKegiatans({})
    }
  }

  function getItemLabel(jenis: KonteksOperasionalItemJenis) {
    switch (jenis) {
      case 'program':
        return 'Program'
      case 'kegiatan':
        return 'Kegiatan'
      case 'sub_kegiatan':
        return 'Sub Kegiatan'
    }
  }

  async function handleReorder(siblingIds: string[]) {
    try {
      await risikoService.reorderKonteksOperasionalItems(konteksId, siblingIds)
      toast.success('Urutan operasional berhasil disesuaikan.')
      onRefetch()
    } catch (error: unknown) {
      if (isAxiosError(error) && error.response?.data?.message) {
        toast.error(error.response.data.message)
      } else {
        toast.error('Gagal memperbarui urutan operasional.')
      }
    }
  }

  function handleMoveProgram(index: number, direction: 'up' | 'down') {
    const targetIdx = direction === 'up' ? index - 1 : index + 1
    if (targetIdx < 0 || targetIdx >= programs.length) return

    const newIds = programs.map((p) => p.id)
    const temp = newIds[index]
    newIds[index] = newIds[targetIdx]
    newIds[targetIdx] = temp
    handleReorder(newIds)
  }

  function handleMoveKegiatan(
    program: KonteksOperasionalItemNode,
    index: number,
    direction: 'up' | 'down'
  ) {
    const siblings = program.children || []
    const targetIdx = direction === 'up' ? index - 1 : index + 1
    if (targetIdx < 0 || targetIdx >= siblings.length) return

    const newIds = siblings.map((k) => k.id)
    const temp = newIds[index]
    newIds[index] = newIds[targetIdx]
    newIds[targetIdx] = temp
    handleReorder(newIds)
  }

  function handleMoveSubKegiatan(
    kegiatan: KonteksOperasionalItemNode,
    index: number,
    direction: 'up' | 'down'
  ) {
    const siblings = kegiatan.children || []
    const targetIdx = direction === 'up' ? index - 1 : index + 1
    if (targetIdx < 0 || targetIdx >= siblings.length) return

    const newIds = siblings.map((s) => s.id)
    const temp = newIds[index]
    newIds[index] = newIds[targetIdx]
    newIds[targetIdx] = temp
    handleReorder(newIds)
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setIsDeleting(true)
    try {
      await risikoService.deleteKonteksOperasionalItem(konteksId, deleteTarget.id)
      toast.success(
        `${getItemLabel(deleteTarget.jenis)} (${deleteTarget.kode}) berhasil dihapus dan penomoran disesuaikan.`
      )
      setDeleteTarget(null)
      onRefetch()
    } catch (error: unknown) {
      if (isAxiosError(error) && error.response?.data?.message) {
        toast.error(error.response.data.message)
      } else {
        toast.error('Gagal menghapus rincian operasional.')
      }
    } finally {
      setIsDeleting(false)
    }
  }

  const filteredPrograms = useMemo(() => {
    if (!searchQuery.trim()) return programs
    const q = searchQuery.toLowerCase()

    return programs
      .map((prog) => {
        const progMatches =
          prog.kode.toLowerCase().includes(q) ||
          prog.nama.toLowerCase().includes(q) ||
          prog.indikators?.some((ind) =>
            ind.indikator.toLowerCase().includes(q)
          )

        const filteredKegiatans =
          (prog.children
            ?.map((keg) => {
              const kegMatches =
                keg.kode.toLowerCase().includes(q) ||
                keg.nama.toLowerCase().includes(q) ||
                keg.indikators?.some((ind) =>
                  ind.indikator.toLowerCase().includes(q)
                )

              const filteredSub =
                keg.children?.filter((sub) => {
                  return (
                    sub.kode.toLowerCase().includes(q) ||
                    sub.nama.toLowerCase().includes(q) ||
                    sub.indikators?.some((ind) =>
                      ind.indikator.toLowerCase().includes(q)
                    )
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
            .filter(Boolean) as KonteksOperasionalItemNode[]) || []

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

  const summary = useMemo(() => {
    let totalKeg = 0
    let totalSub = 0

    programs.forEach((p) => {
      p.children?.forEach((k) => {
        totalKeg++
        k.children?.forEach(() => {
          totalSub++
        })
      })
    })

    return {
      progCount: programs.length,
      kegCount: totalKeg,
      subCount: totalSub,
    }
  }, [programs])

  return (
    <div className='space-y-4'>
      {/* TOOLBAR */}
      <div className='flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3'>
        <div className='relative flex-1 max-w-md'>
          <Search className='absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground' />
          <Input
            type='search'
            placeholder='Cari kode NO, nama program, kegiatan, sub kegiatan, atau indikator...'
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className='pl-8 text-xs h-9 bg-background'
          />
        </div>

        <div className='flex items-center gap-2 shrink-0 flex-wrap'>
          <div className='flex items-center gap-1.5 text-xs text-muted-foreground mr-1 flex-wrap'>
            <Badge variant='outline' className='text-[10px] font-mono'>
              {summary.progCount} Program
            </Badge>
            <Badge variant='outline' className='text-[10px] font-mono'>
              {summary.kegCount} Kegiatan
            </Badge>
            <Badge variant='outline' className='text-[10px] font-mono'>
              {summary.subCount} Sub Kegiatan
            </Badge>
          </div>

          {programs.length > 0 && (
            <Button
              type='button'
              variant='outline'
              size='sm'
              onClick={handleToggleAll}
              className='h-8 text-xs'
            >
              {allExpanded ? 'Tutup Semua' : 'Buka Semua'}
            </Button>
          )}

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

      {/* CASCADING POHON KINERJA BUILDER (MIRRORING TUJUAN, SASARAN & INDIKATOR) */}
      {filteredPrograms.length === 0 ? (
        <div className='rounded-xl border border-dashed bg-card/60 p-12 text-center text-muted-foreground shadow-2xs'>
          <div className='flex flex-col items-center justify-center gap-2 max-w-md mx-auto'>
            <div className='flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary'>
              <FolderTree className='h-6 w-6' />
            </div>
            <p className='text-sm font-semibold text-foreground mt-1'>
              {searchQuery
                ? 'Tidak ada rincian yang cocok dengan pencarian.'
                : 'Belum ada Program, Kegiatan, atau Sub Kegiatan yang diinput.'}
            </p>
            <p className='text-xs text-muted-foreground text-center leading-relaxed'>
              {searchQuery
                ? 'Coba gunakan kata kunci lain untuk mencari nomor kode, nama program, kegiatan, atau indikator kinerja.'
                : 'Mulai dengan menambahkan Program pertama (A). Setiap program dapat memiliki Kegiatan (A.1) dan Sub-Kegiatan (A.1.1) di bawahnya.'}
            </p>
            {canEdit && !searchQuery && (
              <Button
                type='button'
                size='sm'
                onClick={onAddProgram}
                className='mt-2 text-xs gap-1.5 shadow-2xs'
              >
                <Plus className='h-3.5 w-3.5' />
                <span>Tambah Program Pertama (A)</span>
              </Button>
            )}
          </div>
        </div>
      ) : (
        <div className='space-y-3.5'>
          {filteredPrograms.map((program, progIdx) => {
            const isProgCollapsed = Boolean(collapsedPrograms[program.id])
            const childKegiatans = program.children || []
            const hasKegiatans = childKegiatans.length > 0

            return (
              <div
                key={program.id}
                className='rounded-xl border bg-card shadow-xs transition-all overflow-hidden hover:border-primary/30'
              >
                {/* Level 1 Header: Program */}
                <div className='flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-3.5 bg-gradient-to-r from-primary/[0.04] via-transparent to-transparent'>
                  <div className='flex items-start gap-2.5 min-w-0 flex-1'>
                    {/* Reorder Buttons for Program */}
                    {canEdit && programs.length > 1 && (
                      <div className='flex flex-col pt-0.5 shrink-0'>
                        <button
                          type='button'
                          disabled={progIdx === 0}
                          onClick={() => handleMoveProgram(progIdx, 'up')}
                          title='Geser Program ke atas'
                          className='text-muted-foreground hover:text-primary disabled:opacity-25 p-0.5'
                        >
                          <ArrowUp className='h-2.5 w-2.5' />
                        </button>
                        <button
                          type='button'
                          disabled={progIdx === programs.length - 1}
                          onClick={() => handleMoveProgram(progIdx, 'down')}
                          title='Geser Program ke bawah'
                          className='text-muted-foreground hover:text-primary disabled:opacity-25 p-0.5'
                        >
                          <ArrowDown className='h-2.5 w-2.5' />
                        </button>
                      </div>
                    )}

                    {/* Expand / Collapse Button */}
                    <button
                      type='button'
                      onClick={() => toggleCollapseProgram(program.id)}
                      className='mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md border bg-background hover:bg-muted text-muted-foreground hover:text-foreground transition-colors'
                      title={isProgCollapsed ? 'Buka Kegiatan' : 'Tutup Kegiatan'}
                    >
                      {isProgCollapsed ? (
                        <ChevronRight className='h-3.5 w-3.5' />
                      ) : (
                        <ChevronDown className='h-3.5 w-3.5' />
                      )}
                    </button>

                    {/* Number Badge (A, B, C...) */}
                    <div className='mt-0.5 flex h-6 min-w-6 px-1.5 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground text-xs font-bold font-mono'>
                      {program.kode}
                    </div>

                    {/* Program Content */}
                    <div className='space-y-1.5 min-w-0 flex-1'>
                      <div className='flex items-start gap-2'>
                        <span className='inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-primary bg-primary/10 px-1.5 py-0.5 rounded shrink-0 mt-0.5'>
                          <FolderTree className='h-2.5 w-2.5' />
                          Program
                        </span>
                        <p className='text-sm font-semibold text-foreground leading-relaxed break-words flex-1'>
                          {program.nama}
                        </p>
                        <Badge variant='outline' className='text-[10px] text-muted-foreground shrink-0'>
                          {childKegiatans.length} Kegiatan
                        </Badge>
                      </div>

                      {/* Indikator & Target Program */}
                      {program.indikators?.[0] && (
                        <div className='pt-0.5'>
                          <div className='flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 rounded-md border border-primary/20 bg-primary/[0.04] px-2.5 py-1 text-xs'>
                            <div className='flex items-start gap-1.5 min-w-0 flex-1'>
                              <Target className='h-3.5 w-3.5 text-primary shrink-0 mt-0.5' />
                              <span className='text-[11px] text-muted-foreground leading-relaxed break-words'>
                                <strong className='font-medium text-foreground mr-1'>Indikator:</strong>
                                {program.indikators[0].indikator}
                              </span>
                            </div>
                            <div className='flex items-center gap-1.5 shrink-0 self-start sm:self-center pl-4 sm:pl-0'>
                              <span className='text-[10px] text-muted-foreground font-semibold'>Target:</span>
                              <Badge
                                variant='secondary'
                                className='font-mono font-bold text-xs h-5 px-2 text-primary bg-primary/15 border-primary/20'
                              >
                                {program.indikators[0].target}
                              </Badge>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Level 1 Actions */}
                  <div className='flex items-center gap-1.5 shrink-0 self-end sm:self-start sm:pt-0.5'>
                    {canEdit && (
                      <Button
                        type='button'
                        variant='outline'
                        size='sm'
                        title='Tambah Kegiatan di bawah Program ini'
                        onClick={() => {
                          setCollapsedPrograms((prev) => ({ ...prev, [program.id]: false }))
                          onAddChild(program, 'kegiatan')
                        }}
                        className='h-7 px-2.5 text-xs border-primary/30 text-primary hover:bg-primary/10'
                      >
                        <Plus className='h-3.5 w-3.5 mr-1' />
                        Kegiatan
                      </Button>
                    )}

                    {canEdit && (
                      <Button
                        type='button'
                        variant='ghost'
                        size='icon'
                        title='Ubah Program'
                        onClick={() => onEditItem(program)}
                        className='h-7 w-7 text-muted-foreground hover:text-foreground'
                      >
                        <Pencil className='h-3.5 w-3.5' />
                      </Button>
                    )}

                    {canEdit && (
                      <Button
                        type='button'
                        variant='ghost'
                        size='icon'
                        disabled={hasKegiatans}
                        title={
                          hasKegiatans
                            ? `Tidak dapat dihapus: masih memiliki ${childKegiatans.length} Kegiatan di bawahnya. Bersihkan data dari bawah terlebih dahulu.`
                            : 'Hapus Program'
                        }
                        onClick={() => setDeleteTarget(program)}
                        className='h-7 w-7 text-muted-foreground hover:text-destructive disabled:opacity-30 disabled:cursor-not-allowed'
                      >
                        <Trash2 className='h-3.5 w-3.5' />
                      </Button>
                    )}
                  </div>
                </div>

                {/* LEVEL 2: DAFTAR KEGIATAN */}
                {!isProgCollapsed && (
                  <div className='border-t bg-muted/[0.12] px-3 py-3 sm:px-4 sm:pl-8 space-y-2.5'>
                    {childKegiatans.length === 0 ? (
                      <div className='flex items-center justify-between rounded-lg border border-dashed bg-background/60 px-3.5 py-2.5 text-xs text-muted-foreground'>
                        <span>Belum ada Kegiatan pada program ini.</span>
                        {canEdit && (
                          <Button
                            type='button'
                            variant='ghost'
                            size='sm'
                            className='h-7 text-xs text-primary hover:text-primary'
                            onClick={() => onAddChild(program, 'kegiatan')}
                          >
                            <Plus className='h-3 w-3 mr-1' />
                            Tambah Kegiatan
                          </Button>
                        )}
                      </div>
                    ) : (
                      childKegiatans.map((kegiatan, kegIdx) => {
                        const isKegCollapsed = Boolean(collapsedKegiatans[kegiatan.id])
                        const childSubKegiatans = kegiatan.children || []
                        const hasSubKegiatans = childSubKegiatans.length > 0

                        return (
                          <div
                            key={kegiatan.id}
                            className='rounded-lg border bg-background hover:border-emerald-500/40 transition-all overflow-hidden border-l-4 border-l-emerald-500/70'
                          >
                            {/* Header Kegiatan */}
                            <div className='flex flex-col sm:flex-row sm:items-start justify-between gap-2.5 px-3.5 py-2.5'>
                              <div className='flex items-start gap-2 min-w-0 flex-1'>
                                {/* Reorder Buttons for Kegiatan */}
                                {canEdit && childKegiatans.length > 1 && (
                                  <div className='flex flex-col pt-0.5 shrink-0'>
                                    <button
                                      type='button'
                                      disabled={kegIdx === 0}
                                      onClick={() => handleMoveKegiatan(program, kegIdx, 'up')}
                                      title='Geser Kegiatan ke atas'
                                      className='text-muted-foreground hover:text-primary disabled:opacity-25 p-0.5'
                                    >
                                      <ArrowUp className='h-2.5 w-2.5' />
                                    </button>
                                    <button
                                      type='button'
                                      disabled={kegIdx === childKegiatans.length - 1}
                                      onClick={() => handleMoveKegiatan(program, kegIdx, 'down')}
                                      title='Geser Kegiatan ke bawah'
                                      className='text-muted-foreground hover:text-primary disabled:opacity-25 p-0.5'
                                    >
                                      <ArrowDown className='h-2.5 w-2.5' />
                                    </button>
                                  </div>
                                )}

                                {/* Expand / Collapse Button */}
                                <button
                                  type='button'
                                  onClick={() => toggleCollapseKegiatan(kegiatan.id)}
                                  className='mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border bg-muted/40 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors'
                                  title={isKegCollapsed ? 'Buka Sub Kegiatan' : 'Tutup Sub Kegiatan'}
                                >
                                  {isKegCollapsed ? (
                                    <ChevronRight className='h-3 w-3' />
                                  ) : (
                                    <ChevronDown className='h-3 w-3' />
                                  )}
                                </button>

                                {/* Code Badge (A.1, A.2...) */}
                                <span className='mt-0.5 inline-flex items-center justify-center rounded bg-muted px-1.5 py-0.5 text-[11px] font-mono font-semibold text-foreground shrink-0'>
                                  {kegiatan.kode}
                                </span>

                                {/* Kegiatan Content */}
                                <div className='space-y-1.5 min-w-0 flex-1'>
                                  <div className='flex items-start gap-2'>
                                    <span className='inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 px-1.5 py-0.5 rounded shrink-0 mt-0.5'>
                                      <Target className='h-2.5 w-2.5' />
                                      Kegiatan
                                    </span>
                                    <p className='text-xs sm:text-sm font-semibold text-foreground leading-relaxed break-words flex-1'>
                                      {kegiatan.nama}
                                    </p>
                                    <Badge variant='outline' className='text-[10px] text-muted-foreground shrink-0'>
                                      {childSubKegiatans.length} Sub Kegiatan
                                    </Badge>
                                  </div>

                                  {/* Indikator & Target Kegiatan */}
                                  {kegiatan.indikators?.[0] && (
                                    <div className='pt-0.5'>
                                      <div className='flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 rounded-md border border-emerald-500/20 bg-emerald-500/[0.04] px-2.5 py-1 text-xs'>
                                        <div className='flex items-start gap-1.5 min-w-0 flex-1'>
                                          <Target className='h-3 w-3 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5' />
                                          <span className='text-[11px] text-muted-foreground leading-relaxed break-words'>
                                            <strong className='font-medium text-foreground mr-1'>Indikator:</strong>
                                            {kegiatan.indikators[0].indikator}
                                          </span>
                                        </div>
                                        <div className='flex items-center gap-1.5 shrink-0 self-start sm:self-center pl-4 sm:pl-0'>
                                          <span className='text-[10px] text-muted-foreground font-semibold'>Target:</span>
                                          <Badge
                                            variant='outline'
                                            className='font-mono font-bold text-[10px] h-4.5 px-1.5 text-foreground bg-background border-emerald-500/30'
                                          >
                                            {kegiatan.indikators[0].target}
                                          </Badge>
                                        </div>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>

                              {/* Level 2 Actions */}
                              <div className='flex items-center gap-1 shrink-0 self-start pt-0.5'>
                                {canEdit && (
                                  <Button
                                    type='button'
                                    variant='outline'
                                    size='sm'
                                    title='Tambah Sub Kegiatan di bawah Kegiatan ini'
                                    onClick={() => {
                                      setCollapsedKegiatans((prev) => ({ ...prev, [kegiatan.id]: false }))
                                      onAddChild(kegiatan, 'sub_kegiatan')
                                    }}
                                    className='h-7 px-2 text-[11px] border-emerald-500/30 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/10'
                                  >
                                    <Plus className='h-3 w-3 mr-1' />
                                    Sub Kegiatan
                                  </Button>
                                )}

                                {canEdit && (
                                  <Button
                                    type='button'
                                    variant='ghost'
                                    size='icon'
                                    title='Ubah Kegiatan'
                                    onClick={() => onEditItem(kegiatan)}
                                    className='h-7 w-7 text-muted-foreground hover:text-foreground'
                                  >
                                    <Pencil className='h-3.5 w-3.5' />
                                  </Button>
                                )}

                                {canEdit && (
                                  <Button
                                    type='button'
                                    variant='ghost'
                                    size='icon'
                                    disabled={hasSubKegiatans}
                                    title={
                                      hasSubKegiatans
                                        ? `Tidak dapat dihapus: masih memiliki ${childSubKegiatans.length} Sub Kegiatan di bawahnya. Bersihkan data dari bawah terlebih dahulu.`
                                        : 'Hapus Kegiatan'
                                    }
                                    onClick={() => setDeleteTarget(kegiatan)}
                                    className='h-7 w-7 text-muted-foreground hover:text-destructive disabled:opacity-30 disabled:cursor-not-allowed'
                                  >
                                    <Trash2 className='h-3.5 w-3.5' />
                                  </Button>
                                )}
                              </div>
                            </div>

                            {/* LEVEL 3: DAFTAR SUB KEGIATAN */}
                            {!isKegCollapsed && (
                              <div className='border-t bg-muted/[0.18] px-2.5 py-2.5 sm:px-3 sm:pl-6 space-y-2'>
                                {childSubKegiatans.length === 0 ? (
                                  <div className='flex items-center justify-between rounded-md border border-dashed bg-background/60 px-3 py-2 text-[11px] text-muted-foreground'>
                                    <span>Belum ada Sub Kegiatan pada kegiatan ini.</span>
                                    {canEdit && (
                                      <Button
                                        type='button'
                                        variant='ghost'
                                        size='sm'
                                        className='h-6 px-2 text-[11px] text-primary hover:text-primary'
                                        onClick={() => onAddChild(kegiatan, 'sub_kegiatan')}
                                      >
                                        <Plus className='h-3 w-3 mr-1' />
                                        Tambah Sub Kegiatan
                                      </Button>
                                    )}
                                  </div>
                                ) : (
                                  childSubKegiatans.map((subKegiatan, subIdx) => {
                                    return (
                                      <div
                                        key={subKegiatan.id}
                                        className='group/sub rounded-md border bg-card hover:bg-background hover:border-sky-500/40 transition-all p-2.5 space-y-2 border-l-4 border-l-sky-500/70'
                                      >
                                        {/* Baris 1: Header Sub Kegiatan (Reorder, Kode, Label, Nama, Tombol Aksi) */}
                                        <div className='flex items-start justify-between gap-2.5'>
                                          <div className='flex items-start gap-2 min-w-0 flex-1'>
                                            {/* Reorder Buttons for Sub Kegiatan */}
                                            {canEdit && childSubKegiatans.length > 1 && (
                                              <div className='flex flex-col pt-0.5 shrink-0'>
                                                <button
                                                  type='button'
                                                  disabled={subIdx === 0}
                                                  onClick={() => handleMoveSubKegiatan(kegiatan, subIdx, 'up')}
                                                  title='Geser Sub Kegiatan ke atas'
                                                  className='text-muted-foreground hover:text-primary disabled:opacity-25 p-0.5'
                                                >
                                                  <ArrowUp className='h-2.5 w-2.5' />
                                                </button>
                                                <button
                                                  type='button'
                                                  disabled={subIdx === childSubKegiatans.length - 1}
                                                  onClick={() => handleMoveSubKegiatan(kegiatan, subIdx, 'down')}
                                                  title='Geser Sub Kegiatan ke bawah'
                                                  className='text-muted-foreground hover:text-primary disabled:opacity-25 p-0.5'
                                                >
                                                  <ArrowDown className='h-2.5 w-2.5' />
                                                </button>
                                              </div>
                                            )}

                                            {/* Code Badge (A.1.1, A.1.2...) */}
                                            <span className='mt-0.5 inline-flex items-center justify-center rounded bg-muted px-1.5 py-0.5 text-[10px] font-mono font-semibold text-foreground shrink-0'>
                                              {subKegiatan.kode}
                                            </span>

                                            <span className='inline-flex items-center text-[10px] font-bold uppercase tracking-wider text-sky-700 dark:text-sky-300 bg-sky-500/10 px-1.5 py-0.5 rounded shrink-0 mt-0.5'>
                                              Sub Kegiatan
                                            </span>

                                            {/* Nama Sub Kegiatan (Mendapat lebar penuh, tidak terhimpit lagi!) */}
                                            <p className='text-xs font-semibold text-foreground leading-relaxed break-words flex-1'>
                                              {subKegiatan.nama}
                                            </p>
                                          </div>

                                          {/* Tombol Aksi (Pin di kanan atas, tidak akan tertumpuk) */}
                                          <div className='flex items-center gap-0.5 shrink-0 self-start pt-0.5'>
                                            {canEdit && (
                                              <Button
                                                type='button'
                                                variant='ghost'
                                                size='icon'
                                                title='Ubah Sub Kegiatan'
                                                onClick={() => onEditItem(subKegiatan)}
                                                className='h-6 w-6 text-muted-foreground hover:text-foreground'
                                              >
                                                <Pencil className='h-3 w-3' />
                                              </Button>
                                            )}

                                            {canEdit && (
                                              <Button
                                                type='button'
                                                variant='ghost'
                                                size='icon'
                                                title='Hapus Sub Kegiatan'
                                                onClick={() => setDeleteTarget(subKegiatan)}
                                                className='h-6 w-6 text-muted-foreground hover:text-destructive'
                                              >
                                                <Trash2 className='h-3 w-3' />
                                              </Button>
                                            )}
                                          </div>
                                        </div>

                                        {/* Baris 2: Indikator & Target Sub Kegiatan (Dedicated full-width block) */}
                                        {subKegiatan.indikators?.[0] && (
                                          <div className='pl-0 sm:pl-7'>
                                            <div className='flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-md border border-sky-500/20 bg-sky-500/[0.04] px-2.5 py-1.5 text-xs'>
                                              <div className='flex items-start gap-1.5 min-w-0 flex-1'>
                                                <Target className='h-3.5 w-3.5 text-sky-600 dark:text-sky-400 shrink-0 mt-0.5' />
                                                <div className='text-[11px] leading-relaxed break-words min-w-0 flex-1'>
                                                  <span className='font-semibold text-foreground mr-1.5'>
                                                    Indikator Kinerja:
                                                  </span>
                                                  <span className='text-muted-foreground'>
                                                    {subKegiatan.indikators[0].indikator}
                                                  </span>
                                                </div>
                                              </div>

                                              <div className='flex items-center gap-1.5 shrink-0 self-start sm:self-center pl-5 sm:pl-0 pt-0.5 sm:pt-0'>
                                                <span className='text-[10px] uppercase font-bold text-muted-foreground tracking-wider'>
                                                  Target:
                                                </span>
                                                <Badge
                                                  variant='outline'
                                                  className='font-mono font-bold text-xs h-5 px-2 text-foreground bg-background border-sky-500/30 shadow-2xs'
                                                >
                                                  {subKegiatan.indikators[0].target}
                                                </Badge>
                                              </div>
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    )
                                  })
                                )}
                              </div>
                            )}
                          </div>
                        )
                      })
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* CONFIRM DELETE DIALOG */}
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title={`Hapus ${deleteTarget ? getItemLabel(deleteTarget.jenis) : 'Item'} (${deleteTarget?.kode || ''})`}
        desc={
          deleteTarget?.jenis === 'program'
            ? `Apakah Anda yakin ingin menghapus Program "${deleteTarget.nama}" (${deleteTarget.kode})? Pastikan seluruh Kegiatan di bawahnya sudah dibersihkan terlebih dahulu dari bawah.`
            : deleteTarget?.jenis === 'kegiatan'
            ? `Apakah Anda yakin ingin menghapus Kegiatan "${deleteTarget.nama}" (${deleteTarget.kode})? Pastikan seluruh Sub Kegiatan di bawahnya sudah dibersihkan terlebih dahulu dari bawah.`
            : `Apakah Anda yakin ingin menghapus Sub Kegiatan "${deleteTarget?.nama}" (${deleteTarget?.kode})?`
        }
        confirmText='Ya, Hapus'
        destructive
        isLoading={isDeleting}
        handleConfirm={handleDelete}
      />
    </div>
  )
}
