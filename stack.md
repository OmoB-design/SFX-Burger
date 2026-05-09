# SFx Burger OMS — Technology Stack

> The complete production stack for the Order Management System v2.0. This document is the source of truth for dependencies, versions, configuration, and folder structure. Reference it when bootstrapping the project, installing packages, or onboarding a new contributor.

---

## 1. Core Framework

| Layer | Choice | Version | Why |
|-------|--------|---------|-----|
| Framework | **Next.js** | 14.2.x (App Router) | Full-stack React, server actions, Vercel-native deploy |
| Language | **TypeScript** | 5.x | Type-safe end-to-end |
| Runtime | **Node.js** | 20 LTS | Required by Next 14 |
| Package Manager | **pnpm** | 9.x | Fast, disk-efficient (npm acceptable if preferred) |

---

## 2. Backend & Data — Supabase

| Layer | Service | Purpose |
|-------|---------|---------|
| Database | Supabase Postgres | Primary store for orders, menu, users |
| Auth | Supabase Auth | Email/password sessions, role claims |
| Real-time | Supabase Realtime | Chef dashboard live updates |
| Storage | Supabase Storage | Reserved for future (exports, receipt PDFs) |
| Security | Postgres RLS | Per-role row-level access control |

**Required environment variables:**

| Variable | Where used | Notes |
|----------|------------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | client + server | Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | client + server | Public anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | **server only** | Never expose to the browser |

---

## 3. Styling & UI

| Library | Purpose |
|---------|---------|
| **Tailwind CSS v4** | Utility-first styling. Configured via `@theme` block in `app/globals.css` (no `tailwind.config.ts`) |
| **shadcn/ui** | Component primitives — Button, Input, Dialog, Card, Table, Tabs, etc. |
| **Lucide React** | Icon set (paired with shadcn) |
| **class-variance-authority** | Variant-based class composition (bundled with shadcn) |
| **tailwind-merge** | Resolves conflicting Tailwind classes (bundled with shadcn) |
| **clsx** | Conditional className utility (bundled with shadcn) |

---

## 4. Typography — Geist

Geist is the only font family used in the OMS.

- **Geist Sans** — UI text, headings, body, buttons, labels
- **Geist Mono** — order numbers (`SFX-S-0001`), receipts, codes, tabular figures

Loaded via `next/font` for automatic optimisation. No external font CDN.

```tsx
// app/layout.tsx
import { GeistSans } from 'geist/font/sans';
import { GeistMono } from 'geist/font/mono';
```

---

## 5. Forms & Validation

| Library | Purpose |
|---------|---------|
| **React Hook Form** | Form state, validation, performance |
| **Zod** | Schema validation, shared between client and server |
| **@hookform/resolvers** | Zod integration with React Hook Form |

---

## 6. Data, Charts & Utilities

| Library | Purpose |
|---------|---------|
| **Recharts** | Sales summary charts (revenue-by-day, top sellers) |
| **date-fns** | Date math (next-Saturday calculation, formatting timestamps) |
| **nanoid** | Unique IDs where Supabase UUIDs aren't appropriate |
| **sonner** | Toast notifications (recommended by shadcn) |

---

## 7. State Management

- **React Context + hooks** for auth and role state
- **React state** (`useState`, `useReducer`) for local component state
- **Supabase Realtime subscriptions** for shared cross-user state (orders, menu)
- **No Redux, Zustand, or Jotai** unless we hit a real wall — keep it simple

---

## 8. Receipt Printing

- Native `window.print()` with a print-only stylesheet (`@media print` rules)
- A dedicated print-optimised route (e.g. `/orders/[id]/receipt`) rendered to A6 / thermal width (~360px)
- No PDF library in v2.0 — browser print pipeline is sufficient

---

## 9. Deployment & Hosting

| Service | Purpose |
|---------|---------|
| **Vercel** | Hosting, edge runtime, preview deploys per PR |
| **Supabase Cloud** | Managed Postgres + Auth + Realtime |
| **GitHub** | Source control + Vercel integration |

---

## 10. Developer Tooling

| Tool | Purpose |
|------|---------|
| **ESLint** | Linting (Next.js default config) |
| **Prettier** | Code formatting |
| **TypeScript** | Type checking via `tsc --noEmit` in CI |
| **Husky + lint-staged** *(optional)* | Pre-commit hooks |

---

## 11. Folder Structure

