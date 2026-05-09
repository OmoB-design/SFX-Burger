# CLAUDE.md

> Guidance for Claude (and Claude Code) when working on the **SFx Burger Order Management System (OMS)**.

This file is the project's source of truth for AI assistants. Read it before making changes. It captures product intent, conventions, architecture decisions, and the things that are easy to get wrong.

---

## 0. Companion Documents

This file lives alongside three other documents. Read all four at the start of every session:

| File | Purpose |
|------|---------|
| **`CLAUDE.md`** (this file) | Product, conventions, business rules |
| **`stack.md`** | Dependencies, versions, folder structure, install commands |
| **`design.md`** | Design system — colors, typography, components, patterns |
| **`BUILD_PROTOCOL.md`** | How to build phase-by-phase, end-of-phase ritual, decision-making rules |

If something in the PRD conflicts with these documents, ask before deciding.

---

## 1. Project Overview

**SFx Burger** is a food business in Northern Cyprus serving burgers, shawarma, and authentic Nigerian cuisine (Jollof Rice, Native Rice, Egusi Soup, Vegetable Soup / Efo Riro).

The **OMS** is a web-based order management system that handles two distinct order types and routes orders in real time to a chef dashboard.

**Current version:** v2.0 (production build)
**Source PRD:** `SFx_OMS_PRD_v2.pdf`
**Brand tagline:** _"Unique Taste Everyday"_

---

## 2. Order Types — Critical Distinction

The system has **two completely separate order workflows**. Do not merge them or treat them as filters of one queue.

### Single Orders
- Daily walk-in / call-in orders
- Same-day fulfilment
- Sequence prefix: `SFX-S-XXXX`
- Pickup or Delivery (staff selects)
- Routed to chef immediately on placement

### Bulk Orders
- Pre-scheduled, larger orders
- Fulfilled on the **next Saturday** (default — editable)
- Sequence prefix: `SFX-B-XXXX`
- Do **not** appear on the chef dashboard until the scheduled day
- Have an extra `scheduledDate` field

When in doubt: a single order is "for now"; a bulk order is "for Saturday."

---

## 3. User Roles

Three roles. Always check role before rendering or allowing an action.

| Role | Can do | Cannot do |
|------|--------|-----------|
| **Admin** | Everything | — |
| **Staff** | Place single + bulk orders, view orders, print receipts, update status to Ready/Delivered | Menu management, sales reports, settings, cancel orders |
| **Chef** | View active kitchen tickets, mark orders Ready | Anything else (no order creation, no menu, no reports) |

The chef view is **purpose-built for kitchen use**: large fonts, big tap targets, minimal clutter. Optimise for greasy hands and a noisy environment, not for desktop power users.

Role checks must be enforced at three layers: middleware (route gate), Supabase RLS policy (data gate), and UI conditional rendering. Never rely on UI alone.

---

## 4. Order Status Flow

Orders move through **three** stages. Do not invent extra ones without updating the PRD.

```
Order Placed  →  Ready  →  Delivered
   (amber)       (green)    (muted)
```

- **Order Placed** — chef sees it, hasn't finished it yet
- **Ready** — chef has marked it complete; awaiting handoff
- **Delivered** — staff/admin confirms customer received it

**Cancelled** is a separate terminal state, available to **Admin only**, and is excluded from all revenue calculations.

Each stage transition must be **timestamped** automatically (`createdAt`, `readyAt`, `deliveredAt`).

---

## 5. Brand & Visual Identity (Quick Reference)

The full design system lives in **`design.md`**. This section is a fast-lookup summary.

| Token | Hex | Usage |
|-------|-----|-------|
| Brand Red | `#D7263D` | Logo, primary CTAs, totals, brand mark |
| Brand Amber | `#F4A300` | Sequence highlight, "placed" status |
| Brand Green | `#27AE60` | "Ready" status, positive indicators |
| Brand Brown | `#7B3F00` | Reserved — sparingly |
| Brand Charcoal | `#2C2C2C` | Headlines, primary text |
| Brand Cream | `#FFF7EB` | Light backgrounds, receipts |

**Typography in the OMS:** **Geist Sans** for UI, **Geist Mono** for sequence numbers and tabular figures. The brand guideline's display fonts (League Spartan, Antic) are reserved for printed marketing materials and do **not** apply to the app.

