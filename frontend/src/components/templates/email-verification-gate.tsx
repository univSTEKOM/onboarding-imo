import { Button, Card, CardBody, Spinner } from '@heroui/react'
import { CheckCircle, Mail } from 'lucide-react'
import { AuthPageShell } from './auth-page-shell'
import { useAuth } from '@/hooks/use-auth'
import { useEmailVerificationStatus } from '@/hooks/use-email-verification'
import { useResendVerification } from '@/hooks/use-resend-verification'

/**
 * Blocks the app behind a "verify your email" screen for authenticated users
 * whose address has not been verified. Verified users see `children` untouched.
 *
 * This is the UX layer only — the backend independently rejects unverified
 * requests via `JwtAuthGuard`.
 */
export function EmailVerificationGate({
  children,
}: {
  children: React.ReactNode
}) {
  const { logout } = useAuth()
  const { email, needsVerification } = useEmailVerificationStatus()
  const { state, resend } = useResendVerification()

  if (!needsVerification) {
    return <>{children}</>
  }

  const sent = state === 'sent'

  return (
    <AuthPageShell morph={false}>
      <Card className="bg-white/80 backdrop-blur-md shadow-2xl border-0 w-full">
        <CardBody className="p-8 gap-6">
          <div className="text-center space-y-4">
            <div className="flex justify-center">
              <div
                className={`w-14 h-14 rounded-full flex items-center justify-center ${
                  sent ? 'bg-green-50' : 'bg-teal-50'
                }`}
              >
                {sent ? (
                  <CheckCircle className="w-7 h-7 text-green-600" />
                ) : (
                  <Mail className="w-7 h-7 text-teal-600" />
                )}
              </div>
            </div>
            <div className="space-y-1.5">
              <h1 className="text-2xl font-bold tracking-tight text-gray-900">
                {sent ? 'Check your inbox' : 'Verify your email'}
              </h1>
              <p className="text-sm text-gray-500 leading-relaxed">
                {sent ? (
                  <>
                    A new verification link was sent to{' '}
                    <span className="font-medium text-gray-700">{email}</span>.
                    Check your inbox and spam folder.
                  </>
                ) : (
                  <>
                    A verification link was sent to{' '}
                    <span className="font-medium text-gray-700">{email}</span>.
                    Check your inbox and click the link to continue.
                  </>
                )}
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            {!sent && (
              <Button
                className="w-full h-12 bg-teal-600 hover:bg-teal-700 text-white font-medium"
                startContent={
                  state === 'loading' ? (
                    <Spinner size="sm" color="white" />
                  ) : (
                    <Mail className="w-4 h-4" />
                  )
                }
                isDisabled={state === 'loading'}
                onPress={() => email && void resend(email)}
              >
                {state === 'loading' ? 'Sending…' : 'Resend Verification Email'}
              </Button>
            )}
            {state === 'error' && (
              <p className="text-center text-xs text-red-500">
                Failed to send. Please try again.
              </p>
            )}
            <Button
              variant="flat"
              className="w-full h-12 text-gray-600"
              onPress={() => void logout()}
            >
              Log out
            </Button>
          </div>
        </CardBody>
      </Card>
    </AuthPageShell>
  )
}
