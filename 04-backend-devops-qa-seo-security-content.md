# TassleCost — Backend Developer Build Guide

## Role: Cursor + Claude

This document covers all API routes, the ROI formula, the Claude integration, and the caching layer. The ROI formula is the most important thing in this file. Get it right before building anything else.

---

## The ROI formula

This is the core calculation. It must be correct. Verify it manually against a loan calculator before shipping.

```
Given:
  P = total degree cost (principal)
  r = annual interest rate as decimal (e.g. 0.068)
  n = loan term in years
  S = expected annual salary after degree
  C = current annual salary (opportunity cost, can be 0)

Monthly interest rate:
  monthlyRate = r / 12

Number of payments:
  numPayments = n * 12

Monthly payment (standard amortisation formula):
  monthlyPayment = P * (monthlyRate * (1 + monthlyRate)^numPayments)
                   / ((1 + monthlyRate)^numPayments - 1)

Total paid over loan term:
  totalPaid = monthlyPayment * numPayments

Total interest paid:
  totalInterest = totalPaid - P

Annual net income with degree (during repayment):
  annualNetDegree = S - (monthlyPayment * 12)

Annual net income with degree (after repayment):
  annualNetDegree = S

Annual net income without degree:
  annualNetNoDegree = C

Cumulative earnings comparison (year by year, 1 to 30):
  degreeEarnings[y] = sum of annualNetDegree for years 1 through y
  noDegreeEarnings[y] = C * y

Break-even year:
  First y where degreeEarnings[y] >= noDegreeEarnings[y]
  If none within 30 years: return null

20-year net gain:
  degreeEarnings[20] - noDegreeEarnings[20]
```

**Verify this formula manually before using it in code.** Use a known loan: $40,000 at 6.8% over 10 years should produce a monthly payment of approximately $461. If your calculation returns something materially different, the formula is wrong.

---

## API routes

### GET /api/search

Already covered in Frontend guide. The backend responsibility is the Supabase query only.

```typescript
// Supabase query for search
const { data } = await supabase
  .from('colleges')
  .select('id, unit_id, name, city, state, control, net_price, salary_10yr, salary_null_reason')
  .textSearch('search_vector', query, { type: 'websearch', config: 'english' })
  .limit(8)
```

Fallback if textSearch returns 0 results:

```typescript
const { data } = await supabase
  .from('colleges')
  .select('id, unit_id, name, city, state, control, net_price, salary_10yr, salary_null_reason')
  .ilike('name', `%${query}%`)
  .limit(8)
```

Return the union of both, deduplicated by unit_id.

---

### POST /api/comparison

```typescript
// Generate short ID and save comparison
import { nanoid } from 'nanoid'

const shortId = nanoid(8)
const { data, error } = await supabase
  .from('comparisons')
  .insert({
    short_id: shortId,
    college_ids: collegeIds,  // array of integers
    calc_inputs: calcInputs   // JSON object
  })
  .select('short_id')
  .single()

return Response.json({ shortId: data.short_id })
```

---

### POST /api/ai-summary

```typescript
import { createHash } from 'crypto'
import Anthropic from '@anthropic-ai/sdk'

// Create cache key
const inputHash = createHash('sha256')
  .update(JSON.stringify({ collegeId, ...calculatorInputs }))
  .digest('hex')

// Check cache using service role client (bypasses RLS)
const { data: cached } = await supabaseAdmin
  .from('roi_cache')
  .select('summary')
  .eq('college_id', collegeId)
  .eq('input_hash', inputHash)
  .gt('expires_at', new Date().toISOString())
  .single()

if (cached) return Response.json({ summary: cached.summary })

// Call Claude
const client = new Anthropic()
const message = await client.messages.create({
  model: 'claude-sonnet-4-5-20251001',
  max_tokens: 200,
  messages: [{ role: 'user', content: buildPrompt(college, calculatorInputs) }]
})

const summary = message.content[0].text

// Cache the result
await supabaseAdmin
  .from('roi_cache')
  .insert({
    college_id: collegeId,
    input_hash: inputHash,
    summary,
    model: 'claude-sonnet-4-5-20251001',
    prompt_tokens: message.usage.input_tokens
  })

return Response.json({ summary })
```

Install the Anthropic SDK: `npm install @anthropic-ai/sdk`

---

## Cursor prompt for backend setup

**Paste into Cursor Composer:**

