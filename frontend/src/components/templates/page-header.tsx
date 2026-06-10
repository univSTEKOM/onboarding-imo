import { BreadcrumbItem, Breadcrumbs } from '@heroui/react'

interface Breadcrumb {
  label: string
  href?: string
  isCurrent?: boolean
}

interface PageHeaderProps {
  title: string
  breadcrumbs?: Array<Breadcrumb>
  actions?: React.ReactNode
  children?: React.ReactNode
}

export function PageHeader({
  title,
  breadcrumbs = [],
  actions,
  children,
}: PageHeaderProps) {
  return (
    <>
      {/* Title — sticky on desktop (lg+), flows normally on mobile/tablet */}
      <div className="lg:sticky top-[28px] z-30 w-fit pb-2 lg:pb-10">
        <div className="inline-flex items-center px-4 sm:px-6 py-1.5 sm:py-2 bg-primary rounded-full shadow-lg shadow-primary/20 [view-transition-name:title]">
          <h1 className="text-xl sm:text-2xl font-normal text-white tracking-wide truncate max-w-[70vw] sm:max-w-none">
            {title}
          </h1>
        </div>
      </div>

      {/* Actions — pulled up on desktop to sit beside the title, stacks below on mobile/tablet */}
      {actions && (
        <div className="flex items-center justify-start lg:justify-end gap-2 h-auto lg:h-[58px] lg:-mt-[64px] mb-4 lg:mb-0">
          {actions}
        </div>
      )}

      {/* Non-sticky: breadcrumbs + children */}
      <div className="mb-6 mt-2 lg:mt-0">
        {breadcrumbs.length > 0 && (
          <div className="mb-1">
            <Breadcrumbs
              underline="hover"
              size="sm"
              itemClasses={{
                item: 'text-default-400 font-medium data-[current=true]:text-default-500',
                separator: 'text-default-300',
              }}
            >
              <BreadcrumbItem href="/">nestplate</BreadcrumbItem>
              {breadcrumbs.map((item, index) => (
                <BreadcrumbItem
                  key={index}
                  isCurrent={item.isCurrent}
                  href={item.href}
                >
                  {item.label}
                </BreadcrumbItem>
              ))}
            </Breadcrumbs>
          </div>
        )}

        {children && <div className="mt-4">{children}</div>}
      </div>
    </>
  )
}
