// ——— Agent (Studio / Lila) ———
const AGENT_CHAT_CAP = 40;
const POLLINATIONS_CHAT = "https://text.pollinations.ai/openai";
const POLLINATIONS_GET = "https://text.pollinations.ai/";
const POLLINATIONS_GEN_CHAT = "https://gen.pollinations.ai/v1/chat/completions";
const AGENT_SKILLS_MAX = 2500;
const AGENT_SYSTEM_MAX = 3500;
const AGENT_HISTORY_TURNS = 8;

// Agent skill catalogs imported from ./data/agent-skills.js

function getAgentMode() {
  const m = load(KEYS.agentMode, "studio");
  return m === "lila" ? "lila" : "studio";
}
function setAgentMode(mode) {
  const m = mode === "lila" ? "lila" : "studio";
  save(KEYS.agentMode, m);
  return m;
}
function agentChatKey(mode) {
  return mode === "lila" ? KEYS.agentChatLila : KEYS.agentChatStudio;
}
function getAgentChat(mode) {
  const list = load(agentChatKey(mode), []);
  return Array.isArray(list) ? list : [];
}
function setAgentChat(mode, messages) {
  const capped = (messages || []).slice(-AGENT_CHAT_CAP);
  save(agentChatKey(mode), capped);
  return capped;
}
function clearAgentChat(mode) {
  save(agentChatKey(mode), []);
}

function normalizeSkill(s) {
  if (!s || typeof s !== "object") return null;
  let modes = Array.isArray(s.modes) ? s.modes.map(String) : ["both"];
  if (!modes.length) modes = ["both"];
  return {
    id: String(s.id || uid("skill")),
    name: String(s.name || "Untitled").slice(0, 80),
    description: String(s.description || "").slice(0, 200),
    body: String(s.body || ""),
    enabled: s.enabled !== false,
    modes: modes,
  };
}

function getAgentSkills() {
  const raw = load(KEYS.agentSkills, null);
  if (!Array.isArray(raw) || !raw.length) return null;
  return raw.map(normalizeSkill).filter(Boolean);
}
function setAgentSkills(list) {
  save(KEYS.agentSkills, (list || []).map(normalizeSkill).filter(Boolean));
}
function ensureAgentSkills() {
  let list = getAgentSkills();
  if (!list) {
    list = STARTER_AGENT_SKILLS.map((s) => ({ ...s }));
    setAgentSkills(list);
    list = getAgentSkills();
  }
  // Merge taught skill packs if missing by id (never wipe user skills)
  const have = new Set((list || []).map((s) => s.id));
  const extras = [
    ...APOB_AGENT_SKILLS,
    ...GROK_NSFW_AGENT_SKILLS,
    ...AGENT_ENGINES_SKILLS,
    ...STEAL_LIST_AGENT_SKILLS,
  ].filter((s) => !have.has(s.id));
  if (extras.length) {
    setAgentSkills([...(list || []), ...extras.map((s) => ({ ...s }))]);
    list = getAgentSkills();
  }
  // One-shot: refresh Horde-first Soft routing copy on known system skills
  if (!load(KEYS.hordeSoftSkillsV1, false)) {
    const canon = {};
    [...STARTER_AGENT_SKILLS, ...APOB_AGENT_SKILLS, ...GROK_NSFW_AGENT_SKILLS, ...AGENT_ENGINES_SKILLS].forEach(
      (s) => {
        if (s && s.id) canon[s.id] = s;
      }
    );
    const refreshIds = [
      "studio-image-quality",
      "free-vs-paid-routing",
      "lingerie-tease",
      "agent-engines",
    ];
    let changed = false;
    list = (list || []).map((s) => {
      if (refreshIds.indexOf(s.id) >= 0 && canon[s.id]) {
        changed = true;
        return {
          ...s,
          name: canon[s.id].name,
          description: canon[s.id].description,
          body: canon[s.id].body,
        };
      }
      return s;
    });
    if (changed) setAgentSkills(list);
    save(KEYS.hordeSoftSkillsV1, true);
  }
  // One-shot: Groq Agent chat + retire paid Grok Imagine skill bodies
  if (!load(KEYS.groqSkillsV1, false)) {
    const canon2 = {};
    [...STARTER_AGENT_SKILLS, ...APOB_AGENT_SKILLS, ...GROK_NSFW_AGENT_SKILLS, ...AGENT_ENGINES_SKILLS].forEach(
      (s) => {
        if (s && s.id) canon2[s.id] = s;
      }
    );
    const refreshIds2 = [
      "studio-image-quality",
      "apob-ugc-photoreal",
      "free-vs-paid-routing",
      "horde-nsfw-ops",
      "groq-agent-chat",
      "pro-prompt-style",
      "agent-engines",
    ];
    // Drop legacy paid Grok Imagine skills by id; replace with new free ones if missing
    let list2 = (list || []).filter(
      (s) => s.id !== "grok-imagine-workflow" && s.id !== "grok-prompt-style"
    );
    const have2 = new Set(list2.map((s) => s.id));
    ["groq-agent-chat", "pro-prompt-style"].forEach((id) => {
      if (!have2.has(id) && canon2[id]) list2.push({ ...canon2[id] });
    });
    let changed2 = false;
    list2 = list2.map((s) => {
      if (refreshIds2.indexOf(s.id) >= 0 && canon2[s.id]) {
        changed2 = true;
        return {
          ...s,
          name: canon2[s.id].name,
          description: canon2[s.id].description,
          body: canon2[s.id].body,
        };
      }
      return s;
    });
    setAgentSkills(list2);
    list = list2;
    save(KEYS.groqSkillsV1, true);
  }
  // One-shot: merge Steal List W1–2 skills if missing
  if (!load(KEYS.stealListSkillsV1, false)) {
    const have3 = new Set((list || []).map((s) => s.id));
    const add = STEAL_LIST_AGENT_SKILLS.filter((s) => !have3.has(s.id));
    if (add.length) {
      setAgentSkills([...(list || []), ...add.map((s) => ({ ...s }))]);
      list = getAgentSkills();
    }
    save(KEYS.stealListSkillsV1, true);
  }
  // One-shot: merge Steal List W3–4 skills if missing
  if (!load(KEYS.stealListSkillsV2, false)) {
    const have4 = new Set((list || []).map((s) => s.id));
    const want = ["agentic-edit", "animate-last-still", "character-wizard", "hero-face-pack"];
    const add4 = STEAL_LIST_AGENT_SKILLS.filter(
      (s) => want.indexOf(s.id) >= 0 && !have4.has(s.id)
    );
    if (add4.length) {
      setAgentSkills([...(list || []), ...add4.map((s) => ({ ...s }))]);
      list = getAgentSkills();
    }
    save(KEYS.stealListSkillsV2, true);
  }
  // One-shot: merge Steal List W5–6 skills if missing
  if (!load(KEYS.stealListSkillsV3, false)) {
    const have5 = new Set((list || []).map((s) => s.id));
    const want5 = ["dress-ref", "duo-cast", "director-pills", "movie-pack", "queue-meter"];
    const add5 = STEAL_LIST_AGENT_SKILLS.filter(
      (s) => want5.indexOf(s.id) >= 0 && !have5.has(s.id)
    );
    if (add5.length) {
      setAgentSkills([...(list || []), ...add5.map((s) => ({ ...s }))]);
      list = getAgentSkills();
    }
    save(KEYS.stealListSkillsV3, true);
  }
}
function skillApplies(skill, mode) {
  if (!skill || skill.enabled === false) return false;
  const modes = skill.modes || [];
  return modes.includes("both") || modes.includes(mode);
}
function enabledSkillsForMode(mode) {
  ensureAgentSkills();
  return (getAgentSkills() || []).filter((s) => skillApplies(s, mode));
}

