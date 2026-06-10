# TassleCost — UI Designer Build Guide

## Role: Cursor + Claude

This document defines the complete visual system for TassleCost. Every color, size, spacing, and component decision is made here before Cursor builds anything. Cursor gets these decisions as constraints, not suggestions.

---

## Design philosophy

TassleCost handles the most consequential financial decision most families make. The visual language must communicate that it takes that seriously. That means no rounded pastel cards. No illustrations of graduates throwing caps. No motivational copy set in a gradient.

The site looks like a tool that was designed by someone who respects the user's intelligence and the weight of the decision they are making.

---

## Tailwind configuration

Add this to `tailwind.config.ts`. These are the only colors used on the site.

```typescript
import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          black: '#0A0A0A',
          white: '#FFFFFF',
          gray: {
            50:  '#F9F9F8',
            100: '#F0EFED',
            200: '#E1DFD9',
            300: '#C8C5BE',
            400: '#9A9690',
            500: '#6B6762',
            600: '#4A4743',
            700: '#302E2B',
            800: '#1C1B18',
          },
          blue: {
            50:  '#EFF6FF',
            100: '#DBEAFE',
            500: '#3B82F6',
            600: '#2563EB',
            700: '#1D4ED8',
          },
          green: {
            50:  '#F0FDF4',
            100: '#DCFCE7',
            600: '#16A34A',
            700: '#15803D',
          },
          red: {
            50:  '#FFF1F2',
            100: '#FFE4E6',
            600: '#DC2626',
          },
          amber: {
            50:  '#FFFBEB',
            100: '#FEF3C7',
            600: '#D97706',
          },
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Menlo', 'monospace'],
      },
      fontSize: {
        '2xs': ['11px', { lineHeight: '16px' }],
        xs:   ['12px', { lineHeight: '16px' }],
        sm:   ['14px', { lineHeight: '20px' }],
        base: ['16px', { lineHeight: '24px' }],
        lg:   ['18px', { lineHeight: '28px' }],
        xl:   ['20px', { lineHeight: '28px' }],
        '2xl':['24px', { lineHeight: '32px' }],
        '3xl':['28px', { lineHeight: '36px' }],
        '4xl':['36px', { lineHeight: '44px' }],
      },
      borderRadius: {
        sm: '4px',
        md: '6px',
        lg: '8px',
        xl: '12px',
      },
      boxShadow: {
        card: '0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.04)',
        'card-hover': '0 4px 12px rgba(0,0,0,0.10), 0 2px 4px rgba(0,0,0,0.06)',
      },
    },
  },
  plugins: [],
}

export default config
```

---

## Typography scale

| Use | Class | Size | Weight |
|-----|-------|------|--------|
| Page headline | text-4xl font-medium | 36px | 500 |
| Section header | text-2xl font-medium | 24px | 500 |
| College name on detail | text-3xl font-medium | 28px | 500 |
| College name on card | text-base font-medium | 16px | 500 |
| Metric value (large) | text-2xl font-medium | 24px | 500 |
| Body text | text-base font-normal | 16px | 400 |
| Secondary text | text-sm text-brand-gray-500 | 14px | 400 |
| Labels (caps) | text-xs uppercase tracking-wide text-brand-gray-400 | 12px | 400 |
| Tiny labels | text-2xs text-brand-gray-400 | 11px | 400 |

**One typeface. Inter. No exceptions.**

Load it in `app/layout.tsx`:
```typescript
import { Inter } from 'next/font/google'
const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })
```

---

## Color usage rules

Colors encode meaning. Do not use them decoratively.

| Color | Use |
|-------|-----|
| brand-black | All primary text, all headings |
| brand-gray-500 | Secondary text, labels, metadata |
| brand-gray-400 | Placeholder text, disabled states |
| brand-gray-200 | Borders |
| brand-gray-100 | Background surfaces, alternating rows |
| brand-gray-50 | Page background |
| brand-blue-600 | Primary action button, links, public institution badge |
| brand-blue-50 | Public institution badge background |
| brand-green-600 | Best value indicator in comparison, positive ROI |
| brand-green-50 | Best value background |
| brand-red-600 | Negative ROI, error states |
| brand-red-50 | Error background |
| brand-amber-600 | Warning states, suppressed data notice |
| brand-amber-50 | Warning background |

**Purple is not used. Orange is used only for for-profit institution badge. Do not introduce colors not in this list.**

---

## Component specifications

### Search input

```
Height: 48px (homepage), 40px (header)
Border: 1px solid brand-gray-200
Border-radius: lg (8px)
Background: white
Padding: 12px 16px
Font: 16px Inter
Placeholder color: brand-gray-400
Focus: border-color brand-blue-600, no box-shadow glow
Icon: magnifying glass icon, 18px, brand-gray-400, left side, 16px padding from left
On focus the icon turns brand-blue-600
```

### College card (search result)

