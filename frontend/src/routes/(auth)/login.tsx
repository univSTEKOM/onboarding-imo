import { Link, createFileRoute } from '@tanstack/react-router'
import { Button, Card, CardBody, Divider, Input } from '@heroui/react'
import { Building2, Eye, EyeOff, Lock, LogIn, User } from 'lucide-react'
import { motion } from 'framer-motion'
import { HandwrittenArrow } from '@/components/ui/handwritten-arrow'
import { TurnstileWidget } from '@/components/ui/turnstile-widget'
import workspaceBg from '@/assets/images/login-day.webp'
import { useAuthGuard } from '@/hooks/use-auth'
import { useLogin } from '@/hooks/use-login'

export const Route = createFileRoute('/(auth)/login')({
  component: LoginPage,
})

function LoginPage() {
  useAuthGuard({ isAuthPage: true })

  const {
    register,
    onSubmit,
    handleGoogleLogin,
    isLoading,
    isPasswordVisible,
    togglePasswordVisibility,
    formState: { errors },
    turnstileWidgetRef,
    onTurnstileSuccess,
    onTurnstileError,
    onTurnstileExpire,
    isTurnstileReady,
  } = useLogin()

  return (
    <div
      className="min-h-screen w-full flex items-center justify-center relative overflow-hidden"
      style={{
        backgroundImage: `url(${workspaceBg})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      }}
    >
      {/* Overlay for better readability */}
      <div className="absolute inset-0 bg-black/10" />

      {/* Help Icons - Top Right */}
      <div className="fixed top-6 right-6 z-20 flex gap-2">
        <Button
          isIconOnly
          variant="flat"
          className="bg-white/80 backdrop-blur-sm shadow-sm"
          size="sm"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
          </svg>
        </Button>
      </div>

      {/* Login Card */}
      <div className="relative z-10 w-full max-w-md mx-4 flex items-center justify-center min-h-[500px]">
        <motion.div
          layoutId="login-modal"
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ type: 'spring', bounce: 0.2, duration: 0.5 }}
          className="w-full relative"
        >
          <Card className="bg-white/80 backdrop-blur-md shadow-2xl border-0 w-full">
            <CardBody className="p-8 gap-6">
              {/* Header */}
              <div className="text-center space-y-2">
                <h1 className="text-2xl font-bold flex items-center justify-center gap-2 tracking-tight">
                  Welcome to{' '}
                  <span className="italic">
                    <span className="text-[#F3AA28]">Nest</span>
                    <span className="text-primary">plate</span>
                  </span>
                  <HandwrittenArrow
                    size={32}
                    className="text-primary mt-2 -ml-4"
                  />
                </h1>
                <p className="text-sm text-gray-500">
                  Sign in to continue to your dashboard
                </p>
              </div>

              {/* Google Login Button */}
              <Button
                variant="flat"
                color="primary"
                startContent={
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                }
                onPress={() => handleGoogleLogin()}
              >
                <span className="text-teal-600 font-medium">
                  Login with Google
                </span>
              </Button>

              {/* SSO Login Button — full-page redirect into the OIDC flow */}
              <Button
                as="a"
                href="/api/auth/sso/login"
                variant="flat"
                color="primary"
                startContent={<Building2 className="w-5 h-5 text-teal-600" />}
              >
                <span className="text-teal-600 font-medium">
                  Sign in with Stekom SSO
                </span>
              </Button>

              {/* Divider */}
              <div className="flex items-center gap-4">
                <Divider className="flex-1" />
                <span className="text-gray-400 text-sm">or</span>
                <Divider className="flex-1" />
              </div>

              <form
                onSubmit={onSubmit}
                className="flex flex-col gap-4"
                noValidate
              >
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

                <Input
                  {...register('password')}
                  label="Password"
                  placeholder="••••••••••••"
                  type={isPasswordVisible ? 'text' : 'password'}
                  startContent={<Lock className="w-4 h-4 text-gray-400" />}
                  endContent={
                    <button
                      type="button"
                      onClick={togglePasswordVisibility}
                      className="focus:outline-none"
                    >
                      {isPasswordVisible ? (
                        <EyeOff className="w-4 h-4 text-gray-400" />
                      ) : (
                        <Eye className="w-4 h-4 text-gray-400" />
                      )}
                    </button>
                  }
                  variant="underlined"
                  isRequired
                  isInvalid={!!errors.password}
                  errorMessage={errors.password?.message}
                  classNames={{
                    label: 'text-gray-500 text-sm',
                    input: 'text-gray-800',
                    inputWrapper: 'border-gray-200',
                  }}
                />

                <div className="flex justify-end -mt-1">
                  <Link
                    to="/forgot-password"
                    className="text-xs text-teal-600 hover:text-teal-700 hover:underline transition-colors"
                  >
                    Forgot password?
                  </Link>
                </div>

                {/* Submit Button */}
                <Button
                  type="submit"
                  className="w-full h-12 bg-teal-600 hover:bg-teal-700 text-white font-medium mt-4 disabled:opacity-60"
                  isLoading={isLoading}
                  isDisabled={isLoading || !isTurnstileReady}
                  startContent={!isLoading && <LogIn className="w-4 h-4" />}
                >
                  Masuk
                </Button>
              </form>
            </CardBody>
          </Card>
        </motion.div>
      </div>

      {/* Cloudflare Turnstile — fixed bottom-left, outside the card */}
      <div className="fixed bottom-4 left-4 z-20">
        <TurnstileWidget
          widgetRef={turnstileWidgetRef}
          onSuccess={onTurnstileSuccess}
          onError={onTurnstileError}
          onExpire={onTurnstileExpire}
        />
      </div>
    </div>
  )
}