function buildSkillsBlock(mode) {
  const skills = enabledSkillsForMode(mode);
  if (!skills.length) return "";
  const header = "Taught skills (follow these):\n";
  let out = header;
  for (let i = 0; i < skills.length; i++) {
    const s = skills[i];
    const line =
      (i + 1) + ". " + s.name + ": " + (s.body || s.description || "");
    const next = out + (out === header ? "" : "\n") + line;
    if (next.length > AGENT_SKILLS_MAX) {
      const room = AGENT_SKILLS_MAX - out.length - (out === header ? 0 : 1);
      if (room > 48) {
        out += (out === header ? "" : "\n") + line.slice(0, room - 1) + "…";
      }
      break;
    }
    out = next;
  }
  return out.slice(0, AGENT_SKILLS_MAX);
}

function buildStudioSystem(c) {
  const name = (c && c.name) || "the character";
  return (
    "You are Lumora Personal's studio co-pilot on a phone web app. " +
    "Help with character bible, prompt craft, Soft/Suggestive/NSFW scene generation, " +
    "AI Horde vs Pollinations (both free for images), captions, and calendar ideas. " +
    "Agent chat uses BluesMinds. Image generation uses free Horde/Pollinations; video is an honest free stub. " +
    "Never invent paid steps. Never suggest paid xAI Grok Imagine. " +
    "Be concise for mobile. Current character: " +
    name +
    ". Adult fictional 21+ only."
  );
}

function buildLilaSystem(c) {
  const char = c || {};
  const name = char.name || "Lila Bloom";
  const age = char.age || 22;
  const personality = (char.personality || "").slice(0, 500);
  const speaking = (char.speakingStyle || "").slice(0, 400);
  let master = String(char.masterAppearance || "").trim();
  if (master.length > 500) master = master.slice(0, 500) + "…";
  return (
    "You are roleplaying as " +
    name +
    ", a fictional adult (age " +
    age +
    "). Stay fully in character. " +
    "Personality: " +
    personality +
    " Speaking style: " +
    speaking +
    " Appearance snippet: " +
    master +
    " Soft, shy, sweet, flirty never crude. Consensual soft NSFW OK when asked. Adult 21+ only; refuse minors."
  );
}

function buildAgentMessages(mode, userText, c) {
  let system =
    (mode === "lila" ? buildLilaSystem(c) : buildStudioSystem(c)) +
    "\n\n" +
    buildSkillsBlock(mode);
  if (system.length > AGENT_SYSTEM_MAX) {
    system = system.slice(0, AGENT_SYSTEM_MAX - 1) + "…";
  }
  const history = getAgentChat(mode)
    .filter((m) => m && (m.role === "user" || m.role === "assistant") && m.content)
    .slice(-AGENT_HISTORY_TURNS)
    .map((m) => ({
      role: m.role,
      content: String(m.content).slice(0, 1200),
    }));
  return [
    { role: "system", content: system },
    ...history,
    { role: "user", content: String(userText || "").slice(0, 1500) },
  ];
}

function friendlyTextApiError(err, label) {
  const raw = (err && err.message) || String(err || "");
  if (/Failed to fetch|NetworkError|Load failed|CORS|network/i.test(raw)) {
    return (label || "Text API") + " unreachable (network or CORS). Try again in a moment.";
  }
  if (/^Pollinations (POST|GET) \d+/.test(raw) || /HTTP \d+/.test(raw)) {
    return raw;
  }
  return raw || ((label || "Text API") + " failed");
}

function extractChatContent(data) {
  const msg =
    data && data.choices && data.choices[0] && data.choices[0].message;
  const content = (msg && msg.content) || "";
  const reasoning = (msg && (msg.reasoning_content || msg.reasoning)) || "";
  return content || reasoning || (data && data.response) || (data && data.text) || "";
}

function groqErrorMessage(status, json) {
  const err = json && json.error;
  const msg =
    (err && (typeof err === "string" ? err : err.message || err.code)) ||
    (json && (json.message || json.detail)) ||
    "";
  const text = typeof msg === "string" ? msg : JSON.stringify(msg || "");
  if (status === 401 || status === 403) {
    return "Invalid Groq API key — get a free key at console.groq.com/keys.";
  }
  if (status === 429) {
    return "Groq rate limit — wait a moment, or Agent will try Pollinations fallback.";
  }
  if (status === 404 || /model|not found|deprecat/i.test(text)) {
    return "Groq model unavailable — trying next free model…";
  }
  if (status >= 500) {
    return "Groq is temporarily unavailable (" + status + ").";
  }
  return text || ("Groq error (" + status + ")");
}

function normalizeChatMessages(messages) {
  return (messages || []).map((m) => {
    const role = m.role || "user";
    let content = m.content;
    if (!Array.isArray(content)) content = String(content || "");
    return { role, content };
  });
}

