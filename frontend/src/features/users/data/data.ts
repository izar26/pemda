import { type UserStatus } from './schema'

export const statusBadgeMap = new Map<UserStatus, { label: string; className: string }>([
  [
    'active',
    {
      label: 'Aktif',
      className: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
    },
  ],
  [
    'pending_activation',
    {
      label: 'Menunggu Aktivasi',
      className: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20',
    },
  ],
  [
    'inactive',
    {
      label: 'Nonaktif',
      className: 'bg-muted text-muted-foreground border-border',
    },
  ],
  [
    'suspended',
    {
      label: 'Ditangguhkan',
      className: 'bg-destructive/10 text-destructive border-destructive/20',
    },
  ],
])

export const callTypes = new Map<UserStatus, string>([
  ['active', 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'],
  ['pending_activation', 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20'],
  ['inactive', 'bg-muted text-muted-foreground border-border'],
  ['suspended', 'bg-destructive/10 text-destructive border-destructive/20'],
])

