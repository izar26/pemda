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

  /** Check if user has a specific role */
  function hasRole(role: string): boolean {
    return (user?.roles?.includes(role) || user?.role === role) ?? false
  }

  /** Superadmin always has all access */
  const isSuperadmin = hasRole('Superadmin')

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
  }
}