async function callOpenRouterChat(messages) {
  const key = typeof getOpenRouterKey === "function" ? getOpenRouterKey() : "";
  if (!key) {
    throw new Error(
      "OpenRouter key not set — trying next chat backend."
    );
  }
  const meta = typeof getNvidiaModelMeta === "function" ? getNvidiaModelMeta() : null;
  const modelId =
    (meta && meta.provider === "openrouter" && meta.model) ||
    "cognitivecomputations/dolphin-mistral-24b-venice-edition";
  const api =
    typeof OPENROUTER_API !== "undefined"
      ? OPENROUTER_API
      : "https://openrouter.ai/api/v1/chat/completions";
  const payload = {
    model: modelId,
    messages: normalizeChatMessages(messages),
    max_tokens: 2048,
    temperature: 0.85,
    stream: false,
  };
  let res;
  try {
    res = await fetch(api, {
      method: "POST",
      mode: "cors",
      credentials: "omit",
      headers: {
        Authorization: "Bearer " + key,
        "Content-Type": "application/json",
        Accept: "application/json",
        "HTTP-Referer":
          typeof OPENROUTER_APP_URL !== "undefined"
            ? OPENROUTER_APP_URL
            : "https://mohammadalrawahneh76-code.github.io/lumora-personal-phone/",
        "X-Title":
          typeof OPENROUTER_APP_TITLE !== "undefined"
            ? OPENROUTER_APP_TITLE
            : "Lumora Personal",
      },
      body: JSON.stringify(payload),
    });
  } catch (err) {
    throw new Error(
      friendlyTextApiError(err, "Dolphin / OpenRouter") ||
        "Could not reach OpenRouter (CORS or network)."
    );
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg =
      (data && (data.message || data.detail || data.title || data.error)) || "";
    const textMsg = typeof msg === "string" ? msg : JSON.stringify(msg);
    if (res.status === 401 || res.status === 403) {
      throw new Error("Invalid OpenRouter key — trying next chat backend.");
    }
    if (res.status === 429) {
      throw new Error("OpenRouter rate limit — wait a moment and try again.");
    }
    throw new Error(textMsg || "OpenRouter / Dolphin error (" + res.status + ")");
  }
  const textOut = extractChatContent(data);
  if (!String(textOut).trim()) throw new Error("Empty Dolphin reply");
  return String(textOut).trim();
}

async function callNvidiaChat(messages) {
  const meta = typeof getNvidiaModelMeta === "function" ? getNvidiaModelMeta() : null;
  if (meta && meta.provider === "openrouter") {
    return await callOpenRouterChat(messages);
  }
  const key = getNvidiaKey();
  if (!key) {
    throw new Error("NVIDIA NIM key not set — trying next chat backend.");
  }
  const modelId = (meta && meta.model) || "moonshotai/kimi-k3";
  const pickId = (meta && meta.id) || "kimi";
  const normalized = normalizeChatMessages(messages);
  const payload = {
    model: modelId,
    messages: normalized,
    max_tokens: pickId === "ultra" ? 4096 : 2048,
    temperature: 0.7,
    stream: false,
  };
  if (pickId === "kimi") {
    payload.reasoning_effort = "low";
  } else {
    payload.chat_template_kwargs = { enable_thinking: pickId === "ultra" };
  }
  let res;
  try {
    const fetchFn = typeof nvidiaFetch === "function" ? nvidiaFetch : fetch;
    res = await fetchFn(NVIDIA_API, {
      method: "POST",
      mode: "cors",
      credentials: "omit",
      headers: {
        Authorization: "Bearer " + key,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(payload),
    });
  } catch (err) {
    const hasProxy = typeof getNvidiaProxyBase === "function" && !!getNvidiaProxyBase();
    throw new Error(
      friendlyTextApiError(err, "NVIDIA NIM") ||
        (hasProxy
          ? "Could not reach NVIDIA NIM via proxy — Agent will try Groq/Pollinations."
          : "Could not reach NVIDIA NIM (CORS) — Agent will try next chat backend.")
    );
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg =
      (data && (data.message || data.detail || data.title || data.error)) || "";
    const textMsg = typeof msg === "string" ? msg : JSON.stringify(msg);
    if (res.status === 401 || res.status === 403) {
      throw new Error("Invalid NVIDIA NIM key — trying next chat backend.");
    }
    if (res.status === 429) {
      throw new Error("NVIDIA NIM rate limit — wait a moment and try again.");
    }
    throw new Error(textMsg || "NVIDIA NIM error (" + res.status + ")");
  }
  const textOut = extractChatContent(data);
  if (!String(textOut).trim()) throw new Error("Empty NVIDIA NIM reply");
  return String(textOut).trim();
}

async function tryNvidiaChat(messages) {
  const meta = typeof getNvidiaModelMeta === "function" ? getNvidiaModelMeta() : null;
  if (meta && meta.provider === "openrouter") {
    const fk = typeof getOpenRouterKey === "function" ? getOpenRouterKey() : "";
    if (!fk) return null;
    return await callOpenRouterChat(messages);
  }
  const key = getNvidiaKey();
  if (!key) return null;
  return await callNvidiaChat(messages);
}

async function callGroqChat(messages, model) {
  const key = getGroqKey();
  if (!key) {
    throw new Error(
      "Groq key not set — chat will try Pollinations fallback."
    );
  }
  const useModel = model || GROQ_MODELS[0];
  let res;
  try {
    res = await fetch(GROQ_API, {
      method: "POST",
      mode: "cors",
      credentials: "omit",
      headers: {
        Authorization: "Bearer " + key,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: useModel,
        messages: messages,
        temperature: 0.7,
      }),
    });
  } catch (err) {
    throw new Error(
      friendlyTextApiError(err, "Groq") ||
        "Could not reach Groq (CORS or network) — Agent will try Pollinations fallback."
    );
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(groqErrorMessage(res.status, data));
  }
  const text = extractChatContent(data);
  if (!String(text).trim()) throw new Error("Empty Groq reply (" + useModel + ")");
  return String(text).trim();
}

