import { tint } from './colors'
import type { Tag } from '@/lib/types'

// A single compact pill: color text/border on a ~15% tint of the same color.
export function TagPill({ tag }: { tag: Tag }) {
  return (
    <span
      className="inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-semibold leading-none"
      style={{ backgroundColor: tint(tag.color, 0.15), color: tag.color, border: `1px solid ${tint(tag.color, 0.35)}` }}
    >
      {tag.name}
    </span>
  )
}

// Renders up to `max` pills, then a muted "+N" for the remainder. Compact — meant
// to sit on one line below a task title without adding much height.
export function TagPills({ tags, max = 3 }: { tags?: Tag[]; max?: number }) {
  if (!tags || tags.length === 0) return null
  const shown = tags.slice(0, max)
  const extra = tags.length - shown.length
  return (
    <span className="inline-flex flex-wrap items-center gap-1">
      {shown.map(t => <TagPill key={t.id} tag={t} />)}
      {extra > 0 && (
        <span className="text-[10px] font-medium" style={{ color: '#94A3B8' }}>+{extra}</span>
      )}
    </span>
  )
}
