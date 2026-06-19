import {
  Database,
  Image as ImageIcon,
  Key,
  LayoutDashboard,
  Mail,
  NotebookPen,
  Settings,
  Shield,
  Users,
} from 'lucide-react'

export const SIDEBAR_EXPANDED_WIDTH = 260
export const SIDEBAR_COLLAPSED_WIDTH = 70

// Menu permission keys — control sidebar visibility
export const MENU_PERMISSIONS = {
  dashboard: 'menu.dashboard',
  users: 'menu.users',
  database: 'menu.database',
  roles: 'menu.roles',
  permissions: 'menu.permissions',
  media: 'menu.media',
  invitations: 'menu.invitations',
} as const

export type MenuPermissionKey =
  (typeof MENU_PERMISSIONS)[keyof typeof MENU_PERMISSIONS]

export type NavItem = {
  key: string
  label: string
  icon: React.ReactNode
  href?: string
  /** Data-level permission for accessing the resource (e.g., 'media.read') */
  permission?: string
  /** Menu-level permission for showing/hiding in sidebar (e.g., 'menu.users') */
  menuPermission?: MenuPermissionKey
  children?: Array<NavItem>
}

export type NavGroup = {
  title: string
  items: Array<NavItem>
}

export const sidebarData: Array<NavGroup> = [
  {
    title: 'Main',
    items: [
      {
        key: 'dashboard',
        icon: <LayoutDashboard size={20} />,
        label: 'Dashboard',
        href: '/',
        menuPermission: MENU_PERMISSIONS.dashboard,
      },
    ],
  },
  {
    title: 'Management',
    items: [
      {
        key: 'users',
        icon: <Users size={20} />,
        label: 'Users',
        href: '/users',
        menuPermission: MENU_PERMISSIONS.users,
        permission: 'users.read',
      },
      {
        key: 'invitations',
        icon: <Mail size={20} />,
        label: 'Invitations',
        href: '/invitations',
        menuPermission: MENU_PERMISSIONS.invitations,
        permission: 'users.invite',
      },
      {
        key: 'database',
        icon: <Database size={20} />,
        label: 'Database',
        menuPermission: MENU_PERMISSIONS.database,
        children: [
          {
            key: 'roles',
            icon: <Shield size={18} />,
            label: 'Roles',
            href: '/roles',
            menuPermission: MENU_PERMISSIONS.roles,
            permission: 'roles.read',
          },
          {
            key: 'permissions',
            icon: <Key size={18} />,
            label: 'Permissions',
            href: '/permissions',
            menuPermission: MENU_PERMISSIONS.permissions,
            permission: 'permissions.read',
          },
        ],
      },
      {
        key: 'media',
        icon: <ImageIcon size={20} />,
        label: 'Media Library',
        href: '/media',
        menuPermission: MENU_PERMISSIONS.media,
        permission: 'media.read',
      },
      {
        key: 'notes',
        icon: <NotebookPen size={20} />,
        label: 'Notes',
        href: '/notes',
        permission: 'notes.read',
      },
    ],
  },
  {
    title: 'Preferences',
    items: [
      {
        key: 'settings',
        icon: <Settings size={20} />,
        label: 'Settings',
        href: '/settings',
      },
    ],
  },
]

// Sidebar runtime state lives in `@/lib/stores/sidebar.store` (Zustand).
// This module only owns static navigation data, types, and width constants.
