# Vigil — Product Specification v1.0

---

## 0. How to Use This Spec

This document is the single source of truth for the Vigil build. Claude Code reads it before executing any phase. Do not make architectural decisions not covered here — surface the question and wait for clarification before proceeding.

Each section is numbered. Claude Code prompts at the bottom of this document reference these section numbers directly.

---

## 1. Product Overview

### 1.1 Problem
Funeral directors cannot trust that service tasks have been completed without verifying them personally. Tasks are delegated to staff but there is no confirmation infrastructure — staff mark things done with no record of who did what, when, or with what specifics. When something slips — a casket not ordered, a cemetery not notified — the family pays the price. The funeral director is always the last line of defense and carries that anxiety constantly.

### 1.2 Solution
Vigil introduces a **confirmation layer** between task assignment and task completion. Staff cannot simply check a box — they must provide specifics: vendor name, order number, contact name, run date. This transforms "I think it's done" into documented proof the funeral director can trust without re-verifying.

### 1.3 Users
| Role | Access |
|---|---|
| **Owner** | Everything. Creates funeral home account, manages users, all FD access. |
| **Funeral Director (fd)** | Dashboard across all active services, all task details, all confirmations. Can mark tasks complete. |
| **Staff** | Sees only services assigned to them. Marks tasks complete with confirmation detail. |

### 1.4 Multi-Tenancy Model
Vigil is a multi-tenant SaaS platform. Each funeral home is an isolated tenant. Every user belongs to exactly one funeral home. All data is scoped by `funeral_home_id`. No tenant can access another tenant's data. This is enforced at the database level via Supabase Row Level Security — not just at the application layer.

---

## 2. Tech Stack

| Layer | Technology | Version | Reason |
|---|---|---|---|
| Framework | Next.js (App Router) | 14 | Server components, file-based routing, API routes co-located |
| Language | TypeScript | 5.x | Type safety end-to-end from DB schema to UI |
| Styling | Tailwind CSS | 3.x | Utility-first, fast iteration, no runtime overhead |
| Database | Supabase (PostgreSQL) | Latest | Managed Postgres, Auth, RLS, realtime — purpose-built for this pattern |
| Auth | Supabase Auth | Built-in | Email/password, session management, integrates directly with RLS policies |
| Validation | Zod | 3.x | Schema validation for all forms and API payloads |
| SMS | Twilio | 4.x | Stubbed in v1 — install SDK, write functions, log to sms_log. Do not call API yet. |
| Deployment | Vercel | — | Native Next.js deployment, zero config |

---

## 3. Database Schema

### 3.1 `funeral_homes`
The root tenant record. Every other table that holds tenant data references this.

| Column | Type | Constraints | Notes |
|---|---|---|---|
| id | uuid | PK, default gen_random_uuid() | |
| name | text | NOT NULL | Business name |
| phone | text | | Main contact number |
| address | text | | |
| created_at | timestamptz | NOT NULL, default now() | |

---

### 3.2 `profiles`
Extends Supabase `auth.users`. Created automatically by trigger on user signup. This is the primary user record used throughout the app.

| Column | Type | Constraints | Notes |
|---|---|---|---|
| id | uuid | PK, references auth.users(id) ON DELETE CASCADE | Matches auth.users id |
| funeral_home_id | uuid | NOT NULL, references funeral_homes(id) | Tenant scope |
| full_name | text | NOT NULL | Display name |
| role | text | NOT NULL, check role in ('owner','fd','staff') | |
| phone | text | | For SMS notifications |
| created_at | timestamptz | NOT NULL, default now() | |

---

### 3.3 `services`
One record per family case. This is the central unit of the product.

| Column | Type | Constraints | Notes |
|---|---|---|---|
| id | uuid | PK, default gen_random_uuid() | |
| funeral_home_id | uuid | NOT NULL, references funeral_homes(id) | |
| family_name | text | NOT NULL | e.g. "Henderson" |
| deceased_name | text | NOT NULL | e.g. "Robert J. Henderson" |
| service_type | text | NOT NULL, check in ('full-burial','graveside','cremation','military') | |
| service_date | date | NOT NULL | |
| location | text | NOT NULL | Cemetery, funeral home, etc. |
| assigned_staff_id | uuid | references profiles(id), nullable | The staff member responsible |
| created_by_id | uuid | NOT NULL, references profiles(id) | |
| status | text | NOT NULL, default 'active', check in ('active','completed','archived') | |
| notes | text | | Optional internal notes |
| created_at | timestamptz | NOT NULL, default now() | |

---

### 3.4 `task_templates`
Global system templates shared across all tenants. Seeded via migration `009`. No `funeral_home_id` — these are read-only system defaults. Custom per-tenant templates are a v2 feature.

