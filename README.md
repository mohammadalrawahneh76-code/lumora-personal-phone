# Lumora Personal Phone

Mobile-first personal Lumora app (prompts, bible, tools). Offline SPA — data stays in `localStorage` (`aips_*` keys).

**Open on iPhone:** https://mohammadalrawahneh76-code.github.io/lumora-personal-phone/

## Local run

```bash
cd lumora-personal-phone
python3 -m http.server 8765 --bind 127.0.0.1
# open http://127.0.0.1:8765/
```

ES modules require HTTP (not `file://`).

## Project structure

```
index.html          # Views + workspace IA (Look / Create / Plan / Agent)
style.css           # All styles (GitHub Pages–friendly single sheet)
js/
  app.js            # App logic (routing, generate, agent, UI)
  config.js         # localStorage key map (aips_*)
  starters/
    lila-bloom.js   # Lila Bloom starter + prompt library
  data/
    captions.js     # Caption templates + daily checklist
    presets.js      # Scene presets, tiles, pills
    agent-skills.js # Built-in agent skills
    wizard.js       # Character wizard chips
```

## Enable GitHub Pages (one-time)

1. Repo **Settings** → **Pages**
2. Under **Build and deployment** → **Source**, choose **GitHub Actions**
   (or **Deploy from a branch** → `main` / `/ (root)`)
3. Save, wait ~1 minute, then open the URL above.

See `IMPROVEMENTS.md` for audit notes and remaining work.