```
Set up the backend API structure for TassleCost using Next.js 14 App Router.

Create a Supabase admin client at lib/supabase/admin.ts that uses the SUPABASE_SERVICE_ROLE_KEY environment variable. This client bypasses RLS and is used only in server-side API routes.

Install the Anthropic SDK: npm install @anthropic-ai/sdk

Create lib/roi-calculator.ts with a pure TypeScript function calculateROI that takes these inputs:
- totalCost: number
- expectedSalary: number  
- currentSalary: number
- interestRate: number (as percentage, e.g. 6.8)
- loanTerm: number (in years)

And returns:
- monthlyPayment: number
- totalPaid: number
- totalInterest: number
- breakEvenYear: number | null
- twentyYearGain: number
- chartData: Array<{ year: number, degreeEarnings: number, noDegreeEarnings: number }>

Use the exact amortisation formula specified in the backend build guide. Do not approximate.

Create a test at lib/roi-calculator.test.ts that verifies: $40,000 at 6.8% over 10 years produces a monthly payment between $459 and $463. Run this test with: npx tsx lib/roi-calculator.test.ts
```

---

---

# TassleCost — DevOps Build Guide

## Role: Cursor + Claude

This document contains exact commands for server setup and the GitHub Actions pipeline. Every command is copy-paste ready.

---

## Day 1 server setup sequence

Run these commands in your SSH session in this exact order. Wait for each to complete before the next.

```bash
# Update the server
apt update && apt upgrade -y

# Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

# Verify Node version (should show v20.x.x)
node --version

# Install Nginx and Git
apt install -y nginx git

# Install PM2 globally
npm install -g pm2

# Create the web directory
mkdir -p /var/www
cd /var/www

# Clone your repo (replace YOUR_GITHUB_USERNAME)
git clone https://github.com/YOUR_GITHUB_USERNAME/college-roi.git
cd college-roi

# Install dependencies
npm install

# Create the environment file
nano .env.local
# Paste your env vars, Ctrl+X to save

# Build the app
npm run build

# Start with PM2
pm2 start npm --name "college-roi" -- start
pm2 save

# Set PM2 to start on reboot
pm2 startup
# Run the command that pm2 startup outputs

# Verify the app is running
pm2 status
curl http://localhost:3000
```

---

## Nginx configuration

```bash
# Create the Nginx config
nano /etc/nginx/sites-available/college-roi
```

Paste this exactly, replacing yourdomain.com:

```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
# Enable the config
ln -s /etc/nginx/sites-available/college-roi /etc/nginx/sites-enabled/

# Remove the default site
rm /etc/nginx/sites-enabled/default

# Test the config
nginx -t

# Restart Nginx
systemctl restart nginx
systemctl enable nginx
```

---

## GitHub Actions deploy workflow

**Cursor Composer prompt:**

```
Create a GitHub Actions workflow at .github/workflows/deploy.yml for TassleCost.

The workflow:
- Triggers on every push to the main branch
- SSHes into the Hostinger VPS
- Runs these commands in order:
  cd /var/www/college-roi
  git pull origin main
  npm install --production
  npm run build
  pm2 reload college-roi

Uses these GitHub secrets (I will add them to the repo):
- VPS_HOST: the server IP address
- VPS_USER: root
- VPS_SSH_KEY: the SSH private key content

The workflow should fail fast if any command fails and send no notifications (I will check the Actions tab manually).

Also add a second job that runs before the deploy job: install dependencies and run npm run lint. If lint fails, do not deploy.
```

---

## Adding SSH key to GitHub secrets

```bash
# On your LOCAL machine (not the server), generate a deploy key
ssh-keygen -t ed25519 -C "tasslecost-deploy" -f ~/.ssh/tasslecost_deploy

# Copy the PUBLIC key
cat ~/.ssh/tasslecost_deploy.pub
```

SSH into your server and add the public key:

```bash
# On the SERVER
nano ~/.ssh/authorized_keys
# Paste the public key on a new line, save
```

Copy the PRIVATE key content:

```bash
# On your LOCAL machine
cat ~/.ssh/tasslecost_deploy
```

Go to GitHub repo → Settings → Secrets and variables → Actions → New repository secret:
- `VPS_SSH_KEY` = the full private key content including the BEGIN and END lines

---

## Log management

```bash
# On the server — set up PM2 log rotation
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7
pm2 set pm2-logrotate:compress true
```

---

## Deploy command (for manual deploys)

```bash
# SSH into server and run
cd /var/www/college-roi && git pull && npm install && npm run build && pm2 reload college-roi
```

---

---

# TassleCost — Data Engineer Build Guide

## Role: Cursor + Claude

