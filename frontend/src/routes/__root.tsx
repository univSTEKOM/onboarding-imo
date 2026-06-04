import {
  Link,
  Outlet,
  createRootRouteWithContext,
  useLocation,
} from '@tanstack/react-router'
import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools'
import { TanStackDevtools } from '@tanstack/react-devtools'
import { Button, ToastProvider } from '@heroui/react'
import { AnimatePresence, motion } from 'framer-motion'

import Lottie from 'lottie-react'
import TanStackQueryDevtools from '../integrations/tanstack-query/devtools'

import type { QueryClient } from '@tanstack/react-query'
import { Layout } from '@/components/templates/layout'
import { EmailVerificationGate } from '@/components/templates/email-verification-gate'
import notFoundAnimation from '@/assets/lottie/404.json'
import { SocketBridge } from '@/components/templates/socket-bridge'

interface MyRouterContext {
  queryClient: QueryClient
}

export const Route = createRootRouteWithContext<MyRouterContext>()({
  component: RootComponent,
  notFoundComponent: NotFound,
})

function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] w-full p-4">
      <div className="w-full max-w-md">
        <Lottie animationData={notFoundAnimation} loop={true} />
      </div>
      <h1 className="text-2xl font-bold text-gray-800 mt-2">Oops! Page Not Found</h1>
      <p className="text-gray-500 mb-6 text-center">
        We couldn't seem to find the page you are looking for.
      </p>
      <Button as={Link} to="/" color="primary" variant="flat" className="font-medium bg-teal-50 text-teal-600">
        Return to Dashboard
      </Button>
    </div>
  )
}

function RootComponent() {
  const location = useLocation()
  const isAuthPage = [
    '/login',
    '/forgot-password',
    '/reset-password',
    '/verify-email',
    '/accept-invite',
  ].includes(location.pathname)

  return (
    <>
      <SocketBridge />
      <AnimatePresence mode="wait">
        {isAuthPage ? (
          <motion.div
            key="auth"
            exit={{
              opacity: 0,
              scale: 1.06,
              transition: { duration: 0.28, ease: [0.4, 0, 1, 1] },
            }}
          >
            <Outlet />
          </motion.div>
        ) : (
          <motion.div
            key="app"
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{
              opacity: 1,
              scale: 1,
              transition: { duration: 0.38, ease: [0, 0, 0.2, 1] },
            }}
          >
            <EmailVerificationGate>
              <Layout>
                <Outlet />
              </Layout>
            </EmailVerificationGate>
          </motion.div>
        )}
      </AnimatePresence>
      <ToastProvider />
      <TanStackDevtools
        config={{
          position: 'bottom-right',
        }}
        plugins={[
          {
            name: 'Tanstack Router',
            render: <TanStackRouterDevtoolsPanel />,
          },
          TanStackQueryDevtools,
        ]}
      />
    </>
  )
}
