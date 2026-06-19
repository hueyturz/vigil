'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { TASK_CATEGORIES } from '@/components/tasks/AddTaskModal'
import {
  customizeTemplate,
  resetToDefaults,
  addTemplate,
  updateTemplate,
  deleteTemplate,
  reorderTemplate,
  getTemplateSubtasks,
  addTemplateSubtask,
  updateTemplateSubtask,
  deleteTemplateSubtask,
} from './actions'
import type { Priority, ServiceType, TaskTemplate, TaskTemplateSubtask } from '@/lib/types'

const SERVICE_TYPES: { value: ServiceType; label: string }[] = [
  { value: 'full-burial', label: 'Full Burial'    },
  { value: 'graveside',   label: 'Graveside Only' },
  { value: 'cremation',   label: 'Cremation'      },
  { value: 'military',    label: 'Military Honors' },
]

const PRIORITIES: { value: Priority; label: string; color: string }[] = [
  { value: 'critical',      label: 'Critical',      color: '#EF4444' },
  { value: 'standard',      label: 'Standard',      color: '#F59E0B' },
  { value: 'informational', label: 'Informational', color: '#94A3B8' },
]

function PriorityDot({ priority }: { priority: Priority }) {
  const p = PRIORITIES.find(p => p.value === priority)
  return (
    <span
      className="inline-block flex-shrink-0 rounded-full"
      style={{ width: 8, height: 8, backgroundColor: p?.color ?? '#94A3B8' }}
      title={p?.label}
    />
  )
}

type PanelState = 'default' | 'editing' | 'custom'

interface TemplatesPanelProps {
  customTemplates: TaskTemplate[]
  systemTemplates: TaskTemplate[]
}

