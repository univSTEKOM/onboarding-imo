import { useCallback, useRef } from 'react'
import { flushSync } from 'react-dom'
import { Moon, Sun } from 'lucide-react'
import { Button, cn } from '@heroui/react'
import type { ButtonProps } from '@heroui/react'
import { useThemeStore } from '@/lib/stores/theme.store'

interface ThemeToggleProps extends ButtonProps {
  duration?: number
}

export const ThemeToggle = ({
  className,
  duration = 400,
  ...props
}: ThemeToggleProps) => {
  const isDark = useThemeStore((s) => s.isDark)
  const buttonRef = useRef<HTMLButtonElement>(null)

  const toggleTheme = useCallback(async () => {
    if (!buttonRef.current) return

    // The store subscription toggles the `dark` class synchronously; running it
    // inside flushSync lets the view transition capture the before/after states.
    await document.startViewTransition(() => {
      flushSync(() => {
        useThemeStore.getState().toggle()
      })
    }).ready

    const { top, left, width, height } =
      buttonRef.current.getBoundingClientRect()
    const x = left + width / 2
    const y = top + height / 2
    const maxRadius = Math.hypot(
      Math.max(left, window.innerWidth - left),
      Math.max(top, window.innerHeight - top),
    )

    document.documentElement.animate(
      {
        clipPath: [
          `circle(0px at ${x}px ${y}px)`,
          `circle(${maxRadius}px at ${x}px ${y}px)`,
        ],
      },
      {
        duration,
        easing: 'ease-in-out',
        pseudoElement: '::view-transition-new(root)',
      },
    )
  }, [duration])

  return (
    <Button
      ref={buttonRef}
      onPress={toggleTheme}
      isIconOnly
      radius="full"
      color="primary"
      variant="light"
      className={cn('relative z-99999! cursor-pointer', className)}
      {...props}
    >
      {isDark ? (
        <Sun className="transition-colors duration-300 hover:text-yellow-400" />
      ) : (
        <Moon className="transition-colors duration-300 hover:text-slate-400" />
      )}
      <span className="sr-only">Toggle theme</span>
    </Button>
  )
}
