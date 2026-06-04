import { createCrudModalStore } from './create-crud-modal-store'
import type { Role } from '@/types/auth'

/**
 * UI state for the Roles page modals:
 * - `form` — create / view / edit role (react-hook-form inside)
 * - `permissions` — assign permissions (selection modal)
 */
export const useRolesUiStore = createCrudModalStore<Role>(['form', 'permissions'])