async function tryGroqChat(messages) {
  const key = getGroqKey();
  if (!key) return null;
  const errors = [];
  for (let i = 0; i < GROQ_MODELS.length; i++) {
    try {
      return await callGroqChat(messages, GROQ_MODELS[i]);
    } catch (err) {
      errors.push(err);
      const msg = String((err && err.message) || "");
      // Auth / missing key: don't burn through models
      if (/Invalid Groq|Add a free Groq|401|403/i.test(msg) && !/model/i.test(msg)) {
        throw err;
      }
    }
  }
  throw errors[errors.length - 1] || new Error("Groq failed");
}

async function callPollinationsChat(messages, model) {
  const useModel = model || "openai";
  let res;
  try {
    res = await fetch(POLLINATIONS_CHAT, {
      method: "POST",
      mode: "cors",
      credentials: "omit",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: useModel,
        messages: messages,
        private: true,
      }),
    });
  } catch (err) {
    throw new Error(friendlyTextApiError(err, "Pollinations chat"));
  }
  if (!res.ok) {
    throw new Error("Pollinations POST " + res.status + " (" + useModel + ")");
  }
  const data = await res.json().catch(() => ({}));
  const text = extractChatContent(data);
  if (!String(text).trim()) throw new Error("Empty reply (" + useModel + ")");
  return String(text).trim();
}

async function callGenPollinationsChat(messages) {
  let res;
  try {
    res = await fetch(POLLINATIONS_GEN_CHAT, {
      method: "POST",
      mode: "cors",
      credentials: "omit",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "openai",
        messages: messages,
      }),
    });
  } catch (err) {
    throw new Error(friendlyTextApiError(err, "gen.pollinations.ai"));
  }
  if (!res.ok) {
    throw new Error("gen.pollinations.ai POST " + res.status);
  }
  const data = await res.json().catch(() => ({}));
  const text = extractChatContent(data);
  if (!String(text).trim()) throw new Error("Empty reply (gen)");
  return String(text).trim();
}

async function callPollinationsGet(messages) {
  // Short compact prompt for GET fallback (avoids huge URLs + CORS noise)
  const compact = messages
    .map((m) => {
      const role = (m.role || "user").toUpperCase();
      let content = String(m.content || "");
      if (role === "SYSTEM") content = content.slice(0, 900);
      else content = content.slice(0, 400);
      return role + ": " + content;
    })
    .join("\n")
    .slice(0, 1800);
  const url = POLLINATIONS_GET + encodeURIComponent(compact);
  let res;
  try {
    res = await fetch(url, { mode: "cors", credentials: "omit" });
  } catch (err) {
    throw new Error(friendlyTextApiError(err, "Pollinations GET"));
  }
  if (!res.ok) throw new Error("Pollinations GET " + res.status);
  const text = await res.text();
  if (!String(text).trim()) throw new Error("Empty reply (GET)");
  return String(text).trim();
}


const BLUESMINDS_API = "https://api.bluesminds.com/v1/chat/completions";

async function callBluesmindsChat(messages) {
  const key = typeof getBluesmindsKey === "function" ? getBluesmindsKey() : "";
  if (!key) {
    throw new Error(
      "Add a BluesMinds API key above (from api.bluesminds.com/console/token) to chat."
    );
  }
  const model =
    (typeof getBluesmindsModel === "function" && getBluesmindsModel()) ||
    (typeof BLUESMINDS_MODEL_DEFAULT !== "undefined" ? BLUESMINDS_MODEL_DEFAULT : "gemma-4-26b");
  const payload = {
    model: model,
    messages: normalizeChatMessages(messages),
    temperature: 0.7,
    stream: false,
  };
  let res;
  try {
    res = await fetch(BLUESMINDS_API, {
      method: "POST",
      mode: "cors",
      credentials: "omit",
      headers: {
        Authorization: "Bearer " + key,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(payload),
    });
  } catch (err) {
    throw new Error(
      friendlyTextApiError(err, "BluesMinds") ||
        "Could not reach BluesMinds (network or CORS)."
    );
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const errObj = data && data.error;
    const msg =
      (errObj && (typeof errObj === "string" ? errObj : errObj.message || errObj.code)) ||
      (data && (data.message || data.detail)) ||
      "";
    const textMsg = typeof msg === "string" ? msg : JSON.stringify(msg || "");
    if (res.status === 401 || res.status === 403) {
      throw new Error(
        "Invalid BluesMinds key — get one at api.bluesminds.com/console/token."
      );
    }
    if (res.status === 429) {
      throw new Error("BluesMinds rate limit — wait a moment and try again.");
    }
    if (res.status === 404 || /model|not found|deprecat/i.test(textMsg)) {
      throw new Error(
        "BluesMinds model unavailable (" +
          model +
          ") — try gemma-4-26b or another id from Model Square."
      );
    }
    throw new Error(textMsg || "BluesMinds error (" + res.status + ")");
  }
  const textOut = extractChatContent(data);
  if (!String(textOut).trim()) throw new Error("Empty BluesMinds reply");
  return String(textOut).trim();
}

async function agentAsk(userText) {
  const mode = getAgentMode();
  const c = current();
  const messages = buildAgentMessages(mode, userText, c);
  // BluesMinds is the sole Agent chat backend (CORS-open; key in localStorage).
  return await callBluesmindsChat(messages);
}

function syncAgentModeSeg() {
  const mode = getAgentMode();
  $$("#agentModeSeg button").forEach((b) => b.classList.toggle("on", b.dataset.v === mode));
  const input = $("#agentInput");
  if (input) {
    input.placeholder =
      mode === "lila" ? "Message Lila…" : "Ask the studio agent…";
  }
}

function renderAgentChat() {
  const box = $("#agentChat");
  if (!box) return;
  const mode = getAgentMode();
  const msgs = getAgentChat(mode);
  if (!msgs.length && !state.agentLoading) {
    box.innerHTML =
      '<div class="agent-empty">' +
      (mode === "lila"
        ? "Say hi — Lila will reply in character (free text)."
        : "Ask for prompt help, captions, or Generate image / Generate video.") +
      "</div>";
    return;
  }
  let html = msgs
    .map((m) => {
      const role = m.role === "user" ? "user" : "assistant";
      const hasImg = !!(m.imageUrl && String(m.imageUrl).trim());
      const imgHtml = hasImg
        ? '<img class="agent-chat-img" src="' +
          esc(m.imageUrl) +
          '" alt="Generated" loading="lazy" referrerpolicy="no-referrer" ' +
          'onerror="this.classList.add(\'is-broken\');this.alt=\'\';' +
          'var f=this.nextElementSibling;if(f)f.hidden=false;" />' +
          '<span class="agent-img-fail" hidden>Image failed to load</span>'
        : "";
      return (
        '<div class="agent-bubble ' +
        role +
        (hasImg ? " has-image" : "") +
        '">' +
        (m.content ? esc(m.content) : "") +
        imgHtml +
        (m.ts
          ? '<span class="agent-meta">' +
            esc(new Date(m.ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })) +
            "</span>"
          : "") +
        "</div>"
      );
    })
    .join("");
  if (state.agentLoading) {
    html +=
      '<div class="agent-bubble assistant typing">' +
      esc(state.agentStatusText || "Thinking…") +
      "</div>";
  }
  box.innerHTML = html;
  box.scrollTop = box.scrollHeight;
}

