import apiClient from '@/lib/api-client'

export type SubmissionStatus =
  | 'draft'
  | 'submitted'
  | 'in_review'
  | 'revision_requested'
  | 'approved'

export type ItemStatus = 'draft' | 'submitted' | 'approved' | 'rejected'

export interface SubmissionItem {
  id: string
  pengajuan_id: string
  form_code: string
  status: ItemStatus
  catatan_revisi: string | null
  reviewed_at: string | null
  reviewed_by: {
    id: string
    name: string
  } | null
}

export interface SubmissionHistory {
  id: string
  pengajuan_id: string
  form_code: string | null
  action: string
  catatan: string | null
  created_at: string
  user: {
    id: string
    name: string
  } | null
}

export interface PengajuanPenilaianRisiko {
  id: string
  opd_id: string
  periode_penilaian_id: string
  auditor_id: string | null
  status: SubmissionStatus
  submitted_at: string | null
  approved_at: string | null
  catatan_umum: string | null
  opd?: {
    id: string
    kode: string
    nama: string
    kategori: string | null
  }
  periode_penilaian?: {
    id: string
    nama_periode: string
    tahun_mulai: number
    tahun_akhir: number
  }
  auditor?: {
    id: string
    name: string
    nip: string | null
    email: string
    jabatan: string | null
  } | null
  submitted_by?: {
    id: string
    name: string
  } | null
  approved_by?: {
    id: string
    name: string
  } | null
  items?: SubmissionItem[]
  histories?: SubmissionHistory[]
}

export interface MissingFormInfo {
  code: string
  name: string
  description: string
}

export interface ReadinessResponse {
  submission: PengajuanPenilaianRisiko
  has_auditor: boolean
  assigned_auditor: {
    id: string
    name: string
    nip: string | null
    email: string
    jabatan: string | null
  } | null
  is_2b_complete: boolean
  is_2c_complete: boolean
  all_forms_complete: boolean
  missing_forms: MissingFormInfo[]
  is_ready_to_submit: boolean
  is_locked: boolean
  status: SubmissionStatus
}

export interface OpdReviewListItem {
  id: string
  kode: string
  nama: string
  kategori: string | null
  auditor_assignments: {
    id: string
    auditor_id: string
    auditor: {
      id: string
      name: string
      nip: string | null
      email: string
    }
  }[]
  pengajuan_risiko?: PengajuanPenilaianRisiko[]
}

export interface OpdReviewListResponse {
  data: OpdReviewListItem[]
  meta: {
    current_page: number
    last_page: number
    per_page: number
    total: number
  }
}

export const pengajuanRisikoService = {
  /**
   * Get readiness & submission status for an OPD in current period.
   */
  async getReadiness(params: {
    opd_id?: string
    periode_penilaian_id?: string
  }): Promise<ReadinessResponse> {
    const response = await apiClient.get<{ data: ReadinessResponse }>(
      '/risiko/pengajuan/status',
      { params }
    )
    return response.data.data
  },

  /**
   * Submit completed risk forms to assigned auditor.
   */
  async submitForReview(payload: {
    opd_id: string
    periode_penilaian_id?: string
    catatan?: string
  }): Promise<{ message: string; data: PengajuanPenilaianRisiko }> {
    const response = await apiClient.post<{
      message: string
      data: PengajuanPenilaianRisiko
    }>('/risiko/pengajuan/submit', payload)
    return response.data
  },

  /**
   * Get list of OPD risk submissions for an auditor or inspectorate.
   */
  async getAuditorReviewList(
    params?: Record<string, any>
  ): Promise<OpdReviewListResponse> {
    const response = await apiClient.get<OpdReviewListResponse>(
      '/pengawasan/review-risiko',
      { params }
    )
    return response.data
  },

  /**
   * Get detail of an OPD risk submission.
   */
  async getSubmissionDetail(
    submissionId: string
  ): Promise<PengajuanPenilaianRisiko> {
    const response = await apiClient.get<{ data: PengajuanPenilaianRisiko }>(
      `/pengawasan/review-risiko/${submissionId}`
    )
    return response.data.data
  },

  /**
   * Review a specific form item (Approve or Reject with mandatory revision notes).
   */
  async reviewItem(
    submissionId: string,
    payload: {
      form_code: string
      status: 'approved' | 'rejected'
      catatan_revisi?: string
    }
  ): Promise<{ message: string; data: SubmissionItem }> {
    const response = await apiClient.post<{
      message: string
      data: SubmissionItem
    }>(`/pengawasan/review-risiko/${submissionId}/item`, payload)
    return response.data
  },
}
