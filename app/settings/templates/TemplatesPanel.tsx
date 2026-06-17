'use client'

import { useState } from 'react'
import { TASK_CATEGORIES } from '@/components/tasks/AddTaskModal'
import {
  customizeTemplate,
  resetToDefaults,
  addTemplate,
  updateTemplate,
  deleteTemplate,
  reorderTemplate,
} from './actions'
import type { ServiceType, TaskTemplate } from '@/lib/types'

const SERVICE_TYPES: { value: ServiceType; label: string }[] = [
  { value: 'full-burial', label: 'Full Burial'    },
  { value: 'graveside',   label: 'Graveside Only' },
  { value: 'cremation',   label: 'Cremation'      },
  { value: 'military',    label: 'Military Honors' },
]

interface TemplatesPanelProps {
  customTemplates: TaskTemplate[]
  systemTemplates: TaskTemplate[]
}

export function TemplatesPanel({ customTemplates: initCustom, systemTemplates }: TemplatesPanelProps) {
  const [activeTab,    setActiveTab]    = useState<ServiceType>('full-burial')
  const [custom,       setCustom]       = useState<TaskTemplate[]>(initCustom)
  const [editTarget,   setEditTarget]   = useState<TaskTemplate | null>(null)
  const [confirmReset, setConfirmReset] = useState(false)
  const [confirmDel,   setConfirmDel]   = useState<string | null>(null)
  const [addOpen,      setAddOpen]      = useState(false)
  const [addValues,    setAddValues]    = useState({ title: '', category: TASK_CATEGORIES[0], confirmation_hint: '', due_days_before: 1 })
  const [busy,         setBusy]         = useState(false)
  const [error,        setError]        = useState<string | null>(null)

  const customForTab = custom
    .filter(t => t.service_type === activeTab)
    .sort((a, b) => a.sort_order - b.sort_order)

  const systemForTab = systemTemplates
    .filter(t => t.service_type === activeTab)
    .sort((a, b) => a.sort_order - b.sort_order)

  const isCustomized = customForTab.length > 0
  const displayTemplates = isCustomized ? customForTab : systemForTab

  async function run<T>(fn: () => Promise<{ data?: T; error?: string }>, onSuccess?: (d?: T) => void) {
    setBusy(true)
    setError(null)
    const result = await fn()
    setBusy(false)
    if (result.error) { setError(result.error); return }
    onSuccess?.(result.data)
  }

  async function handleCustomize() {
    await run(() => customizeTemplate(activeTab), () => {
      const copies = systemForTab.map(t => ({ ...t, funeral_home_id: 'custom' }))
      setCustom(prev => [...prev, ...copies])
    })
  }

  async function handleReset() {
    await run(() => resetToDefaults(activeTab), () => {
      setCustom(prev => prev.filter(t => t.service_type !== activeTab))
      setConfirmReset(false)
    })
  }

  async function handleReorder(templateId: string, direction: 'up' | 'down') {
    await run(() => reorderTemplate(templateId, activeTab, direction), () => {
      setCustom(prev => {
        const forTab  = prev.filter(t => t.service_type === activeTab).sort((a, b) => a.sort_order - b.sort_order)
        const others  = prev.filter(t => t.service_type !== activeTab)
        const idx     = forTab.findIndex(t => t.id === templateId)
        const swapIdx = direction === 'up' ? idx - 1 : idx + 1
        if (swapIdx < 0 || swapIdx >= forTab.length) return prev
        const next = [...forTab]
        ;[next[idx].sort_order, next[swapIdx].sort_order] = [next[swapIdx].sort_order, next[idx].sort_order]
        return [...others, ...next]
      })
    })
  }

  async function handleSaveEdit(templateId: string, values: EditValues) {
    await run(
      () => updateTemplate(templateId, {
        title:             values.title.trim(),
        category:          values.category,
        confirmation_hint: values.confirmation_hint.trim(),
        due_days_before:   values.due_days_before,
      }),
      () => {
        setCustom(prev => prev.map(t =>
          t.id === templateId ? { ...t, ...values, title: values.title.trim(), confirmation_hint: values.confirmation_hint.trim() } : t
        ))
        setEditTarget(null)
      },
    )
  }

  async function handleDelete(templateId: string) {
    await run(() => deleteTemplate(templateId), () => {
      setCustom(prev => prev.filter(t => t.id !== templateId))
      setConfirmDel(null)
    })
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!addValues.title.trim() || !addValues.confirmation_hint.trim()) return
    await run(
      () => addTemplate(activeTab, {
        title:             addValues.title.trim(),
        category:          addValues.category,
        confirmation_hint: addValues.confirmation_hint.trim(),
        due_days_before:   addValues.due_days_before,
      }),
      (data) => {
        if (data) setCustom(prev => [...prev, data])
        setAddOpen(false)
        setAddValues({ title: '', category: TASK_CATEGORIES[0], confirmation_hint: '', due_days_before: 1 })
      },
    )
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold" style={{ color: '#0F172A' }}>Task Templates</h1>
        <p className="text-sm mt-0.5" style={{ color: '#475569' }}>
          Customize the tasks auto-generated when a new service is created.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b" style={{ borderColor: '#E2E8F0' }}>
        {SERVICE_TYPES.map(st => (
          <button
            key={st.value}
            type="button"
            onClick={() => { setActiveTab(st.value); setConfirmReset(false); setConfirmDel(null); setAddOpen(false); setError(null) }}
            className="px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition"
            style={{
              borderBottomColor: activeTab === st.value ? '#0D6E68' : 'transparent',
              color: activeTab === st.value ? '#0D6E68' : '#475569',
            }}
          >
            {st.label}
          </button>
        ))}
      </div>

      {error && (
        <div
          className="mb-4 rounded-lg border px-4 py-3 text-sm"
          style={{ backgroundColor: '#FEF2F2', borderColor: '#FECACA', color: '#991B1B' }}
        >
          {error}
        </div>
      )}

      {/* System default banner */}
      {!isCustomized && (
        <div
          className="mb-6 rounded-xl border p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
          style={{ backgroundColor: '#FFFBEB', borderColor: '#FDE68A' }}
        >
          <div>
            <p className="text-sm font-medium" style={{ color: '#92400E' }}>
              You are using the default template.
            </p>
            <p className="text-xs mt-0.5" style={{ color: '#92400E' }}>
              Customize it to match your workflow.
            </p>
          </div>
          <button
            type="button"
            onClick={handleCustomize}
            disabled={busy}
            className="flex-shrink-0 rounded-lg px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-60"
            style={{ backgroundColor: '#0D6E68' }}
          >
            {busy ? 'Copying…' : 'Customize This Template'}
          </button>
        </div>
      )}

      {/* Template rows */}
      <div className="space-y-2 mb-4">
        {displayTemplates.map((tpl, idx) => {
          if (confirmDel === tpl.id) {
            return (
              <div
                key={tpl.id}
                className="rounded-lg border p-4"
                style={{ backgroundColor: '#FEF2F2', borderColor: '#FECACA' }}
              >
                <p className="text-sm font-medium mb-3" style={{ color: '#991B1B' }}>
                  Delete &ldquo;{tpl.title}&rdquo;?
                </p>
                <div className="flex gap-2">
                  <button type="button" onClick={() => setConfirmDel(null)} className="rounded-lg border px-3 py-1.5 text-xs font-medium hover:bg-gray-50" style={{ borderColor: '#E2E8F0', color: '#475569' }}>Cancel</button>
                  <button type="button" onClick={() => handleDelete(tpl.id)} disabled={busy} className="rounded-lg px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60" style={{ backgroundColor: '#EF4444' }}>{busy ? 'Deleting…' : 'Delete'}</button>
                </div>
              </div>
            )
          }

          return (
            <div
              key={tpl.id}
              className="flex items-center gap-3 rounded-lg border px-4 py-3"
              style={{ backgroundColor: '#FFFFFF', borderColor: '#E2E8F0' }}
            >
              {isCustomized && (
                <div className="flex flex-col gap-0.5 flex-shrink-0">
                  <button
                    type="button"
                    onClick={() => handleReorder(tpl.id, 'up')}
                    disabled={busy || idx === 0}
                    className="p-0.5 rounded hover:opacity-60 disabled:opacity-20 transition"
                    style={{ color: '#94A3B8' }}
                    aria-label="Move up"
                  >
                    <ChevronUpIcon />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleReorder(tpl.id, 'down')}
                    disabled={busy || idx === displayTemplates.length - 1}
                    className="p-0.5 rounded hover:opacity-60 disabled:opacity-20 transition"
                    style={{ color: '#94A3B8' }}
                    aria-label="Move down"
                  >
                    <ChevronDownIcon />
                  </button>
                </div>
              )}

              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate" style={{ color: '#0F172A' }}>{tpl.title}</p>
                <p className="text-xs mt-0.5" style={{ color: '#94A3B8' }}>
                  {tpl.category} · {tpl.due_days_before}d before · {tpl.confirmation_hint}
                </p>
              </div>

              {isCustomized && (
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    type="button"
                    onClick={() => setEditTarget(tpl)}
                    className="p-1.5 rounded hover:opacity-60 transition"
                    style={{ color: '#94A3B8' }}
                    aria-label="Edit"
                  >
                    <PencilIcon />
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmDel(tpl.id)}
                    className="p-1.5 rounded hover:opacity-60 transition"
                    style={{ color: '#94A3B8' }}
                    aria-label="Delete"
                  >
                    <TrashIcon />
                  </button>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Add task (custom only) */}
      {isCustomized && !addOpen && (
        <button
          type="button"
          onClick={() => setAddOpen(true)}
          className="flex items-center gap-2 text-sm font-medium hover:opacity-70 transition mb-6"
          style={{ color: '#0D6E68' }}
        >
          <span className="text-lg leading-none">+</span>
          Add task
        </button>
      )}

      {isCustomized && addOpen && (
        <form
          onSubmit={handleAdd}
          className="mb-6 rounded-xl border p-4 space-y-3"
          style={{ backgroundColor: '#FAFAFA', borderColor: '#CBD5E1' }}
        >
          <p className="text-sm font-semibold" style={{ color: '#0F172A' }}>New task</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Title" required>
              <input type="text" required value={addValues.title} onChange={e => setAddValues(v => ({ ...v, title: e.target.value }))} style={inputStyle} placeholder="e.g. Flowers ordered" />
            </Field>
            <Field label="Category" required>
              <select value={addValues.category} onChange={e => setAddValues(v => ({ ...v, category: e.target.value }))} style={inputStyle}>
                {TASK_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </Field>
            <Field label="Confirmation hint" required className="sm:col-span-2">
              <input type="text" required value={addValues.confirmation_hint} onChange={e => setAddValues(v => ({ ...v, confirmation_hint: e.target.value }))} style={inputStyle} placeholder="e.g. Vendor name & order number" />
            </Field>
            <Field label="Days before service" required>
              <input type="number" required min={0} max={60} value={addValues.due_days_before} onChange={e => setAddValues(v => ({ ...v, due_days_before: Number(e.target.value) }))} style={inputStyle} />
            </Field>
          </div>
          <div className="flex gap-2 justify-end">
            <button type="button" onClick={() => setAddOpen(false)} className="rounded-lg border px-3 py-1.5 text-xs font-medium hover:bg-gray-50" style={{ borderColor: '#E2E8F0', color: '#475569' }}>Cancel</button>
            <button type="submit" disabled={busy} className="rounded-lg px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60" style={{ backgroundColor: '#0D6E68' }}>{busy ? 'Adding…' : 'Add task'}</button>
          </div>
        </form>
      )}

      {/* Reset to defaults (custom only) */}
      {isCustomized && !confirmReset && (
        <div className="border-t pt-6" style={{ borderColor: '#E2E8F0' }}>
          <button
            type="button"
            onClick={() => setConfirmReset(true)}
            className="text-sm font-medium hover:underline"
            style={{ color: '#EF4444' }}
          >
            Reset to system defaults
          </button>
        </div>
      )}

      {isCustomized && confirmReset && (
        <div className="border-t pt-6" style={{ borderColor: '#E2E8F0' }}>
          <p className="text-sm font-medium mb-3" style={{ color: '#991B1B' }}>
            This will delete your custom template for {SERVICE_TYPES.find(s => s.value === activeTab)?.label} and restore the system defaults. Continue?
          </p>
          <div className="flex gap-2">
            <button type="button" onClick={() => setConfirmReset(false)} className="rounded-lg border px-3 py-1.5 text-xs font-medium hover:bg-gray-50" style={{ borderColor: '#E2E8F0', color: '#475569' }}>Cancel</button>
            <button type="button" onClick={handleReset} disabled={busy} className="rounded-lg px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60" style={{ backgroundColor: '#EF4444' }}>{busy ? 'Resetting…' : 'Reset to defaults'}</button>
          </div>
        </div>
      )}

      {/* Edit template modal */}
      {editTarget && (
        <EditTemplateModal
          template={editTarget}
          busy={busy}
          onSave={(values) => handleSaveEdit(editTarget.id, values)}
          onClose={() => setEditTarget(null)}
        />
      )}
    </div>
  )
}

// ── Edit modal ────────────────────────────────────────────────────────────────

interface EditValues {
  title: string
  category: string
  confirmation_hint: string
  due_days_before: number
}

function EditTemplateModal({
  template,
  busy,
  onSave,
  onClose,
}: {
  template: TaskTemplate
  busy: boolean
  onSave: (values: EditValues) => void
  onClose: () => void
}) {
  const [title,   setTitle]   = useState(template.title)
  const [cat,     setCat]     = useState(template.category)
  const [hint,    setHint]    = useState(template.confirmation_hint)
  const [days,    setDays]    = useState(template.due_days_before)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim() || !hint.trim()) return
    onSave({ title, category: cat, confirmation_hint: hint, due_days_before: days })
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end md:items-center md:justify-center md:p-4"
      style={{ backgroundColor: 'rgba(15,23,42,0.5)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="w-full h-full md:h-auto md:max-w-md md:rounded-2xl shadow-xl flex flex-col overflow-hidden"
        style={{ backgroundColor: '#FFFFFF' }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-5 border-b flex-shrink-0"
          style={{ borderColor: '#E2E8F0' }}
        >
          <h2 className="text-base font-semibold" style={{ color: '#0F172A' }}>Edit Task</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-xl leading-none hover:opacity-60 transition"
            style={{ color: '#94A3B8' }}
            aria-label="Close"
          >×</button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="px-6 py-5 space-y-4 overflow-y-auto flex-1">
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: '#0F172A' }}>
                Task title <span style={{ color: '#EF4444' }}>*</span>
              </label>
              <input
                type="text"
                required
                autoFocus
                value={title}
                onChange={e => setTitle(e.target.value)}
                style={inputStyle}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: '#0F172A' }}>
                Category <span style={{ color: '#EF4444' }}>*</span>
              </label>
              <select value={cat} onChange={e => setCat(e.target.value)} style={inputStyle}>
                {TASK_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: '#0F172A' }}>
                Confirmation hint <span style={{ color: '#EF4444' }}>*</span>
              </label>
              <input
                type="text"
                required
                value={hint}
                onChange={e => setHint(e.target.value)}
                style={inputStyle}
              />
              <p className="mt-1 text-xs" style={{ color: '#94A3B8' }}>
                Shown to staff when they confirm this task.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: '#0F172A' }}>
                Due (days before service) <span style={{ color: '#EF4444' }}>*</span>
              </label>
              <input
                type="number"
                required
                min={0}
                max={60}
                value={days}
                onChange={e => setDays(Number(e.target.value))}
                style={inputStyle}
              />
            </div>
          </div>

          {/* Footer — always visible, never scrolls away */}
          <div
            className="flex gap-3 px-6 py-4 border-t flex-shrink-0"
            style={{ borderColor: '#E2E8F0' }}
          >
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg border py-2.5 text-sm font-medium transition hover:bg-gray-50"
              style={{ borderColor: '#E2E8F0', color: '#475569' }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={busy || !title.trim() || !hint.trim()}
              className="flex-1 rounded-lg py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
              style={{ backgroundColor: '#0D6E68' }}
            >
              {busy ? 'Saving…' : 'Save changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Small helpers ─────────────────────────────────────────────────────────────

function Field({ label, required, children, className }: { label: string; required?: boolean; children: React.ReactNode; className?: string }) {
  return (
    <div className={className}>
      <label className="block text-xs font-medium mb-1" style={{ color: '#475569' }}>
        {label}{required && <span style={{ color: '#EF4444' }}> *</span>}
      </label>
      {children}
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  borderRadius: 8,
  border: '1px solid #E2E8F0',
  padding: '10px 12px',
  fontSize: 14,
  color: '#0F172A',
  outline: 'none',
  backgroundColor: '#FFFFFF',
}

function PencilIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  )
}

function TrashIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <path d="M10 11v6" /><path d="M14 11v6" />
      <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
    </svg>
  )
}

function ChevronUpIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="18 15 12 9 6 15" />
    </svg>
  )
}

function ChevronDownIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="6 9 12 15 18 9" />
    </svg>
  )
}
