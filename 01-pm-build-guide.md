# TassleCost — Product Manager Build Guide

## Role: Frank

This document defines what gets built, in what order, and what done means for each feature. Nothing gets built without a definition of done written here first.

---

## The product in one sentence

TassleCost shows a student or parent whether a specific college degree is worth the money, in plain numbers, before they sign anything.

---

## Feature list with acceptance criteria

### Feature 1: College search

**What it does:** User types a college name and sees matching results instantly.

**Done means:**
- Results appear within 400ms of the user stopping typing
- Partial name matches work ("Penn" returns Penn State, UPenn, and others)
- Results show college name, city, state, control type (public/private), and net price
- Typing a name that matches nothing shows a message explaining what to try next
- Works on mobile with the same speed

**Not in this feature:**
- Filters (those are Feature 1b)
- Sorting (same)

---

### Feature 1b: Search filters

**What it does:** User narrows results by state, institution type, and cost range.

**Done means:**
- Filter by state (dropdown, all 50 states)
- Filter by control type (public, private nonprofit, for-profit)
- Filter by net price range (under $10k, $10k-$20k, $20k-$30k, over $30k annually)
- Filters apply on top of the search query, not instead of it
- Clearing filters returns full results for the current search query

---

### Feature 2: College detail page

**What it does:** User clicks a college and sees all relevant data about it.

**Done means:**
- Unique URL per college: /college/[unit-id]-[slug]
- Displays: name, location, type, size, cost of attendance, net price, tuition in-state, tuition out-of-state, median debt at graduation, median monthly payment, graduation rate, retention rate, median salary at 6 years, median salary at 10 years
- Every field with missing data shows a clear explanation, not a blank or dash
- Page loads in under 2 seconds on a mobile connection
- Calculator is pre-filled with that college's net price and 10-year salary data

---

### Feature 3: ROI calculator

**What it does:** User inputs their numbers and sees whether the degree pays off.

**Done means:**
- Inputs: total cost (pre-filled from college data, editable), expected salary (pre-filled from college data, editable), current salary (opportunity cost, starts at zero), loan interest rate (default 6.8%), loan term (default 10 years)
- Outputs: total loan cost, monthly payment, break-even year, total lifetime gain vs no degree
- Output updates when any input changes
- Output displays a chart showing cumulative income over 20 years: degree path vs no-degree path
- All math is correct (see Backend build guide for the formula)

**Not in this feature:**
- Community college bridge calculation (Week 3)
- Multiple loan types (Week 3)

---

### Feature 4: Comparison view

**What it does:** User compares up to 3 colleges side by side.

**Done means:**
- User can add a college to comparison from the search results or detail page
- Maximum 3 colleges in a comparison
- Side-by-side display of all key metrics with delta highlighting (which is better)
- Calculator runs for all 3 colleges simultaneously
- A unique URL represents every comparison so it can be shared
- Opening the URL on a different device shows the same comparison

---

### Feature 5: AI summary

**What it does:** Claude writes a plain-English verdict on the ROI calculation.

**Done means:**
- 3 sentences maximum
- Written for someone who is not a financial expert
- Appears below the calculator output
- Cached in Supabase so the same calculation never calls the API twice
- If the API is slow or unavailable, the calculator still works without it

---

## Build sequence

| Day | Feature |
|-----|---------|
| 1 | Infrastructure live |
| 2 | ETL complete, colleges in database |
| 3 | Feature 1: Search |
| 3 | Feature 1b: Filters |
| 4 | Feature 3: Calculator |
| 5 | Feature 2: Detail page |
| 5 | Feature 4: Comparison |
| 6 | Feature 5: AI summary |
| 7 | Buffer, mobile pass, broken things |
| 8 | SEO metadata and sitemap |
| 9 | Caching and performance |
| 10 | Monitoring setup |
| 11 | Load test |
| 12 | Beta users |
| 13 | Fix top 3 beta issues |
| 14 | Launch |

---

## Decisions already made (do not revisit)

- No user accounts at launch. URL sharing handles the sharing use case.
- No community college bridge calculator at launch. Week 3.
- No natural language search at launch. Text search first.
- Postgres full-text search only. No external search service until it is demonstrably insufficient.
- Claude Sonnet 4.5 for AI summaries. Not Opus. Cost control.
- Hostinger KVM 4. Not upgrading unless load test proves it is necessary.

---

## What gets cut if time runs out

Cut in this order. Stop when you have enough time.

1. AI summary (Feature 5)
2. Search filters (Feature 1b)
3. Comparison view (Feature 4)
4. College detail page full data set (ship with top 10 fields only)

The calculator and search are the product. Everything else is additive.
