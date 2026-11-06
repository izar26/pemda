import apiClient from '@/lib/api-client'

export type SubmissionTier =
  | 'operator'
  | 'kepala_opd'
  | 'auditor'
  | 'pengawas'
  | 'completed'

export type SubmissionStatus =
  | 'draft'
  | 'submitted_to_kepala_opd'
  | 'revision_by_kepala_opd'
  | 'submitted_to_auditor'
  | 'in_review_auditor'
  | 'revision_by_auditor'
  | 'revision_to_operator'
  | 'submitted_to_pengawas'
  | 'in_review_pengawas'
  | 'revision_by_pengawas'
  | 'approved'
  // Legacy Aliases
  | 'submitted'
  | 'in_review'
  | 'revision_requested'

export type ItemStatus = 'draft' | 'submitted' | 'approved' | 'rejected'

export interface SubmissionItem {
  id: string
  pengajuan_id: string
  form_code: string
  status: ItemStatus
  status_kepala_opd?: string | null
  catatan_kepala_opd?: string | null
  status_auditor?: string | null
  catatan_auditor?: string | null
  status_pengawas?: string | null
  catatan_pengawas?: string | null
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
  kepala_opd_id?: string | null
  pengawas_id?: string | null
  status: SubmissionStatus
  current_tier: SubmissionTier
  submitted_at: string | null
  kepala_opd_approved_at?: string | null
  approved_by_kepala_opd_at?: string | null
  auditor_reviewed_at?: string | null
  approved_by_auditor_at?: string | null
  pengawas_approved_at?: string | null
  approved_by_pengawas_at?: string | null
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
  kepala_opd?: {
    id: string
    name: string
    nip: string | null
    email: string
    jabatan: string | null
  } | null
  pengawas?: {
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
  current_tier: SubmissionTier
  has_auditor: boolean
  assigned_auditor: {
    id: string
    name: string
    nip: string | null
    email: string
    jabatan: string | null
  } | null
  kepala_opd?: {
    id: string
    name: string
    nip: string | null
    email: string
    jabatan: string | null
  } | null
  is_2b_complete: boolean
  is_2c_complete: boolean
  is_2b_approved?: boolean
  is_2c_approved?: boolean
  form_statuses?: Record<string, ItemStatus>
  form_details?: Record<
    string,
    {
      form_code: string
      status: ItemStatus
      status_kepala_opd?: string | null
      catatan_kepala_opd?: string | null
      status_auditor?: string | null
      catatan_auditor?: string | null
      status_pengawas?: string | null
      catatan_pengawas?: string | null
      catatan_revisi?: string | null
      reviewed_at?: string | null
      reviewed_by?: {
        id: string
        name: string
      } | null
    }
  >
  rejection_notes?: Record<string, string | null>
  all_forms_complete: boolean
  missing_forms: MissingFormInfo[]
  is_ready_to_submit: boolean
  is_locked: boolean
  is_locked_for_operator: boolean
  can_submit_to_kepala: boolean
  can_review_kepala: boolean
  can_delegate_operator: boolean
  can_review_auditor: boolean
  can_forward_revision_auditor: boolean
  can_resubmit_pengawas: boolean
  can_review_pengawas: boolean
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

export interface PendingApprovalItem {
  id: string
  opd_id: string
  opd_nama: string
  opd_kode: string
  status: SubmissionStatus
  tier: SubmissionTier
  submitted_at: string | null
  action_type: string
  title: string
  url: string
  action_required_by?: 'operator' | 'kepala_opd' | 'auditor' | 'pengawas'
  catatan_terakhir?: string | null
  periode_nama?: string | null
}

export interface PendingCountsResponse {
  kepala_opd_pending: number
  auditor_pending: number
  pengawas_pending: number
  operator_action_required: boolean
  my_pending_total: number
  total_action_required?: number
  pending_items: PendingApprovalItem[]
}

export const pengajuanRisikoService = {
  /**
   * Get real-time pending approval counts for current user.
   */
  async getPendingCounts(params?: {
    periode_penilaian_id?: string
  }): Promise<PendingCountsResponse> {
    const response = await apiClient.get<{ data: PendingCountsResponse }>(
      '/risiko/pengajuan/pending-counts',
      { params }
    )
    return response.data.data
  },
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
   * Submit completed risk forms from Operator to Kepala OPD.
   */
  async submitToKepalaOpd(payload: {
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
   * Alias for backwards compatibility.
   */
  async submitForReview(payload: {
    opd_id: string
    periode_penilaian_id?: string
    catatan?: string
  }): Promise<{ message: string; data: PengajuanPenilaianRisiko }> {
    return this.submitToKepalaOpd(payload)
  },

  /**
   * Review by Kepala OPD (Approve or Reject internal submission).
   */
  async reviewByKepalaOpd(
    submissionId: string,
    payload: {
      status: 'approved' | 'rejected'
      catatan?: string
    }
  ): Promise<{ message: string; data: PengajuanPenilaianRisiko }> {
    const response = await apiClient.post<{
      message: string
      data: PengajuanPenilaianRisiko
    }>(`/risiko/pengajuan/${submissionId}/review-kepala`, payload)
    return response.data
  },

  /**
   * Delegate auditor revision down to Operator OPD.
   */
  async delegateToOperator(
    submissionId: string,
    payload?: {
      catatan?: string
    }
  ): Promise<{ message: string; data: PengajuanPenilaianRisiko }> {
    const response = await apiClient.post<{
      message: string
      data: PengajuanPenilaianRisiko
    }>(`/risiko/pengajuan/${submissionId}/delegate-operator`, payload || {})
    return response.data
  },

  /**
   * Get list of OPD risk submissions for an auditor or inspectorate.
   */
  async getAuditorReviewList(
    params?: Record<string, unknown>
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
   * Review a specific form item by Auditor (Approve or Reject with revision notes).
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

  /**
   * Auditor forwards Pengawas rejection to Kepala OPD.
   */
  async forwardRevisionFromAuditor(
    submissionId: string,
    payload?: {
      catatan?: string
    }
  ): Promise<{ message: string; data: PengajuanPenilaianRisiko }> {
    const response = await apiClient.post<{
      message: string
      data: PengajuanPenilaianRisiko
    }>(`/pengawasan/review-risiko/${submissionId}/forward-revision`, payload || {})
    return response.data
  },

  /**
   * Auditor resubmits clarification directly back to Pengawas.
   */
  async resubmitToPengawas(
    submissionId: string,
    payload?: {
      catatan?: string
    }
  ): Promise<{ message: string; data: PengajuanPenilaianRisiko }> {
    const response = await apiClient.post<{
      message: string
      data: PengajuanPenilaianRisiko
    }>(`/pengawasan/review-risiko/${submissionId}/resubmit-pengawas`, payload || {})
    return response.data
  },

  /**
   * Pengawas (Inspektorat) reviews a specific form item (Approve final or Reject to Auditor).
   */
  async reviewByPengawas(
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
    }>(`/pengawasan/review-risiko/${submissionId}/review-pengawas`, payload)
    return response.data
  },
}
