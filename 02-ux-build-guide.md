# TassleCost — UX Designer Build Guide

## Role: Claude

This document defines every screen, every user path, and every state that must be designed before Cursor builds anything. No component gets built without its states defined here first.

---

## User types

**Student (primary):** 16-22 years old, deciding between schools, has a specific school in mind, wants to know if they can afford it and whether it pays off. Arrives via Google searching for a specific school name.

**Parent (secondary):** 40-55 years old, helping a child decide, more financially literate, wants the same information but trusts numbers more than summaries. Arrives via Google or direct link from their child.

**Design to the student. The parent will follow.**

---

## Entry points

1. Homepage — direct visit or organic search for "college ROI" or "is [school] worth it"
2. College page — organic search for "[school name] ROI" or "[school name] salary after graduation"
3. Comparison URL — shared link from another user

---

## Screen map

```
Homepage
├── Search results (inline, no page change)
│   └── College card → College detail page
│       └── Calculator (embedded on detail page)
│           └── AI summary (below calculator)
├── Comparison tray (persistent, bottom of screen)
│   └── Comparison page (full screen)
│       └── Calculator (runs for each college)
│           └── AI summary (one per college)
```

---

## Screen-by-screen specification

### Homepage

**Primary action:** Search for a college.

**Layout:**
- Headline: one line, explains what the tool does
- Subhead: one line, explains who it is for
- Search input: centered, prominent, placeholder text "Search 7,000+ colleges"
- Below the fold: 3 example college cards showing what results look like

**States:**
- Default: headline, subhead, search input, example cards
- Searching (user has typed 1+ characters): results appear below the input, example cards disappear
- No results: message below input, no results list

**What is not on the homepage:**
- Navigation menu (not needed at launch)
- Sign up prompt (no accounts)
- Marketing copy beyond the headline and subhead

---

### Search results (inline)

**Triggered by:** User typing in the search input on homepage or any page with the search bar.

**Layout:**
- Results appear below the search input, overlapping the page content
- Each result is a card: college name (large), city and state (small), control type badge, net price per year
- Maximum 8 results shown
- Results update on every keystroke after a 300ms debounce

**States:**
- Loading (between keystroke and results): subtle skeleton animation on the cards
- Results: 1-8 college cards
- No results: "No colleges matched [query]. Try searching by city or state." with two example searches
- Error: "Search is not available right now. Try again in a moment."

---

### College detail page

**URL:** /college/[unitid]-[college-name-slug]

**Layout (top to bottom):**
1. College name, city, state, control type, accreditor
2. Key metrics row: net price, graduation rate, retention rate, median salary 10yr
3. ROI calculator (see calculator specification below)
4. AI summary (below calculator output)
5. Full data table: all available Scorecard fields with labels in plain English
6. Add to comparison button (sticky, visible while scrolling)

**States for missing data:**
- Salary suppressed: "Salary data for this school is not published because the graduate count in this field is too small to report. This is common at small or specialized institutions." Show the 6-year figure if available.
- Salary not reported: "This school has not reported salary outcomes data."
- Cost data missing: "Cost data is not available for this school."
- Never show a blank field. Every null has a message.

---

### ROI Calculator (embedded on detail and comparison pages)

**Inputs (all editable, pre-filled where data exists):**
- Total degree cost (net price x 4, editable)
- Expected salary after graduation (pre-filled from 10yr median, editable)
- Current salary / opportunity cost (default: $0, editable)
- Loan interest rate (default: 6.8%, editable)
- Loan repayment term (default: 10 years, options: 10, 20, 25 years)

**Outputs (update instantly when inputs change):**
- Monthly loan payment (dollar amount)
- Total paid over loan term (dollar amount)
- Break-even year (year when cumulative income with degree exceeds without degree)
- 20-year net gain (dollar amount)
- Chart: cumulative income over 20 years, two lines — degree path and no-degree path

**States:**
- Default: inputs pre-filled, outputs calculated
- User edits input: outputs update in real time, no loading state (calculation is instant)
- All inputs zero: outputs show zero, no error
- Salary input is zero and degree cost is not zero: break-even never reached, show "This degree does not produce a positive return at $0 expected salary. Enter an expected salary to calculate."

---

### Comparison page

**URL:** /compare/[short-id]

**Layout:**
- Header row: college names (up to 3 columns)
- Metric rows: one row per metric, values for each college, delta indicator showing which is best
- Calculator row: full calculator running for each college simultaneously
- AI summary row: one summary per college

**Delta indicators:**
- Green highlight: best value in this row
- No highlight: other values
- Gray: all values are equal or all are null

**States:**
- 1 college: comparison layout but only one column, prompt to add more
- 2-3 colleges: full comparison
- Shared URL, school removed from Scorecard: "This college is no longer in the database." gray column

---

### Null state design (applies to all screens)

This is the most important UX decision on the project. The College Scorecard has ~20% null rate on salary data. Every null state must be designed explicitly.

**Rule:** Never show a dash, N/A, or blank. Every missing value has a sentence explaining why it is missing and what the user can do instead.

**Rule:** If 10-year salary is null but 6-year salary exists, show the 6-year figure with a label noting it is 6-year data.

**Rule:** If both salary figures are null, still show the calculator. Let the user enter their own expected salary manually. The calculator works with any inputs.

---

## Navigation

At launch, the site has no navigation menu. The search bar is the navigation. Every page has the search bar in the header. That is sufficient for a tool-first product.

Add to comparison is the only persistent UI element. It lives in the bottom right corner of every college detail page and floats while scrolling.

---

## Mobile specification

The site is used on phones. Treat mobile as the primary layout, not a scaled-down version of desktop.

**Search:** Full width input, keyboard appears on focus, results appear below and are scrollable.

**Calculator:** Inputs stack vertically. Outputs appear below inputs. Chart is full width and readable at 375px.

**Comparison:** On mobile, comparison is horizontal scroll, not side by side. Maximum 2 colleges on mobile (3 is unreadable at 375px).

**Detail page:** Sticky add-to-comparison button sits above the mobile browser chrome at the bottom.
