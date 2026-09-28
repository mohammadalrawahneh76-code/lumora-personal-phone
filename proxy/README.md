# Lumora Cloudflare Workers

GitHub Pages cannot host a backend. These Workers run image AI and (legacy) NVIDIA CORS proxying.

## lumora-ai — Workers AI images (active)

Text-to-image via Workers AI binding. **No CF API token in the SPA.**

- Model: `@cf/black-forest-labs/flux-1-schnell`
- `POST /generate` JSON `{ "prompt": "…", "steps": 4, "seed": 123 }`
- Response: `{ ok, dataUrl, model, seed, steps }`
- CORS: GitHub Pages origin + localhost

### Deploy

```bash
cd proxy
npx wrangler deploy -c wrangler-ai.jsonc
```

URL: `https://lumora-ai.<account>.workers.dev`  
Lumora defaults to `https://lumora-ai.mohammadalrawahneh76.workers.dev` (optional override under Agent → CF image Worker URL).

## lumora-nvidia — NVIDIA CORS proxy (legacy)

Scheme: `POST {WORKER_BASE}/nvidia?u=` + `encodeURIComponent(https://…nvidia…)`  
Allowlisted: `integrate.api.nvidia.com`, `ai.api.nvidia.com`.

```bash
cd proxy && npx wrangler deploy nvidia-worker.js --name lumora-nvidia --compatibility-date 2024-09-01
```

Not used as the primary Generate path (BluesMinds → Cloudflare Workers AI).
