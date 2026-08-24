import React from 'react'
import { formatRelative } from '../../utils/formatters'
import type { ActivityLog } from '../../types'

const actionIcons: Record<string, string> = {
  USER_REGISTERED:       '👤',
  CONTRIBUTION_CREATED:  '💰',
  CONTRIBUTION_UPDATED:  '✏️',
  CONTRIBUTION_DELETED:  '🗑️',
  EXPENSE_CREATED:       '💸',
  EXPENSE_UPDATED:       '✏️',
  EXPENSE_DELETED:       '🗑️',
  DEPARTMENT_CREATED:    '🏛️',
  USER_BLOCKED:          '🚫',
  USER_ACTIVATED:        '✅',
  ANNOUNCEMENT_CREATED:  '📢',
}

interface Props {
  logs:   ActivityLog[]
  limit?: number
}

export default function ActivityFeed({ logs, limit = 10 }: Props) {
  const items = logs.slice(0, limit)

  if (items.length === 0) {
    return <p className="text-sm text-gray-400 text-center py-6">No recent activity</p>
  }

  return (
    <ul className="space-y-3">
      {items.map((log) => (
        <li key={log.id} className="flex gap-3 items-start">
          <span className="text-lg flex-shrink-0">
            {actionIcons[log.action] || '🔔'}
          </span>
          <div className="flex-1 min-w-0">
            <p className="text-sm text-gray-800 leading-snug">{log.description}</p>
            <p className="text-xs text-gray-400 mt-0.5">{formatRelative(log.timestamp)}</p>
          </div>
        </li>
      ))}
    </ul>
  )
}
