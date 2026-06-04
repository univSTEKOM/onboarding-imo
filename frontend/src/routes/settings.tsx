import { createFileRoute } from '@tanstack/react-router'
import { PageHeader } from '@/components/templates/page-header'
import { AppearanceSection } from '@/components/features/settings/appearance-section'
import { NotificationsSection } from '@/components/features/settings/notifications-section'
import { InstallSection } from '@/components/features/settings/install-section'
import { DataSection } from '@/components/features/settings/data-section'

export const Route = createFileRoute('/settings')({
  component: SettingsPage,
})

function SettingsPage() {
  return (
    <div>
      <PageHeader
        title="Settings"
        breadcrumbs={[{ label: 'Settings', isCurrent: true }]}
      />

      <div className="flex flex-col gap-4">
        <AppearanceSection />
        <NotificationsSection />
        <InstallSection />
        <DataSection />
      </div>
    </div>
  )
}

export default SettingsPage
