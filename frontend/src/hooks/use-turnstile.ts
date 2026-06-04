import { useCallback, useRef, useState } from 'react'
import type { TurnstileInstance } from '@marsidev/react-turnstile'

export interface UseTurnstileReturn {
  token: string | null
  widgetRef: React.RefObject<TurnstileInstance | null>
  isVerified: boolean
  onSuccess: (token: string) => void
  onError: () => void
  onExpire: () => void
  reset: () => void
}

export function useTurnstile(): UseTurnstileReturn {
  const [token, setToken] = useState<string | null>(null)
  const widgetRef = useRef<TurnstileInstance | null>(null)

  const reset = useCallback(() => {
    widgetRef.current?.reset()
    setToken(null)
  }, [])

  const onSuccess = useCallback((receivedToken: string) => {
    setToken(receivedToken)
  }, [])

  const onError = useCallback(() => {
    setToken(null)
  }, [])

  const onExpire = useCallback(() => {
    setToken(null)
  }, [])

  return {
    token,
    widgetRef,
    isVerified: !!token,
    onSuccess,
    onError,
    onExpire,
    reset,
  }
}
