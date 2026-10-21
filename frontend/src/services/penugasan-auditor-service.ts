import apiClient from '@/lib/api-client'

export interface AuditorUser {
  id: string
  name: string
  nip: string | null
  email: string
  jabatan: string | null
  roles?: { id: string; name: string }[]
  active_opd_count?: number
  auditor_assignments?: {
    id: string
    auditor_id: string
    opd_id: string
    is_active?: boolean
  }[]
}

export interface AssignedOpdInfo {
  id: string
  auditor_id: string
  opd_id: string
  periode_penilaian_id: string | null
  nomor_surat_tugas: string | null
  tanggal_mulai: string | null
  tanggal_selesai: string | null
  catatan: string | null
  is_active: boolean
  opd: {
    id: string
    kode?: string
    nama: string
    kategori?: string | null
  }
  periode_penilaian?: {
    id: string
    nama_periode?: string
    tahun_mulai?: number
    tahun_akhir?: number
  } | null
}

export interface AuditorWithAssignments {
  id: string
  name: string
  nip: string | null
  email: string
  jabatan: string | null
  roles?: { id: string; name: string }[]
  auditor_assignments: AssignedOpdInfo[]
}

export interface PenugasanAuditorStats {
  total_auditor_bertugas: number
  total_opd_tercover: number
  total_opd_belum_tercover: number
  total_penugasan_aktif: number
  total_opd_aktif: number
}

export interface AssignAuditorPayload {
  auditor_id: string
  opd_ids: string[]
  periode_penilaian_id?: string | null
  nomor_surat_tugas?: string | null
  tanggal_mulai?: string | null
  tanggal_selesai?: string | null
  catatan?: string | null
  is_active?: boolean
}

export interface UpdateAuditorAssignmentPayload {
  opd_ids: string[]
  periode_penilaian_id?: string | null
  nomor_surat_tugas?: string | null
  tanggal_mulai?: string | null
  tanggal_selesai?: string | null
  catatan?: string | null
  is_active?: boolean
}

export interface PenugasanAuditorResponse {
  data: AuditorWithAssignments[]
  meta: {
    current_page: number
    last_page: number
    per_page: number
    total: number
  }
}

export const penugasanAuditorService = {
  /**
   * Get list of auditors with their assigned OPDs (grouped view).
   */
  async getAuditorsWithAssignments(params?: Record<string, any>): Promise<PenugasanAuditorResponse> {
    const response = await apiClient.get<PenugasanAuditorResponse>(
      '/pengawasan/penugasan-auditor',
      { params }
    )
    return response.data
  },

  /**
   * Fetch statistical summary of auditor coverage.
   */
  async getStats(periodePenilaianId?: string): Promise<PenugasanAuditorStats> {
    const response = await apiClient.get<{ data: PenugasanAuditorStats }>(
      '/pengawasan/penugasan-auditor/stats',
      { params: { periode_penilaian_id: periodePenilaianId } }
    )
    return response.data.data
  },

  /**
   * Fetch eligible auditors list for dropdown selection.
   */
  async getEligibleAuditors(): Promise<AuditorUser[]> {
    const response = await apiClient.get<{ data: AuditorUser[] }>(
      '/pengawasan/penugasan-auditor/auditors'
    )
    return response.data.data
  },

  /**
   * Assign an auditor to one or more OPDs.
   */
  async createAssignment(
    payload: AssignAuditorPayload
  ): Promise<{ message: string; data: AssignedOpdInfo[] }> {
    const response = await apiClient.post<{ message: string; data: AssignedOpdInfo[] }>(
      '/pengawasan/penugasan-auditor',
      payload
    )
    return response.data
  },

  /**
   * Update/sync OPD assignments for a specific auditor.
   */
  async updateAssignment(
    auditorId: string,
    payload: UpdateAuditorAssignmentPayload
  ): Promise<{ message: string; data: AssignedOpdInfo[] }> {
    const response = await apiClient.put<{ message: string; data: AssignedOpdInfo[] }>(
      `/pengawasan/penugasan-auditor/${auditorId}`,
      payload
    )
    return response.data
  },

  /**
   * Delete a single assignment by assignment ID.
   */
  async deleteAssignment(id: string): Promise<{ message: string }> {
    const response = await apiClient.delete<{ message: string }>(
      `/pengawasan/penugasan-auditor/${id}`
    )
    return response.data
  },

  /**
   * Delete all assignments for an auditor.
   */
  async deleteAuditorAssignments(auditorId: string): Promise<{ message: string }> {
    const response = await apiClient.delete<{ message: string }>(
      `/pengawasan/penugasan-auditor/auditor/${auditorId}`
    )
    return response.data
  },
}
