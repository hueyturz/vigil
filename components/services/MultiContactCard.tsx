'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { createClient } from '@/lib/supabase/client'
import { formatPhone, formatPhoneInput } from '@/lib/utils/phone'
import type { ServiceContact } from '@/lib/types'

interface MultiContactCardProps {
  serviceId:       string
  funeralHomeId:   string
  initialContacts: ServiceContact[]
}

function sortContacts(list: ServiceContact[]): ServiceContact[] {
  return [...list].sort((a, b) => {
    if (a.is_primary !== b.is_primary) return a.is_primary ? -1 : 1
    return a.created_at.localeCompare(b.created_at)
  })
}

type FormState = {
  name:         string
  relationship: string
  phone:        string
  email:        string
}

const EMPTY_FORM: FormState = { name: '', relationship: '', phone: '', email: '' }

export function MultiContactCard({ serviceId, funeralHomeId, initialContacts }: MultiContactCardProps) {
  const router = useRouter()
  const [contacts,   setContacts]   = useState<ServiceContact[]>(() => sortContacts(initialContacts))
  const [mode,       setMode]       = useState<'add' | 'edit' | null>(null)
  const [editingId,  setEditingId]  = useState<string | null>(null)
  const [form,       setForm]       = useState<FormState>(EMPTY_FORM)
  const [saving,     setSaving]     = useState(false)
  const [error,      setError]      = useState<string | null>(null)
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null)

  const supabase = createClient()

  function openAdd() {
    setMode('add')
    setEditingId(null)
    setForm(EMPTY_FORM)
    setError(null)
  }

  function openEdit(contact: ServiceContact) {
    setMenuOpenId(null)
    setMode('edit')
    setEditingId(contact.id)
    setForm({
      name:         contact.name,
      relationship: contact.relationship ?? '',
      phone:        formatPhoneInput(contact.phone ?? ''),
      email:        contact.email ?? '',
    })
    setError(null)
  }

  function closeForm() {
    setMode(null)
    setEditingId(null)
    setForm(EMPTY_FORM)
    setError(null)
  }

  async function handleSave() {
    if (!form.name.trim()) { setError('Name is required.'); return }
    setSaving(true); setError(null)

    const payload = {
      name:         form.name.trim(),
      relationship: form.relationship.trim() || null,
      phone:        form.phone.trim() || null,
      email:        form.email.trim() || null,
    }

    if (mode === 'edit' && editingId) {
      const { data, error: updErr } = await supabase
        .from('service_contacts')
        .update(payload)
        .eq('id', editingId)
        .select('*')
        .single()
      setSaving(false)
      if (updErr || !data) { setError(updErr?.message ?? 'Failed to save contact.'); return }
      setContacts(prev => sortContacts(prev.map(c => c.id === editingId ? (data as ServiceContact) : c)))
      toast.success('Contact updated')
    } else {
      // First contact added becomes primary automatically.
      const isPrimary = contacts.length === 0
      const { data, error: insErr } = await supabase
        .from('service_contacts')
        .insert({ ...payload, service_id: serviceId, funeral_home_id: funeralHomeId, is_primary: isPrimary })
        .select('*')
        .single()
      setSaving(false)
      if (insErr || !data) { setError(insErr?.message ?? 'Failed to add contact.'); return }
      setContacts(prev => sortContacts([...prev, data as ServiceContact]))
      toast.success('Contact added')
    }

    closeForm()
    router.refresh()
  }

  async function handleMakePrimary(id: string) {
    setMenuOpenId(null)
    // Clear primary on all other contacts for this service, then set on the target.
    const { error: clearErr } = await supabase
      .from('service_contacts')
      .update({ is_primary: false })
      .eq('service_id', serviceId)
    if (clearErr) { toast.error('Failed to update primary'); return }

    const { error: setErr } = await supabase
      .from('service_contacts')
      .update({ is_primary: true })
      .eq('id', id)
    if (setErr) { toast.error('Failed to update primary'); return }

    setContacts(prev => sortContacts(prev.map(c => ({ ...c, is_primary: c.id === id }))))
    toast.success('Primary contact updated')
    router.refresh()
  }

  async function handleDelete(id: string) {
    setMenuOpenId(null)
    const target = contacts.find(c => c.id === id)
    const { error: delErr } = await supabase.from('service_contacts').delete().eq('id', id)
    if (delErr) { toast.error('Failed to delete contact'); return }

    let remaining = contacts.filter(c => c.id !== id)

    // If we removed the primary and others remain, promote the first remaining contact.
    if (target?.is_primary && remaining.length > 0) {
      const next = sortContacts(remaining)[0]
      const { error: promoteErr } = await supabase
        .from('service_contacts')
        .update({ is_primary: true })
        .eq('id', next.id)
      if (!promoteErr) {
        remaining = remaining.map(c => c.id === next.id ? { ...c, is_primary: true } : c)
      }
    }

    setContacts(sortContacts(remaining))
    toast.success('Contact deleted')
    router.refresh()
  }

  return (
    <div className="rounded-xl border p-5" style={{ backgroundColor: '#FFFFFF', borderColor: '#E2E8F0' }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold" style={{ color: '#0F172A' }}>Family Contacts</h2>
        {mode !== 'add' && (
          <button
            type="button"
            onClick={openAdd}
            className="text-xs font-medium transition hover:opacity-70"
            style={{ color: '#4A7C8C' }}
          >
            + Add Contact
          </button>
        )}
      </div>

      {/* List */}
      {contacts.length === 0 && mode !== 'add' ? (
        <p className="text-sm" style={{ color: '#94A3B8' }}>No contacts added yet.</p>
      ) : (
        <div className="space-y-4">
          {contacts.map(contact => (
            <ContactRow
              key={contact.id}
              contact={contact}
              menuOpen={menuOpenId === contact.id}
              onToggleMenu={() => setMenuOpenId(prev => prev === contact.id ? null : contact.id)}
              onCloseMenu={() => setMenuOpenId(null)}
              onEdit={() => openEdit(contact)}
              onMakePrimary={() => handleMakePrimary(contact.id)}
              onDelete={() => handleDelete(contact.id)}
            />
          ))}
        </div>
      )}

      {/* Inline add / edit form */}
      {mode && (
        <div
          className="mt-4 pt-4 border-t space-y-3"
          style={{ borderColor: '#F1F5F9' }}
        >
          <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#94A3B8' }}>
            {mode === 'edit' ? 'Edit Contact' : 'Add Contact'}
          </p>
          <input
            type="text"
            value={form.name}
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            placeholder="Name"
            className="w-full rounded-lg border px-3 py-2 text-sm outline-none"
            style={{ borderColor: '#E2E8F0', color: '#0F172A' }}
          />
          <input
            type="text"
            value={form.relationship}
            onChange={e => setForm(f => ({ ...f, relationship: e.target.value }))}
            placeholder="Spouse, Son, Daughter, Executor…"
            className="w-full rounded-lg border px-3 py-2 text-sm outline-none"
            style={{ borderColor: '#E2E8F0', color: '#0F172A' }}
          />
          <input
            type="tel"
            value={form.phone}
            onChange={e => setForm(f => ({ ...f, phone: formatPhoneInput(e.target.value) }))}
            placeholder="(555) 123-4567"
            className="w-full rounded-lg border px-3 py-2 text-sm outline-none"
            style={{ borderColor: '#E2E8F0', color: '#0F172A' }}
          />
          <input
            type="email"
            value={form.email}
            onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
            placeholder="Email address"
            className="w-full rounded-lg border px-3 py-2 text-sm outline-none"
            style={{ borderColor: '#E2E8F0', color: '#0F172A' }}
          />
          {error && <p className="text-xs" style={{ color: '#EF4444' }}>{error}</p>}
          <div className="flex gap-2 justify-end">
            <button
              type="button"
              onClick={closeForm}
              className="rounded-lg border px-3 py-1.5 text-xs font-medium transition hover:bg-gray-50"
              style={{ borderColor: '#E2E8F0', color: '#475569' }}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="rounded-lg px-3 py-1.5 text-xs font-semibold transition hover:opacity-90 disabled:opacity-60"
              style={{ backgroundColor: '#0A2540', color: '#F4C95D' }}
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Single contact row ─────────────────────────────────────────────────────────

function ContactRow({
  contact, menuOpen, onToggleMenu, onCloseMenu, onEdit, onMakePrimary, onDelete,
}: {
  contact:       ServiceContact
  menuOpen:      boolean
  onToggleMenu:  () => void
  onCloseMenu:   () => void
  onEdit:        () => void
  onMakePrimary: () => void
  onDelete:      () => void
}) {
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!menuOpen) return
    function handleOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) onCloseMenu()
    }
    document.addEventListener('mousedown', handleOutside)
    return () => document.removeEventListener('mousedown', handleOutside)
  }, [menuOpen, onCloseMenu])

  return (
    <div className="flex items-start justify-between gap-2">
      <div className="min-w-0">
        {/* Name + relationship + primary badge */}
        <div className="flex items-center flex-wrap gap-x-2 gap-y-1">
          <span className="text-sm font-bold" style={{ color: '#0F172A' }}>{contact.name}</span>
          {contact.relationship && (
            <span className="text-xs" style={{ color: '#94A3B8' }}>{contact.relationship}</span>
          )}
          {contact.is_primary && (
            <span
              className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium"
              style={{ backgroundColor: '#E6F4F3', color: '#4A7C8C' }}
            >
              Primary
            </span>
          )}
        </div>

        {/* Phone */}
        {contact.phone && (
          <a href={`tel:${contact.phone}`} className="block text-sm mt-1 hover:underline" style={{ color: '#4A7C8C' }}>
            {formatPhone(contact.phone)}
          </a>
        )}

        {/* Email */}
        {contact.email && (
          <a href={`mailto:${contact.email}`} className="block text-sm mt-0.5 break-all hover:underline" style={{ color: '#4A7C8C' }}>
            {contact.email}
          </a>
        )}
      </div>

      {/* Three-dot menu */}
      <div className="relative flex-shrink-0" ref={menuRef}>
        <button
          type="button"
          onClick={onToggleMenu}
          className="flex items-center justify-center w-7 h-7 rounded-md transition hover:opacity-60"
          style={{ color: '#94A3B8' }}
          aria-label="Contact options"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <circle cx="5" cy="12" r="1.5" /><circle cx="12" cy="12" r="1.5" /><circle cx="19" cy="12" r="1.5" />
          </svg>
        </button>

        {menuOpen && (
          <div
            className="absolute right-0 top-full mt-1 z-20 rounded-lg border shadow-lg py-1 min-w-[150px]"
            style={{ backgroundColor: '#FFFFFF', borderColor: '#E2E8F0' }}
          >
            <button
              type="button"
              onClick={onEdit}
              className="block w-full px-3 py-2 text-sm text-left transition hover:bg-gray-50"
              style={{ color: '#0F172A' }}
            >
              Edit
            </button>
            {!contact.is_primary && (
              <button
                type="button"
                onClick={onMakePrimary}
                className="block w-full px-3 py-2 text-sm text-left transition hover:bg-gray-50"
                style={{ color: '#0F172A' }}
              >
                Make Primary
              </button>
            )}
            <button
              type="button"
              onClick={onDelete}
              className="block w-full px-3 py-2 text-sm text-left transition hover:bg-red-50"
              style={{ color: '#EF4444' }}
            >
              Delete
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