This document covers the College Scorecard ETL from download to verified data in Supabase.

---

## Step 1: Download the data

Go to: https://collegescorecard.ed.gov/data/

Download: "Most Recent Data" (the zip file at the top). It is approximately 200MB compressed.

Unzip it. Inside you will find a file named something like `MERGED2022_23_PP.csv`. Rename it to `scorecard.csv` and place it at `data/scorecard.csv` in your project.

---

## Step 2: Run the ETL

Open Cursor Composer and paste the ETL prompt from the file `cursor-etl-prompt.md` that was already provided. Cursor will write the full ETL script.

After Cursor writes the script, run:

```bash
npm run etl
```

---

## Step 3: Verify the data

After the ETL completes, run these verification queries in the Supabase SQL Editor:

```sql
-- Total count (should be 6,000 to 7,500)
SELECT COUNT(*) FROM colleges;

-- Null rate on salary_10yr (should be under 35%)
SELECT
  COUNT(*) as total,
  COUNT(salary_10yr) as has_salary,
  ROUND(COUNT(salary_10yr)::numeric / COUNT(*) * 100, 1) as pct_with_salary,
  COUNT(CASE WHEN salary_null_reason = 'suppressed' THEN 1 END) as suppressed,
  COUNT(CASE WHEN salary_null_reason = 'not_reported' THEN 1 END) as not_reported
FROM colleges;

-- Null rate on net_price (should be under 20%)
SELECT
  COUNT(*) as total,
  COUNT(net_price) as has_price,
  ROUND(COUNT(net_price)::numeric / COUNT(*) * 100, 1) as pct_with_price
FROM colleges;

-- Spot check MIT
SELECT name, city, state, net_price, salary_10yr, control
FROM colleges
WHERE name ILIKE '%massachusetts institute%';

-- Spot check a community college
SELECT name, city, state, net_price, salary_10yr, control, pred_degree
FROM colleges
WHERE name ILIKE '%northern virginia community%';

-- Verify full-text search works
SELECT name, city, state
FROM colleges
WHERE search_vector @@ to_tsquery('english', 'virginia & community')
LIMIT 5;
```

**If any of these return unexpected results, do not proceed.** Fix the ETL first.

---

## What acceptable data looks like

- Total rows: 6,000 to 7,500
- Rows with salary_10yr: at least 65%
- Rows with net_price: at least 75%
- MIT record exists with correct name, city (Cambridge), state (MA), control (2)
- Full-text search returns relevant results for common queries
- No rows where name is null or empty

---

---

# TassleCost — QA Tester Build Guide

## Role: Frank

This is the checklist. Every item is pass or fail. Nothing ships until everything passes.

---

## Pre-launch checklist

### Search

- [ ] Type "MIT" — results appear within 400ms
- [ ] Type "mit" (lowercase) — same results
- [ ] Type "massach" (partial) — MIT appears in results
- [ ] Type "xyznotaschool" — no-results message appears (not a blank screen)
- [ ] Type a school name, clear the input — results disappear
- [ ] Search from the homepage, then search from the header on the detail page — both work

### College detail page

- [ ] Click a search result — detail page loads
- [ ] URL is in correct format: /college/[number]-[name-slug]
- [ ] All metric cards display values or their null message (no blank fields)
- [ ] Net price shows a dollar amount or "Not available" — never blank
- [ ] Salary shows a dollar amount, "Salary data suppressed" or "Salary data not available" — never blank
- [ ] Full data table loads below the calculator
- [ ] Page title in browser tab is "[College Name] ROI and Cost | TassleCost"

### ROI Calculator

- [ ] Calculator pre-fills with the college's net price and salary
- [ ] Change any input — output updates instantly
- [ ] Set all inputs to 0 — zero-input message appears
- [ ] Set salary to 0 and cost to $40,000 — no-break-even message appears
- [ ] Monthly payment for $40,000 at 6.8% over 10 years shows approximately $461
- [ ] Chart renders with two lines
- [ ] Break-even year marker appears on the chart when break-even is within 20 years

### Comparison

- [ ] Click Add to Compare on a college detail page — button changes state
- [ ] Add a second college — both appear in comparison
- [ ] Add a third college — all three appear
- [ ] Try to add a fourth college — message appears, comparison unchanged
- [ ] Click Share — URL is copied to clipboard
- [ ] Open that URL in a different browser tab — same comparison loads
- [ ] Remove a college from comparison — comparison updates

### AI Summary

