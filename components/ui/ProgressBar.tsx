import type { ComputedStatus } from '@/lib/types'

const FILL: Record<ComputedStatus, string> = {
  green:  '#10B981',
  yellow: '#F59E0B',
  red:    '#EF4444',
}

interface ProgressBarProps {
  value: number        // 0–100
  status?: ComputedStatus
  className?: string
}

export function ProgressBar({ value, status = 'yellow', className = '' }: ProgressBarProps) {
  const pct = Math.min(100, Math.max(0, value))
  return (
    <div
      className={`w-full rounded-full ${className}`}
      style={{ height: 6, backgroundColor: '#E2E8F0' }}
    >
      <div
        className="h-full rounded-full transition-all duration-300"
        style={{ width: `${pct}%`, backgroundColor: FILL[status] }}
      />
    </div>
  )
}
