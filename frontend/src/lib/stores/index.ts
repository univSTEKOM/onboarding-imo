/**
 * Zustand store barrel.
 *
 * Convention: **Zustand owns client state**, react-query owns server state,
 * URL search params own table state, and react-hook-form owns form fields.
 *
 * - Global stores: auth, sidebar, theme, background, confirmation, socket.
 * - Feature UI stores: per-page modal/selection state, built from
 *   `createCrudModalStore`.
 */

// Global stores
export { useAuthStore } from './auth.store'
export { useSidebarStore, useSidebar, useSidebarWidth, useSidebarCollapsed } from './sidebar.store'
export { useThemeStore } from './theme.store'
export { useBackgroundStore } from './background.store'
export type { BackgroundStyle } from './background.store'
export { useConfirmationStore } from './confirmation.store'
export type { ConfirmationOptions } from './confirmation.store'
export { useSocketStore, useSocket } from './socket.store'

// Feature UI stores
export { createCrudModalStore } from './create-crud-modal-store'
export type {
  CrudModalStore,
  ModalSlot,
  OpenOptions,
} from './create-crud-modal-store'
export { useUsersUiStore } from './users-ui.store'
export { useRolesUiStore } from './roles-ui.store'
export { usePermissionsUiStore } from './permissions-ui.store'
export { useMediaUiStore } from './media-ui.store'
export { useInvitationsUiStore } from './invitations-ui.store'
export * from './notes-ui.store'
