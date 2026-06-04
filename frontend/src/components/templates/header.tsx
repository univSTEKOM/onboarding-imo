import { useState } from 'react'
import {
  Avatar,
  Dropdown,
  DropdownItem,
  DropdownMenu,
  DropdownTrigger,
  Skeleton,
} from '@heroui/react'
import { LogOut, UserCog } from 'lucide-react'
import { useNavigate } from '@tanstack/react-router'
import { useProfile } from '@/hooks/use-auth'
import { ThemeToggle } from '@/components/ui/theme-toggle'
import { FullscreenToggle } from '@/components/ui/fullscreen'
import { NotificationDropdown } from '@/components/templates/notification-dropdown'
import { ProfileDrawer } from '@/components/templates/profile'
import { logout } from '@/lib/services/auth.service'
import { HandwrittenArrow } from '@/components/ui/handwritten-arrow'

export const Header = () => {
  const { data: profile, isLoading } = useProfile()
  const navigate = useNavigate()
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)

  return (
    <>
      <header className="[view-transition-name:header] flex items-center justify-between lg:justify-end h-16 px-4 sm:px-6 lg:pl-10 top-0 z-30 bg-transparent">
        {/* Mobile Logo */}
        <div className="flex lg:hidden items-center gap-0">
          <div className="font-bold text-xl tracking-tight italic">
            <span className="text-[#F3AA28]">Nest</span>
            <span className="text-primary">plate</span>
          </div>
          <HandwrittenArrow size={24} className="text-primary mt-1 -ml-1" />
        </div>

        <div className="flex items-center gap-1 sm:gap-2">
          <FullscreenToggle variant="light" className="text-default-500" />
          <ThemeToggle variant="light" className="text-default-500" />
          <NotificationDropdown />

          <div className="flex items-center gap-3 ml-2 pl-2 border-l border-divider">
            {isLoading ? (
              <>
                <div className="flex flex-col items-end gap-1">
                  <Skeleton className="h-3 w-24 rounded-lg" />
                  <Skeleton className="h-3 w-16 rounded-lg" />
                </div>
                <Skeleton className="rounded-full w-10 h-10" />
              </>
            ) : (
              <Dropdown placement="bottom-end">
                <DropdownTrigger>
                  <div className="flex items-center gap-3 cursor-pointer transition-opacity hover:opacity-80">
                    <div className="hidden sm:flex flex-col items-end gap-1">
                      <p className="text-sm font-semibold leading-none">
                        {profile?.fullname}
                      </p>
                      <p className="text-xs text-default-500">
                        {profile?.email}
                      </p>
                    </div>
                    <Avatar
                      src={profile?.avatar?.url || undefined}
                      name={profile?.fullname?.charAt(0)}
                      isBordered
                      color="primary"
                      className="transition-transform"
                    />
                  </div>
                </DropdownTrigger>
                <DropdownMenu aria-label="Profile Actions" variant="flat">
                  <DropdownItem
                    key="info"
                    className="h-14 gap-2"
                    textValue="Signed in as"
                    onPress={() => void navigate({ to: '/profile' })}
                  >
                    <p className="font-semibold">Signed in as</p>
                    <p className="font-semibold">{profile?.email}</p>
                  </DropdownItem>
                  <DropdownItem
                    key="edit"
                    startContent={<UserCog size={18} />}
                    onPress={() => setIsDrawerOpen(true)}
                  >
                    Edit Profile
                  </DropdownItem>
                  <DropdownItem
                    key="logout"
                    color="danger"
                    startContent={<LogOut size={18} />}
                    onPress={() => logout()}
                  >
                    Log Out
                  </DropdownItem>
                </DropdownMenu>
              </Dropdown>
            )}
          </div>
        </div>
      </header>

      <ProfileDrawer
        isOpen={isDrawerOpen}
        onOpenChange={setIsDrawerOpen}
        user={profile || null}
      />
    </>
  )
}
