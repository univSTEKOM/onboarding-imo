import {
  Badge,
  Button,
  Card,
  CardBody,
  CardFooter,
  CardHeader,
  Divider,
  Popover,
  PopoverContent,
  PopoverTrigger,
  ScrollShadow,
  Spinner,
} from '@heroui/react'
import { Bell, Check, ExternalLink, Info } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { useNavigate } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import Lottie from 'lottie-react'
import emptyAnimation from '@/assets/lottie/empty.json'
import {
  useMarkAllAsRead,
  useMarkAsRead,
  useNotifications,
  useUnreadCount,
} from '@/hooks/use-notifications'

export const NotificationDropdown = () => {
  const navigate = useNavigate()
  const { data: notifications, isLoading } = useNotifications()
  const { data: unreadCount = 0 } = useUnreadCount()
  const markAsReadMutation = useMarkAsRead()
  const markAllAsReadMutation = useMarkAllAsRead()
  const [permission, setPermission] = useState<NotificationPermission>('default')
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setPermission(Notification.permission)
    }
  }, [])

  const requestPermission = async () => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      const result = await Notification.requestPermission()
      setPermission(result)
    }
  }

  const handleNotificationClick = (notification: any) => {
    if (!notification.isRead) {
      markAsReadMutation.mutate(notification.id)
    }
    setIsOpen(false)
    if (notification.link) {
      navigate({ to: notification.link })
    }
  }

  return (
    <Popover 
      isOpen={isOpen} 
      onOpenChange={setIsOpen}
      placement="bottom-end" 
      offset={10}
      classNames={{
        content: "p-0 border-none bg-transparent shadow-none",
      }}
    >
      <PopoverTrigger>
        <Button isIconOnly variant="light" className="text-default-500 hover:bg-default-100 transition-colors">
          <Badge
            color="danger"
            content={unreadCount}
            isInvisible={unreadCount === 0}
            shape="circle"
            size="sm"
            className="border-2 border-background"
          >
            <Bell size={20} />
          </Badge>
        </Button>
      </PopoverTrigger>
      <PopoverContent>
        <Card className="w-80 border-none shadow-2xl rounded-3xl bg-background/80 backdrop-blur-xl">
          <CardHeader className="flex items-center justify-between px-5 pt-5 pb-3">
            <span className="font-bold text-lg tracking-tight">Notifications</span>
            <div className="flex items-center gap-1">
              {permission === 'default' && (
                <Button
                  size="sm"
                  variant="flat"
                  color="warning"
                  onPress={requestPermission}
                  className="min-w-0 px-3 h-8 text-xs font-semibold rounded-full"
                >
                  Enable
                </Button>
              )}
              {unreadCount > 0 && (
                <Button
                  size="sm"
                  variant="light"
                  color="primary"
                  onPress={() => markAllAsReadMutation.mutate()}
                  isLoading={markAllAsReadMutation.isPending}
                  startContent={<Check size={14} />}
                  className="min-w-0 px-3 h-8 text-xs font-semibold rounded-full"
                >
                  Mark all read
                </Button>
              )}
            </div>
          </CardHeader>
          
          <Divider className="opacity-50" />

          <CardBody className="p-0 overflow-hidden">
            {isLoading ? (
              <div className="h-40 flex items-center justify-center">
                <Spinner size="sm" color="primary" />
              </div>
            ) : !notifications?.data.length ? (
              <div className="h-56 flex flex-col items-center justify-center text-center px-4">
                <Lottie
                  animationData={emptyAnimation}
                  loop={true}
                  className="w-32 h-32 opacity-50"
                />
                <span className="text-sm font-medium text-default-500">All caught up!</span>
              </div>
            ) : (
              <ScrollShadow className="max-h-[400px]">
                <div className="flex flex-col">
                  {notifications.data.map((notification) => (
                    <button
                      key={notification.id}
                      onClick={() => handleNotificationClick(notification)}
                      className={`flex items-start gap-4 p-5 text-left border-b border-default-50/50 transition-all hover:bg-default-100/50 active:scale-[0.98] outline-none focus-visible:bg-default-100 ${
                        !notification.isRead ? 'bg-primary-50/20' : ''
                      }`}
                    >
                      <div className="mt-0.5 shrink-0">
                        <div className={`p-2 rounded-2xl ${
                          notification.type === 'success' ? 'bg-success-50 text-success-600' :
                          notification.type === 'error' ? 'bg-danger-50 text-danger-600' :
                          notification.type === 'warning' ? 'bg-warning-50 text-warning-600' :
                          'bg-primary-50 text-primary-600'
                        }`}>
                          {notification.link ? <ExternalLink size={16} /> : <Info size={16} />}
                        </div>
                      </div>
                      <div className="flex flex-col flex-1 overflow-hidden gap-0.5">
                        <div className="flex justify-between items-start gap-2">
                          <span className={`text-sm font-bold truncate tracking-tight ${
                            !notification.isRead ? 'text-primary' : 'text-default-700'
                          }`}>
                            {notification.title}
                          </span>
                          <span className="text-[10px] text-default-400 whitespace-nowrap mt-1 font-medium">
                            {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                          </span>
                        </div>
                        <p className="text-xs text-default-500 line-clamp-2 leading-relaxed">
                          {notification.message}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              </ScrollShadow>
            )}
          </CardBody>

          <Divider className="opacity-50" />

          <CardFooter className="p-0 overflow-hidden rounded-b-3xl">
            <Button
              fullWidth
              variant="light"
              color="primary"
              className="h-12 font-bold text-sm rounded-none hover:bg-primary-50/50 transition-colors"
              onPress={() => {
                setIsOpen(false)
                navigate({ to: '/notifications' } as any)
              }}
            >
              View All Notifications
            </Button>
          </CardFooter>
        </Card>
      </PopoverContent>
    </Popover>
  )
}
