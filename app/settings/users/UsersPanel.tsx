'use client'

import { useState, useEffect, useTransition } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import { z } from 'zod'
import { inviteUser, updateUserRole, setUserActive, updateOwnProfile } from './actions'
import { formatPhone, formatPhoneInput } from '@/lib/utils/phone'
import type { Role } from '@/lib/types'

const InviteSchema = z.object({
  full_name: z.string().min(2, 'Name must be at least 2 characters.'),
  email:     z.string().email('Enter a valid email address.'),
})

type InviteFieldErrors = Partial<Record<'full_name' | 'email', string>>

interface UserRow {
  id: string
  full_name: string
  role: Role
  phone: string | null
  is_active: boolean
  email: string | null
}

const ROLE_LABELS: Record<Role, string> = {
  owner: 'Owner',
  fd:    'Funeral Director',
  staff: 'Staff',
}

// ── Invite Modal ──────────────────────────────────────────────────────────────

function InviteModal({ onClose }: { onClose: () => void }) {
  const [error,       setError]       = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<InviteFieldErrors>({})
  const [pending, startTransition] = useTransition()

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setFieldErrors({})
    const formData = new FormData(e.currentTarget)

    const validation = InviteSchema.safeParse({
      full_name: formData.get('full_name') as string,
      email:     formData.get('email')     as string,
    })

    if (!validation.success) {
      const errs: InviteFieldErrors = {}
      for (const issue of validation.error.errors) {
        const key = issue.path[0] as keyof InviteFieldErrors
        if (!errs[key]) errs[key] = issue.message
      }
      setFieldErrors(errs)
      return
    }

    startTransition(async () => {
      const result = await inviteUser(formData)
      if (result.error) {
        setError(result.error)
      } else {
        onClose()
      }
    })
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(15,23,42,0.5)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="w-full max-w-md rounded-2xl shadow-xl" style={{ backgroundColor: '#FFFFFF' }}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b" style={{ borderColor: '#E2E8F0' }}>
          <h2 className="text-base font-semibold" style={{ color: '#0F172A' }}>Invite User</h2>
          <button
            onClick={onClose}
            className="text-xl leading-none hover:opacity-60 transition"
            style={{ color: '#94A3B8' }}
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          {/* Full name */}
          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: '#0F172A' }}>
              Full name <span style={{ color: '#EF4444' }}>*</span>
            </label>
            <input
              name="full_name"
              type="text"
              placeholder="Jane Smith"
              className="w-full rounded-lg border px-3 py-2.5 text-sm outline-none"
              style={{ borderColor: fieldErrors.full_name ? '#FECACA' : '#E2E8F0', color: '#0F172A' }}
            />
            {fieldErrors.full_name && (
              <p className="mt-1 text-xs" style={{ color: '#EF4444' }}>{fieldErrors.full_name}</p>
            )}
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: '#0F172A' }}>
              Email address <span style={{ color: '#EF4444' }}>*</span>
            </label>
            <input
              name="email"
              type="email"
              placeholder="jane@example.com"
              className="w-full rounded-lg border px-3 py-2.5 text-sm outline-none"
              style={{ borderColor: fieldErrors.email ? '#FECACA' : '#E2E8F0', color: '#0F172A' }}
            />
            {fieldErrors.email && (
              <p className="mt-1 text-xs" style={{ color: '#EF4444' }}>{fieldErrors.email}</p>
            )}
          </div>

          {/* Role */}
          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: '#0F172A' }}>
              Role <span style={{ color: '#EF4444' }}>*</span>
            </label>
            <select
              name="role"
              required
              className="w-full rounded-lg border px-3 py-2.5 text-sm outline-none"
              style={{ borderColor: '#E2E8F0', color: '#0F172A' }}
            >
              <option value="fd">Funeral Director</option>
              <option value="staff">Staff</option>
            </select>
          </div>

          {/* Phone */}
          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: '#0F172A' }}>
              Phone <span className="text-xs font-normal" style={{ color: '#94A3B8' }}>(optional)</span>
            </label>
            <input
              name="phone"
              type="tel"
              placeholder="+1 555 000 0000"
              className="w-full rounded-lg border px-3 py-2.5 text-sm outline-none"
              style={{ borderColor: '#E2E8F0', color: '#0F172A' }}
            />
          </div>

          {error && (
            <div
              className="rounded-lg border px-4 py-3 text-sm"
              style={{ backgroundColor: '#FEF2F2', borderColor: '#FECACA', color: '#991B1B' }}
            >
              {error}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2 border-t" style={{ borderColor: '#E2E8F0' }}>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border px-4 py-2 text-sm font-medium transition hover:bg-gray-50"
              style={{ borderColor: '#E2E8F0', color: '#475569' }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={pending}
              className="rounded-lg px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
              style={{ backgroundColor: '#0D6E68' }}
            >
              {pending ? 'Sending…' : 'Send invite'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Edit Profile Modal (own account) ──────────────────────────────────────────

function EditProfileModal({ user, onClose }: { user: UserRow; onClose: () => void }) {
  const router = useRouter()
  const [error,       setError]       = useState<string | null>(null)
  const [nameError,   setNameError]   = useState<string | null>(null)
  const [phone,       setPhone]       = useState(() => formatPhoneInput(user.phone ?? ''))
  const [pending, startTransition] = useTransition()
  const [mounted, setMounted] = useState(false)

  useEffect(() => { setMounted(true) }, [])

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setNameError(null)
    const formData = new FormData(e.currentTarget)

    const name = ((formData.get('full_name') as string) ?? '').trim()
    if (name.length < 2) {
      setNameError('Name must be at least 2 characters.')
      return
    }

    startTransition(async () => {
      const result = await updateOwnProfile(formData)
      if (result.error) {
        setError(result.error)
      } else {
        onClose()
        router.refresh()
      }
    })
  }

  if (!mounted) return null

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(15,23,42,0.5)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="w-full max-w-md rounded-2xl shadow-xl" style={{ backgroundColor: '#FFFFFF' }}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b" style={{ borderColor: '#E2E8F0' }}>
          <h2 className="text-base font-semibold" style={{ color: '#0F172A' }}>Edit Profile</h2>
          <button
            onClick={onClose}
            className="text-xl leading-none hover:opacity-60 transition"
            style={{ color: '#94A3B8' }}
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          {/* Full name */}
          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: '#0F172A' }}>
              Full name <span style={{ color: '#EF4444' }}>*</span>
            </label>
            <input
              name="full_name"
              type="text"
              defaultValue={user.full_name}
              placeholder="Jane Smith"
              className="w-full rounded-lg border px-3 py-2.5 text-sm outline-none"
              style={{ borderColor: nameError ? '#FECACA' : '#E2E8F0', color: '#0F172A' }}
            />
            {nameError && (
              <p className="mt-1 text-xs" style={{ color: '#EF4444' }}>{nameError}</p>
            )}
          </div>

          {/* Email (read-only) */}
          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: '#0F172A' }}>
              Email address
            </label>
            <input
              type="email"
              value={user.email ?? ''}
              disabled
              className="w-full rounded-lg border px-3 py-2.5 text-sm outline-none disabled:cursor-not-allowed"
              style={{ borderColor: '#E2E8F0', color: '#94A3B8', backgroundColor: '#F7F8FA' }}
            />
            <p className="mt-1 text-xs" style={{ color: '#94A3B8' }}>Email can&apos;t be changed here.</p>
          </div>

          {/* Phone */}
          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: '#0F172A' }}>
              Phone <span className="text-xs font-normal" style={{ color: '#94A3B8' }}>(optional)</span>
            </label>
            <input
              name="phone"
              type="tel"
              value={phone}
              onChange={e => setPhone(formatPhoneInput(e.target.value))}
              placeholder="(555) 123-4567"
              className="w-full rounded-lg border px-3 py-2.5 text-sm outline-none"
              style={{ borderColor: '#E2E8F0', color: '#0F172A' }}
            />
          </div>

          {error && (
            <div
              className="rounded-lg border px-4 py-3 text-sm"
              style={{ backgroundColor: '#FEF2F2', borderColor: '#FECACA', color: '#991B1B' }}
            >
              {error}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2 border-t" style={{ borderColor: '#E2E8F0' }}>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border px-4 py-2 text-sm font-medium transition hover:bg-gray-50"
              style={{ borderColor: '#E2E8F0', color: '#475569' }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={pending}
              className="rounded-lg px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
              style={{ backgroundColor: '#0D6E68' }}
            >
              {pending ? 'Saving…' : 'Save changes'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  )
}

// ── Shared role-change / activate handlers ────────────────────────────────────

function useUserRowActions(user: UserRow) {
  const [roleError,   setRoleError]   = useState<string | null>(null)
  const [activeError, setActiveError] = useState<string | null>(null)
  const [rolePending, startRoleTransition]   = useTransition()
  const [activePending, startActiveTransition] = useTransition()

  async function handleRoleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const newRole = e.target.value as Role
    setRoleError(null)
    startRoleTransition(async () => {
      const result = await updateUserRole(user.id, newRole)
      if (result.error) setRoleError(result.error)
    })
  }

  async function handleToggleActive() {
    setActiveError(null)
    startActiveTransition(async () => {
      const result = await setUserActive(user.id, !user.is_active)
      if (result.error) setActiveError(result.error)
    })
  }

  return { roleError, activeError, rolePending, activePending, handleRoleChange, handleToggleActive }
}

// ── Teal role pill (mobile cards) ─────────────────────────────────────────────

function RoleBadge({ role }: { role: Role }) {
  return (
    <span
      className="inline-flex flex-shrink-0 items-center rounded-full px-2.5 py-0.5 text-xs font-medium"
      style={{ backgroundColor: '#E6F4F3', color: '#0D6E68' }}
    >
      {ROLE_LABELS[role]}
    </span>
  )
}

// ── User card (mobile) ────────────────────────────────────────────────────────

function UserCard({
  user, currentUserId, onEditProfile,
}: {
  user: UserRow; currentUserId: string; onEditProfile: (user: UserRow) => void
}) {
  const isSelf = user.id === currentUserId
  const { roleError, activeError, rolePending, activePending, handleRoleChange, handleToggleActive } = useUserRowActions(user)

  const roleEditable = !isSelf && user.role !== 'owner'

  return (
    <div
      className="rounded-xl border p-4"
      style={{ backgroundColor: '#FFFFFF', borderColor: '#E2E8F0', opacity: user.is_active ? 1 : 0.6 }}
    >
      {/* Name + role pill */}
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-bold min-w-0 truncate" style={{ color: '#0F172A' }}>{user.full_name}</p>
        <RoleBadge role={user.role} />
      </div>
      {!user.is_active && (
        <span className="text-xs font-medium" style={{ color: '#EF4444' }}>Deactivated</span>
      )}

      {/* Email */}
      <p className="text-sm mt-1.5 break-all" style={{ color: '#475569' }}>{user.email ?? '—'}</p>

      {/* Phone */}
      <p className="text-sm mt-0.5" style={{ color: user.phone ? '#475569' : '#94A3B8' }}>
        {user.phone ? formatPhone(user.phone) : 'No phone'}
      </p>

      {/* Role change (owner editing others) */}
      {roleEditable && (
        <div className="mt-3">
          <label className="block text-xs font-medium mb-1" style={{ color: '#94A3B8' }}>Role</label>
          <select
            defaultValue={user.role}
            onChange={handleRoleChange}
            disabled={rolePending || !user.is_active}
            className="w-full rounded-lg border px-2.5 py-2 text-sm outline-none"
            style={{ borderColor: '#E2E8F0', color: '#0F172A' }}
          >
            <option value="fd">Funeral Director</option>
            <option value="staff">Staff</option>
          </select>
          {roleError && <p className="text-xs mt-0.5" style={{ color: '#EF4444' }}>{roleError}</p>}
        </div>
      )}

      {/* Actions */}
      {(isSelf || roleEditable) && (
        <div className="mt-3 pt-3 border-t flex items-center gap-4" style={{ borderColor: '#F1F5F9' }}>
          {isSelf && (
            <button
              onClick={() => onEditProfile(user)}
              className="text-sm font-medium hover:underline transition"
              style={{ color: '#0D6E68' }}
            >
              Edit
            </button>
          )}
          {roleEditable && (
            <button
              onClick={handleToggleActive}
              disabled={activePending}
              className="text-sm font-medium hover:underline transition disabled:opacity-50"
              style={{ color: user.is_active ? '#EF4444' : '#0D6E68' }}
            >
              {activePending ? '…' : user.is_active ? 'Deactivate' : 'Reactivate'}
            </button>
          )}
        </div>
      )}
      {activeError && <p className="text-xs mt-1" style={{ color: '#EF4444' }}>{activeError}</p>}
    </div>
  )
}

// ── User row with inline role edit & deactivate (desktop table) ───────────────

function UserTableRow({
  user, currentUserId, onEditProfile,
}: {
  user: UserRow; currentUserId: string; onEditProfile: (user: UserRow) => void
}) {
  const { roleError, activeError, rolePending, activePending, handleRoleChange, handleToggleActive } = useUserRowActions(user)

  const isSelf = user.id === currentUserId

  return (
    <tr
      className="border-b"
      style={{
        borderColor:     '#E2E8F0',
        opacity:         user.is_active ? 1 : 0.5,
      }}
    >
      {/* Name */}
      <td className="px-4 py-3">
        <p className="text-sm font-medium" style={{ color: '#0F172A' }}>{user.full_name}</p>
        {!user.is_active && (
          <span className="text-xs font-medium" style={{ color: '#EF4444' }}>Deactivated</span>
        )}
      </td>

      {/* Email */}
      <td className="px-4 py-3">
        <p className="text-sm" style={{ color: '#475569' }}>{user.email ?? '—'}</p>
      </td>

      {/* Phone */}
      <td className="px-4 py-3">
        <p className="text-sm" style={{ color: '#475569' }}>{formatPhone(user.phone)}</p>
      </td>

      {/* Role */}
      <td className="px-4 py-3">
        {isSelf || user.role === 'owner' ? (
          <span
            className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium"
            style={{ backgroundColor: '#F1F5F9', color: '#475569' }}
          >
            {ROLE_LABELS[user.role]}
          </span>
        ) : (
          <div>
            <select
              defaultValue={user.role}
              onChange={handleRoleChange}
              disabled={rolePending || !user.is_active}
              className="rounded-lg border px-2 py-1.5 text-xs outline-none"
              style={{ borderColor: '#E2E8F0', color: '#0F172A' }}
            >
              <option value="fd">Funeral Director</option>
              <option value="staff">Staff</option>
            </select>
            {roleError && (
              <p className="text-xs mt-0.5" style={{ color: '#EF4444' }}>{roleError}</p>
            )}
          </div>
        )}
      </td>

      {/* Actions */}
      <td className="px-4 py-3 text-right">
        {isSelf ? (
          <button
            onClick={() => onEditProfile(user)}
            className="text-xs font-medium hover:underline transition"
            style={{ color: '#0D6E68' }}
          >
            Edit
          </button>
        ) : user.role !== 'owner' ? (
          <div>
            <button
              onClick={handleToggleActive}
              disabled={activePending}
              className="text-xs font-medium hover:underline transition disabled:opacity-50"
              style={{ color: user.is_active ? '#EF4444' : '#0D6E68' }}
            >
              {activePending
                ? '…'
                : user.is_active
                ? 'Deactivate'
                : 'Reactivate'}
            </button>
            {activeError && (
              <p className="text-xs mt-0.5 text-right" style={{ color: '#EF4444' }}>{activeError}</p>
            )}
          </div>
        ) : null}
      </td>
    </tr>
  )
}

// ── Main panel ────────────────────────────────────────────────────────────────

export function UsersPanel({ users, currentUserId }: { users: UserRow[]; currentUserId: string }) {
  const [inviteOpen, setInviteOpen] = useState(false)
  const [editUser,   setEditUser]   = useState<UserRow | null>(null)

  return (
    <div>
      {inviteOpen && <InviteModal onClose={() => setInviteOpen(false)} />}
      {editUser && <EditProfileModal user={editUser} onClose={() => setEditUser(null)} />}

      <div className="flex items-start justify-between gap-3 mb-6">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold" style={{ color: '#0F172A' }}>Users</h1>
          <p className="text-sm mt-0.5" style={{ color: '#475569' }}>
            Manage your funeral home&apos;s team members.
          </p>
        </div>
        <button
          onClick={() => setInviteOpen(true)}
          className="flex-shrink-0 rounded-full sm:rounded-lg px-3 py-1.5 sm:px-4 sm:py-2 text-sm font-semibold text-white transition hover:opacity-90"
          style={{ backgroundColor: '#0D6E68' }}
        >
          + Invite<span className="hidden sm:inline"> User</span>
        </button>
      </div>

      {users.length === 0 ? (
        <div
          className="rounded-xl border py-16 text-center"
          style={{ backgroundColor: '#FFFFFF', borderColor: '#E2E8F0' }}
        >
          <p className="text-sm font-medium" style={{ color: '#0F172A' }}>No users yet</p>
          <p className="text-sm mt-1" style={{ color: '#475569' }}>
            Invite your first team member above.
          </p>
        </div>
      ) : (
        <>
          {/* Mobile: card layout */}
          <div className="block md:hidden space-y-3">
            {users.map(user => (
              <UserCard
                key={user.id}
                user={user}
                currentUserId={currentUserId}
                onEditProfile={setEditUser}
              />
            ))}
          </div>

          {/* Desktop: table layout (unchanged) */}
          <div
            className="hidden md:block rounded-xl border overflow-hidden"
            style={{ backgroundColor: '#FFFFFF', borderColor: '#E2E8F0' }}
          >
            <table className="w-full border-collapse">
              <thead>
                <tr
                  className="border-b text-left"
                  style={{ borderColor: '#E2E8F0', backgroundColor: '#F7F8FA' }}
                >
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider" style={{ color: '#94A3B8' }}>
                    Name
                  </th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider" style={{ color: '#94A3B8' }}>
                    Email
                  </th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider" style={{ color: '#94A3B8' }}>
                    Phone
                  </th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider" style={{ color: '#94A3B8' }}>
                    Role
                  </th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {users.map(user => (
                  <UserTableRow
                    key={user.id}
                    user={user}
                    currentUserId={currentUserId}
                    onEditProfile={setEditUser}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}