| Column | Type | Constraints | Notes |
|---|---|---|---|
| id | uuid | PK, default gen_random_uuid() | |
| service_type | text | NOT NULL, check in ('full-burial','graveside','cremation','military') | |
| title | text | NOT NULL | e.g. "Casket ordered" |
| category | text | NOT NULL | Groups tasks visually. Values: Merchandise, Cemetery, Print, Communication, Legal, Arrangements, Facility, Military |
| confirmation_hint | text | NOT NULL | Prompt shown to staff. e.g. "Vendor name & order number" |
| due_days_before | int | NOT NULL | Days before service_date this task must be complete |
| sort_order | int | NOT NULL | Display order within service type |

---

### 3.5 `tasks`
Generated from `task_templates` when a service is created. One row per task per service. Template fields are copied at creation time — changes to templates do not affect existing tasks.

| Column | Type | Constraints | Notes |
|---|---|---|---|
| id | uuid | PK, default gen_random_uuid() | |
| service_id | uuid | NOT NULL, references services(id) ON DELETE CASCADE | |
| funeral_home_id | uuid | NOT NULL, references funeral_homes(id) | Denormalized for RLS performance |
| title | text | NOT NULL | Copied from template |
| category | text | NOT NULL | Copied from template |
| confirmation_hint | text | NOT NULL | Copied from template |
| due_days_before | int | NOT NULL | Copied from template |
| sort_order | int | NOT NULL | Copied from template |
| assigned_to_id | uuid | references profiles(id), nullable | Inherited from service's assigned_staff_id at creation |
| status | text | NOT NULL, default 'not-started', check in ('not-started','complete') | |
| confirmation_value | text | | Required to be non-empty when marking complete |
| completed_by_id | uuid | references profiles(id), nullable | Set on completion |
| completed_at | timestamptz | | Set on completion |
| created_at | timestamptz | NOT NULL, default now() | |

---

### 3.6 `sms_log`
Audit log of SMS notification events. Twilio send is stubbed in v1 — records are written here but `status` stays 'pending' until Twilio is wired in v2.

| Column | Type | Constraints | Notes |
|---|---|---|---|
| id | uuid | PK, default gen_random_uuid() | |
| funeral_home_id | uuid | NOT NULL | |
| service_id | uuid | NOT NULL | |
| task_id | uuid | nullable | |
| recipient_id | uuid | NOT NULL, references profiles(id) | Who should receive the SMS |
| message | text | NOT NULL | The message that would be sent |
| status | text | NOT NULL, default 'pending', check in ('pending','sent','failed') | |
| created_at | timestamptz | NOT NULL, default now() | |

---

### 3.7 Row Level Security Policies

Enable RLS on all tables. The helper pattern to use:

```sql
-- Get the funeral_home_id of the currently authenticated user
(SELECT funeral_home_id FROM profiles WHERE id = auth.uid())
```

**`funeral_homes`**
- SELECT: `id = (SELECT funeral_home_id FROM profiles WHERE id = auth.uid())`
- No INSERT/UPDATE/DELETE from client (server-side only via service role key)

**`profiles`**
- SELECT: `funeral_home_id = (SELECT funeral_home_id FROM profiles WHERE id = auth.uid())`
- UPDATE: `id = auth.uid()` (users can update only their own profile)

**`services`**
- SELECT: `funeral_home_id = (SELECT funeral_home_id FROM profiles WHERE id = auth.uid())`
- INSERT: same funeral_home_id check AND user role in ('owner','fd')
- UPDATE: same funeral_home_id check AND user role in ('owner','fd')
- DELETE: none (use status = 'archived' instead)

**`task_templates`**
- SELECT only: all authenticated users (no funeral_home_id check — these are global)

**`tasks`**
- SELECT: `funeral_home_id = (SELECT funeral_home_id FROM profiles WHERE id = auth.uid())`
- UPDATE: `funeral_home_id` matches AND (user role in ('owner','fd') OR assigned_to_id = auth.uid())
- INSERT: none from client (generated server-side by function)

**`sms_log`**
- SELECT: `funeral_home_id` matches AND user role in ('owner','fd')
- INSERT: none from client (server-side API route only)

---

### 3.8 Database Functions & Triggers

**`handle_new_user()`**
Trigger function on `auth.users` AFTER INSERT. Creates a corresponding `profiles` row using `new.id` and metadata from `new.raw_user_meta_data` (full_name, role, funeral_home_id). This metadata is passed during signup via `supabase.auth.signUp({ data: { full_name, role, funeral_home_id } })`.

```sql
-- Pseudocode for what this function does:
INSERT INTO profiles (id, funeral_home_id, full_name, role)
VALUES (
  new.id,
  (new.raw_user_meta_data->>'funeral_home_id')::uuid,
  new.raw_user_meta_data->>'full_name',
  new.raw_user_meta_data->>'role'
);
```

