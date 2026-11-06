import { type LinkProps } from '@tanstack/react-router'

type User = {
  name: string
  email: string
  avatar: string
}

type Team = {
  name: string
  logo: React.ElementType
  plan: string
}

type BaseNavItem = {
  title: string
  badge?: string | number | React.ReactNode
  badgeVariant?: 'default' | 'secondary' | 'destructive' | 'outline' | 'warning'
  icon?: React.ElementType
  /** If set, this item only renders when the user holds this permission */
  requiredPermission?: string
  /** If set, this item only renders when user holds one of these roles */
  requiredRole?: string | string[]
  /** If true, user must have an assigned opd_id (e.g. Kepala OPD) */
  requiresOpd?: boolean
}

type NavLink = BaseNavItem & {
  url: LinkProps['to'] | (string & {})
  items?: never
}

type NavCollapsible = BaseNavItem & {
  items: (BaseNavItem & { url: LinkProps['to'] | (string & {}) })[]
  url?: never
}

type NavItem = NavCollapsible | NavLink

type NavGroup = {
  title: string
  items: NavItem[]
}

type SidebarData = {
  user: User
  teams: Team[]
  navGroups: NavGroup[]
}

export type { SidebarData, NavGroup, NavItem, NavCollapsible, NavLink }
