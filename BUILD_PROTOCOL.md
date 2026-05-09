# SFx Burger OMS — Build Protocol

> This is the operational rulebook for Claude Code while building the OMS. Read it at the start of every session and follow it strictly. It exists to keep the build predictable, reviewable, and aligned with the PRD.

---

## 1. The Golden Rule

**Build one phase at a time. Stop at the end of each phase. Wait for explicit approval before continuing.**

Never:
- Build ahead of the current phase
- Combine two phases into one delivery
- Add features that aren't in the current phase scope
- "While I'm at it..." — no opportunistic refactoring outside the current phase

---

## 2. Required Reading

At the start of every session, read these in this order:

1. `CLAUDE.md` — product, conventions, business rules
2. `stack.md` — dependencies, folder structure, install commands
3. `design.md` — design tokens, components, patterns
4. This file (`BUILD_PROTOCOL.md`)
5. `SFx_OMS_PRD_v2.pdf` — referenced by section number when needed

If a session resumes mid-phase, re-read the four documents and the most recent end-of-phase summary before writing any code.

---

## 3. The Twelve Phases

| Phase | Title | Deliverable |
|-------|-------|-------------|
| **0** | Foundation Setup | Empty Next.js app with brand fonts, Tailwind v4 tokens, shadcn primitives, Supabase project linked, design tokens wired in |
| **1** | Database Schema & Type System | Tables, RLS policies, sequence counter logic, generated TypeScript types |
| **2** | Authentication & Role-Based Routing | Login page, role-gated routes, three working logins (admin / staff / chef), basic settings page |
| **3** | Menu Management (Admin) | Full menu CRUD by category, persists to Supabase, ready for orders to consume |
| **4** | Single Order Creation | End-to-end single order placement with `SFX-S-XXXX`, Pickup/Delivery toggle, cart, validation |
| **5** | Bulk Order Creation | End-to-end bulk order placement with scheduled date (defaulting to next Saturday), `SFX-B-XXXX` |
| **6** | Receipt Generation | Print-optimised receipt template at A6/thermal width, branded, conditional bulk fields |
| **7** | Chef Dashboard (Real-Time) | Live kitchen view with new-order flash, optional audio cue, Mark Ready, completion counter, today-only bulk filtering |
| **8** | Orders List & Status Management | Searchable, filterable list with expandable rows, status updates, admin-only Cancel |
| **9** | Admin Dashboard | Today's KPIs, single/bulk split, recent orders, stale-order highlights |
| **10** | Sales Summary & Reporting | Period filters, KPIs, revenue-by-day chart, top sellers leaderboard |
| **11** | Polish, Performance & Deploy | Mobile audit at 320px, perf test with 1,000 orders, browser compat check, seed data, Vercel deploy |

---

## 4. Pre-Phase Ritual

Before starting any phase, post this exact format:

```
Starting Phase N — <Phase Title>

Scope:
<one-sentence scope from section 3>

Plan:
1. <step>
2. <step>
3. <step>
4. ...

Estimated files to touch:
<count or short list>

Beginning now.
```

Then build.

---

## 5. End-of-Phase Ritual

At the end of every phase, before claiming the phase is complete:

### Step 1 — Summary

Produce a structured summary with these exact headings:

```
✅ Phase N complete — <Phase Title>

What I built:
<one paragraph in plain language>

Files created or changed:
<tree, grouped by folder>

Key decisions:
- <decision> — <reasoning>

Dependencies installed:
- <package>@<version>

What to test:
1. <plain-language test step>
2. <plain-language test step>
...

Known caveats:
- <anything that doesn't work yet because it depends on a later phase>

Awaiting approval to proceed to Phase N+1.
```

### Step 2 — Stop

After the summary, **stop**. Do not begin the next phase. Do not write more code. Wait for one of these from the developer:

- ✅ "Approved, proceed to Phase N+1" → continue
- 🔄 "Make changes: ..." → fix within the current phase, then re-summarize
- ⏸ "Pause" → end the session

### Step 3 — Never Skip

The summary is non-optional. Even if the phase felt small. Even if it was just config. Produce the summary.

---

## 6. Decision-Making Rules

### When the PRD or design.md is clear
Follow it exactly. Don't reinterpret.

### When something is ambiguous mid-phase
**Stop. Ask.** Do not guess. Do not pick the answer that "feels right." Examples that always require asking:

- A field's data type isn't specified
- Two valid implementation approaches exist (e.g. server action vs route handler)
- A UI pattern isn't documented in `design.md`
- A constraint from `CLAUDE.md` conflicts with what the phase needs
- An external library isn't in `stack.md`

### When a small detail isn't specified
For trivial details (exact pixel value for an icon margin, exact wording of a non-customer-facing button), use `design.md` defaults and **note the choice in "Key decisions"** in the end-of-phase summary.

