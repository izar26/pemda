import { useAuthStore } from '@/stores/auth-store'

const PERMISSION_ALIASES: Record<string, string> = {
  'penugasan_evaluator.view': 'penugasan_auditor.view',
  'penugasan_evaluator.create': 'penugasan_auditor.create',
  'penugasan_evaluator.edit': 'penugasan_auditor.edit',
  'penugasan_evaluator.delete': 'penugasan_auditor.delete',
  'penugasan_auditor.view': 'penugasan_evaluator.view',
  'penugasan_auditor.create': 'penugasan_evaluator.create',
  'penugasan_auditor.edit': 'penugasan_evaluator.edit',
  'penugasan_auditor.delete': 'penugasan_evaluator.delete',
}

const ROLE_ALIASES: Record<string, string[]> = {
  opd: ['Operator OPD', 'OPD'],
  'operator opd': ['Operator OPD', 'OPD'],
  auditor: ['Evaluator / Reviewer', 'Auditor'],
  'evaluator / reviewer': ['Evaluator / Reviewer', 'Auditor'],
  'evaluator/reviewer': ['Evaluator / Reviewer', 'Auditor'],
  evaluator: ['Evaluator / Reviewer', 'Auditor'],
  inspektorat: ['Koordinator Pengawas', 'Inspektorat'],
  'koordinator pengawas': ['Koordinator Pengawas', 'Inspektorat'],
  'admin office': ['Administrator', 'Admin Office'],
  administrator: ['Administrator', 'Admin Office'],
  admin: ['Administrator', 'Admin Office'],
  executive: ['Executive', 'Kepala OPD'],
  'kepala opd': ['Executive', 'Kepala OPD'],
}

/**
 * Helper to check if a user object holds a role (with modern/legacy alias normalization).
 */
export function userHasRole(
  user: { roles?: string[]; role?: string } | null | undefined,
  role: string
): boolean {
  if (!user) return false
  const userRoles = user.roles?.length
    ? user.roles
    : user.role
      ? [user.role]
      : []
  const normalizedTarget = role.toLowerCase()
  const allowedNames = ROLE_ALIASES[normalizedTarget] ?? [role]
  return userRoles.some((r) =>
    allowedNames.some((alias) => alias.toLowerCase() === r.toLowerCase())
  )
}

/**
 * Whether the user is permitted to access the Review Risiko module.
 * Restricted strictly to 3 operational roles (Kepala OPD with opd_id, Evaluator, Pengawas)
 * plus Regional Admin (Superadmin / Administrator).
 */
export function userCanAccessReviewRisiko(
  user:
    | {
        roles?: string[]
        role?: string
        permissions?: string[]
        opd_id?: string | number | null
      }
    | null
    | undefined
): boolean {
  if (!user) return false
  if (userHasRole(user, 'Superadmin') || userHasRole(user, 'Administrator')) {
    return true
  }
  const perms = user.permissions ?? []
  if (!perms.includes('review_risiko.view')) {
    return false
  }
  if (userHasRole(user, 'Koordinator Pengawas')) return true
  if (userHasRole(user, 'Evaluator / Reviewer')) return true
  if (userHasRole(user, 'Executive') && Boolean(user.opd_id)) return true
  return false
}

/**
 * Hook to check current user's permissions from the auth store.
 * Permissions are populated from the backend /auth/me response.
 */
export function usePermissions() {
  const user = useAuthStore((state) => state.auth.user)
  const permissions = user?.permissions ?? []

  /** Check if user has a specific permission */
  function hasPermission(permission: string): boolean {
    if (permissions.includes(permission)) return true
    const alias = PERMISSION_ALIASES[permission]
    return alias ? permissions.includes(alias) : false
  }

  /** Check if user has ALL of the specified permissions */
  function hasAllPermissions(perms: string[]): boolean {
    return perms.every((p) => permissions.includes(p))
  }

  /** Check if user has ANY of the specified permissions */
  function hasAnyPermission(perms: string[]): boolean {
    return perms.some((p) => permissions.includes(p))
  }

  /** Check if user has a specific role (including legacy/modern aliases) */
  function hasRole(role: string): boolean {
    return userHasRole(user, role)
  }

  /** Superadmin always has all access */
  const isSuperadmin = hasRole('Superadmin')
  const canAccessReviewRisiko = userCanAccessReviewRisiko(user)

  return {
    permissions,
    hasPermission: isSuperadmin
      ? () => true
      : hasPermission,
    hasAllPermissions: isSuperadmin
      ? () => true
      : hasAllPermissions,
    hasAnyPermission: isSuperadmin
      ? () => true
      : hasAnyPermission,
    hasRole,
    isSuperadmin,
    canAccessReviewRisiko,
  }
}
