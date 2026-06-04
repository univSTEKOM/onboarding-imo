import { AnimatePresence, motion } from 'framer-motion'
import {
  Avatar,
  Button,
  Divider,
  Popover,
  PopoverContent,
  PopoverTrigger,
  ScrollShadow,
  Tooltip,
} from '@heroui/react'
import { ChevronRight, ChevronsLeft, LogOut } from 'lucide-react'
import { useNavigate } from '@tanstack/react-router'
import type { NavItem } from '@/lib/constants/sidebar'
import { HandwrittenArrow } from '@/components/ui/handwritten-arrow'
import { useSidebarLogic } from '@/hooks/use-sidebar'
import { logout } from '@/lib'

export {
  SIDEBAR_EXPANDED_WIDTH,
  SIDEBAR_COLLAPSED_WIDTH,
} from '@/lib/constants/sidebar'
export {
  useSidebar,
  useSidebarWidth,
  useSidebarCollapsed,
} from '@/lib/stores/sidebar.store'

const SidebarItem = ({
  item,
  isCollapsed,
  activeKey,
  isExpanded,
  onToggle,
  onSelect,
}: {
  item: NavItem
  isCollapsed: boolean
  activeKey: string
  isExpanded: boolean
  onToggle: (key: string) => void
  onSelect: (key: string, href?: string) => void
}) => {
  const isActive = activeKey === item.key
  const hasChildren = item.children && item.children.length > 0

  const handlePress = () => {
    if (hasChildren) {
      onToggle(item.key)
    } else {
      onSelect(item.key, item.href)
    }
  }

  const buttonClasses = `
    relative w-full flex items-center gap-3 min-h-[40px] h-10 rounded-lg cursor-pointer transition-all duration-200
    ${
      isActive
        ? 'bg-primary/10 text-primary font-medium'
        : 'text-default-500 hover:text-default-900 hover:bg-default-100'
    }
    ${isCollapsed ? 'justify-center px-0' : 'px-3'}
  `

  const ButtonContent = (
    <div
      className={buttonClasses}
      onClick={handlePress}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          handlePress()
        }
      }}
    >
      <span
        className={`shrink-0 transition-colors ${isActive ? 'text-primary' : 'text-default-500'}`}
      >
        {item.icon}
      </span>

      {!isCollapsed && (
        <motion.div
          initial={{ opacity: 0, width: 0 }}
          animate={{ opacity: 1, width: 'auto' }}
          exit={{ opacity: 0, width: 0 }}
          transition={{ duration: 0.2 }}
          className="flex-1 text-left truncate text-sm ml-1"
        >
          {item.label}
        </motion.div>
      )}

      {!isCollapsed && hasChildren && (
        <motion.span
          animate={{ rotate: isExpanded ? 90 : 0 }}
          transition={{ duration: 0.2 }}
          className="text-default-400"
        >
          <ChevronRight size={16} />
        </motion.span>
      )}
    </div>
  )

  // Collapsed state with children - show popover
  if (isCollapsed) {
    if (hasChildren) {
      return (
        <Popover placement="right-start" offset={10}>
          <PopoverTrigger>
            <div className="mb-1 w-full flex justify-center">
              {ButtonContent}
            </div>
          </PopoverTrigger>
          <PopoverContent className="p-2 min-w-[180px]">
            <div className="w-full flex flex-col gap-1">
              <p className="text-xs font-semibold text-default-400 px-2 py-1 mb-1">
                {item.label}
              </p>
              {item.children?.map((child) => (
                <button
                  key={child.key}
                  onClick={() => onSelect(child.key, child.href)}
                  className="w-full flex items-center gap-3 px-2 py-2 rounded-md hover:bg-default-100 text-default-600 transition-colors text-sm"
                >
                  {child.icon}
                  <span>{child.label}</span>
                </button>
              ))}
            </div>
          </PopoverContent>
        </Popover>
      )
    } else {
      // Collapsed without children - show tooltip
      return (
        <div className="mb-1">
          <Tooltip
            content={item.label}
            placement="right"
            offset={10}
            closeDelay={0}
          >
            <div className="w-full flex justify-center">{ButtonContent}</div>
          </Tooltip>
        </div>
      )
    }
  }

  // Expanded state
  return (
    <div className="mb-1">
      {ButtonContent}
      <AnimatePresence>
        {hasChildren && isExpanded && !isCollapsed && (
          <motion.div
            key="content"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="pl-9 space-y-1 mt-1">
              {item.children?.map((child) => (
                <SidebarItem
                  key={child.key}
                  item={child}
                  isCollapsed={isCollapsed}
                  activeKey={activeKey}
                  isExpanded={false}
                  onToggle={() => {}}
                  onSelect={onSelect}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export const Sidebar = () => {
  const {
    isCollapsed,
    setIsCollapsed,
    profile,
    activeKey,
    expandedKeys,
    filteredSidebarData,
    handleToggle,
    handleSelect,
    sidebarWidth,
  } = useSidebarLogic()
  const navigate = useNavigate()

  return (
    <motion.aside
      layout
      initial={false}
      animate={{ width: sidebarWidth }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className="[view-transition-name:sidebar] fixed left-4 top-4 bottom-4 rounded-3xl flex flex-col bg-background/70 backdrop-blur-md z-40"
    >
      <div
        className={`absolute ${isCollapsed ? '-right-10' : '-right-3'} top-5 z-50`}
      >
        <Button
          isIconOnly
          size="sm"
          variant="solid"
          color="primary"
          onPress={() => setIsCollapsed((prev) => !prev)}
          radius="full"
        >
          <ChevronsLeft
            className={`transition-all duration-300 ${isCollapsed ? 'rotate-180' : ''}`}
            size={18}
          />
        </Button>
      </div>

      <div
        className={`flex items-center ${isCollapsed ? 'justify-center' : 'px-6'} h-[80px] shrink-0`}
      >
        <AnimatePresence mode="wait">
          {isCollapsed ? (
            <motion.div
              key="collapsed-logo"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.2 }}
            >
              <HandwrittenArrow size={32} className="text-primary" />
            </motion.div>
          ) : (
            <motion.div
              key="expanded-logo"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.2 }}
              className="flex items-center gap-0"
            >
              <div className="font-bold text-2xl tracking-tight italic">
                <span className="text-[#F3AA28]">Nest</span>
                <span className="text-primary">plate</span>
              </div>
              <HandwrittenArrow size={32} className="text-primary mt-2 -ml-2" />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Navigation Items */}
      <ScrollShadow
        className="flex-1 overflow-x-hidden"
        style={{ padding: isCollapsed ? '12px 8px' : '12px 16px' }}
      >
        {filteredSidebarData.map((group, idx) => (
          <div
            key={`${group.title}-${idx}`}
            className={idx !== 0 ? 'mt-6' : ''}
          >
            {!isCollapsed ? (
              <div className="px-2 mb-2 text-xs font-semibold text-default-400 uppercase tracking-wider truncate">
                {group.title}
              </div>
            ) : (
              idx !== 0 && <Divider className="my-4 bg-default-200/50" />
            )}

            <div className="space-y-1">
              {group.items.map((item) => (
                <SidebarItem
                  key={item.key}
                  item={item}
                  isCollapsed={isCollapsed}
                  activeKey={activeKey}
                  isExpanded={expandedKeys.has(item.key)}
                  onToggle={handleToggle}
                  onSelect={handleSelect}
                />
              ))}
            </div>
          </div>
        ))}
      </ScrollShadow>

      {/* Developer Credit */}
      {!isCollapsed && (
        <div className="flex justify-center pb-3 shrink-0">
          <a
            href="https://andikads.vercel.app"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[10px] font-medium tracking-widest text-default-300 hover:text-default-500 transition-colors uppercase"
          >
            developer
          </a>
        </div>
      )}

      {/* User Footer */}
      <div className="p-3 border-t border-divider shrink-0">
        <div
          className={`flex items-center gap-3 p-2 rounded-xl transition-colors hover:bg-default-100 cursor-pointer ${
            isCollapsed ? 'justify-center' : ''
          }`}
          onClick={() => void navigate({ to: '/profile' })}
        >
          <Avatar
            src={profile?.avatar?.url || undefined}
            name={profile?.fullname?.charAt(0) || 'U'}
            size="sm"
            className="shrink-0"
          />
          <AnimatePresence>
            {!isCollapsed && (
              <motion.div
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: 'auto' }}
                exit={{ opacity: 0, width: 0 }}
                className="flex-1 min-w-0 overflow-hidden ml-1"
              >
                <p className="text-sm font-semibold text-foreground truncate">
                  {profile?.fullname || 'User'}
                </p>
                <p className="text-xs text-default-500 truncate">
                  {profile?.roles?.[0]?.name || 'Member'}
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          {!isCollapsed && (
            <Tooltip content="Logout">
              <Button
                isIconOnly
                size="sm"
                variant="light"
                className="text-default-400 hover:text-danger min-w-8"
                onPress={logout}
              >
                <LogOut size={16} />
              </Button>
            </Tooltip>
          )}
        </div>
      </div>
    </motion.aside>
  )
}