### When the PRD seems wrong
Don't silently fix it. Flag it in the end-of-phase summary under "Known caveats" so the developer can update the PRD.

---

## 7. Code Standards During Build

### File-by-file rules
- One component per file. The OMS is a Next.js project, not a single-file artifact.
- Server Components by default. Mark `"use client"` only when state, effects, or browser APIs are required.
- Co-locate Zod schemas with the form they validate, or in `lib/schemas/` if shared.

### Imports
- Absolute imports via `@/` alias (`@/components/ui/button`, not `../../components/ui/button`).
- Group imports: framework → third-party → internal → relative.

### Types
- No `any`. Use `unknown` and narrow.
- Prefer `type` over `interface` unless extending.
- Generated Supabase types are the source of truth for DB shape — domain types extend them.

### Comments
- Comment **why**, not **what**. The code already says what.
- Document any non-obvious business rule with a PRD section reference, e.g. `// PRD §7.5 — chef sees only today's bulk orders`.

### Errors
- Wrap server actions and Supabase calls in `try/catch`.
- Surface user-facing errors via toast (sonner), not `alert()`.
- Log internal errors to the server console; never to the client.

---

## 8. Testing Expectations

This is a v2.0 internal product, not a multi-million-user app. We are **not** writing exhaustive unit tests for every component during the build. But we **are** doing this:

- **Manual smoke test at the end of every phase** — the developer runs through the deliverable using the "What to test" list.
- **Critical logic gets a test** — sequence counter (separate per type), next-Saturday calculation, revenue exclusion of cancelled orders. Lightweight tests in `__tests__/` co-located with the logic.
- **No E2E tests in v2.0** — defer to v2.1+.

---

## 9. Communication Style

When summarising or asking questions:

- **Plain language first, code second.** Don't paste a 200-line file when one sentence will do.
- **One question at a time.** Don't bundle five questions into one message.
- **Concrete options.** "Should I use Approach A (foo) or Approach B (bar)?" — not "How should I do this?"
- **Show files in tree form** when listing what changed, not as walls of code.

---

## 10. Things to Never Do

- ❌ Skip the phase summary
- ❌ Build phase N+1 features in phase N
- ❌ Add a library not in `stack.md` without proposing it first
- ❌ Introduce a new color, font, or token outside `design.md`
- ❌ Bypass role-based access checks "temporarily"
- ❌ Use `localStorage` or `sessionStorage` for shared data (use Supabase)
- ❌ Hardcode prices or menu items outside the database
- ❌ Mix Single and Bulk order logic into one shared component without an explicit `orderType` prop
- ❌ Introduce USD or any currency other than TL
- ❌ Modify the logo glyph (color, shape, layout)
- ❌ Compute the next sequence number with `MAX(seqNum)` (race-condition prone — use a dedicated counter table or Postgres sequence)

---

## 11. Things to Always Do

- ✅ Read `CLAUDE.md`, `stack.md`, `design.md`, and this file at the start of every session
- ✅ Reference the PRD section number for any business-rule question
- ✅ Format Turkish Lira as `1,300 TL`
- ✅ Use Geist Mono for sequence numbers and tabular figures
- ✅ Auto-generate sequence numbers (never let the user type one)
- ✅ Timestamp every status transition (`createdAt`, `readyAt`, `deliveredAt`)
- ✅ Exclude cancelled orders from revenue
- ✅ Default the bulk order scheduled date to the **next Saturday** (calculated dynamically with `date-fns`)
- ✅ Show conditional fields conditionally (delivery address only if fulfilment = delivery)
- ✅ Pause and ask when unsure

---

## 12. Phase Acceptance Checklist (Developer Side)

When the developer is reviewing an end-of-phase summary, they should verify:

- [ ] Every item in "What to test" passes
- [ ] No console errors in the browser
- [ ] Mobile view (320px) renders without horizontal scroll
- [ ] Brand tokens are used (no hardcoded hex values in component files)
- [ ] Role-based access works (try logging in as each role)
- [ ] Real-time still works if the phase touched orders
- [ ] No regressions in earlier phases

If any of these fail, send "Make changes: ..." with the specific issue. Don't proceed.

---

## 13. When in Doubt

The decision tree:

```
Is this answered in CLAUDE.md / stack.md / design.md / PRD?
├── Yes → follow it exactly
└── No
    ├── Is it a trivial detail? → pick a sensible default, note it in Key decisions
    └── Is it a real choice? → STOP and ask
```

A pause is always cheaper than a rebuild.

---

_Read this file at the start of every session. Re-read it when something feels off. It exists so the build stays focused, reviewable, and free of surprises._