**Logo:** never recolour the glyph. Use the provided SVG variants only. See `design.md` §5 for placement and sizing rules.

**Tone of voice:** warm, confident, food-forward. Never corporate-speak.

---

## 6. Currency & Pricing

- **All pricing is Turkish Lira (TL).** Do not introduce USD or any other currency anywhere.
- Format: `1,300 TL` (comma thousand-separator, space, "TL")
- Bulk-order historical USD pricing has been retired.
- If a price is ever shown in another currency, it must be a clearly-labelled conversion, not a stored value.

---

## 7. Menu Structure

Menu items live under **five categories** (only the first four are active by default):

1. **Burgers** 🍔 — Classic, BBQ, Zinger, Mix
2. **Shawarma** 🌯 — Classic, Suya, Congolese
3. **Soups** 🍲 — Vegetable Soup (Efo Riro), Egusi Soup
4. **Rice** 🍚 — Jollof, Native (Village), Fried
5. **Other** 🍽️ — fallback for new categories

Each item has: `id`, `name`, `category`, `price` (number, TL only).

When showing a menu, **group by category** and show category icons. Don't dump items into a flat list.

---

## 8. Sequence Numbering

- **Single orders:** `SFX-S-` + 4-digit zero-padded number → `SFX-S-0001`, `SFX-S-0002`...
- **Bulk orders:** `SFX-B-` + 4-digit zero-padded number → `SFX-B-0001`, `SFX-B-0002`...
- **Counters are independent** — a single order and a bulk order can both have `0001`.
- Numbers are auto-generated on placement. Never let the user pick or edit them.
- Counters live in dedicated Postgres rows / a sequence table — never compute from `MAX(seqNum)` on the orders table (race condition prone under load).

---

## 9. Real-Time Chef Routing

When a single order is placed:
1. The order is saved with status `Order Placed`
2. It must appear on the chef dashboard within **5 seconds** (Supabase Realtime subscription on the `orders` table)
3. The new ticket flashes briefly to draw attention
4. Optional: an audio cue plays (only if the chef has enabled it)

Bulk orders are **not** routed to the chef on placement. They appear on the chef dashboard on the day of `scheduledDate` (the chef query filters by `orderType = 'single' OR (orderType = 'bulk' AND scheduledDate = today)`).

---

## 10. Receipts

Branded receipts are printable from the system. Required content:

- SFx Burger logo + "Unique Taste Everyday"
- **RECEIPT** or **INVOICE** heading (depending on context)
- Order number (`SFX-S-XXXX` or `SFX-B-XXXX`)
- Customer name (and phone, if captured)
- Date + time
- Status
- For bulk: scheduled delivery date
- For delivery (single): delivery address
- Itemised list with quantity × unit price
- Total in **TL** — bold, brand red
- Footer: contact phone `+90 533 841 09 38`

**Implementation:** dedicated print-optimised route (e.g. `/orders/[id]/receipt`) using `@media print` CSS to hide app chrome. Width target: 360px (A6 / 80mm thermal printer).

---

## 11. Tech Stack & Architecture

Full details in **`stack.md`**. Summary:

| Layer | Choice |
|-------|--------|
| Framework | Next.js 14 App Router + TypeScript |
| Styling | Tailwind CSS v4 (via `@theme` block in `globals.css`) |
| Components | shadcn/ui + Lucide React |
| Font | Geist (Sans + Mono) via `next/font` |
| Database / Auth / Realtime | Supabase |
| Forms | React Hook Form + Zod |
| Charts | Recharts |
| Deploy | Vercel |

**Architectural principles:**
- Server Components by default. Mark `"use client"` only when state, effects, or browser APIs are required.
- Data access via Supabase client (browser) or server client (server actions / route handlers). Never mix the two in the same module.
- Row-Level Security policies enforce role access at the database layer.
- Real-time updates via Supabase Realtime subscriptions on relevant tables.
- All financial values stored in TL only — single-currency simplicity is intentional.
- No customer payment data is stored anywhere.

---

## 12. Coding Conventions

### General
- One component per file. Co-locate small helpers; promote to `lib/` when shared.
- Use absolute imports (`@/components/...`) — no relative parent paths beyond one level.
- Server Actions for mutations; Route Handlers only when an external API contract is needed.
- Zod schemas as the single source of truth for form validation, shared between client and server.

