import { cn } from '@/lib/utils'
import Link from 'next/link'

interface MetricCardProps {
  title: string
  value: string | number
  subtitle?: string
  trend?: { value: string; positive: boolean }
  icon: React.ReactNode
  iconBg?: string
  action?: { label: string; href: string }
}

export function MetricCard({
  title,
  value,
  subtitle,
  trend,
  icon,
  iconBg = 'bg-[#004050]/10',
  action,
}: MetricCardProps) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
      <div className="flex items-start justify-between">
        <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center shrink-0', iconBg)}>
          {icon}
        </div>
        {trend && (
          <span
            className={cn(
              'text-xs font-medium px-2 py-1 rounded-full',
              trend.positive ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'
            )}
          >
            {trend.positive ? '↑' : '↓'} {trend.value}
          </span>
        )}
      </div>
      <div className="mt-4">
        <p className="text-3xl font-bold text-gray-900">{value}</p>
        <p className="text-sm font-medium text-gray-600 mt-1">{title}</p>
        {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
      </div>
      {action && (
        <Link
          href={action.href}
          className="mt-4 inline-flex items-center text-xs font-medium text-[#008080] hover:text-[#004050] transition-colors"
        >
          {action.label}
          <svg className="w-3 h-3 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </Link>
      )}
    </div>
  )
}