- [ ] Wait on a detail page with calculator filled — summary appears below calculator
- [ ] Summary is 3 sentences or fewer
- [ ] Run the same calculation twice — second load is faster (cache working)
- [ ] Summary makes sense given the inputs (salary, cost, break-even)

### Mobile (test on actual phone, not browser resize)

- [ ] Homepage loads, search input is tappable
- [ ] Search results appear and are scrollable
- [ ] College detail page is readable without horizontal scrolling
- [ ] Calculator inputs are tappable and keyboard does not cover the output
- [ ] Comparison works with 2 colleges (3 is intentionally limited on mobile)

### Performance (run Lighthouse in Chrome DevTools)

- [ ] LCP (Largest Contentful Paint): under 2.5 seconds
- [ ] CLS (Cumulative Layout Shift): under 0.1
- [ ] INP (Interaction to Next Paint): under 200ms
- [ ] Run on the homepage, a college detail page, and the comparison page

### Null states

- [ ] Find a college with suppressed salary data — "Salary data suppressed" appears
- [ ] Find a college with no net price — "Not available" appears
- [ ] These states look intentional, not broken

### Error states

- [ ] Disconnect from internet, search for a college — error message appears (not a crash)
- [ ] Reconnect — search works again

---

## How to run Lighthouse

1. Open Chrome
2. Go to the page you want to test
3. Press F12 (or Cmd+Option+I on Mac)
4. Click the "Lighthouse" tab
5. Select "Mobile" for device
6. Click "Analyze page load"
7. Check the Performance score and the three metrics above

---

---

# TassleCost — SEO Build Guide

## Role: Cursor + Claude

---

## Cursor prompt for SEO implementation

```
Implement SEO for TassleCost using Next.js 14 App Router metadata.

Part 1 — College detail page metadata (update app/college/[slug]/page.tsx):
Generate metadata using generateMetadata function. For each college:
- title: "[College Name] Cost and ROI | TassleCost"
- description: "The real cost of [College Name] is $[netPrice]/year. Median salary 10 years after graduation: $[salary10yr]. See if [College Name] is worth it."
- If netPrice is null: use "See the full cost breakdown and salary outcomes for [College Name]."
- If salary10yr is null: omit salary from description
- openGraph.title: same as title
- openGraph.description: same as description
- openGraph.type: "website"
- canonical URL: https://tasslecost.com/college/[slug]

Part 2 — Structured data (add to college detail page):
Add a JSON-LD script tag with schema.org/EducationalOrganization:
- @type: EducationalOrganization
- name: college name
- address: city, state
- url: college URL from database
- numberOfStudents: undergrad_size if available

Part 3 — Sitemap (create app/sitemap.ts):
Generate a sitemap that includes:
- The homepage
- All college detail pages (fetch all unit_id and name from Supabase, generate slugs)
- lastModified: today's date for all entries
- changeFrequency: "monthly" for college pages, "daily" for homepage
- priority: 1.0 for homepage, 0.8 for college pages

Part 4 — Robots.txt (create app/robots.ts):
Allow all crawlers. Point to the sitemap URL.

Part 5 — Root layout metadata (update app/layout.tsx):
Add default metadata:
- title.default: "TassleCost — Is Your College Worth It?"
- title.template: "%s | TassleCost"
- description: "Compare real costs and salary outcomes for 7,000+ colleges. Find out if your degree pays off before you sign."
- metadataBase: new URL('https://tasslecost.com')
```

---

## After launch: Google Search Console setup

1. Go to search.google.com/search-console
2. Click Add property
3. Enter your domain
4. Verify ownership via Cloudflare DNS (add the TXT record Cloudflare shows you in your DNS settings)
5. Go to Sitemaps
6. Submit: https://yourdomain.com/sitemap.xml
7. Come back in 48 hours and check for indexing errors

---

---

# TassleCost — Security Build Guide

## Role: Claude (decisions already implemented)

This is a verification checklist, not a build guide. Every item here was designed into the architecture. Confirm each one is working before launch.

---

## Credential audit

- [ ] `SUPABASE_SERVICE_ROLE_KEY` only appears in `lib/supabase/admin.ts` and `scripts/etl-scorecard.js`
- [ ] `ANTHROPIC_API_KEY` only appears in `app/api/ai-summary/route.ts`
- [ ] `NEXT_PUBLIC_*` variables contain only the anon key and public URL — nothing secret
- [ ] `.env.local` is in `.gitignore` and does not appear in GitHub
- [ ] Run: `git log --all --full-history -- .env.local` — output should be empty

