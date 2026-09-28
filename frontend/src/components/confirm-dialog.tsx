import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'

type ConfirmDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: React.ReactNode
  disabled?: boolean
  desc: React.JSX.Element | string
  cancelBtnText?: string
  confirmText?: React.ReactNode
  destructive?: boolean
  isLoading?: boolean
  showConfirmBtn?: boolean
  className?: string
  children?: React.ReactNode
} & (
  | { form: string; handleConfirm?: undefined }
  | { form?: undefined; handleConfirm?: () => void }
)

export function ConfirmDialog(props: ConfirmDialogProps) {
  const {
    title,
    desc,
    children,
    className,
    confirmText,
    cancelBtnText,
    destructive,
    isLoading,
    showConfirmBtn = true,
    disabled = false,
    form,
    handleConfirm,
    ...actions
  } = props

  return (
    <AlertDialog {...actions}>
      <AlertDialogContent className={cn('sm:max-w-md', className)}>
        <AlertDialogHeader className='text-start'>
          <AlertDialogTitle className='text-base font-bold'>{title}</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className='text-xs leading-relaxed text-muted-foreground'>{desc}</div>
          </AlertDialogDescription>
        </AlertDialogHeader>

        {children}

        <AlertDialogFooter className='pt-2'>
          <AlertDialogCancel disabled={isLoading}>
            {cancelBtnText ?? 'Batal'}
          </AlertDialogCancel>
          {showConfirmBtn && (
            <Button
              type={form ? 'submit' : 'button'}
              form={form}
              onClick={handleConfirm}
              variant={destructive ? 'destructive' : 'default'}
              disabled={disabled || isLoading}
            >
              {isLoading && <Loader2 className='mr-2 h-4 w-4 animate-spin' />}
              {confirmText ?? 'Lanjutkan'}
            </Button>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