function modesLabel(modes) {
  const m = modes || [];
  if (m.includes("both") || (m.includes("studio") && m.includes("lila"))) return "both";
  if (m.includes("lila")) return "lila";
  return "studio";
}

function renderAgentSkills() {
  const listEl = $("#agentSkillsList");
  if (!listEl) return;
  ensureAgentSkills();
  const skills = getAgentSkills() || [];
  if (!skills.length) {
    listEl.innerHTML = '<p class="empty-inline">No skills yet. Add one.</p>';
    return;
  }
  listEl.innerHTML = skills
    .map((s) => {
      return (
        '<div class="agent-skill-card" data-id="' +
        esc(s.id) +
        '">' +
        '<div class="agent-skill-top">' +
        "<label>" +
        '<input type="checkbox" data-act="toggle"' +
        (s.enabled ? " checked" : "") +
        " />" +
        "<span><span class=\"agent-skill-name\">" +
        esc(s.name) +
        '</span><span class="agent-skill-mode">' +
        esc(modesLabel(s.modes)) +
        "</span>" +
        '<p class="agent-skill-desc">' +
        esc(s.description || "") +
        "</p></span></label>" +
        "</div>" +
        '<div class="agent-skill-actions">' +
        '<button type="button" class="btn btn-ghost btn-sm" data-act="edit">Edit</button>' +
        '<button type="button" class="btn btn-ghost btn-sm" data-act="delete">Delete</button>' +
        "</div></div>"
      );
    })
    .join("");
}

function openSkillDialog(skill) {
  state.editingSkillId = skill ? skill.id : null;
  $("#skill-dialog-title").textContent = skill ? "Edit skill" : "Add skill";
  $("#skill-name").value = skill ? skill.name : "";
  $("#skill-desc").value = skill ? skill.description || "" : "";
  $("#skill-body").value = skill ? skill.body || "" : "";
  $("#skill-modes").value = skill ? modesLabel(skill.modes) : "both";
  const dlg = $("#skill-dialog");
  if (dlg.showModal) dlg.showModal();
  else dlg.setAttribute("open", "");
}

function looksLikeGenerateRequest(text) {
  return /\b(generat(e|ing)|draw|make\s+(me\s+)?(an?\s+)?(image|pic|picture|photo)|create\s+(an?\s+)?(image|pic|picture|photo)|paint|render\s+(an?\s+)?(image|scene))\b/i.test(
    String(text || "")
  );
}

function looksLikeVideoRequest(text) {
  return /\b(generat(e|ing)|make|create|render|try)\b[\s\S]{0,40}\b(video|clip|animation|animate|seedance)\b|\b(video|clip)\s+(of|for|please|now)\b/i.test(
    String(text || "")
  );
}

