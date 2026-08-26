import React from 'react'

interface Props {
  title:     string
  value:     string | number
  icon:      React.ReactNode
  color?:    'orange' | 'green' | 'blue' | 'red' | 'purple' | 'teal' | 'amber' | 'gold' | 'yellow'
  subtitle?: string
  trend?:    { value: number; label: string }
}

const colorMap: Record<string, { bg: string; icon: string; text: string }> = {
  orange: { bg: 'bg-orange-50', icon: 'bg-orange-100 text-orange-600', text: 'text-orange-600' },
  amber:  { bg: 'bg-amber-50',  icon: 'bg-amber-100 text-amber-700',   text: 'text-amber-700'  },
  gold:   { bg: 'bg-yellow-50', icon: 'bg-yellow-100 text-yellow-700', text: 'text-yellow-700' },
  yellow: { bg: 'bg-yellow-50', icon: 'bg-yellow-100 text-yellow-700', text: 'text-yellow-700' },
  green:  { bg: 'bg-green-50',  icon: 'bg-green-100 text-green-600',   text: 'text-green-600'  },
  blue:   { bg: 'bg-blue-50',   icon: 'bg-blue-100 text-blue-600',     text: 'text-blue-600'   },
  red:    { bg: 'bg-red-50',    icon: 'bg-red-100 text-red-600',       text: 'text-red-600'    },
  purple: { bg: 'bg-purple-50', icon: 'bg-purple-100 text-purple-600', text: 'text-purple-600' },
  teal:   { bg: 'bg-teal-50',   icon: 'bg-teal-100 text-teal-600',     text: 'text-teal-600'   },
}

export default function StatCard({ title, value, icon, color = 'orange', subtitle, trend }: Props) {
  const c = colorMap[color] || colorMap.orange
  return (
    <div className={`stat-card ${c.bg}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-500 font-medium">{title}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
          {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
          {trend && (
            <p className={`text-xs font-medium mt-1 ${trend.value >= 0 ? 'text-green-600' : 'text-red-500'}`}>
              {trend.value >= 0 ? '↑' : '↓'} {Math.abs(trend.value)}% {trend.label}
            </p>
          )}
        </div>
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${c.icon}`}>
          {icon}
        </div>
      </div>
    </div>
  )
}