**`generate_tasks_for_service(p_service_id uuid)`**
Called server-side (via service role key) immediately after a service is inserted. Queries `task_templates` WHERE `service_type` matches the service, then inserts one `tasks` row per template.

```sql
-- Pseudocode:
INSERT INTO tasks (service_id, funeral_home_id, title, category, confirmation_hint,
                   due_days_before, sort_order, assigned_to_id)
SELECT
  p_service_id,
  s.funeral_home_id,
  t.title,
  t.category,
  t.confirmation_hint,
  t.due_days_before,
  t.sort_order,
  s.assigned_staff_id
FROM task_templates t
JOIN services s ON s.id = p_service_id
WHERE t.service_type = s.service_type
ORDER BY t.sort_order;
```

---

## 4. Task Templates (Seed Data for Migration 009)

Insert all rows with `sort_order` as listed. These are the only rows that go in via migration — no service data, no user data, no demo data of any kind.

### Full Burial — 14 tasks

| sort_order | title | category | confirmation_hint | due_days_before |
|---|---|---|---|---|
| 1 | Casket ordered | Merchandise | Vendor name & order number | 7 |
| 2 | Vault ordered | Merchandise | Vendor name & order number | 7 |
| 3 | Cemetery contacted & burial scheduled | Cemetery | Contact name & confirmation date | 5 |
| 4 | Flowers ordered | Merchandise | Florist name & order number | 3 |
| 5 | Programs designed | Print | Designed by & family approval date | 4 |
| 6 | Programs printed | Print | Printer name & quantity received | 1 |
| 7 | Obituary written | Communication | Written by & family approval date | 4 |
| 8 | Obituary submitted to newspaper | Communication | Publication name & run date | 3 |
| 9 | Death certificates ordered | Legal | Quantity ordered & expected receipt date | 5 |
| 10 | Tent & chairs setup confirmed | Cemetery | Confirmed by & setup time | 2 |
| 11 | Viewing room prepared | Facility | Prepared by & ready time | 1 |
| 12 | Clergy / officiant confirmed | Arrangements | Name & contact number | 3 |
| 13 | Pallbearers confirmed | Arrangements | Count & names confirmed | 2 |
| 14 | Family notified of service details | Communication | Notified by, method & date | 1 |

### Graveside Only — 10 tasks

| sort_order | title | category | confirmation_hint | due_days_before |
|---|---|---|---|---|
| 1 | Vault ordered | Merchandise | Vendor name & order number | 7 |
| 2 | Cemetery contacted & burial scheduled | Cemetery | Contact name & confirmation date | 5 |
| 3 | Flowers ordered | Merchandise | Florist name & order number | 3 |
| 4 | Tent & chairs setup confirmed | Cemetery | Confirmed by & setup time | 2 |
| 5 | Programs designed & printed | Print | Printer name & quantity received | 2 |
| 6 | Obituary written & submitted | Communication | Publication name & run date | 3 |
| 7 | Death certificates ordered | Legal | Quantity ordered & expected receipt date | 5 |
| 8 | Clergy / officiant confirmed | Arrangements | Name & contact number | 3 |
| 9 | Pallbearers confirmed | Arrangements | Count & names confirmed | 2 |
| 10 | Family notified of service details | Communication | Notified by, method & date | 1 |

### Cremation — 9 tasks

| sort_order | title | category | confirmation_hint | due_days_before |
|---|---|---|---|---|
| 1 | Cremation authorization signed | Legal | Signed by (next of kin) & date | 7 |
| 2 | Crematory scheduled | Arrangements | Crematory name & scheduled date / time | 5 |
| 3 | Urn selected | Merchandise | Urn model, vendor & order number | 5 |
| 4 | Memorial flowers ordered | Merchandise | Florist name & order number | 3 |
| 5 | Programs designed & printed | Print | Printer name & quantity received | 2 |
| 6 | Obituary written & submitted | Communication | Publication name & run date | 3 |
| 7 | Death certificates ordered | Legal | Quantity ordered & expected receipt date | 5 |
| 8 | Cremation completed & remains received | Arrangements | Date received & confirmation reference | 3 |
| 9 | Family notified of final details | Communication | Notified by, method & date | 1 |

### Military Honors — 14 tasks

