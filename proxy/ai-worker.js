/**
 * Lumora Personal — Cloudflare Workers AI image generation
 *
 * POST /generate  { prompt, steps?, seed? }
 * OPTIONS /generate  CORS preflight
 * GET /  health
 *
 * Uses Workers AI binding (no CF API token in the SPA).
 * Model: @cf/black-forest-labs/flux-1-schnell
 */

const MODEL = "@cf/black-forest-labs/flux-1-schnell";
const PAGES_ORIGIN = "https://mohammadalrawahneh76-code.github.io";

function corsOrigin(request) {
  const origin = request.headers.get("Origin");
  if (!origin || origin === "null") return "null";
  if (origin === PAGES_ORIGIN) return origin;
  try {
    const o = new URL(origin);
    if (
      o.protocol === "https:" &&
      o.hostname === "mohammadalrawahneh76-code.github.io"
    ) {
      return origin;
    }
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
    "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Accept",
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

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const cors = corsHeaders(request);

    if (request.method === "OPTIONS") {
      if (!cors) return new Response("Origin not allowed", { status: 403 });
      return new Response(null, { status: 204, headers: cors });
    }

    // Health (GET /) — CORS optional so curl works
    if (
      request.method === "GET" &&
      (url.pathname === "/" || url.pathname === "")
    ) {
      return jsonResponse(
        200,
        {
          ok: true,
          service: "lumora-ai-image",
          model: MODEL,
          scheme: "POST /generate { prompt, steps? }",
        },
        cors || {}
      );
    }

    if (!cors) {
      return jsonResponse(403, { ok: false, error: "Origin not allowed" });
    }

    const path = url.pathname.replace(/\/+$/, "") || "/";
    if (request.method !== "POST" || (path !== "/generate" && path !== "/")) {
      return jsonResponse(
        404,
        { ok: false, error: "Use POST /generate with JSON { prompt }" },
        cors
      );
    }

    if (!env || !env.AI) {
      return jsonResponse(
        500,
        { ok: false, error: "Workers AI binding missing (env.AI)" },
        cors
      );
    }

    let body;
    try {
      body = await request.json();
    } catch (_) {
      return jsonResponse(
        400,
        { ok: false, error: "Invalid JSON body" },
        cors
      );
    }

    const prompt = String((body && body.prompt) || "").trim();
    if (!prompt) {
      return jsonResponse(400, { ok: false, error: "prompt is required" }, cors);
    }
    if (prompt.length > 2048) {
      return jsonResponse(
        400,
        { ok: false, error: "prompt too long (max 2048)" },
        cors
      );
    }

    let steps = Number(body && body.steps);
    if (!Number.isFinite(steps) || steps < 1) steps = 4;
    steps = Math.min(8, Math.max(1, Math.floor(steps)));

    // flux-1-schnell schema: prompt + optional steps only (seed rejected as unevaluated)
    let result;
    try {
      result = await env.AI.run(MODEL, {
        prompt,
        steps,
      });
    } catch (err) {
      return jsonResponse(
        502,
        {
          ok: false,
          error: "Workers AI run failed",
          detail: String((err && err.message) || err || ""),
        },
        cors
      );
    }

    const b64 =
      (result && (result.image || result.b64_json || result.base64)) || "";
    if (!b64 || typeof b64 !== "string") {
      return jsonResponse(
        502,
        { ok: false, error: "Workers AI returned no image" },
        cors
      );
    }

    const dataUrl = "data:image/jpeg;base64," + String(b64).trim();
    return jsonResponse(
      200,
      {
        ok: true,
        dataUrl,
        model: MODEL,
        steps,
      },
      cors
    );
  },
};
