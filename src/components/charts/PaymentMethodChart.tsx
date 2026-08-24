import React from 'react'
import {
  PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer
} from 'recharts'

interface DataPoint {
  name:  string
  value: number
}

interface Props {
  data: DataPoint[]
}

const COLORS = ['#f57c00', '#ffc107', '#ff5722', '#795548']

export default function PaymentMethodChart({ data }: Props) {
  const filtered = data.filter(d => d.value > 0)
  if (!filtered.length) {
    return <div className="flex items-center justify-center h-48 text-gray-400 text-sm">No data yet</div>
  }
  return (
    <ResponsiveContainer width="100%" height={220}>
      <PieChart>
        <Pie
          data={filtered}
          cx="50%"
          cy="50%"
          innerRadius={55}
          outerRadius={85}
          paddingAngle={3}
          dataKey="value"
        >
          {filtered.map((_, i) => (
            <Cell key={i} fill={COLORS[i % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip
          formatter={(value: any) => [`?${Number(value || 0).toLocaleString('en-IN')}`, '']}
          contentStyle={{ borderRadius: 8, border: '1px solid #f0f0f0', fontSize: 12 }}
        />
        <Legend
          formatter={(value) => <span style={{ fontSize: 11 }}>{value}</span>}
        />
      </PieChart>
    </ResponsiveContainer>
  )
}