## RLS verification

Run these in Supabase SQL Editor using the anon key (not service role). Go to Settings → API → use the anon key in these queries:

```sql
-- This should succeed (public read)
SELECT id, name FROM colleges LIMIT 5;

-- This should fail with RLS error
INSERT INTO colleges (unit_id, name) VALUES (999999, 'Test');

-- This should succeed (public insert allowed)
INSERT INTO comparisons (short_id, college_ids) VALUES ('testtest', ARRAY[1,2]);

-- This should succeed (public read)
SELECT * FROM comparisons WHERE short_id = 'testtest';
```

## Rate limiting verification

After Cloudflare Workers rate limit is deployed:

- Send 11 rapid requests to /api/ai-summary from the same IP
- The 11th request should return a 429 response
- Wait 60 seconds
- Send another request — it should succeed

## Server exposure check

```bash
# Run from your local machine
nmap -p 3000 YOUR_VPS_IP
```

Port 3000 should show as filtered or closed. If it shows as open, the firewall is not configured correctly.

```bash
# On the server, add a firewall rule
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw deny 3000/tcp
ufw enable
```

---

---

# TassleCost — Content Build Guide

## Role: Frank + Claude

All copy that appears on the site is defined here. Nothing is left to be decided during development.

---

## Homepage

**Headline:** Find out if your college is worth it.

**Subhead:** Compare real costs and salary outcomes for 7,000+ colleges before you sign anything.

**Search placeholder:** Search colleges, universities, and community colleges

**Example card label (above the 3 example cards):** See how it works

---

## Search

**No results message:** No colleges matched "[query]". Try a partial name, city name, or two-letter state abbreviation.

**Error message:** Search is unavailable right now. Try again in a moment.

**Loading state:** (no text — skeleton animation only)

---

## College detail page

**Net price label:** Net Price Per Year (after average aid)

**Graduation rate label:** Graduation Rate

**Retention rate label:** Students Who Return After Year 1

**Median salary 10yr label:** Median Salary, 10 Years Out

**Median monthly debt payment label:** Estimated Monthly Loan Payment (graduates)

**Null messages:**

| Situation | Message |
|-----------|---------|
| Salary suppressed | Salary data for this school is not published. The graduate group is too small to report without identifying individuals. |
| Salary not reported | This school has not reported salary outcomes to the Department of Education. |
| Net price missing | Net price data is not available for this school. Use the sticker price as your estimate. |
| Graduation rate missing | Graduation rate not reported. |
| Retention rate missing | Retention rate not reported. |
| Cost of attendance missing | Total cost data is not available. |

---

## ROI Calculator

**Section header:** Your ROI Calculator

**Input labels:**

| Input | Label |
|-------|-------|
| totalCost | Total degree cost ($) |
| expectedSalary | Expected salary after graduation ($/year) |
| currentSalary | Current salary without degree ($/year) |
| interestRate | Loan interest rate (%) |
| loanTerm | Loan repayment term |

**Output labels:**

| Output | Label |
|--------|-------|
| monthlyPayment | Monthly loan payment |
| totalPaid | Total paid over loan term |
| totalInterest | Total interest paid |
| breakEvenYear | Break-even year |
| twentyYearGain | 20-year net gain vs no degree |

**Zero-input message:** Enter a degree cost and expected salary to calculate your ROI.

**No break-even message:** At these salary figures, the degree does not produce a positive return within 30 years.

**Chart legend:** With degree / Without degree

---

## Comparison

**Add to compare button:** + Compare

**Already in comparison button:** Added

**Maximum reached message:** Remove a college first to add another. You can compare up to 3 at a time.

**Share button:** Share this comparison

**Copied confirmation:** Link copied

**Empty comparison:** Add colleges from the search results to start comparing.

---

## AI Summary

**Section header:** What this means for you

**Loading state:** (skeleton only, no text)

**Error state:** (hidden — show nothing if summary fails)

---

## Error pages

**404 page:**
Headline: That page does not exist.
Body: The college you are looking for may have closed or changed its name. Search for it above.

**500 page:**
Headline: Something went wrong.
Body: This is on us. Try refreshing the page. If it keeps happening, come back in a few minutes.

---

## Browser tab titles (title tag format)

| Page | Title |
|------|-------|
| Homepage | TassleCost — Is Your College Worth It? |
| College detail | [College Name] Cost and ROI | TassleCost |
| Comparison | Comparing [College 1] vs [College 2] | TassleCost |
| 404 | Page Not Found | TassleCost |
