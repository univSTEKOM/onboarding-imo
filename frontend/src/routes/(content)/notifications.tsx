import { createFileRoute } from '@tanstack/react-router'
import { Button, Pagination, Spinner } from '@heroui/react'
import { Check, CheckCircle2, ExternalLink, Info, MailOpen } from 'lucide-react'
import { format } from 'date-fns'
import Lottie from 'lottie-react'

import emptyAnimation from '@/assets/lottie/empty.json'
import { PageHeader } from '@/components/templates/page-header'
import { useNotificationPage } from '@/hooks/use-notification-page'

export const Route = createFileRoute('/(content)/notifications')({
  component: NotificationsPage,
})

function NotificationsPage() {
  const {
    data,
    isLoading,
    page,
    setPage,
    unreadCount,
    handleNotificationClick,
    markAsReadMutation,
    markAllAsReadMutation,
  } = useNotificationPage()

  return (
    <div className="flex flex-col gap-0">
      <PageHeader
        title="Notifications"
        breadcrumbs={[{ label: 'Notifications', isCurrent: true }]}
        actions={
          unreadCount > 0 ? (
            <Button
              color="primary"
              variant="flat"
              startContent={<Check size={18} />}
              onPress={() => markAllAsReadMutation.mutate()}
              isLoading={markAllAsReadMutation.isPending}
            >
              Mark all as read
            </Button>
          ) : undefined
        }
      />

      <div className="mt-2">
        {isLoading ? (
          <div className="flex h-64 items-center justify-center">
            <Spinner size="lg" color="primary" label="Syncing notifications..." />
          </div>
        ) : !data?.data.length ? (
          <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
            <Lottie animationData={emptyAnimation} loop={true} className="w-72 h-72 opacity-60" />
            <p className="mt-4 text-xl font-semibold text-default-600">You're all caught up!</p>
            <p className="text-sm text-default-400 max-w-xs mt-2">
              Whenever you receive new updates, directives, or feedback, they will arrive here.
            </p>
          </div>
        ) : (
          <div className="bg-white/60 dark:bg-default-50/40 backdrop-blur-xl rounded-[2.5rem] overflow-hidden flex flex-col divide-y divide-default-100">
            {data.data.map((notification) => (
              <div
                key={notification.id}
                onClick={() => handleNotificationClick(notification)}
                className={`group relative flex items-start gap-6 p-7 cursor-pointer transition-all hover:bg-default-100/40 ${
                  !notification.isRead ? 'bg-primary-50/60 dark:bg-primary-900/30' : ''
                }`}
              >
                <div className="shrink-0">
                  <div
                    className={`p-3 rounded-2xl ${
                      notification.type === 'success'
                        ? 'bg-success-50 text-success-600 dark:bg-success-900/20'
                        : notification.type === 'error'
                          ? 'bg-danger-50 text-danger-600 dark:bg-danger-900/20'
                          : notification.type === 'warning'
                            ? 'bg-warning-50 text-warning-600 dark:bg-warning-900/20'
                            : 'bg-primary-50 text-primary-600 dark:bg-primary-900/20'
                    }`}
                  >
                    {notification.type === 'success' ? <CheckCircle2 size={24} /> : <Info size={24} />}
                  </div>
                </div>

                <div className="flex flex-col flex-1 gap-1.5 min-w-0">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-2 min-w-0">
                      <h3
                        className={`text-base font-bold truncate ${
                          !notification.isRead ? 'text-foreground' : 'text-default-600 font-semibold'
                        }`}
                      >
                        {notification.title}
                      </h3>
                      {!notification.isRead && (
                        <div className="h-3 w-3 rounded-full bg-primary shrink-0" />
                      )}
                    </div>
                    <span className="text-xs text-default-400 whitespace-nowrap font-bold uppercase tracking-wider">
                      {format(new Date(notification.createdAt), 'MMM d, HH:mm')}
                    </span>
                  </div>
                  <p className="text-sm text-default-500 leading-relaxed max-w-3xl">
                    {notification.message}
                  </p>
                  {notification.link && (
                    <div className="mt-3">
                      <Button
                        size="sm"
                        variant="flat"
                        color="primary"
                        className="font-bold px-6 rounded-full h-9"
                        endContent={<ExternalLink size={14} />}
                      >
                        View Details
                      </Button>
                    </div>
                  )}
                </div>

                <div className="shrink-0 flex items-center h-full opacity-0 group-hover:opacity-100 transition-opacity">
                  {!notification.isRead ? (
                    <Button
                      isIconOnly
                      size="sm"
                      variant="light"
                      className="rounded-full"
                      onPress={() => markAsReadMutation.mutate(notification.id)}
                    >
                      <MailOpen size={18} className="text-default-400 hover:text-primary transition-colors" />
                    </Button>
                  ) : (
                    <div className="w-8 h-8" />
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {data && data.meta.last_page > 1 && (
        <div className="flex justify-center mt-4">
          <Pagination
            total={data.meta.last_page}
            page={page}
            onChange={setPage}
            showControls
            color="primary"
            variant="flat"
          />
        </div>
      )}
    </div>
  )
}
