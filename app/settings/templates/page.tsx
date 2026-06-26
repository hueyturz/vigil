import { redirect } from 'next/navigation'
import { createClient, createServiceRoleClient } from '@/lib/supabase/server'
import { AppShell } from '@/components/layout/AppShell'
import { TemplatesPanel } from './TemplatesPanel'
import type { TaskTemplate, Tag } from '@/lib/types'

export default async function TemplatesPage() {
  const supabase    = createClient()
  const serviceRole = createServiceRoleClient()

  const { data: { session } } = await supabase.auth.getSession()
  if (!session) redirect('/login')

  const { data: profile } = await serviceRole
    .from('profiles')
    .select('id, full_name, role, funeral_home_id')
    .eq('id', session.user.id)
    .single()

  if (!profile) redirect('/login')
  if (!['owner', 'fd'].includes(profile.role)) redirect('/dashboard')

  // Fetch this funeral home's custom templates
  const { data: customRaw } = await serviceRole
    .from('task_templates')
    .select('*')
    .eq('funeral_home_id', profile.funeral_home_id)
    .order('sort_order', { ascending: true })

  // Fetch system defaults (funeral_home_id IS NULL)
  const { data: systemRaw } = await serviceRole
    .from('task_templates')
    .select('*')
    .is('funeral_home_id', null)
    .order('sort_order', { ascending: true })

  // Tags per custom template — fetched embed-free (two plain queries joined in JS),
  // so template tags survive a PostgREST relationship/schema-cache embed failure.
  const tplIds = (customRaw ?? []).map(t => t.id)
  const tagsByTemplate = new Map<string, Tag[]>()
  if (tplIds.length > 0) {
    const { data: links } = await serviceRole
      .from('template_task_tags')
      .select('template_task_id, tag_id')
      .in('template_task_id', tplIds)

    const linkTagIds = Array.from(new Set((links ?? []).map(l => l.tag_id)))
    const tagsById = new Map<string, Tag>()
    if (linkTagIds.length > 0) {
      const { data: tagRows } = await serviceRole
        .from('tags')
        .select('id, funeral_home_id, name, color, created_at')
        .in('id', linkTagIds)
      for (const t of tagRows ?? []) tagsById.set(t.id, t as Tag)
    }

    for (const l of links ?? []) {
      const tag = tagsById.get(l.tag_id)
      if (!tag) continue
      const arr = tagsByTemplate.get(l.template_task_id) ?? []
      arr.push(tag)
      tagsByTemplate.set(l.template_task_id, arr)
    }
  }

  const customTemplates: TaskTemplate[] = (customRaw ?? []).map(t => ({
    ...t,
    tags: tagsByTemplate.get(t.id) ?? [],
  })) as TaskTemplate[]
  const systemTemplates: TaskTemplate[] = systemRaw ?? []

  return (
    <AppShell profile={profile}>
      <div className="px-4 py-4 md:px-8 md:py-8 max-w-4xl mx-auto">
        <TemplatesPanel
          customTemplates={customTemplates}
          systemTemplates={systemTemplates}
        />
      </div>
    </AppShell>
  )
}
