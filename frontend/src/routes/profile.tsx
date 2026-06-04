import { createFileRoute } from '@tanstack/react-router'
import { useDisclosure } from '@heroui/react'
import { useProfile } from '@/hooks/use-auth'
import { PageHeader } from '@/components/templates/page-header'
import { ProfileDrawer } from '@/components/templates/profile'
import { ProfileHeroCard } from '@/components/features/profile/profile-hero-card'
import { ProfileDetailsCard } from '@/components/features/profile/profile-details-card'
import { ProfileAccessCard } from '@/components/features/profile/profile-access-card'

export const Route = createFileRoute('/profile')({
  component: ProfilePage,
})

function ProfilePage() {
  const { data: profile, isLoading } = useProfile()
  const { isOpen, onOpen, onOpenChange } = useDisclosure()

  return (
    <div>
      <PageHeader
        title="Profile"
        breadcrumbs={[{ label: 'Profile', isCurrent: true }]}
      />

      <div className="flex flex-col gap-6">
        <ProfileHeroCard profile={profile} isLoading={isLoading} onEdit={onOpen} />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ProfileDetailsCard profile={profile} isLoading={isLoading} />
          <ProfileAccessCard profile={profile} isLoading={isLoading} />
        </div>
      </div>

      <ProfileDrawer isOpen={isOpen} onOpenChange={onOpenChange} user={profile || null} />
    </div>
  )
}

export default ProfilePage
