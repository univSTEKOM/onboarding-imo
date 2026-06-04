import { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { addToast } from '@heroui/react'
import type { ResetPasswordFormData } from '@/lib/schemas/auth'
import { resetPasswordSchema } from '@/lib/schemas/auth'
import { useAppMutation } from '@/hooks/use-mutations'
import { resetPassword } from '@/lib/services/auth.service'

/**
 * Form state, password-visibility toggles and submission for the
 * reset-password page.
 */
export function useResetPassword(token?: string) {
  const navigate = useNavigate()
  const [isPasswordVisible, setIsPasswordVisible] = useState(false)
  const [isConfirmVisible, setIsConfirmVisible] = useState(false)
  const [apiError, setApiError] = useState<string | null>(null)

  const form = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
  })

  const { mutate, isPending } = useAppMutation({
    mutationFn: ({ password }: { password: string }) =>
      resetPassword(token!, password),
    onSuccess: () => {
      addToast({
        title: 'Password Reset!',
        description: 'Your password has been updated. Please log in.',
        color: 'success',
      })
      void navigate({ to: '/login' })
    },
    onError: (error: unknown) => {
      setApiError(
        error instanceof Error ? error.message : 'Invalid or expired reset link.',
      )
    },
  })

  const onSubmit = form.handleSubmit((data) => {
    setApiError(null)
    mutate({ password: data.password })
  })

  return {
    ...form,
    isPending,
    apiError,
    isPasswordVisible,
    isConfirmVisible,
    togglePasswordVisibility: () => setIsPasswordVisible((v) => !v),
    toggleConfirmVisibility: () => setIsConfirmVisible((v) => !v),
    onSubmit,
  }
}
