# Launching without Cloudflare

The build guides assume Cloudflare sits in front of the VPS (DNS, TLS,
rate limiting, and Search Console verification all route through it). You
don't need it. This doc covers the two things Cloudflare would have done
that aren't already handled elsewhere:

1. **DNS** — pointing the domain at the VPS from the registrar instead.
2. **Search Console verification** — proving ownership without a
   Cloudflare-managed TXT record.

Everything else Cloudflare was slated for is already covered:

| Cloudflare was going to… | Handled instead by |
| ------------------------ | ------------------ |
| Terminate TLS            | Certbot / Let's Encrypt — [deploy.md](deploy.md) §3 |
| Rate-limit `/api/ai-summary` | In-app limiter, `lib/rate-limit.ts` (10 req/min/IP) |
| DDoS / WAF               | Nothing — see [What you give up](#what-you-give-up) |

So there is **no blocker** to launching without Cloudflare. Do the DNS
step below before the Certbot step in deploy.md (Certbot's HTTP-01
challenge needs the domain to already resolve to the VPS).

---

## 1. DNS at the registrar

Wherever `tasselcost.com` is registered (Namecheap, GoDaddy, Porkbun,
Hostinger's own domain panel, …), open its DNS / nameserver management
and create two **A records** pointing at the VPS's IPv4 address:

| Type | Host / Name | Value (points to) | TTL   |
| ---- | ----------- | ----------------- | ----- |
| A    | `@`         | `<VPS_IPv4>`      | 3600  |
| A    | `www`       | `<VPS_IPv4>`      | 3600  |

Notes:

- `@` is the apex (`tasselcost.com`); `www` covers `www.tasselcost.com`.
  Both hostnames are in the Nginx `server_name` and the Certbot command
  in deploy.md, so both must resolve.
- Some registrars label the apex host as blank or the full domain rather
  than `@` — same thing.
- A `CNAME www → tasselcost.com` also works if you prefer, but a second
  A record is simpler and avoids apex-CNAME quirks.
- If the registrar shows the domain using **its own nameservers**, add
  the records there. If it was previously pointed at Cloudflare's
  nameservers, switch it back to the registrar's default nameservers
  first, or the records you add at the registrar won't be authoritative.

### This project: `tasselcost.com` is registered at Hostinger

Hostinger is both the registrar and the DNS host, so everything happens
in hPanel — no third party. Path: **hPanel → Domains → `tasselcost.com`
→ DNS / Nameservers → DNS records**. (Panel labels may differ slightly
from these exact words; the structure is what to follow.)

The one gotcha: a freshly registered Hostinger domain ships with
**default parking records** — an `A` record on `@` pointing at a
Hostinger parking IP, plus a `www` record to the same. **Edit those
existing records; don't add new ones alongside them.** Two `A` records
on `@` (parking + your VPS) round-robin, so the site loads the parking
page roughly half the time.

1. **Check the nameservers first** (same screen, "Nameservers"
   section). For the hPanel DNS zone to be authoritative they must be
   Hostinger's defaults — `ns1.dns-parking.com` / `ns2.dns-parking.com`.
   If a website builder or another host changed them, switch them back
   or your record edits won't take effect.
2. **Get the VPS IPv4:** hPanel → **VPS** → your server → overview.
3. **Edit the existing `@` A record** → set its value to the VPS IPv4.
4. **Set `www`** → an `A` record to the same VPS IPv4, replacing any
   default `www` parking record.
5. Save. The Search Console `TXT` record in §2 goes in this same screen.

Confirm propagation before running Certbot:

```bash
dig +short tasselcost.com        # expect the VPS IPv4
dig +short www.tasselcost.com    # expect the VPS IPv4
```

Propagation is usually minutes but can take up to the old TTL. Once both
return the VPS IP, continue with [deploy.md](deploy.md) §2–§3 (Nginx +
Certbot) as written.

---

## 2. Google Search Console verification

The SEO guide verifies ownership via a Cloudflare-managed DNS TXT record.
Since you're now managing DNS at the registrar, add the TXT record there
instead — same mechanism, different panel. This is the recommended path
because it verifies the **entire domain** (all subdomains, both
`http`/`https`) in one shot.

1. In [Search Console](https://search.google.com/search-console), choose
   **Add property → Domain** and enter `tasselcost.com`.
2. Google shows a TXT record like
   `google-site-verification=AbC123…`. At the registrar, add:

   | Type | Host / Name | Value                              | TTL  |
   | ---- | ----------- | ---------------------------------- | ---- |
   | TXT  | `@`         | `google-site-verification=AbC123…` | 3600 |

3. Wait for it to propagate (`dig +short TXT tasselcost.com`), then click
   **Verify**.
4. Once verified, go to **Sitemaps** and submit `sitemap.xml`. The app
   already serves it at `https://tasselcost.com/sitemap.xml` (see
   `app/sitemap.ts`) and lists all ~6,300 college pages plus the
   `/colleges` directory.

### Alternative: HTML meta-tag verification (no DNS)

If you'd rather not touch DNS again, use a **URL-prefix** property
instead and verify with a meta tag. Next.js has first-class support —
add the token to the root metadata in `app/layout.tsx`:

```ts
export const metadata: Metadata = {
  // …existing fields…
  verification: { google: "PASTE_TOKEN_HERE" },
};
```

This renders `<meta name="google-site-verification" …>` into every page's
`<head>`. It's a one-line code change that ships on the next push to
`main`. Trade-off vs. the DNS method: a URL-prefix property only covers
the exact origin you verify (`https://tasselcost.com`), not `www` or
other subdomains, so the domain-property + TXT route is cleaner if you're
willing to add the record.

---

## What you give up

Launching without Cloudflare is fine for launch, but be aware of what
isn't there so you can add it later if traffic warrants:

- **CDN / edge caching** — every request hits the single VPS + Nginx.
  Fine at launch volume; the pages are dynamic anyway (`force-dynamic`).
- **DDoS protection and WAF** — none. The firewall (deploy.md §1) closes
  everything but 22/80/443, and the app-level limiter protects the one
  paid endpoint, but there's no upstream volumetric protection.
- **Origin IP hiding** — the VPS IP is public in DNS. Not a problem on
  its own, just a fact.

Adding Cloudflare later is non-destructive and doesn't require code
changes: point the domain's nameservers at Cloudflare, recreate the A
records there (proxied), and set SSL mode to **Full (strict)** so it
trusts the Let's Encrypt cert already on the origin. Do that only if you
actually need the CDN/WAF — it's not a launch requirement.
