import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts'
import type { SeverityCount } from '../../types'

interface SeverityBreakdownProps {
  counts: SeverityCount
}

const SEVERITY_COLORS = {
  critical: '#ef4444',
  high: '#f97316',
  medium: '#eab308',
  low: '#3b82f6',
}

export default function SeverityBreakdown({ counts }: SeverityBreakdownProps) {
  const data = [
    { name: 'Critical', value: counts.critical, color: SEVERITY_COLORS.critical },
    { name: 'High', value: counts.high, color: SEVERITY_COLORS.high },
    { name: 'Medium', value: counts.medium, color: SEVERITY_COLORS.medium },
    { name: 'Low', value: counts.low, color: SEVERITY_COLORS.low },
  ]

  const total = data.reduce((sum, d) => sum + d.value, 0)

  return (
    <div>
      <h3 className="text-sm font-medium text-gray-400 mb-4">Findings by Severity</h3>
      {total === 0 ? (
        <div className="flex items-center justify-center h-32 text-gray-600 text-sm">
          No findings
        </div>
      ) : (
        <>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={data} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
              <XAxis
                dataKey="name"
                tick={{ fill: '#9ca3af', fontSize: 11 }}
                axisLine={{ stroke: '#374151' }}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: '#9ca3af', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#111827',
                  border: '1px solid #374151',
                  borderRadius: '8px',
                  fontSize: '12px',
                }}
                labelStyle={{ color: '#f9fafb' }}
                itemStyle={{ color: '#d1d5db' }}
              />
              <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>

          {/* Summary pills */}
          <div className="flex gap-2 mt-3 flex-wrap">
            {data.map((d) => (
              <div
                key={d.name}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gray-800 text-xs"
              >
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: d.color }}
                />
                <span className="text-gray-300">{d.name}</span>
                <span className="font-semibold text-white">{d.value}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
