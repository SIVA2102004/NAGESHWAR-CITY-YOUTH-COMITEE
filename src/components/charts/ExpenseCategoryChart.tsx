import React from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell
} from 'recharts'

interface DataPoint {
  name:  string
  value: number
}

interface Props {
  data:   DataPoint[]
  height?: number
}

const COLORS = [
  '#f57c00','#ffc107','#ff5722','#795548',
  '#e91e63','#9c27b0','#3f51b5','#2196f3','#4caf50','#009688','#607d8b'
]

export default function ExpenseCategoryChart({ data, height = 240 }: Props) {
  const filtered = data.filter(d => d.value > 0)
  if (!filtered.length) {
    return <div className="flex items-center justify-center h-48 text-gray-400 text-sm">No expenses yet</div>
  }
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={filtered} margin={{ top: 5, right: 10, left: 0, bottom: 40 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis
          dataKey="name"
          tick={{ fontSize: 10 }}
          angle={-35}
          textAnchor="end"
          stroke="#9ca3af"
        />
        <YAxis tick={{ fontSize: 11 }} stroke="#9ca3af" tickFormatter={(v) => `?${(v/1000).toFixed(0)}k`} />
        <Tooltip
          formatter={(value: any) => [`?${Number(value || 0).toLocaleString('en-IN')}`, 'Amount']}
          contentStyle={{ borderRadius: 8, border: '1px solid #f0f0f0', fontSize: 12 }}
        />
        <Bar dataKey="value" radius={[4, 4, 0, 0]}>
          {filtered.map((_, i) => (
            <Cell key={i} fill={COLORS[i % COLORS.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
