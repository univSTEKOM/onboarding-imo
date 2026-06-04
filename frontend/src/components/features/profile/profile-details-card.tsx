import { Skeleton } from '@heroui/react'
import { AtSign, Calendar, Clock, Hash, Phone, User } from 'lucide-react'
import { format } from 'date-fns'
import type { UserProfile } from '@/types/auth'

interface ProfileDetailsCardProps {
  profile: UserProfile | undefined
  isLoading: boolean
}

export function ProfileDetailsCard({ profile, isLoading }: ProfileDetailsCardProps) {
  const rows = profile
    ? [
        { icon: User, label: 'Full Name', value: profile.fullname || '—' },
        { icon: AtSign, label: 'Email', value: profile.email },
        { icon: Phone, label: 'Phone', value: profile.phone || '—' },
        { icon: Hash, label: 'Account ID', value: `#${profile.id}`, mono: true },
        {
          icon: Calendar,
          label: 'Member Since',
          value: profile.createdAt ? format(new Date(profile.createdAt), 'MMMM d, yyyy') : '—',
        },
        {
          icon: Clock,
          label: 'Last Updated',
          value: profile.updatedAt ? format(new Date(profile.updatedAt), 'MMM d, yyyy · HH:mm') : '—',
        },
      ]
    : []

  return (
    <div className="bg-white dark:bg-content1 rounded-3xl p-5 shadow-none">
      <h3 className="font-semibold text-lg tracking-tight mb-4">Account Details</h3>

      <div className="flex flex-col">
        {isLoading
          ? Array.from({ length: 5 }).map((_, i) => <RowSkeleton key={i} last={i === 4} />)
          : rows.map((row, i) => (
              <DetailRow
                key={row.label}
                icon={row.icon}
                label={row.label}
                value={row.value}
                mono={row.mono}
                last={i === rows.length - 1}
              />
            ))}
      </div>
    </div>
  )
}

function DetailRow({
  icon: Icon,
  label,
  value,
  mono,
  last,
}: {
  icon: React.ElementType
  label: string
  value: string
  mono?: boolean
  last?: boolean
}) {
  return (
    <div className={`flex items-center gap-3 py-3 ${last ? '' : 'border-b border-default-50'}`}>
      <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
        <Icon size={16} className="text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-default-400">{label}</p>
        <p className={`text-sm font-semibold text-foreground truncate ${mono ? 'font-mono' : ''}`}>
          {value}
        </p>
      </div>
    </div>
  )
}

function RowSkeleton({ last }: { last?: boolean }) {
  return (
    <div className={`flex items-center gap-3 py-3 ${last ? '' : 'border-b border-default-50'}`}>
      <Skeleton className="w-9 h-9 rounded-xl shrink-0" />
      <div className="flex flex-col gap-1.5 flex-1">
        <Skeleton className="h-2.5 w-16 rounded-md" />
        <Skeleton className="h-3.5 w-32 rounded-md" />
      </div>
    </div>
  )
}
