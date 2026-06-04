import { motion } from 'framer-motion'
import { HandwrittenArrow } from '@/components/ui/handwritten-arrow'

export function RouterPendingComponent() {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-background z-50 overflow-hidden">
      {/* Ambient glow blobs */}
      <motion.div
        className="absolute -top-40 -left-40 w-[520px] h-[520px] rounded-full bg-primary/10 blur-3xl pointer-events-none"
        animate={{ scale: [1, 1.25, 1], opacity: [0.4, 0.9, 0.4] }}
        transition={{ duration: 4.5, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute -bottom-40 -right-40 w-[440px] h-[440px] rounded-full bg-[#F3AA28]/10 blur-3xl pointer-events-none"
        animate={{ scale: [1.25, 1, 1.25], opacity: [0.9, 0.4, 0.9] }}
        transition={{ duration: 4.5, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* Content */}
      <motion.div
        className="flex flex-col items-center gap-8"
        initial={{ opacity: 0, y: 16, scale: 0.88 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: [0, 0, 0.2, 1] }}
      >
        {/* Logo */}
        <motion.div
          className="flex items-center gap-0"
          animate={{ opacity: [1, 0.45, 1] }}
          transition={{
            duration: 2.4,
            repeat: Infinity,
            ease: 'easeInOut',
            delay: 0.5,
          }}
        >
          <div className="font-bold text-7xl tracking-tight italic select-none">
            <span className="text-[#F3AA28]">Nest</span>
            <span className="text-primary">plate</span>
          </div>
          <HandwrittenArrow size={64} className="text-primary mt-4 -ml-2" />
        </motion.div>

        {/* Dot loader — primary · amber · primary */}
        <div className="flex items-center gap-2.5">
          {[0, 1, 2].map((i) => (
            <motion.span
              key={i}
              className={`block w-2 h-2 rounded-full ${i === 1 ? 'bg-[#F3AA28]' : 'bg-primary'}`}
              animate={{ opacity: [0.2, 1, 0.2], scale: [0.65, 1.35, 0.65] }}
              transition={{
                duration: 1.4,
                repeat: Infinity,
                delay: i * 0.22,
                ease: 'easeInOut',
              }}
            />
          ))}
        </div>
      </motion.div>
    </div>
  )
}
