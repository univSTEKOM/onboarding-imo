import { Turnstile } from '@marsidev/react-turnstile'
import type { TurnstileInstance } from '@marsidev/react-turnstile'
import type { RefObject } from 'react'

interface TurnstileWidgetProps {
  widgetRef: RefObject<TurnstileInstance | null>
  onSuccess: (token: string) => void
  onError: () => void
  onExpire: () => void
}

const SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY as string | undefined

export function TurnstileWidget({
  widgetRef,
  onSuccess,
  onError,
  onExpire,
}: TurnstileWidgetProps) {
  if (!SITE_KEY) return null

  return (
    <Turnstile
      ref={widgetRef}
      siteKey={SITE_KEY}
      onSuccess={onSuccess}
      onError={onError}
      onExpire={onExpire}
      options={{ theme: 'light', size: 'normal' }}
    />
  )
}
