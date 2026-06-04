import { useCallback, useEffect, useState } from 'react'
import { Maximize, Minimize } from 'lucide-react'
import { Button,  cn } from '@heroui/react'
import type {ButtonProps} from '@heroui/react';

interface FullscreenToggleProps extends ButtonProps {}

export const FullscreenToggle = ({
  className,
  ...props
}: FullscreenToggleProps) => {
  const [isFullscreen, setIsFullscreen] = useState(false)

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
    }

    document.addEventListener('fullscreenchange', handleFullscreenChange)
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange)
    }
  }, [])

  const toggleFullscreen = useCallback(async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen()
      } else {
        await document.exitFullscreen()
      }
    } catch (err) {
      console.error('Error toggling fullscreen:', err)
    }
  }, [])

  return (
    <Button
      onPress={toggleFullscreen}
      isIconOnly
      className={cn('cursor-pointer', className)}
      variant="light"
      {...props}
    >
      {isFullscreen ? (
        <Minimize
          size={22}
          className="transition-colors duration-300 text-default-500 hover:text-default-900"
        />
      ) : (
        <Maximize
          size={22}
          className="transition-colors duration-300 text-default-500 hover:text-default-900"
        />
      )}
      <span className="sr-only">Toggle fullscreen</span>
    </Button>
  )
}
