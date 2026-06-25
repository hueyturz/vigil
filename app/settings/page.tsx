import { redirect } from 'next/navigation'

// /settings has no landing UI of its own — send users to the first settings page.
export default function SettingsPage() {
  redirect('/settings/notifications')
}
