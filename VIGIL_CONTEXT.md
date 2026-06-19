# Vigil — Project Context & Handoff Summary

Paste this at the start of any new Claude chat to provide full project context.

---

## What Is Vigil

Vigil is a multi-tenant SaaS platform for funeral home service operations. It solves a specific problem: funeral directors can't trust that service tasks have been completed without verifying them personally. The solution is a confirmation layer — staff don't just check a box, they provide specifics (vendor name, order number, contact name) when completing a task. This gives the FD documented proof without triple-checking.

**Live URL:** https://vigil-three-theta.vercel.app
**GitHub:** https://github.com/hueyturz/vigil
**Primary design partner:** Houston's brother, a funeral director

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS |
| Database | Supabase (PostgreSQL + Auth + RLS) |
| Email | Resend (from: onboarding@resend.dev — temp until custom domain) |
| SMS | Twilio — toll-free number +18338055941, pending verification |
| Transcription | Deepgram (nova-2, diarization enabled) |
| AI Extraction | Anthropic API (claude-sonnet-4-6) |
| Deployment | Vercel (auto-deploys on push to main) |
| Validation | Zod |

---

## Repository Structure

```
/vigil
├── SPEC.md                          (original product spec)
├── VIGIL_CONTEXT.md                 (this file)
├── app/
│   ├── page.tsx                     (root — redirects to dashboard/login)
│   ├── layout.tsx
│   ├── globals.css
│   ├── dashboard/
│   │   ├── page.tsx                 (Overview — stats + ServiceProgressChart)
│   │   ├── loading.tsx
│   │   └── error.tsx
│   ├── services/
│   │   ├── page.tsx                 (Services — create/manage all services)
│   │   ├── actions.ts               (createService, applyTemplateToService, contact)
│   │   ├── task-actions.ts          (add/update/delete/reassign tasks)
│   │   └── [id]/
│   │       ├── page.tsx             (service detail — Meetings | Tasks | Activity)
│   │       ├── loading.tsx
│   │       ├── error.tsx
│   │       └── print/page.tsx       (printable checklist)
│   ├── tasks/page.tsx               (all tasks across services — urgency grouped)
│   ├── my-tasks/                    (staff view — assigned tasks only)
│   ├── admin/
│   │   ├── page.tsx                 (internal cross-tenant dashboard, email-gated)
│   │   └── impersonate/[funeralHomeId]/page.tsx   (read-only account view)
│   ├── settings/
│   │   ├── templates/               (template management — 3-state machine + subtasks)
│   │   ├── notifications/           (per-user notification preferences)
│   │   └── users/                   (user management — owner only, invite by email)
│   ├── login/page.tsx
│   ├── forgot-password/page.tsx     (resetPasswordForEmail flow)
│   ├── reset-password/page.tsx      (updateUser password, lands from email link)
│   ├── onboarding/                  (creates funeral home + owner account)
│   ├── auth/callback/route.ts       (Supabase auth code exchange)
│   └── api/
│       ├── auth/login/route.ts      (sets session cookies server-side)
│       ├── profiles/active/route.ts (active staff list for assignment dropdowns)
│       ├── tasks/[id]/complete/     (mark complete, notify, log activity)
│       ├── notifications/overdue/   (cron endpoint, requires X-Cron-Secret)
│       └── intake/
│           ├── transcribe/          (audio → Deepgram → Claude extraction)
│           ├── extract/             (re-run extraction on stored transcript)
│           ├── save/                (save FD-reviewed extraction to tasks)
│           ├── summary/             (generate + cache AI meeting summary)
│           └── chat/                (AI chat about a specific meeting)
├── components/
│   ├── layout/
│   │   ├── AppShell.tsx             (sidebar + main area wrapper)
│   │   ├── Sidebar.tsx              (desktop nav)
│   │   └── BottomNav.tsx            (mobile nav)
│   ├── dashboard/
│   │   └── ServiceProgressChart.tsx (stacked per-service task-status bars)
│   ├── services/
│   │   ├── ServiceCard.tsx
│   │   ├── ServiceGrid.tsx
│   │   ├── ServicesClient.tsx       (services page: search/sort/tabs/grid)
│   │   ├── StatsRow.tsx
│   │   ├── DashboardHeader.tsx
│   │   ├── CreateServiceModal.tsx   (deceased name required; family_name = deceased_name)
│   │   ├── EditServiceModal.tsx
│   │   ├── EditServiceButton.tsx
│   │   ├── ServiceDetailTabs.tsx    (Meetings default | Tasks | Activity)
│   │   ├── ServiceCompletionFlow.tsx(mark service completed/reopened)
│   │   ├── ContactCard.tsx          (family contact, inline edit)
│   │   ├── CaseNotes.tsx            (service-level notes)
│   │   ├── ActivityLog.tsx          (per-service activity timeline, mounted-guarded)
│   │   └── ApplyTemplateBanner.tsx  (shown when service has no service_type)
│   ├── tasks/
│   │   ├── TaskRow.tsx              (accordion: notes, subtasks, assign, complete; mounted-guarded)
│   │   ├── TaskList.tsx             (grouped by category, manages task state)
│   │   ├── AllTasksView.tsx         (cross-service tasks page, urgency buckets)
│   │   ├── ConfirmTaskModal.tsx     (requires confirmation_value min 10 chars)
│   │   └── AddTaskModal.tsx
│   ├── intake/
│   │   ├── MeetingRecorder.tsx      (in-app audio recorder, iOS/Android compatible)
│   │   ├── ExtractionResults.tsx    (interactive review — accept/reject, edit notes)
│   │   ├── MeetingsTab.tsx          (AI summary, transcript, chat per meeting)
│   │   └── PastMeetings.tsx
│   └── ui/
│       ├── Badge.tsx
│       └── ProgressBar.tsx
├── lib/
│   ├── supabase/
│   │   ├── client.ts                (browser client)
│   │   ├── server.ts                (server + service role clients)
│   │   └── middleware.ts            (session refresh; /api + auth paths excluded)
│   ├── types/index.ts               (all TypeScript interfaces)
│   └── utils/
│       ├── service-status.ts        (green/yellow/red calculation)
│       ├── date-helpers.ts
│       ├── admin.ts                 (ADMIN_EMAILS allow-list + admin guard/helpers)
│       ├── activity.ts              (logActivity client helper)
│       ├── email.ts                 (Resend wrapper — client created at call time)
│       ├── email-templates.ts       (task confirmed + overdue templates)
│       ├── sms.ts                   (Twilio stub — stubbed until verified)
│       ├── deepgram.ts              (transcription + diarization)
│       └── intake.ts                (Claude extraction engine)
└── supabase/migrations/
    ├── 001_create_funeral_homes.sql
    ├── 002_create_profiles.sql
    ├── 003_create_services.sql
    ├── 004_create_task_templates.sql
    ├── 005_create_tasks.sql
    ├── 006_create_sms_log.sql
    ├── 007_enable_rls_policies.sql
    ├── 008_functions_and_triggers.sql
    ├── 009_seed_task_templates.sql
    ├── 010_custom_templates.sql
    ├── 011_create_email_log.sql
    ├── 012_add_task_priority.sql
    ├── 013_notification_preferences.sql
    ├── 014_intake_sessions.sql
    ├── 015_add_task_notes.sql
    ├── 016_intake_ai_summary.sql
    ├── 017_service_contact_notes.sql      (services: notes, contact_name/phone/email)
    ├── 018_task_assignment.sql            (tasks: assigned_to_id)
    ├── 019_activity_log.sql               (activity_log table + RLS)
    ├── 020_task_subtasks.sql              (task_subtasks table + RLS)
    ├── 021_task_template_subtasks.sql     (task_template_subtasks table + RLS)
    ├── 022_copy_subtasks_on_generate.sql  (generate_tasks_for_service copies subtasks)
    └── 023_fix_rls_grants.sql             (grants + activity_log policies scoped to authenticated)
```

