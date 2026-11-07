import { QueryCache, QueryClient } from '@tanstack/react-query'
import { AxiosError } from 'axios'
import { toast } from 'sonner'
import { handleServerError } from '@/lib/handle-server-error'
import { useAuthStore } from '@/stores/auth-store'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error) => {
        // eslint-disable-next-line no-console
        if (import.meta.env.DEV) console.log({ failureCount, error })

        if (failureCount >= 0 && import.meta.env.DEV) return false
        if (failureCount > 3 && import.meta.env.PROD) return false

        return !(
          error instanceof AxiosError &&
          [401, 403].includes(error.response?.status ?? 0)
        )
      },
      refetchOnWindowFocus: false,
      staleTime: 60 * 1000, // 1 minute fresh cache
      gcTime: 10 * 60 * 1000, // 10 minutes in memory
    },
    mutations: {
      onError: (error) => {
        handleServerError(error)

        if (error instanceof AxiosError) {
          if (error.response?.status === 304) {
            toast.error('Content not modified!')
          }
        }
      },
    },
  },
  queryCache: new QueryCache({
    onError: (error, query) => {
      // 1. If request was canceled/aborted or marked silent, do not display toast
      if (
        (error as { code?: string; name?: string })?.code === 'ERR_CANCELED' ||
        (error as { name?: string })?.name === 'CanceledError' ||
        (error as { name?: string })?.name === 'AbortError' ||
        (query.meta as { silent?: boolean; errorMessage?: boolean })?.silent ||
        (query.meta as { silent?: boolean; errorMessage?: boolean })?.errorMessage === false
      ) {
        return
      }

      if (error instanceof AxiosError) {
        if (error.code === 'ERR_CANCELED' || error.name === 'CanceledError') {
          return
        }

        if (error.response?.status === 401) {
          toast.error('Session expired!')
          useAuthStore.getState().auth.reset()
          queryClient.clear()
          const redirect = `${window.location.pathname}${window.location.search}`
          window.location.href = `/sign-in?redirect=${encodeURIComponent(redirect)}`
          return
        }

        // Only display 500 server error toast if query has exhausted retries or does not retry
        if (error.response?.status === 500) {
          const maxRetries =
            typeof query.options.retry === 'number'
              ? query.options.retry
              : query.options.retry === false
              ? 0
              : 3

          if (query.state.fetchFailureCount > maxRetries) {
            toast.error('Terjadi kendala pada server (500). Silakan coba beberapa saat lagi.')
          }
        }
      }
    },
  }),
})
