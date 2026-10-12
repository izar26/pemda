import { apiClient } from '@/lib/api-client'
import type {
  IndikatorCopyFormData,
  IndikatorFilterParams,
  IndikatorFormData,
  IndikatorPenilaianItem,
  IndikatorStats,
  PeriodeFilterParams,
  PeriodeFormData,
  PeriodePenilaianItem,
  PeriodeStats,
  SasaranCopyFormData,
  SasaranFilterParams,
  SasaranFormData,
  SasaranPenilaianItem,
  SasaranStats,
  TujuanCopyFormData,
  TujuanFilterParams,
  TujuanFormData,
  TujuanPenilaianItem,
  TujuanStats,
} from '@/types/perencanaan'

export interface PaginatedResponse<T> {
  data: T[]
  meta: {
    current_page: number
    last_page: number
    per_page: number
    total: number
  }
}

export const perencanaanService = {
  /**
   * Get paginated or full list of evaluation periods
   */
  async getPaginatedPeriodes(
    params: PeriodeFilterParams = {}
  ): Promise<PaginatedResponse<PeriodePenilaianItem>> {
    const response = await apiClient.get<PaginatedResponse<PeriodePenilaianItem>>(
      '/perencanaan/periode',
      { params }
    )
    return response.data
  },

  /**
   * Get the single currently active period
   */
  async getActivePeriode(): Promise<PeriodePenilaianItem | null> {
    const response = await apiClient.get<{ data: PeriodePenilaianItem | null }>(
      '/perencanaan/periode/active'
    )
    return response.data.data
  },

  /**
   * Get KPI statistics for evaluation periods
   */
  async getStats(): Promise<PeriodeStats> {
    const response = await apiClient.get<PeriodeStats>('/perencanaan/periode/stats')
    return response.data
  },

  /**
   * Get a single evaluation period by ID
   */
  async getPeriodeById(id: string): Promise<PeriodePenilaianItem> {
    const response = await apiClient.get<{ data: PeriodePenilaianItem }>(
      `/perencanaan/periode/${id}`
    )
    return response.data.data
  },

  /**
   * Create a new evaluation period
   */
  async createPeriode(data: PeriodeFormData): Promise<PeriodePenilaianItem> {
    const response = await apiClient.post<{ message: string; data: PeriodePenilaianItem }>(
      '/perencanaan/periode',
      data
    )
    return response.data.data
  },

  /**
   * Update an existing evaluation period
   */
  async updatePeriode(
    id: string,
    data: PeriodeFormData
  ): Promise<PeriodePenilaianItem> {
    const response = await apiClient.put<{ message: string; data: PeriodePenilaianItem }>(
      `/perencanaan/periode/${id}`,
      data
    )
    return response.data.data
  },

  /**
   * Directly activate an evaluation period
   */
  async activatePeriode(id: string): Promise<PeriodePenilaianItem> {
    const response = await apiClient.patch<{ message: string; data: PeriodePenilaianItem }>(
      `/perencanaan/periode/${id}/activate`
    )
    return response.data.data
  },

  /**
   * Quick switch the active evaluation year within the RPJMD cycle
   */
  async switchTahun(id: string, tahun_penilaian: number): Promise<PeriodePenilaianItem> {
    const response = await apiClient.patch<{ message: string; data: PeriodePenilaianItem }>(
      `/perencanaan/periode/${id}/switch-tahun`,
      { tahun_penilaian }
    )
    return response.data.data
  },

  /**
   * Delete an evaluation period
   */
  async deletePeriode(id: string): Promise<{ message: string }> {
    const response = await apiClient.delete<{ message: string }>(
      `/perencanaan/periode/${id}`
    )
    return response.data
  },

  /**
   * Generate export URL for Excel download
   */
  getExportUrl(params: PeriodeFilterParams = {}): string {
    const searchParams = new URLSearchParams()
    if (params.search) searchParams.set('search', params.search)
    if (params.status && params.status !== 'all') searchParams.set('status', params.status)
    if (params.tahun_penilaian && params.tahun_penilaian !== 'all') {
      searchParams.set('tahun_penilaian', params.tahun_penilaian)
    }
    const query = searchParams.toString()
    return `/api/perencanaan/periode/export${query ? `?${query}` : ''}`
  },

  // ==========================================
  // FITUR NO. 14: DATA TUJUAN RENSTRA OPD
  // ==========================================

  /**
   * Get paginated list of evaluation goals
   */
  async getPaginatedTujuan(
    params: TujuanFilterParams = {}
  ): Promise<PaginatedResponse<TujuanPenilaianItem>> {
    const response = await apiClient.get<PaginatedResponse<TujuanPenilaianItem>>(
      '/perencanaan/tujuan',
      { params }
    )
    return response.data
  },

  /**
   * Get KPI statistics for goals
   */
  async getTujuanStats(periodeId?: string): Promise<TujuanStats> {
    const response = await apiClient.get<TujuanStats>(
      '/perencanaan/tujuan/stats',
      { params: periodeId ? { periode_penilaian_id: periodeId } : {} }
    )
    return response.data
  },

  /**
   * Create a new evaluation goal
   */
  async createTujuan(data: TujuanFormData): Promise<TujuanPenilaianItem> {
    const response = await apiClient.post<{ message: string; data: TujuanPenilaianItem }>(
      '/perencanaan/tujuan',
      data
    )
    return response.data.data
  },

  /**
   * Update an existing evaluation goal
   */
  async updateTujuan(
    id: string,
    data: Partial<TujuanFormData>
  ): Promise<TujuanPenilaianItem> {
    const response = await apiClient.put<{ message: string; data: TujuanPenilaianItem }>(
      `/perencanaan/tujuan/${id}`,
      data
    )
    return response.data.data
  },

  /**
   * Delete an evaluation goal
   */
  async deleteTujuan(id: string): Promise<{ message: string }> {
    const response = await apiClient.delete<{ message: string }>(
      `/perencanaan/tujuan/${id}`
    )
    return response.data
  },

  /**
   * Copy goals from another period into target active period
   */
  async copyTujuan(
    data: TujuanCopyFormData
  ): Promise<{ message: string; copied_count: number }> {
    const response = await apiClient.post<{ message: string; copied_count: number }>(
      '/perencanaan/tujuan/copy',
      data
    )
    return response.data
  },

  /**
   * Generate export URL for goals Excel download
   */
  getTujuanExportUrl(params: TujuanFilterParams = {}): string {
    const searchParams = new URLSearchParams()
    if (params.search) searchParams.set('search', params.search)
    if (params.opd_id && params.opd_id !== 'all') searchParams.set('opd_id', params.opd_id)
    if (params.periode_penilaian_id) {
      searchParams.set('periode_penilaian_id', params.periode_penilaian_id)
    }
    const query = searchParams.toString()
    return `/api/perencanaan/tujuan/export${query ? `?${query}` : ''}`
  },

  // ==========================================
  // FITUR NO. 15: DATA SASARAN RENSTRA OPD
  // ==========================================

  /**
   * Get paginated list of evaluation targets
   */
  async getPaginatedSasaran(
    params: SasaranFilterParams = {}
  ): Promise<PaginatedResponse<SasaranPenilaianItem>> {
    const response = await apiClient.get<PaginatedResponse<SasaranPenilaianItem>>(
      '/perencanaan/sasaran',
      { params }
    )
    return response.data
  },

  /**
   * Get KPI statistics for targets
   */
  async getSasaranStats(periodeId?: string): Promise<SasaranStats> {
    const response = await apiClient.get<SasaranStats>(
      '/perencanaan/sasaran/stats',
      { params: periodeId ? { periode_penilaian_id: periodeId } : {} }
    )
    return response.data
  },

  /**
   * Create a new evaluation target
   */
  async createSasaran(data: SasaranFormData): Promise<SasaranPenilaianItem> {
    const response = await apiClient.post<{ message: string; data: SasaranPenilaianItem }>(
      '/perencanaan/sasaran',
      data
    )
    return response.data.data
  },

  /**
   * Update an existing evaluation target
   */
  async updateSasaran(
    id: string,
    data: Partial<SasaranFormData>
  ): Promise<SasaranPenilaianItem> {
    const response = await apiClient.put<{ message: string; data: SasaranPenilaianItem }>(
      `/perencanaan/sasaran/${id}`,
      data
    )
    return response.data.data
  },

  /**
   * Delete an evaluation target
   */
  async deleteSasaran(id: string): Promise<{ message: string }> {
    const response = await apiClient.delete<{ message: string }>(
      `/perencanaan/sasaran/${id}`
    )
    return response.data
  },

  /**
   * Copy targets from another period into target active period
   */
  async copySasaran(
    data: SasaranCopyFormData
  ): Promise<{ message: string; copied_count: number }> {
    const response = await apiClient.post<{ message: string; copied_count: number }>(
      '/perencanaan/sasaran/copy',
      data
    )
    return response.data
  },

  /**
   * Generate export URL for targets Excel download
   */
  getSasaranExportUrl(params: SasaranFilterParams = {}): string {
    const searchParams = new URLSearchParams()
    if (params.search) searchParams.set('search', params.search)
    if (params.opd_id && params.opd_id !== 'all') searchParams.set('opd_id', params.opd_id)
    if (params.tujuan_penilaian_id && params.tujuan_penilaian_id !== 'all') {
      searchParams.set('tujuan_penilaian_id', params.tujuan_penilaian_id)
    }
    if (params.periode_penilaian_id) {
      searchParams.set('periode_penilaian_id', params.periode_penilaian_id)
    }
    const query = searchParams.toString()
    return `/api/perencanaan/sasaran/export${query ? `?${query}` : ''}`
  },

  // =======================================================
  // FITUR NO. 16 & 17: DATA IKU & INDIKATOR RENSTRA OPD
  // =======================================================

  /**
   * Get paginated list of indicators / IKU
   */
  async getPaginatedIndikator(
    params: IndikatorFilterParams = {}
  ): Promise<PaginatedResponse<IndikatorPenilaianItem>> {
    const response = await apiClient.get<PaginatedResponse<IndikatorPenilaianItem>>(
      '/perencanaan/iku',
      { params }
    )
    return response.data
  },

  /**
   * Get KPI statistics for indicators / IKU
   */
  async getIndikatorStats(periodeId?: string): Promise<IndikatorStats> {
    const response = await apiClient.get<IndikatorStats>(
      '/perencanaan/iku/stats',
      { params: periodeId ? { periode_penilaian_id: periodeId } : {} }
    )
    return response.data
  },

  /**
   * Create a new evaluation indicator / IKU
   */
  async createIndikator(data: IndikatorFormData): Promise<IndikatorPenilaianItem> {
    const response = await apiClient.post<{ message: string; data: IndikatorPenilaianItem }>(
      '/perencanaan/iku',
      data
    )
    return response.data.data
  },

  /**
   * Update an existing evaluation indicator / IKU
   */
  async updateIndikator(
    id: string,
    data: Partial<IndikatorFormData>
  ): Promise<IndikatorPenilaianItem> {
    const response = await apiClient.put<{ message: string; data: IndikatorPenilaianItem }>(
      `/perencanaan/iku/${id}`,
      data
    )
    return response.data.data
  },

  /**
   * Delete an evaluation indicator
   */
  async deleteIndikator(id: string): Promise<{ message: string }> {
    const response = await apiClient.delete<{ message: string }>(
      `/perencanaan/iku/${id}`
    )
    return response.data
  },

  /**
   * Copy indicators from another period into target active period
   */
  async copyIndikator(
    data: IndikatorCopyFormData
  ): Promise<{ message: string; copied_count: number }> {
    const response = await apiClient.post<{ message: string; copied_count: number }>(
      '/perencanaan/iku/copy',
      data
    )
    return response.data
  },

  /**
   * Generate export URL for indicators Excel download
   */
  getIndikatorExportUrl(params: IndikatorFilterParams = {}): string {
    const searchParams = new URLSearchParams()
    if (params.search) searchParams.set('search', params.search)
    if (params.opd_id && params.opd_id !== 'all') searchParams.set('opd_id', params.opd_id)
    if (params.tujuan_penilaian_id && params.tujuan_penilaian_id !== 'all') {
      searchParams.set('tujuan_penilaian_id', params.tujuan_penilaian_id)
    }
    if (params.sasaran_penilaian_id && params.sasaran_penilaian_id !== 'all') {
      searchParams.set('sasaran_penilaian_id', params.sasaran_penilaian_id)
    }
    if (params.jenis && params.jenis !== 'all') {
      searchParams.set('jenis', params.jenis)
    }
    if (params.periode_penilaian_id) {
      searchParams.set('periode_penilaian_id', params.periode_penilaian_id)
    }
    const query = searchParams.toString()
    return `/api/perencanaan/iku/export${query ? `?${query}` : ''}`
  },
}
