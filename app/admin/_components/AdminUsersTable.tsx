'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import {
  updateUserRole, updateUserPhone, sendPasswordReset,
  deactivateUser, reactivateUser, inviteUser,
} from '@/app/admin/actions'
import type { AdminUser, Role } from '@/lib/types'

const ROLES: { value: Role; label: string }[] = [
  { value: 'owner', label: 'Owner' },
  { value: 'fd',    label: 'Funeral Director' },
  { value: 'staff', label: 'Staff' },
]

const inputStyle: React.CSSProperties = {
  borderRadius: 6, border: '1px solid #E2E8F0', padding: '4px 8px', fontSize: 13, color: '#0F172A', backgroundColor: '#FFFFFF',
}

const STALE_LOGIN_MS = 30 * 86_400_000 // 30 days — flag accounts that look inactive

// e.g. "Jun 25, 2026 at 9:41 AM"
function formatLastLogin(iso: string): string {
  const d = new Date(iso)
  const date = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  const time = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
  return `${date} at ${time}`
}

function isStaleLogin(iso: string): boolean {
  return Date.now() - new Date(iso).getTime() > STALE_LOGIN_MS
}

export function AdminUsersTable({ users, funeralHomeId }: { users: AdminUser[]; funeralHomeId: string }) {
  const [inviteOpen, setInviteOpen] = useState(false)

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-bold" style={{ color: '#0F172A' }}>Users</h2>
        <button
          type="button"
          onClick={() => setInviteOpen(true)}
          className="rounded-lg px-3 py-1.5 text-sm font-semibold"
          style={{ backgroundColor: '#0A2540', color: '#F4C95D' }}
        >
          Invite New User
        </button>
      </div>

      <div className="rounded-xl border overflow-x-auto" style={{ backgroundColor: '#FFFFFF', borderColor: '#E2E8F0' }}>
        <table className="w-full text-sm whitespace-nowrap">
          <thead>
            <tr style={{ backgroundColor: '#F8FAFC' }}>
              {['Name', 'Role', 'Phone', 'Last login', 'Status', 'Actions'].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide" style={{ color: '#94A3B8' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {users.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-8 text-center" style={{ color: '#94A3B8' }}>No users.</td></tr>
            )}
            {users.map(u => <UserRow key={u.id} user={u} />)}
          </tbody>
        </table>
      </div>

      {inviteOpen && <InviteModal funeralHomeId={funeralHomeId} onClose={() => setInviteOpen(false)} />}
    </div>
  )
}

