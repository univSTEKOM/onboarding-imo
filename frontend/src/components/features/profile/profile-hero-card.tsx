import { Avatar, Button, Chip, Skeleton } from '@heroui/react'
import { Pencil } from 'lucide-react'
import type { UserProfile } from '@/types/auth'

interface ProfileHeroCardProps {
  profile: UserProfile | undefined
  isLoading: boolean
  onEdit: () => void
}

export function ProfileHeroCard({ profile, isLoading, onEdit }: ProfileHeroCardProps) {
  return (
    <div className="bg-white dark:bg-content1 rounded-3xl p-6 shadow-none">
      {isLoading ? (
        <HeroSkeleton />
      ) : (
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5">
          <Avatar
            src={profile?.avatar?.url || undefined}
            name={profile?.fullname?.charAt(0)}
            className="w-20 h-20 text-2xl shrink-0"
            isBordered
            color="primary"
          />

          <div className="flex-1 min-w-0 text-center sm:text-left">
            <p className="text-2xl font-bold tracking-tight text-foreground">
              {profile?.fullname || '—'}
            </p>
            <p className="text-sm text-default-500 mt-0.5">{profile?.email}</p>
            {profile?.roles?.length ? (
              <div className="flex flex-wrap justify-center sm:justify-start gap-1.5 mt-3">
                {profile.roles.map((role) => (
                  <Chip key={role.id} size="sm" color="primary" variant="flat" className="font-medium">
                    {role.name}
                  </Chip>
                ))}
              </div>
            ) : null}
          </div>

          <Button
            variant="flat"
            color="primary"
            startContent={<Pencil size={15} />}
            onPress={onEdit}
            className="font-medium shrink-0"
          >
            Edit Profile
          </Button>
        </div>
      )}
    </div>
  )
}

function HeroSkeleton() {
  return (
    <div className="flex items-center gap-5">
      <Skeleton className="w-20 h-20 rounded-full shrink-0" />
      <div className="flex-1 flex flex-col gap-2">
        <Skeleton className="h-7 w-48 rounded-lg" />
        <Skeleton className="h-4 w-36 rounded-lg" />
        <div className="flex gap-1.5 mt-1">
          <Skeleton className="h-6 w-20 rounded-full" />
          <Skeleton className="h-6 w-24 rounded-full" />
        </div>
      </div>
    </div>
  )
}