| sort_order | title | category | confirmation_hint | due_days_before |
|---|---|---|---|---|
| 1 | Casket ordered | Merchandise | Vendor name & order number | 7 |
| 2 | Vault ordered | Merchandise | Vendor name & order number | 7 |
| 3 | VA burial benefits verified | Military | Benefits confirmed & VA reference number | 7 |
| 4 | Honor guard requested & confirmed | Military | Unit contact name & confirmation number | 7 |
| 5 | Cemetery contacted & burial scheduled | Cemetery | Contact name & confirmation date | 5 |
| 6 | Flowers ordered | Merchandise | Florist name & order number | 3 |
| 7 | Flag ceremony details confirmed | Military | Confirmed by & ceremony details | 3 |
| 8 | Programs designed & printed | Print | Printer name & quantity received | 2 |
| 9 | Obituary written & submitted | Communication | Publication name & run date | 3 |
| 10 | Death certificates ordered | Legal | Quantity ordered & expected receipt date | 5 |
| 11 | Tent & chairs setup confirmed | Cemetery | Confirmed by & setup time | 2 |
| 12 | Clergy / officiant confirmed | Arrangements | Name & contact number | 3 |
| 13 | Pallbearers confirmed | Arrangements | Count & names confirmed | 2 |
| 14 | Family notified of service details | Communication | Notified by, method & date | 1 |

---

## 5. Business Logic

### 5.1 Service Status Calculation
Computed at runtime from tasks. Never stored in the database.

```
days_until_service = service_date - today (floor, in whole days)

GREEN  → all tasks have status = 'complete'
RED    → any task where status = 'not-started' AND days_until_service <= due_days_before
YELLOW → all other cases (tasks incomplete but none past deadline)
```

Implement as a pure function in `lib/utils/service-status.ts`. It takes a service's tasks and the current date and returns `'green' | 'yellow' | 'red'`. This function is used in both server components and client components.

### 5.2 Overdue Task Detection
A task is overdue when:
```
status = 'not-started' AND days_until_service <= due_days_before
```

Used for: status calculation, visual indicators on task rows, overdue count in dashboard stats.

### 5.3 Task Generation on Service Create
1. Server-side only (use Supabase service role client in API route or server action)
2. INSERT the service record
3. Call `generate_tasks_for_service(service_id)` Supabase function
4. All tasks inherit `assigned_to_id` from the service's `assigned_staff_id`

### 5.4 Task Completion Flow
1. User clicks "Mark Complete" → modal opens
2. Modal pre-fills `completed_by` from session profile (read-only)
3. User enters `confirmation_value` (required, min 10 chars, validated with Zod)
4. POST to `/api/tasks/[id]/complete`
5. API route (server-side, service role key):
   - Validates payload
   - Updates task: `status = 'complete'`, `confirmation_value`, `completed_by_id = auth.uid()`, `completed_at = now()`
   - Gets the FD/owner for this funeral home
   - Inserts row into `sms_log` with `status = 'pending'`
   - TODO comment: `// await sendSMS(recipient.phone, message)` — Twilio stub
   - Returns updated task
6. Client revalidates or updates local state

### 5.5 SMS Message Format (for sms_log)
```
"[Completed by name] confirmed '[task title]' for the [family_name] service 
([service_date]). Detail: [first 80 chars of confirmation_value]"
```

---

## 6. Screens & Components

### 6.1 Route Map
| Route | Role | Description |
|---|---|---|
| / | any | Redirect: authenticated → /dashboard, unauthenticated → /login |
| /login | public | Email + password login |
| /onboarding | public | New funeral home setup (create org + owner account) |
| /dashboard | owner, fd | All active services |
| /services/[id] | owner, fd, assigned staff | Service detail + task list |
| /my-tasks | staff | Tasks assigned to current user |
| /settings/users | owner | User management |

### 6.2 Layout
All authenticated routes share a layout with:
- Fixed sidebar (220px) containing: Vigil logo, navigation links, user info, sign out
- Main content area (flex-1, overflow-auto)
- Sidebar shows red badge on dashboard nav item if any services are status = red

### 6.3 Dashboard (/dashboard)
**Stats Row** (3 cards):
- Active Services: `COUNT(*) WHERE status = 'active'`
- Needs Attention: count of active services with computed status = red
- Overdue Tasks: sum of overdue tasks across all active services

**Service Cards Grid** (auto-fill, min 300px columns, sorted by service_date ASC):
Each card contains:
- Service type label (uppercase, muted)
- Status pill (label + colored dot)
- Family name (serif font, prominent)
- Deceased name (secondary text)
- Service date + days-until chip (red if ≤2 days, amber if ≤5, gray otherwise)
- Location
- Progress: "X/Y tasks confirmed" + progress bar
- "View service →" link

**New Service button** → opens CreateServiceModal

### 6.4 Create Service Modal
Fields (all required except assigned staff):
- Family Name
- Deceased Full Name
- Service Type (select)
- Service Date (date, min = today)
- Location
- Assign to Staff (select, populated from profiles WHERE role = 'staff' AND funeral_home_id matches)

Live preview: "X tasks will be auto-generated" updates as service type changes (pull count from TEMPLATES constant in client, not a DB call).

