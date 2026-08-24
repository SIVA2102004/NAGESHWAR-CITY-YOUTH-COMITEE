import React from 'react'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer
} from 'recharts'

interface DataPoint {
  name:   string
  amount: number
}

interface Props {
  data:   DataPoint[]
  height?: number
}

export default function CollectionChart({ data, height = 240 }: Props) {
  if (!data.length) {
    return <div className="flex items-center justify-center h-48 text-gray-400 text-sm">No data yet</div>
  }
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
        <defs>
          <linearGradient id="collectionGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%"  stopColor="#f57c00" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#f57c00" stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="#9ca3af" />
        <YAxis tick={{ fontSize: 11 }} stroke="#9ca3af" tickFormatter={(v) => `?${(v/1000).toFixed(0)}k`} />
        <Tooltip
          formatter={(value: any) => [`?${Number(value || 0).toLocaleString('en-IN')}`, 'Collection']}
          contentStyle={{ borderRadius: 8, border: '1px solid #f0f0f0', fontSize: 12 }}
        />
        <Area
          type="monotone"
          dataKey="amount"
          stroke="#f57c00"
          strokeWidth={2}
          fill="url(#collectionGrad)"
          name="Collection"
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}
