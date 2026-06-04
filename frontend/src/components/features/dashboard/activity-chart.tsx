import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Card, Skeleton } from '@heroui/react'

export interface ActivityChartPoint {
  label: string
  value: number
}

interface ActivityChartProps {
  title: string
  description?: string
  data: Array<ActivityChartPoint>
  color?: string
  loading?: boolean
  className?: string
}

interface TooltipPayloadItem {
  value: number
}

interface CustomTooltipProps {
  active?: boolean
  payload?: Array<TooltipPayloadItem>
  label?: string
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white dark:bg-content1 rounded-xl shadow-lg border border-default-100 px-3 py-2">
      <p className="text-xs text-default-500 mb-0.5">{label}</p>
      <p className="text-sm font-semibold text-default-800">
        {payload[0].value}
      </p>
    </div>
  )
}

export function ActivityChart({
  title,
  description,
  data,
  color = '#006FEE',
  loading = false,
  className,
}: ActivityChartProps) {
  return (
    <Card
      className={`bg-white dark:bg-content1 rounded-3xl p-6 shadow-none border-none${className ? ` ${className}` : ''}`}
    >
      <div className="mb-4">
        <h3 className="text-base font-semibold text-default-800">{title}</h3>
        {description && (
          <p className="text-xs text-default-400 mt-0.5">{description}</p>
        )}
      </div>

      {loading ? (
        <Skeleton className="h-[220px] w-full rounded-2xl" />
      ) : (
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart
            data={data.map((d) => ({ name: d.label, value: d.value }))}
            margin={{ top: 4, right: 4, left: -24, bottom: 0 }}
          >
            <defs>
              <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity={0.3} />
                <stop offset="100%" stopColor={color} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="#e4e4e7"
              vertical={false}
            />
            <XAxis
              dataKey="name"
              tick={{ fontSize: 12, fill: '#a1a1aa' }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis hide />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey="value"
              stroke={color}
              strokeWidth={2}
              fill="url(#areaGradient)"
              dot={false}
              activeDot={{ r: 4, strokeWidth: 0 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </Card>
  )
}
