import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { 
  Button, 
  Divider, 
  Drawer, 
  DrawerBody, 
  DrawerContent, 
  DrawerHeader,
  ScrollShadow,
  useDisclosure
} from '@heroui/react'
import { Menu, MoreHorizontal } from 'lucide-react'
import type { NavItem } from '@/lib/constants/sidebar'
import { useSidebarLogic } from '@/hooks/use-sidebar'

export const BottomNav = () => {
  const { 
    activeKey, 
    filteredSidebarData, 
    handleSelect,
  } = useSidebarLogic()
  
  const { isOpen, onOpen, onOpenChange } = useDisclosure()

  // Flatten all items for easier access
  const allItems = filteredSidebarData.flatMap(group => group.items)
  
  // Choose top 4 items for the bottom bar, rest go to "More"
  const topItems = allItems.slice(0, 4)

  return (
    <>
      <nav className="lg:hidden fixed bottom-6 left-6 right-6 z-50">
        <div className="bg-background/80 backdrop-blur-xl border border-divider rounded-full shadow-2xl px-3 py-2 flex items-center justify-around">
          {topItems.map((item) => {
            const isActive = activeKey === item.key
            return (
              <Button
                key={item.key}
                isIconOnly
                variant="light"
                onPress={() => handleSelect(item.key, item.href)}
                className={`relative h-12 w-12 rounded-full ${isActive ? 'text-primary' : 'text-default-500'}`}
              >
                {item.icon}
                {isActive && (
                  <motion.div
                    layoutId="active-tab"
                    className="absolute -bottom-1 w-1 h-1 bg-primary rounded-full"
                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                  />
                )}
              </Button>
            )
          })}
          
          <Button
            isIconOnly
            variant="light"
            onPress={onOpen}
            className="h-12 w-12 rounded-full text-default-500"
          >
            <Menu size={20} />
          </Button>
        </div>
      </nav>

      <Drawer 
        isOpen={isOpen} 
        onOpenChange={onOpenChange}
        placement="bottom"
        size="2xl"
        classNames={{
          base: 'rounded-t-[32px] bg-background/95 backdrop-blur-md',
          header: 'border-b border-divider/50',
          closeButton: 'top-4 right-4'
        }}
      >
        <DrawerContent>
          {(onClose) => (
            <>
              <DrawerHeader className="flex flex-col gap-1 items-center pb-2">
                <div className="w-12 h-1.5 bg-default-200 rounded-full mb-4" />
                <span className="text-lg font-bold">Navigation</span>
              </DrawerHeader>
              <DrawerBody className="pt-4 pb-10">
                <ScrollShadow className="max-h-[60vh]">
                  <div className="flex flex-col gap-6">
                    {filteredSidebarData.map((group, groupIdx) => (
                      <div key={group.title} className="flex flex-col gap-3">
                        <p className="text-xs font-bold text-default-400 uppercase tracking-widest px-4">
                          {group.title}
                        </p>
                        <div className="grid grid-cols-1 gap-1">
                          {group.items.map((item) => (
                            <MobileNavItem 
                              key={item.key} 
                              item={item} 
                              activeKey={activeKey}
                              onSelect={(key, href) => {
                                handleSelect(key, href)
                                onClose()
                              }}
                            />
                          ))}
                        </div>
                        {groupIdx < filteredSidebarData.length - 1 && <Divider className="mt-2 opacity-50" />}
                      </div>
                    ))}
                  </div>
                </ScrollShadow>
              </DrawerBody>
            </>
          )}
        </DrawerContent>
      </Drawer>
    </>
  )
}

const MobileNavItem = ({ 
  item, 
  activeKey, 
  onSelect 
}: { 
  item: NavItem, 
  activeKey: string,
  onSelect: (key: string, href?: string) => void
}) => {
  const isActive = activeKey === item.key
  const hasChildren = item.children && item.children.length > 0
  const [isExpanded, setIsExpanded] = useState(false)

  return (
    <div className="flex flex-col">
      <div 
        onClick={() => {
          if (hasChildren) {
            setIsExpanded(!isExpanded)
          } else {
            onSelect(item.key, item.href)
          }
        }}
        className={`
          flex items-center gap-4 px-4 py-3 rounded-2xl transition-all
          ${isActive ? 'bg-primary/10 text-primary font-bold' : 'text-default-600 active:bg-default-100'}
        `}
      >
        <span className={isActive ? 'text-primary' : 'text-default-500'}>
          {item.icon}
        </span>
        <span className="flex-1 text-base">{item.label}</span>
        {hasChildren && (
          <motion.div
            animate={{ rotate: isExpanded ? 90 : 0 }}
            className="text-default-400"
          >
            <MoreHorizontal size={18} />
          </motion.div>
        )}
      </div>
      
      <AnimatePresence>
        {hasChildren && isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden pl-12 flex flex-col gap-1 mt-1"
          >
            {item.children?.map(child => (
              <div
                key={child.key}
                onClick={() => onSelect(child.key, child.href)}
                className={`
                  py-2.5 px-4 rounded-xl text-sm transition-all
                  ${activeKey === child.key ? 'text-primary font-bold bg-primary/5' : 'text-default-500 active:text-default-900'}
                `}
              >
                {child.label}
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
