import { useEffect, useRef } from 'react'

declare global {
  interface Window {
    turnstile?: {
      render: (
        container: string | HTMLElement,
        options: {
          sitekey: string
          action?: string
          theme?: 'light' | 'dark' | 'auto'
          callback?: (token: string) => void
          'error-callback'?: () => void
          'expired-callback'?: () => void
        }
      ) => string
      reset: (widgetId?: string) => void
      remove: (widgetId?: string) => void
    }
    onloadTurnstileCallback?: () => void
  }
}

export interface TurnstileWidgetRef {
  reset: () => void
}

interface TurnstileWidgetProps {
  siteKey: string
  action?: string
  theme?: 'light' | 'dark' | 'auto'
  onSuccess: (token: string) => void
  onError?: () => void
  onExpire?: () => void
  className?: string
}

const SCRIPT_URL = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'

export function TurnstileWidget({
  siteKey,
  action = 'login',
  theme = 'auto',
  onSuccess,
  onError,
  onExpire,
  className,
}: TurnstileWidgetProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const widgetIdRef = useRef<string | null>(null)

  useEffect(() => {
    let isMounted = true

    const renderWidget = () => {
      if (!isMounted || !containerRef.current || !window.turnstile) return

      // Clean up previous widget instance if exists
      if (widgetIdRef.current) {
        try {
          window.turnstile.remove(widgetIdRef.current)
        } catch {
          // ignore
        }
        widgetIdRef.current = null
      }

      try {
        widgetIdRef.current = window.turnstile.render(containerRef.current, {
          sitekey: siteKey,
          action,
          theme,
          callback: (token: string) => {
            if (isMounted) onSuccess(token)
          },
          'error-callback': () => {
            if (isMounted && onError) onError()
          },
          'expired-callback': () => {
            if (isMounted && onExpire) onExpire()
          },
        })
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('Turnstile render error:', err)
      }
    }

    if (window.turnstile) {
      renderWidget()
    } else {
      // Check if script is already added
      let script = document.querySelector<HTMLScriptElement>(`script[src^="https://challenges.cloudflare.com/turnstile/v0/api.js"]`)
      if (!script) {
        script = document.createElement('script')
        script.src = SCRIPT_URL
        script.async = true
        script.defer = true
        document.head.appendChild(script)
      }

      const checkInterval = setInterval(() => {
        if (window.turnstile) {
          clearInterval(checkInterval)
          renderWidget()
        }
      }, 50)

      return () => {
        clearInterval(checkInterval)
        isMounted = false
        if (widgetIdRef.current && window.turnstile) {
          try {
            window.turnstile.remove(widgetIdRef.current)
          } catch {
            // ignore
          }
        }
      }
    }

    return () => {
      isMounted = false
      if (widgetIdRef.current && window.turnstile) {
        try {
          window.turnstile.remove(widgetIdRef.current)
        } catch {
          // ignore
        }
      }
    }
  }, [siteKey, action, theme, onSuccess, onError, onExpire])

  return <div ref={containerRef} className={className} />
}
