import { FolderTree, Plus } from 'lucide-react'
import type {
  KonteksOperasionalItemJenis,
  KonteksOperasionalItemNode,
} from '@/types/risiko'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/confirm-dialog'
import {
  useOperasionalTreeState,
  getItemLabel,
  OperasionalTreeToolbar,
  ProgramTreeRow,
} from './tree'

export * from './tree'

export interface OperasionalTreeTableProps {
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
  const {
    searchQuery,
    setSearchQuery,
    collapsedPrograms,
    toggleCollapseProgram,
    collapsedKegiatans,
    toggleCollapseKegiatan,
    allExpanded,
    handleToggleAll,
    deleteTarget,
    setDeleteTarget,
    isDeleting,
    handleDelete,
    handleMoveProgram,
    handleMoveKegiatan,
    handleMoveSubKegiatan,
    filteredPrograms,
    summary,
  } = useOperasionalTreeState({
    konteksId,
    programs,
    onRefetch,
  })

  return (
    <div className='space-y-4'>
      {/* TOOLBAR */}
      <OperasionalTreeToolbar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        summary={summary}
        hasPrograms={programs.length > 0}
        allExpanded={allExpanded}
        onToggleAll={handleToggleAll}
        canEdit={canEdit}
        onAddProgram={onAddProgram}
      />

      {/* CASCADING POHON KINERJA BUILDER (PROGRAM -> KEGIATAN -> SUB KEGIATAN) */}
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
          {filteredPrograms.map((program, progIdx) => (
            <ProgramTreeRow
              key={program.id}
              program={program}
              progIdx={progIdx}
              totalPrograms={programs.length}
              isProgCollapsed={Boolean(collapsedPrograms[program.id])}
              collapsedKegiatans={collapsedKegiatans}
              canEdit={canEdit}
              onToggleCollapse={() => toggleCollapseProgram(program.id)}
              onToggleCollapseKegiatan={toggleCollapseKegiatan}
              onMoveUp={() => handleMoveProgram(progIdx, 'up')}
              onMoveDown={() => handleMoveProgram(progIdx, 'down')}
              onAddChild={onAddChild}
              onEdit={onEditItem}
              onDelete={setDeleteTarget}
              onMoveKegiatan={handleMoveKegiatan}
              onMoveSubKegiatan={handleMoveSubKegiatan}
            />
          ))}
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