function UserRow({ user }: { user: AdminUser }) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [phone, setPhone] = useState(user.phone ?? '')
  const [editingPhone, setEditingPhone] = useState(false)

  async function run(fn: () => Promise<{ error?: string }>, okMsg: string) {
    setBusy(true)
    const r = await fn()
    setBusy(false)
    if (r.error) { toast.error(r.error); return false }
    toast.success(okMsg)
    router.refresh()
    return true
  }

  return (
    <tr className="border-t" style={{ borderColor: '#E2E8F0' }}>
      <td className="px-4 py-3" style={{ color: '#0F172A' }}>
        <div className="font-medium">{user.fullName}</div>
        <div className="text-xs" style={{ color: '#94A3B8' }}>{user.email}</div>
      </td>
      <td className="px-4 py-3">
        <select
          value={user.role}
          disabled={busy}
          onChange={e => run(() => updateUserRole(user.id, e.target.value as Role), 'Role updated')}
          style={inputStyle}
        >
          {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
        </select>
      </td>
      <td className="px-4 py-3">
        {editingPhone ? (
          <span className="inline-flex items-center gap-1.5">
            <input value={phone} onChange={e => setPhone(e.target.value)} style={{ ...inputStyle, width: 130 }} placeholder="(555) 123-4567" />
            <button type="button" disabled={busy} className="text-xs font-semibold" style={{ color: '#0A2540' }}
              onClick={async () => { if (await run(() => updateUserPhone(user.id, phone), 'Phone updated')) setEditingPhone(false) }}>Save</button>
            <button type="button" className="text-xs" style={{ color: '#94A3B8' }} onClick={() => { setPhone(user.phone ?? ''); setEditingPhone(false) }}>Cancel</button>
          </span>
        ) : (
          <button type="button" className="hover:underline" style={{ color: user.phone ? '#475569' : '#94A3B8' }} onClick={() => setEditingPhone(true)}>
            {user.phone || 'Add phone'}
          </button>
        )}
      </td>
      <td className="px-4 py-3">
        {user.lastLoginAt ? (
          <span style={{ color: isStaleLogin(user.lastLoginAt) ? '#EF4444' : '#475569' }}>
            {formatLastLogin(user.lastLoginAt)}
          </span>
        ) : (
          <span style={{ color: '#94A3B8' }}>Never</span>
        )}
      </td>
      <td className="px-4 py-3">
        <span className="rounded-full px-2 py-0.5 text-xs font-semibold"
          style={user.isActive ? { backgroundColor: '#ECFDF5', color: '#15803D' } : { backgroundColor: '#FEF2F2', color: '#991B1B' }}>
          {user.isActive ? 'Active' : 'Inactive'}
        </span>
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <button type="button" disabled={busy} className="text-xs font-medium hover:underline" style={{ color: '#4A7C8C' }}
            onClick={() => run(() => sendPasswordReset(user.id), 'Password reset sent')}>Reset password</button>
          {user.isActive ? (
            <button type="button" disabled={busy} className="text-xs font-medium hover:underline" style={{ color: '#EF4444' }}
              onClick={() => run(() => deactivateUser(user.id), 'User deactivated')}>Deactivate</button>
          ) : (
            <button type="button" disabled={busy} className="text-xs font-medium hover:underline" style={{ color: '#15803D' }}
              onClick={() => run(() => reactivateUser(user.id), 'User reactivated')}>Reactivate</button>
          )}
        </div>
      </td>
    </tr>
  )
}

function InviteModal({ funeralHomeId, onClose }: { funeralHomeId: string; onClose: () => void }) {
  const router = useRouter()
  const [name, setName]   = useState('')
  const [email, setEmail] = useState('')
  const [role, setRole]   = useState<Role>('staff')
  const [busy, setBusy]   = useState(false)

  async function submit() {
    setBusy(true)
    const r = await inviteUser(funeralHomeId, email, role, name)
    setBusy(false)
    if (r.error) { toast.error(r.error); return }
    toast.success('Invite sent')
    router.refresh()
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(15,23,42,0.5)' }} onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="w-full max-w-sm rounded-2xl p-6" style={{ backgroundColor: '#FFFFFF' }}>
        <h3 className="text-base font-semibold mb-4" style={{ color: '#0F172A' }}>Invite user</h3>
        <div className="space-y-3">
          <input value={name} onChange={e => setName(e.target.value)} placeholder="Full name" className="w-full" style={{ ...inputStyle, padding: '8px 12px', fontSize: 14 }} />
          <input value={email} onChange={e => setEmail(e.target.value)} type="email" placeholder="Email" className="w-full" style={{ ...inputStyle, padding: '8px 12px', fontSize: 14 }} />
          <select value={role} onChange={e => setRole(e.target.value as Role)} className="w-full" style={{ ...inputStyle, padding: '8px 12px', fontSize: 14 }}>
            {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
          </select>
        </div>
        <div className="flex justify-end gap-2 mt-5">
          <button type="button" onClick={onClose} className="rounded-lg border px-3 py-2 text-sm font-medium" style={{ borderColor: '#E2E8F0', color: '#475569' }}>Cancel</button>
          <button type="button" onClick={submit} disabled={busy || !name.trim() || !email.trim()} className="rounded-lg px-3 py-2 text-sm font-semibold disabled:opacity-50" style={{ backgroundColor: '#0A2540', color: '#F4C95D' }}>
            {busy ? 'Sending…' : 'Send invite'}
          </button>
        </div>
      </div>
    </div>
  )
}
