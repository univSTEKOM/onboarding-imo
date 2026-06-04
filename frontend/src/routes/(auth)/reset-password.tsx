import { Link, createFileRoute } from '@tanstack/react-router'
import { zodValidator } from '@tanstack/zod-adapter'
import { Button, Card, CardBody, Input } from '@heroui/react'
import { AlertTriangle, ArrowLeft, Eye, EyeOff, Lock } from 'lucide-react'
import { z } from 'zod'
import { AuthPageShell } from '@/components/templates/auth-page-shell'
import { useAuthGuard } from '@/hooks/use-auth'
import { useResetPassword } from '@/hooks/use-reset-password'

const searchSchema = z.object({
  token: z.string().optional(),
})

export const Route = createFileRoute('/(auth)/reset-password')({
  validateSearch: zodValidator(searchSchema),
  component: ResetPasswordPage,
})

function ResetPasswordPage() {
  useAuthGuard({ isAuthPage: true })

  const { token } = Route.useSearch()
  const {
    register,
    onSubmit,
    isPending,
    apiError,
    isPasswordVisible,
    isConfirmVisible,
    togglePasswordVisibility,
    toggleConfirmVisibility,
    formState: { errors },
  } = useResetPassword(token)

  return (
    <AuthPageShell>
      <Card className="bg-white/80 backdrop-blur-md shadow-2xl border-0 w-full">
        <CardBody className="p-8 gap-6">
          {!token ? (
            <MissingTokenState />
          ) : (
            <>
              <div className="text-center space-y-2">
                <div className="flex justify-center mb-4">
                  <div className="w-12 h-12 rounded-full bg-teal-50 flex items-center justify-center">
                    <Lock className="w-6 h-6 text-teal-600" />
                  </div>
                </div>
                <h1 className="text-2xl font-bold tracking-tight text-gray-900">
                  Set New Password
                </h1>
                <p className="text-sm text-gray-500">
                  Choose a strong password for your account
                </p>
              </div>

              {apiError && (
                <div className="flex items-start gap-2 rounded-lg bg-red-50 border border-red-100 px-4 py-3">
                  <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
                  <p className="text-sm text-red-600">
                    {apiError}{' '}
                    <Link
                      to="/forgot-password"
                      className="underline hover:text-red-700"
                    >
                      Request a new link.
                    </Link>
                  </p>
                </div>
              )}

              <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
                <PasswordInput
                  label="New Password"
                  registration={register('password')}
                  isVisible={isPasswordVisible}
                  onToggle={togglePasswordVisibility}
                  isInvalid={!!errors.password}
                  errorMessage={errors.password?.message}
                />

                <PasswordInput
                  label="Confirm Password"
                  registration={register('confirmPassword')}
                  isVisible={isConfirmVisible}
                  onToggle={toggleConfirmVisibility}
                  isInvalid={!!errors.confirmPassword}
                  errorMessage={errors.confirmPassword?.message}
                />

                <Button
                  type="submit"
                  className="w-full h-12 bg-teal-600 hover:bg-teal-700 text-white font-medium mt-2 disabled:opacity-60"
                  isLoading={isPending}
                  isDisabled={isPending}
                >
                  Reset Password
                </Button>
              </form>

              <BackToLogin />
            </>
          )}
        </CardBody>
      </Card>
    </AuthPageShell>
  )
}

function PasswordInput({
  label,
  registration,
  isVisible,
  onToggle,
  isInvalid,
  errorMessage,
}: {
  label: string
  registration: ReturnType<
    ReturnType<typeof useResetPassword>['register']
  >
  isVisible: boolean
  onToggle: () => void
  isInvalid: boolean
  errorMessage?: string
}) {
  return (
    <Input
      {...registration}
      label={label}
      placeholder="••••••••••••"
      type={isVisible ? 'text' : 'password'}
      startContent={<Lock className="w-4 h-4 text-gray-400" />}
      endContent={
        <button type="button" onClick={onToggle} className="focus:outline-none">
          {isVisible ? (
            <EyeOff className="w-4 h-4 text-gray-400" />
          ) : (
            <Eye className="w-4 h-4 text-gray-400" />
          )}
        </button>
      }
      variant="underlined"
      isRequired
      isInvalid={isInvalid}
      errorMessage={errorMessage}
    />
  )
}

function MissingTokenState() {
  return (
    <div className="text-center space-y-4">
      <div className="flex justify-center">
        <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center">
          <AlertTriangle className="w-8 h-8 text-red-500" />
        </div>
      </div>
      <div className="space-y-2">
        <h1 className="text-xl font-bold tracking-tight text-gray-900">
          Invalid Reset Link
        </h1>
        <p className="text-sm text-gray-500 leading-relaxed">
          This password reset link is missing or invalid. Please request a new
          one.
        </p>
      </div>
      <Link
        to="/forgot-password"
        className="inline-flex items-center gap-1.5 text-sm text-teal-600 hover:text-teal-700 hover:underline transition-colors font-medium"
      >
        Request a new link
      </Link>
    </div>
  )
}

function BackToLogin() {
  return (
    <div className="flex justify-center">
      <Link
        to="/login"
        className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-teal-600 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Login
      </Link>
    </div>
  )
}
