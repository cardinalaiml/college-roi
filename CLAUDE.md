# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Tassel CO$T (tasselcost.com) — a Next.js site that shows whether a specific college degree is worth the money, using U.S. Department of Education College Scorecard data loaded into Supabase. The product spec lives in the numbered build guides at the repo root (`01-pm-build-guide.md` … `05-ui-build-guide.md`): feature acceptance criteria in 01, exact user-facing copy in the Content section of 04, visual system in 05. Consult these before adding features or writing copy — copy is defined there, not improvised. (The guides call the product "TassleCost"; the shipped brand is "Tassel CO$T".)

Note: `AGENTS.md` warns this is a modified Next.js with docs in `node_modules/next/dist/docs/`. That directory does not exist and the installed Next is stock 14.2.5 — follow normal Next 14 App Router conventions (sync `params`/`searchParams`, not the Next 15 Promise style).

## Commands

- `npm run dev` — dev server on :3000 (needs `.env.local`, see below)
- `npm run build` — production build; also the fastest full typecheck of app code
- `npm run lint` — ESLint 9 flat config; `react-hooks/set-state-in-effect` is deliberately off (React 18 pinned vs eslint-config-next@16's React-19 rules)
- `npx tsc --noEmit` — typecheck (CI runs this separately from build)
- `npm run test:roi` — the only test suite: `tsx lib/roi-calculator.test.ts`, verifies the loan math ($40k @ 6.8% over 10yr ≈ $461/mo)

Data pipeline (rarely needed; DB is already loaded):
- `npm run etl:clean` — Python: raw Scorecard CSV → `data/clean/{institutions,costs,debt}.csv`
- `npm run load:clean -- --dry-run` — Python: upsert those CSVs into Supabase via PostgREST (order matters: institutions first, FK target)

`.env.local` (gitignored) needs `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `ANTHROPIC_API_KEY`.

## Deploy — pushing to main deploys to production

`.github/workflows/deploy.yml` triggers on every push to `main`: gate job (lint + tsc + ROI test), then SSH to the Hostinger VPS, `git reset --hard origin/main`, build, `pm2 reload college-roi`. There is no staging. CI has **no Supabase secrets**, which is why every DB-backed page/route declares `export const dynamic = "force-dynamic"` — nothing DB-backed can prerender at build time. Keep that on new DB-backed routes.

## Architecture

**Data model** (`schema.sql`): normalized tables `institutions`, `costs`, `debt`, `outcomes`, all 1:1 keyed on `unit_id` (IPEDS UNITID), plus `comparisons` (shared comparison links) and `roi_cache` (AI summary cache). RLS: public read on data tables; `comparisons` allows public insert; `roi_cache` has no anon policy (service-role only). A legacy denormalized `colleges` table exists in schema.sql but the app queries the normalized tables.

**Supabase access** — two clients, don't mix them:
- `lib/supabase/server.ts` `getSupabaseAnon()` — anon key, used by pages and public API routes
- `lib/supabase/admin.ts` `getSupabaseAdmin()` — service role, bypasses RLS, used only by `/api/ai-summary` for `roi_cache`

Queries use PostgREST embedded joins (`institutions` → `costs(...)`, `outcomes(...)`). Two gotchas baked into existing code: 1:1 embeds may come back as object *or* single-element array (see `oneOrFirst`/`toHit` helpers — keep handling both), and filtering on an embedded table's columns requires `costs!inner(...)` in the select plus `.or(..., { referencedTable: "costs" })` (see the net-price filter in `app/api/search/route.ts`). Reads over the full table are paged in 1000-row chunks (`.range()`), because PostgREST caps responses — see `app/sitemap.ts`, `app/colleges/`.

**Search** (`app/api/search/route.ts`): full-text search on the generated `search_vector` column (websearch syntax), backfilled by an `ilike` name fallback, deduped by `unit_id`, capped at 8. Optional `state`/`type`/`price` params are validated against whitelists server-side.

**URL is the state container**: the homepage search query and filters live in URL params (`q`, `state`, `type`, `price`). `SearchBar` and `SearchFilters` write them via `router.replace` (or `push` when navigating from another page); the server component `app/page.tsx` reads them and passes to `SearchResults`, which fetches `/api/search`. Preserve other params when writing one.

**Net price convention**: `net_price_public ?? net_price_private` (Scorecard populates one or the other by control type). This coalesce appears in search, detail, directory, and the price filter — keep them consistent.

**ROI calculator**: `lib/roi-calculator.ts` is a pure function implementing the amortization formula specified in `04-backend-devops-qa-seo-security-content.md`. It's the core of the product; change it only against that spec and keep `test:roi` passing.

**Comparison flow**: client-side tray state in localStorage (`lib/comparison.ts`, max 3 colleges, custom event for cross-component sync) → "Share" POSTs to `/api/comparison` which stores college ids + calc inputs under a nanoid `short_id` → `/compare/[shortId]` renders it server-side.

**AI summary** (`app/api/ai-summary/route.ts`): Claude Sonnet writes a 3-sentence verdict. Responses cache in `roi_cache` keyed by sha256 of (college id + calc inputs) so identical calculations never re-hit the API. Rate limited 10 req/min per IP via `lib/rate-limit.ts` — an in-memory fixed-window limiter that assumes the single-PM2-process deployment; revisit if that changes. The UI hides the section entirely on failure (calculator must work without it).

**SEO/internal linking**: college detail pages are reached via `/college/[unitId]-[slug]` (slug from `createSlug` in `lib/formatters.ts`; only the unitId prefix is parsed). The `/colleges` → `/colleges/[state]` directory exists to give all ~6,300 detail pages crawlable internal links — new page types should link into this structure. `app/sitemap.ts` enumerates everything; robots disallows `/api/` and `/compare/`. Detail pages emit EducationalOrganization JSON-LD.

**Styling**: Tailwind v4 — design tokens are CSS variables in the `@theme` block of `app/globals.css` (`brand-green-600`, `brand-gray-200`, etc.), no `tailwind.config`. Use the `brand-*` palette, not raw Tailwind colors. The palette and component specs come from `05-ui-build-guide.md`.

**Null data is a feature**: Scorecard data is heavily suppressed/missing. Every displayed metric must show the specific explanation message (defined in the Content guide and `lib/formatters.ts` — e.g. salary "suppressed" vs "not_reported"), never a blank or dash.
