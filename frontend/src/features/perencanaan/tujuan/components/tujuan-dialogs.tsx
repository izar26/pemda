import { useTujuan } from './tujuan-provider'
import {
  TujuanActionDialog,
  SasaranActionDialog,
  IndikatorActionDialog,
  TujuanCopyDialog,
  TujuanDeleteDialogs,
} from './dialogs'

export * from './dialogs'

export function TujuanDialogs({
  onSuccess,
  isOpdRole = false,
}: {
  onSuccess: () => void
  isOpdRole?: boolean
}) {
  const {
    open,
    setOpen,
    currentRow,
    setCurrentRow,
    currentSasaran,
    setCurrentSasaran,
    currentIndikator,
    setCurrentIndikator,
    tableFilters,
  } = useTujuan()

  return (
    <>
      {/* Level 1: Create / Edit Tujuan */}
      <TujuanActionDialog
        open={open === 'create' || open === 'edit'}
        onOpenChange={(val) => {
          if (!val) {
            setOpen(null)
            setCurrentRow(null)
          }
        }}
        currentRow={open === 'edit' ? currentRow : null}
        defaultOpdId={tableFilters?.opd_id as string | undefined}
        onSuccess={onSuccess}
        isOpdRole={isOpdRole}
      />

      {/* Level 2: Create / Edit Sasaran */}
      <SasaranActionDialog
        open={open === 'create-sasaran' || open === 'edit-sasaran'}
        onOpenChange={(val) => {
          if (!val) {
            setOpen(null)
            setCurrentSasaran(null)
          }
        }}
        parentTujuan={currentRow}
        currentSasaran={open === 'edit-sasaran' ? currentSasaran : null}
        onSuccess={onSuccess}
      />

      {/* Level 3: Create / Edit Indikator */}
      <IndikatorActionDialog
        open={open === 'create-indikator' || open === 'edit-indikator'}
        onOpenChange={(val) => {
          if (!val) {
            setOpen(null)
            setCurrentIndikator(null)
          }
        }}
        parentSasaran={currentSasaran}
        currentIndikator={open === 'edit-indikator' ? currentIndikator : null}
        onSuccess={onSuccess}
      />

      {/* Copy from Another Period */}
      <TujuanCopyDialog
        open={open === 'copy'}
        onOpenChange={(val) => {
          if (!val) setOpen(null)
        }}
        onSuccess={onSuccess}
        isOpdRole={isOpdRole}
      />

      {/* Cascading Deletes */}
      <TujuanDeleteDialogs onSuccess={onSuccess} />
    </>
  )
}