---

## Database Schema Summary

### Core Tables
- **funeral_homes** — root tenant record (id, name, phone, address)
- **profiles** — extends auth.users (id, funeral_home_id, full_name, role, phone, is_active)
  - role: 'owner' | 'fd' | 'staff'
- **services** — one per family case
  - family_name, deceased_name (both required in DB; UI collects deceased_name only and sets family_name = deceased_name)
  - service_type: 'full-burial' | 'graveside' | 'cremation' | 'military' | NULL (optional)
  - service_date: date | NULL (optional — set during meeting)
  - location: text | NULL (optional)
  - assigned_staff_id, created_by_id, status ('active'|'completed'|'archived')
  - notes, contact_name, contact_phone, contact_email (migration 017)
- **task_templates** — global system defaults (funeral_home_id IS NULL) + custom per funeral home
  - title, category, confirmation_hint, due_days_before, sort_order
  - priority: 'critical' | 'standard' | 'informational'
  - notes: text | NULL
- **task_template_subtasks** — reusable steps attached to a template task (migration 021)
  - template_id, funeral_home_id, title, sort_order
- **tasks** — generated from templates when service is created
  - All template fields copied at creation time
  - status: 'not-started' | 'complete'
  - confirmation_value, completed_by_id, completed_at
  - assigned_to_id (migration 018)
  - notes: text | NULL (visible to all users, editable via 3-dot menu)
