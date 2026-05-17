import { formatTime } from '@/lib/utils'
import { Badge } from '@/components/ui/Badge'
import type { ActivityItem } from '@/types'

interface ActivityFeedProps {
  activities: ActivityItem[]
  title?: string
}

const typeConfig: Record<
  ActivityItem['type'],
  { label: string; variant: 'success' | 'info' | 'neutral' | 'warning' }
> = {
  timesheet: { label: 'Timesheet', variant: 'info' },
  case_note: { label: 'Case Note', variant: 'success' },
  login: { label: 'Login', variant: 'neutral' },
  document: { label: 'Document', variant: 'warning' },
  client: { label: 'Client', variant: 'info' },
}

export function ActivityFeed({ activities, title = 'Recent Activity' }: ActivityFeedProps) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm h-full">
      <div className="px-6 py-4 border-b border-gray-50">
        <h3 className="text-base font-semibold text-gray-900">{title}</h3>
      </div>
      <div className="divide-y divide-gray-50">
        {activities.length === 0 ? (
          <div className="px-6 py-8 text-center text-sm text-gray-400">No recent activity</div>
        ) : (
          activities.map((activity) => {
            const config = typeConfig[activity.type]
            return (
              <div key={activity.id} className="px-6 py-3.5 flex items-start gap-3">
                <Badge variant={config.variant} className="mt-0.5 shrink-0">
                  {config.label}
                </Badge>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-900">{activity.description}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{activity.user}</p>
                </div>
                <p className="text-xs text-gray-400 shrink-0 mt-0.5">
                  {formatTime(activity.timestamp)}
                </p>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