```
sfx-oms/
├── app/
│   ├── (auth)/
│   │   └── login/
│   │       └── page.tsx
│   ├── (dashboard)/
│   │   ├── admin/
│   │   │   └── page.tsx              # admin home
│   │   ├── chef/
│   │   │   └── page.tsx              # kitchen view
│   │   ├── orders/
│   │   │   ├── page.tsx              # list view
│   │   │   ├── new-single/
│   │   │   ├── new-bulk/
│   │   │   └── [id]/
│   │   │       └── receipt/          # print-optimized route
│   │   ├── menu/
│   │   │   └── page.tsx              # admin menu CRUD
│   │   ├── reports/
│   │   │   └── page.tsx              # sales summary
│   │   └── settings/
│   │       └── page.tsx
│   ├── api/                          # route handlers (only when needed)
│   ├── layout.tsx
│   ├── globals.css                   # @theme block + base styles
│   └── page.tsx                      # role-based redirect
├── components/
│   ├── ui/                           # shadcn-generated primitives
│   ├── orders/                       # order-specific components
│   ├── chef/                         # chef-specific components
│   ├── menu/                         # menu management components
│   └── shared/                       # cross-cutting (Logo, Header, etc.)
├── lib/
│   ├── supabase/
│   │   ├── client.ts                 # browser client
│   │   ├── server.ts                 # server client
│   │   └── middleware.ts             # session refresh helper
│   ├── actions/                      # server actions
│   ├── schemas/                      # shared Zod schemas
│   ├── utils.ts
│   ├── format.ts                     # TL formatting, date formatting
│   └── sequence.ts                   # sequence number logic
├── types/
│   ├── database.types.ts             # generated from Supabase
│   └── domain.ts                     # domain-level types (Order, MenuItem, User)
├── public/
│   ├── logo-primary.svg
│   ├── logo-on-dark.svg
│   ├── logo-mono.svg
│   └── favicon.ico
├── supabase/
│   ├── migrations/                   # SQL migration files
│   └── seed.sql                      # seed data (default users, menu)
├── middleware.ts                     # auth gate for protected routes
├── .env.local
├── .env.example
├── next.config.js
├── tsconfig.json
├── package.json
├── CLAUDE.md
├── design.md
├── stack.md
└── BUILD_PROTOCOL.md
```

---

## 12. Initial Setup Commands

Run these in order during Phase 0. Adjust to the latest stable versions at install time.

### Step 1 — Bootstrap Next.js

```bash
pnpm create next-app@latest sfx-oms \
  --typescript \
  --tailwind \
  --app \
  --import-alias="@/*" \
  --eslint

cd sfx-oms
```

### Step 2 — shadcn/ui

```bash
pnpm dlx shadcn@latest init
pnpm dlx shadcn@latest add \
  button input label card dialog dropdown-menu \
  table tabs sonner badge select textarea \
  form alert checkbox switch
```

### Step 3 — Supabase

```bash
pnpm add @supabase/supabase-js @supabase/ssr
```

### Step 4 — Forms, charts, utilities

```bash
pnpm add react-hook-form zod @hookform/resolvers
pnpm add recharts date-fns nanoid
pnpm add lucide-react
```

### Step 5 — Geist font

```bash
pnpm add geist
```

### Step 6 — Tailwind v4 (if not auto-installed)

```bash
pnpm add -D tailwindcss@latest @tailwindcss/postcss@latest
```

> **Note:** Tailwind v4 configuration uses the `@theme` block in `globals.css`, not `tailwind.config.ts`. See `design.md` §3 for the full token block.

### Step 7 — Supabase CLI (for migrations)

```bash
pnpm add -D supabase
pnpm dlx supabase init
pnpm dlx supabase login
pnpm dlx supabase link --project-ref <your-project-ref>
```

---

## 13. Environment Setup Checklist

Before Phase 0 begins:

- [ ] Node 20 LTS installed (`node --version` returns 20.x)
- [ ] pnpm installed (`pnpm --version`)
- [ ] Supabase project created at supabase.com
- [ ] Supabase URL, anon key, and service role key copied to `.env.local`
- [ ] `.env.example` committed (with placeholder values, no real keys)
- [ ] Vercel account linked to GitHub
- [ ] GitHub repo created and initial commit pushed
- [ ] Logo SVGs placed in `public/`
- [ ] `CLAUDE.md`, `design.md`, `stack.md`, `BUILD_PROTOCOL.md` committed at repo root

---

## 14. Versioning & Updates

- Pin major versions for Next.js, React, and Supabase. Avoid `^` for these.
- Run `pnpm audit` weekly during development.
- shadcn primitives are **copied into your repo**, not installed as a package — update them deliberately when shadcn ships improvements.
- Don't upgrade Tailwind major versions mid-build. Lock the version once Phase 0 is approved.

---

## 15. What's Explicitly Not in the Stack

To keep the build focused, these are **out of scope** for v2.0:

- ❌ State management library (Redux, Zustand, etc.)
- ❌ Component library other than shadcn (no MUI, Chakra, Mantine)
- ❌ CSS-in-JS runtime (no styled-components, emotion)
- ❌ ORM (raw Supabase client + generated types is enough)
- ❌ PDF generation library
- ❌ Email service / transactional email
- ❌ Analytics / telemetry
- ❌ Feature flag service
- ❌ Error tracking (Sentry, etc.) — defer to v2.1

If a future need pushes us toward any of these, propose it as an explicit change to this file and get approval first.

---

_This stack is locked for v2.0. Any change requires an update to this document and explicit approval before implementation._
