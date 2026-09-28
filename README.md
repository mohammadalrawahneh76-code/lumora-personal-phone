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
| **Agent** | Chat · Skills · Providers |

**Providers** holds Main image pick (Flux / Horde / Pollinations), Main chat engine (Lightning / Kimi / Ultra / Dolphin), API keys, NVIDIA CORS proxy, and engine status.

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
  nvidia-worker.js  # Cloudflare Worker CORS proxy for NVIDIA Flux/NIM
  README.md         # Deploy notes
```

## NVIDIA Flux / NIM

GitHub Pages cannot call NVIDIA directly (CORS). Deploy `proxy/nvidia-worker.js`, then paste the Worker URL into **Agent → Providers → NVIDIA CORS proxy URL**. Keys stay in the browser only — never commit them.

## Enable GitHub Pages (one-time)

1. Repo **Settings** → **Pages**
2. **Build and deployment** → **Source** → **GitHub Actions** (or deploy from `main` / root)
3. Save, wait ~1 minute, then open the URL above.

See `IMPROVEMENTS.md` for audit notes.
