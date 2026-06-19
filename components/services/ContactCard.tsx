'use client'

import { useState } from 'react'
import { updateServiceContact } from '@/app/services/actions'
import { logActivity } from '@/lib/utils/activity'
import { formatPhone, formatPhoneInput } from '@/lib/utils/phone'

interface ContactCardProps {
  serviceId:     string
  funeralHomeId: string
  actorId:       string
  actorName:     string
  canManage:     boolean
  contactName:   string | null
  contactPhone:  string | null
  contactEmail:  string | null
}

export function ContactCard({
  serviceId, funeralHomeId, actorId, actorName, canManage,
  contactName, contactPhone, contactEmail,
}: ContactCardProps) {
  const [editing,      setEditing]      = useState(false)
  const [name,         setName]         = useState(contactName ?? '')
  const [phone,        setPhone]        = useState(() => formatPhoneInput(contactPhone ?? ''))
  const [email,        setEmail]        = useState(contactEmail ?? '')
  const [saving,       setSaving]       = useState(false)
  const [error,        setError]        = useState<string | null>(null)
  const [savedContact, setSavedContact] = useState({
    name: contactName, phone: contactPhone, email: contactEmail,
  })

  const hasContact = savedContact.name || savedContact.phone || savedContact.email

  async function handleSave() {
    setSaving(true); setError(null)
    const result = await updateServiceContact(serviceId, {
      contact_name:  name.trim()  || null,
      contact_phone: phone.trim() || null,
      contact_email: email.trim() || null,
    })
    setSaving(false)
    if (result.error) { setError(result.error); return }
    setSavedContact({
      name:  name.trim()  || null,
      phone: phone.trim() || null,
      email: email.trim() || null,
    })
    setEditing(false)
    logActivity({
      funeral_home_id: funeralHomeId,
      service_id:      serviceId,
      actor_id:        actorId,
      actor_name:      actorName,
      action_type:     'contact_updated',
      description:     'Family contact information updated',
    })
  }

  return (
    <div
      className="rounded-xl border p-5"
      style={{ backgroundColor: '#FFFFFF', borderColor: '#E2E8F0' }}
    >
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold" style={{ color: '#0F172A' }}>Family Contact</h2>
        {canManage && !editing && (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="text-xs font-medium transition hover:opacity-70"
            style={{ color: '#0D6E68' }}
          >
            {hasContact ? 'Edit' : '+ Add Contact'}
          </button>
        )}
      </div>

      {editing ? (
        <div className="space-y-3">
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Contact name"
            className="w-full rounded-lg border px-3 py-2 text-sm outline-none"
            style={{ borderColor: '#E2E8F0', color: '#0F172A' }}
          />
          <input
            type="tel"
            value={phone}
            onChange={e => setPhone(formatPhoneInput(e.target.value))}
            placeholder="(555) 123-4567"
            className="w-full rounded-lg border px-3 py-2 text-sm outline-none"
            style={{ borderColor: '#E2E8F0', color: '#0F172A' }}
          />
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="Email address"
            className="w-full rounded-lg border px-3 py-2 text-sm outline-none"
            style={{ borderColor: '#E2E8F0', color: '#0F172A' }}
          />
          {error && <p className="text-xs" style={{ color: '#EF4444' }}>{error}</p>}
          <div className="flex gap-2 justify-end">
            <button
              type="button"
              onClick={() => {
                setEditing(false)
                setName(savedContact.name ?? '')
                setPhone(savedContact.phone ?? '')
                setEmail(savedContact.email ?? '')
                setError(null)
              }}
              className="rounded-lg border px-3 py-1.5 text-xs font-medium transition hover:bg-gray-50"
              style={{ borderColor: '#E2E8F0', color: '#475569' }}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="rounded-lg px-3 py-1.5 text-xs font-semibold text-white transition hover:opacity-90 disabled:opacity-60"
              style={{ backgroundColor: '#0D6E68' }}
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      ) : hasContact ? (
        <div className="space-y-2">
          {savedContact.name && (
            <div className="flex items-center gap-2">
              <span className="text-xs" style={{ color: '#94A3B8', width: 16 }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
                </svg>
              </span>
              <span className="text-sm" style={{ color: '#0F172A' }}>{savedContact.name}</span>
            </div>
          )}
          {savedContact.phone && (
            <div className="flex items-center gap-2">
              <span className="text-xs" style={{ color: '#94A3B8', width: 16 }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.21 13.5a19.79 19.79 0 0 1-3-8.68A2 2 0 0 1 3.22 3h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.09 10.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 21 18v.92z" />
                </svg>
              </span>
              <a href={`tel:${savedContact.phone}`} className="text-sm hover:underline" style={{ color: '#0D6E68' }}>
                {formatPhone(savedContact.phone)}
              </a>
            </div>
          )}
          {savedContact.email && (
            <div className="flex items-center gap-2">
              <span className="text-xs" style={{ color: '#94A3B8', width: 16 }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                  <polyline points="22,6 12,13 2,6" />
                </svg>
              </span>
              <a href={`mailto:${savedContact.email}`} className="text-sm hover:underline" style={{ color: '#0D6E68' }}>
                {savedContact.email}
              </a>
            </div>
          )}
        </div>
      ) : (
        <p className="text-sm" style={{ color: '#94A3B8' }}>
          No contact information on file.
        </p>
      )}
    </div>
  )
}
