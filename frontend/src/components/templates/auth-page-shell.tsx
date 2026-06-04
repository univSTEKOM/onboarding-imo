import { motion } from 'framer-motion'
import workspaceBg from '@/assets/images/login-day.webp'

interface AuthPageShellProps {
  children: React.ReactNode
  /**
   * Shares the layout animation with the other auth cards so navigating
   * between them morphs the card. Disable for standalone screens such as the
   * verification gate.
   */
  morph?: boolean
}

/**
 * Full-screen, centered card layout shared by every auth page (login,
 * forgot/reset password, verify email) and the verification gate.
 */
export function AuthPageShell({ children, morph = true }: AuthPageShellProps) {
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
      <div className="absolute inset-0 bg-black/10" />
      <div className="relative z-10 w-full max-w-md mx-4 flex items-center justify-center min-h-[500px]">
        <motion.div
          layoutId={morph ? 'login-modal' : undefined}
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ type: 'spring', bounce: 0.2, duration: 0.5 }}
          className="w-full relative"
        >
          {children}
        </motion.div>
      </div>
    </div>
  )
}