### Naming
- Components: `PascalCase` (`NewOrderForm`, `ChefTicket`, `OrdersTable`)
- Hooks: `useCamelCase` (`useOrders`, `useRole`)
- Variables / functions: `camelCase`
- Constants: `UPPER_SNAKE_CASE` (`DEFAULT_CATEGORY`, `STATUS`)
- Database columns: `snake_case` (Supabase convention) — map to `camelCase` in TypeScript layer

### Types
- No `any`. Use `unknown` and narrow.
- Generated Supabase types (`types/database.types.ts`) are the source of truth for DB shape.
- Domain types live in `types/domain.ts` and are derived from generated types.

### State
- Local component state with `useState` / `useReducer`.
- Cross-component shared state via React Context + hooks.
- Cross-user shared state via Supabase Realtime subscriptions.
- **No Redux, Zustand, or Jotai** unless we hit clear pain.

### Don't
- ❌ Hardcode prices outside the menu data structure (database is the source)
- ❌ Mix order types in a single component without a clear `orderType` prop
- ❌ Bypass role checks at any layer
- ❌ Use `localStorage` / `sessionStorage` for shared data (use Supabase)
- ❌ Reach for a state-management library before exhausting Context + Realtime
- ❌ Add USD pricing back

---

## 13. File Outputs

The OMS produces these artefacts at runtime:

- **Printed receipts** — rendered via the browser print pipeline (no PDF library in v2.0)
- **CSV / PDF exports** — deferred to v2.1
- **The OMS app itself** — deployed to Vercel as a Next.js application

Marketing materials (flyers, banners, the brand book itself) are produced **outside the OMS codebase** using whatever tooling is appropriate. They are not the OMS's concern.

---

## 14. Things Easy to Get Wrong

A checklist of mistakes to avoid:

- ✅ The chef dashboard shows **only** Single orders + today's Bulk orders. Don't dump the full backlog there.
- ✅ Cancelled orders are **excluded** from revenue. Don't sum them in dashboards.
- ✅ Sequence prefixes: `SFX-S-` and `SFX-B-`. Not `SFX-` alone — that's the legacy v1.0 format.
- ✅ Currency is **TL only**. No `$`, no USD, no FX rates.
- ✅ Bulk orders default to the **next Saturday** — calculate from current date with `date-fns`, don't hardcode.
- ✅ Chef can mark Ready, but **only Staff/Admin can mark Delivered**. Different role, different action.
- ✅ The "delivery address" field is conditional — show it only when fulfilment is `delivery`.
- ✅ Receipt should always work even if there's no phone, no notes, no address — handle nullable fields.
- ✅ When adding a new menu item, default category should be `Burgers`, not blank.
- ✅ Sequence counters must be transaction-safe. Use Postgres `INSERT ... RETURNING` with a dedicated counter table or a `SERIAL` sequence per type.
- ✅ Real-time subscriptions must be cleaned up on unmount to avoid memory leaks.

---

## 15. Phase Roadmap (high level)

- **v2.0 (current build)** — single + bulk orders, three roles, chef routing, full reporting
- **v2.1** — customer history, bulk-order templates, exports, order edit/refund, est. cooking times
- **v3.0** — customer-facing portal, WhatsApp integration, inventory, delivery driver tracking, multi-branch

When asked for "v3-style" features (e.g. customer accounts), confirm scope before building — they're explicitly **out of scope** for v2.x.

---

## 16. Useful Context for Conversations

When the user references:
- _"the price list"_ → the bulk-order document with all prices in TL
- _"the menu"_ → the single-order menu items in the database
- _"the system" / "the OMS" / "the app"_ → the Next.js order management application
- _"the PRD"_ → `SFx_OMS_PRD_v2.pdf`
- _"the chef view"_ → the kitchen-optimised real-time dashboard

When in doubt, ask: _"is this for the OMS app, the printed receipt, or external marketing material?"_

---

## 17. Contact & Branding Reference

- **Phone:** +90 533 841 09 38
- **Delivery day (bulk):** every Saturday
- **Location:** Northern Cyprus
- **Tagline:** Unique Taste Everyday

---

_Last updated: 08 May 2026. Keep this file current — it's the first thing future Claude sessions will read._
