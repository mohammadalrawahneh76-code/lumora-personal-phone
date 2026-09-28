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

**BluesMinds** is the only AI backend. Agent **Chat** and **Generate** images both use `api.bluesminds.com` with the same key (`aips_bluesminds_key`, paste under Agent → Chat). Chat default: `gemma-4-26b`. Image default: `gemini-2.5-flash-image` via `POST /v1/images/generations`. No Horde, Pollinations, or Flux.

## Project structure

```
index.html          # Views + workspace IA
style.css           # Dark Lumora styles (mobile-first)
js/
  app.js            # Chunked loader (app-body-1..4) — do not replace with a monolith
  config.js         # localStorage key map (aips_*)
  app-body-*.js     # App logic chunks
  starters/         # Lila Bloom starter
  data/             # Captions, presets, skills, wizard
proxy/
  nvidia-worker.js  # Cloudflare Worker (legacy NIM/Flux CORS proxy; optional)
  README.md         # Deploy notes
```

## Enable GitHub Pages (one-time)

1. Repo **Settings** → **Pages**
2. **Build and deployment** → **Source** → **GitHub Actions** (or deploy from `main` / root)
3. Save, wait ~1 minute, then open the URL above.

See `IMPROVEMENTS.md` for audit notes.
