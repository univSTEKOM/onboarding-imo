import { Card, Skeleton } from '@heroui/react'

interface TableSkeletonProps {
  rows?: number
  columns?: number
}

const widthCycle = ['w-full', 'w-3/4', 'w-1/2'] as const

export function TableSkeleton({ rows = 8, columns = 5 }: TableSkeletonProps) {
  return (
    <div className="bg-white dark:bg-content1 rounded-3xl p-6 shadow-none">
      <Skeleton className="h-10 w-64 rounded-xl mb-4" />

      <div className="divide-y divide-default-100">
        {/* Header row */}
        <div className="flex gap-4 pb-3">
          {Array.from({ length: columns }).map((_, i) => (
            <Skeleton key={i} className="h-4 flex-1 rounded" />
          ))}
        </div>

        {/* Data rows */}
        {Array.from({ length: rows }).map((_, rowIdx) => (
          <div key={rowIdx} className="flex gap-4 py-3">
            {Array.from({ length: columns }).map((_, colIdx) => (
              <div key={colIdx} className="flex-1">
                <Skeleton
                  className={`h-4 rounded ${widthCycle[(rowIdx + colIdx) % 3]}`}
                />
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

export function StatCardSkeleton() {
  return (
    <Card className="bg-white dark:bg-content1 rounded-3xl p-6 shadow-none border-none">
      <div className="flex items-start justify-between">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-4 w-20 rounded-lg" />
          <Skeleton className="h-8 w-16 rounded-lg" />
        </div>
        <Skeleton className="w-10 h-10 rounded-2xl" />
      </div>
      <Skeleton className="h-3 w-28 rounded-lg mt-4" />
    </Card>
  )
}

export function PageHeaderSkeleton() {
  return (
    <div className="flex flex-col gap-2 mb-6 pt-4">
      <Skeleton className="h-3 w-32 rounded-lg" />
      <Skeleton className="h-8 w-48 rounded-xl" />
    </div>
  )
}
