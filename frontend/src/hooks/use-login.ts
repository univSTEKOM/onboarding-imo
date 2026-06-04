import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useGoogleLogin } from '@react-oauth/google'
import { addToast } from '@heroui/react'
import { useNavigate } from '@tanstack/react-router'
import type { LoginFormData } from '@/lib/schemas/auth'
import { useAuth } from '@/hooks/use-auth'
import { useTurnstile } from '@/hooks/use-turnstile'
import { loginSchema } from '@/lib/schemas/auth'

const TURNSTILE_ENABLED = !!import.meta.env.VITE_TURNSTILE_SITE_KEY

export function useLogin() {
  const { login, loginWithGoogle, isLoading } = useAuth()
  const navigate = useNavigate()
  const [isPasswordVisible, setIsPasswordVisible] = useState(false)

  const {
    token: turnstileToken,
    widgetRef: turnstileWidgetRef,
    isVerified: isTurnstileVerified,
    onSuccess: onTurnstileSuccess,
    onError: onTurnstileError,
    onExpire: onTurnstileExpire,
    reset: resetTurnstile,
  } = useTurnstile()

  const form = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
    mode: 'onBlur',
  })

  useEffect(() => {
    const persistedError = sessionStorage.getItem('auth_error')
    if (persistedError) {
      addToast({ title: 'Login Failed', description: persistedError, color: 'danger' })
      sessionStorage.removeItem('auth_error')
    }
  }, [])

  const onSubmit = async (data: LoginFormData) => {
    if (TURNSTILE_ENABLED && !isTurnstileVerified) {
      addToast({
        title: 'Security Check Required',
        description: 'Please complete the security verification before signing in.',
        color: 'warning',
      })
      return
    }

    const result = await login(data, turnstileToken ?? undefined)

    if (result.success) {
      void navigate({ to: '/' })
      addToast({
        title: 'Welcome back!',
        description: 'You have successfully logged in.',
        color: 'primary',
      })
    } else {
      resetTurnstile()
      addToast({
        title: 'Login Failed',
        description: result.error || 'Invalid email or password. Please try again.',
        color: 'danger',
      })
    }
  }

  const handleGoogleLogin = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      const result = await loginWithGoogle(tokenResponse.access_token)
      if (result.success) {
        void navigate({ to: '/' })
        addToast({
          title: 'Welcome back!',
          description: 'You have successfully logged in with Google.',
          color: 'primary',
        })
      } else {
        addToast({
          title: 'Login Failed',
          description: result.error || 'Account not found or Google login failed.',
          color: 'danger',
        })
      }
    },
    onError: () => {
      addToast({ title: 'Login Failed', description: 'Google authentication failed.', color: 'danger' })
    },
  })

  const togglePasswordVisibility = () => setIsPasswordVisible((v) => !v)

  return {
    ...form,
    isLoading,
    isPasswordVisible,
    togglePasswordVisibility,
    onSubmit: form.handleSubmit(onSubmit),
    handleGoogleLogin,
    // Turnstile
    turnstileWidgetRef,
    onTurnstileSuccess,
    onTurnstileError,
    onTurnstileExpire,
    isTurnstileReady: !TURNSTILE_ENABLED || isTurnstileVerified,
  }
}
