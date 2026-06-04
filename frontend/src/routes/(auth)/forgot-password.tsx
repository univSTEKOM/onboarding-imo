import { Link, createFileRoute } from '@tanstack/react-router'
import { Button, Card, CardBody, Input } from '@heroui/react'
import { ArrowLeft, Mail, User } from 'lucide-react'
import { AuthPageShell } from '@/components/templates/auth-page-shell'
import { useAuthGuard } from '@/hooks/use-auth'
import { useForgotPassword } from '@/hooks/use-forgot-password'

export const Route = createFileRoute('/(auth)/forgot-password')({
  component: ForgotPasswordPage,
})

function ForgotPasswordPage() {
  useAuthGuard({ isAuthPage: true })

  const form = useForgotPassword()

  return (
    <AuthPageShell>
      <Card className="bg-white/80 backdrop-blur-md shadow-2xl border-0 w-full">
        <CardBody className="p-8 gap-6">
          {form.submitted ? <SuccessState /> : <FormState form={form} />}
        </CardBody>
      </Card>
    </AuthPageShell>
  )
}

function FormState({ form }: { form: ReturnType<typeof useForgotPassword> }) {
  const {
    register,
    onSubmit,
    isPending,
    formState: { errors },
  } = form

  return (
    <>
      <div className="text-center space-y-2">
        <div className="flex justify-center mb-4">
          <div className="w-12 h-12 rounded-full bg-teal-50 flex items-center justify-center">
            <Mail className="w-6 h-6 text-teal-600" />
          </div>
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">
          Forgot Password?
        </h1>
        <p className="text-sm text-gray-500">
          Enter your email and we'll send you a reset link
        </p>
      </div>

      <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
        <Input
          {...register('email')}
          label="Email"
          placeholder="Enter your email"
          type="email"
          startContent={<User className="w-4 h-4 text-gray-400" />}
          variant="underlined"
          isRequired
          isInvalid={!!errors.email}
          errorMessage={errors.email?.message}
        />

        <Button
          type="submit"
          className="w-full h-12 bg-teal-600 hover:bg-teal-700 text-white font-medium mt-2 disabled:opacity-60"
          isLoading={isPending}
          isDisabled={isPending}
        >
          Send Reset Link
        </Button>
      </form>

      <BackToLogin />
    </>
  )
}

function SuccessState() {
  return (
    <>
      <div className="text-center space-y-4">
        <div className="flex justify-center">
          <div className="w-16 h-16 rounded-full bg-teal-50 flex items-center justify-center">
            <Mail className="w-8 h-8 text-teal-600" />
          </div>
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">
            Check your email
          </h1>
          <p className="text-sm text-gray-500 leading-relaxed">
            If an account exists for that email, we've sent a password reset
            link. The link expires in 30 minutes.
          </p>
        </div>
        <p className="text-xs text-gray-400">
          Didn't receive an email? Check your spam folder.
        </p>
      </div>

      <BackToLogin />
    </>
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
