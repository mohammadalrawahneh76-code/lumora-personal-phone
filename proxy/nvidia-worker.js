/**
 * Lumora Personal — NVIDIA CORS proxy (Cloudflare Worker, module format)
 *
 * Scheme (one clear path):
 *   POST {WORKER_BASE}/nvidia?u=<encodeURIComponent(absolute https URL)>
 *   OPTIONS same URL for CORS preflight
 *
 * Allowlisted upstream hosts only:
 *   integrate.api.nvidia.com
 *   ai.api.nvidia.com
 *
 * Authorization and Content-Type are forwarded from the client.
 * The API key is never stored on the worker.
 *
 * Deploy: see proxy/README.md
 */

const ALLOWED_HOSTS = new Set([
  "integrate.api.nvidia.com",
  "ai.api.nvidia.com",
]);

const PAGES_ORIGIN = "https://mohammadalrawahneh76-code.github.io";

function corsOrigin(request) {
  const origin = request.headers.get("Origin");
  if (!origin || origin === "null") return "null";
  if (origin === PAGES_ORIGIN) return origin;
  // Same user Pages host (any path is not in Origin; host match is enough)
  try {
    const o = new URL(origin);
    if (o.protocol === "https:" && o.hostname === "mohammadalrawahneh76-code.github.io") {
      return origin;
    }
    // Local dev
    if (
      (o.hostname === "127.0.0.1" || o.hostname === "localhost") &&
      (o.protocol === "http:" || o.protocol === "https:")
    ) {
      return origin;
    }
  } catch (_) {}
  return null;
}

function corsHeaders(request) {
  const allow = corsOrigin(request);
  if (!allow) return null;
  return {
    "Access-Control-Allow-Origin": allow,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Authorization, Content-Type, Accept",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}

function jsonResponse(status, body, extraHeaders) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...(extraHeaders || {}),
    },
  });
}

function parseTarget(request, url) {
  // Preferred: /nvidia?u=<absolute https URL>
  const uParam = url.searchParams.get("u");
  if (uParam) {
    try {
      return new URL(uParam);
    } catch (_) {
      return null;
    }
  }
  // Convenience aliases (same allowlist + forward behavior)
  // POST /nvidia/chat → chat completions
  // POST /nvidia/flux?model=schnell|kontext → Flux endpoints
  const path = url.pathname.replace(/\/+$/, "") || "/";
  if (path.endsWith("/nvidia/chat") || path === "/nvidia/chat") {
    return new URL("https://integrate.api.nvidia.com/v1/chat/completions");
  }
  if (path.endsWith("/nvidia/flux") || path === "/nvidia/flux") {
    const model = (url.searchParams.get("model") || "schnell").toLowerCase();
    if (model === "kontext") {
      return new URL(
        "https://ai.api.nvidia.com/v1/genai/black-forest-labs/flux.1-kontext-dev"
      );
    }
    return new URL(
      "https://ai.api.nvidia.com/v1/genai/black-forest-labs/flux.1-schnell"
    );
  }
  return null;
}

export default {
  async fetch(request) {
    const url = new URL(request.url);
    const cors = corsHeaders(request);

    if (request.method === "OPTIONS") {
      if (!cors) {
        return new Response("Origin not allowed", { status: 403 });
      }
      return new Response(null, { status: 204, headers: cors });
    }

    if (!cors) {
      return jsonResponse(403, { error: "Origin not allowed" });
    }

    if (request.method === "GET" && (url.pathname === "/" || url.pathname === "")) {
      return jsonResponse(
        200,
        {
          ok: true,
          service: "lumora-nvidia-cors-proxy",
          scheme: "POST /nvidia?u=<encodeURIComponent(https URL to allowlisted NVIDIA host)>",
          aliases: ["POST /nvidia/chat", "POST /nvidia/flux?model=schnell|kontext"],
        },
        cors
      );
    }

    if (request.method !== "POST" && request.method !== "GET") {
      return jsonResponse(405, { error: "Method not allowed" }, cors);
    }

    // Only proxy under /nvidia*
    const path = url.pathname.replace(/\/+$/, "") || "/";
    if (!path.includes("/nvidia")) {
      return jsonResponse(
        404,
        { error: "Use POST /nvidia?u=<url> (see proxy/README.md)" },
        cors
      );
    }

    const target = parseTarget(request, url);
    if (!target || target.protocol !== "https:") {
      return jsonResponse(
        400,
        { error: "Missing or invalid u= target (must be absolute https URL)" },
        cors
      );
    }
    if (!ALLOWED_HOSTS.has(target.hostname)) {
      return jsonResponse(
        403,
        { error: "Host not allowlisted: " + target.hostname },
        cors
      );
    }

    const headers = new Headers();
    const auth = request.headers.get("Authorization");
    if (auth) headers.set("Authorization", auth);
    const ct = request.headers.get("Content-Type");
    if (ct) headers.set("Content-Type", ct);
    else if (request.method === "POST") headers.set("Content-Type", "application/json");
    const accept = request.headers.get("Accept");
    headers.set("Accept", accept || "application/json");

    let body = null;
    if (request.method === "POST") {
      body = await request.arrayBuffer();
    }

    let upstream;
    try {
      upstream = await fetch(target.toString(), {
        method: request.method,
        headers,
        body,
      });
    } catch (err) {
      return jsonResponse(
        502,
        { error: "Upstream fetch failed", detail: String(err && err.message) },
        cors
      );
    }

    const outHeaders = new Headers(cors);
    const upCt = upstream.headers.get("Content-Type");
    if (upCt) outHeaders.set("Content-Type", upCt);
    return new Response(upstream.body, {
      status: upstream.status,
      statusText: upstream.statusText,
      headers: outHeaders,
    });
  },
};