On submit → server action or POST to API → create service + generate tasks → close modal + revalidate dashboard.

### 6.5 Service Detail (/services/[id])
Header:
- Back to Dashboard
- Service type label
- Family name (serif, large)
- Deceased name
- Date + location
- Status pill + "X/Y tasks confirmed"

Confirmation progress bar (full width, colored by status)

Task list grouped by category (categories display in the order they first appear by sort_order):
- Category header: "CATEGORY NAME" + "X/Y" count

Each TaskRow:
- Status icon: CheckCircle2 (complete, green), AlertCircle (overdue, red), Circle (pending, muted)
- Task title
- If complete: "Confirmed by [full_name] · [formatted date]" in green
- If complete: expandable "Details" toggle → shows confirmation_value
- If overdue + incomplete: "Overdue — needs immediate confirmation" in red
- If incomplete: "Mark Complete" button (red if overdue, teal otherwise) + "due Xd before" label
- Mark Complete opens ConfirmTaskModal

### 6.6 Confirm Task Modal
- Task title displayed (read-only)
- "Confirmed by" field: pre-filled with current user's full_name, read-only
- Confirmation detail textarea: label = task's confirmation_hint, required, min 10 chars
- Submit button disabled until validation passes
- On success: modal closes, task row updates in place

### 6.7 Staff View (/my-tasks)
- Header: "My Tasks" + user's full name
- For each assigned service (sorted by service_date ASC):
  - Service header: family name, date, location, status pill
  - Pending section: incomplete tasks with Mark Complete buttons
  - Completed section: completed tasks with expandable detail (collapsed by default)

### 6.8 User Management (/settings/users)
- Table of all profiles in this funeral home: name, role, email (from auth.users), phone
- Invite User button: sends Supabase auth invite email with selected role
- Edit role inline
- Deactivate user (set a soft-delete flag — add `is_active boolean default true` to profiles)
- Only accessible to role = owner

---

## 7. TypeScript Types

Define all types in `lib/types/index.ts`. Types must exactly match the database schema.

```typescript
export type Role = 'owner' | 'fd' | 'staff'
export type ServiceType = 'full-burial' | 'graveside' | 'cremation' | 'military'
export type ServiceStatus = 'active' | 'completed' | 'archived'
export type TaskStatus = 'not-started' | 'complete'
export type ComputedStatus = 'green' | 'yellow' | 'red'
export type SmsStatus = 'pending' | 'sent' | 'failed'

export interface FuneralHome {
  id: string
  name: string
  phone: string | null
  address: string | null
  created_at: string
}

export interface Profile {
  id: string
  funeral_home_id: string
  full_name: string
  role: Role
  phone: string | null
  is_active: boolean
  created_at: string
}

export interface Service {
  id: string
  funeral_home_id: string
  family_name: string
  deceased_name: string
  service_type: ServiceType
  service_date: string       // ISO date string 'YYYY-MM-DD'
  location: string
  assigned_staff_id: string | null
  created_by_id: string
  status: ServiceStatus
  notes: string | null
  created_at: string
}

export interface Task {
  id: string
  service_id: string
  funeral_home_id: string
  title: string
  category: string
  confirmation_hint: string
  due_days_before: number
  sort_order: number
  assigned_to_id: string | null
  status: TaskStatus
  confirmation_value: string | null
  completed_by_id: string | null
  completed_at: string | null
  created_at: string
}

export interface TaskTemplate {
  id: string
  service_type: ServiceType
  title: string
  category: string
  confirmation_hint: string
  due_days_before: number
  sort_order: number
}

export interface SmsLog {
  id: string
  funeral_home_id: string
  service_id: string
  task_id: string | null
  recipient_id: string
  message: string
  status: SmsStatus
  created_at: string
}

// Extended types for joined queries
export interface ServiceWithTasks extends Service {
  tasks: Task[]
}

export interface ServiceWithProfile extends Service {
  assigned_staff: Pick<Profile, 'id' | 'full_name'> | null
}

export interface TaskWithProfile extends Task {
  completed_by: Pick<Profile, 'id' | 'full_name'> | null
  assigned_to: Pick<Profile, 'id' | 'full_name'> | null
}
```

---

## 8. File Structure

