import { AxiosError } from 'axios'
import { toast } from 'sonner'

export function handleServerError(error: unknown) {
  if (import.meta.env.DEV) {
    // eslint-disable-next-line no-console
    console.log(error)
  }

  // Ignore canceled/aborted requests
  if (
    (error as { code?: string; name?: string })?.code === 'ERR_CANCELED' ||
    (error as { name?: string })?.name === 'CanceledError' ||
    (error as { name?: string })?.name === 'AbortError'
  ) {
    return
  }

  let errMsg = 'Something went wrong!'

  if (
    error &&
    typeof error === 'object' &&
    'status' in error &&
    Number(error.status) === 204
  ) {
    errMsg = 'No content.'
  }

  if (error instanceof AxiosError) {
    if (error.code === 'ERR_CANCELED' || error.name === 'CanceledError') {
      return
    }

    const data = error.response?.data
    if (data && typeof data === 'object') {
      const title = (data as { title?: unknown }).title
      const message = (data as { message?: unknown }).message
      const errors = (data as { errors?: Record<string, string[] | string> }).errors
      const err = (data as { error?: unknown }).error

      if (typeof title === 'string' && title.trim().length > 0) {
        errMsg = title
      } else if (errors && typeof errors === 'object' && Object.keys(errors).length > 0) {
        const firstVal = Object.values(errors)[0]
        if (Array.isArray(firstVal) && firstVal.length > 0 && typeof firstVal[0] === 'string') {
          errMsg = firstVal[0]
        } else if (typeof firstVal === 'string') {
          errMsg = firstVal
        }
      } else if (typeof message === 'string' && message.trim().length > 0) {
        errMsg = message
      } else if (typeof err === 'string' && err.trim().length > 0) {
        errMsg = err
      }
    }
  }

  toast.error(errMsg)
}
