# Launch checklist — Electric Food Waste Disposers

## Before purchasing the domain
- Check `electricfoodwaste.com` in [ICANN Lookup](https://lookup.icann.org/) and at the registrar checkout; availability can change and only the registrar can confirm registration at purchase time.
- Check exact/near-match trademarks in the countries where you will sell (for example, USPTO for the US and WIPO Global Brand Database). A domain being available does not establish trademark clearance.
- Confirm the brand's official spelling and the company's official English legal name. Do not publish a guessed legal name.

## Cloudflare Pages + D1
1. Put this folder in a Git repository.
2. In Cloudflare Dashboard → Workers & Pages, create a Pages project connected to the repository. For this plain HTML project use no build command and output directory `public`. Deploying through Git or Wrangler is required for the `functions/` API; dashboard drag-and-drop does not deploy Functions.
3. Create a D1 database, run `schema.sql`, copy its database ID into `wrangler.toml`, and bind it as `DB` in Pages settings. Redeploy after changing bindings.
4. Add the following production variables/secrets under Pages → Settings → Variables and Secrets:
   - `INQUIRY_TO_EMAIL` (plain variable): the real sales inbox provided by the company.
   - `INQUIRY_FROM_EMAIL` (plain variable): sender address on a domain verified by Resend.
   - `RESEND_API_KEY` (encrypted secret): API key from Resend.
   - `SITE_ORIGIN` (plain variable): exact canonical origin, e.g. `https://electricfoodwaste.com` once purchased and configured.
5. In Resend, verify the sending domain and configure the DNS records it provides. Do not use an unverified sender address in production.
6. Replace every `YOUR-DOMAIN.example` placeholder in HTML, `robots.txt`, `sitemap.xml`, `llms.txt`, and documentation with the final domain, then redeploy.
7. In Pages → Custom domains, add the apex domain and follow the displayed nameserver/DNS instructions. Wait for active status and TLS certificate issuance before launch.
8. Submit a real test inquiry. Confirm it appears in D1 and the notification reaches the sales inbox; also test a provider failure and check Pages function logs.
9. Add Cloudflare Turnstile and robust rate limiting before public promotion. The current hidden honeypot is not sufficient against determined spam.
10. Publish a privacy notice, confirm lawful handling and retention of B2B contact details, and check all 10 locale pages, mobile layout, language links, sitemap, robots, canonical and hreflang.

## Current known gaps
- Domain purchase, Cloudflare account/project, D1 database, email-provider account/domain verification, email recipient and production deployment have NOT been completed by this package.
- No email can be delivered until the secrets/variables and verified sender domain are configured.
- `INQUIRY_TO_EMAIL` must be provided by the site owner; never guess it.
- This is a multilingual starter site, not a fully translated/certified product catalogue. Replace illustrative graphics with real photos and review each translation and every technical/compliance claim before launch.
