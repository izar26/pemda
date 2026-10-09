import apiClient from '@/lib/api-client'
import type {
  PeriodePenilaian,
  PeriodePayload,
  CascadingTreeItem,
  RenstraProgram,
  RenstraKegiatan,
  RenstraSubKegiatan,
  RenstraFilterParams,
  RenstraImportResult,
} from '@/types/perencanaan'

export const perencanaanService = {
  // ==========================================
  // FITUR 13: PERIODE PENILAIAN
  // ==========================================
  async getPeriodeList(): Promise<PeriodePenilaian[]> {
    const response = await apiClient.get<{ data: PeriodePenilaian[] }>('/perencanaan/periode')
    return Array.isArray(response.data?.data) ? response.data.data : []
  },

  async getPeriodeActive(): Promise<PeriodePenilaian | null> {
    try {
      const response = await apiClient.get<{ data: PeriodePenilaian }>('/perencanaan/periode/active')
      return response.data?.data || null
    } catch {
      return null
    }
  },

  async createPeriode(payload: PeriodePayload): Promise<{ message: string; data: PeriodePenilaian }> {
    const response = await apiClient.post<{ message: string; data: PeriodePenilaian }>(
      '/perencanaan/periode',
      payload
    )
    return response.data
  },

  async updatePeriode(
    id: number,
    payload: PeriodePayload
  ): Promise<{ message: string; data: PeriodePenilaian }> {
    const response = await apiClient.put<{ message: string; data: PeriodePenilaian }>(
      `/perencanaan/periode/${id}`,
      payload
    )
    return response.data
  },

  async togglePeriodeStatus(
    id: number,
    status: 'Aktif' | 'Tidak Aktif' | 'Arsip'
  ): Promise<{ message: string; data: PeriodePenilaian }> {
    const response = await apiClient.patch<{ message: string; data: PeriodePenilaian }>(
      `/perencanaan/periode/${id}/status`,
      { status }
    )
    return response.data
  },

  async deletePeriode(id: number): Promise<{ message: string }> {
    const response = await apiClient.delete<{ message: string }>(`/perencanaan/periode/${id}`)
    return response.data
  },

  // ==========================================
  // FITUR 14-17: CASCADING MAKRO (BAPPERIDA)
  // ==========================================
  async getCascadingTree(periode_id?: number, opd_id?: number): Promise<CascadingTreeItem[]> {
    const response = await apiClient.get<{ data: CascadingTreeItem[] }>('/perencanaan/cascading', {
      params: { periode_id, opd_id },
    })
    return Array.isArray(response.data?.data) ? response.data.data : []
  },

  async createTujuan(payload: { opd_id: number; periode_id: number; tujuan: string }) {
    const response = await apiClient.post('/perencanaan/cascading/tujuan', payload)
    return response.data
  },

  async updateTujuan(id: number, payload: { tujuan: string }) {
    const response = await apiClient.put(`/perencanaan/cascading/tujuan/${id}`, payload)
    return response.data
  },

  async deleteTujuan(id: number) {
    const response = await apiClient.delete(`/perencanaan/cascading/tujuan/${id}`)
    return response.data
  },

  async createSasaran(payload: { tujuan_id: number; periode_id: number; sasaran: string }) {
    const response = await apiClient.post('/perencanaan/cascading/sasaran', payload)
    return response.data
  },

  async updateSasaran(id: number, payload: { sasaran: string }) {
    const response = await apiClient.put(`/perencanaan/cascading/sasaran/${id}`, payload)
    return response.data
  },

  async deleteSasaran(id: number) {
    const response = await apiClient.delete(`/perencanaan/cascading/sasaran/${id}`)
    return response.data
  },

  async createIndikator(payload: {
    sasaran_id: number
    periode_id: number
    indikator: string
    jenis?: string
    target?: string
    satuan?: string
  }) {
    const response = await apiClient.post('/perencanaan/cascading/indikator', payload)
    return response.data
  },

  async updateIndikator(
    id: number,
    payload: {
      indikator: string
      jenis?: string
      target?: string
      satuan?: string
    }
  ) {
    const response = await apiClient.put(`/perencanaan/cascading/indikator/${id}`, payload)
    return response.data
  },

  async deleteIndikator(id: number) {
    const response = await apiClient.delete(`/perencanaan/cascading/indikator/${id}`)
    return response.data
  },

  // ==========================================
  // SHEET 2B & 2C: RENSTRA SKPD (OPD)
  // ==========================================
  async getRenstraTree(params?: RenstraFilterParams): Promise<RenstraProgram[]> {
    const response = await apiClient.get<{ data: RenstraProgram[] }>('/perencanaan/renstra/tree', {
      params,
    })
    return Array.isArray(response.data?.data) ? response.data.data : []
  },

  async createProgram(payload: {
    opd_id: number
    periode_id: number
    kode: string
    nama: string
    indikator?: string
    target?: string
    satuan?: string
    pagu_indikatif?: number
  }): Promise<{ message: string; data: RenstraProgram }> {
    const response = await apiClient.post<{ message: string; data: RenstraProgram }>(
      '/perencanaan/renstra/program',
      payload
    )
    return response.data
  },

  async updateProgram(
    id: number,
    payload: Partial<{
      kode: string
      nama: string
      indikator: string
      target: string
      satuan: string
      pagu_indikatif: number
    }>
  ) {
    const response = await apiClient.put(`/perencanaan/renstra/program/${id}`, payload)
    return response.data
  },

  async deleteProgram(id: number) {
    const response = await apiClient.delete(`/perencanaan/renstra/program/${id}`)
    return response.data
  },

  async createKegiatan(payload: {
    program_id: number
    kode: string
    nama: string
    indikator?: string
    target?: string
    satuan?: string
    pagu_indikatif?: number
  }): Promise<{ message: string; data: RenstraKegiatan }> {
    const response = await apiClient.post<{ message: string; data: RenstraKegiatan }>(
      '/perencanaan/renstra/kegiatan',
      payload
    )
    return response.data
  },

  async updateKegiatan(
    id: number,
    payload: Partial<{
      kode: string
      nama: string
      indikator: string
      target: string
      satuan: string
      pagu_indikatif: number
    }>
  ) {
    const response = await apiClient.put(`/perencanaan/renstra/kegiatan/${id}`, payload)
    return response.data
  },

  async deleteKegiatan(id: number) {
    const response = await apiClient.delete(`/perencanaan/renstra/kegiatan/${id}`)
    return response.data
  },

  async createSubKegiatan(payload: {
    kegiatan_id: number
    kode: string
    nama: string
    indikator?: string
    target?: string
    satuan?: string
    pagu_indikatif?: number
  }): Promise<{ message: string; data: RenstraSubKegiatan }> {
    const response = await apiClient.post<{ message: string; data: RenstraSubKegiatan }>(
      '/perencanaan/renstra/sub-kegiatan',
      payload
    )
    return response.data
  },

  async updateSubKegiatan(
    id: number,
    payload: Partial<{
      kode: string
      nama: string
      indikator: string
      target: string
      satuan: string
      pagu_indikatif: number
    }>
  ) {
    const response = await apiClient.put(`/perencanaan/renstra/sub-kegiatan/${id}`, payload)
    return response.data
  },

  async deleteSubKegiatan(id: number) {
    const response = await apiClient.delete(`/perencanaan/renstra/sub-kegiatan/${id}`)
    return response.data
  },

  // ==========================================
  // EXCEL IMPORT & EXPORT
  // ==========================================
  async downloadRenstraTemplate(): Promise<Blob> {
    const response = await apiClient.get('/perencanaan/renstra/template', {
      responseType: 'blob',
    })
    return response.data
  },

  async exportRenstra(params?: RenstraFilterParams): Promise<Blob> {
    const response = await apiClient.get('/perencanaan/renstra/export', {
      params,
      responseType: 'blob',
    })
    return response.data
  },

  async importRenstra(
    file: File,
    periode_id: number,
    opd_id: number
  ): Promise<RenstraImportResult> {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('periode_id', String(periode_id))
    formData.append('opd_id', String(opd_id))

    const response = await apiClient.post<RenstraImportResult>(
      '/perencanaan/renstra/import',
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    )
    return response.data
  },
}