```
Background: white
Border: 1px solid brand-gray-200
Border-radius: lg (8px)
Padding: 16px
Hover: border-color brand-gray-300, box-shadow card-hover
Transition: 150ms ease

Layout:
- Row 1: college name (text-base font-medium) | control type badge (right aligned)
- Row 2: city, state (text-sm text-brand-gray-500)
- Row 3: net price | separator | salary (both text-sm, values in font-medium)

Control type badge:
- Public: background brand-blue-50, text brand-blue-700, text-xs, padding 2px 8px, border-radius md
- Private: background brand-gray-100, text brand-gray-600, same sizing
- For-profit: background brand-amber-50, text brand-amber-600, same sizing
```

### Metric card (on detail page)

```
Background: brand-gray-50
Border: 1px solid brand-gray-100
Border-radius: lg (8px)
Padding: 16px

Layout:
- Label: text-xs uppercase tracking-wide text-brand-gray-400, margin-bottom 4px
- Value: text-2xl font-medium text-brand-black
- Null message: text-sm text-brand-gray-400 (italic) in place of value
```

### Primary button

```
Background: brand-black
Text: white, text-sm font-medium
Height: 40px
Padding: 10px 20px
Border-radius: md (6px)
Hover: background brand-gray-800
Active: scale(0.98)
Disabled: background brand-gray-200, text brand-gray-400, cursor not-allowed
```

### Secondary button

```
Background: white
Border: 1px solid brand-gray-200
Text: brand-black, text-sm font-medium
Height: 40px
Padding: 10px 20px
Border-radius: md (6px)
Hover: background brand-gray-50
```

### Text input (calculator)

```
Height: 40px
Border: 1px solid brand-gray-200
Border-radius: md (6px)
Padding: 8px 12px
Font: text-base
Focus: border brand-blue-600
Number inputs: text-right for amounts
```

### ROI output values

```
Monthly payment: text-3xl font-medium text-brand-black
Other outputs: text-2xl font-medium text-brand-black
Labels above values: text-xs uppercase tracking-wide text-brand-gray-400
Positive 20yr gain: text-brand-green-600
Negative 20yr gain: text-brand-red-600
```

### Chart (Recharts)

```
Colors:
  Degree path line: #2563EB (brand-blue-600), 2px stroke
  No-degree path line: #9A9690 (brand-gray-400), 2px stroke, dashed
  Break-even marker: vertical line, 1px, #9A9690, dashed

No grid lines.
No background.
X-axis: year numbers, text-xs, brand-gray-400
Y-axis: dollar values abbreviated (50k, 100k), text-xs, brand-gray-400
Tooltip: white background, 1px brand-gray-200 border, text-sm

Responsive container: width 100%, height 220px
```

### Comparison table

```
Border: 1px solid brand-gray-200 on the table
Row borders: 1px solid brand-gray-100 between rows
Header cells: brand-gray-50 background, text-sm font-medium
Metric label column: text-sm text-brand-gray-500, width 160px
Value cells: text-sm font-medium text-brand-black, text-center
Best value cell: background brand-green-50, text brand-green-700
Null value cell: text brand-gray-300, "—"
```

---

## Spacing system

Use only these spacing values. No arbitrary values.

| Spacing | Value | Use |
|---------|-------|-----|
| 4px | gap-1 p-1 | Tight internal spacing |
| 8px | gap-2 p-2 | Between related elements |
| 12px | gap-3 p-3 | Internal component padding |
| 16px | gap-4 p-4 | Default component padding |
| 24px | gap-6 p-6 | Section separation |
| 32px | gap-8 p-8 | Large section separation |
| 48px | gap-12 p-12 | Page section breaks |
| 64px | gap-16 p-16 | Major page divisions |

---

## Layout

**Max content width:** 1120px, centered, `max-w-5xl mx-auto px-4`

**Page padding:** 24px horizontal on mobile, 32px on tablet, 0 on desktop (max-width handles it)

**Column grid:** 12 columns. College detail page: content is 8 columns wide on desktop.

**Comparison grid:** Each college column is equal width. 3 columns = 33% each.

---

## Cursor prompt for UI setup

```
Set up the TassleCost visual system.

1. Replace the contents of tailwind.config.ts with the exact configuration from the UI build guide (the colors, fonts, sizes, shadows, and border-radius values defined there).

2. Update app/globals.css to:
   - Import Inter from Google Fonts at weights 400 and 500 only
   - Set the default body background to #F9F9F8 (brand-gray-50)
   - Set the default text color to #0A0A0A (brand-black)
   - Remove all default Tailwind component styles
   - Add one CSS rule: * { box-sizing: border-box; }
   - Remove the default Next.js sample styles

3. Create components/ui/Badge.tsx — a control type badge component:
   Props: control (1 | 2 | 3)
   Output: a span with the correct background, text color, text, border-radius, and padding per the component spec in the UI build guide.
   Control 1 = "Public", Control 2 = "Private", Control 3 = "For-Profit"

4. Create components/ui/MetricCard.tsx:
   Props: label (string), value (string | null), nullMessage (string)
   Output: a metric card per the spec. If value is null, render nullMessage in italic gray text.

5. Create components/ui/Button.tsx:
   Props: variant ("primary" | "secondary"), children, onClick, disabled
   Output: a button per the component spec.

After setup, run npm run dev and confirm the homepage loads with the correct background color and font.
```