```
/vigil
├── SPEC.md
├── README.md
├── .env.example
├── .gitignore
├── next.config.ts
├── tailwind.config.ts
├── tsconfig.json
├── package.json
├── vercel.json
│
├── /app
│   ├── layout.tsx
│   ├── page.tsx                          (redirect logic)
│   ├── /login
│   │   └── page.tsx
│   ├── /onboarding
│   │   └── page.tsx
│   ├── /dashboard
│   │   └── page.tsx
│   ├── /services
│   │   └── /[id]
│   │       └── page.tsx
│   ├── /my-tasks
│   │   └── page.tsx
│   ├── /settings
│   │   └── /users
│   │       └── page.tsx
│   └── /api
│       └── /tasks
│           └── /[id]
│               └── /complete
│                   └── route.ts
│
├── /components
│   ├── /ui
│   │   ├── Button.tsx
│   │   ├── Modal.tsx
│   │   ├── Input.tsx
│   │   ├── Select.tsx
│   │   ├── Textarea.tsx
│   │   ├── Badge.tsx                     (status pill)
│   │   └── ProgressBar.tsx
│   ├── /layout
│   │   ├── AppShell.tsx                  (sidebar + main area wrapper)
│   │   └── Sidebar.tsx
│   ├── /services
│   │   ├── ServiceCard.tsx
│   │   ├── ServiceGrid.tsx
│   │   ├── StatsRow.tsx
│   │   └── CreateServiceModal.tsx
│   └── /tasks
│       ├── TaskRow.tsx
│       ├── TaskList.tsx                  (grouped by category)
│       └── ConfirmTaskModal.tsx
│
├── /lib
│   ├── /supabase
│   │   ├── client.ts                     (createBrowserClient)
│   │   ├── server.ts                     (createServerClient for server components)
│   │   └── middleware.ts                 (session refresh)
│   ├── /types
│   │   └── index.ts                      (all types from Section 7)
│   └── /utils
│       ├── service-status.ts             (pure status calculation fn)
│       ├── date-helpers.ts               (daysUntil, formatDate, formatDateTime)
│       └── sms.ts                        (Twilio stub with TODO)
│
├── /middleware.ts                         (Next.js middleware — session refresh + route protection)
│
└── /supabase
    └── /migrations
        ├── 001_create_funeral_homes.sql
        ├── 002_create_profiles.sql
        ├── 003_create_services.sql
        ├── 004_create_task_templates.sql
        ├── 005_create_tasks.sql
        ├── 006_create_sms_log.sql
        ├── 007_enable_rls_policies.sql
        ├── 008_functions_and_triggers.sql
        └── 009_seed_task_templates.sql
```

---

## 9. Design Tokens

Apply these consistently across all Tailwind classes. Do not deviate without a reason.

```
Primary teal:       #4A7C8C   (teal-700 equivalent — primary buttons, links, active states)
Sidebar bg:         #0F172A   (slate-900)
Sidebar active:     #1E293B   (slate-800)
App background:     #F7F8FA
Card background:    #FFFFFF
Border:             #E2E8F0   (slate-200)
Text primary:       #0F172A   (slate-900)
Text secondary:     #475569   (slate-600)
Text muted:         #94A3B8   (slate-400)

Status green:       dot #10B981 / bg #ECFDF5 / border #A7F3D0 / text #065F46
Status yellow:      dot #F59E0B / bg #FFFBEB / border #FDE68A / text #92400E
Status red:         dot #EF4444 / bg #FEF2F2 / border #FECACA / text #991B1B

Typography:
  UI elements:      system-ui, sans-serif (Tailwind default)
  Family/deceased names: font-serif (Georgia fallback) — apply via Tailwind prose or custom class
```

---

## 10. Environment Variables

```bash
# .env.example

# Supabase — get from project Settings > API
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Twilio — stubbed in v1, wire in v2
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_FROM_NUMBER=

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## 11. Build Phases & Claude Code Prompts

Execute phases in order. Do not start a new phase until the current one is complete and confirmed. Each prompt assumes SPEC.md is in the project root.

---

### Phase 1 — Foundation

**Goal:** Project setup, database schema, migrations, seed data. No UI.

**Deliverables:**
- Next.js 14 project initialized with TypeScript and Tailwind CSS
- All 9 migration files in `/supabase/migrations` matching Section 3 and Section 4 exactly
- `/lib/types/index.ts` matching Section 7 exactly
- `.env.example` matching Section 10
- `vercel.json` with standard Next.js config
- `README.md` with: prerequisites, Supabase project setup steps, how to run migrations, how to set env vars, how to run dev server
- `.gitignore` that excludes `.env.local` and standard Next.js/Node artifacts

**Claude Code Prompt:**
```
Read SPEC.md in the project root. Execute Phase 1 only.

