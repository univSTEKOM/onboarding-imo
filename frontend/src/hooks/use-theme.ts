import { useThemeStore } from '@/lib/stores/theme.store'

/**
 * Reads and writes the app theme. Thin wrapper over {@link useThemeStore} kept
 * for call-site compatibility — the store is the single source of truth and
 * applies the DOM `dark` class via its own subscription.
 */
export const useTheme = () => {
  const isDark = useThemeStore((s) => s.isDark)
  const setTheme = useThemeStore((s) => s.setTheme)
  return { isDark, setTheme }
}
