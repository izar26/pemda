export type UserStatus = 'active' | 'inactive' | 'suspended' | 'pending_activation'

export interface OpdItem {
  id: string
  nama: string
  kode: string
  kategori: string
  kepala?: string | null
  is_active: boolean
}

export interface AuthUser {
  id: string
  name: string
  email: string
  nip: string | null
  phone: string | null
  pangkat_gol?: string | null
  jabatan?: string | null
  opd_id?: string | null
  opd?: OpdItem | null
  role: string
  roles?: string[]
  permissions?: string[]
  status: UserStatus
  two_factor_enabled: boolean
  last_login_at?: string | null
  last_login_ip?: string | null
  created_at?: string | null
}

export interface LoginPayload {
  identifier: string
  password: string
}

export interface LoginDirectSuccessResponse {
  requires_2fa: false
  token: string
  token_type: string
  expires_in: number
  user: AuthUser
  message: string
}

export interface LoginTwoFactorRequiredResponse {
  requires_2fa: true
  temp_token: string
  expires_in: number
  message: string
}

export type LoginResponse =
  | LoginDirectSuccessResponse
  | LoginTwoFactorRequiredResponse

export interface VerifyTwoFactorPayload {
  code: string
}

export interface VerifyTwoFactorResponse {
  token: string
  token_type: string
  expires_in: number
  used_backup_code: boolean
  user: AuthUser
  message: string
}

export interface TwoFactorSetupResponse {
  secret: string
  qr_code_svg: string
  message: string
}

export interface TwoFactorConfirmResponse {
  message: string
  two_factor_enabled: boolean
  recovery_codes: string[]
}

export interface ForgotPasswordPayload {
  email: string
}

export interface ResetPasswordPayload {
  token: string
  email: string
  password: string
  password_confirmation: string
}

export interface ValidateActivationTokenResponse {
  message: string
  data: {
    name: string
    email: string
    role: string
    nip?: string | null
    phone?: string | null
    opd_id?: string | null
    opd?: OpdItem | null
    pangkat_gol?: string | null
    jabatan?: string | null
  }
}

export interface ActivateUserPayload {
  token: string
  name: string
  nip: string
  phone: string
  pangkat_gol: string
  jabatan: string
  opd_id: string
  password: string
  password_confirmation: string
}

export interface UpdateProfilePayload {
  name: string
  nip?: string | null
  phone?: string | null
  pangkat_gol?: string | null
  jabatan?: string | null
  opd_id?: string | null
}

export interface ActivateUserResponse {
  message: string
  user: AuthUser
}

export interface GenericMessageResponse {
  message: string
}

