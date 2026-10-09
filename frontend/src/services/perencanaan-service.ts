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
  KonteksRisikoResponse,
  KonteksRisikoStrategis,
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
    id: string | number,
    payload: PeriodePayload
  ): Promise<{ message: string; data: PeriodePenilaian }> {
    const response = await apiClient.put<{ message: string; data: PeriodePenilaian }>(
      `/perencanaan/periode/${id}`,
      payload
    )
    return response.data
  },

  async togglePeriodeStatus(
    id: string | number,
    status: 'Aktif' | 'Tidak Aktif' | 'Arsip' | 'active' | 'inactive' | 'archived'
  ): Promise<{ message: string; data: PeriodePenilaian }> {
    const response = await apiClient.patch<{ message: string; data: PeriodePenilaian }>(
      `/perencanaan/periode/${id}/status`,
      { status }
    )
    return response.data
  },

  async deletePeriode(id: string | number): Promise<{ message: string }> {
    const response = await apiClient.delete<{ message: string }>(`/perencanaan/periode/${id}`)
    return response.data
  },

  // ==========================================
  // FITUR 14-17: CASCADING MAKRO (BAPPERIDA)
  // ==========================================
  async getCascadingTree(periode_id?: string | number, opd_id?: string | number): Promise<CascadingTreeItem[]> {
    const response = await apiClient.get<{ data: CascadingTreeItem[] }>('/perencanaan/cascading', {
      params: {
        periode_id: periode_id ? String(periode_id) : undefined,
        periode_penilaian_id: periode_id ? String(periode_id) : undefined,
        opd_id: opd_id ? String(opd_id) : undefined,
      },
    })
    return Array.isArray(response.data?.data) ? response.data.data : []
  },

  async createTujuan(payload: {
    opd_id: string | number
    periode_id: string | number
    tujuan: string
    nomor?: string
  }) {
    const response = await apiClient.post('/perencanaan/cascading/tujuan', {
      ...payload,
      opd_id: String(payload.opd_id),
      periode_penilaian_id: String(payload.periode_id),
    })
    return response.data
  },

  async updateTujuan(id: string | number, payload: { tujuan: string; nomor?: string; opd_id?: string | number }) {
    const response = await apiClient.put(`/perencanaan/cascading/tujuan/${id}`, payload)
    return response.data
  },

  async deleteTujuan(id: string | number) {
    const response = await apiClient.delete(`/perencanaan/cascading/tujuan/${id}`)
    return response.data
  },

  async createSasaran(payload: {
    tujuan_id: string | number
    periode_id: string | number
    sasaran: string
    nomor?: string
  }) {
    const response = await apiClient.post('/perencanaan/cascading/sasaran', {
      ...payload,
      tujuan_id: String(payload.tujuan_id),
      periode_penilaian_id: String(payload.periode_id),
    })
    return response.data
  },

  async updateSasaran(id: string | number, payload: { sasaran: string; nomor?: string }) {
    const response = await apiClient.put(`/perencanaan/cascading/sasaran/${id}`, payload)
    return response.data
  },

  async deleteSasaran(id: string | number) {
    const response = await apiClient.delete(`/perencanaan/cascading/sasaran/${id}`)
    return response.data
  },

  async createIndikator(payload: {
    sasaran_id: string | number
    periode_id: string | number
    indikator: string
    nomor?: string
    jenis?: string
    target?: string
    satuan?: string
  }) {
    const response = await apiClient.post('/perencanaan/cascading/indikator', {
      ...payload,
      sasaran_id: String(payload.sasaran_id),
      periode_penilaian_id: String(payload.periode_id),
      jenis: payload.jenis?.toLowerCase() || 'utama',
    })
    return response.data
  },

  async updateIndikator(
    id: string | number,
    payload: {
      indikator: string
      nomor?: string
      jenis?: string
      target?: string
      satuan?: string
    }
  ) {
    const response = await apiClient.put(`/perencanaan/cascading/indikator/${id}`, {
      ...payload,
      jenis: payload.jenis ? payload.jenis.toLowerCase() : undefined,
    })
    return response.data
  },

  async deleteIndikator(id: string | number) {
    const response = await apiClient.delete(`/perencanaan/cascading/indikator/${id}`)
    return response.data
  },

  async cloneCascading(payload: {
    source_periode_id: string | number
    target_periode_id: string | number
    opd_id?: string | number
  }) {
    const response = await apiClient.post<{
      message: string
      data: {
        tujuans_count: number
        sasarans_count: number
        indikators_count: number
      }
    }>('/perencanaan/cascading/clone', payload)
    return response.data
  },

  // ==========================================
  // SHEET 2B: PENETAPAN KONTEKS RISIKO STRATEGIS OPD (FITUR 26)
  // ==========================================
  async getKonteksStrategis(params: {
    periode_id?: string | number
    opd_id?: string | number
  }): Promise<KonteksRisikoResponse | null> {
    const response = await apiClient.get<{ data: KonteksRisikoResponse }>('/perencanaan/konteks-strategis', {
      params: {
        periode_id: params.periode_id ? String(params.periode_id) : undefined,
        opd_id: params.opd_id ? String(params.opd_id) : undefined,
      },
    })
    return response.data?.data || null
  },

  async saveKonteksStrategis(payload: {
    periode_id: string
    opd_id: string
    sumber_data: string
    tujuan_id: string
    sasaran_ids: string[]
    iku_ids: string[]
    informasi_lain?: string
    kepala_opd_nama?: string
    kepala_opd_nip?: string
    tanggal_penetapan?: string
    status?: 'draft' | 'final'
  }): Promise<{ message: string; data: KonteksRisikoStrategis }> {
    const response = await apiClient.post<{ message: string; data: KonteksRisikoStrategis }>(
      '/perencanaan/konteks-strategis',
      payload
    )
    return response.data
  },

  // ==========================================
  // SHEET 2B & 2C: RENSTRA SKPD (OPD)
  // ==========================================
  async getRenstraTree(params?: RenstraFilterParams): Promise<RenstraProgram[]> {
    const response = await apiClient.get<{ data: RenstraProgram[] }>('/perencanaan/renstra/tree', {
      params: {
        ...params,
        periode_id: params?.periode_id ? String(params.periode_id) : undefined,
        opd_id: params?.opd_id ? String(params.opd_id) : undefined,
      },
    })
    return Array.isArray(response.data?.data) ? response.data.data : []
  },

  async createProgram(payload: {
    opd_id: string | number
    periode_id: string | number
    kode: string
    nama: string
    indikator?: string
    target?: string
    satuan?: string
    pagu_indikatif?: number
  }): Promise<{ message: string; data: RenstraProgram }> {
    const response = await apiClient.post<{ message: string; data: RenstraProgram }>(
      '/perencanaan/renstra/program',
      {
        ...payload,
        opd_id: String(payload.opd_id),
        periode_penilaian_id: String(payload.periode_id),
      }
    )
    return response.data
  },

  async updateProgram(
    id: string | number,
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

  async deleteProgram(id: string | number) {
    const response = await apiClient.delete(`/perencanaan/renstra/program/${id}`)
    return response.data
  },

  async createKegiatan(payload: {
    program_id?: string | number
    renstra_program_id?: string | number
    periode_id?: string | number
    opd_id?: string | number
    kode: string
    nama: string
    indikator?: string
    target?: string
    satuan?: string
    pagu_indikatif?: number
  }): Promise<{ message: string; data: RenstraKegiatan }> {
    const programId = payload.renstra_program_id || payload.program_id
    const response = await apiClient.post<{ message: string; data: RenstraKegiatan }>(
      '/perencanaan/renstra/kegiatan',
      {
        ...payload,
        renstra_program_id: programId ? String(programId) : undefined,
        periode_penilaian_id: payload.periode_id ? String(payload.periode_id) : undefined,
        opd_id: payload.opd_id ? String(payload.opd_id) : undefined,
      }
    )
    return response.data
  },

  async updateKegiatan(
    id: string | number,
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

  async deleteKegiatan(id: string | number) {
    const response = await apiClient.delete(`/perencanaan/renstra/kegiatan/${id}`)
    return response.data
  },

  async createSubKegiatan(payload: {
    kegiatan_id?: string | number
    renstra_kegiatan_id?: string | number
    periode_id?: string | number
    opd_id?: string | number
    kode: string
    nama: string
    indikator?: string
    target?: string
    satuan?: string
    pagu_indikatif?: number
  }): Promise<{ message: string; data: RenstraSubKegiatan }> {
    const kegiatanId = payload.renstra_kegiatan_id || payload.kegiatan_id
    const response = await apiClient.post<{ message: string; data: RenstraSubKegiatan }>(
      '/perencanaan/renstra/sub-kegiatan',
      {
        ...payload,
        renstra_kegiatan_id: kegiatanId ? String(kegiatanId) : undefined,
        periode_penilaian_id: payload.periode_id ? String(payload.periode_id) : undefined,
        opd_id: payload.opd_id ? String(payload.opd_id) : undefined,
      }
    )
    return response.data
  },

  async updateSubKegiatan(
    id: string | number,
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

  async deleteSubKegiatan(id: string | number) {
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
      params: {
        ...params,
        periode_id: params?.periode_id ? String(params.periode_id) : undefined,
        periode_penilaian_id: params?.periode_id ? String(params.periode_id) : undefined,
        opd_id: params?.opd_id ? String(params.opd_id) : undefined,
      },
      responseType: 'blob',
    })
    return response.data
  },

  async importRenstra(
    file: File,
    periode_id: string | number,
    opd_id: string | number
  ): Promise<RenstraImportResult> {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('periode_id', String(periode_id))
    formData.append('periode_penilaian_id', String(periode_id))
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
