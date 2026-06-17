# Vigil

A confirmation-layer task management platform for funeral homes.

---

## Prerequisites

- Node.js 18+
- npm
- A [Supabase](https://supabase.com) account (free tier is fine)
- A [Vercel](https://vercel.com) account (free tier is fine)

---

## Supabase Project Setup

1. Go to [supabase.com](https://supabase.com) and create a new project.
2. Wait for the project to finish provisioning (~1 minute).
3. In your project dashboard, go to **Settings → API**.
4. Copy the following values — you'll need them in the next step:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public** key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role** key → `SUPABASE_SERVICE_ROLE_KEY` (keep this secret — never expose client-side)

---

## Running Migrations

Migrations live in `/supabase/migrations`. Run them in order against your Supabase project.

### Option A — Supabase CLI (recommended)

```bash
# Install the Supabase CLI if you haven't already
npm install -g supabase

# Link to your remote project (use the project ref from your Supabase dashboard URL)
supabase link --project-ref <your-project-ref>

# Push all migrations
supabase db push
```

### Option B — Supabase SQL Editor

1. In your Supabase dashboard, go to **SQL Editor**.
2. Open and run each file in order:
   - `001_create_funeral_homes.sql`
   - `002_create_profiles.sql`
   - `003_create_services.sql`
   - `004_create_task_templates.sql`
   - `005_create_tasks.sql`
   - `006_create_sms_log.sql`
   - `007_enable_rls_policies.sql`
   - `008_functions_and_triggers.sql`
   - `009_seed_task_templates.sql`

---

## Environment Variables

Copy `.env.example` to `.env.local` and fill in your values:

```bash
cp .env.example .env.local
```

Then open `.env.local` and fill in:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

Twilio variables (`TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM_NUMBER`) are stubbed in v1 — leave them blank until Phase 5.

---

## Running the Dev Server

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Deploying to Vercel

### First deploy

1. Push this repo to GitHub (or GitLab / Bitbucket).
2. Go to [vercel.com](https://vercel.com) and click **Add New Project**.
3. Click **Import** next to your repository.
4. Leave the **Framework Preset** as **Next.js** — Vercel detects it automatically.
5. Under **Environment Variables**, add every variable from `.env.example` with production values:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `NEXT_PUBLIC_APP_URL` — set to your Vercel deployment URL (e.g. `https://vigil.vercel.app`)
   - Twilio variables can be left blank until you wire up SMS in a later phase
6. Click **Deploy**. Vercel builds and deploys in ~60 seconds.

### Subsequent deploys

Push to your main branch — Vercel redeploys automatically.

To promote a preview branch to production, open the deployment in the Vercel dashboard and click **Promote to Production**.

### Supabase production checklist

Before going live, confirm in your Supabase dashboard:
- **Authentication → URL Configuration**: add your Vercel domain to **Redirect URLs** (e.g. `https://vigil.vercel.app/**`).
- **Authentication → Email Templates**: customise the invite email if desired — the default includes the magic link needed for the user invite flow.
- RLS is enabled on all tables (migrations 007 and 008 handle this).

---

## Build Phases

| Phase | Status | Description |
|-------|--------|-------------|
| 1 | ✅ Complete | Foundation — schema, migrations, types |
| 2 | ✅ Complete | Authentication & onboarding |
| 3 | ✅ Complete | FD dashboard |
| 4 | ✅ Complete | Service management & task generation |
| 5 | ✅ Complete | Task confirmation flow |
| 6 | ✅ Complete | Staff view |
| 7 | ✅ Complete | User management |
| 8 | ✅ Complete | Polish & deploy readiness |