Initialize a Next.js 14 project with TypeScript and Tailwind CSS in the current directory. 
Then create all 9 Supabase migration files in /supabase/migrations following Section 3 
(schema), Section 3.7 (RLS policies), Section 3.8 (functions and triggers), and Section 4 
(seed data) of the spec exactly. Create /lib/types/index.ts from Section 7. Create 
.env.example from Section 10. Create vercel.json and README.md. Do not create any 
application UI or API routes. Stop when complete and list every file created.
```

---

### Phase 2 — Authentication & Onboarding

**Goal:** Working login, onboarding flow for new funeral home, protected routes.

**Deliverables:**
- `/app/login/page.tsx` — email/password login form, redirects to /dashboard (fd/owner) or /my-tasks (staff) based on role
- `/app/onboarding/page.tsx` — two-step flow: (1) create funeral home record using service role key, (2) create owner account with Supabase signUp passing funeral_home_id and role in metadata
- `/middleware.ts` — protect all routes except /login and /onboarding. Redirect unauthenticated users to /login. Use Supabase SSR auth helpers.
- `/lib/supabase/client.ts`, `server.ts`, `middleware.ts` — standard Supabase SSR setup per their Next.js docs
- `/app/page.tsx` — redirect to /dashboard if authenticated, /login if not
- All UI components needed for these pages using tokens from Section 9

**Claude Code Prompt:**
```
Read SPEC.md. Execute Phase 2 only. Phase 1 is complete.

Build the auth and onboarding flows described in Sections 6.1 and 6.2. Set up the 
three Supabase client files in /lib/supabase/ following Supabase's official Next.js 
SSR documentation. Build /app/login/page.tsx, /app/onboarding/page.tsx, 
/middleware.ts, and /app/page.tsx. Use the design tokens in Section 9. Do not build 
the dashboard or any other pages. Stop when complete and list every file created or modified.
```

---

### Phase 3 — Dashboard

**Goal:** FD dashboard showing active services with status, stats, and service cards.

**Deliverables:**
- `/components/layout/AppShell.tsx` and `Sidebar.tsx` — sidebar layout used by all authenticated pages
- `/components/services/StatsRow.tsx` — three stat cards
- `/components/services/ServiceCard.tsx` — individual service card with status pill, progress bar
- `/components/services/ServiceGrid.tsx` — grid of service cards
- `/components/ui/Badge.tsx` — status pill component (green/yellow/red)
- `/components/ui/ProgressBar.tsx`
- `/lib/utils/service-status.ts` — pure status calculation function from Section 5.1
- `/lib/utils/date-helpers.ts` — daysUntil, formatDate, formatDateTime
- `/app/dashboard/page.tsx` — server component, fetches services with tasks for this funeral home, passes to grid

**Data fetching:** Server component. Query `services` WHERE `funeral_home_id` matches AND `status = 'active'`, ordered by `service_date ASC`. For each service, also fetch its `tasks`. Compute status client-side using the utility function.

**Claude Code Prompt:**
```
Read SPEC.md. Execute Phase 3 only. Phases 1 and 2 are complete.

Build the FD dashboard described in Section 6.3. Create the AppShell and Sidebar 
layout components first — all authenticated pages will use these. Build StatsRow, 
ServiceCard, ServiceGrid, Badge, ProgressBar components. Build the service-status 
and date-helpers utility functions. Build /app/dashboard/page.tsx as a server 
component. Do not build the Create Service modal yet — that is Phase 4. The New 
Service button should be present but non-functional. Use design tokens from Section 9 
exactly. Stop when complete and list every file created or modified.
```

---

### Phase 4 — Service Management

**Goal:** Create service flow with auto-generated tasks, service detail page with task list.

**Deliverables:**
- `/components/services/CreateServiceModal.tsx` — form from Section 6.4, live task count preview, submits to server action or API route that creates service and calls `generate_tasks_for_service`
- `/components/tasks/TaskRow.tsx` — individual task row from Section 6.5, with status icon, confirmation detail expand, Mark Complete button (button present but modal not wired yet)
- `/components/tasks/TaskList.tsx` — groups tasks by category, renders TaskRow for each
- `/app/services/[id]/page.tsx` — server component, fetches service + tasks with completed_by profile joins, renders service header and TaskList
- Server action or API route for service creation using service role key

**Claude Code Prompt:**
```
Read SPEC.md. Execute Phase 4 only. Phases 1–3 are complete.

Build the Create Service modal (Section 6.4), wire the New Service button on the 
dashboard to open it, and build the server action that creates a service and calls 
the generate_tasks_for_service Supabase function. Build the service detail page 
(/app/services/[id]/page.tsx) with the service header, confirmation progress bar, 
and task list grouped by category (Sections 6.5). Build TaskRow and TaskList 
components. The Mark Complete button should be present on TaskRow but clicking it 
does not need to do anything yet — that is Phase 5. Stop when complete and list 
every file created or modified.
```

---

### Phase 5 — Task Confirmation

**Goal:** Full working Mark Complete flow with confirmation layer, SMS log.

**Deliverables:**
- `/components/tasks/ConfirmTaskModal.tsx` — modal from Section 6.6, Zod validation, pre-fills user name from session, requires confirmation_value min 10 chars
- `/app/api/tasks/[id]/complete/route.ts` — POST route using service role key: validates payload, updates task, writes to sms_log, returns updated task
- `/lib/utils/sms.ts` — Twilio stub with TODO comment, SMS message format from Section 5.5
- Wire ConfirmTaskModal into TaskRow on the service detail page
- After successful confirmation, revalidate the service detail page so task list updates

**Claude Code Prompt:**
```
Read SPEC.md. Execute Phase 5 only. Phases 1–4 are complete.

