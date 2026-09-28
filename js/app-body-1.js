"use strict";

const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const esc = (s) =>
  String(s ?? "").replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])
  );

const state = {
  currentId: null,
  viewing: null,
  editingPromptId: null,
  editingSkillId: null,
  objectUrls: [], // revoke on navigate
  lastGenUrl: null,
  genLoading: false,
  agentLoading: false,
  agentStatusText: "",
  storyboardRunning: false,
  storyboardAbort: false,
  hordeQueueText: "",
};

// ——— Storage ———
function load(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (raw == null) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}
function save(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}
function uid(prefix) {
  return prefix + "_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 7);
}
function todayKey() {
  const d = new Date();
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
}
function formatTodayLabel() {
  return new Date().toLocaleDateString(undefined, { weekday: "long", year: "numeric", month: "long", day: "numeric" });
}


function normalizeFaceLock(fl) {
  const src = fl && typeof fl === "object" ? fl : {};
  let heroFaces = [];
  if (Array.isArray(src.heroFaces)) {
    heroFaces = src.heroFaces
      .filter(
        (h) =>
          h &&
          typeof h === "object" &&
          typeof h.dataUrl === "string" &&
          /^data:image\//i.test(h.dataUrl)
      )
      .slice(0, 5)
      .map((h, i) => ({
        id: String(h.id || "hf_" + i),
        dataUrl: h.dataUrl,
        primary: !!h.primary,
      }));
  }
  if (heroFaces.length) {
    const prim = heroFaces.find((h) => h.primary);
    if (!prim) heroFaces[0].primary = true;
    else {
      let seen = false;
      heroFaces = heroFaces.map((h) => {
        if (h.primary && !seen) {
          seen = true;
          return h;
        }
        return { ...h, primary: false };
      });
    }
  }
  return {
    enabled: !!src.enabled,
    shortIdentity: String(src.shortIdentity || "").trim().slice(0, 280),
    notes: String(src.notes || "").trim().slice(0, 200),
    heroFaces,
  };
}

/** Compress master / attrs into one short Safari-safe identity sentence (APOB-style face lock). */
function compressMasterToShortIdentity(c) {
  const char = c || {};
  const a = char.attrs || {};
  let age = parseInt(char.age, 10);
  if (isNaN(age) || age < 21) age = 22;
  const name = String(char.name || "Character").trim() || "Character";
  const bits = [];
  if (a.gender) bits.push(a.gender.toLowerCase());
  else bits.push("woman");
  bits.push("adult age " + age);
  if (a.ethnicity && a.ethnicity !== "Any") bits.push(String(a.ethnicity).toLowerCase());
  if (a.hair) bits.push(String(a.hair).toLowerCase() + " hair");
  if (a.eyes) bits.push(String(a.eyes).toLowerCase() + " eyes");
  if (a.body) bits.push(String(a.body).toLowerCase() + " body");
  if (a.details) bits.push(String(a.details).slice(0, 60).toLowerCase());
  // Prefer first sentence-ish from master if attrs sparse
  let master = String(char.masterAppearance || "").trim();
  if (master && bits.length < 5) {
    const first = master.split(/[.\n]/).map((s) => s.trim()).filter(Boolean)[0] || "";
    if (first) {
      const clipped = first.slice(0, 160);
      return (name + ": " + clipped).slice(0, 280);
    }
  }
  let sentence = name + " — " + bits.join(", ") + ".";
  if (sentence.length > 280) sentence = sentence.slice(0, 277) + "…";
  return sentence;
}

function getFaceLock(c) {
  return normalizeFaceLock(c && c.faceLock);
}

function emptyCharData(base) {
  return {
    id: uid("char"),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    name: base.name || "Unnamed",
    age: Math.max(21, parseInt(base.age, 10) || 22),
    niche: base.niche || "Lifestyle",
    attrs: base.attrs || {},
    personality: base.personality || "",
    backstory: base.backstory || "",
    speakingStyle: base.speakingStyle || "",
    masterAppearance: base.masterAppearance || "",
    faceLock: normalizeFaceLock(base.faceLock),
    prompts: (base.prompts || STARTER_PROMPTS).map((p) => ({ ...p })),
    captionFavorites: base.captionFavorites || [],
    calendar: (base.calendar || STARTER_WEEK).map((x) => ({ ...x })),
    checklist: base.checklist || null,
    media: base.media || [],
    dressRef: normalizeDressRef(base.dressRef),
    duoCast: normalizeDuoCast(base.duoCast),
    moviePack: normalizeMoviePack(base.moviePack),
  };
}

function getCharacters() {
  return load(KEYS.characters, []);
}
function setCharacters(list) {
  save(KEYS.characters, list);
}
function getCharacter(id) {
  return getCharacters().find((c) => c.id === id) || null;
}
function updateCharacter(id, patch) {
  const list = getCharacters().map((c) => {
    if (c.id !== id) return c;
    return { ...c, ...patch, updatedAt: new Date().toISOString() };
  });
  setCharacters(list);
  return list.find((c) => c.id === id);
}
function deleteCharacter(id) {
  setCharacters(getCharacters().filter((c) => c.id !== id));
}

function ensureStarter() {
  let list = getCharacters();
  if (!list.length) {
    const lila = emptyCharData({
      ...STARTER_CHARACTER,
      prompts: STARTER_PROMPTS.map((p) => ({ ...p })),
      calendar: STARTER_WEEK.map((x) => ({ ...x })),
    });
    lila.id = "char_lila_bloom";
    setCharacters([lila]);
    return;
  }
  // Merge new starter prompts into Lila if present
  const lila = list.find((c) => c.id === "char_lila_bloom" || c.name === "Lila Bloom");
  if (lila) {
    const have = new Set((lila.prompts || []).map((p) => p.id));
    let added = 0;
    const prompts = [...(lila.prompts || [])];
    for (const p of STARTER_PROMPTS) {
      if (!have.has(p.id)) {
        prompts.push({ ...p });
        added += 1;
      }
    }
    const patch = {};
    if (added) patch.prompts = prompts;
    // Seed APOB face-lock on existing Lila if missing short identity
    const fl = normalizeFaceLock(lila.faceLock);
    if (!fl.shortIdentity && STARTER_CHARACTER.faceLock) {
      patch.faceLock = normalizeFaceLock(STARTER_CHARACTER.faceLock);
    }
    if (Object.keys(patch).length) updateCharacter(lila.id, patch);
  }
}

function buildMasterFromAttrs(name, age, attrs, niche) {
  const a = attrs || {};
  const lines = [
    "Consistent character sheet — use verbatim every generation:",
    `Adult ${a.gender || "person"}, age ${age || 22}, fictional${niche ? ", niche: " + niche : ""}.`,
    a.ethnicity && a.ethnicity !== "Any" ? `Ethnicity / look: ${a.ethnicity}.` : null,
    a.hair ? `Hair: ${a.hair}.` : null,
    a.eyes ? `Eyes: ${a.eyes}.` : null,
    a.body ? `Body: ${a.body}.` : null,
    a.style ? `Style: ${a.style}.` : null,
    a.details ? `Extra details: ${a.details}.` : null,
    `Name reference: ${name || "character"}.`,
    "Identity lock: same face, same hair, same body type every time. Adult 21+ only.",
  ];
  return lines.filter(Boolean).join("\n");
}

// ——— Toast / copy ———
let toastT;
function toast(msg) {
  const t = $("#toast");
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(toastT);
  toastT = setTimeout(() => t.classList.remove("show"), 2800);
}
async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.left = "-9999px";
    document.body.appendChild(ta);
    ta.select();
    try {
      document.execCommand("copy");
      return true;
    } catch {
      return false;
    } finally {
      document.body.removeChild(ta);
    }
  }
}

function revokeUrls() {
  state.objectUrls.forEach((u) => {
    try { URL.revokeObjectURL(u); } catch (_) {}
  });
  state.objectUrls = [];
}

