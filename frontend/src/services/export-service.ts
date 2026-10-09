import axios from 'axios'
import apiClient from '@/lib/api-client'
import { toast } from 'sonner'

export interface DownloadExcelOptions {
  params?: Record<string, unknown>
  fallbackFilename?: string
  signal?: AbortSignal
  onProgress?: (percent: number) => void
}

/**
 * Downloads an Excel (.xlsx) report from the backend API.
 * Supports:
 * 1. Instant Direct Streaming (OpenSpout) for small/medium datasets (<2,500 rows).
 * 2. Background Queue Processing with smart polling for massive datasets (>2,500 rows).
 * 3. AbortSignal request cancellation on page unmount.
 * 4. RFC 5987 / CORS Content-Disposition dynamic filename extraction.
 * 5. Accurate error message extraction from Blobs.
 */
export async function downloadExcelReport(
  endpoint: string,
  paramsOrOptions?: Record<string, unknown> | DownloadExcelOptions,
  fallbackFilename: string = 'Laporan_Data_PEMDA.xlsx',
  signal?: AbortSignal
): Promise<void> {
  // Normalize parameters
  let params: Record<string, unknown> | undefined
  let targetFallback = fallbackFilename
  let activeSignal = signal

  if (
    paramsOrOptions &&
    ('fallbackFilename' in paramsOrOptions ||
      'signal' in paramsOrOptions ||
      'params' in paramsOrOptions)
  ) {
    const opts = paramsOrOptions as DownloadExcelOptions
    params = opts.params
    targetFallback = opts.fallbackFilename || fallbackFilename
    activeSignal = opts.signal || signal
  } else {
    params = paramsOrOptions as Record<string, unknown> | undefined
  }

  const toastId = toast.loading('Menyiapkan & memproses dokumen Excel...')

  try {
    const response = await apiClient.get(endpoint, {
      params,
      responseType: 'blob',
      signal: activeSignal,
    })

    // Check if backend responded with a JSON queued job (Hybrid background processing)
    if (
      response.data instanceof Blob &&
      (response.data.type.includes('json') || response.status === 202)
    ) {
      try {
        const text = await response.data.text()
        const json = JSON.parse(text)
        if (json.status === 'queued' && json.job_id) {
          await pollAndDownloadAsyncJob(
            json.job_id,
            json.message || 'Dataset besar terdeteksi. Memproses di antrean latar belakang...',
            targetFallback,
            activeSignal,
            toastId
          )
          return
        }
      } catch {
        // Not a JSON queue message, proceed to treat as binary XLSX blob
      }
    }

    // Extract dynamic filename from content-disposition header if available
    let filename = targetFallback
    const disposition =
      response.headers['content-disposition'] ||
      response.headers['Content-Disposition']
    if (disposition && typeof disposition === 'string') {
      const rfcMatch = disposition.match(/filename\*=UTF-8''([^;]+)/i)
      if (rfcMatch && rfcMatch[1]) {
        filename = decodeURIComponent(rfcMatch[1].trim())
      } else {
        const standardMatch = disposition.match(/filename="?([^";]+)"?/)
        if (standardMatch && standardMatch[1]) {
          filename = decodeURIComponent(standardMatch[1].trim())
        }
      }
    }

    // Trigger instant browser download from memory blob
    triggerBlobDownload(response.data, filename)

    toast.success('Unduh file Excel berhasil!', {
      id: toastId,
    })
  } catch (err: unknown) {
    handleExportError(err, toastId)
  }
}

/**
 * Polls status for heavy background exports and triggers download upon completion.
 */
async function pollAndDownloadAsyncJob(
  jobId: string,
  initialMessage: string,
  fallbackFilename: string,
  signal: AbortSignal | undefined,
  toastId: string | number
): Promise<void> {
  toast.loading(initialMessage, { id: toastId })

  const maxAttempts = 120 // 120 * 1.5s = 3 minutes max polling window
  let attempts = 0

  while (attempts < maxAttempts) {
    if (signal?.aborted) {
      toast.dismiss(toastId)
      return
    }

    await new Promise((resolve) => setTimeout(resolve, 1500))
    attempts++

    if (signal?.aborted) {
      toast.dismiss(toastId)
      return
    }

    try {
      const statusRes = await apiClient.get<{
        status: string
        filename?: string
        total_rows?: number
        error?: string
      }>(`/exports/status/${jobId}`, { signal })

      const jobData = statusRes.data

      if (jobData.status === 'completed') {
        // Job finished! Download the generated file from disk
        const downloadRes = await apiClient.get(`/exports/download/${jobId}`, {
          responseType: 'blob',
          signal,
        })

        const finalFilename = jobData.filename || fallbackFilename
        triggerBlobDownload(downloadRes.data, finalFilename)

        toast.success(
          `Unduh file Excel berhasil! (${jobData.total_rows ?? 'Semua'} rekam data)`,
          { id: toastId }
        )
        return
      }

      if (jobData.status === 'failed') {
        toast.error(
          jobData.error || 'Gagal memproses ekspor data pada antrean server.',
          { id: toastId }
        )
        return
      }
    } catch (pollErr: unknown) {
      if (axios.isCancel(pollErr) || signal?.aborted) {
        toast.dismiss(toastId)
        return
      }
    }
  }

  toast.info(
    'Proses ekspor data masih berjalan di server. Silakan coba unduh kembali beberapa saat lagi.',
    { id: toastId }
  )
}

/**
 * Creates a blob object URL and clicks download anchor.
 */
function triggerBlobDownload(blobData: BlobPart, filename: string): void {
  const blob = new Blob([blobData], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
  const url = window.URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.setAttribute('download', filename)
  document.body.appendChild(link)
  link.click()

  link.remove()
  window.URL.revokeObjectURL(url)
}

/**
 * Unified error handler with blob parsing.
 */
async function handleExportError(err: unknown, toastId: string | number): Promise<void> {
  if (
    axios.isCancel(err) ||
    (err as { name?: string })?.name === 'CanceledError' ||
    (err as { name?: string })?.name === 'AbortError' ||
    (err as { code?: string })?.code === 'ERR_CANCELED'
  ) {
    toast.dismiss(toastId)
    return
  }

  let errorMessage =
    'Gagal mengekspor data ke format Excel. Silakan periksa koneksi atau coba beberapa saat lagi.'

  if (axios.isAxiosError(err)) {
    if (err.response?.data instanceof Blob) {
      try {
        const text = await err.response.data.text()
        const json = JSON.parse(text)
        if (json?.message) {
          errorMessage = json.message
        }
      } catch {
        // Retain default errorMessage
      }
    } else if (err.response?.data?.message) {
      errorMessage = err.response.data.message
    } else if (err.message && !err.message.includes('status code')) {
      errorMessage = err.message
    }
  }

  toast.error(errorMessage, { id: toastId })
}