Build the ConfirmTaskModal component (Section 6.6) with Zod validation. Build the 
POST /api/tasks/[id]/complete route (Section 5.4) using the Supabase service role 
client — it must update the task, get the FD/owner for the funeral home, and insert 
a row into sms_log. Build the Twilio stub in /lib/utils/sms.ts with a clear TODO 
comment. Wire the modal into TaskRow — clicking Mark Complete opens the modal, 
successful submission closes it and refreshes the task list. Stop when complete and 
list every file created or modified.
```

---

### Phase 6 — Staff View

**Goal:** Staff can see their assigned services and confirm their tasks.

**Deliverables:**
- `/app/my-tasks/page.tsx` — server component, fetches services WHERE assigned_staff_id = current user, each with tasks, renders sections per Section 6.7
- Reuse TaskRow and ConfirmTaskModal from Phase 5

**Claude Code Prompt:**
```
Read SPEC.md. Execute Phase 6 only. Phases 1–5 are complete.

Build the staff view at /app/my-tasks/page.tsx described in Section 6.7. It is a 
server component that fetches only the services assigned to the current user, with 
their tasks. Reuse TaskRow and ConfirmTaskModal from Phase 5. The sidebar nav item 
for staff should link to /my-tasks, not /dashboard. Apply role-based redirect: if a 
staff user navigates to /dashboard, redirect to /my-tasks. Stop when complete and 
list every file created or modified.
```

---

### Phase 7 — User Management

**Goal:** Owners can invite users and manage roles.

**Deliverables:**
- `/app/settings/users/page.tsx` — table of all profiles in the funeral home
- Invite User flow: sends Supabase auth invite email (use `supabase.auth.admin.inviteUserByEmail` with role metadata via service role key)
- Edit role inline
- Soft deactivate (set `is_active = false`)
- Add `is_active boolean NOT NULL DEFAULT true` to profiles if not already in migration 002

**Claude Code Prompt:**
```
Read SPEC.md. Execute Phase 7 only. Phases 1–6 are complete.

Build the user management page at /app/settings/users/page.tsx described in 
Section 6.8. Only users with role = 'owner' can access this route — redirect others 
to /dashboard. Use supabase.auth.admin.inviteUserByEmail with the service role key 
to handle invitations, passing funeral_home_id and role in the user metadata so the 
handle_new_user trigger creates the profile correctly. Stop when complete and list 
every file created or modified.
```

---

### Phase 8 — Polish & Deploy Readiness

**Goal:** Error handling, loading states, empty states, production readiness.

**Deliverables:**
- Loading skeletons for dashboard and service detail
- Error boundaries on all major routes
- Empty states: dashboard with no services, staff view with no assigned tasks
- Form validation error messages visible inline (Zod errors surfaced to UI)
- All TODO comments reviewed and confirmed as stubs (not accidentally broken logic)
- README updated with Vercel deployment steps
- Final review: no hardcoded data, no console.log statements left in production paths

**Claude Code Prompt:**
```
Read SPEC.md. Execute Phase 8 only. Phases 1–7 are complete.

Add loading skeletons for the dashboard and service detail pages. Add error 
boundaries. Add empty states for dashboard (no active services) and staff view 
(no assigned tasks). Surface Zod validation errors inline in all forms. Review 
every TODO comment and confirm it is an intentional stub, not broken logic. Remove 
any console.log statements from production code paths. Update README.md with Vercel 
deployment steps. Do a final pass — no hardcoded values, no demo data anywhere, 
all environment variables accessed via process.env. Stop when complete and summarize 
what was changed.
```

---

## 12. Pre-Build Checklist (Do Before Running Phase 1)

Before giving Claude Code the Phase 1 prompt, have these ready:

- [ ] Supabase project created at supabase.com — free tier is fine to start
- [ ] Supabase project URL and anon key copied from project Settings > API
- [ ] Supabase service role key copied (keep this secret — never expose client-side)
- [ ] Empty folder created on your desktop named `vigil`
- [ ] Claude Code opened in that folder
- [ ] `SPEC.md` dropped into that folder
- [ ] Node.js 18+ installed
- [ ] Vercel account created at vercel.com (free)

You do not need Twilio credentials until Phase 5, and even then the SMS is stubbed — you can add real credentials later.
