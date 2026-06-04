import { create } from 'zustand'
import { persist } from 'zustand/middleware'

/**
 * Background store — controls the app background style.
 *
 * Mirrors {@link useThemeStore}: persisted under `background-store`, with a
 * module-level subscription that applies the `data-background` attribute on
 * <html>. Seeds from the legacy raw-string `background` key on first load.
 */

export type BackgroundStyle = 'gradient' | 'neutral' | 'gray'

const VALID_STYLES: Array<BackgroundStyle> = ['gradient', 'neutral', 'gray']

interface BackgroundStore {
  style: BackgroundStyle
  setBackground: (style: BackgroundStyle) => void
}

const getInitialStyle = (): BackgroundStyle => {
  if (typeof window === 'undefined') return 'gradient'
  const legacy = localStorage.getItem('background') as BackgroundStyle | null
  return legacy && VALID_STYLES.includes(legacy) ? legacy : 'gradient'
}

export const useBackgroundStore = create<BackgroundStore>()(
  persist(
    (set) => ({
      style: getInitialStyle(),
      setBackground: (style) => set({ style }),
    }),
    { name: 'background-store' },
  ),
)

const applyBackground = (style: BackgroundStyle) => {
  if (typeof document === 'undefined') return
  document.documentElement.setAttribute('data-background', style)
}

applyBackground(useBackgroundStore.getState().style)
useBackgroundStore.subscribe((state) => applyBackground(state.style))
