import { useEffect, useRef } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { toast } from 'sonner'
import { useAuthStore } from '@/stores/auth-store'
import { useAppConfig } from '@/hooks/use-app-config'

/**
 * Global inactivity timeout hook that enforces automatic logout
 * when a user is inactive for the duration configured in system_settings.
 */
export function useInactivityTimeout() {
  const navigate = useNavigate()
  const { accessToken, reset } = useAuthStore((state) => state.auth)
  const { sessionLifetimeMinutes } = useAppConfig()

  const lastActivityRef = useRef<number>(0)
  const hasLoggedOutRef = useRef<boolean>(false)

  useEffect(() => {
    // Only track inactivity for authenticated users
    if (!accessToken) {
      return
    }

    hasLoggedOutRef.current = false
    lastActivityRef.current = Date.now()

    const timeoutMs = (sessionLifetimeMinutes || 60) * 60 * 1000

    // Throttle user activity updates to avoid unnecessary ref writes
    let lastThrottledTime = Date.now()
    const handleUserActivity = () => {
      const now = Date.now()
      if (now - lastThrottledTime > 5000) {
        lastActivityRef.current = now
        lastThrottledTime = now
      }
    }

    const activityEvents = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart', 'click']
    activityEvents.forEach((event) => {
      window.addEventListener(event, handleUserActivity, { passive: true })
    })

    // Periodic check every 10 seconds
    const interval = setInterval(() => {
      if (hasLoggedOutRef.current) {
        return
      }

      const idleDuration = Date.now() - lastActivityRef.current

      if (idleDuration >= timeoutMs) {
        hasLoggedOutRef.current = true
        reset()
        toast.error(
          `Sesi Anda telah berakhir karena tidak ada aktivitas selama ${sessionLifetimeMinutes} menit. Silakan masuk kembali.`
        )
        navigate({ to: '/sign-in' })
      }
    }, 10000)

    return () => {
      activityEvents.forEach((event) => {
        window.removeEventListener(event, handleUserActivity)
      })
      clearInterval(interval)
    }
  }, [accessToken, sessionLifetimeMinutes, reset, navigate])
}
