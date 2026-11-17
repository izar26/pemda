import apiClient from '@/lib/api-client'
import { toast } from 'sonner'

export interface LaporanOpd {
  id: string
  nama: string
  kode: string
}

export interface LaporanPeriode {
  id: string
  tahun: number
  nama: string
}

export interface LaporanAuditStatus {
  submission_id?: string | null
  status: string
  current_tier: string
  is_approved: boolean
  approved_at?: string | null
  approved_by_name?: string | null
  catatan_umum?: string | null
}

export interface LaporanPenandatangan {
  nama: string
  nip: string
  jabatan: string
  tanggal: string
}

export interface LaporanData<TContent = unknown> {
  form_code: string
  form_title: string
  opd: LaporanOpd
  periode: LaporanPeriode
  audit_status: LaporanAuditStatus
  penandatangan: LaporanPenandatangan
  content: TContent | null
}

export interface LaporanApiResponse<TContent = unknown> {
  success: boolean
  data: LaporanData<TContent>
}

export interface LaporanQueryParams {
  opd_id?: string
  tahun?: number | string
}

function triggerBlobDownload(blobData: BlobPart, filename: string): void {
  const blob =
    blobData instanceof Blob
      ? blobData
      : new Blob([blobData], {
          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        })
  const url = window.URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.style.display = 'none'
  anchor.href = url
  anchor.download = filename
  document.body.appendChild(anchor)
  anchor.click()
  window.URL.revokeObjectURL(url)
  anchor.remove()
}

export const laporanService = {
  /**
   * Mengambil lembar data formulir laporan risiko terstruktur.
   */
  async getLaporan<T = unknown>(formCode: string, params: LaporanQueryParams = {}) {
    const response = await apiClient.get<LaporanApiResponse<T>>(
      `/risiko/laporan/${formCode}`,
      { params }
    )
    return response.data
  },

  /**
   * Ekspor lembar laporan ke file spreadsheet (.xlsx) resmi.
   */
  async exportExcel(
    formCode: string,
    params: LaporanQueryParams = {},
    fallbackTitle = 'Laporan_Risiko'
  ): Promise<void> {
    const toastId = toast.loading('Menyiapkan file ekspor Excel resmi...')
    try {
      const response = await apiClient.get(`/risiko/laporan/${formCode}/export`, {
        params,
        responseType: 'blob',
        headers: {
          Accept:
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/json, */*',
        },
      })

      // Jika response berupa JSON (misal error authorization 403 atau pesan validasi)
      if (
        response.data instanceof Blob &&
        response.data.type.includes('application/json')
      ) {
        const text = await response.data.text()
        const errorJson = JSON.parse(text)
        throw new Error(
          errorJson.message ||
            'Gagal mengunduh laporan. Pastikan status pengajuan telah disetujui.'
        )
      }

      let filename = `${fallbackTitle}.xlsx`
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

      if (!filename.toLowerCase().endsWith('.xlsx')) {
        filename += '.xlsx'
      }

      triggerBlobDownload(response.data, filename)
      toast.success('Unduh file Excel resmi berhasil!', { id: toastId })
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Gagal mengekspor laporan.'
      toast.error(message, { id: toastId })
      throw err
    }
  },
}
