import React, { useEffect, useState } from 'react'
import { Activity } from 'lucide-react'
import { useFestival } from '../../context/FestivalContext'
import { getActivityLogs } from '../../services/activityService'
import EmptyState from '../../components/ui/EmptyState'
import Badge from '../../components/ui/Badge'
import { formatDateTime } from '../../utils/formatters'
import type { ActivityLog } from '../../types'

const actionIcons: Record<string, string> = {
  USER_REGISTERED: '👤', CONTRIBUTION_CREATED: '💰', CONTRIBUTION_UPDATED: '✏️',
  CONTRIBUTION_DELETED: '🗑️', EXPENSE_CREATED: '💸', EXPENSE_UPDATED: '✏️',
  EXPENSE_DELETED: '🗑️', DEPARTMENT_CREATED: '🏛️', DEPARTMENT_UPDATED: '✏️',
  DEPARTMENT_DELETED: '🗑️', USER_BLOCKED: '🚫', USER_ACTIVATED: '✅',
  ANNOUNCEMENT_CREATED: '📢', FESTIVAL_CREATED: '🛕', INVITE_CODE_CREATED: '🔑',
}

export default function ActivityLogPage() {
  const { festival } = useFestival()
  const [logs, setLogs] = useState<ActivityLog[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!festival) return
    getActivityLogs(festival.id, 200)
      .then(setLogs)
      .finally(() => setLoading(false))
  }, [festival])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-gray-900">Activity Log</h1>
        <p className="text-gray-500 text-sm">{logs.length} recent activities</p>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-400">Loading...</div>
      ) : logs.length === 0 ? (
        <EmptyState icon={<Activity size={32} />} title="No activity yet" />
      ) : (
        <div className="bg-white rounded-2xl shadow-card divide-y divide-gray-50">
          {logs.map(log => (
            <div key={log.id} className="flex gap-4 px-5 py-4 hover:bg-gray-50 transition-colors">
              <span className="text-xl flex-shrink-0 mt-0.5">
                {actionIcons[log.action] || '🔔'}
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-gray-900 text-sm">{log.userName}</span>
                  <Badge variant={log.role === 'admin' ? 'danger' : log.role === 'volunteer' ? 'info' : 'default'} className="text-xs">
                    {log.role}
                  </Badge>
                  <span className="text-xs text-gray-400">{formatDateTime(log.timestamp)}</span>
                </div>
                <p className="text-sm text-gray-600 mt-0.5">{log.description}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
