import { PegawaiActionDialog } from './pegawai-action-dialog'
import { PegawaiDeleteDialog } from './pegawai-delete-dialog'
import { usePegawai } from './pegawai-provider'

export function PegawaiDialogs() {
  const { open, setOpen, currentRow, setCurrentRow } = usePegawai()

  return (
    <>
      <PegawaiActionDialog
        key='pegawai-add'
        open={open === 'add'}
        onOpenChange={(isOpen) => {
          if (!isOpen) setOpen(null)
        }}
      />

      {currentRow && (
        <>
          <PegawaiActionDialog
            key={`pegawai-edit-${currentRow.id}`}
            open={open === 'edit'}
            onOpenChange={(isOpen) => {
              if (!isOpen) {
                setOpen(null)
                setTimeout(() => setCurrentRow(null), 300)
              }
            }}
            currentRow={currentRow}
          />

          <PegawaiDeleteDialog
            key={`pegawai-delete-${currentRow.id}`}
            open={open === 'delete'}
            onOpenChange={(isOpen) => {
              if (!isOpen) {
                setOpen(null)
                setTimeout(() => setCurrentRow(null), 300)
              }
            }}
            currentRow={currentRow}
          />
        </>
      )}
    </>
  )
}