- **task_subtasks** — per-task steps/checklist (migration 020)
  - task_id, funeral_home_id, title, is_complete, sort_order
  - Copied from task_template_subtasks at task-generation time (migration 022)
- **activity_log** — per-funeral-home audit trail (migration 019)
  - funeral_home_id, service_id, task_id, actor_id, actor_name, action_type, description, metadata (jsonb), created_at
  - action_type: task_completed | task_assigned | task_added | task_deleted | task_edited | notes_updated | contact_updated | service_completed | service_reopened
- **sms_log** — SMS notification log (stubbed, status stays 'pending' until Twilio verified)
- **email_log** — email notification log
- **notification_preferences** — per user
  - critical_email, critical_sms, standard_email, standard_sms
  - informational_email, informational_sms, overdue_email, overdue_sms
- **intake_sessions** — meeting recordings per service
  - transcript, raw_extraction (jsonb), ai_summary
  - status: 'recording'|'transcribing'|'extracting'|'complete'|'failed'

### Key Database Functions
- **generate_tasks_for_service(service_id)** — called after service insert, copies templates to tasks (PL/pgSQL loop with RETURNING id) and copies task_template_subtasks into task_subtasks (migration 022). Checks custom templates first, falls back to system defaults.
- **handle_new_user()** — trigger on auth.users INSERT, creates profiles row from metadata
- **applyTemplateToService(serviceId, serviceType)** — server action, applies template with deduplication (skips tasks that already exist by title match) and copies template subtasks to task_subtasks

### All RLS Policies
Every table is scoped by funeral_home_id. Users can only see data from their own funeral home. Service role key bypasses RLS for server-side operations. Migration 023 documents the manual grants applied in production (SELECT on profiles, ALL on task_subtasks/activity_log for authenticated) and recreates the activity_log SELECT/INSERT policies scoped to the `authenticated` role.

---

## User Roles

| Role | Access |
|---|---|
| owner | Everything + user management |
| fd | All services, all tasks, templates, notifications |
| staff | Only assigned services, only their tasks, notifications |

**Internal admin** — `/admin` and `/admin/impersonate/[id]` are gated by a hardcoded email allow-list in `lib/utils/admin.ts` (`ADMIN_EMAILS`, currently `hueyturz@gmail.com`). Non-admins receive a 404. These pages use the service role client to read across all funeral homes and are not linked from any nav.

---

## Key Business Logic

### Service Status Calculation (lib/utils/service-status.ts)
```
days_until_service = service_date - today

GREEN  = all tasks complete
RED    = any incomplete task where days_until_service <= due_days_before
YELLOW = everything else
```

### Task Priority System
- **Critical** (red dot) — casket, vault, cemetery, cremation auth, military items
- **Standard** (yellow dot) — flowers, programs, obituary, death certs
- **Informational** (gray dot) — viewing room, family notifications

### Notification Logic
On task completion: check user's notification_preferences, send email via Resend based on task priority level. SMS stubbed until Twilio verified.

### Meeting Recording Flow
1. FD clicks Start Meeting → browser MediaRecorder (audio/mp4 on iOS, audio/webm on desktop)
2. Audio POSTed to /api/intake/transcribe
3. Deepgram transcribes with diarization (speaker labels)
4. Claude relabels speakers as "Funeral Director" / "Family Member"
5. Claude extracts tasks/decisions as JSON
6. Extraction results shown in interactive review UI
7. FD accepts/rejects/edits items, clicks Save to Service
8. Accepted items: existing tasks get notes updated, new tasks inserted
9. Nothing is ever auto-confirmed from a recording — completion stays manual

### Template Management (3-state machine)
- **State 1 DEFAULT**: system templates, "Customize This Template" banner
- **State 2 EDITING**: edit/delete/reorder controls, "Done Editing" button
- **State 3 CUSTOM READ-ONLY**: custom tasks, "Edit Template" button
- Template tasks support nested steps (subtasks) via an accordion expand on each row.

