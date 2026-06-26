// The 8 tag colors. Muted/mid-tone hex values chosen to read as text on a
// low-opacity tint of themselves over cream/white backgrounds.
export const TAG_COLORS: { name: string; value: string }[] = [
  { name: 'slate',  value: '#64748B' },
  { name: 'red',    value: '#C0564B' },
  { name: 'amber',  value: '#B7791F' },
  { name: 'green',  value: '#3F7D5C' },
  { name: 'teal',   value: '#4A7C8C' },
  { name: 'blue',   value: '#3E6DA3' },
  { name: 'indigo', value: '#5A5AA8' },
  { name: 'purple', value: '#7E5AA2' },
]

// hex (#RRGGBB) → rgba string at the given alpha. Falls back to the hex itself.
export function tint(hex: string, alpha: number): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim())
  if (!m) return hex
  const n = parseInt(m[1], 16)
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`
}