function parseModeScene(raw, fallbackScene) {
  const text = String(raw || "");
  let mode = "soft";
  let scene = String(fallbackScene || "").trim();
  const modeMatch = text.match(/^\s*MODE\s*:\s*(soft|suggestive|nsfw)\s*$/im);
  if (modeMatch) {
    const m = modeMatch[1].toLowerCase();
    mode = m === "suggestive" || m === "nsfw" ? m : "soft";
  } else if (/\bnsfw\b|explicit|nude|naked/i.test(text + " " + fallbackScene)) {
    mode = "nsfw";
  } else if (/\bsuggestive\b|lingerie|tease/i.test(text + " " + fallbackScene)) {
    mode = "suggestive";
  }
  const sceneMatch = text.match(/^\s*SCENE\s*:\s*(.+)$/im);
  if (sceneMatch) {
    scene = sceneMatch[1].trim().replace(/^["']|["']$/g, "");
  }
  if (!scene) scene = String(fallbackScene || "").trim() || "cozy indoor portrait, soft light";
  return { mode: mode, scene: scene.slice(0, 500) };
}

async function agentAskModeScene(userText, c) {
  let skills = buildSkillsBlock("studio");
  if (skills.length > 1200) skills = skills.slice(0, 1199) + "…";
  let system =
    "You write short image scene briefs for Lumora Personal (adult fictional 21+ only). " +
    "Return ONLY two lines, nothing else — no intro, no markdown:\n" +
    "MODE: soft|suggestive|nsfw\n" +
    "SCENE: <short scene: outfit, pose, place only — no full identity, no name, no age dump>\n" +
    "MODE guide: soft=clothed SFW aesthetic; suggestive=lingerie/tease; nsfw=explicit adult. " +
    "Infer MODE from the user request. Keep SCENE under 40 words." +
    (skills ? "\n\n" + skills : "") +
    (c && c.name ? "\nCharacter in use: " + c.name + " (identity is face-locked elsewhere — do not restate face)." : "");
  if (system.length > AGENT_SYSTEM_MAX) {
    system = system.slice(0, AGENT_SYSTEM_MAX - 1) + "…";
  }
  const messages = [
    { role: "system", content: system },
    { role: "user", content: String(userText || "").slice(0, 800) },
  ];
  return await callBluesmindsChat(messages);
}

function saveAgentGenToMedia(c, imageUrl, label, notes, aspect) {
  if (!c || !imageUrl) return;
  const media = [
    {
      id: uid("m"),
      label: String(label || "Agent generation").slice(0, 80),
      notes: String(notes || "").slice(0, 500),
      aspect: aspect || "3:4",
      imageDataUrl: null,
      imageUrl: imageUrl,
      createdAt: new Date().toISOString(),
      source: "agent",
    },
    ...(c.media || []),
  ];
  updateCharacter(c.id, { media });
}

function lightUpdateGenPreview(url) {
  const wrap = $("#genPreview");
  const img = $("#genPreviewImg");
  if (!wrap || !img || !url) return;
  wrap.hidden = false;
  try {
    img.referrerPolicy = "no-referrer";
  } catch (_) {}
  img.hidden = false;
  img.src = url;
}



// ——— Steal List W3–4: last still / agentic edit / animate / wizard / hero pack ———
function getLastStillUrl(c) {
  if (state.lastGenUrl) return state.lastGenUrl;
  const img = $("#genPreviewImg");
  if (img && !img.hidden && img.src && /^https?:|^data:|^blob:/i.test(img.src)) {
    return img.src;
  }
  const media = (c && c.media) || [];
  for (let i = 0; i < media.length; i++) {
    const m = media[i];
    if (m && m.type === "video-pending") continue;
    const src = mediaSrc(m);
    if (src) return src;
  }
  try {
    const hist = getAgentChat(getAgentMode()) || [];
    for (let i = hist.length - 1; i >= 0; i--) {
      if (hist[i] && hist[i].imageUrl) return hist[i].imageUrl;
    }
  } catch (_) {}
  return null;
}

function looksLikeAgenticEdit(text) {
  return /\b(change\s+only\s+(the\s+)?(outfit|light|lighting|angle|pose|clothes)|softer\s+light|new\s+angle|edit\s+(the\s+)?(last\s+)?(image|still|photo|gen)|apply\s+edit|tweak\s+(the\s+)?(outfit|light|lighting|angle)|make\s+(the\s+)?(light|lighting)\s+softer|outfit\s+to\b)\b/i.test(
    String(text || "")
  );
}

function looksLikeAnimateRequest(text) {
  return /\b(animate\s+(this|that|it|last|the\s+still|the\s+image)|make\s+(this|that|it|the\s+still|the\s+image)\s+move|add\s+(subtle\s+)?motion)\b/i.test(
    String(text || "")
  );
}

function buildAgenticEditScene(instruction) {
  const instr = String(instruction || "").trim().slice(0, 280);
  return (
    "Keep the exact same character identity and overall composition as the previous still. " +
    "Apply ONLY this change (outfit / light / angle as requested — do not alter face, hair color, body type, or identity): " +
    instr
  );
}

async function applyAgenticEdit(instruction, opts) {
  opts = opts || {};
  const c = current();
  if (!c) {
    toast("Open a character first");
    return { ok: false, error: "No character" };
  }
  if (state.genLoading || state.agentLoading || state.storyboardRunning) {
    toast("Already generating — wait for the current job");
    return { ok: false, error: "Busy" };
  }
  const instr = String(instruction || "").trim();
  if (!instr) {
    toast("Describe the edit (outfit / light / angle)");
    return { ok: false, error: "Empty instruction" };
  }
  const last = getLastStillUrl(c);
  if (!last) {
    toast("Generate an image first");
    return { ok: false, error: "No last still" };
  }
  const scene = buildAgenticEditScene(instr);
  const mode = getGenMode();
  const aspect =
    ($("#aspectSeg .on") && $("#aspectSeg .on").dataset.v) || "3:4";
  const fromAgent = !!opts.fromAgent;
  const chatMode = getAgentMode();

  if (fromAgent) {
    const history = getAgentChat(chatMode);
    history.push({ role: "user", content: instr, ts: Date.now() });
    setAgentChat(chatMode, history);
    state.agentLoading = true;
    state.agentStatusText = "Agentic edit · Image Engine…";
    syncAgentGenBtn();
    renderAgentChat();
  } else {
    setGenLoading(true);
    toast("Agentic edit · queuing…");
  }

  try {
    const result = await agentEngineImage({
      scene,
      mode,
      aspect,
      character: c,
      onStatus: (t) => {
        if (fromAgent) {
          state.agentStatusText = t;
          setHordeQueueStatus(t);
          renderAgentChat();
        }
      },
    });
    if (!result || !result.ok || !result.chatUrl) {
      throw new Error((result && result.error) || "Edit failed — no image");
    }
    // confirmAgentImage already used inside Image Engine
    const chatUrl = result.chatUrl;
    const mediaUrl = result.mediaUrl || result.chatUrl;
    state.lastGenUrl = mediaUrl || chatUrl;
    lightUpdateGenPreview(chatUrl);
    try {
      saveAgentGenToMedia(
        getCharacter(c.id) || c,
        mediaUrl || chatUrl,
        "Edit · " + mode + " · " + instr.slice(0, 40),
        "Agentic edit from last still. Change: " + instr.slice(0, 200),
        aspect
      );
      renderMedia();
    } catch (_) {}
    if (fromAgent) {
      const next = getAgentChat(chatMode);
      next.push({
        role: "assistant",
        content:
          "Agentic edit · " +
          mode +
          " · " +
          (result.provider || "horde") +
          "\n" +
          instr.slice(0, 160),
        imageUrl: chatUrl,
        ts: Date.now(),
      });
      setAgentChat(chatMode, next);
    }
    toast("Edit ready (" + (result.provider || "horde") + ")");
    return { ok: true, chatUrl, mediaUrl, provider: result.provider };
  } catch (err) {
    const msg = (err && err.message) || "Agentic edit failed";
    toast(msg);
    if (fromAgent) {
      const next = getAgentChat(chatMode);
      next.push({
        role: "assistant",
        content: "Agentic edit couldn't apply that. " + msg,
        ts: Date.now(),
      });
      setAgentChat(chatMode, next);
    }
    return { ok: false, error: msg };
  } finally {
    if (fromAgent) {
      state.agentLoading = false;
      state.agentStatusText = "";
      if (!state.genLoading && !state.storyboardRunning) clearHordeQueueStatus();
      syncAgentGenBtn();
      renderAgentChat();
    }
    setGenLoading(false);
  }
}

async function animateLastStill(motionPrompt, opts) {
  opts = opts || {};
  const c = current();
  if (!c) {
    toast("Open a character first");
    return { ok: false };
  }
  const still = getLastStillUrl(c);
  if (!still) {
    toast("Generate an image first");
    return { ok: false, error: "No last still" };
  }
  const motion =
    String(motionPrompt || "").trim() ||
    "subtle natural motion, blink, breathing, soft camera hold";
  const mode = getGenMode();
  const aspect =
    ($("#aspectSeg .on") && $("#aspectSeg .on").dataset.v) || "9:16";
  const fromAgent = !!opts.fromAgent;
  const chatMode = getAgentMode();

  if (fromAgent) {
    const history = getAgentChat(chatMode);
    history.push({
      role: "user",
      content: "Animate this: " + motion,
      ts: Date.now(),
    });
    setAgentChat(chatMode, history);
    state.agentLoading = true;
    state.agentStatusText = "Video Engine · animate still…";
    syncAgentGenBtn();
    renderAgentChat();
  }

  try {
    const result = await agentEngineVideo({
      scene: motion,
      mode,
      aspect,
      character: c,
      startFrameUrl: still,
      motionPrompt: motion,
      endFrameUrl: null,
      onStatus: (t) => {
        if (fromAgent) {
          state.agentStatusText = t;
          setHordeQueueStatus(t);
          renderAgentChat();
        }
      },
    });
    const reply =
      (result && result.message) ||
      "Video engine: free video isn’t rendered yet — job queued in Media.";
    try {
      saveAgentVideoPendingToMedia(
        getCharacter(c.id) || c,
        "Animate still · " + mode + " · " + motion.slice(0, 28),
        "Motion: " +
          motion.slice(0, 180) +
          " | Free video not rendered yet — queued for when a free motion backend exists.",
        aspect,
        mode,
        {
          startFrameUrl: still,
          motionPrompt: motion,
          endFrameUrl: null,
          label: "video-pending · animate last still",
        }
      );
      renderMedia();
    } catch (_) {}
    if (fromAgent) {
      const next = getAgentChat(chatMode);
      next.push({ role: "assistant", content: reply, ts: Date.now() });
      setAgentChat(chatMode, next);
    }
    toast("Animate queued · video-pending in Media");
    return { ok: true, pending: true };
  } catch (err) {
    const msg = (err && err.message) || "Animate failed";
    toast(msg);
    if (fromAgent) {
      const next = getAgentChat(chatMode);
      next.push({
        role: "assistant",
        content: "Animate: " + msg,
        ts: Date.now(),
      });
      setAgentChat(chatMode, next);
    }
    return { ok: false, error: msg };
  } finally {
    if (fromAgent) {
      state.agentLoading = false;
      state.agentStatusText = "";
      if (!state.genLoading && !state.storyboardRunning) clearHordeQueueStatus();
      syncAgentGenBtn();
      renderAgentChat();
    }
  }
}

// Wizard catalogs imported from ./data/wizard.js

function mergeShortIdentityFromAttrs(c, attrs, keepCustom) {
  const base = {
    ...(c || {}),
    attrs: { ...((c && c.attrs) || {}), ...(attrs || {}) },
  };
  const generated = compressMasterToShortIdentity(base);
  if (!keepCustom) return generated;
  const fl = getFaceLock(c);
  const existing = String(fl.shortIdentity || "").trim();
  if (!existing) return generated;
  // Merge: if existing already covers generated bits, keep; else append unique hair/eyes/body cues
  const lower = existing.toLowerCase();
  const bits = [];
  if (attrs.hair && lower.indexOf(String(attrs.hair).toLowerCase().slice(0, 12)) < 0) {
    bits.push(String(attrs.hair));
  }
  if (attrs.eyes && lower.indexOf(String(attrs.eyes).toLowerCase().slice(0, 8)) < 0) {
    bits.push(String(attrs.eyes) + " eyes");
  }
  if (attrs.body && lower.indexOf(String(attrs.body).toLowerCase().slice(0, 10)) < 0) {
    bits.push(String(attrs.body));
  }
  if (!bits.length) return existing.slice(0, 280);
  let merged = existing.replace(/[.\s]+$/, "") + "; " + bits.join(", ") + ".";
  if (merged.length > 280) merged = generated;
  return merged.slice(0, 280);
}

function applyWizardSelection(groupId, value) {
  const c = current();
  if (!c) {
    toast("Open a character first");
    return;
  }
  const group = WIZARD_GROUPS.find((g) => g.id === groupId);
  if (!group) return;
  const attrs = { ...(c.attrs || {}) };
  const patch = {};
  if (group.attr === "_personalityVibe") {
    const text = PERSONALITY_VIBE_TEXT[value] || value;
    const persEl = $("#char-personality");
    const curPers = (persEl && persEl.value) || c.personality || "";
    // Merge vibe into personality without blindly wiping custom notes
    if (!curPers.trim()) {
      patch.personality = text;
      if (persEl) persEl.value = text;
    } else if (curPers.toLowerCase().indexOf(value.toLowerCase().slice(0, 8)) < 0) {
      const merged = (curPers.trim() + " · Vibe: " + value).slice(0, 500);
      patch.personality = merged;
      if (persEl) persEl.value = merged;
    }
    attrs.personalityVibe = value;
  } else {
    attrs[group.attr] = value;
    patch.attrs = attrs;
  }
  patch.attrs = attrs;
  const shortIdentity = mergeShortIdentityFromAttrs(
    { ...c, ...patch, attrs },
    attrs,
    true
  );
  const fl = normalizeFaceLock({
    ...getFaceLock(c),
    shortIdentity,
    enabled: true,
  });
  patch.faceLock = fl;
  updateCharacter(c.id, patch);
  const idEl = $("#char-face-lock-identity");
  if (idEl) idEl.value = shortIdentity;
  const en = $("#char-face-lock-enabled");
  if (en) en.checked = true;
  const sum = $("#char-attrs-summary");
  if (sum) sum.value = attrsSummary(getCharacter(c.id) || { ...c, attrs });
  renderCharacterWizard(getCharacter(c.id) || c);
  syncFaceLockGenUI(getCharacter(c.id));
  toast("Wizard · " + group.label + ": " + value);
}

function renderCharacterWizard(c) {
  const root = $("#characterWizard");
  if (!root) return;
  const attrs = (c && c.attrs) || {};
  root.innerHTML = WIZARD_GROUPS.map((g) => {
    const currentVal =
      g.attr === "_personalityVibe"
        ? attrs.personalityVibe || ""
        : attrs[g.attr] || "";
    return (
      '<div class="wizard-group" data-wg="' +
      esc(g.id) +
      '"><div class="wizard-label">' +
      esc(g.label) +
      '</div><div class="chips scroll-x wizard-chips">' +
      g.options
        .map((opt) => {
          const on = currentVal === opt ? " on" : "";
          return (
            '<button type="button" class="chip' +
            on +
            '" data-wv="' +
            esc(opt) +
            '">' +
            esc(opt.replace(/^Long soft rose-pink wavy$/, "Rose-pink soft").replace(/^Petite soft hourglass$/, "Petite soft").replace(/^Soft cute pastel$/, "Soft cute")) +
            "</button>"
          );
        })
        .join("") +
      "</div></div>"
    );
  }).join("");
}

function resizeImageToDataUrl(file, maxSide) {
  maxSide = maxSide || 640;
  return new Promise((resolve, reject) => {
    if (!file) return reject(new Error("No file"));
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Could not read image"));
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        try {
          let w = img.naturalWidth || img.width;
          let h = img.naturalHeight || img.height;
          if (!w || !h) return reject(new Error("Bad image"));
          const scale = Math.min(1, maxSide / Math.max(w, h));
          w = Math.max(1, Math.round(w * scale));
          h = Math.max(1, Math.round(h * scale));
          const canvas = document.createElement("canvas");
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext("2d");
          ctx.drawImage(img, 0, 0, w, h);
          resolve(canvas.toDataURL("image/jpeg", 0.72));
        } catch (err) {
          reject(err);
        }
      };
      img.onerror = () => reject(new Error("Image decode failed"));
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

function renderHeroFacePack(c) {
  const root = $("#heroFacePack");
  if (!root) return;
  const fl = getFaceLock(c);
  const faces = fl.heroFaces || [];
  const thumbs =
    faces.length === 0
      ? '<p class="hint">No hero faces yet — upload 1–5 stills (resized ~640px JPEG to save quota).</p>'
      : '<div class="hero-face-thumbs">' +
        faces
          .map(
            (h) =>
              '<button type="button" class="hero-face-thumb' +
              (h.primary ? " primary" : "") +
              '" data-hf="' +
              esc(h.id) +
              '" title="' +
              (h.primary ? "Primary face-lock ref" : "Set as primary") +
              '"><img src="' +
              esc(h.dataUrl) +
              '" alt="Hero face" /><span class="hf-badge">' +
              (h.primary ? "Primary" : "Set") +
              '</span></button><button type="button" class="hero-face-del" data-hf-del="' +
              esc(h.id) +
              '" aria-label="Remove">×</button>'
          )
          .join("") +
        "</div>";
  root.innerHTML =
    thumbs +
    '<div class="toolbar" style="margin-top:8px;gap:8px;flex-wrap:wrap">' +
    '<label class="btn btn-ghost btn-sm hero-upload-label">Upload face' +
    '<input type="file" id="heroFaceFile" accept="image/*" hidden ' +
    (faces.length >= 5 ? "disabled" : "") +
    " /></label>" +
    '<span class="hint">' +
    faces.length +
    "/5 · longest side ~640px · local only</span></div>";
}

async function addHeroFaceFromFile(file) {
  const c = current();
  if (!c) {
    toast("Open a character first");
    return;
  }
  const fl = normalizeFaceLock(getFaceLock(c));
  if ((fl.heroFaces || []).length >= 5) {
    toast("Max 5 hero faces");
    return;
  }
  try {
    const dataUrl = await resizeImageToDataUrl(file, 640);
    // rough quota guard ~450KB per face after compress
    if (dataUrl.length > 550000) {
      toast("Image still too large after compress — try a simpler crop");
      return;
    }
    const faces = [...(fl.heroFaces || [])];
    const id = uid("hf");
    faces.push({ id, dataUrl, primary: faces.length === 0 });
    fl.heroFaces = faces;
    if (!fl.notes || !/hero face pack/i.test(fl.notes)) {
      fl.notes = ((fl.notes ? fl.notes + " · " : "") + "Hero face pack pinned").slice(0, 200);
    }
    fl.enabled = true;
    if (!fl.shortIdentity) {
      fl.shortIdentity = compressMasterToShortIdentity(c);
    }
    updateCharacter(c.id, { faceLock: fl });
    const notesEl = $("#char-face-lock-notes");
    if (notesEl && !notesEl.value.trim()) notesEl.value = fl.notes;
    const en = $("#char-face-lock-enabled");
    if (en) en.checked = true;
    renderHeroFacePack(getCharacter(c.id) || c);
    syncFaceLockGenUI(getCharacter(c.id));
    toast("Hero face added" + (faces.length === 1 ? " · set as primary" : ""));
  } catch (err) {
    toast((err && err.message) || "Could not add hero face");
  }
}

function setPrimaryHeroFace(id) {
  const c = current();
  if (!c) return;
  const fl = normalizeFaceLock(getFaceLock(c));
  fl.heroFaces = (fl.heroFaces || []).map((h) => ({
    ...h,
    primary: h.id === id,
  }));
  updateCharacter(c.id, { faceLock: fl });
  renderHeroFacePack(getCharacter(c.id) || c);
  toast("Primary face-lock ref set");
}

function removeHeroFace(id) {
  const c = current();
  if (!c) return;
  const fl = normalizeFaceLock(getFaceLock(c));
  fl.heroFaces = (fl.heroFaces || []).filter((h) => h.id !== id);
  if (fl.heroFaces.length && !fl.heroFaces.some((h) => h.primary)) {
    fl.heroFaces[0].primary = true;
  }
  updateCharacter(c.id, { faceLock: fl });
  renderHeroFacePack(getCharacter(c.id) || c);
  toast("Hero face removed");
}

/**
 * Agent-owned engines — named capabilities the Agent invokes (front door).
 * Studio Generate tab can still work independently; Agent does not depend on opening it.
 * Free-only for Agent images: AI Horde + Pollinations. Agent text: Groq (free key) then Pollinations.
 */

