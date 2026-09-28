import apiClient from '@/lib/api-client'
import type {
  ActivateUserPayload,
  ActivateUserResponse,
  AuthUser,
  ForgotPasswordPayload,
  GenericMessageResponse,
  LoginPayload,
  LoginResponse,
  ResetPasswordPayload,
  TwoFactorConfirmResponse,
  TwoFactorSetupResponse,
  ValidateActivationTokenResponse,
  VerifyTwoFactorResponse,
} from '@/types/auth'


export const authService = {
  /**
   * Primary authentication (Step 1)
   */
  async login(payload: LoginPayload): Promise<LoginResponse> {
    const response = await apiClient.post<LoginResponse>('/auth/login', payload)
    return response.data
  },

  /**
   * Two-factor verification (Step 2)
   */
  async verifyTwoFactor(
    tempToken: string,
    code: string
  ): Promise<VerifyTwoFactorResponse> {
    const response = await apiClient.post<VerifyTwoFactorResponse>(
      '/auth/2fa/verify',
      { code },
      {
        headers: {
          Authorization: `Bearer ${tempToken}`,
        },
      }
    )
    return response.data
  },

  /**
   * Get current authenticated user profile
   */
  async getProfile(): Promise<{ user: AuthUser }> {
    const response = await apiClient.get<{ user: AuthUser }>('/auth/me')
    return response.data
  },

  /**
   * Logout from current session
   */
  async logout(): Promise<void> {
    await apiClient.post('/auth/logout')
  },

  /**
   * Terminate all sessions across devices
   */
  async logoutAll(): Promise<void> {
    await apiClient.post('/auth/logout-all')
  },

  /**
   * Generate 2FA setup data (QR Code & recovery codes)
   */
  async setupTwoFactor(): Promise<TwoFactorSetupResponse> {
    const response = await apiClient.post<TwoFactorSetupResponse>(
      '/auth/2fa/setup'
    )
    return response.data
  },

  /**
   * Confirm and activate 2FA
   */
  async confirmTwoFactor(code: string): Promise<TwoFactorConfirmResponse> {
    const response = await apiClient.post<TwoFactorConfirmResponse>(
      '/auth/2fa/confirm',
      { code }
    )
    return response.data
  },

  /**
   * Disable 2FA
   */
  async disableTwoFactor(
    currentPassword: string
  ): Promise<{ message: string; two_factor_enabled: boolean }> {
    const response = await apiClient.post<{
      message: string
      two_factor_enabled: boolean
    }>('/auth/2fa/disable', {
      current_password: currentPassword,
    })
    return response.data
  },

  /**
   * Fetch remaining recovery codes
   */
  async getRecoveryCodes(): Promise<{ recovery_codes: string[] }> {
    const response = await apiClient.get<{ recovery_codes: string[] }>(
      '/auth/2fa/recovery-codes'
    )
    return response.data
  },

  /**
   * Regenerate new recovery codes
   */
  async regenerateRecoveryCodes(): Promise<{
    message: string
    recovery_codes: string[]
  }> {
    const response = await apiClient.post<{
      message: string
      recovery_codes: string[]
    }>('/auth/2fa/recovery-codes/regenerate')
    return response.data
  },

  /**
   * Request password reset email
   */
  async forgotPassword(payload: ForgotPasswordPayload): Promise<GenericMessageResponse> {
    const response = await apiClient.post<GenericMessageResponse>(
      '/auth/forgot-password',
      payload
    )
    return response.data
  },

  /**
   * Reset password with token
   */
  async resetPassword(payload: ResetPasswordPayload): Promise<GenericMessageResponse> {
    const response = await apiClient.post<GenericMessageResponse>(
      '/auth/reset-password',
      payload
    )
    return response.data
  },

  /**
   * Validate activation token
   */
  async validateActivationToken(token: string): Promise<ValidateActivationTokenResponse> {
    const response = await apiClient.get<ValidateActivationTokenResponse>(
      '/auth/validate-activation-token',
      {
        params: { token },
      }
    )
    return response.data
  },

  /**
   * Activate employee user account and set password
   */
  async activateUser(payload: ActivateUserPayload): Promise<ActivateUserResponse> {
    const response = await apiClient.post<ActivateUserResponse>(
      '/auth/activate',
      payload
    )
    return response.data
  },
}

