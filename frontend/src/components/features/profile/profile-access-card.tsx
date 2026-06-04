import { Chip, Divider, Skeleton } from '@heroui/react'
import { KeyRound, Shield } from 'lucide-react'
import type { UserProfile } from '@/types/auth'

interface ProfileAccessCardProps {
  profile: UserProfile | undefined
  isLoading: boolean
}

export function ProfileAccessCard({ profile, isLoading }: ProfileAccessCardProps) {
  return (
    <div className="bg-white dark:bg-content1 rounded-3xl p-5 shadow-none">
      <h3 className="font-semibold text-lg tracking-tight mb-4">Roles & Permissions</h3>

      {isLoading ? (
        <AccessSkeleton />
      ) : (
        <div className="flex flex-col gap-5">
          {/* Roles */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <Shield size={16} className="text-primary" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">Roles</p>
                <p className="text-xs text-default-400">
                  {profile?.roles?.length ?? 0} assigned
                </p>
              </div>
            </div>

            {profile?.roles?.length ? (
              <div className="flex flex-wrap gap-1.5 pl-1">
                {profile.roles.map((role) => (
                  <Chip key={role.id} size="sm" color="primary" variant="flat" className="font-medium">
                    {role.name}
                  </Chip>
                ))}
              </div>
            ) : (
              <p className="text-xs text-default-300 pl-1 italic">No roles assigned</p>
            )}
          </div>

          <Divider className="opacity-50" />

          {/* Permissions */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl bg-warning/10 flex items-center justify-center shrink-0">
                <KeyRound size={16} className="text-warning" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">Permissions</p>
                <p className="text-xs text-default-400">
                  {profile?.permissions?.length ?? 0} total
                </p>
              </div>
            </div>

            {profile?.permissions?.length ? (
              <div className="flex flex-wrap gap-1.5 max-h-44 overflow-y-auto pl-1">
                {profile.permissions.map((permission) => (
                  <Chip
                    key={permission.id}
                    size="sm"
                    variant="bordered"
                    className="text-tiny font-mono text-default-500"
                  >
                    {permission.name}
                  </Chip>
                ))}
              </div>
            ) : (
              <p className="text-xs text-default-300 pl-1 italic">No direct permissions</p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function AccessSkeleton() {
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <Skeleton className="w-9 h-9 rounded-xl shrink-0" />
          <div className="flex flex-col gap-1.5">
            <Skeleton className="h-3.5 w-10 rounded-md" />
            <Skeleton className="h-2.5 w-16 rounded-md" />
          </div>
        </div>
        <div className="flex gap-1.5 pl-1">
          <Skeleton className="h-6 w-24 rounded-full" />
          <Skeleton className="h-6 w-20 rounded-full" />
        </div>
      </div>
      <Divider className="opacity-50" />
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <Skeleton className="w-9 h-9 rounded-xl shrink-0" />
          <div className="flex flex-col gap-1.5">
            <Skeleton className="h-3.5 w-20 rounded-md" />
            <Skeleton className="h-2.5 w-12 rounded-md" />
          </div>
        </div>
        <div className="flex flex-wrap gap-1.5 pl-1">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-5 w-24 rounded-full" />
          ))}
        </div>
      </div>
    </div>
  )
}
