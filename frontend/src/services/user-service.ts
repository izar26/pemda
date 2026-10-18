import apiClient from '@/lib/api-client'
import type { User, UserStatus } from '@/features/users/data/schema'

export type JabatanPegawai = 'Kepala OPD' | 'Pegawai'

export interface CreatePegawaiPayload {
  name: string
  email: string
  nip: string
  phone: string
  opd_id: string
  pangkat_gol: string
  jabatan: JabatanPegawai
  replace_kepala?: boolean
}

export interface UpdatePegawaiPayload {
  name: string
  email: string
  nip: string
  phone: string
  opd_id: string
  pangkat_gol: string
  jabatan: JabatanPegawai
  replace_kepala?: boolean
}

export interface PegawaiQueryParams {
  search?: string
  opd_id?: string | number
  jabatan?: string
  has_account?: boolean
  page?: number
  per_page?: number
  sort_by?: string
  sort_direction?: 'asc' | 'desc'
}

export interface CheckKepalaOpdResponse {
  has_kepala: boolean
  kepala: User | null
}

export interface CreateUserAccountPayload {
  pegawai_id: string
  role: string
  password: string
  status: 'active' | 'inactive'
}

export interface UpdateUserAccountPayload {
  role: string
  status: 'active' | 'inactive'
  password?: string
}

export interface CreateUserPayload {
  name: string
  email: string
  nip: string
  phone: string
  role: string
  status?: UserStatus
  pangkat_gol: string
  jabatan: string
  opd_id: string
  password: string
}

export interface UpdateUserPayload {
  name: string
  email: string
  nip?: string
  phone?: string
  role: string
  status: UserStatus
  pangkat_gol?: string | null
  jabatan?: string | null
  opd_id?: string | null
  password?: string
}

export interface UserQueryParams {
  search?: string
  role?: string
  status?: string
  opd_id?: number | string
  page?: number
  per_page?: number
  sort_by?: string
  sort_direction?: 'asc' | 'desc'
}

export interface PaginatedUsersResponse {
  data: User[]
  links: {
    first: string | null
    last: string | null
    prev: string | null
    next: string | null
  }
  meta: {
    current_page: number
    from: number | null
    last_page: number
    per_page: number
    to: number | null
    total: number
  }
}

export interface InviteUserPayload {
  name: string
  email: string
  role: string
  opd_id: string
  jabatan: string
  notes: string
}

export interface InviteUserResponse {
  message: string
  user: User
  activation_url?: string
}

export const userService = {
  // === Manajemen Pegawai (Direktori ASN) ===
  async getPegawai(params?: PegawaiQueryParams): Promise<PaginatedUsersResponse> {
    const response = await apiClient.get<PaginatedUsersResponse>('/pegawai', { params })
    return response.data
  },

  async checkKepalaOpd(opdId: string, excludeId?: string | number): Promise<CheckKepalaOpdResponse> {
    const response = await apiClient.get<CheckKepalaOpdResponse>(`/pegawai/check-kepala/${opdId}`, {
      params: excludeId ? { exclude_id: excludeId } : undefined,
    })
    return response.data
  },

  async createPegawai(payload: CreatePegawaiPayload): Promise<User> {
    const response = await apiClient.post<{ data: User }>('/pegawai', payload)
    return response.data.data
  },

  async updatePegawai(id: string | number, payload: UpdatePegawaiPayload): Promise<User> {
    const response = await apiClient.put<{ data: User }>(`/pegawai/${id}`, payload)
    return response.data.data
  },

  async deletePegawai(id: string | number): Promise<{ message: string }> {
    const response = await apiClient.delete<{ message: string }>(`/pegawai/${id}`)
    return response.data
  },

  // === Manajemen Users (Akun Login & RBAC) ===
  async getUserAccounts(params?: UserQueryParams): Promise<PaginatedUsersResponse> {
    const response = await apiClient.get<PaginatedUsersResponse>('/user-accounts', { params })
    return response.data
  },

  async createUserAccount(payload: CreateUserAccountPayload): Promise<User> {
    const response = await apiClient.post<{ data: User }>('/user-accounts', payload)
    return response.data.data
  },

  async updateUserAccount(id: string | number, payload: UpdateUserAccountPayload): Promise<User> {
    const response = await apiClient.put<{ data: User }>(`/user-accounts/${id}`, payload)
    return response.data.data
  },

  async revokeUserAccount(id: string | number): Promise<{ message: string }> {
    const response = await apiClient.delete<{ message: string }>(`/user-accounts/${id}`)
    return response.data
  },

  async resetUserAccountTwoFactor(id: string | number): Promise<{ message: string }> {
    const response = await apiClient.post<{ message: string }>(`/user-accounts/${id}/reset-2fa`)
    return response.data
  },

  // === Legacy / Direct Endpoints ===
  async getUsers(params?: UserQueryParams): Promise<PaginatedUsersResponse> {
    const response = await apiClient.get<PaginatedUsersResponse>('/users', { params })
    return response.data
  },

  async getUser(id: string | number): Promise<User> {
    const response = await apiClient.get<{ data: User }>(`/users/${id}`)
    return response.data.data
  },

  async createUser(payload: CreateUserPayload): Promise<User> {
    const response = await apiClient.post<{ data: User }>('/users', payload)
    return response.data.data
  },

  async updateUser(id: string | number, payload: UpdateUserPayload): Promise<User> {
    const response = await apiClient.put<{ data: User }>(`/users/${id}`, payload)
    return response.data.data
  },

  async deleteUser(id: string | number): Promise<{ message: string }> {
    const response = await apiClient.delete<{ message: string }>(`/users/${id}`)
    return response.data
  },

  async resetTwoFactor(id: string | number): Promise<{ message: string }> {
    const response = await apiClient.post<{ message: string }>(`/users/${id}/reset-2fa`)
    return response.data
  },

  async inviteUser(payload: InviteUserPayload): Promise<InviteUserResponse> {
    const response = await apiClient.post<InviteUserResponse>('/users/invite', payload)
    return response.data
  },

  async resendInvitation(id: string | number): Promise<{ message: string; activation_url?: string }> {
    const response = await apiClient.post<{ message: string; activation_url?: string }>(
      `/users/${id}/resend-invitation`
    )
    return response.data
  },
}
