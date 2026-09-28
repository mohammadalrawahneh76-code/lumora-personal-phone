# Lumora Personal Phone

Mobile-first personal Lumora app (prompts, bible, generate, agent). Offline SPA — data stays in `localStorage` (`aips_*` keys).

**Open on iPhone:** https://mohammadalrawahneh76-code.github.io/lumora-personal-phone/

## Local run

```bash
cd lumora-personal-phone
python3 -m http.server 8765 --bind 127.0.0.1
# open http://127.0.0.1:8765/
```

ES modules require HTTP (not `file://`).

## Workspace IA

| Hub | Tabs |
|-----|------|
| **Look** | Bible |
| **Create** | Generate · Scripts · Prompts |
| **Library** | Media · Calendar · Checklist |
| **Agent** | Chat · Skills |

**Chat** stays on **BluesMinds** (`api.bluesminds.com`, key `aips_bluesminds_key` under Agent → Chat; default `gemma-4-26b`). **Generate** images try BluesMinds first (`gpt-image-1` + auto-fallback model chain), then **Cloudflare Workers AI** (`lumora-ai` Worker, `@cf/black-forest-labs/flux-1-schnell`) if no image channel is enabled for the key’s group. Optional Worker URL: Agent → CF image Worker URL (`aips_cf_ai_worker`). No Horde/Pollinations/Flux/NVIDIA as primary.

## Project structure

```
index.html          # Views + workspace IA
style.css           # Dark Lumora styles (mobile-first)
js/
  app.js            # Chunked loader (app-body-1..4) — do not replace with a monolith
  config.js         # localStorage keys + public Sentry DSN (PostHog placeholder)
  sentry-init.js    # Sentry browser init (CDN; before app.js)
  app-body-*.js     # App logic chunks
  starters/         # Lila Bloom starter
  data/             # Captions, presets, skills, wizard
proxy/
  ai-worker.js      # Cloudflare Workers AI images (lumora-ai)
  nvidia-worker.js  # Cloudflare Worker (legacy NIM/Flux CORS proxy; optional)
  README.md         # Deploy notes
```

## Enable GitHub Pages (one-time)

1. Repo **Settings** → **Pages**
2. **Build and deployment** → **Source** → **GitHub Actions** (or deploy from `main` / root)
3. Save, wait ~1 minute, then open the URL above.

See `IMPROVEMENTS.md` for audit notes.

## Observability

- **Sentry** (client errors): project `lumora-personal-phone` in org `lumora-i0`. Public browser DSN in `js/config.js` / `js/sentry-init.js`. Captures unhandled errors plus generate / storyboard / agentic-edit / animate failures.
- **PostHog**: not wired — no PostHog MCP available. Add a public `phc_…` project key to `POSTHOG_KEY` in `js/config.js` and a CDN `posthog-js` snippet when ready (keep autocapture off).

