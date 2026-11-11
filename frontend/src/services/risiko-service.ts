import apiClient from '@/lib/api-client'
import type {
  KonteksOpdMeta,
  KonteksPenilaianFormData,
  KonteksPenilaianItem,
  KonteksPenilaianFilterParams,
  KonteksOperasionalFormData,
  KonteksOperasionalItem,
  KonteksOperasionalItemFormData,
  KonteksOperasionalItemNode,
  IdentifikasiRisikoPemda,
  IdentifikasiRisikoPemdaItem,
  IdentifikasiRisikoPemdaMeta,
  IdentifikasiRisikoOpd,
  IdentifikasiRisikoOpdItem,
  IdentifikasiRisikoOpdMeta,
  IdentifikasiRisikoOpdOperasional,
  IdentifikasiRisikoOpdOperasionalItem,
  IdentifikasiRisikoOpdOperasionalMeta,
  RootCauseAnalysis,
} from '@/types/risiko'

export const risikoService = {
  /**
   * Get list of context assessments (Form 2B).
   */
  async getKonteksList(params: KonteksPenilaianFilterParams = {}) {
    const response = await apiClient.get<{
      data: KonteksPenilaianItem[]
      meta: {
        current_page: number
        per_page: number
        total: number
        last_page: number
      }
    }>('/risiko/konteks-strategis', { params })
    return response.data
  },

  /**
   * Get current active OPD context assessment.
   */
  async getCurrentKonteks(params: { opd_id?: string; periode_penilaian_id?: string } = {}) {
    const response = await apiClient.get<{
      data: KonteksPenilaianItem | null
      meta?: KonteksOpdMeta
      message?: string
    }>('/risiko/konteks-strategis/current', { params })
    return response.data.data
  },

  /**
   * Get current active OPD context assessment along with OPD Kepala & Form 2C metadata.
   */
  async getCurrentKonteksWithMeta(params: { opd_id?: string; periode_penilaian_id?: string } = {}) {
    const response = await apiClient.get<{
      data: KonteksPenilaianItem | null
      meta?: KonteksOpdMeta
      message?: string
    }>('/risiko/konteks-strategis/current', { params })
    return response.data
  },

  /**
   * Get a single context assessment by ID.
   */
  async getKonteksById(id: string) {
    const response = await apiClient.get<{
      data: KonteksPenilaianItem
      meta?: KonteksOpdMeta
    }>(`/risiko/konteks-strategis/${id}`)
    return response.data.data
  },

  /**
   * Create or update context assessment (Form 2B).
   */
  async saveKonteks(data: KonteksPenilaianFormData) {
    const response = await apiClient.post<{
      message: string
      data: KonteksPenilaianItem
      meta?: KonteksOpdMeta
    }>('/risiko/konteks-strategis', data)
    return response.data
  },

  /**
   * Update existing context assessment by ID.
   */
  async updateKonteks(id: string, data: KonteksPenilaianFormData) {
    const response = await apiClient.put<{
      message: string
      data: KonteksPenilaianItem
      meta?: KonteksOpdMeta
    }>(`/risiko/konteks-strategis/${id}`, data)
    return response.data
  },

  /**
   * Delete context assessment.
   */
  async deleteKonteks(id: string) {
    const response = await apiClient.delete<{
      message: string
    }>(`/risiko/konteks-strategis/${id}`)
    return response.data
  },

  /**
   * Download Form 2B Excel (.xlsx).
   */
  async exportExcel(id: string, filename?: string) {
    const response = await apiClient.get(`/risiko/konteks-strategis/${id}/export`, {
      responseType: 'blob',
    })

    const blob = new Blob([response.data], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename || `Form_2B_Konteks_Risiko_Strategis_${new Date().toISOString().slice(0, 10)}.xlsx`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)
  },

  /**
   * Get list of operational context assessments (Form 2C).
   */
  async getKonteksOperasionalList(params: Record<string, unknown> = {}) {
    const response = await apiClient.get<{
      data: KonteksOperasionalItem[]
      meta: {
        current_page: number
        per_page: number
        total: number
        last_page: number
      }
    }>('/risiko/konteks-operasional', { params })
    return response.data
  },

  /**
   * Get current active OPD operational context assessment (Form 2C).
   */
  async getCurrentKonteksOperasional(params: { opd_id?: string; periode_penilaian_id?: string } = {}) {
    const response = await apiClient.get<{
      data: KonteksOperasionalItem | null
      message?: string
    }>('/risiko/konteks-operasional/current', { params })
    return response.data.data
  },

  /**
   * Get a single operational context assessment by ID.
   */
  async getKonteksOperasionalById(id: string) {
    const response = await apiClient.get<{
      data: KonteksOperasionalItem
    }>(`/risiko/konteks-operasional/${id}`)
    return response.data.data
  },

  /**
   * Create or update operational context assessment (Form 2C header/full).
   */
  async saveKonteksOperasional(data: KonteksOperasionalFormData) {
    const response = await apiClient.post<{
      message: string
      data: KonteksOperasionalItem
    }>('/risiko/konteks-operasional', data)
    return response.data
  },

  /**
   * Update existing operational context assessment header by ID.
   */
  async updateKonteksOperasional(id: string, data: KonteksOperasionalFormData) {
    const response = await apiClient.put<{
      message: string
      data: KonteksOperasionalItem
    }>(`/risiko/konteks-operasional/${id}`, data)
    return response.data
  },

  /**
   * Delete operational context assessment (Form 2C).
   */
  async deleteKonteksOperasional(id: string) {
    const response = await apiClient.delete<{
      message: string
    }>(`/risiko/konteks-operasional/${id}`)
    return response.data
  },

  /**
   * Add a new item (Program, Kegiatan, or Sub-Kegiatan) to Form 2C.
   */
  async saveKonteksOperasionalItem(konteksId: string, data: KonteksOperasionalItemFormData) {
    const response = await apiClient.post<{
      message: string
      data: KonteksOperasionalItemNode
    }>(`/risiko/konteks-operasional/${konteksId}/items`, data)
    return response.data
  },

  /**
   * Update an item in Form 2C.
   */
  async updateKonteksOperasionalItem(konteksId: string, itemId: string, data: KonteksOperasionalItemFormData) {
    const response = await apiClient.put<{
      message: string
      data: KonteksOperasionalItemNode
    }>(`/risiko/konteks-operasional/${konteksId}/items/${itemId}`, data)
    return response.data
  },

  /**
   * Delete an item from Form 2C.
   */
  async deleteKonteksOperasionalItem(konteksId: string, itemId: string) {
    const response = await apiClient.delete<{
      message: string
    }>(`/risiko/konteks-operasional/${konteksId}/items/${itemId}`)
    return response.data
  },

  /**
   * Reorder items in Form 2C.
   */
  async reorderKonteksOperasionalItems(konteksId: string, ids: string[]) {
    const response = await apiClient.post<{
      message: string
      data: KonteksOperasionalItem
    }>(`/risiko/konteks-operasional/${konteksId}/items/reorder`, { ids })
    return response.data
  },

  /**
   * Download Form 2C Excel (.xlsx).
   */
  async exportOperasionalExcel(id: string, filename?: string) {
    const response = await apiClient.get(`/risiko/konteks-operasional/${id}/export`, {
      responseType: 'blob',
    })

    const blob = new Blob([response.data], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename || `Form_2C_Konteks_Risiko_Operasional_${new Date().toISOString().slice(0, 10)}.xlsx`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)
  },

  /**
   * Get current Form 3A for active period including Form 2B reference metadata.
   */
  async getCurrentIdentifikasiPemda(params: { opd_id?: string; periode_penilaian_id?: string } = {}) {
    const response = await apiClient.get<{
      data: IdentifikasiRisikoPemda | null
      meta: IdentifikasiRisikoPemdaMeta
    }>('/risiko/identifikasi-pemda/current', { params })
    return response.data
  },

  /**
   * Save or update Form 3A header (Urusan Pemerintahan).
   */
  async saveIdentifikasiPemdaHeader(data: {
    opd_id: string
    periode_penilaian_id?: string
    master_urusan_pemerintahan_id: string
    nama_pemda?: string
  }) {
    const response = await apiClient.post<{
      status: string
      message: string
      data: IdentifikasiRisikoPemda
    }>('/risiko/identifikasi-pemda/header', data)
    return response.data
  },

  /**
   * Add a new risk item to Form 3A.
   */
  async storeIdentifikasiPemdaItem(
    dokumenId: string,
    data: {
      sasaran_penilaian_id?: string | null
      sasaran_kustom?: string | null
      indikator_penilaian_id?: string | null
      indikator_kustom?: string | null
      kategori_risiko: string
      pernyataan_risiko: string
      pemilik_risiko?: string
      sifat_risiko: 'C' | 'UC'
      uraian_dampak?: string | null
      pihak_terkena?: string | null
    }
  ) {
    const response = await apiClient.post<{
      status: string
      message: string
      data: IdentifikasiRisikoPemdaItem
    }>(`/risiko/identifikasi-pemda/${dokumenId}/items`, data)
    return response.data
  },

  /**
   * Update an existing risk item in Form 3A.
   */
  async updateIdentifikasiPemdaItem(
    dokumenId: string,
    itemId: string,
    data: {
      sasaran_penilaian_id?: string | null
      sasaran_kustom?: string | null
      indikator_penilaian_id?: string | null
      indikator_kustom?: string | null
      kategori_risiko?: string
      pernyataan_risiko?: string
      pemilik_risiko?: string
      sifat_risiko?: 'C' | 'UC'
      uraian_dampak?: string | null
      pihak_terkena?: string | null
    }
  ) {
    const response = await apiClient.put<{
      status: string
      message: string
      data: IdentifikasiRisikoPemdaItem
    }>(`/risiko/identifikasi-pemda/${dokumenId}/items/${itemId}`, data)
    return response.data
  },

  /**
   * Delete a risk item in Form 3A.
   */
  async deleteIdentifikasiPemdaItem(dokumenId: string, itemId: string) {
    const response = await apiClient.delete<{
      status: string
      message: string
    }>(`/risiko/identifikasi-pemda/${dokumenId}/items/${itemId}`)
    return response.data
  },

  /**
   * Reorder risk items in Form 3A.
   */
  async reorderIdentifikasiPemdaItems(dokumenId: string, itemIds: string[]) {
    const response = await apiClient.post<{
      status: string
      message: string
    }>(`/risiko/identifikasi-pemda/${dokumenId}/items/reorder`, { item_ids: itemIds })
    return response.data
  },

  /**
   * Get current Form 3B document for an OPD in the active evaluation period.
   */
  async getCurrentIdentifikasiOpd(params: { opd_id?: string; periode_penilaian_id?: string } = {}) {
    const response = await apiClient.get<{
      data: IdentifikasiRisikoOpd | null
      meta: IdentifikasiRisikoOpdMeta
    }>('/risiko/identifikasi-opd/current', { params })
    return response.data
  },

  /**
   * Save or update Form 3B header (Urusan Pemerintahan, Singkatan OPD).
   */
  async saveIdentifikasiOpdHeader(data: {
    opd_id: string
    periode_penilaian_id?: string
    master_urusan_pemerintahan_id: string
    nama_pemda?: string
    singkatan_opd?: string
    nama_kepala_opd?: string
  }) {
    const response = await apiClient.post<{
      status: string
      message: string
      data: IdentifikasiRisikoOpd
    }>('/risiko/identifikasi-opd/header', data)
    return response.data
  },

  /**
   * Add a new risk item to Form 3B.
   */
  async storeIdentifikasiOpdItem(
    dokumenId: string,
    data: {
      sasaran_penilaian_id?: string | null
      sasaran_kustom?: string | null
      indikator_penilaian_id?: string | null
      indikator_kustom?: string | null
      kategori_risiko: string
      pernyataan_risiko: string
      pemilik_risiko?: string
      sifat_risiko: 'C' | 'UC'
      uraian_dampak?: string | null
      pihak_terkena?: string | null
    }
  ) {
    const response = await apiClient.post<{
      status: string
      message: string
      data: IdentifikasiRisikoOpdItem
    }>(`/risiko/identifikasi-opd/${dokumenId}/items`, data)
    return response.data
  },

  /**
   * Update an existing risk item in Form 3B.
   */
  async updateIdentifikasiOpdItem(
    dokumenId: string,
    itemId: string,
    data: {
      sasaran_penilaian_id?: string | null
      sasaran_kustom?: string | null
      indikator_penilaian_id?: string | null
      indikator_kustom?: string | null
      kategori_risiko?: string
      pernyataan_risiko?: string
      pemilik_risiko?: string
      sifat_risiko?: 'C' | 'UC'
      uraian_dampak?: string | null
      pihak_terkena?: string | null
    }
  ) {
    const response = await apiClient.put<{
      status: string
      message: string
      data: IdentifikasiRisikoOpdItem
    }>(`/risiko/identifikasi-opd/${dokumenId}/items/${itemId}`, data)
    return response.data
  },

  /**
   * Delete a risk item in Form 3B.
   */
  async deleteIdentifikasiOpdItem(dokumenId: string, itemId: string) {
    const response = await apiClient.delete<{
      status: string
      message: string
    }>(`/risiko/identifikasi-opd/${dokumenId}/items/${itemId}`)
    return response.data
  },

  /**
   * Reorder risk items in Form 3B.
   */
  async reorderIdentifikasiOpdItems(dokumenId: string, itemIds: string[]) {
    const response = await apiClient.post<{
      status: string
      message: string
    }>(`/risiko/identifikasi-opd/${dokumenId}/items/reorder`, { item_ids: itemIds })
    return response.data
  },

  /**
   * Get current Form 3C document (Identifikasi Risiko Operasional OPD) for an OPD.
   */
  async getCurrentIdentifikasiOperasional(params: { opd_id?: string; periode_penilaian_id?: string } = {}) {
    const response = await apiClient.get<{
      data: IdentifikasiRisikoOpdOperasional | null
      meta: IdentifikasiRisikoOpdOperasionalMeta
    }>('/risiko/identifikasi-operasional/current', { params })
    return response.data
  },

  /**
   * Save or update Form 3C header (Urusan Pemerintahan, Singkatan OPD).
   */
  async saveIdentifikasiOperasionalHeader(data: {
    opd_id: string
    periode_penilaian_id?: string
    master_urusan_pemerintahan_id: string
    nama_pemda?: string
    singkatan_opd?: string
    nama_kepala_opd?: string
  }) {
    const response = await apiClient.post<{
      status: string
      message: string
      data: IdentifikasiRisikoOpdOperasional
    }>('/risiko/identifikasi-operasional/header', data)
    return response.data
  },

  /**
   * Add a new risk item to Form 3C.
   */
  async storeIdentifikasiOperasionalItem(
    dokumenId: string,
    data: {
      operasional_sub_kegiatan_id?: string | null
      sub_kegiatan_kustom?: string | null
      indikator_keluaran_kustom?: string | null
      probis: string
      kategori_risiko: string
      pernyataan_risiko: string
      pemilik_risiko?: string
      sifat_risiko: 'C' | 'UC'
      uraian_dampak?: string | null
      pihak_terkena?: string | null
    }
  ) {
    const response = await apiClient.post<{
      status: string
      message: string
      data: IdentifikasiRisikoOpdOperasionalItem
    }>(`/risiko/identifikasi-operasional/${dokumenId}/items`, data)
    return response.data
  },

  /**
   * Update an existing risk item in Form 3C.
   */
  async updateIdentifikasiOperasionalItem(
    dokumenId: string,
    itemId: string,
    data: {
      operasional_sub_kegiatan_id?: string | null
      sub_kegiatan_kustom?: string | null
      indikator_keluaran_kustom?: string | null
      probis?: string
      kategori_risiko?: string
      pernyataan_risiko?: string
      pemilik_risiko?: string
      sifat_risiko?: 'C' | 'UC'
      uraian_dampak?: string | null
      pihak_terkena?: string | null
    }
  ) {
    const response = await apiClient.put<{
      status: string
      message: string
      data: IdentifikasiRisikoOpdOperasionalItem
    }>(`/risiko/identifikasi-operasional/${dokumenId}/items/${itemId}`, data)
    return response.data
  },

  /**
   * Delete a risk item in Form 3C.
   */
  async deleteIdentifikasiOperasionalItem(dokumenId: string, itemId: string) {
    const response = await apiClient.delete<{
      status: string
      message: string
    }>(`/risiko/identifikasi-operasional/${dokumenId}/items/${itemId}`)
    return response.data
  },

  /**
   * Reorder risk items in Form 3C.
   */
  async reorderIdentifikasiOperasionalItems(dokumenId: string, itemIds: string[]) {
    const response = await apiClient.post<{
      status: string
      message: string
    }>(`/risiko/identifikasi-operasional/${dokumenId}/items/reorder`, { item_ids: itemIds })
    return response.data
  },

  /**
   * Get all RCA records for an OPD in the active evaluation period.
   */
  async getRcaList(params: { opd_id?: string; periode_penilaian_id?: string; source_type?: '3a' | '3b' | '3c' } = {}) {
    const response = await apiClient.get<{
      data: RootCauseAnalysis[]
    }>('/risiko/rca', { params })
    return response.data.data
  },

  /**
   * Get RCA record for a specific risk item.
   */
  async getRcaByItem(itemId: string) {
    const response = await apiClient.get<{
      data: RootCauseAnalysis
    }>(`/risiko/rca/item/${itemId}`)
    return response.data.data
  },

  /**
   * Update 5-Whys analysis and mitigation in Form RCA.
   */
  async updateRca(
    rcaId: string,
    data: {
      why_1?: string | null
      why_2?: string | null
      why_3?: string | null
      why_4?: string | null
      why_5?: string | null
      jenis_penyebab?: string | null
      kegiatan_pengendalian?: string | null
    }
  ) {
    const response = await apiClient.put<{
      status: string
      message: string
      data: RootCauseAnalysis
    }>(`/risiko/rca/${rcaId}`, data)
    return response.data
  },
}
