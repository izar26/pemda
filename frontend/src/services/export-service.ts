import apiClient from '@/lib/api-client'
import { toast } from 'sonner'

/**
 * Downloads an Excel (.xlsx) report from the backend API using high-performance streaming.
 */
export async function downloadExcelReport(
  endpoint: string,
  params?: Record<string, unknown>,
  fallbackFilename: string = 'Laporan_Data_PEMDA.xlsx'
): Promise<void> {
  const toastId = toast.loading('Menyiapkan & memproses dokumen Excel...')

  try {
    const response = await apiClient.get(endpoint, {
      params,
      responseType: 'blob',
    })

    // Extract filename from content-disposition header if available
    let filename = fallbackFilename
    const disposition = response.headers['content-disposition'] || response.headers['Content-Disposition']
    if (disposition && typeof disposition === 'string') {
      const filenameMatch = disposition.match(/filename="?([^";]+)"?/)
      if (filenameMatch && filenameMatch[1]) {
        filename = decodeURIComponent(filenameMatch[1])
      }
    }

    // Create a Blob URL and trigger instant download
    const blob = new Blob([response.data], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', filename)
    document.body.appendChild(link)
    link.click()

    // Cleanup memory references
    link.remove()
    window.URL.revokeObjectURL(url)

    toast.success('Unduh file Excel berhasil!', {
      id: toastId,
    })
  } catch (_err: unknown) {
    toast.error('Gagal mengekspor data ke format Excel. Silakan periksa koneksi atau coba beberapa saat lagi.', {
      id: toastId,
    })
  }
}
