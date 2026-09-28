# NVIDIA CORS proxy (Cloudflare Worker)

GitHub Pages cannot host a backend. Deploy this Worker once so Flux + NIM chat work from the browser.

**Scheme:** `POST {WORKER_BASE}/nvidia?u=` + `encodeURIComponent(https://…nvidia…)`  
Allowlisted hosts only: `integrate.api.nvidia.com`, `ai.api.nvidia.com`.  
Your `Authorization: Bearer nvapi-…` header is forwarded; the key is never stored on the Worker.

## Deploy (Cloudflare)

1. Create a Worker in the [Cloudflare dashboard](https://dash.cloudflare.com/) (or use Wrangler).
2. Paste `nvidia-worker.js` as the module Worker script (or `wrangler deploy` from this folder with `main = "nvidia-worker.js"`).
3. Deploy → copy the URL, e.g. `https://lumora-nvidia.YOUR_SUBDOMAIN.workers.dev`
4. In Lumora → **Agent → Engines**, paste that base into **NVIDIA CORS proxy URL** (no trailing path needed).
5. Keep your NVIDIA key in Engines; Flux / NIM will route through the proxy.

### Wrangler one-liner (optional)

```bash
cd proxy && npx wrangler deploy nvidia-worker.js --name lumora-nvidia --compatibility-date 2024-09-01
```

Then paste `https://lumora-nvidia.<account>.workers.dev` into Engines.
