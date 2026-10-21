# Electric Food Waste Disposers — Cloudflare Pages website

This is a static multilingual B2B website with a Cloudflare Pages Function for inquiry submissions and optional email notification through Resend. See **START-HERE-中文.md** for beginner-friendly deployment steps.

## Contents
- `/` language selection page
- `/en/`, `/zh-cn/`, `/zh-tw/`, `/ja/`, `/ko/`, `/es/`, `/pt/`, `/de/`, `/ru/`, `/ar/` independently addressable locale pages
- `robots.txt`, `sitemap.xml`, `llms.txt`, `GEO-SEO-CONTENT-PLAN.md`
- `functions/api/inquiry.js` Pages Function: validates and saves inquiries to D1, then sends a Resend notification if configured
- `schema.sql` D1 schema
- `scripts/set-site-origin.py` updates SEO URLs after deploying to `pages.dev` and again after attaching a custom domain

## Deploy without purchasing a domain
Connect this repository to Cloudflare Pages. Use production branch `main`, build command `exit 0`, and output directory `public`. Cloudflare will issue a `*.pages.dev` URL. Do not use the placeholder canonical origin as a final SEO setup; after deployment run `python scripts/set-site-origin.py https://your-project.pages.dev`, commit, and push the update.

## Inquiry backend
The form endpoint is `/api/inquiry`. It requires a D1 binding named `DB`. Create a D1 database and execute `schema.sql`, then set its actual ID in `wrangler.toml` and add the `DB` binding in Pages settings. Email notifications require these Pages variables/secrets:
- `INQUIRY_TO_EMAIL` — actual sales inbox supplied by the company
- `INQUIRY_FROM_EMAIL` — sender address on a domain verified by Resend
- `RESEND_API_KEY` — encrypted secret, never place in frontend code
- `SITE_ORIGIN` — exact deployed origin, e.g. `https://your-project.pages.dev`

The function saves the inquiry before attempting to send an email. If email notification fails, the inquiry remains stored in D1. No database or email provider is created by this source package. Until configured, submissions will not be stored or emailed.

## Business information and launch caveats
- Chinese company name supplied: 义乌市飞浦星日用品有限公司.
- “Electric Food Waste Disposers” is a normalized display name, not verified as a registered trademark.
- Official English legal name and recipient email are not yet confirmed.
- Product process supplied: heating/drying and volume reduction. Do not publish capacity, cycle time, energy use, noise, certifications, MOQ, lead time, or other technical claims without company confirmation.
- Product/factory visuals are placeholders and must be replaced with real approved photos.
- Add Turnstile or equivalent anti-spam verification, rate limiting, a privacy notice and a data-retention policy before public promotion.
- Translations need human review before commercial use.

## Official references
- Cloudflare static HTML deployment: https://developers.cloudflare.com/pages/framework-guides/deploy-anything/
- Cloudflare custom domains: https://developers.cloudflare.com/pages/configuration/custom-domains/
- Google localized versions: https://developers.google.com/search/docs/specialty/international/localized-versions
- Google SEO starter guide: https://developers.google.com/search/docs/fundamentals/seo-starter-guide
