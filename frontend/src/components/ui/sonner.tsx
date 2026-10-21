import { Toaster as Sonner, ToasterProps } from 'sonner'
import { useTheme } from '@/context/theme-provider'

export function Toaster({ ...props }: ToasterProps) {
  const { theme = 'system' } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps['theme']}
      richColors
      className='toaster group [&_div[data-content]]:w-full'
      toastOptions={{
        classNames: {
          toast: 'group toast border shadow-lg font-sans text-xs sm:text-sm rounded-xl',
          title: 'font-semibold tracking-tight',
          description: 'text-xs opacity-90',
          closeButton: 'bg-background/80 hover:bg-background border text-foreground',
        },
      }}
      {...props}
    />
  )
}
