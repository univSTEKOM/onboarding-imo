import { useState } from 'react'
import { Link, createFileRoute } from '@tanstack/react-router'
import { zodValidator } from '@tanstack/zod-adapter'
import { Button, Card, CardBody, Input, Spinner } from '@heroui/react'
import { AlertTriangle, CheckCircle, Mail } from 'lucide-react'
import { z } from 'zod'
import { AuthPageShell } from '@/components/templates/auth-page-shell'
import { useVerifyEmail } from '@/hooks/use-verify-email'
import { useResendVerification } from '@/hooks/use-resend-verification'

const searchSchema = z.object({
  token: z.string().optional(),
})

export const Route = createFileRoute('/(auth)/verify-email')({
  validateSearch: zodValidator(searchSchema),
  component: VerifyEmailPage,
})

function VerifyEmailPage() {
  const { token } = Route.useSearch()
  const { status, message } = useVerifyEmail(token)

  return (
    <AuthPageShell>
      <Card className="bg-white/80 backdrop-blur-md shadow-2xl border-0 w-full">
        <CardBody className="p-8 gap-6">
          {status === 'loading' && <LoadingState />}
          {status === 'success' && <SuccessState message={message} />}
          {(status === 'error' || status === 'no-token') && (
            <ErrorState message={message} />
          )}
        </CardBody>
      </Card>
    </AuthPageShell>
  )
}

function LoadingState() {
  return (
    <div className="text-center space-y-4 py-4">
      <Spinner size="lg" color="success" />
      <p className="text-sm text-gray-500">Verifying your email address…</p>
    </div>
  )
}

function SuccessState({ message }: { message: string }) {
  return (
    <div className="text-center space-y-4">
      <div className="flex justify-center">
        <div className="w-16 h-16 rounded-full bg-teal-50 flex items-center justify-center">
          <CheckCircle className="w-8 h-8 text-teal-600" />
        </div>
      </div>
      <div className="space-y-2">
        <h1 className="text-xl font-bold tracking-tight text-gray-900">
          Email Verified!
        </h1>
        <p className="text-sm text-gray-500 leading-relaxed">
          {message || 'Your email has been verified successfully.'}
        </p>
      </div>
      <Button
        as={Link}
        to="/"
        className="w-full h-11 bg-teal-600 hover:bg-teal-700 text-white font-medium"
      >
        Go to Dashboard
      </Button>
    </div>
  )
}

function ErrorState({ message }: { message: string }) {
  const [email, setEmail] = useState('')
  const { state, resend } = useResendVerification()

  if (state === 'sent') {
    return (
      <div className="text-center space-y-4">
        <div className="flex justify-center">
          <div className="w-16 h-16 rounded-full bg-teal-50 flex items-center justify-center">
            <CheckCircle className="w-8 h-8 text-teal-600" />
          </div>
        </div>
        <div className="space-y-2">
          <h1 className="text-xl font-bold tracking-tight text-gray-900">
            Email Sent
          </h1>
          <p className="text-sm text-gray-500 leading-relaxed">
            If <span className="font-medium text-gray-700">{email}</span> is
            registered and unverified, a new link has been sent. Check your
            inbox and spam folder.
          </p>
        </div>
        <BackToLogin />
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div className="text-center space-y-3">
        <div className="flex justify-center">
          <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center">
            <AlertTriangle className="w-8 h-8 text-red-500" />
          </div>
        </div>
        <div className="space-y-2">
          <h1 className="text-xl font-bold tracking-tight text-gray-900">
            Verification Failed
          </h1>
          <p className="text-sm text-gray-500 leading-relaxed">
            {message || 'The verification link is invalid, expired, or already used.'}
          </p>
        </div>
      </div>

      <div className="space-y-3">
        <p className="text-sm font-medium text-gray-700">
          Resend verification email
        </p>
        <Input
          type="email"
          placeholder="Enter your email address"
          value={email}
          onValueChange={setEmail}
          variant="bordered"
          classNames={{ inputWrapper: 'border-gray-200' }}
        />
        {state === 'error' && (
          <p className="text-xs text-red-500">
            Failed to send. Please try again.
          </p>
        )}
        <Button
          className="w-full h-11 bg-teal-600 hover:bg-teal-700 text-white font-medium"
          startContent={
            state === 'loading' ? (
              <Spinner size="sm" color="white" />
            ) : (
              <Mail className="w-4 h-4" />
            )
          }
          isDisabled={state === 'loading' || !email.trim()}
          onPress={() => void resend(email)}
        >
          {state === 'loading' ? 'Sending…' : 'Resend Verification Email'}
        </Button>
      </div>

      <div className="text-center">
        <BackToLogin />
      </div>
    </div>
  )
}

function BackToLogin() {
  return (
    <Link
      to="/login"
      className="text-sm text-gray-500 hover:text-teal-600 transition-colors"
    >
      Back to Login
    </Link>
  )
}
