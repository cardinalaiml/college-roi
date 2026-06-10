# TassleCost — Frontend Developer Build Guide

## Role: Cursor + Claude

This document contains the build order and the exact Cursor Composer prompts for every frontend component. Paste each prompt into Cursor Composer (Cmd+I) when you reach that step. Do not start a prompt until the previous one is working.

---

## Setup: before any component is built

Open Cursor. Make sure these files are in your project root and referenced in every prompt:
- `schema.sql` (your database structure)
- `.env.local` (your keys)

Install required packages first. Open the Cursor terminal (Ctrl+`) and run:

```
npm install @supabase/supabase-js nanoid
npm install recharts
npm install @supabase/ssr
```

---

## Step 1: Supabase client setup

**Paste into Cursor Composer:**

```
Using @schema.sql and my .env.local file, create a Supabase client setup for a Next.js 14 App Router project.

Create these files:
1. lib/supabase/client.ts — browser client using createBrowserClient from @supabase/ssr
2. lib/supabase/server.ts — server client using createServerClient from @supabase/ssr with cookies
3. lib/supabase/middleware.ts — middleware to refresh auth sessions

Use NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY from the environment.

Also update middleware.ts in the project root to use the Supabase middleware.
```

---

## Step 2: Global layout and header

**Paste into Cursor Composer:**

```
Create the root layout for TassleCost at app/layout.tsx.

Requirements:
- Font: Inter from next/font/google, applied to the html element
- Background: white
- No navigation menu
- Header component: white background, full width, contains the TassleCost logo (text only, "TassleCost" in black, 18px, medium weight) on the left and the search bar on the right
- The search bar in the header is a controlled input that navigates to /?q=[query] on change
- Header is sticky (stays at top when scrolling)
- On mobile (under 640px), the header stacks vertically: logo on top, search bar full width below

Create the header as a separate component at components/Header.tsx.
The search bar in the header should be a separate component at components/SearchBar.tsx.
SearchBar accepts a defaultValue prop so it can be pre-filled from the URL query param.
```

---

## Step 3: Homepage

**Paste into Cursor Composer:**

```
Create the homepage at app/page.tsx for TassleCost.

The page reads the ?q= query param from the URL.

Layout:
- If no query param: show the hero section (headline, subhead, large centered search input, 3 example college cards below)
- If query param exists: show search results inline below the header search bar, hero section is hidden

Hero section:
- Headline: "Find out if your college is worth it." — 36px, font-weight 500, centered
- Subhead: "Compare real costs and real salary outcomes for 7,000+ colleges before you decide." — 18px, color #6b7280, centered
- Search input: centered, 480px wide on desktop, full width on mobile, large (48px height), placeholder "Search colleges, universities, and community colleges"
- On input change, update the URL ?q= param without a page reload using router.replace

Example cards: show 3 hardcoded college cards (use MIT, UCLA, and Northern Virginia Community College as examples with realistic placeholder data) styled the same as real search results.

Create a CollegeCard component at components/CollegeCard.tsx used by both the example cards and real search results.

CollegeCard props: name, city, state, control (1/2/3), netPrice (number or null), salary10yr (number or null), unitId (number), slug (string).

CollegeCard displays:
- College name (16px, medium weight, black)
- City, state (14px, gray)
- Control type badge: "Public" (blue), "Private" (purple), "For-Profit" (orange)
- Net price: "Net Price: $X,XXX/yr" or "Net price not available" if null
- Median salary: "Median salary (10yr): $XX,XXX" or "Salary data suppressed" if null
- The whole card is a link to /college/[unitId]-[slug]
```

---

## Step 4: Search results

**Paste into Cursor Composer:**

```
Create the search results component at components/SearchResults.tsx for TassleCost.

This component:
- Accepts a query string prop
- Calls a server action or API route to search the Supabase colleges table
- Shows a loading skeleton while fetching
- Shows CollegeCard components for each result
- Shows a no-results message if the query returns nothing
- Debounces the search by 300ms

Create the search API route at app/api/search/route.ts.

The route:
- Accepts GET requests with a ?q= param
- Uses the Supabase server client
- Queries the colleges table using Postgres full-text search: .textSearch('search_vector', query, { type: 'websearch' })
- Also does a trigram similarity search on the name column as a fallback: .ilike('name', '%' + query + '%')
- Returns the union of both result sets, deduplicated by unit_id
- Returns max 8 results
- Returns these fields only: id, unit_id, name, city, state, control, net_price, salary_10yr, salary_null_reason
- Creates a slug from the name: lowercase, spaces replaced with hyphens, special characters removed

The no-results message: "No colleges matched [query]. Try a partial name, city, or state abbreviation."
The error message: "Search is unavailable right now. Try again in a moment."

Loading state: show 4 skeleton cards (gray rectangles animating with a pulse) while the query is running.
```

---

## Step 5: College detail page

**Paste into Cursor Composer:**

```
Create the college detail page at app/college/[slug]/page.tsx for TassleCost.

The slug format is [unitId]-[college-name-slug], for example: 166027-mit.

The page:
- Extracts the unitId from the slug (everything before the first hyphen)
- Fetches the college record from Supabase by unit_id using the server client
- Renders a 404 page if no record is found
- Generates metadata using generateMetadata: title is "[College Name] ROI and Cost | TassleCost", description is "See the real cost, median salary, and 10-year ROI for [College Name]. Compare with other colleges."

Layout (top to bottom):
1. College name (28px, medium weight), city + state + control type on the same line below (14px, gray)
2. Key metrics row: 4 metric cards side by side — Net Price Per Year, Graduation Rate, Median Salary (10yr), Median Monthly Debt Payment. Each card has a label (12px, gray, uppercase) and a value (24px, medium weight, black). Handle nulls with the messages defined in the UX guide.
3. ROI Calculator component (see Step 6) — pre-filled with this college's net_price and salary_10yr
4. AI Summary component (see Backend guide) — placed below the calculator output
5. Full data table: two-column table (label, value) for all available Scorecard fields. Labels in plain English, values formatted (currency, percentages, integers as appropriate). Null values show the appropriate message from the UX guide.
6. Add to comparison button — fixed to the bottom right of the screen, reads "Compare" with a + icon. On click, adds this college to the comparison state stored in localStorage. If 3 colleges are already in comparison, show a message: "Remove a college from your comparison first."

Create a helper function at lib/formatters.ts with:
- formatCurrency(n: number | null): string — returns "$X,XXX" or "Not available"
- formatPercent(n: number | null): string — returns "XX%" or "Not available"  
- formatSalaryNull(reason: string | null): string — returns the appropriate null message from the UX guide
- createSlug(name: string): string — lowercase, hyphens for spaces, removes special characters
```

---

## Step 6: ROI Calculator component

**Paste into Cursor Composer:**

```
Create the ROI Calculator component at components/ROICalculator.tsx for TassleCost.

This is a client component ("use client").

Props:
- defaultCost: number | null (annual net price, will be multiplied by 4 for total)
- defaultSalary: number | null (10-year median salary)

State (all editable by the user):
- totalCost: number (defaultCost * 4, or 0 if null)
- expectedSalary: number (defaultSalary or 0)
- currentSalary: number (0)
- interestRate: number (6.8)
- loanTerm: number (10)

Inputs (all are number inputs with labels):
- "Total degree cost ($)" — pre-filled with totalCost
- "Expected salary after graduation ($)" — pre-filled with expectedSalary
- "Current salary / opportunity cost ($)" — starts at 0
- "Loan interest rate (%)" — starts at 6.8
- "Loan repayment term" — dropdown with options 10, 20, 25 years

Calculation (runs on every input change, no API call needed — this is pure math):
- monthlyRate = interestRate / 100 / 12
- numPayments = loanTerm * 12
- monthlyPayment = totalCost * (monthlyRate * (1 + monthlyRate)^numPayments) / ((1 + monthlyRate)^numPayments - 1)
- totalPaid = monthlyPayment * numPayments
- totalInterest = totalPaid - totalCost

For the break-even calculation (year by year):
- degreeEarnings[year] = (expectedSalary - monthlyPayment * 12) * year
- noDegreeEarnings[year] = currentSalary * year
- breakEvenYear = first year where degreeEarnings[year] > noDegreeEarnings[year]
- If no break-even within 30 years, show "This degree does not produce a positive return within 30 years at these salary figures."

Outputs displayed:
- Monthly payment: large number, dollar formatted
- Total paid over term: dollar formatted
- Total interest paid: dollar formatted
- Break-even year: "Year X" or the no-break-even message
- 20-year net gain vs no degree: dollar formatted (can be negative)

Chart using Recharts LineChart:
- X axis: Year 1 to Year 20
- Y axis: cumulative earnings in dollars
- Line 1 (blue): degree path — cumulative (expectedSalary - monthlyPayment * 12) per year, stopping loan deductions after loanTerm years
- Line 2 (gray): no-degree path — cumulative currentSalary per year
- A vertical dashed line at the break-even year if it exists within 20 years
- Clean, minimal chart — no grid lines, just the two lines and the break-even marker
- Responsive: full width of its container

If totalCost is 0 and expectedSalary is 0, show: "Enter a degree cost and expected salary to calculate your ROI."
```

---

## Step 7: Comparison page

**Paste into Cursor Composer:**

```
Create the comparison system for TassleCost.

Part 1 — Comparison state management:
Create lib/comparison.ts with functions to manage the comparison state in localStorage:
- getComparison(): string[] — returns array of unitIds currently in comparison (max 3)
- addToComparison(unitId: string): boolean — adds unitId, returns false if already at 3
- removeFromComparison(unitId: string): void
- clearComparison(): void
- getComparisonUrl(): string — creates a URL-safe string encoding the current comparison

Part 2 — Save comparison API route:
Create app/api/comparison/route.ts that accepts POST requests with an array of college unitIds (max 3), generates an 8-character nanoid as the short_id, saves to the Supabase comparisons table using the service role client, and returns the short_id.

Part 3 — Comparison page:
Create app/compare/[shortId]/page.tsx.
- Fetches the comparison record from Supabase by short_id
- Fetches the college records for each college_id in the comparison
- Increments the view_count on the comparison record
- Renders a side-by-side comparison table

Comparison table layout:
- Header row: college names as column headers
- One row per metric: Net Price, Graduation Rate, Retention Rate, Median Debt, Monthly Payment, Median Salary 6yr, Median Salary 10yr
- In each row, highlight the best value with a green background (lowest cost = best, highest salary = best, highest rate = best)
- Null values show "—" with no highlight

Below the table: the ROI Calculator component renders once per college, side by side (stacked on mobile).

Part 4 — Share button:
On the comparison page, add a "Share this comparison" button that calls the save comparison API and copies the resulting URL to the clipboard. Show "Link copied!" for 2 seconds after copying.
```

---

## Step 8: AI Summary component

**Paste into Cursor Composer:**

```
Create the AI Summary component at components/AISummary.tsx for TassleCost.

This is a client component ("use client").

Props:
- collegeId: number
- calculatorInputs: object with totalCost, expectedSalary, currentSalary, interestRate, loanTerm, monthlyPayment, breakEvenYear, twentyYearGain

Behavior:
- On mount, sends a POST request to /api/ai-summary with the props
- While loading: shows a subtle skeleton (3 gray lines, pulsing)
- On success: renders the summary text in a light gray box below the calculator
- On error or timeout (after 8 seconds): shows nothing — the calculator still works without this component

Create the API route at app/api/ai-summary/route.ts:
- Accepts POST with collegeId and calculatorInputs
- Creates an input hash: sha256 of JSON.stringify({ collegeId, ...calculatorInputs })
- Checks the Supabase roi_cache table for an existing entry with matching college_id and input_hash where expires_at is in the future
- If cache hit: returns the cached summary
- If cache miss: calls the Anthropic API with claude-sonnet-4-5-20251001 model
- Stores the result in roi_cache
- Returns the summary

The prompt to Claude (use this exactly):
"You are a financial advisor helping a student understand whether a college degree is worth the cost. Write exactly 3 sentences in plain English. Do not use jargon. The student is considering [college name]. Total degree cost: $[totalCost]. Expected salary: $[expectedSalary]/year. Current salary without degree: $[currentSalary]/year. Monthly loan payment: $[monthlyPayment]. Break-even year: [breakEvenYear]. 20-year net gain: $[twentyYearGain]. Write a direct, honest verdict on whether this is a good financial decision."

Use the ANTHROPIC_API_KEY environment variable. This is a server-side route only — the API key never goes to the browser.
```

---

## Component completion checklist

Before any component is considered done, confirm all three states work:

| Component | Loading state | Empty/null state | Error state |
|-----------|--------------|-----------------|-------------|
| SearchResults | Skeleton cards | No-results message | API error message |
| CollegeCard | N/A | Null price/salary messages | N/A |
| College detail page | Full page skeleton | 404 | N/A |
| ROI Calculator | N/A | Zero-input message | N/A |
| AISummary | Skeleton lines | Hidden | Hidden |
| Comparison page | Loading spinner | Empty comparison | N/A |