// ——— Routing ———
function curPath() {
  return (location.hash.replace(/^#/, "") || "/").split("?")[0];
}
function go(path) {
  location.hash = "#" + path;
}
function closeDrawer() {
  $("#drawer").classList.remove("open");
  $("#menuBtn").setAttribute("aria-expanded", "false");
}
function closeViewer() {
  $("#viewer").hidden = true;
  $("#viewerMedia").innerHTML = "";
  document.body.style.overflow = "";
  state.viewing = null;
}

function route() {
  const h = curPath();
  closeDrawer();
  closeViewer();
  revokeUrls();
  $$(".view").forEach((v) => (v.hidden = true));
  const topbar = $("#topbar");
  let view;
  if (h === "/create") view = "#view-create";
  else if (h === "/app") {
    view = "#view-app";
    renderDashboard();
  } else if (h.startsWith("/i/")) {
    view = "#view-inf";
    loadWorkspace(h.slice(3));
  } else {
    view = "#view-home";
  }
  $(view).hidden = false;
  const isHome = view === "#view-home";
  topbar.classList.toggle("solid", !isHome || window.scrollY > 40);
  window.scrollTo(0, 0);
}

// ——— Dashboard ———
function renderDashboard() {
  const grid = $("#charGrid");
  const list = getCharacters();
  if (!list.length) {
    grid.innerHTML =
      '<div class="empty"><h3>No characters yet</h3><p>Design your first AI influencer.</p><button class="btn btn-light" data-go="/create">Create character</button></div>';
    return;
  }
  grid.innerHTML =
    list
      .map((c) => {
        const letter = esc((c.name || "?").charAt(0).toUpperCase());
        const promptCount = (c.prompts || []).length;
        const mediaCount = (c.media || []).length;
        return (
          '<button class="char-card" data-go="/i/' +
          esc(c.id) +
          '">' +
          '<div class="placeholder-avatar">' +
          letter +
          "</div>" +
          '<div class="meta"><b>' +
          esc(c.name) +
          "</b><span>" +
          esc(c.niche || "Lifestyle") +
          " · " +
          promptCount +
          " prompts · " +
          mediaCount +
          " media</span></div></button>"
        );
      })
      .join("") +
    '<button class="char-card new" data-go="/create"><span class="plus">+</span><span>New character</span></button>';
}

// ——— Create ———
function collectCreateAttrs(form) {
  const attrs = { details: form.elements.details.value.trim() };
  $$(".chips[data-name]", form).forEach((g) => {
    const on = $(".chip.on", g);
    if (on) attrs[g.dataset.name] = on.dataset.v;
  });
  const niche = attrs.niche || "Lifestyle";
  delete attrs.niche;
  return { attrs, niche };
}

// ——— Workspace tabs (grouped IA: Look / Create / Library / Agent) ———
const TAB_GROUP = {
  bible: "look",
  prompts: "create",
  generate: "create",
  captions: "create",
  calendar: "library",
  checklist: "library",
  media: "library",
  agent: "agent",
  skills: "agent",
};
const GROUP_DEFAULT_TAB = {
  look: "bible",
  create: "generate",
  library: "media",
  plan: "media", // legacy alias → library
  agent: "agent",
};

function setGroup(groupId, preferredTab) {
  // Migrate legacy Plan group → Library
  if (groupId === "plan") groupId = "library";
  const group = GROUP_DEFAULT_TAB[groupId] ? groupId : "look";
  $$(".ws-group").forEach((g) => {
    const on = g.dataset.group === group;
    g.classList.toggle("on", on);
    g.setAttribute("aria-selected", on ? "true" : "false");
  });
  $$(".ws-tab").forEach((t) => {
    const match = (t.dataset.group || TAB_GROUP[t.dataset.tab]) === group;
    t.hidden = !match;
    t.tabIndex = match ? 0 : -1;
  });
  const tabsInGroup = $$(".ws-tab").filter((t) => !t.hidden);
  let tabId = preferredTab;
  if (!tabId || TAB_GROUP[tabId] !== group) {
    const currentOn = tabsInGroup.find((t) => t.classList.contains("on"));
    tabId = (currentOn && currentOn.dataset.tab) || GROUP_DEFAULT_TAB[group];
  }
  setTab(tabId, { skipGroupSync: true });
}

function setTab(tabId, opts = {}) {
  if (!TAB_GROUP[tabId]) tabId = "bible";
  if (!opts.skipGroupSync) {
    const group = TAB_GROUP[tabId];
    $$(".ws-group").forEach((g) => {
      const on = g.dataset.group === group;
      g.classList.toggle("on", on);
      g.setAttribute("aria-selected", on ? "true" : "false");
    });
    $$(".ws-tab").forEach((t) => {
      const match = (t.dataset.group || TAB_GROUP[t.dataset.tab]) === group;
      t.hidden = !match;
      t.tabIndex = match ? 0 : -1;
    });
  }
  $$(".ws-tab").forEach((t) => {
    const on = t.dataset.tab === tabId;
    t.classList.toggle("on", on);
    t.setAttribute("aria-selected", on ? "true" : "false");
  });
  $$(".ws-panel").forEach((p) => p.classList.toggle("on", p.id === "panel-" + tabId));
  if (tabId === "agent") {
    renderAgentChat();
    syncAgentModeSeg();
  } else if (tabId === "skills") {
    if (typeof renderAgentSkills === "function") renderAgentSkills();
  }
}

function current() {
  return state.currentId ? getCharacter(state.currentId) : null;
}

function loadWorkspace(id) {
  const c = getCharacter(id);
  state.currentId = c ? c.id : null;
  if (!c) {
    $("#infHead").innerHTML =
      '<div class="empty" style="grid-column:1/-1"><h3>Not found</h3><p>Character missing from local storage.</p><button class="btn btn-light" data-go="/app">Back</button></div>';
    $$(".ws-panel").forEach((p) => (p.classList.remove("on")));
    return;
  }
  // merge starters for this char if it's Lila
  if (c.id === "char_lila_bloom" || c.name === "Lila Bloom") {
    const have = new Set((c.prompts || []).map((p) => p.id));
    let added = 0;
    const prompts = [...(c.prompts || [])];
    for (const p of STARTER_PROMPTS) {
      if (!have.has(p.id)) {
        prompts.push({ ...p });
        added += 1;
      }
    }
    const patch = {};
    if (added) patch.prompts = prompts;
    const fl = normalizeFaceLock(c.faceLock);
    if (!fl.shortIdentity && STARTER_CHARACTER.faceLock) {
      patch.faceLock = normalizeFaceLock(STARTER_CHARACTER.faceLock);
    }
    if (Object.keys(patch).length) updateCharacter(c.id, patch);
  }
  const fresh = getCharacter(id);
  renderInfHead(fresh);
  fillBible(fresh);
  renderPrompts();
  renderCaptions();
  renderCalendar();
  renderChecklist();
  renderMedia();
  updateFullPreview();
  syncFaceLockGenUI(fresh);
  renderDressRefUI(fresh);
  renderDuoCastUI(fresh);
  renderMoviePackUI(fresh);
  setTab("bible");
}

function renderInfHead(c) {
  const letter = esc((c.name || "?").charAt(0).toUpperCase());
  $("#infHead").innerHTML =
    '<div class="avatar"><div class="avatar-letter">' +
    letter +
    "</div></div><div>" +
    '<h1 class="h1">' +
    esc(c.name) +
    "</h1>" +
    '<p class="sub">' +
    esc(c.niche || "Lifestyle") +
    " · age " +
    esc(c.age) +
    " · " +
    (c.prompts || []).length +
    " prompts</p>" +
    '<div class="actions">' +
    '<button class="btn btn-ghost btn-sm" id="delCharBtn">Delete</button>' +
    "</div></div>";
}

function attrsSummary(c) {
  const a = c.attrs || {};
  return [a.gender, a.ethnicity, a.hair, a.eyes, a.body, a.style].filter(Boolean).join(" · ");
}

function fillBible(c) {
  $("#char-name").value = c.name || "";
  $("#char-age").value = c.age || 21;
  $("#char-niche").value = c.niche || "";
  $("#char-attrs-summary").value = attrsSummary(c);
  $("#char-personality").value = c.personality || "";
  $("#char-backstory").value = c.backstory || "";
  $("#char-speaking").value = c.speakingStyle || "";
  $("#char-master").value = c.masterAppearance || "";
  const fl = getFaceLock(c);
  const en = $("#char-face-lock-enabled");
  const idEl = $("#char-face-lock-identity");
  const notesEl = $("#char-face-lock-notes");
  if (en) en.checked = !!fl.enabled;
  if (idEl) idEl.value = fl.shortIdentity || "";
  if (notesEl) notesEl.value = fl.notes || "";
  renderCharacterWizard(c);
  renderHeroFacePack(c);
  syncFaceLockGenUI(c);
}

function readBibleForm() {
  let age = parseInt($("#char-age").value, 10);
  if (isNaN(age) || age < 21) age = 21;
  const prevFl = getFaceLock(current());
  const faceLock = normalizeFaceLock({
    enabled: !!( $("#char-face-lock-enabled") && $("#char-face-lock-enabled").checked ),
    shortIdentity: ($("#char-face-lock-identity") && $("#char-face-lock-identity").value) || "",
    notes: ($("#char-face-lock-notes") && $("#char-face-lock-notes").value) || "",
    heroFaces: prevFl.heroFaces || [],
  });
  return {
    name: $("#char-name").value.trim() || "Unnamed",
    age,
    niche: $("#char-niche").value.trim() || "Lifestyle",
    personality: $("#char-personality").value.trim(),
    backstory: $("#char-backstory").value.trim(),
    speakingStyle: $("#char-speaking").value.trim(),
    masterAppearance: $("#char-master").value.trim(),
    faceLock,
  };
}

// ——— Prompts ———
function moodBadge(mood) {
  const map = { soft: "badge-soft", suggestive: "badge-suggestive", nsfw: "badge-nsfw" };
  const labels = { soft: "Soft", suggestive: "Suggestive", nsfw: "NSFW" };
  return '<span class="badge ' + (map[mood] || "") + '">' + (labels[mood] || mood) + "</span>";
}

function renderPrompts() {
  const c = current();
  if (!c) return;
  const filter = $("#prompt-filter").value;
  const list = (c.prompts || []).filter((p) => filter === "all" || p.mood === filter);
  const root = $("#prompt-list");
  if (!list.length) {
    root.innerHTML = '<p class="empty-inline">No prompts in this filter. Add one?</p>';
    return;
  }
  root.innerHTML = list
    .map(
      (p) =>
        '<article class="item-card" data-id="' +
        esc(p.id) +
        '"><header><h3>' +
        esc(p.title) +
        "</h3>" +
        moodBadge(p.mood) +
        '</header><div class="item-body">' +
        esc(p.scene) +
        "</div>" +
        (p.notes ? '<div class="item-notes"><strong>Notes:</strong> ' + esc(p.notes) + "</div>" : "") +
        '<div class="item-actions">' +
        '<button type="button" class="btn btn-secondary btn-sm" data-act="copy">Copy full prompt</button>' +
        '<button type="button" class="btn btn-ghost btn-sm" data-act="use">Use in scene</button>' +
        '<button type="button" class="btn btn-ghost btn-sm" data-act="edit">Edit</button>' +
        '<button type="button" class="btn btn-danger btn-sm" data-act="delete">Delete</button>' +
        "</div></article>"
    )
    .join("");
}

function openPromptDialog(prompt) {
  state.editingPromptId = prompt ? prompt.id : null;
  $("#prompt-dialog-title").textContent = prompt ? "Edit prompt" : "Add prompt";
  $("#prompt-title").value = prompt ? prompt.title : "";
  $("#prompt-mood").value = prompt ? prompt.mood : "soft";
  $("#prompt-scene").value = prompt ? prompt.scene : "";
  $("#prompt-notes").value = prompt ? prompt.notes || "" : "";
  $("#prompt-dialog").showModal();
}

// ——— Captions ———
function composeCaption(mood, topic, name) {
  const pool = CAPTION_TEMPLATES[mood] || CAPTION_TEMPLATES.shy;
  const base = pool[Math.floor(Math.random() * pool.length)];
  let extra = "";
  if (topic && topic.trim()) {
    const t = topic.trim().toLowerCase();
    const bridges = [
      " …thinking about " + t + " again ♡",
      " — and yes, there’s " + t + " in this one hehe",
      " soft note: " + t + " made me blush posting this…",
      " (" + t + " felt right tonight)",
    ];
    extra = bridges[Math.floor(Math.random() * bridges.length)];
  }
  const signoffs = ["", "\n\n— " + name, "\n\n♡ " + name];
  const sign = Math.random() < 0.45 ? signoffs[Math.floor(Math.random() * signoffs.length)] : "";
  return base + extra + sign;
}

function renderCaptions() {
  const c = current();
  if (!c) return;
  const favs = c.captionFavorites || [];
  const root = $("#caption-favs");
  if (!favs.length) {
    root.innerHTML = '<p class="empty-inline">No favorites yet. Draft one and hit ♥ Save favorite.</p>';
  } else {
    root.innerHTML = favs
      .map(
        (f) =>
          '<article class="item-card" data-fid="' +
          esc(f.id) +
          '"><p class="fav-text">' +
          esc(f.text) +
          '</p><div class="item-actions">' +
          '<button type="button" class="btn btn-secondary btn-sm" data-fact="copy">Copy</button>' +
          '<button type="button" class="btn btn-danger btn-sm" data-fact="delete">Remove</button>' +
          "</div></article>"
      )
      .join("");
  }
  $("#caption-templates").innerHTML = TEMPLATE_DISPLAY.map((t) => "<li>" + esc(t) + "</li>").join("");
}

// ——— Calendar ———
function statusBadge(status) {
  const map = { idea: "badge-idea", drafted: "badge-drafted", posted: "badge-posted" };
  return '<span class="badge ' + (map[status] || "") + '">' + esc(status) + "</span>";
}

function renderCalendar() {
  const c = current();
  if (!c) return;
  const list = c.calendar || [];
  const root = $("#calendar-list");
  if (!list.length) {
    root.innerHTML = '<p class="empty-inline">No ideas yet.</p>';
    return;
  }
  const dayOrder = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
  const sorted = [...list].sort((a, b) => {
    const da = dayOrder.indexOf(a.day);
    const db = dayOrder.indexOf(b.day);
    if (da === -1 && db === -1) return 0;
    if (da === -1) return 1;
    if (db === -1) return -1;
    return da - db;
  });
  root.innerHTML = sorted
    .map((item) => {
      return (
        '<article class="item-card" data-cid="' +
        esc(item.id) +
        '"><div class="cal-row"><div class="cal-meta"><span class="cal-day">' +
        esc(item.day) +
        "</span>" +
        statusBadge(item.status) +
        '<select class="status-select" data-field="status" aria-label="Status">' +
        ["idea", "drafted", "posted"]
          .map((s) => '<option value="' + s + '"' + (item.status === s ? " selected" : "") + ">" + s + "</option>")
          .join("") +
        '</select></div><input type="text" class="idea-input" data-field="idea" value="' +
        esc(item.idea) +
        '" aria-label="Idea" /><label class="field" style="margin:0"><span class="label">Day</span><select data-field="day">' +
        dayOrder
          .map((d) => '<option value="' + d + '"' + (item.day === d ? " selected" : "") + ">" + d + "</option>")
          .join("") +
        '</select></label><div class="item-actions"><button type="button" class="btn btn-danger btn-sm" data-cact="delete">Delete</button></div></div></article>'
      );
    })
    .join("");
}

// ——— Checklist ———
function getChecklistState(c) {
  const today = todayKey();
  const stored = c.checklist;
  if (!stored || stored.date !== today) {
    return {
      date: today,
      checked: Object.fromEntries(CHECKLIST_ITEMS.map((i) => [i.id, false])),
    };
  }
  return stored;
}

function renderChecklist() {
  const c = current();
  if (!c) return;
  let stateChk = getChecklistState(c);
  if (!c.checklist || c.checklist.date !== stateChk.date) {
    updateCharacter(c.id, { checklist: stateChk });
  }
  $("#checklist-date").textContent = formatTodayLabel();
  const ul = $("#checklist-items");
  ul.innerHTML = CHECKLIST_ITEMS.map((item) => {
    const done = !!stateChk.checked[item.id];
    return (
      '<li class="' +
      (done ? "done" : "") +
      '"><input type="checkbox" id="chk-' +
      item.id +
      '" data-chk="' +
      item.id +
      '"' +
      (done ? " checked" : "") +
      ' /><label for="chk-' +
      item.id +
      '">' +
      esc(item.label) +
      "</label></li>"
    );
  }).join("");
  const doneCount = CHECKLIST_ITEMS.filter((i) => stateChk.checked[i.id]).length;
  $("#checklist-progress").textContent = doneCount + " / " + CHECKLIST_ITEMS.length + " done";
  renderMoviePackUI(c);
}

// ——— Image generation (Pollinations, browser-only) ———
function aspectSize(aspect) {
  switch (aspect) {
    case "1:1":
      return { width: 1024, height: 1024 };
    case "9:16":
      // Soften extreme tall canvas — 768×1344 often stacks a second face/body
      return { width: 768, height: 1152 };
    case "3:4":
    default:
      return { width: 768, height: 1024 };
  }
}

/** SDXL-friendly sizes for AI Horde (divisible by 64; avoid extreme tall that stacks faces). */
function hordeAspectSize(aspect) {
  switch (aspect) {
    case "1:1":
      return { width: 1024, height: 1024 };
    case "9:16":
      // Mild tall (not 768×1344) — cuts double-head / stacked-body fails on SDXL
      return { width: 768, height: 1280 };
    case "3:4":
    default:
      return { width: 832, height: 1216 };
  }
}

const HORDE_MODELS_SOFT = [
  "ICBINP - I Can't Believe It's Not Photography",
  "ICBINP XL",
  "Realistic Vision",
  "AbsoluteReality",
  "Juggernaut XL",
  "AlbedoBase XL 3.1",
  "AlbedoBase XL (SDXL)",
  "Deliberate 3.0",
  "Analog Madness",
  "Epic Diffusion",
  "Babes",
  "Photon",
  "Realism Engine",
  "majicMIX realistic",
];
// Photoreal first for NSFW; Pony secondary; WAI anime last resort
const HORDE_MODELS_NSFW = [
  "ICBINP - I Can't Believe It's Not Photography",
  "ICBINP XL",
  "Realistic Vision",
  "AbsoluteReality",
  "Juggernaut XL",
  "AlbedoBase XL 3.1",
  "AlbedoBase XL (SDXL)",
  "Deliberate 3.0",
  "Analog Madness",
  "Epic Diffusion",
  "Babes",
  "Photon",
  "Realism Engine",
  "majicMIX realistic",
  "Pony Realism",
  "CyberRealistic Pony",
  "WAI-NSFW-illustrious-SDXL",
];
const HORDE_NEGATIVE =
  "extra faces, two heads, dual face, double face, stacked faces, faces stacked vertically, face stuck on forehead, face stuck on chest, face on torso, second pair of eyes, extra eyes, eyes on forehead, cloned face, duplicate face, multiple faces, multiple heads, fused faces, split face, mirrored duplicate face, second face, conjoined, siamese twin, long neck with second head, floating head, cropped second face, extra person, crowd, group shot, melted skin, blob, amorphous, mutated, deformed, disfigured, bad anatomy, bad hands, extra limbs, mutated neck, twisted neck, duplicate, clone, watermark, text, logo, ugly, lowres, blurry, censored";

/** OurDream-style engine packs: Photoreal (default) / Cinema / Anime */
const STYLE_PACKS = {
  photoreal: {
    id: "photoreal",
    label: "Photoreal",
    modelsSoft: null, // filled below from HORDE_MODELS_SOFT
    modelsNsfw: null,
    leadSoft:
      "photorealistic portrait, raw photo, natural skin texture, soft lighting, solo, alone, only one woman in frame, single adult woman, one head, one face only, one pair of eyes, coherent neck and shoulders, looking at viewer, coherent anatomy, natural proportions, sharp focus, 85mm",
    leadNsfw:
      "photorealistic, raw photo, natural skin texture, skin pores, solo, alone, only one woman in frame, single adult woman, one head, one face only, one pair of eyes, coherent neck and shoulders, detailed face, coherent anatomy, natural proportions, sharp focus, 85mm",
    negativeExtra: "cartoon, anime, illustration, 3d render, plastic skin",
    clipSkip: 1,
  },
  cinema: {
    id: "cinema",
    label: "Cinema",
    modelsSoft: [
      "Juggernaut XL",
      "AlbedoBase XL 3.1",
      "AlbedoBase XL (SDXL)",
      "ICBINP XL",
      "ICBINP - I Can't Believe It's Not Photography",
      "AbsoluteReality",
      "Realistic Vision",
      "Analog Madness",
      "Deliberate 3.0",
      "Epic Diffusion",
    ],
    modelsNsfw: [
      "Juggernaut XL",
      "AlbedoBase XL 3.1",
      "AlbedoBase XL (SDXL)",
      "ICBINP XL",
      "ICBINP - I Can't Believe It's Not Photography",
      "AbsoluteReality",
      "Realistic Vision",
      "Analog Madness",
      "Pony Realism",
      "CyberRealistic Pony",
      "Babes",
      "Photon",
    ],
    leadSoft:
      "cinematic still, film grain, anamorphic lens flare, dramatic lighting, shallow depth of field, movie still, color graded, 35mm, solo, alone, only one woman in frame, single adult woman, one head, one face only, one pair of eyes, coherent neck and shoulders, coherent anatomy, natural proportions",
    leadNsfw:
      "cinematic still, film grain, dramatic rim light, shallow DOF, movie still, adult scene, solo, alone, only one woman in frame, single adult woman, one head, one face only, one pair of eyes, coherent neck and shoulders, coherent anatomy, detailed face, natural proportions, 35mm, color graded",
    negativeExtra: "flat lighting, oversaturated, cartoon, anime, snapchat filter, selfie stick",
    clipSkip: 1,
  },
  anime: {
    id: "anime",
    label: "Anime",
    modelsSoft: [
      "WAI-NSFW-illustrious-SDXL",
      "Pony Realism",
      "CyberRealistic Pony",
      "AlbedoBase XL 3.1",
      "Juggernaut XL",
    ],
    modelsNsfw: [
      "WAI-NSFW-illustrious-SDXL",
      "Pony Realism",
      "CyberRealistic Pony",
      "AlbedoBase XL 3.1",
      "Juggernaut XL",
      "Babes",
    ],
    leadSoft:
      "anime illustration, clean lineart, soft cel shading, detailed eyes, vibrant colors, solo, alone, single character, one head, one face only, one pair of eyes, coherent neck and shoulders, natural proportions, beautiful lighting",
    leadNsfw:
      "anime illustration, detailed eyes, soft shading, adult content, coherent anatomy, solo, alone, single character, one head, one face only, one pair of eyes, coherent neck and shoulders, natural proportions, beautiful lighting",
    negativeExtra: "photorealistic, raw photo, 3d render, western cartoon, ugly face, extra limbs",
    clipSkip: 2,
  },
};
// Photoreal pack reuses the established Horde model lists
STYLE_PACKS.photoreal.modelsSoft = HORDE_MODELS_SOFT.slice();
STYLE_PACKS.photoreal.modelsNsfw = HORDE_MODELS_NSFW.slice();

function getStylePackId() {
  const el = $("#stylePackSeg .on");
  const fromUi = el && el.dataset.v;
  let v = fromUi || load(KEYS.stylePack, "photoreal") || "photoreal";
  if (!STYLE_PACKS[v]) v = "photoreal";
  return v;
}
function getStylePack() {
  return STYLE_PACKS[getStylePackId()] || STYLE_PACKS.photoreal;
}
function setStylePack(id) {
  const v = STYLE_PACKS[id] ? id : "photoreal";
  save(KEYS.stylePack, v);
  $$("#stylePackSeg button").forEach((b) => b.classList.toggle("on", b.dataset.v === v));
  // Mirror into Agent engines panel if present
  $$("#agentStylePackSeg button").forEach((b) => b.classList.toggle("on", b.dataset.v === v));
  return v;
}


function defaultHordeModels(mode) {
  const pack = getStylePack();
  const m = mode === "suggestive" || mode === "nsfw" ? mode : "soft";
  if (m === "nsfw") {
    return (pack.modelsNsfw || HORDE_MODELS_NSFW).slice();
  }
  return (pack.modelsSoft || HORDE_MODELS_SOFT).slice();
}

/** Shape an SD-style positive + negative for AI Horde. Returns `positive ### negative`. */
function buildHordePrompt(imagePrompt, mode) {
  const m = mode === "suggestive" || mode === "nsfw" ? mode : "soft";
  const pack = getStylePack();
  let lead = m === "nsfw" ? pack.leadNsfw : pack.leadSoft;
  const duoOn = isDuoCastEnabled();
  // Duo: drop single-subject lock so two adults can appear. Solo: reinforce one face/head.
  if (duoOn) {
    lead = String(lead || "")
      .replace(/\bsingle adult woman\b/gi, "two adult characters")
      .replace(/\bsingle person\b/gi, "two people")
      .replace(/\bsingle character\b/gi, "two characters")
      .replace(/\bone head, one face only,?\s*/gi, "")
      .replace(/\bcoherent neck and shoulders,?\s*/gi, "");
    lead = (lead + ", two distinct adults, two separate faces, clear necks and shoulders").replace(/,\s*,+/g, ", ").trim();
  } else {
    const lock =
      "solo, alone, only one woman in frame, single adult woman, one head, one face only, one pair of eyes, coherent neck and shoulders, natural proportions";
    if (!/one face only/i.test(lead)) lead = lock + ", " + lead;
    else if (!/\bsolo\b/i.test(lead)) lead = "solo, alone, only one woman in frame, " + lead;
  }
  let positive = lead + ", " + String(imagePrompt || "").replace(/\s+/g, " ").trim();
  // Cap positive before negative so total stays reasonable for workers
  const maxPos = 1400;
  if (positive.length > maxPos) {
    positive = positive.slice(0, maxPos).replace(/\s+\S*$/, "") + "…";
  }
  let neg = HORDE_NEGATIVE;
  if (duoOn) {
    // Allow two people; still ban stacked/cloned/extra faces beyond two
    neg = neg
      .replace(/\bextra person,\s*/gi, "")
      .replace(/\bcrowd,\s*/gi, "")
      .replace(/\bgroup shot,\s*/gi, "");
    neg += ", three people, crowd, group shot, third face, extra faces beyond two, fused couple, merged bodies";
  } else {
    neg += ", multiple people, two people, couple, second person";
  }
  const negExtra = pack.negativeExtra ? ", " + pack.negativeExtra : "";
  return positive + " ### " + neg + negExtra;
}

function isDuoCastEnabled() {
  try {
    const ui =
      ($("#duoCastEnabled") && $("#duoCastEnabled").checked) ||
      ($("#agentDuoCastEnabled") && $("#agentDuoCastEnabled").checked);
    if (ui) return true;
    const c = typeof current === "function" ? current() : null;
    const duo = c && getDuoCast(c);
    return !!(duo && duo.enabled);
  } catch (_) {
    return false;
  }
}

function mediaSrc(m) {
  return (m && (m.imageDataUrl || m.imageUrl)) || "";
}

const NSFW_LOCK = "Adult fictional 21+ characters only. Explicit NSFW allowed.";
const HORDE_ANON_KEY = "0000000000";
const HORDE_API = "https://stablehorde.net/api/v2";
const GROQ_API = "https://api.groq.com/openai/v1/chat/completions";
const NVIDIA_API = "https://integrate.api.nvidia.com/v1/chat/completions";
/** NVIDIA Flux image endpoints (same nvapi key as NIM chat). */
const NVIDIA_FLUX_SCHNELL = "https://ai.api.nvidia.com/v1/genai/black-forest-labs/flux.1-schnell";
const NVIDIA_FLUX_KONTEXT = "https://ai.api.nvidia.com/v1/genai/black-forest-labs/flux.1-kontext-dev";
const FLUX_MODELS = [
  { id: "schnell", label: "Schnell", url: NVIDIA_FLUX_SCHNELL, steps: 4, cfg: 0, needsImage: false, blurb: "Fast text→image" },
  { id: "kontext", label: "Kontext", url: NVIDIA_FLUX_KONTEXT, steps: 30, cfg: 3.5, needsImage: true, blurb: "Edit prior image (needs last gen)" },
];
const FLUX_MODEL_DEFAULT = "schnell";
/** NVIDIA NIM chat models for Agent (same API key). */
const NVIDIA_MODELS = [
  {
    id: "lightning",
    label: "Lightning",
    model: "nvidia/nemotron-3.5-lightning-30b-a3b",
    provider: "nvidia",
    blurb: "Fast daily Soft / Suggestive",
  },
  {
    id: "kimi",
    label: "Kimi",
    model: "moonshotai/kimi-k3",
    provider: "nvidia",
    blurb: "Balanced multimodal (default)",
  },
  {
    id: "ultra",
    label: "Ultra",
    model: "nvidia/nemotron-3-ultra-550b-a55b",
    provider: "nvidia",
    blurb: "Heavy reasoning / long threads",
  },
  {
    id: "lexi",
    label: "Dolphin",
    model: "cognitivecomputations/dolphin-mistral-24b-venice-edition",
    provider: "openrouter",
    blurb: "Uncensored NSFW / roleplay (OpenRouter · Venice Dolphin)",
  },
];
const OPENROUTER_API = "https://openrouter.ai/api/v1/chat/completions";
const OPENROUTER_APP_URL = "https://mohammadalrawahneh76-code.github.io/lumora-personal-phone/";
const OPENROUTER_APP_TITLE = "Lumora Personal";
/* Featherless API removed — Dolphin uses OpenRouter. KEYS.featherlessKey still migrated via getOpenRouterKey. */
const NVIDIA_MODEL_DEFAULT = "kimi";

const GROQ_MODELS = [
  "llama-3.3-70b-versatile",
  "llama-3.1-8b-instant",
  "openai/gpt-oss-20b",
  "openai/gpt-oss-120b",
];
const IMAGE_PROMPT_MAX = 1400;
const IMAGE_MASTER_SNIPPET = 400;
const POLLINATIONS_URL_SAFE = 1800;

/** Rewrite scene phrases that commonly birth a second face (mirror reflection, etc.). */
function sanitizeSceneForSingleSubject(scene) {
  let s = String(scene || "");
  s = s.replace(/shy eye contact in the reflection/gi, "looking at the phone camera, shy eye contact");
  s = s.replace(/eye contact in (the )?reflection/gi, "looking at the phone camera");
  s = s.replace(/looking at camera with shy eye contact in (the )?reflection/gi, "looking at the phone camera with shy eye contact");
  s = s.replace(/in the reflection,/gi, "toward camera,");
  return s;
}

function buildFullPrompt(c, scene) {
  return (c.masterAppearance || "") + "\n\nScene:\n" + scene;
}

/** Short identity for image APIs (Pollinations URL length / Horde). Copy/preview still use buildFullPrompt. */
function buildImagePrompt(c, scene, mode) {
  const a = (c && c.attrs) || {};
  let age = parseInt(c && c.age, 10);
  if (isNaN(age) || age < 22) age = 22;
  const fl = getFaceLock(c);
  const sceneText = sanitizeSceneForSingleSubject(String(scene || "").trim());
  const m = mode === "suggestive" || mode === "nsfw" ? mode : "soft";

  // APOB-style face-lock: ONLY shortIdentity + scene (never re-expand full master into image URL)
  if (fl.enabled) {
    let shortId = String(fl.shortIdentity || "").trim();
    if (!shortId) shortId = compressMasterToShortIdentity(c);
    const heroNote =
      fl.heroFaces && fl.heroFaces.length
        ? "\nMatch hero face pack (pinned hero stills — same face every time)."
        : "";
    const duoBlock = duoCastPromptBlock(c);
    const dressNote = dressRefPromptNote(c);
    const sceneAug = [sceneText, dressNote].filter(Boolean).join("\n");
    let prompt =
      "Identity lock (keep face/body consistent — change only scene/outfit/pose):\n" +
      shortId +
      heroNote +
      (duoBlock ? "\n\n" + duoBlock : "") +
      "\n\nScene:\n" +
      sceneAug;
    if (m === "nsfw") prompt = NSFW_LOCK + "\n\n" + prompt;
    if (prompt.length > IMAGE_PROMPT_MAX) {
      const head =
        (m === "nsfw" ? NSFW_LOCK + "\n\n" : "") +
        "Identity lock (keep face/body consistent — change only scene/outfit/pose):\n" +
        shortId +
        "\n\nScene:\n";
      const room = Math.max(80, IMAGE_PROMPT_MAX - head.length - 1);
      prompt = head + sceneText.slice(0, room) + "…";
    }
    return prompt;
  }

  const identity = [];
  identity.push((c && c.name ? c.name : "Character") + ", adult age " + age + "+.");
  if (a.gender) identity.push("Gender: " + a.gender + ".");
  if (a.ethnicity && a.ethnicity !== "Any") identity.push("Look: " + a.ethnicity + ".");
  if (a.hair) identity.push("Hair: " + a.hair + ".");
  if (a.eyes) identity.push("Eyes: " + a.eyes + ".");
  if (a.body) identity.push("Body: " + a.body + ".");
  if (a.style) identity.push("Style: " + a.style + ".");
  if (a.details) identity.push("Details: " + String(a.details).slice(0, 120) + ".");
  const compact = identity.slice(0, 8).join("\n");

  let masterBit = String((c && c.masterAppearance) || "").trim();
  if (masterBit.length > IMAGE_MASTER_SNIPPET) {
    masterBit = masterBit.slice(0, IMAGE_MASTER_SNIPPET).replace(/\s+\S*$/, "") + "…";
  }

  const duoBlock2 = duoCastPromptBlock(c);
  const dressNote2 = dressRefPromptNote(c);
  const sceneAug2 = [sceneText, dressNote2].filter(Boolean).join("\n");
  let prompt =
    "Identity lock (keep consistent):\n" +
    compact +
    (masterBit ? "\n\n" + masterBit : "") +
    (duoBlock2 ? "\n\n" + duoBlock2 : "") +
    "\n\nScene:\n" +
    sceneAug2;

  if (m === "nsfw") prompt = NSFW_LOCK + "\n\n" + prompt;

  if (prompt.length > IMAGE_PROMPT_MAX) {
    // Keep identity + scene; drop master snippet first, then trim scene tail
    prompt =
      (m === "nsfw" ? NSFW_LOCK + "\n\n" : "") +
      "Identity lock (keep consistent):\n" +
      compact +
      "\n\nScene:\n" +
      sceneText;
    if (prompt.length > IMAGE_PROMPT_MAX) {
      const head =
        (m === "nsfw" ? NSFW_LOCK + "\n\n" : "") +
        "Identity lock (keep consistent):\n" +
        compact +
        "\n\nScene:\n";
      const room = Math.max(80, IMAGE_PROMPT_MAX - head.length - 1);
      prompt = head + sceneText.slice(0, room) + "…";
    }
  }
  return prompt;
}

function getGenMode() {
  const btn = $("#modeSeg .on");
  const v = (btn && btn.dataset.v) || load(KEYS.genMode, "soft") || "soft";
  return v === "suggestive" || v === "nsfw" ? v : "soft";
}

function setGenMode(mode) {
  const m = mode === "suggestive" || mode === "nsfw" ? mode : "soft";
  save(KEYS.genMode, m);
  $$("#modeSeg button").forEach((b) => b.classList.toggle("on", b.dataset.v === m));
  syncProviderForMode(m);
  return m;
}

function getGenProvider() {
  // BluesMinds is the sole image backend
  const el = $("#genProvider");
  if (el && el.value !== "bluesminds") el.value = "bluesminds";
  const v = load(KEYS.genProvider, "") || "";
  if (v !== "bluesminds") save(KEYS.genProvider, "bluesminds");
  return "bluesminds";
}

/** Provider card UI removed — no-ops keep any lingering callers safe. */
function syncProviderCards(_provider) {}
function syncChatEngineCards(_modelId) {}

function setGenProvider(provider) {
  const p = "bluesminds";
  const el = $("#genProvider");
  if (el) el.value = p;
  save(KEYS.genProvider, p);
  if (typeof updateGenProviderNote === "function") updateGenProviderNote(p);
  return p;
}


function syncUseHordeBtn() {
  const btn = $("#useHordeBtn");
  if (btn) btn.hidden = true;
}

function syncProviderForMode(_mode) {
  setGenProvider("bluesminds");
  syncUseHordeBtn();
}

function prepareGenPrompt(full, mode) {
  if (mode === "nsfw") return NSFW_LOCK + "\n\n" + full;
  return full;
}

function resolveGenProvider(_mode, _imagePrompt) {
  return "bluesminds";
}

function buildPollinationsUrl(prompt, aspect, mode) {
  const { width, height } = aspectSize(aspect);
  const m = mode || getGenMode();
  const params = new URLSearchParams({
    width: String(width),
    height: String(height),
    nologo: "true",
    enhance: "true",
  });
  if (m === "soft") params.set("safe", "true");
  else params.set("safe", "false");
  if (m === "nsfw") params.set("private", "true");
  const seedEl = $("#genSeed");
  const modelEl = $("#genModel");
  const seed = seedEl ? seedEl.value.trim() : "";
  let model = modelEl ? modelEl.value.trim() : "";
  if (!model && m === "nsfw") model = "flux";
  if (seed) params.set("seed", seed);
  else params.set("seed", String(Math.floor(Math.random() * 1e9)));
  if (model) params.set("model", model);
  // Pollinations has no separate negative field — bake single-subject lock into the prompt
  let shaped = String(prompt || "").trim();
  if (!isDuoCastEnabled()) {
    shaped +=
      ". solo, alone, only one woman in frame, one head, one face only, one pair of eyes, coherent neck, natural proportions, no second face, no stacked faces, no extra eyes";
  }
  if (shaped.length > POLLINATIONS_URL_SAFE) {
    shaped = shaped.slice(0, POLLINATIONS_URL_SAFE).replace(/\s+\S*$/, "") + "…";
  }
  return (
    "https://image.pollinations.ai/prompt/" +
    encodeURIComponent(shaped) +
    "?" +
    params.toString()
  );
}

function getHordeKey() {
  const el = $("#genHordeKey");
  const fromInput = el ? el.value.trim() : "";
  if (fromInput) return fromInput;
  const stored = load(KEYS.hordeKey, "");
  return stored || HORDE_ANON_KEY;
}

/** True only when the user pasted a real Horde key (anon 0000000000 does not count). */
function hasRealHordeKey() {
  const k = String(getHordeKey() || "").trim();
  return !!(k && k !== HORDE_ANON_KEY && k.length >= 8);
}

function getGroqKey() {
  const el = $("#agentGroqKey");
  const fromInput = el ? el.value.trim() : "";
  if (fromInput) return fromInput;
  return load(KEYS.groqKey, "") || "";
}


function getBluesmindsKey() {
  const el = $("#agentBluesmindsKey");
  const fromInput = el ? el.value.trim() : "";
  if (fromInput) return fromInput;
  return load(KEYS.bluesmindsKey, "") || "";
}

const BLUESMINDS_MODEL_DEFAULT = "gemma-4-26b";

function getBluesmindsModel() {
  const el = $("#agentBluesmindsModel");
  const fromInput = el ? el.value.trim() : "";
  if (fromInput) return fromInput;
  return load(KEYS.bluesmindsModel, BLUESMINDS_MODEL_DEFAULT) || BLUESMINDS_MODEL_DEFAULT;
}

const BLUESMINDS_IMAGE_API = "https://api.bluesminds.com/v1/images/generations";
const BLUESMINDS_IMAGE_MODEL_DEFAULT = "gemini-2.5-flash-image";

function getBluesmindsImageModel() {
  const el = $("#agentBluesmindsImageModel");
  const fromInput = el ? el.value.trim() : "";
  if (fromInput) return fromInput;
  const stored =
    (KEYS.bluesmindsImageModel && load(KEYS.bluesmindsImageModel, "")) || "";
  return stored || BLUESMINDS_IMAGE_MODEL_DEFAULT;
}

/** Map Lumora aspects to OpenAI-compatible sizes BluesMinds accepts. */
function bluesmindsAspectSize(aspect) {
  switch (aspect) {
    case "1:1":
      return "1024x1024";
    case "9:16":
      return "1024x1536";
    case "3:4":
    default:
      return "1024x1536";
  }
}

/**
 * BluesMinds OpenAI-compatible images/generations.
 * Returns a data: URL or https URL suitable for preview / assertUsableGenImage.
 */
async function generateWithBluesminds(prompt, aspect, mode, opts) {
  opts = opts || {};
  const onStatus = typeof opts.onStatus === "function" ? opts.onStatus : null;
  const key = typeof getBluesmindsKey === "function" ? getBluesmindsKey() : "";
  if (!key) {
    throw new Error(
      "Paste your BluesMinds key under Agent → Chat (same key for images)."
    );
  }
  const model = getBluesmindsImageModel();
  const size = bluesmindsAspectSize(aspect);
  const shaped = String(prompt || "").trim();
  if (!shaped) throw new Error("Describe a scene first");

  if (onStatus) onStatus("BluesMinds · generating…");

  async function postOnce(includeSize) {
    const payload = { model: model, prompt: shaped };
    if (includeSize) payload.size = size;
    let res;
    try {
      res = await fetch(BLUESMINDS_IMAGE_API, {
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
        (err && err.message) ||
          "Could not reach BluesMinds images API (network or CORS)."
      );
    }
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const errObj = data && data.error;
      const msg =
        (errObj &&
          (typeof errObj === "string"
            ? errObj
            : errObj.message || errObj.code)) ||
        (data && (data.message || data.detail)) ||
        "";
      const textMsg = typeof msg === "string" ? msg : JSON.stringify(msg || "");
      const err = new Error(textMsg || "BluesMinds image error (" + res.status + ")");
      err.status = res.status;
      err.body = textMsg;
      throw err;
    }
    const item =
      data && Array.isArray(data.data) && data.data.length ? data.data[0] : null;
    if (!item) throw new Error("BluesMinds returned no image data");
    if (item.b64_json) {
      const b64 = String(item.b64_json).trim();
      if (!b64) throw new Error("Empty BluesMinds b64_json");
      // Assume PNG unless url hints otherwise — data URL works for preview
      return "data:image/png;base64," + b64;
    }
    if (item.url) {
      const u = String(item.url).trim();
      if (!u) throw new Error("Empty BluesMinds image url");
      return u;
    }
    throw new Error("BluesMinds response missing b64_json and url");
  }

  try {
    return await postOnce(true);
  } catch (err) {
    const msg = String((err && err.message) || "");
    const status = err && err.status;
    // Size rejected or unsupported — retry without size
    if (
      status === 400 ||
      /size|invalid|unsupported|not support/i.test(msg)
    ) {
      if (onStatus) onStatus("BluesMinds · retrying without size…");
      return await postOnce(false);
    }
    if (status === 401 || status === 403) {
      throw new Error(
        "Invalid BluesMinds key — paste it under Agent → Chat (api.bluesminds.com/console/token)."
      );
    }
    if (status === 429) {
      throw new Error("BluesMinds rate limit — wait a moment and try again.");
    }
    if (status === 404 || /model|not found|deprecat/i.test(msg)) {
      throw new Error(
        "BluesMinds image model unavailable (" +
          model +
          ") — try gemini-2.5-flash-image."
      );
    }
    throw err;
  }
}



function getNvidiaKey() {
  const el = $("#agentNvidiaKey");
  const fromInput = el ? el.value.trim() : "";
  if (fromInput) return fromInput;
  return load(KEYS.nvidiaKey, "") || "";
}

/** Optional Cloudflare Worker base that CORS-proxies NVIDIA NIM + Flux. */
function getNvidiaProxyBase() {
  const el = $("#agentNvidiaProxy");
  const fromInput = el ? el.value.trim() : "";
  let v = fromInput || load(KEYS.nvidiaProxy, "") || "";
  v = String(v).trim().replace(/\/+$/, "");
  return v;
}

const NVIDIA_PROXY_HOSTS = new Set([
  "integrate.api.nvidia.com",
  "ai.api.nvidia.com",
]);

/**
 * fetch() for NVIDIA URLs. When a CORS proxy URL is stored in localStorage,
 * rewrites to POST {proxyBase}/nvidia?u=<encoded absolute URL>.
 * Otherwise direct fetch (often blocked by browser CORS on GitHub Pages).
 */
function nvidiaFetch(url, init) {
  const base = getNvidiaProxyBase();
  let fetchUrl = url;
  if (base) {
    try {
      const u = new URL(url);
      if (NVIDIA_PROXY_HOSTS.has(u.hostname)) {
        fetchUrl = base + "/nvidia?u=" + encodeURIComponent(u.toString());
      }
    } catch (_) {}
  }
  return fetch(fetchUrl, init);
}

function updateGenProviderNote(_provider) {
  const note = $("#genProviderNote");
  if (!note) return;
  note.textContent = "Images via BluesMinds (same key as Agent chat).";
}

function getFluxModelId() {
  const el = $("#genFluxModelSeg");
  if (el) {
    const on = el.querySelector("button.on");
    if (on && on.dataset.v) return on.dataset.v;
  }
  const stored = load(KEYS.fluxModel, FLUX_MODEL_DEFAULT) || FLUX_MODEL_DEFAULT;
  return FLUX_MODELS.some((m) => m.id === stored) ? stored : FLUX_MODEL_DEFAULT;
}

function getFluxModelMeta() {
  const id = getFluxModelId();
  return (
    FLUX_MODELS.find((m) => m.id === id) ||
    FLUX_MODELS.find((m) => m.id === FLUX_MODEL_DEFAULT)
  );
}

function setFluxModel(id) {
  const meta = FLUX_MODELS.find((m) => m.id === id);
  const use = meta ? meta.id : FLUX_MODEL_DEFAULT;
  save(KEYS.fluxModel, use);
  const seg = $("#genFluxModelSeg");
  if (seg) {
    $$("button", seg).forEach((b) => b.classList.toggle("on", b.dataset.v === use));
  }
  return use;
}

function syncFluxModelVisibility() {
  const field = $("#genFluxModelField") || $("#genFluxModelSeg");
  if (field) field.hidden = true;
  const hint = $("#genFluxHint");
  if (hint) hint.hidden = true;
}

/** Snap to sizes NVIDIA Flux Schnell cloud API accepts. */
function fluxAspectSize(aspect) {
  switch (aspect) {
    case "1:1":
      return { width: 1024, height: 1024 };
    case "9:16":
      return { width: 768, height: 1344 };
    case "3:4":
    default:
      return { width: 768, height: 1024 };
  }
}

function extractFluxB64(data) {
  if (!data) return "";
  if (typeof data === "string") {
    const s = data.trim();
    if (s.startsWith("data:image")) return s;
    if (/^[A-Za-z0-9+/=\s]+$/.test(s) && s.length > 64) return s.replace(/\s+/g, "");
  }
  const art = data.artifacts && data.artifacts[0];
  if (art) {
    if (art.base64) return art.base64;
    if (art.b64_json) return art.b64_json;
    if (art.image) return art.image;
  }
  const d0 = data.data && data.data[0];
  if (d0) {
    if (d0.b64_json) return d0.b64_json;
    if (d0.base64) return d0.base64;
    if (d0.url) return d0.url;
  }
  if (data.image) return data.image;
  if (data.b64_json) return data.b64_json;
  if (data.base64) return data.base64;
  return "";
}

function fluxB64ToDataUrl(raw) {
  let s = String(raw || "").trim();
  if (!s) return "";
  if (/^https?:\/\//i.test(s)) return s;
  if (s.startsWith("data:image")) return s;
  s = s.replace(/^data:image\/[^;]+;base64,/, "");
  return "data:image/jpeg;base64," + s;
}

/**
 * NVIDIA Flux image gen (Schnell text→image; Kontext edit when prior image available).
 * Returns a data: or https URL. Throws on failure (caller falls back to Horde/Pollinations).
 */
async function generateWithNvidiaFlux(prompt, aspect, mode, opts) {
  opts = opts || {};
  const onStatus = typeof opts.onStatus === "function" ? opts.onStatus : null;
  const key = typeof getNvidiaKey === "function" ? getNvidiaKey() : "";
  if (!key) {
    throw new Error("NVIDIA Flux key not available — using default image backend.");
  }
  let meta = getFluxModelMeta();
  let imageB64 = opts.image || "";
  // Kontext requires an input image — fall back to Schnell for pure text→image
  if (meta && meta.needsImage && !imageB64) {
    const last = (state && state.lastGenUrl) || "";
    if (typeof last === "string" && last.startsWith("data:image")) {
      imageB64 = last;
    } else {
      if (onStatus) onStatus("Flux Kontext needs a prior image — using Schnell…");
      meta = FLUX_MODELS.find((m) => m.id === "schnell") || meta;
    }
  }
  const { width, height } = fluxAspectSize(aspect);
  const seedEl = $("#genSeed");
  const seedRaw = seedEl ? seedEl.value.trim() : "";
  let seed = parseInt(seedRaw, 10);
  if (isNaN(seed) || seed < 0) seed = Math.floor(Math.random() * 1e9);
  const payload = {
    prompt: String(prompt || "").slice(0, 10000),
    width,
    height,
    cfg_scale: meta.cfg,
    samples: 1,
    seed,
    steps: meta.steps,
  };
  if (meta.id === "schnell") {
    payload.mode = "base";
  }
  if (meta.needsImage && imageB64) {
    payload.image = imageB64.startsWith("data:")
      ? imageB64
      : "data:image/png;base64," + imageB64;
    payload.aspect_ratio = "match_input_image";
  }
  if (onStatus) onStatus("Flux " + meta.label + " · generating…");
  let res;
  try {
    res = await nvidiaFetch(meta.url, {
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
    const via = getNvidiaProxyBase() ? "proxy" : "direct (no CORS proxy)";
    throw new Error(
      (err && err.message) ||
        "Could not reach NVIDIA Flux via " + via + " — falling back to Horde."
    );
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg =
      (data && (data.message || data.detail || data.title || data.error)) || "";
    const textMsg = typeof msg === "string" ? msg : JSON.stringify(msg);
    if (res.status === 401 || res.status === 403) {
      throw new Error("Invalid NVIDIA NIM key — falling back to default image backend.");
    }
    if (res.status === 429) {
      throw new Error("NVIDIA Flux rate limit — wait a moment and try again.");
    }
    throw new Error(textMsg || "NVIDIA Flux error (" + res.status + ")");
  }
  const raw = extractFluxB64(data);
  const url = fluxB64ToDataUrl(raw);
  if (!url) throw new Error("NVIDIA Flux returned no image data");
  if (onStatus) onStatus("Flux " + meta.label + " · ready");
  return url;
}

function getOpenRouterKey() {
  const el = $("#agentOpenRouterKey") || $("#agentFeatherlessKey");
  const fromInput = el ? el.value.trim() : "";
  if (fromInput) return fromInput;
  return load(KEYS.openrouterKey, "") || load(KEYS.featherlessKey, "") || "";
}
function getFeatherlessKey() {
  return getOpenRouterKey();
}

function getNvidiaModelId() {
  const el = $("#agentNvidiaModelSeg");
  if (el) {
    const on = el.querySelector("button.on");
    if (on && on.dataset.v) return on.dataset.v;
  }
  const stored = load(KEYS.nvidiaModel, NVIDIA_MODEL_DEFAULT) || NVIDIA_MODEL_DEFAULT;
  return NVIDIA_MODELS.some((m) => m.id === stored) ? stored : NVIDIA_MODEL_DEFAULT;
}

function getNvidiaModelMeta() {
  const id = getNvidiaModelId();
  return (
    NVIDIA_MODELS.find((m) => m.id === id) ||
    NVIDIA_MODELS.find((m) => m.id === NVIDIA_MODEL_DEFAULT)
  );
}

function setNvidiaModel(id) {
  const meta = NVIDIA_MODELS.find((m) => m.id === id);
  const use = meta ? meta.id : NVIDIA_MODEL_DEFAULT;
  save(KEYS.nvidiaModel, use);
  const seg = $("#agentNvidiaModelSeg");
  if (seg) {
    $$("button", seg).forEach((b) => b.classList.toggle("on", b.dataset.v === use));
  }
  if (typeof syncChatEngineCards === "function") syncChatEngineCards(use);
  return use;
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function hordeErrorMessage(status, json, fallback) {
  const msg = (json && (json.message || json.error || json.errors)) || "";
  const text = typeof msg === "string" ? msg : JSON.stringify(msg);
  if (status === 401 || status === 403) {
    return "AI Horde auth failed — check your API key (or use anonymous 0000000000).";
  }
  if (status === 429) {
    return "AI Horde rate limit — wait a minute, or paste a free key from stablehorde.net.";
  }
  if (status >= 500) {
    return "AI Horde is temporarily unavailable (" + status + "). Try again shortly.";
  }
  if (/kudos|rate|limit|slow|maintenance/i.test(text)) {
    return text || fallback;
  }
  return text || fallback || ("AI Horde error (" + status + ")");
}

async function generateWithHorde(prompt, aspect, mode, opts) {
  const { width, height } = hordeAspectSize(aspect);
  const seedEl = $("#genSeed");
  const modelEl = $("#genModel");
  const seedRaw = seedEl ? seedEl.value.trim() : "";
  const modelOverride = modelEl ? modelEl.value.trim() : "";
  const allowNsfw = mode === "suggestive" || mode === "nsfw";
  const m = mode === "suggestive" || mode === "nsfw" ? mode : "soft";
  const models = modelOverride ? [modelOverride] : defaultHordeModels(m);
  const pack = getStylePack();
  // Photoreal/Cinema clip_skip 1; Anime pack 2; user anime/pony override also 2
  const animeOrPony = !!(
    (modelOverride &&
      /pony|illustrious|anime|hentai|orange.?mix|wai-nsfw/i.test(modelOverride)) ||
    pack.id === "anime"
  );
  const params = {
    width,
    height,
    n: 1,
    steps: 30,
    cfg_scale: 6.5,
    sampler_name: "k_dpmpp_2m",
    clip_skip: animeOrPony ? 2 : pack.clipSkip || 1,
  };
  if (seedRaw && /^\d+$/.test(seedRaw)) params.seed = seedRaw;
  const shaped = buildHordePrompt(prompt, m);
  const body = {
    prompt: shaped,
    nsfw: allowNsfw,
    censor_nsfw: !allowNsfw,
    r2: true,
    shared: false,
    trusted_workers: false,
    slow_workers: true,
    models,
    params,
  };
  toast("Queuing free image job — can take 1–3 min…");
  const apikey = getHordeKey();
  const headers = {
    "Content-Type": "application/json",
    apikey,
    "Client-Agent": "LumoraPersonal:1.0:github.com/lumora",
  };
  let submit;
  try {
    submit = await fetch(HORDE_API + "/generate/async", {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });
  } catch (netErr) {
    throw new Error("Could not reach AI Horde — check your connection and try again.");
  }
  const submitJson = await submit.json().catch(() => ({}));
  if (!submit.ok) {
    throw new Error(
      hordeErrorMessage(
        submit.status,
        submitJson,
        "AI Horde rejected the request (" + submit.status + ")"
      )
    );
  }
  const id = submitJson.id;
  if (!id) throw new Error("AI Horde did not return a job id");
  opts = opts || {};
  const onStatus = typeof opts.onStatus === "function" ? opts.onStatus : null;
  const emitStatus = (t) => {
    setHordeQueueStatus(t);
    if (onStatus) onStatus(t);
  };
  emitStatus("Waiting for a worker…");
  const deadline = Date.now() + 360000; // 6 min — NSFW/anonymous queues can be slow
  let done = false;
  let lastCheck = {};
  while (Date.now() < deadline) {
    await sleep(3000);
    let checkRes;
    try {
      checkRes = await fetch(HORDE_API + "/generate/check/" + encodeURIComponent(id), {
        headers: { apikey, "Client-Agent": headers["Client-Agent"] },
      });
    } catch (_) {
      continue;
    }
    const check = await checkRes.json().catch(() => ({}));
    lastCheck = check;
    if (!checkRes.ok) {
      throw new Error(
        hordeErrorMessage(checkRes.status, check, "AI Horde check failed")
      );
    }
    if (check.faulted) {
      throw new Error(
        (check.message && String(check.message)) ||
          "AI Horde job faulted — try again or change model/size."
      );
    }
    if (check.is_possible === false) {
      throw new Error(
        "No AI Horde workers available for this request — try again later or clear the model override."
      );
    }
    {
      const q = check.queue_position;
      if (check.done) {
        emitStatus("Finished — fetching image…");
      } else if (typeof q === "number" && q > 0) {
        emitStatus("Queue #" + q + " (hang tight)…");
      } else if (check.processing) {
        emitStatus("Generating…");
      } else {
        emitStatus("Waiting for a worker…");
      }
    }
    if (check.done) {
      done = true;
      break;
    }
  }
  if (!done) {
    const q = lastCheck && lastCheck.queue_position;
    const waitHint =
      typeof q === "number"
        ? " (still queue #" + q + ")"
        : lastCheck && lastCheck.waiting
          ? " (waiting for a worker)"
          : "";
    throw new Error(
      "AI Horde timed out" + waitHint + " — try again, or use a free key from stablehorde.net for priority."
    );
  }
  const statusRes = await fetch(HORDE_API + "/generate/status/" + encodeURIComponent(id), {
    headers: { apikey, "Client-Agent": headers["Client-Agent"] },
  });
  const status = await statusRes.json().catch(() => ({}));
  if (!statusRes.ok) {
    throw new Error(
      hordeErrorMessage(statusRes.status, status, "AI Horde status failed")
    );
  }
  const gens = (status && status.generations) || [];
  const gen0 = gens[0];
  if (!gen0) throw new Error("Image job returned no generations — workers may have been busy.");
  // Workers return censored:true with a black placeholder — never treat as success
  if (gen0.censored) {
    throw new Error(
      "Image was censored (black frame). Soften the scene, try Soft mode, or try again."
    );
  }
  const img = gen0.img;
  if (!img) throw new Error("Image job returned no image data — try again.");
  if (/^https?:\/\//i.test(img)) return img;
  if (img.startsWith("data:")) return img;
  return "data:image/webp;base64," + img;
}

function setGenLoading(on) {
  state.genLoading = !!on;
  const btn = $("#generateImageBtn");
  if (btn) {
    btn.disabled = !!on;
    btn.classList.toggle("is-loading", !!on);
    btn.textContent = on ? "Generating…" : "Generate image";
  }
  const sk = $("#genPreviewSkeleton");
  if (sk) {
    sk.hidden = !on;
    if (!on) sk.textContent = "Generating…";
  }
  if (!on && !state.agentLoading && !state.storyboardRunning) {
    clearHordeQueueStatus();
  }
  syncAgentGenBtn();
}

function syncAgentGenBtn() {
  const btn = $("#agentGenBtn");
  const vidBtn = $("#agentVideoBtn");
  const busy = !!(state.agentLoading || state.genLoading);
  const imgBusyText =
    busy && state.genLoading && !state.agentLoading
      ? "Generating…"
      : busy && state.agentLoading
        ? (state.agentStatusText &&
          /Queuing|Horde|Pollinations|Building|Image Engine|Video Engine/i.test(
            state.agentStatusText
          )
            ? /Video Engine/i.test(state.agentStatusText || "")
              ? "Video…"
              : "Generating…"
            : "Working…")
        : "Generate image";
  if (btn) {
    btn.disabled = busy;
    btn.classList.toggle("is-loading", busy);
    btn.textContent = imgBusyText;
  }
  if (vidBtn) {
    vidBtn.disabled = busy;
    vidBtn.classList.toggle("is-loading", busy && /Video Engine/i.test(state.agentStatusText || ""));
    vidBtn.textContent =
      busy && /Video Engine/i.test(state.agentStatusText || "")
        ? "Video…"
        : "Generate video";
  }
  const sendBtn = $("#agentSendBtn");
  if (sendBtn) sendBtn.disabled = !!state.agentLoading;
}

function prepareGenPreviewFrame() {
  const wrap = $("#genPreview");
  const img = $("#genPreviewImg");
  const frame = $("#genPreviewFrame");
  if (!wrap || !img) return null;
  wrap.hidden = false;
  const aspectBtn = $("#aspectSeg .on");
  const aspect = (aspectBtn && aspectBtn.dataset.v) || "3:4";
  const ratioCss = aspect.replace(":", "/");
  if (frame) frame.style.aspectRatio = ratioCss;
  const sk = $("#genPreviewSkeleton");
  if (sk) sk.style.aspectRatio = ratioCss;
  img.hidden = true;
  img.removeAttribute("src");
  img.onload = null;
  img.onerror = null;
  try {
    img.referrerPolicy = "no-referrer";
  } catch (_) {}
  return { wrap, img, frame };
}

async function tryFetchImageAsBlobUrl(url) {
  const res = await fetch(url, {
    mode: "cors",
    credentials: "omit",
    referrerPolicy: "no-referrer",
  });
  if (!res.ok) throw new Error("HTTP " + res.status);
  const blob = await res.blob();
  if (!blob || !String(blob.type || "").startsWith("image/")) {
    throw new Error("Not an image");
  }
  if (blob.size < 800) {
    throw new Error("Image file too small (likely empty)");
  }
  const objUrl = URL.createObjectURL(blob);
  state.objectUrls.push(objUrl);
  return objUrl;
}

/** Resolve only after the browser actually decodes pixels (naturalWidth > 0). */
function waitImageLoad(url, timeoutMs) {
  return new Promise((resolve, reject) => {
    const ms = timeoutMs || 45000;
    const img = new Image();
    let settled = false;
    const finish = (fn) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      img.onload = null;
      img.onerror = null;
      try {
        img.removeAttribute("src");
      } catch (_) {}
      fn();
    };
    const timer = setTimeout(() => {
      finish(() => reject(new Error("Image load timed out")));
    }, ms);
    img.onload = () => {
      const ok = img.naturalWidth > 0 && img.naturalHeight > 0;
      finish(() => {
        if (ok) resolve(url);
        else reject(new Error("Image loaded empty (0×0)"));
      });
    };
    img.onerror = () => {
      finish(() => reject(new Error("Image failed to load in browser")));
    };
    try {
      img.referrerPolicy = "no-referrer";
    } catch (_) {}
    img.src = url;
  });
}

/**
 * Reject 0×0, tiny, or near-black (censored placeholder) frames.
 * Canvas sample is best-effort — CORS-tainted bitmaps skip luminance and still require naturalWidth.
 */
async function assertUsableGenImage(url) {
  const raw = String(url || "").trim();
  if (!raw) throw new Error("No image URL");
  await waitImageLoad(raw, 60000);
  return new Promise((resolve, reject) => {
    const img = new Image();
    let settled = false;
    const done = (fn) => {
      if (settled) return;
      settled = true;
      try {
        img.removeAttribute("src");
      } catch (_) {}
      fn();
    };
    img.onload = () => {
      try {
        const w = img.naturalWidth || 0;
        const h = img.naturalHeight || 0;
        if (w < 32 || h < 32) {
          done(() => reject(new Error("Image too small (" + w + "×" + h + ")")));
          return;
        }
        const sw = Math.min(48, w);
        const sh = Math.min(48, h);
        const canvas = document.createElement("canvas");
        canvas.width = sw;
        canvas.height = sh;
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        if (!ctx) {
          done(() => resolve(raw));
          return;
        }
        ctx.drawImage(img, 0, 0, sw, sh);
        let data;
        try {
          data = ctx.getImageData(0, 0, sw, sh).data;
        } catch (_) {
          // Tainted canvas (cross-origin without CORS) — dimensions already OK
          done(() => resolve(raw));
          return;
        }
        let sum = 0;
        let count = 0;
        for (let i = 0; i < data.length; i += 4) {
          if (data[i + 3] < 16) continue;
          sum += data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
          count++;
        }
        const avg = count ? sum / count : 0;
        if (count > 10 && avg < 6) {
          done(() =>
            reject(
              new Error(
                "Image came back blank/black (likely censored). Soften the scene or try again."
              )
            )
          );
          return;
        }
        done(() => resolve(raw));
      } catch (err) {
        done(() => reject(err || new Error("Image validation failed")));
      }
    };
    img.onerror = () => done(() => reject(new Error("Image failed to load in browser")));
    try {
      img.referrerPolicy = "no-referrer";
    } catch (_) {}
    try {
      img.crossOrigin = "anonymous";
    } catch (_) {}
    img.src = raw;
  });
}

/**
 * Prefer a session blob URL when CORS fetch works; otherwise a confirmed https/data URL.
 * Never returns a URL that did not decode, or a blank/black censored frame.
 */
async function confirmAgentImage(url) {
  const raw = String(url || "").trim();
  if (!raw) throw new Error("No image URL");
  // Blob path: fetch bytes then verify decode + not blank
  try {
    const blobUrl = await tryFetchImageAsBlobUrl(raw);
    await assertUsableGenImage(blobUrl);
    return {
      chatUrl: blobUrl,
      mediaUrl: /^https?:\/\//i.test(raw) || raw.startsWith("data:") ? raw : blobUrl,
    };
  } catch (_) {}
  // Direct load (works when hotlink displays but CORS fetch is blocked)
  await assertUsableGenImage(raw);
  return { chatUrl: raw, mediaUrl: raw };
}

function softenGenFailToast(extra) {
  toast(
    extra ||
      "Couldn't load the image. Soften the scene or generate again."
  );
}

async function runBluesmindsAndShow(imagePrompt, aspect, mode) {
  prepareGenPreviewFrame();
  setGenLoading(true);
  try {
    if (typeof setHordeQueueStatus === "function") {
      setHordeQueueStatus("BluesMinds · generating…");
    }
    const url = await generateWithBluesminds(imagePrompt, aspect, mode, {
      onStatus: (t) => {
        if (typeof setHordeQueueStatus === "function") setHordeQueueStatus(t);
      },
    });
    if (typeof setHordeQueueStatus === "function") {
      setHordeQueueStatus("Verifying image…");
    }
    await assertUsableGenImage(url);
    await showGenPreview(url, {
      allowHordeFallback: false,
      imagePrompt,
      aspect,
      mode,
      timeoutMs: 90000,
    });
  } catch (err) {
    setGenLoading(false);
    state.lastGenUrl = null;
    if (typeof clearHordeQueueStatus === "function") clearHordeQueueStatus();
    toast((err && err.message) || "Image generation failed");
  }
}

function showGenPreview(url, opts) {
  opts = opts || {};
  const parts = prepareGenPreviewFrame();
  if (!parts) return Promise.resolve();
  const { img, frame } = parts;
  setGenLoading(true);

  return new Promise((resolve) => {
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      resolve();
    };

    const timeout = setTimeout(() => {
      if (state.genLoading) {
        setGenLoading(false);
        state.lastGenUrl = null;
        toast("Image generation timed out. Try again.");
      }
      finish();
    }, opts.timeoutMs || 120000);

    const succeed = (finalUrl) => {
      clearTimeout(timeout);
      setGenLoading(false);
      if (frame) frame.style.aspectRatio = "";
      img.hidden = false;
      state.lastGenUrl = finalUrl;
      toast("Image ready");
      finish();
    };

    const failBlank = (msg) => {
      clearTimeout(timeout);
      setGenLoading(false);
      state.lastGenUrl = null;
      img.hidden = true;
      try {
        img.removeAttribute("src");
      } catch (_) {}
      toast(msg || "Image came back empty — try again.");
      finish();
    };

    const failToHordeOrToast = async () => {
      clearTimeout(timeout);
      setGenLoading(false);
      state.lastGenUrl = null;
      img.hidden = true;
      softenGenFailToast();
      finish();
    };

    img.onload = async () => {
      const candidate = img.src || url;
      try {
        await assertUsableGenImage(candidate);
        succeed(candidate);
      } catch (err) {
        // Blank/black or invalid — do not leave Apply edit / Animate as a fake success
        failBlank((err && err.message) || "Image came back empty.");
      }
    };
    img.onerror = async () => {
      if (!opts._triedFetch) {
        opts._triedFetch = true;
        try {
          const blobUrl = await tryFetchImageAsBlobUrl(url);
          img.onerror = async () => {
            await failToHordeOrToast();
          };
          img.src = blobUrl;
          return;
        } catch (_) {
          await failToHordeOrToast();
          return;
        }
      }
      await failToHordeOrToast();
    };

    try {
      img.referrerPolicy = "no-referrer";
    } catch (_) {}
    img.src = url;
  });
}


/** Director-ish angle variants for photo-set / storyboard (4–6 frames). */
const STORYBOARD_ANGLES = [
  {
    id: "front",
    label: "Front",
    fragment:
      "camera angle: straight-on front view, eye-level, subject facing camera, full clear face, centered framing, portrait composition",
  },
  {
    id: "three-quarter",
    label: "3/4",
    fragment:
      "camera angle: three-quarter view, slight turn of body, face clearly visible, cinematic framing, soft depth of field",
  },
  {
    id: "side",
    label: "Side",
    fragment:
      "camera angle: side profile view, elegant silhouette, soft rim light on cheek and hair, intimate profile portrait",
  },
  {
    id: "closeup",
    label: "Close-up",
    fragment:
      "camera angle: close-up crop face and shoulders, shallow depth of field, intimate eye contact, detailed skin and freckles, 85mm feel",
  },
  {
    id: "mirror",
    label: "Mirror",
    fragment:
      "camera angle: full-length mirror selfie reflection, phone held at chest height, bathroom or bedroom mirror, candid framing",
  },
  {
    id: "over-shoulder",
    label: "Over-shoulder",
    fragment:
      "camera angle: over-the-shoulder glance back at camera, hair cascading down back, soft look over shoulder, intimate rear three-quarter",
  },
];

function expandStoryboardScenes(baseScene, count) {
  const n = Math.max(4, Math.min(6, count || 6));
  const angles = STORYBOARD_ANGLES.slice(0, n);
  const base = String(baseScene || "").trim();
  return angles.map((a) => ({
    id: a.id,
    label: a.label,
    scene: base + ", " + a.fragment,
  }));
}

function saveStoryboardFrameToMedia(c, imageUrl, label, notes, aspect, mode, angleId, setId) {
  if (!c || !imageUrl) return;
  const media = [
    {
      id: uid("m"),
      label: String(label || "Storyboard frame").slice(0, 80),
      notes: String(notes || "").slice(0, 500),
      aspect: aspect || "3:4",
      imageDataUrl: null,
      imageUrl: imageUrl,
      createdAt: new Date().toISOString(),
      source: "storyboard",
      tags: ["storyboard", angleId || "frame"].filter(Boolean),
      mode: mode || "soft",
      storyboardSetId: setId || null,
      type: "storyboard",
    },
    ...(c.media || []),
  ];
  updateCharacter(c.id, { media });
}

function setStoryboardProgress(text, current, total) {
  const el = $("#storyboardProgress");
  if (!el) return;
  if (!text) {
    el.hidden = true;
    el.textContent = "";
    return;
  }
  el.hidden = false;
  const frac = total ? " " + current + "/" + total : "";
  el.textContent = text + frac;
}

function renderStoryboardGrid(frames) {
  const grid = $("#storyboardGrid");
  if (!grid) return;
  if (!frames || !frames.length) {
    grid.hidden = true;
    grid.innerHTML = "";
    return;
  }
  grid.hidden = false;
  grid.innerHTML = frames
    .map((f) => {
      if (f.url) {
        return (
          '<figure class="sb-frame ok"><img src="' +
          esc(f.url) +
          '" alt="' +
          esc(f.label) +
          '" loading="lazy"/><figcaption>' +
          esc(f.label) +
          "</figcaption></figure>"
        );
      }
      return (
        '<figure class="sb-frame fail"><div class="sb-fail">' +
        esc(f.error || "Failed") +
        "</div><figcaption>" +
        esc(f.label) +
        "</figcaption></figure>"
      );
    })
    .join("");
}

async function runStoryboardSet() {
  const c = current();
  if (!c) return;
  if (state.genLoading || state.storyboardRunning) {
    toast("Already generating — wait for the current job");
    return;
  }
  const scene = ($("#sceneInput") && $("#sceneInput").value.trim()) || "";
  if (!scene) {
    toast("Describe a scene (or tap a preset) first");
    $("#sceneInput") && $("#sceneInput").focus();
    return;
  }
  const aspect = ($("#aspectSeg .on") && $("#aspectSeg .on").dataset.v) || "3:4";
  const mode = getGenMode();
  const variants = expandStoryboardScenes(scene, 6);
  const setId = uid("sb");
  state.storyboardRunning = true;
  state.storyboardAbort = false;
  const btn = $("#storyboardBtn");
  if (btn) {
    btn.disabled = true;
    btn.classList.add("is-loading");
  }
  const results = [];
  let okCount = 0;
  let failCount = 0;
  setStoryboardProgress("Storyboard queuing…", 0, variants.length);
  renderStoryboardGrid([]);

  for (let i = 0; i < variants.length; i++) {
    if (state.storyboardAbort) break;
    const v = variants[i];
    setStoryboardProgress("Storyboard frame", i + 1, variants.length);
    toast("Storyboard " + (i + 1) + "/" + variants.length + " · " + v.label);
    const imagePrompt = buildImagePrompt(c, v.scene, mode);
    try {
      const url = await generateWithBluesminds(imagePrompt, aspect, mode, {
        onStatus: (t) => {
          setHordeQueueStatus(t);
          setStoryboardProgress(t + " · frame", i + 1, variants.length);
        },
      });
      await assertUsableGenImage(url);
      saveStoryboardFrameToMedia(
        getCharacter(c.id) || c,
        url,
        "SB " + v.label + " · " + scene.slice(0, 40),
        v.scene,
        aspect,
        mode,
        v.id,
        setId
      );
      results.push({ label: v.label, url, id: v.id });
      okCount++;
      // Show latest in main preview too
      lightUpdateGenPreview(url);
      state.lastGenUrl = url;
      renderStoryboardGrid(results);
    } catch (err) {
      failCount++;
      results.push({
        label: v.label,
        url: null,
        id: v.id,
        error: (err && err.message) || "Failed",
      });
      renderStoryboardGrid(results);
      toast(
        "Frame " +
          (i + 1) +
          "/" +
          variants.length +
          " failed — keeping completed frames"
      );
    }
  }

  state.storyboardRunning = false;
  if (btn) {
    btn.disabled = false;
    btn.classList.remove("is-loading");
  }
  renderMedia();
  if (okCount) {
    setStoryboardProgress(
      "Storyboard done · " + okCount + " saved" + (failCount ? ", " + failCount + " failed" : ""),
      okCount,
      variants.length
    );
    toast(
      "Storyboard: " +
        okCount +
        "/" +
        variants.length +
        " saved to Media" +
        (failCount ? " (" + failCount + " failed)" : "")
    );
  } else {
    setStoryboardProgress("Storyboard failed — no frames saved", 0, variants.length);
    toast("Storyboard failed — no frames saved. Try again.");
  }
}


async function runFluxAndShow(imagePrompt, aspect, mode) {
  // Flux path retired — BluesMinds only
  await runBluesmindsAndShow(imagePrompt, aspect, mode);
}

async function generateSceneImage() {
  const c = current();
  if (!c) return;
  if (state.genLoading || state.storyboardRunning) return;

  const scene = $("#sceneInput").value.trim();
  if (!scene) {
    toast("Describe a scene first");
    $("#sceneInput").focus();
    return;
  }
  if (typeof getBluesmindsKey === "function" && !getBluesmindsKey()) {
    toast("Paste your BluesMinds key under Agent → Chat (same key for images).");
    return;
  }
  const aspect = ($("#aspectSeg .on") && $("#aspectSeg .on").dataset.v) || "3:4";
  const mode = getGenMode();
  const imagePrompt = buildImagePrompt(c, scene, mode);
  updateFullPreview();
  setGenProvider("bluesminds");
  await runBluesmindsAndShow(imagePrompt, aspect, mode);
}

function syncHordeKeyVisibility() {
  const hordeField = $("#genHordeKeyField");
  if (hordeField) hordeField.hidden = true;
  const modelField = $("#genModel");
  if (modelField) {
    const wrap = modelField.closest("label.field") || modelField.parentElement;
    if (wrap) wrap.hidden = true;
  }
  syncUseHordeBtn();
  if (typeof syncFluxModelVisibility === "function") syncFluxModelVisibility();
}

// ——— Media ———
function renderMedia() {
  const c = current();
  if (!c) return;
  const grid = $("#mediaGrid");
  const media = c.media || [];
  if (!media.length) {
    grid.innerHTML = '<p class="empty-inline" style="columns:1">No media notes yet. Save generations from the Generate scene tab, or add a note.</p>';
    return;
  }
  grid.innerHTML = media
    .map((m) => {
      const ratio = (m.aspect || "3:4").replace(":", "/");
      const src = mediaSrc(m);
      if (src) {
        return (
          '<button class="tile" data-open="' +
          esc(m.id) +
          '" style="aspect-ratio:' +
          ratio +
          '"><span class="tag">' +
          (m.type === "video-pending"
            ? m.tags && m.tags.indexOf("animate-still") >= 0
              ? "Anim…"
              : "Video…"
            : m.type === "storyboard" || (m.tags && m.tags.indexOf("storyboard") >= 0)
              ? "SB"
              : m.imageUrl || m.imageDataUrl
                ? "Gen"
                : "Note") +
          '</span><img src="' +
          esc(src) +
          '" alt="' +
          esc(m.label) +
          '" loading="lazy"/></button>'
        );
      }
      return (
        '<button class="tile" data-open="' +
        esc(m.id) +
        '" style="aspect-ratio:' +
        ratio +
        '"><div class="media-tile-note"><b>' +
        esc(m.label) +
        "</b><span>" +
        esc((m.notes || "").slice(0, 80) || "No notes") +
        "</span></div></button>"
      );
    })
    .join("");
}

function openMediaViewer(id) {
  const c = current();
  if (!c) return;
  const m = (c.media || []).find((x) => x.id === id);
  if (!m) return;
  state.viewing = m;
  const src = mediaSrc(m);
  if (src) {
    $("#viewerMedia").innerHTML = '<img src="' + esc(src) + '" alt="' + esc(m.label) + '"/>';
  } else {
    $("#viewerMedia").innerHTML =
      '<div class="media-tile-note" style="min-height:200px;aspect-ratio:auto"><b>' + esc(m.label) + "</b></div>";
  }
  $("#viewerLabel").textContent = m.label + (m.aspect ? " · " + m.aspect : "");
  const notes = $("#viewerNotes");
  if (m.notes) {
    notes.hidden = false;
    notes.textContent = m.notes;
  } else {
    notes.hidden = true;
    notes.textContent = "";
  }
  $("#viewerActions").innerHTML =
    '<button class="btn btn-ghost danger" data-act="delete-media">Delete</button>';
  $("#viewer").hidden = false;
  document.body.style.overflow = "hidden";
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    if (!file) return resolve(null);
    if (file.size > 2.5 * 1024 * 1024) {
      reject(new Error("Image too large (max ~2.5MB for localStorage)"));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("Could not read file"));
    reader.readAsDataURL(file);
  });
}


function syncFaceLockGenUI(c) {
  const char = c || current();
  const fl = getFaceLock(char || {});
  const toggle = $("#genFaceLockToggle");
  const preview = $("#faceLockPreview");
  if (toggle) toggle.checked = !!fl.enabled;
  if (preview) {
    const text = fl.shortIdentity || "";
    preview.innerHTML = text
      ? esc(text)
      : '<span class="muted">No short identity yet — rebuild from master in Character Bible or here.</span>';
  }
}

function persistFaceLockFromGen(enabled) {
  const c = current();
  if (!c) return;
  const fl = getFaceLock(c);
  fl.enabled = !!enabled;
  if (!fl.shortIdentity) fl.shortIdentity = compressMasterToShortIdentity(c);
  updateCharacter(c.id, { faceLock: fl });
  // keep bible form in sync if visible
  const en = $("#char-face-lock-enabled");
  const idEl = $("#char-face-lock-identity");
  if (en) en.checked = fl.enabled;
  if (idEl && !idEl.value.trim()) idEl.value = fl.shortIdentity;
  syncFaceLockGenUI(getCharacter(c.id));
}

function rebuildFaceLockForCurrent() {
  const c = current();
  if (!c) return null;
  // Prefer live bible master if present
  const masterLive = $("#char-master") ? $("#char-master").value.trim() : "";
  const patchChar = {
    ...c,
    masterAppearance: masterLive || c.masterAppearance,
    name: ($("#char-name") && $("#char-name").value.trim()) || c.name,
    age: parseInt(($("#char-age") && $("#char-age").value) || c.age, 10) || c.age,
  };
  const shortIdentity = compressMasterToShortIdentity(patchChar);
  const fl = getFaceLock(c);
  fl.shortIdentity = shortIdentity;
  if (!fl.notes) fl.notes = "Hero reference locked — change outfit/pose/scene only.";
  updateCharacter(c.id, { faceLock: fl });
  const idEl = $("#char-face-lock-identity");
  const notesEl = $("#char-face-lock-notes");
  if (idEl) idEl.value = shortIdentity;
  if (notesEl && !notesEl.value.trim()) notesEl.value = fl.notes;
  syncFaceLockGenUI(getCharacter(c.id));
  return shortIdentity;
}

function presetTilesForMode(mode) {
  const m = mode === "suggestive" || mode === "nsfw" ? mode : "soft";
  // NSFW category only when NSFW mode is on; otherwise hide NSFW tiles
  return PRESET_TILES.filter((t) => {
    if (t.category === "NSFW" || t.mood === "nsfw") return m === "nsfw";
    return true;
  });
}

function renderQuickSets() {
  const root = $("#quickSets");
  if (!root) return;
  const mode = getGenMode();
  const tiles = presetTilesForMode(mode);
  const order = ["Outfits", "Poses/Scenes", "Soft", "Suggestive", "NSFW"];
  const byCat = {};
  tiles.forEach((t) => {
    if (!byCat[t.category]) byCat[t.category] = [];
    byCat[t.category].push(t);
  });
  const cats = order.filter((c) => byCat[c] && byCat[c].length);
  root.innerHTML = cats
    .map((cat) => {
      const nsfwGate =
        cat === "NSFW"
          ? '<span class="preset-cat-gate">NSFW mode</span>'
          : "";
      return (
        '<div class="preset-cat" data-cat="' +
        esc(cat) +
        '"><div class="preset-cat-head"><span class="preset-cat-label">' +
        esc(cat) +
        "</span>" +
        nsfwGate +
        '</div><div class="preset-tile-row">' +
        byCat[cat]
          .map(
            (t) =>
              '<button type="button" class="preset-tile" data-pt="' +
              esc(t.id) +
              '" data-mood="' +
              esc(t.mood) +
              '"><span class="pt-label">' +
              esc(t.label) +
              '</span><span class="pt-meta"><span class="pt-mood">' +
              esc(t.mood) +
              '</span><span class="pt-eta">' +
              esc(t.eta || "~1–3 min · free Horde") +
              "</span></span></button>"
          )
          .join("") +
        "</div></div>"
      );
    })
    .join("");
}

function applyPresetTile(id, autoGenerate) {
  const t = PRESET_TILES.find((x) => x.id === id);
  if (!t) return;
  // NSFW tiles require NSFW mode — auto-switch with clear toast
  if ((t.mood === "nsfw" || t.category === "NSFW") && getGenMode() !== "nsfw") {
    setGenMode("nsfw");
    toast("Switched to NSFW for this preset");
  } else if (t.mood === "suggestive" && getGenMode() === "soft") {
    setGenMode("suggestive");
  } else if (t.mood && t.mood !== "nsfw") {
    // keep current if already suggestive/nsfw for soft tiles
    if (getGenMode() === "soft" || t.mood === "soft") setGenMode(t.mood);
  }
  const sceneEl = $("#sceneInput");
  if (sceneEl) sceneEl.value = t.scene;
  $$(".preset-tile").forEach((el) => el.classList.toggle("on", el.dataset.pt === id));
  $$("#presets .chip").forEach((x) => x.classList.remove("on"));
  updateFullPreview();
  const genBtn = $("#generateImageBtn");
  if (genBtn) {
    genBtn.classList.add("pulse-once");
    setTimeout(() => genBtn.classList.remove("pulse-once"), 1200);
  }
  toast("Preset: " + t.label);
  if (autoGenerate) {
    generateSceneImage();
  }
}

function applyQuickSet(id) {
  applyPresetTile(id, false);
}

function renderPromptPills() {
  const root = $("#promptPills");
  if (!root) return;
  root.innerHTML = PROMPT_PILLS.map(
    (row) =>
      '<div class="pill-row-label">' +
      esc(row.label) +
      '</div><div class="pill-row" data-pill-row="' +
      esc(row.id) +
      '">' +
      row.items
        .map(
          (item) =>
            '<button type="button" class="prompt-pill" data-pill="' +
            esc(item) +
            '">' +
            esc(item) +
            "</button>"
        )
        .join("") +
      "</div>"
  ).join("");
  renderDirectorPills();
}

function appendScenePill(fragment) {
  const ta = $("#sceneInput");
  if (!ta || !fragment) return;
  const cur = ta.value.trim();
  const frag = String(fragment).trim();
  if (!frag) return;
  // Avoid duplicate append
  if (cur.toLowerCase().includes(frag.toLowerCase())) {
    toast("Already in scene");
    return;
  }
  ta.value = cur ? cur.replace(/[,\s]+$/, "") + ", " + frag : frag;
  $$("#presets .chip").forEach((x) => x.classList.remove("on"));
  $$(".preset-tile").forEach((x) => x.classList.remove("on"));
  const btn = document.querySelector('.prompt-pill[data-pill="' + frag.replace(/"/g, "") + '"]');
  if (btn) btn.classList.add("used");
  updateFullPreview();
}

function updateFullPreview() {
  const c = current();
  if (!c) return;
  const scene = $("#sceneInput").value.trim();
  const box = $("#fullPromptPreview");
  if (!scene) {
    box.hidden = true;
    return;
  }
  box.hidden = false;
  box.innerHTML =
    "<strong>Full prompt preview</strong>" +
    esc(buildFullPrompt(c, scene));
}


