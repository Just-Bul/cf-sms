# cf-sms

Cloudflare Worker for Reportude (`reportude.in`).

- `npm install`, then `npm run dev` to run locally, `npm run deploy` to publish.
- Secrets are never committed: set them with `npx wrangler secret put NAME`.
- Connected to Cloudflare Workers Builds, so each push to `main` redeploys.