export function TemplatesPanel({ customTemplates: initCustom, systemTemplates }: TemplatesPanelProps) {
  const router = useRouter()

  const [activeTab,    setActiveTab]    = useState<ServiceType>('full-burial')
  const [custom,       setCustom]       = useState<TaskTemplate[]>(initCustom)
  const [editTarget,   setEditTarget]   = useState<TaskTemplate | null>(null)
  const [confirmReset, setConfirmReset] = useState(false)
  const [confirmDel,   setConfirmDel]   = useState<string | null>(null)
  const [addOpen,      setAddOpen]      = useState(false)
  const [addValues,    setAddValues]    = useState({
    title: '', category: TASK_CATEGORIES[0], confirmation_hint: '',
    due_days_before: 1, priority: 'standard' as Priority,
  })
  const [busy,  setBusy]  = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  const [editingTabs,  setEditingTabs]  = useState<Set<ServiceType>>(new Set())
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())
  const [rowSteps,     setRowSteps]     = useState<Record<string, TaskTemplateSubtask[] | null>>({})

  function toggleRow(tplId: string) {
    setExpandedRows(prev => {
      const next = new Set(prev)
      if (next.has(tplId)) { next.delete(tplId); return next }
      next.add(tplId)
      // Lazy-fetch steps if not yet loaded
      if (!(tplId in rowSteps)) {
        setRowSteps(r => ({ ...r, [tplId]: null })) // null = loading
        getTemplateSubtasks(tplId).then(({ data }) =>
          setRowSteps(r => ({ ...r, [tplId]: data ?? [] }))
        )
      }
      return next
    })
  }

  const customForTab = custom
    .filter(t => t.service_type === activeTab)
    .sort((a, b) => a.sort_order - b.sort_order)

  const systemForTab = systemTemplates
    .filter(t => t.service_type === activeTab)
    .sort((a, b) => a.sort_order - b.sort_order)

  const hasCustom        = customForTab.length > 0
  const isEditing        = editingTabs.has(activeTab)
  const panelState: PanelState = !hasCustom ? 'default' : isEditing ? 'editing' : 'custom'
  const displayTemplates = hasCustom ? customForTab : systemForTab

  function enterEditing() {
    setEditingTabs(prev => new Set(prev).add(activeTab))
    setConfirmReset(false); setConfirmDel(null); setAddOpen(false); setError(null)
  }

  function exitEditing() {
    setEditingTabs(prev => { const n = new Set(prev); n.delete(activeTab); return n })
    setConfirmReset(false); setConfirmDel(null); setAddOpen(false); setError(null)
  }

  function flashSaved() { setSaved(true); setTimeout(() => setSaved(false), 2000) }

  async function run<T>(fn: () => Promise<{ data?: T; error?: string }>, onSuccess?: (d?: T) => void) {
    setBusy(true); setError(null)
    const result = await fn()
    setBusy(false)
    if (result.error) { setError(result.error); return }
    onSuccess?.(result.data)
    flashSaved()
  }

  async function handleCustomize() {
    await run(() => customizeTemplate(activeTab), (data) => {
      if (data) setCustom(prev => [...prev, ...data])
      enterEditing()
      router.refresh()
    })
  }

  async function handleReset() {
    await run(() => resetToDefaults(activeTab), () => {
      setCustom(prev => prev.filter(t => t.service_type !== activeTab))
      setConfirmReset(false)
      exitEditing()
      router.refresh()
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
        priority:          values.priority,
      }),
      () => {
        setCustom(prev => prev.map(t =>
          t.id === templateId
            ? { ...t, ...values, title: values.title.trim(), confirmation_hint: values.confirmation_hint.trim() }
            : t
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
    if (!addValues.title.trim()) return
    await run(
      () => addTemplate(activeTab, {
        title:             addValues.title.trim(),
        category:          addValues.category,
        confirmation_hint: '',
        due_days_before:   addValues.due_days_before,
        priority:          addValues.priority,
      }),
      (data) => {
        if (data) setCustom(prev => [...prev, data])
        setAddOpen(false)
        setAddValues({ title: '', category: TASK_CATEGORIES[0], confirmation_hint: '', due_days_before: 1, priority: 'standard' })
      },
    )
  }

  function handleTabChange(tab: ServiceType) {
    setActiveTab(tab)
    setConfirmReset(false); setConfirmDel(null); setAddOpen(false); setError(null)
  }

  return (
    <div>
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: '#0F172A' }}>Task Templates</h1>
          <p className="text-sm mt-0.5" style={{ color: '#475569' }}>
            Customize the tasks auto-generated when a new service is created.
          </p>
        </div>
        {saved && (
          <span className="mt-1 flex-shrink-0 rounded-full px-3 py-1 text-xs font-semibold"
                style={{ backgroundColor: '#DCFCE7', color: '#15803D' }}>
            ✓ Saved
          </span>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b" style={{ borderColor: '#E2E8F0' }}>
        {SERVICE_TYPES.map(st => (
          <button key={st.value} type="button" onClick={() => handleTabChange(st.value)}
            className="px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition"
            style={{
              borderBottomColor: activeTab === st.value ? '#0D6E68' : 'transparent',
              color: activeTab === st.value ? '#0D6E68' : '#475569',
            }}>{st.label}</button>
        ))}
      </div>

      {error && (
        <div className="mb-4 rounded-lg border px-4 py-3 text-sm"
             style={{ backgroundColor: '#FEF2F2', borderColor: '#FECACA', color: '#991B1B' }}>
          {error}
        </div>
      )}

      {/* State 1: Default */}
      {panelState === 'default' && (
        <div className="mb-6 rounded-xl border p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
             style={{ backgroundColor: '#FFFBEB', borderColor: '#FDE68A' }}>
          <div>
            <p className="text-sm font-medium" style={{ color: '#92400E' }}>You are using the default template.</p>
            <p className="text-xs mt-0.5" style={{ color: '#92400E' }}>Customize it to match your workflow.</p>
          </div>
          <button type="button" onClick={handleCustomize} disabled={busy}
            className="flex-shrink-0 rounded-lg px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-60"
            style={{ backgroundColor: '#0D6E68' }}>
            {busy ? 'Copying…' : 'Customize This Template'}
          </button>
        </div>
      )}

      {/* State 2: Editing header */}
      {panelState === 'editing' && (
        <div className="mb-6 rounded-xl border p-4 flex items-center justify-between gap-3"
             style={{ backgroundColor: '#F0FDF9', borderColor: '#99F6E4' }}>
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: '#0D6E68' }} />
            <p className="text-sm font-semibold" style={{ color: '#0D6E68' }}>Editing Template</p>
            <p className="text-xs hidden sm:block" style={{ color: '#0F766E' }}>Changes save automatically.</p>
          </div>
          <button type="button" onClick={exitEditing}
            className="flex-shrink-0 rounded-lg px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90"
            style={{ backgroundColor: '#0D6E68' }}>
            Done Editing
          </button>
        </div>
      )}

      {/* State 3: Custom read-only header */}
      {panelState === 'custom' && (
        <div className="mb-6 flex items-center justify-between gap-3">
          <p className="text-sm" style={{ color: '#475569' }}>
            Custom template · {customForTab.length} task{customForTab.length !== 1 ? 's' : ''}
          </p>
          <button type="button" onClick={enterEditing}
            className="rounded-lg border px-4 py-2 text-sm font-semibold transition hover:bg-gray-50"
            style={{ borderColor: '#CBD5E1', color: '#0F172A' }}>
            Edit Template
          </button>
        </div>
      )}

      {/* Template rows */}
      <div className="space-y-2 mb-4">
        {displayTemplates.map((tpl, idx) => {
          if (panelState === 'editing' && confirmDel === tpl.id) {
            return (
              <div key={tpl.id} className="rounded-lg border p-4"
                   style={{ backgroundColor: '#FEF2F2', borderColor: '#FECACA' }}>
                <p className="text-sm font-medium mb-3" style={{ color: '#991B1B' }}>
                  Delete &ldquo;{tpl.title}&rdquo;?
                </p>
                <div className="flex gap-2">
                  <button type="button" onClick={() => setConfirmDel(null)}
                    className="rounded-lg border px-3 py-1.5 text-xs font-medium hover:bg-gray-50"
                    style={{ borderColor: '#E2E8F0', color: '#475569' }}>Cancel</button>
                  <button type="button" onClick={() => handleDelete(tpl.id)} disabled={busy}
                    className="rounded-lg px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60"
                    style={{ backgroundColor: '#EF4444' }}>{busy ? 'Deleting…' : 'Delete'}</button>
                </div>
              </div>
            )
          }

          const isExpanded = expandedRows.has(tpl.id)
          const steps      = rowSteps[tpl.id]

          return (
            <div key={tpl.id}
              className="rounded-lg border overflow-hidden"
              style={{ backgroundColor: '#FFFFFF', borderColor: '#E2E8F0' }}
            >
              {/* Header row */}
              <div className="flex items-center gap-3 px-4 py-3">
                {panelState === 'editing' && (
                  <div className="flex flex-col gap-0.5 flex-shrink-0">
                    <button type="button" onClick={() => handleReorder(tpl.id, 'up')}
                      disabled={busy || idx === 0}
                      className="p-0.5 rounded hover:opacity-60 disabled:opacity-20 transition"
                      style={{ color: '#94A3B8' }} aria-label="Move up"><ChevronUpIcon /></button>
                    <button type="button" onClick={() => handleReorder(tpl.id, 'down')}
                      disabled={busy || idx === displayTemplates.length - 1}
                      className="p-0.5 rounded hover:opacity-60 disabled:opacity-20 transition"
                      style={{ color: '#94A3B8' }} aria-label="Move down"><ChevronDownIcon /></button>
                  </div>
                )}

                <PriorityDot priority={tpl.priority} />

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate" style={{ color: '#0F172A' }}>{tpl.title}</p>
                  <p className="text-xs mt-0.5" style={{ color: '#94A3B8' }}>
                    {tpl.category} · {tpl.due_days_before}d before
                  </p>
                </div>

                <div className="flex items-center gap-1 flex-shrink-0">
                  {panelState === 'editing' && (
                    <>
                      <button type="button" onClick={() => setEditTarget(tpl)}
                        className="p-1.5 rounded hover:opacity-60 transition"
                        style={{ color: '#94A3B8' }} aria-label="Edit"><PencilIcon /></button>
                      <button type="button" onClick={() => setConfirmDel(tpl.id)}
                        className="p-1.5 rounded hover:opacity-60 transition"
                        style={{ color: '#94A3B8' }} aria-label="Delete"><TrashIcon /></button>
                    </>
                  )}
                  <button type="button" onClick={() => toggleRow(tpl.id)}
                    className="p-1.5 rounded hover:opacity-60 transition"
                    style={{ color: '#94A3B8' }} aria-label={isExpanded ? 'Collapse' : 'Expand'}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                      style={{ transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.15s' }}>
                      <polyline points="6 9 12 15 18 9" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Expanded steps panel */}
              {isExpanded && (
                <div className="px-4 pb-3 border-t" style={{ borderColor: '#F1F5F9' }}>
                  <p className="text-xs font-semibold uppercase tracking-wider mt-3 mb-2" style={{ color: '#CBD5E1' }}>Steps</p>
                  {steps === null && (
                    <p className="text-xs" style={{ color: '#CBD5E1' }}>Loading…</p>
                  )}
                  {steps !== null && steps.length === 0 && (
                    <p className="text-xs" style={{ color: '#CBD5E1' }}>No steps defined.</p>
                  )}
                  {steps !== null && steps.map(step => (
                    <div key={step.id} className="flex items-center gap-2 py-1">
                      <span className="flex-shrink-0 rounded-full border" style={{ width: 7, height: 7, borderColor: '#CBD5E1' }} />
                      <span className="text-sm" style={{ color: '#475569' }}>
                        {step.title}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Add task */}
      {panelState === 'editing' && !addOpen && (
        <button type="button" onClick={() => setAddOpen(true)}
          className="flex items-center gap-2 text-sm font-medium hover:opacity-70 transition mb-6"
          style={{ color: '#0D6E68' }}>
          <span className="text-lg leading-none">+</span>Add task
        </button>
      )}

      {panelState === 'editing' && addOpen && (
        <form onSubmit={handleAdd}
          className="mb-6 rounded-xl border p-4 space-y-3"
          style={{ backgroundColor: '#FAFAFA', borderColor: '#CBD5E1' }}>
          <p className="text-sm font-semibold" style={{ color: '#0F172A' }}>New task</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Title" required>
              <input type="text" required value={addValues.title}
                onChange={e => setAddValues(v => ({ ...v, title: e.target.value }))}
                style={inputStyle} placeholder="e.g. Flowers ordered" />
            </Field>
            <Field label="Category" required>
              <select value={addValues.category}
                onChange={e => setAddValues(v => ({ ...v, category: e.target.value }))} style={inputStyle}>
                {TASK_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </Field>
            <Field label="Priority" required>
              <select value={addValues.priority}
                onChange={e => setAddValues(v => ({ ...v, priority: e.target.value as Priority }))} style={inputStyle}>
                {PRIORITIES.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
              </select>
            </Field>
            <Field label="Days before service" required>
              <input type="number" required min={0} max={60} value={addValues.due_days_before}
                onChange={e => setAddValues(v => ({ ...v, due_days_before: Number(e.target.value) }))} style={inputStyle} />
            </Field>
          </div>
          <div className="flex gap-2 justify-end">
            <button type="button" onClick={() => setAddOpen(false)}
              className="rounded-lg border px-3 py-1.5 text-xs font-medium hover:bg-gray-50"
              style={{ borderColor: '#E2E8F0', color: '#475569' }}>Cancel</button>
            <button type="submit" disabled={busy}
              className="rounded-lg px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60"
              style={{ backgroundColor: '#0D6E68' }}>{busy ? 'Adding…' : 'Add task'}</button>
          </div>
        </form>
      )}

      {/* Reset to defaults */}
      {(panelState === 'editing' || panelState === 'custom') && !confirmReset && (
        <div className="border-t pt-6" style={{ borderColor: '#E2E8F0' }}>
          <button type="button" onClick={() => setConfirmReset(true)}
            className={`text-sm font-medium hover:underline ${panelState === 'custom' ? 'opacity-60' : ''}`}
            style={{ color: '#EF4444' }}>
            Reset to system defaults
          </button>
        </div>
      )}

      {(panelState === 'editing' || panelState === 'custom') && confirmReset && (
        <div className="border-t pt-6" style={{ borderColor: '#E2E8F0' }}>
          <p className="text-sm font-medium mb-3" style={{ color: '#991B1B' }}>
            This will delete your custom template for {SERVICE_TYPES.find(s => s.value === activeTab)?.label} and restore the system defaults. Continue?
          </p>
          <div className="flex gap-2">
            <button type="button" onClick={() => setConfirmReset(false)}
              className="rounded-lg border px-3 py-1.5 text-xs font-medium hover:bg-gray-50"
              style={{ borderColor: '#E2E8F0', color: '#475569' }}>Cancel</button>
            <button type="button" onClick={handleReset} disabled={busy}
              className="rounded-lg px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60"
              style={{ backgroundColor: '#EF4444' }}>{busy ? 'Resetting…' : 'Reset to defaults'}</button>
          </div>
        </div>
      )}

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
  priority: Priority
}

function EditTemplateModal({ template, busy, onSave, onClose }: {
  template: TaskTemplate; busy: boolean
  onSave: (values: EditValues) => void; onClose: () => void
}) {
  const [title,    setTitle]    = useState(template.title)
  const [cat,      setCat]      = useState(template.category)
  const [days,     setDays]     = useState(template.due_days_before)
  const [priority, setPriority] = useState<Priority>(template.priority)

  // Steps (template subtasks)
  const [steps,       setSteps]       = useState<TaskTemplateSubtask[]>([])
  const [stepsLoaded, setStepsLoaded] = useState(false)
  const [newStep,     setNewStep]     = useState('')
  const [addingStep,  setAddingStep]  = useState(false)
  const [editingStep, setEditingStep] = useState<string | null>(null)
  const [editStepVal, setEditStepVal] = useState('')
  const stepInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    getTemplateSubtasks(template.id).then(({ data }) => {
      setSteps(data ?? [])
      setStepsLoaded(true)
    })
  }, [template.id])

  async function handleAddStep() {
    if (!newStep.trim()) return
    setAddingStep(true)
    const { data, error } = await addTemplateSubtask(template.id, newStep)
    setAddingStep(false)
    if (error || !data) return
    setSteps(prev => [...prev, data])
    setNewStep('')
    stepInputRef.current?.focus()
  }

  async function handleDeleteStep(id: string) {
    await deleteTemplateSubtask(id)
    setSteps(prev => prev.filter(s => s.id !== id))
  }

  async function handleSaveStepEdit(id: string) {
    if (!editStepVal.trim()) { setEditingStep(null); return }
    await updateTemplateSubtask(id, editStepVal)
    setSteps(prev => prev.map(s => s.id === id ? { ...s, title: editStepVal.trim() } : s))
    setEditingStep(null)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) return
    onSave({ title, category: cat, confirmation_hint: template.confirmation_hint, due_days_before: days, priority })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center md:justify-center md:p-4"
         style={{ backgroundColor: 'rgba(15,23,42,0.5)' }}
         onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="w-full h-full md:h-auto md:max-w-md md:rounded-2xl shadow-xl flex flex-col overflow-hidden"
           style={{ backgroundColor: '#FFFFFF' }}>
        <div className="flex items-center justify-between px-6 py-5 border-b flex-shrink-0"
             style={{ borderColor: '#E2E8F0' }}>
          <h2 className="text-base font-semibold" style={{ color: '#0F172A' }}>Edit Task</h2>
          <button type="button" onClick={onClose}
            className="text-xl leading-none hover:opacity-60 transition"
            style={{ color: '#94A3B8' }} aria-label="Close">×</button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="px-6 py-5 space-y-4 overflow-y-auto flex-1">
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: '#0F172A' }}>
                Task title <span style={{ color: '#EF4444' }}>*</span>
              </label>
              <input type="text" required autoFocus value={title} onChange={e => setTitle(e.target.value)} style={inputStyle} />
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
                Priority <span style={{ color: '#EF4444' }}>*</span>
              </label>
              <select value={priority} onChange={e => setPriority(e.target.value as Priority)} style={inputStyle}>
                {PRIORITIES.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: '#0F172A' }}>
                Due (days before service) <span style={{ color: '#EF4444' }}>*</span>
              </label>
              <input type="number" required min={0} max={60} value={days}
                onChange={e => setDays(Number(e.target.value))} style={inputStyle} />
            </div>

            {/* Steps */}
            <div className="pt-2 border-t" style={{ borderColor: '#F1F5F9' }}>
              <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: '#94A3B8' }}>
                Steps
              </p>
              {!stepsLoaded && (
                <p className="text-xs" style={{ color: '#94A3B8' }}>Loading…</p>
              )}
              {stepsLoaded && steps.length === 0 && (
                <p className="text-xs mb-2" style={{ color: '#CBD5E1' }}>No steps yet.</p>
              )}
              {stepsLoaded && steps.map(step => (
                <div key={step.id} className="group flex items-center gap-2 py-1">
                  {editingStep === step.id ? (
                    <input
                      autoFocus
                      className="flex-1 rounded border px-2 py-1 text-sm outline-none"
                      style={{ borderColor: '#0D6E68', color: '#0F172A' }}
                      value={editStepVal}
                      onChange={e => setEditStepVal(e.target.value)}
                      onBlur={() => handleSaveStepEdit(step.id)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') { e.preventDefault(); handleSaveStepEdit(step.id) }
                        if (e.key === 'Escape') setEditingStep(null)
                      }}
                    />
                  ) : (
                    <>
                      <span
                        className="flex-1 text-sm cursor-pointer hover:text-teal-700"
                        style={{ color: '#0F172A' }}
                        onClick={() => { setEditingStep(step.id); setEditStepVal(step.title) }}
                      >
                        {step.title}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleDeleteStep(step.id)}
                        className="opacity-0 group-hover:opacity-100 transition p-0.5 rounded hover:opacity-70"
                        style={{ color: '#94A3B8' }}
                        aria-label="Remove step"
                      >
                        <TrashIcon />
                      </button>
                    </>
                  )}
                </div>
              ))}
              {/* Add step input */}
              <div className="flex items-center gap-2 mt-2">
                <input
                  ref={stepInputRef}
                  type="text"
                  placeholder="Add a step…"
                  value={newStep}
                  onChange={e => setNewStep(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddStep() } }}
                  className="flex-1 rounded border px-2 py-1.5 text-sm outline-none"
                  style={{ borderColor: '#E2E8F0', color: '#0F172A' }}
                />
                <button
                  type="button"
                  onClick={handleAddStep}
                  disabled={addingStep || !newStep.trim()}
                  className="rounded px-2.5 py-1.5 text-sm font-semibold text-white disabled:opacity-50 transition hover:opacity-90"
                  style={{ backgroundColor: '#0D6E68' }}
                >+</button>
              </div>
            </div>
          </div>
          <div className="flex gap-3 px-6 py-4 border-t flex-shrink-0" style={{ borderColor: '#E2E8F0' }}>
            <button type="button" onClick={onClose}
              className="flex-1 rounded-lg border py-2.5 text-sm font-medium transition hover:bg-gray-50"
              style={{ borderColor: '#E2E8F0', color: '#475569' }}>Close</button>
            <button type="submit" disabled={busy || !title.trim() || !hint.trim()}
              className="flex-1 rounded-lg py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
              style={{ backgroundColor: '#0D6E68' }}>{busy ? 'Saving…' : 'Save changes'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function Field({ label, required, children, className }: {
  label: string; required?: boolean; children: React.ReactNode; className?: string
}) {
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
  width: '100%', borderRadius: 8, border: '1px solid #E2E8F0',
  padding: '10px 12px', fontSize: 14, color: '#0F172A',
  outline: 'none', backgroundColor: '#FFFFFF',
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
