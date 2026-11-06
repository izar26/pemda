import type { PeriodePenilaianItem } from '@/types/perencanaan'
import { usePeriode } from './periode-provider'
import {
  PeriodeActionDialog,
  PeriodeActivateDialog,
  PeriodeSwitchYearDialog,
  PeriodeDeleteDialog,
} from './dialogs'

export * from './dialogs'

export function PeriodeDialogs({
  activeWithRisk,
  onSuccess,
}: {
  activeWithRisk?: PeriodePenilaianItem | null
  onSuccess: () => void
}) {
  const { open, setOpen, currentRow, setCurrentRow, targetYear, setTargetYear } = usePeriode()

  const handleClose = () => {
    setOpen(null)
    setTimeout(() => {
      setCurrentRow(null)
      setTargetYear(null)
    }, 300)
  }

  return (
    <>
      <PeriodeActionDialog
        key='periode-add'
        open={open === 'create'}
        onOpenChange={(val) => {
          if (!val) handleClose()
        }}
        activeWithRisk={activeWithRisk}
        onSuccess={() => {
          onSuccess()
          handleClose()
        }}
      />

      {currentRow && (
        <>
          <PeriodeActionDialog
            key={`periode-edit-${currentRow.id}`}
            open={open === 'edit'}
            onOpenChange={(val) => {
              if (!val) handleClose()
            }}
            currentRow={currentRow}
            activeWithRisk={activeWithRisk}
            onSuccess={() => {
              onSuccess()
              handleClose()
            }}
          />

          <PeriodeActivateDialog
            key={`periode-activate-${currentRow.id}`}
            open={open === 'activate'}
            onOpenChange={(val) => {
              if (!val) handleClose()
            }}
            currentRow={currentRow}
            activeWithRisk={activeWithRisk}
            onSuccess={() => {
              onSuccess()
              handleClose()
            }}
          />

          {targetYear && (
            <PeriodeSwitchYearDialog
              key={`periode-switch-${currentRow.id}-${targetYear}`}
              open={open === 'switch-year'}
              onOpenChange={(val) => {
                if (!val) handleClose()
              }}
              currentRow={currentRow}
              targetYear={targetYear}
              activeWithRisk={activeWithRisk}
              onSuccess={() => {
                onSuccess()
                handleClose()
              }}
            />
          )}

          <PeriodeDeleteDialog
            key={`periode-delete-${currentRow.id}`}
            open={open === 'delete'}
            onOpenChange={(val) => {
              if (!val) handleClose()
            }}
            currentRow={currentRow}
            onSuccess={() => {
              onSuccess()
              handleClose()
            }}
          />
        </>
      )}
    </>
  )
}