### Client-side date rendering (hydration safety)
Components that compute relative dates/times during render (TaskRow, ActivityLog) gate that output behind a `mounted` flag so server HTML and the first client render match, avoiding React hydration errors (#418/#422/#425). Server components (e.g. ServiceProgressChart) may compute dates directly since they don't hydrate.

---

## Environment Variables

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
RESEND_API_KEY
TWILIO_ACCOUNT_SID
TWILIO_AUTH_TOKEN
TWILIO_FROM_NUMBER=+18338055941
DEEPGRAM_API_KEY
ANTHROPIC_API_KEY
CRON_SECRET=vigil_cron_9x4mK2pQwR8vLnT5jYeA7bZdFhUcS3
NEXT_PUBLIC_APP_URL=https://vigil-three-theta.vercel.app
```

---

## Design Tokens

```
Primary teal:    #0D6E68
Sidebar:         #0F172A
Background:      #F7F8FA
Card:            #FFFFFF
Border:          #E2E8F0
Text primary:    #0F172A
Text secondary:  #475569
Text muted:      #94A3B8

Status green:    #10B981 / bg #ECFDF5 / border #A7F3D0
Status yellow:   #F59E0B / bg #FFFBEB / border #FDE68A
Status red:      #EF4444 / bg #FEF2F2 / border #FECACA

Priority critical:       red dot
Priority standard:       yellow dot
Priority informational:  gray dot
```

---

## What's Complete

- ✅ Phase 1-8: Full app build (auth, dashboard, service management, task confirmation, staff view, user management, mobile responsive, error handling)
- ✅ Phase A: Custom tasks + template management with 3-state UI
- ✅ Phase B: Live email notifications via Resend
- ✅ Phase C: Task priority system + per-user notification preferences
- ✅ Phase D: In-app meeting recording, Deepgram transcription, Claude AI extraction, interactive review UI, Meeting Intelligence tab (AI summary + transcript + chat)
- ✅ Speaker diarization with Claude relabeling (Funeral Director / Family Member)
- ✅ Dedicated Services page (create/edit/delete/manage) split off the dashboard; dashboard is now an Overview with stats + ServiceProgressChart
- ✅ Cross-service Tasks page with urgency grouping (Overdue/Today/Week/Upcoming/No Date) and filters, using the shared TaskRow accordion
- ✅ Task assignment to staff (migration 018) with inline assign/reassign
- ✅ Task subtasks/steps on both tasks and templates (migrations 020–022), copied on task generation
- ✅ Service detail tabs reordered to Meetings (default) | Tasks | Activity
- ✅ Per-service Activity Log + cross-account activity feed on /admin (migration 019, grants in 023)
- ✅ Family contact card + service case notes (migration 017)
- ✅ Service completion flow (mark completed / reopened) and printable checklist
- ✅ "Family Name" removed from the UI — deceased_name is the single service identifier
- ✅ Password reset flow (/forgot-password + /reset-password)
- ✅ Internal admin dashboard (/admin) with per-account stats, recent activity feed, and read-only impersonation view (/admin/impersonate/[id]), email-gated
- ✅ Hardening of the task-complete API route (env guards, top-level try/catch, /api excluded from Edge middleware, Resend client created at call time)

---

## What's Pending / In Progress

- ⏳ **Twilio SMS verification** — toll-free number +18338055941 submitted for verification, awaiting approval. Once approved, update sms.ts to make real Twilio calls and wire into notification system.
- ⏳ **Custom sending domain** — emails currently come from onboarding@resend.dev (lands in inbox but not professional). Buy a domain, verify with Resend, update FROM address.
- ⏳ **SMS reminder system** — your brother's #1 request. Send SMS reminders when tasks approach their deadline and haven't been confirmed. Use Upstash QStash for reliable scheduling (NOT Vercel cron). Build after Twilio verified.
- ⏳ **Real domain** — vigil-three-theta.vercel.app is not customer-facing. Buy getvigil.com or similar.
- ⏳ **Stripe billing** — needed before charging customers.
- ⏳ **Sentry error monitoring** — needed before paying customers.
- ⏳ **Supabase Pro upgrade** — needed before paying customers (for backups).
- ⏳ **Staging environment** — needed before paying customers.
- ⏳ **Automated tests** — needed before 10+ paying customers.
- ⏳ **Admin impersonation deep-links** — "View" links from the impersonate page open the real /services/[id], which RLS blocks for the admin (different funeral home). A true read-only impersonation view of a single service is still pending.
- ⏳ **Mobile layout polish on service detail** — see the audit notes; some fixed-width elements need responsive treatment.

---

## Claude Code Workflow Notes

- Always include git push instruction only for meaningful milestones, not every small fix
- Run migrations in Supabase SQL editor manually after each phase that includes one
- Verify each phase against the file list before moving to the next
- When debugging Vercel issues, check build logs first, then runtime logs
- Service role client (createServiceRoleClient) must be used for any operation that bypasses RLS
- ANTHROPIC_API_KEY and DEEPGRAM_API_KEY are server-side only, never NEXT_PUBLIC_ prefixed

---

## How to Use This Document

Paste this entire document as your first message in a new Claude chat, then describe what you want to build next. Claude will have full context on the project without needing the conversation history.
