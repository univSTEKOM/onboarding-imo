// TODO: Replace placeholder cards and chart with real data for your application.
import { createFileRoute } from '@tanstack/react-router'
import {
  Activity,
  BarChart2,
  Shield,
  Users,
} from 'lucide-react'

import { PageHeader } from '@/components/templates/page-header'
import { StatCard } from '@/components/features/dashboard/stat-card'
import { QuickLinkCard } from '@/components/features/dashboard/quick-link-card'
import { ActivityChart } from '@/components/features/dashboard/activity-chart'
import { StatCardSkeleton } from '@/components/templates/skeletons'
import { useAuth, useProfile } from '@/hooks/use-auth'

const PLACEHOLDER_DATA = [
  { label: 'Mon', value: 12 },
  { label: 'Tue', value: 19 },
  { label: 'Wed', value: 8 },
  { label: 'Thu', value: 25 },
  { label: 'Fri', value: 17 },
  { label: 'Sat', value: 6 },
  { label: 'Sun', value: 21 },
]

export const Route = createFileRoute('/')({
  component: Dashboard,
})

function Dashboard() {
  const { user } = useAuth()
  const { data: profile, isLoading: profileLoading } = useProfile()
  const displayName = profile?.fullname?.split(' ')[0] || user?.email?.split('@')[0]

  return (
    <div className="flex flex-col w-full min-h-full pb-10 mx-auto">
      <PageHeader
        title={`Welcome back, ${displayName}`}
        breadcrumbs={[{ label: 'Overview', isCurrent: true }]}
      />

      {/* Stat cards — replace with real queries */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 w-full mb-6 mt-2">
        {profileLoading ? (
          Array.from({ length: 4 }).map((_, i) => <StatCardSkeleton key={i} />)
        ) : (
          <>
            <StatCard title="Metric A" value="—" icon={<Activity size={18} />} color="primary" />
            <StatCard title="Metric B" value="—" icon={<BarChart2 size={18} />} />
            <StatCard title="Metric C" value="—" icon={<Users size={18} />} color="warning" />
            <StatCard title="Metric D" value="—" icon={<Shield size={18} />} color="default" />
          </>
        )}
      </div>

      <ActivityChart
        title="Activity"
        description="Replace with real data from your API"
        data={PLACEHOLDER_DATA}
        className="mb-6"
      />

      {/* Quick links */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 w-full">
        <QuickLinkCard
          to="/users"
          title="Manage Users"
          description="View and manage team members"
          icon={<Users size={18} />}
          color="primary"
        />
        <QuickLinkCard
          to="/roles"
          title="Manage Roles"
          description="Configure roles and permissions"
          icon={<Shield size={18} />}
          color="primary"
        />
        <QuickLinkCard
          to="/media"
          title="Media Library"
          description="Browse and manage uploaded assets"
          icon={<Activity size={18} />}
          color="primary"
        />
      </div>
    </div>
  )
}
