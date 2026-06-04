import { Link, createFileRoute } from '@tanstack/react-router'
import { zodValidator } from '@tanstack/zod-adapter'
import { Button, Card, CardBody, Input, Spinner } from '@heroui/react'
import {
  AlertTriangle,
  ArrowLeft,
  Eye,
  EyeOff,
  Lock,
  Mail,
  Phone,
  User,
} from 'lucide-react'
import { z } from 'zod'
import { AuthPageShell } from '@/components/templates/auth-page-shell'
import { useAuthGuard } from '@/hooks/use-auth'
import { useAcceptInvite } from '@/hooks/use-accept-invite'

const searchSchema = z.object({
  token: z.string().optional(),
})

export const Route = createFileRoute('/(auth)/accept-invite')({
  validateSearch: zodValidator(searchSchema),
  component: AcceptInvitePage,
})

function AcceptInvitePage() {
  useAuthGuard({ isAuthPage: true })

  const { token } = Route.useSearch()
  const {
    register,
    onSubmit,
    email,
    isInviteLoading,
    isInviteInvalid,
    isPending,
    apiError,
    isPasswordVisible,
    isConfirmVisible,
    togglePasswordVisibility,
    toggleConfirmVisibility,
    formState: { errors },
  } = useAcceptInvite(token)

  const showInvalid = !token || isInviteInvalid

  return (
    <AuthPageShell>
      <Card className="bg-white/80 backdrop-blur-md shadow-2xl border-0 w-full">
        <CardBody className="p-8 gap-6">
          {showInvalid ? (
            <InvalidInviteState />
          ) : isInviteLoading ? (
            <div className="flex flex-col items-center gap-4 py-8">
              <Spinner size="lg" color="success" />
              <p className="text-sm text-gray-500">Validating your invitation…</p>
            </div>
          ) : (
            <>
              <div className="text-center space-y-2">
                <div className="flex justify-center mb-4">
                  <div className="w-12 h-12 rounded-full bg-teal-50 flex items-center justify-center">
                    <User className="w-6 h-6 text-teal-600" />
                  </div>
                </div>
                <h1 className="text-2xl font-bold tracking-tight text-gray-900">
                  Set Up Your Account
                </h1>
                <p className="text-sm text-gray-500">
                  Complete the form below to finish creating your account
                </p>
              </div>

              {apiError && (
                <div className="flex items-start gap-2 rounded-lg bg-red-50 border border-red-100 px-4 py-3">
                  <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
                  <p className="text-sm text-red-600">{apiError}</p>
                </div>
              )}

              <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
                <Input
                  label="Email"
                  value={email ?? ''}
                  isReadOnly
                  startContent={<Mail className="w-4 h-4 text-gray-400" />}
                  variant="underlined"
                />

                <Input
                  {...register('fullname')}
                  label="Full Name"
                  placeholder="Enter your full name"
                  startContent={<User className="w-4 h-4 text-gray-400" />}
                  variant="underlined"
                  isRequired
                  isInvalid={!!errors.fullname}
                  errorMessage={errors.fullname?.message}
                />

                <Input
                  {...register('phone')}
                  label="Phone (optional)"
                  placeholder="Enter your phone number"
                  startContent={<Phone className="w-4 h-4 text-gray-400" />}
                  variant="underlined"
                  isInvalid={!!errors.phone}
                  errorMessage={errors.phone?.message}
                />

                <PasswordInput
                  label="Password"
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
                  Create Account
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
  registration: ReturnType<ReturnType<typeof useAcceptInvite>['register']>
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

function InvalidInviteState() {
  return (
    <div className="text-center space-y-4">
      <div className="flex justify-center">
        <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center">
          <AlertTriangle className="w-8 h-8 text-red-500" />
        </div>
      </div>
      <div className="space-y-2">
        <h1 className="text-xl font-bold tracking-tight text-gray-900">
          Invalid Invitation
        </h1>
        <p className="text-sm text-gray-500 leading-relaxed">
          This invitation link is missing, invalid, or has expired. Please ask an
          administrator to send you a new one.
        </p>
      </div>
      <BackToLogin />
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
