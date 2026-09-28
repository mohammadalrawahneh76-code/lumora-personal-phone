// ——— Steal List W5–6: dress ref / duo cast / director / movie pack / queue meter ———
function normalizeDressRef(dr) {
  const src = dr && typeof dr === "object" ? dr : {};
  const dataUrl =
    typeof src.dataUrl === "string" && /^data:image\//i.test(src.dataUrl)
      ? src.dataUrl
      : "";
  return {
    dataUrl,
    vibe: String(src.vibe || "").trim().slice(0, 200),
  };
}

function normalizeDuoCast(dc) {
  const src = dc && typeof dc === "object" ? dc : {};
  return {
    enabled: !!src.enabled,
    name: String(src.name || "").trim().slice(0, 40),
    identity: String(src.identity || "").trim().slice(0, 280),
    sourceCharId: String(src.sourceCharId || "").trim().slice(0, 64),
  };
}

function normalizeMoviePack(mp) {
  const src = mp && typeof mp === "object" ? mp : null;
  if (!src || !Array.isArray(src.beats)) return null;
  const beats = src.beats
    .filter((b) => b && typeof b === "object")
    .slice(0, 6)
    .map((b, i) => ({
      id: String(b.id || "mb_" + (i + 1)),
      title: String(b.title || "Beat " + (i + 1)).trim().slice(0, 60),
      scene: String(b.scene || "").trim().slice(0, 800),
      done: !!b.done,
    }));
  if (!beats.length) return null;
  return {
    theme: String(src.theme || "").trim().slice(0, 120),
    createdAt: String(src.createdAt || new Date().toISOString()),
    beats,
  };
}

function getDressRef(c) {
  return normalizeDressRef(c && c.dressRef);
}

function getDuoCast(c) {
  return normalizeDuoCast(c && c.duoCast);
}

function getMoviePack(c) {
  return normalizeMoviePack(c && c.moviePack);
}

function setHordeQueueStatus(text) {
  const t = String(text || "").trim();
  state.hordeQueueText = t;
  const meters = [$("#hordeQueueMeter"), $("#agentHordeQueueMeter")];
  let label = "";
  if (t) {
    const q = t.match(/queue\s*#?\s*(\d+)/i);
    if (q) label = "Horde: queue #" + q[1];
    else if (/verif/i.test(t)) label = "Horde: Verifying…";
    else if (/generat/i.test(t) && !/queue/i.test(t)) label = "Horde: Generating…";
    else if (/wait/i.test(t)) label = "Horde: Waiting…";
    else if (/finish|fetch/i.test(t)) label = "Horde: Fetching…";
    else if (/pollinations/i.test(t)) label = "Pollinations…";
    else if (/Image Engine/i.test(t))
      label = t.replace(/^Image Engine ·\s*/i, "Horde: ").slice(0, 48);
    else label = ("Horde: " + t).slice(0, 56);
  }
  meters.forEach((el) => {
    if (!el) return;
    if (!t) {
      el.hidden = true;
      el.textContent = "";
      el.classList.remove("busy");
      return;
    }
    el.hidden = false;
    el.classList.add("busy");
    el.textContent = label;
    el.title = t;
  });
  const sk = $("#genPreviewSkeleton");
  if (sk && state.genLoading && label) sk.textContent = label;
}

function clearHordeQueueStatus() {
  setHordeQueueStatus("");
  const sk = $("#genPreviewSkeleton");
  if (sk && !state.genLoading) sk.textContent = "Generating…";
}

function dressRefPromptNote(c) {
  const dr = getDressRef(c);
  if (!dr.dataUrl && !dr.vibe) return "";
  const vibe =
    dr.vibe ||
    "match the pinned dress/style reference look — colors, silhouette, fabric, accessories";
  return (
    "Outfit from dress reference (keep Face-lock identity; change outfit/style only): " +
    vibe
  );
}

function applyDressFromRef() {
  const c = current();
  if (!c) {
    toast("Open a character first");
    return;
  }
  const dr = getDressRef(c);
  if (!dr.dataUrl && !dr.vibe) {
    toast("Upload or describe a dress/style reference first");
    return;
  }
  const note = dressRefPromptNote(c);
  const ta = $("#sceneInput");
  if (!ta) return;
  const cur = ta.value.trim();
  const cleaned = cur
    .replace(/,?\s*Outfit from dress reference[^.]*(?:\.|$)/gi, "")
    .replace(/\s{2,}/g, " ")
    .trim();
  ta.value = cleaned ? cleaned.replace(/[,\s]+$/, "") + ". " + note : note;
  updateFullPreview();
  toast("Dress from ref applied (prompt-only · Face-lock kept)");
}

async function setDressRefFromFile(file) {
  const c = current();
  if (!c) {
    toast("Open a character first");
    return;
  }
  if (!file) return;
  try {
    const dataUrl = await resizeImageToDataUrl(file, 640);
    if (dataUrl.length > 550000) {
      toast("Image still too large after compress — try a simpler crop");
      return;
    }
    const vibeEl = $("#dressRefVibe") || $("#agentDressRefVibe");
    const vibe = vibeEl
      ? String(vibeEl.value || "").trim().slice(0, 200)
      : getDressRef(c).vibe;
    updateCharacter(c.id, { dressRef: normalizeDressRef({ dataUrl, vibe }) });
    renderDressRefUI(getCharacter(c.id) || c);
    toast("Dress/style ref pinned (compressed · local)");
  } catch (err) {
    toast((err && err.message) || "Could not read dress ref");
  }
}

function clearDressRef() {
  const c = current();
  if (!c) return;
  updateCharacter(c.id, { dressRef: normalizeDressRef(null) });
  ["dressRefVibe", "agentDressRefVibe"].forEach((id) => {
    const el = $("#" + id);
    if (el) el.value = "";
  });
  renderDressRefUI(getCharacter(c.id) || c);
  toast("Dress ref cleared");
}

function renderDressRefUI(c) {
  const char = c || current();
  const dr = getDressRef(char || {});
  ["dressRefThumbWrap", "agentDressRefThumbWrap"].forEach((id) => {
    const wrap = $("#" + id);
    if (!wrap) return;
    if (dr.dataUrl) {
      wrap.hidden = false;
      wrap.innerHTML =
        '<img class="dress-ref-thumb" src="' +
        esc(dr.dataUrl) +
        '" alt="Dress ref" /><button type="button" class="btn btn-ghost btn-sm dress-ref-clear" data-dress-clear="1">Clear ref</button>';
    } else {
      wrap.hidden = true;
      wrap.innerHTML = "";
    }
  });
  ["dressRefVibe", "agentDressRefVibe"].forEach((id) => {
    const el = $("#" + id);
    if (el && document.activeElement !== el) el.value = dr.vibe || "";
  });
}

function saveDuoCastFromUI() {
  const c = current();
  if (!c) return;
  const enabled = !!(
    ($("#duoCastEnabled") && $("#duoCastEnabled").checked) ||
    ($("#agentDuoCastEnabled") && $("#agentDuoCastEnabled").checked)
  );
  const name = (
    (($("#duoCastName") && $("#duoCastName").value) ||
      ($("#agentDuoCastName") && $("#agentDuoCastName").value) ||
      "") + ""
  ).trim();
  const identity = (
    (($("#duoCastIdentity") && $("#duoCastIdentity").value) ||
      ($("#agentDuoCastIdentity") && $("#agentDuoCastIdentity").value) ||
      "") + ""
  ).trim();
  const sourceCharId = (
    (($("#duoCastPick") && $("#duoCastPick").value) ||
      ($("#agentDuoCastPick") && $("#agentDuoCastPick").value) ||
      "") + ""
  ).trim();
  let duo = normalizeDuoCast({ enabled, name, identity, sourceCharId });
  if (sourceCharId) {
    const other = getCharacter(sourceCharId);
    if (other && other.id !== c.id) {
      const fl = getFaceLock(other);
      if (!duo.name) duo.name = other.name || "Partner";
      if (!duo.identity) {
        duo.identity =
          fl.shortIdentity ||
          compressMasterToShortIdentity(other) ||
          (other.name || "Partner") + ", adult fictional 21+";
      }
    }
  }
  updateCharacter(c.id, { duoCast: duo });
  renderDuoCastUI(getCharacter(c.id) || c);
}

function renderDuoCastUI(c) {
  const char = c || current();
  if (!char) return;
  const duo = getDuoCast(char);
  const others = getCharacters().filter((x) => x.id !== char.id);
  const pickOpts =
    '<option value="">— Custom / type below —</option>' +
    others
      .map(
        (o) =>
          '<option value="' +
          esc(o.id) +
          '"' +
          (duo.sourceCharId === o.id ? " selected" : "") +
          ">" +
          esc(o.name || o.id) +
          "</option>"
      )
      .join("");
  const bind = (enId, boxId, nameId, idId, pickId) => {
    const en = $("#" + enId);
    const box = $("#" + boxId);
    const name = $("#" + nameId);
    const idEl = $("#" + idId);
    const pick = $("#" + pickId);
    if (en) en.checked = !!duo.enabled;
    if (box) box.hidden = !duo.enabled;
    if (name && document.activeElement !== name) name.value = duo.name || "";
    if (idEl && document.activeElement !== idEl) idEl.value = duo.identity || "";
    if (pick) pick.innerHTML = pickOpts;
  };
  bind("duoCastEnabled", "duoCastFields", "duoCastName", "duoCastIdentity", "duoCastPick");
  bind(
    "agentDuoCastEnabled",
    "agentDuoCastFields",
    "agentDuoCastName",
    "agentDuoCastIdentity",
    "agentDuoCastPick"
  );
}

function duoCastPromptBlock(c) {
  const duo = getDuoCast(c);
  if (!duo.enabled) return "";
  let name = duo.name || "Partner";
  let identity = duo.identity;
  if (duo.sourceCharId) {
    const other = getCharacter(duo.sourceCharId);
    if (other) {
      if (!duo.name) name = other.name || name;
      if (!identity) {
        const fl = getFaceLock(other);
        identity = fl.shortIdentity || compressMasterToShortIdentity(other);
      }
    }
  }
  if (!identity) identity = name + ", adult fictional 21+, soft complementary look";
  return (
    "Duo / fantasy cast (two adults 21+, consensual scene):\n" +
    "Character A (lead / Face-lock): keep primary identity.\n" +
    "Character B (" +
    name +
    "): " +
    identity +
    "\nInclude both briefly in the scene; respect Soft/Suggestive/NSFW mood."
  );
}

function renderDirectorPills() {
  const root = $("#directorPills");
  if (!root) return;
  root.innerHTML =
    '<div class="pill-row-label">Director / shot</div><div class="pill-row" data-pill-row="director">' +
    DIRECTOR_SHOT_PILLS.map(
      (p) =>
        '<button type="button" class="prompt-pill director-pill" data-director="' +
        esc(p.id) +
        '" data-pill="' +
        esc(p.fragment) +
        '" title="' +
        esc(p.fragment) +
        '">' +
        esc(p.label) +
        "</button>"
    ).join("") +
    "</div>";
}

function applyDirectorPill(id) {
  const pill = DIRECTOR_SHOT_PILLS.find((p) => p.id === id);
  if (!pill) return;
  appendScenePill(pill.fragment);
  if (pill.notes) {
    const notes = $("#genNoteBody");
    if (notes) {
      const cur = notes.value.trim();
      if (!/Dialogue:/i.test(cur)) {
        notes.value = cur ? cur + "\n" + pill.notes : pill.notes;
      }
    }
    toast("Director: " + pill.label + " (+ dialogue note)");
  } else {
    toast("Director: " + pill.label);
  }
}

function buildMoviePackBeats(themeScene, mode) {
  const base =
    String(themeScene || "").trim() || "soft intimate influencer scene, cozy lighting";
  const m = mode === "suggestive" || mode === "nsfw" ? mode : "soft";
  const moodHint =
    m === "nsfw"
      ? "adult intimate NSFW, consensual, soft cute"
      : m === "suggestive"
        ? "suggestive tease, elegant lingerie-leaning"
        : "soft cozy wholesome-leaning";
  const templates = [
    { title: "1 · Wide establish", frag: "wide establishing shot, full environment, " + moodHint },
    { title: "2 · Medium approach", frag: "medium shot approaching camera, waist-up, " + moodHint },
    { title: "3 · Close-up beat", frag: "close-up face and shoulders, emotional beat, " + moodHint },
    { title: "4 · Mirror / selfie", frag: "mirror selfie or phone UGC angle, " + moodHint },
    {
      title: "5 · Dialogue / reaction",
      frag:
        'over-shoulder or reaction shot, soft spoken line: "…stay with me…" , ' + moodHint,
    },
    {
      title: "6 · Soft close",
      frag: "holding frame soft close, gentle smile, fade-friendly, " + moodHint,
    },
  ];
  return templates.map((t, i) => ({
    id: "mb_" + (i + 1),
    title: t.title,
    scene: (base.replace(/[.\s]+$/, "") + ". " + t.frag).slice(0, 800),
    done: false,
  }));
}

function createMoviePack() {
  const c = current();
  if (!c) {
    toast("Open a character first");
    return;
  }
  const scene = (
    (($("#sceneInput") && $("#sceneInput").value.trim()) ||
      (c.prompts && c.prompts[0] && c.prompts[0].scene) ||
      "") + ""
  ).trim();
  const mode = getGenMode();
  const theme = (scene.slice(0, 80) || c.niche || "Movie pack").trim();
  const pack = {
    theme,
    createdAt: new Date().toISOString(),
    beats: buildMoviePackBeats(scene || theme, mode),
  };
  updateCharacter(c.id, { moviePack: pack });
  try {
    const cal = [...(c.calendar || [])];
    const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    pack.beats.forEach((b, i) => {
      const idea = "[Movie] " + b.title + " — " + b.scene.slice(0, 100);
      if (!cal.some((x) => x.idea && x.idea.indexOf("[Movie] " + b.title) === 0)) {
        cal.push({ id: uid("c"), day: days[i] || "Sun", idea, status: "idea" });
      }
    });
    updateCharacter(c.id, { calendar: cal });
  } catch (_) {}
  renderMoviePackUI(getCharacter(c.id) || c);
  renderChecklist();
  renderCalendar();
  toast("Movie pack (6 scenes) ready — tap Generate on a beat");
  setTab("checklist");
}

function toggleMovieBeatDone(beatId) {
  const c = current();
  if (!c) return;
  const pack = getMoviePack(c);
  if (!pack) return;
  pack.beats = pack.beats.map((b) =>
    b.id === beatId ? { ...b, done: !b.done } : b
  );
  updateCharacter(c.id, { moviePack: pack });
  renderMoviePackUI(getCharacter(c.id) || c);
  renderChecklist();
}

function generateMovieBeat(beatId) {
  const c = current();
  if (!c) return;
  const pack = getMoviePack(c);
  if (!pack) return;
  const beat = pack.beats.find((b) => b.id === beatId);
  if (!beat) return;
  const ta = $("#sceneInput");
  if (ta) ta.value = beat.scene;
  updateFullPreview();
  setTab("generate");
  toast("Scene loaded: " + beat.title);
  generateSceneImage().then(() => {
    if (state.lastGenUrl) {
      const fresh = getCharacter(c.id);
      const mp = getMoviePack(fresh);
      if (mp) {
        mp.beats = mp.beats.map((b) =>
          b.id === beatId ? { ...b, done: true } : b
        );
        updateCharacter(c.id, { moviePack: mp });
        renderMoviePackUI(getCharacter(c.id));
        renderChecklist();
      }
    }
  });
}

function clearMoviePack() {
  const c = current();
  if (!c) return;
  updateCharacter(c.id, { moviePack: null });
  renderMoviePackUI(getCharacter(c.id) || c);
  renderChecklist();
  toast("Movie pack cleared");
}

function renderMoviePackUI(c) {
  const char = c || current();
  const pack = getMoviePack(char);
  const movieGroup = $("#moviePackGroup");
  if (movieGroup) movieGroup.open = !!pack;
  [$("#moviePackList"), $("#checklistMoviePack")].forEach((root) => {
    if (!root) return;
    if (!pack) {
      root.innerHTML =
        '<p class="hint">No movie pack yet — tap “Movie pack (6 scenes)” on Generate.</p>';
      return;
    }
    const done = pack.beats.filter((b) => b.done).length;
    root.innerHTML =
      '<div class="movie-pack-head"><strong>Movie pack</strong> · ' +
      esc(pack.theme || "6 scenes") +
      " · " +
      done +
      "/" +
      pack.beats.length +
      ' done <button type="button" class="btn btn-ghost btn-sm" data-movie-clear="1">Clear</button></div><ul class="movie-pack-beats">' +
      pack.beats
        .map(
          (b) =>
            '<li class="' +
            (b.done ? "done" : "pending") +
            '"><label class="movie-beat-check"><input type="checkbox" data-movie-done="' +
            esc(b.id) +
            '"' +
            (b.done ? " checked" : "") +
            " /> <span>" +
            esc(b.title) +
            '</span></label><button type="button" class="btn btn-ghost btn-sm" data-movie-gen="' +
            esc(b.id) +
            '">Generate</button></li>'
        )
        .join("") +
      "</ul>";
  });
}


const AgentEngines = {
  image: {
    id: "agent-image",
    name: "Image Engine",
    status: "ready",
    /**
     * @param {{ scene: string, mode?: string, aspect?: string, character?: object, onStatus?: function }} opts
     * @returns {Promise<{ ok: boolean, imageUrl?: string, chatUrl?: string, mediaUrl?: string, provider?: string, prompt?: string, mode?: string, scene?: string, error?: string }>}
     */
    async run(opts) {
      opts = opts || {};
      const onStatus = typeof opts.onStatus === "function" ? opts.onStatus : null;
      const c = opts.character || current();
      const scene = String(opts.scene || "").trim();
      const mode =
        opts.mode === "suggestive" || opts.mode === "nsfw" ? opts.mode : "soft";
      const aspect = opts.aspect || "3:4";
      if (!c) {
        return { ok: false, error: "No character open", prompt: "", mode, scene };
      }
      if (!scene) {
        return { ok: false, error: "Describe the scene first", prompt: "", mode, scene };
      }
      const imagePrompt = buildImagePrompt(c, scene, mode);

      let hordeErr = null;
      let pollErr = null;
      let used = "horde";

      // Prefer NVIDIA Flux when Generate provider is Flux + NIM key present
      const wantFlux =
        typeof getGenProvider === "function" &&
        getGenProvider() === "flux" &&
        typeof getNvidiaKey === "function" &&
        !!getNvidiaKey() &&
        typeof generateWithNvidiaFlux === "function";
      if (wantFlux) {
        try {
          if (onStatus) onStatus("Image Engine · NVIDIA Flux…");
          const rawFlux = await generateWithNvidiaFlux(imagePrompt, aspect, mode, {
            onStatus: (t) => {
              if (onStatus) onStatus("Image Engine · " + t);
            },
          });
          if (onStatus) onStatus("Image Engine · verifying Flux image…");
          const confirmed = await confirmAgentImage(rawFlux);
          return {
            ok: true,
            imageUrl: confirmed.chatUrl,
            chatUrl: confirmed.chatUrl,
            mediaUrl: confirmed.mediaUrl,
            provider: "flux",
            prompt: imagePrompt,
            mode,
            scene,
          };
        } catch (fluxErr) {
          if (onStatus) {
            onStatus(
              "Image Engine · Flux failed — trying Horde (" +
                ((fluxErr && fluxErr.message) || "error") +
                ")…"
            );
          }
        }
      }

      if (onStatus) onStatus("Image Engine · queuing AI Horde (free, 1–3 min)…");

      try {
        const rawHorde = await generateWithHorde(imagePrompt, aspect, mode, {
          onStatus: (t) => {
            if (onStatus) onStatus("Image Engine · " + t);
          },
        });
        if (onStatus) onStatus("Image Engine · verifying Horde image…");
        const confirmed = await confirmAgentImage(rawHorde);
        return {
          ok: true,
          imageUrl: confirmed.chatUrl,
          chatUrl: confirmed.chatUrl,
          mediaUrl: confirmed.mediaUrl,
          provider: used,
          prompt: imagePrompt,
          mode,
          scene,
        };
      } catch (err) {
        hordeErr = err;
      }

      // Soft/Suggestive: Horde first, Pollinations fallback. NSFW stays on Horde.
      if (mode !== "nsfw") {
        used = "pollinations";
        if (onStatus) onStatus("Image Engine · Horde failed — trying Pollinations (free)…");
        const pollUrl = buildPollinationsUrl(imagePrompt, aspect, mode);
        if (pollUrl.length > 2200) {
          return {
            ok: false,
            error:
              "Horde failed (" +
              ((hordeErr && hordeErr.message) || "error") +
              "); Pollinations URL too long for fallback.",
            prompt: imagePrompt,
            mode,
            scene,
            provider: used,
          };
        }
        try {
          if (onStatus) onStatus("Image Engine · verifying Pollinations image…");
          const confirmed = await confirmAgentImage(pollUrl);
          return {
            ok: true,
            imageUrl: confirmed.chatUrl,
            chatUrl: confirmed.chatUrl,
            mediaUrl: confirmed.mediaUrl,
            provider: used,
            prompt: imagePrompt,
            mode,
            scene,
          };
        } catch (err2) {
          pollErr = err2;
          return {
            ok: false,
            error:
              "Horde failed (" +
              ((hordeErr && hordeErr.message) || "error") +
              "); Pollinations also failed (" +
              ((err2 && err2.message) || "image did not load") +
              "). Tap Generate image to retry.",
            prompt: imagePrompt,
            mode,
            scene,
            provider: used,
          };
        }
      }

      return {
        ok: false,
        error: (hordeErr && hordeErr.message) || "Image Engine failed",
        prompt: imagePrompt,
        mode,
        scene,
        provider: "horde",
      };
    },
  },

  video: {
    id: "agent-video",
    name: "Video Engine",
    status: "stub",
    /**
     * Honest free stub — no Seedance/APOB-quality free CORS video without keys/payment.
     * @returns {Promise<{ ok: boolean, pending?: boolean, message: string, error?: string, mode?: string, scene?: string }>}
     */
    async run(opts) {
      opts = opts || {};
      const onStatus = typeof opts.onStatus === "function" ? opts.onStatus : null;
      const scene = String(opts.scene || "").trim() || "short character clip";
      const mode =
        opts.mode === "suggestive" || opts.mode === "nsfw" ? opts.mode : "soft";
      const startFrameUrl = opts.startFrameUrl || null;
      const motionPrompt =
        String(opts.motionPrompt || opts.scene || "").trim() ||
        "subtle natural motion, blink, breathing, soft camera hold";
      const endFrameUrl = opts.endFrameUrl || null;
      if (onStatus) onStatus("Video Engine · checking free options…");
      const message = startFrameUrl
        ? "Animate this: free video isn’t rendered yet in Lumora Personal. " +
          "I queued a video-pending job in Media with your start frame + motion (“" +
          motionPrompt.slice(0, 72) +
          "”). When a free motion backend exists, that card is ready — Image Engine stills work now."
        : "Video engine: free video isn’t available yet in Lumora Personal. " +
          "No CORS-friendly free Seedance/APOB-quality path without keys or payment. " +
          "I saved a video-pending note for “" +
          scene.slice(0, 80) +
          "” (" +
          mode +
          "). Use Image Engine for stills meanwhile — or ask again when a free video path lands.";
      return {
        ok: false,
        pending: true,
        message,
        error: "Free video stub — not available yet",
        mode,
        scene,
        startFrameUrl,
        motionPrompt,
        endFrameUrl,
      };
    },
  },
};

function agentEngineImage(opts) {
  return AgentEngines.image.run(opts);
}
function agentEngineVideo(opts) {
  return AgentEngines.video.run(opts);
}

function saveAgentVideoPendingToMedia(c, label, notes, aspect, mode, extra) {
  if (!c) return;
  extra = extra || {};
  const start = extra.startFrameUrl || null;
  const isData = start && String(start).indexOf("data:image") === 0;
  const media = [
    {
      id: uid("m"),
      label: String(label || extra.label || "Video pending").slice(0, 80),
      notes: String(notes || "").slice(0, 500),
      aspect: aspect || "9:16",
      imageDataUrl: isData ? start : null,
      imageUrl: start && !isData ? start : null,
      type: "video-pending",
      mode: mode || "soft",
      motionPrompt: String(extra.motionPrompt || "").slice(0, 240) || null,
      endFrameUrl: extra.endFrameUrl || null,
      startFrameUrl: start || null,
      createdAt: new Date().toISOString(),
      source: "agent-video",
      tags: ["video-pending", start ? "animate-still" : "video-stub"],
    },
    ...(c.media || []),
  ];
  updateCharacter(c.id, { media });
}

function renderAgentEnginesPanel() {
  const el = $("#agentEnginesList");
  if (!el) return;
  const items = [
    AgentEngines.image,
    AgentEngines.video,
  ];
  const hordeKey = (typeof getHordeKey === "function" ? getHordeKey() : "") || "";
  const keySaved = !!(hordeKey && hordeKey !== HORDE_ANON_KEY);
  const keyBadge = keySaved ? "saved" : "anon";
  const keyLabel = keySaved ? "saved" : "anonymous";
  const groqKey = (typeof getGroqKey === "function" ? getGroqKey() : "") || "";
  const groqReady = !!groqKey;
  const groqBadge = groqReady ? "ready" : "anon";
  const groqLabel = groqReady ? "ready" : "not set";
  const nvidiaKey = (typeof getNvidiaKey === "function" ? getNvidiaKey() : "") || "";
  const openrouterKey =
    (typeof getOpenRouterKey === "function" ? getOpenRouterKey() : typeof getFeatherlessKey === "function" ? getFeatherlessKey() : "") || "";
  const nvMetaEarly =
    typeof getNvidiaModelMeta === "function" ? getNvidiaModelMeta() : null;
  const lexiSelected = !!(nvMetaEarly && nvMetaEarly.provider === "openrouter");
  const nvidiaReady = lexiSelected ? !!openrouterKey : !!nvidiaKey;
  const nvidiaBadge = nvidiaReady ? "ready" : "anon";
  const nvidiaLabel = nvidiaReady ? "ready" : "not set";
  const rows = items
    .map((eng) => {
      const ready = eng.status === "ready";
      const badge = ready ? "ready" : "stub";
      const packLabel = (typeof getStylePack === "function" && getStylePack().label) || "Photoreal";
      const detail = ready
        ? "Flux (key+CORS proxy) best-effort → Horde (reliable) → Pollinations · face-lock · style " +
          packLabel
        : "Free stub — no Seedance/APOB-quality video without keys/payment yet";
      return (
        '<div class="agent-engine-row">' +
        '<span class="agent-engine-name">' +
        esc(eng.name) +
        "</span>" +
        '<span class="agent-engine-badge ' +
        badge +
        '">' +
        badge +
        "</span>" +
        '<span class="agent-engine-detail">' +
        esc(detail) +
        "</span></div>"
      );
    })
    .join("");
  const styleRow =
    '<div class="agent-engine-row agent-style-pack-row">' +
    '<span class="agent-engine-name">Style pack</span>' +
    '<span class="agent-engine-badge ready">' +
    esc((getStylePack() && getStylePack().label) || "Photoreal") +
    "</span>" +
    '<div class="seg agent-style-seg" id="agentStylePackSeg" role="radiogroup" aria-label="Style pack">' +
    '<button type="button" data-v="photoreal"' +
    (getStylePackId() === "photoreal" ? ' class="on"' : "") +
    ">Photoreal</button>" +
    '<button type="button" data-v="cinema"' +
    (getStylePackId() === "cinema" ? ' class="on"' : "") +
    ">Cinema</button>" +
    '<button type="button" data-v="anime"' +
    (getStylePackId() === "anime" ? ' class="on"' : "") +
    ">Anime</button>" +
    "</div></div>";
  const nvMeta = nvMetaEarly || (typeof getNvidiaModelMeta === "function" ? getNvidiaModelMeta() : null);
  const nvPick = (nvMeta && nvMeta.id) || "kimi";
  const nvModelLabel = (nvMeta && nvMeta.label) || "Kimi";
  const nvModelId = (nvMeta && nvMeta.model) || "moonshotai/kimi-k3";
  const nvIsLexi = !!(nvMeta && nvMeta.provider === "openrouter");
  const nvidiaModelSeg =
    '<div class="seg agent-nvidia-model-seg" id="agentNvidiaModelSeg" role="radiogroup" aria-label="Agent chat model">' +
    NVIDIA_MODELS.map(function (m) {
      return (
        '<button type="button" data-v="' +
        m.id +
        '"' +
        (nvPick === m.id ? ' class="on"' : "") +
        ' title="' +
        esc(m.blurb) +
        '">' +
        esc(m.label) +
        "</button>"
      );
    }).join("") +
    "</div>";
  const hasNvidiaProxy =
    typeof getNvidiaProxyBase === "function" && !!getNvidiaProxyBase();
  const engineDetail = nvIsLexi
    ? nvidiaReady
      ? "Dolphin (Venice Uncensored) ready via OpenRouter — reliable in browser; preferred for Suggestive / NSFW Agent Send"
      : "Dolphin selected — paste an OpenRouter key below (reliable browser path; else Groq / Pollinations)"
    : nvidiaReady
      ? hasNvidiaProxy
        ? "NVIDIA NIM: ready via CORS proxy — " +
          nvModelLabel +
          " (" +
          nvModelId +
          ") preferred for Agent Send"
        : "NVIDIA NIM: key set but browser CORS blocks direct calls — set CORS proxy below to unlock NIM/Flux; else Groq/Pollinations (Dolphin + Horde are the reliable browser path)"
      : "NVIDIA NIM: not set — browser CORS needs a proxy for NIM/Flux; Dolphin + Horde work without it (else Groq / Pollinations)";
  const engineLink = nvIsLexi
    ? '<a href="https://openrouter.ai/keys" target="_blank" rel="noopener">openrouter.ai/keys</a>'
    : '<a href="https://build.nvidia.com/models" target="_blank" rel="noopener">build.nvidia.com/models</a>';
  const nvidiaRow =
    '<div class="agent-engine-row agent-nvidia-key-row">' +
    '<span class="agent-engine-name">Agent chat models</span>' +
    '<span class="agent-engine-badge ' +
    nvidiaBadge +
    '">' +
    nvidiaLabel +
    "</span>" +
    '<span class="agent-engine-detail">' +
    engineDetail +
    " · " +
    engineLink +
    "</span>" +
    nvidiaModelSeg +
    '<label class="field agent-nvidia-key-field">' +
    '<span class="label">NVIDIA API key <em>NIM · Lightning / Kimi / Ultra</em></span>' +
    '<input type="password" id="agentNvidiaKey" maxlength="300" placeholder="Paste nvapi-… key" autocomplete="off" />' +
    '<span class="hint">Lightning = fast · Kimi = default · Ultra = deep reasoning. From <a href="https://build.nvidia.com" target="_blank" rel="noopener">build.nvidia.com</a>. Key stays in this browser.</span>' +
    "</label>" +
    '<label class="field agent-nvidia-proxy-field">' +
    '<span class="label">NVIDIA CORS proxy URL <em>optional · unlocks Flux + NIM</em></span>' +
    '<input type="url" id="agentNvidiaProxy" maxlength="300" placeholder="https://your-worker.workers.dev" autocomplete="off" />' +
    '<span class="hint">GitHub Pages cannot call NVIDIA directly (CORS). Deploy <code>proxy/nvidia-worker.js</code> once — see <a href="https://github.com/mohammadalrawahneh76-code/lumora-personal-phone/blob/main/proxy/README.md" target="_blank" rel="noopener">proxy/README.md</a>. Without it, Flux/NIM are best-effort; Horde + Dolphin are the reliable browser path.</span>' +
    "</label>" +
    '<label class="field agent-openrouter-key-field">' +
    '<span class="label">OpenRouter API key <em>Dolphin · uncensored</em></span>' +
    '<input type="password" id="agentOpenRouterKey" maxlength="300" placeholder="Paste OpenRouter sk-or-… key" autocomplete="off" />' +
    '<span class="hint">Required when Dolphin is selected. Free key at <a href="https://openrouter.ai/keys" target="_blank" rel="noopener">openrouter.ai/keys</a> (tiny pay-per-use; often free credits). Model: Dolphin Mistral 24B Venice Uncensored. Browser only.</span>' +
    "</label></div>";
  const groqRow =
    '<div class="agent-engine-row agent-groq-key-row">' +
    '<span class="agent-engine-name">Groq (Agent chat)</span>' +
    '<span class="agent-engine-badge ' +
    groqBadge +
    '">' +
    groqLabel +
    "</span>" +
    '<span class="agent-engine-detail">' +
    (groqReady
      ? "Groq: ready — free text LLM for Agent Send"
      : "Groq: not set (Pollinations fallback)") +
    " · " +
    '<a href="https://console.groq.com/keys" target="_blank" rel="noopener">Get free key</a>' +
    "</span>" +
    '<label class="field agent-groq-key-field">' +
    '<span class="label">Groq API key <em>free · browser only</em></span>' +
    '<input type="password" id="agentGroqKey" maxlength="200" placeholder="Paste Groq API key" autocomplete="off" />' +
    '<span class="hint">Free tier from <a href="https://console.groq.com/keys" target="_blank" rel="noopener">console.groq.com/keys</a> — not xAI Grok. Stored only in this browser.</span>' +
    "</label></div>";
  const keyRow =
    '<div class="agent-engine-row agent-horde-key-row">' +
    '<span class="agent-engine-name">Horde key</span>' +
    '<span class="agent-engine-badge ' +
    keyBadge +
    '">' +
    keyLabel +
    "</span>" +
    '<span class="agent-engine-detail">' +
    "Set free Horde key in Generate → Advanced · " +
    '<a href="https://stablehorde.net/register" target="_blank" rel="noopener">Register (still $0)</a>' +
    "</span></div>";
  el.innerHTML = rows + styleRow + nvidiaRow + groqRow + keyRow;
  const nvidiaInput = $("#agentNvidiaKey");
  if (nvidiaInput) {
    const storedNv = load(KEYS.nvidiaKey, "") || "";
    if (storedNv && !nvidiaInput.value) nvidiaInput.value = storedNv;
    const persistNv = () => {
      const v = nvidiaInput.value.trim();
      if (v) save(KEYS.nvidiaKey, v);
      else {
        try {
          localStorage.removeItem(KEYS.nvidiaKey);
        } catch (_) {}
      }
      renderAgentEnginesPanel();
    };
    nvidiaInput.addEventListener("change", persistNv);
    nvidiaInput.addEventListener("blur", persistNv);
  }
  const nvidiaProxyInput = $("#agentNvidiaProxy");
  if (nvidiaProxyInput) {
    const storedProxy = load(KEYS.nvidiaProxy, "") || "";
    if (storedProxy && !nvidiaProxyInput.value) nvidiaProxyInput.value = storedProxy;
    const persistProxy = () => {
      const v = nvidiaProxyInput.value.trim().replace(/\/+$/, "");
      nvidiaProxyInput.value = v;
      if (v) save(KEYS.nvidiaProxy, v);
      else {
        try {
          localStorage.removeItem(KEYS.nvidiaProxy);
        } catch (_) {}
      }
      if (typeof updateGenProviderNote === "function") {
        updateGenProviderNote(typeof getGenProvider === "function" ? getGenProvider() : "horde");
      }
      renderAgentEnginesPanel();
    };
    nvidiaProxyInput.addEventListener("change", persistProxy);
    nvidiaProxyInput.addEventListener("blur", persistProxy);
  }
  const openrouterInput = $("#agentOpenRouterKey");
  if (openrouterInput) {
    const storedOr = load(KEYS.openrouterKey, "") || load(KEYS.featherlessKey, "") || "";
    if (storedOr && !openrouterInput.value) openrouterInput.value = storedOr;
    const persistOr = () => {
      const v = openrouterInput.value.trim();
      if (v) save(KEYS.openrouterKey, v);
      else {
        try {
          localStorage.removeItem(KEYS.openrouterKey);
        } catch (_) {}
      }
      renderAgentEnginesPanel();
    };
    openrouterInput.addEventListener("change", persistOr);
    openrouterInput.addEventListener("blur", persistOr);
  }
  const nvidiaModelSegEl = $("#agentNvidiaModelSeg");
  if (nvidiaModelSegEl && !nvidiaModelSegEl.dataset.bound) {
    nvidiaModelSegEl.dataset.bound = "1";
    nvidiaModelSegEl.addEventListener("click", (e) => {
      const b = e.target.closest("button[data-v]");
      if (!b) return;
      setNvidiaModel(b.dataset.v);
      renderAgentEnginesPanel();
      const meta = getNvidiaModelMeta();
      toast("Agent model: " + ((meta && meta.label) || b.dataset.v));
    });
  }
  const groqInput = $("#agentGroqKey");
  if (groqInput) {
    const stored = load(KEYS.groqKey, "") || "";
    if (stored && !groqInput.value) groqInput.value = stored;
    const persist = () => {
      const v = groqInput.value.trim();
      const prev = load(KEYS.groqKey, "") || "";
      save(KEYS.groqKey, v);
      // Refresh badge only when readiness flips (avoid wiping the input mid-edit)
      if (!!v !== !!prev) renderAgentEnginesPanel();
      else {
        const badge = el.querySelector(".agent-groq-key-row .agent-engine-badge");
        const detail = el.querySelector(".agent-groq-key-row .agent-engine-detail");
        if (badge) {
          badge.className = "agent-engine-badge " + (v ? "ready" : "anon");
          badge.textContent = v ? "ready" : "not set";
        }
        if (detail) {
          const link =
            ' · <a href="https://console.groq.com/keys" target="_blank" rel="noopener">Get free key</a>';
          detail.innerHTML =
            (v
              ? "Groq: ready — free text LLM for Agent Send"
              : "Groq: not set (Pollinations fallback)") + link;
        }
      }
    };
    groqInput.addEventListener("change", persist);
    groqInput.addEventListener("blur", persist);
  }
  const agentStylePackSeg = $("#agentStylePackSeg");
  if (agentStylePackSeg && !agentStylePackSeg.dataset.bound) {
    agentStylePackSeg.dataset.bound = "1";
    agentStylePackSeg.addEventListener("click", (e) => {
      const b = e.target.closest("button");
      if (!b) return;
      setStylePack(b.dataset.v);
      toast("Style pack: " + (getStylePack().label || b.dataset.v));
      // Refresh badge label without full re-render wipe
      const badge = el.querySelector(".agent-style-pack-row .agent-engine-badge");
      if (badge) badge.textContent = getStylePack().label || b.dataset.v;
    });
  }
}


async function generateAgentImage() {
  if (state.agentLoading || state.genLoading || state.storyboardRunning) return;
  const c = current();
  if (!c) {
    toast("Open a character first");
    return;
  }
  const input = $("#agentInput");
  let text = ((input && input.value) || "").trim();
  if (!text) {
    toast("Describe the scene in the box first");
    if (input) input.focus();
    return;
  }
  const chatMode = getAgentMode();
  const history = getAgentChat(chatMode);
  history.push({ role: "user", content: text, ts: Date.now() });
  setAgentChat(chatMode, history);
  if (input) input.value = "";

  state.agentLoading = true;
  state.agentStatusText = "Image Engine · building prompt…";
  syncAgentGenBtn();
  renderAgentChat();

  const aspect =
    ($("#aspectSeg .on") && $("#aspectSeg .on").dataset.v) || "3:4";
  let parsed = { mode: "soft", scene: text };

  try {
    try {
      const raw = await agentAskModeScene(text, c);
      parsed = parseModeScene(raw, text);
    } catch (_) {
      parsed = parseModeScene("", text);
    }

    setGenLoading(true);
    const result = await agentEngineImage({
      scene: parsed.scene,
      mode: parsed.mode,
      aspect,
      character: c,
      onStatus: (t) => {
        state.agentStatusText = t;
        setHordeQueueStatus(t);
        renderAgentChat();
      },
    });

    if (!result || !result.ok || !result.chatUrl) {
      throw new Error((result && result.error) || "Image Engine returned no image");
    }

    const used = result.provider || "horde";
    const chatUrl = result.chatUrl;
    const mediaUrl = result.mediaUrl || result.chatUrl;
    const caption =
      "Image Engine · " +
      parsed.mode +
      " · " +
      used +
      "\n" +
      parsed.scene.slice(0, 160);
    const next = getAgentChat(chatMode);
    next.push({
      role: "assistant",
      content: caption,
      imageUrl: chatUrl,
      ts: Date.now(),
    });
    setAgentChat(chatMode, next);
    state.lastGenUrl = mediaUrl || chatUrl;
    lightUpdateGenPreview(chatUrl);
    try {
      saveAgentGenToMedia(
        getCharacter(c.id) || c,
        mediaUrl || chatUrl,
        "Agent · " + parsed.mode + " · " + parsed.scene.slice(0, 40),
        parsed.scene,
        aspect
      );
      renderMedia();
    } catch (_) {}
    toast("Image Engine ready (" + used + ")");
  } catch (err) {
    const msg = (err && err.message) || "Image generation failed";
    toast(msg);
    const next = getAgentChat(chatMode);
    next.push({
      role: "assistant",
      content: "Image Engine couldn't generate that. " + msg,
      ts: Date.now(),
    });
    setAgentChat(chatMode, next);
  } finally {
    state.agentLoading = false;
    state.agentStatusText = "";
    clearHordeQueueStatus();
    setGenLoading(false);
    syncAgentGenBtn();
    renderAgentChat();
  }
}

async function generateAgentVideo() {
  if (state.agentLoading || state.genLoading) return;
  const c = current();
  if (!c) {
    toast("Open a character first");
    return;
  }
  const input = $("#agentInput");
  let text = ((input && input.value) || "").trim();
  if (!text) text = "short soft clip of the character";
  const chatMode = getAgentMode();
  const history = getAgentChat(chatMode);
  history.push({ role: "user", content: text, ts: Date.now() });
  setAgentChat(chatMode, history);
  if (input) input.value = "";

  state.agentLoading = true;
  state.agentStatusText = "Video Engine · checking…";
  syncAgentGenBtn();
  renderAgentChat();

  const aspect =
    ($("#aspectSeg .on") && $("#aspectSeg .on").dataset.v) || "9:16";
  let parsed = { mode: "soft", scene: text };
  try {
    try {
      const raw = await agentAskModeScene(text, c);
      parsed = parseModeScene(raw, text);
    } catch (_) {
      parsed = parseModeScene("", text);
    }

    const result = await agentEngineVideo({
      scene: parsed.scene,
      mode: parsed.mode,
      aspect,
      character: c,
      onStatus: (t) => {
        state.agentStatusText = t;
        renderAgentChat();
      },
    });

    const reply =
      (result && result.message) ||
      "Video engine: free video isn’t available yet.";
    const next = getAgentChat(chatMode);
    next.push({
      role: "assistant",
      content: reply,
      ts: Date.now(),
    });
    setAgentChat(chatMode, next);
    try {
      saveAgentVideoPendingToMedia(
        getCharacter(c.id) || c,
        "Video pending · " + parsed.mode + " · " + parsed.scene.slice(0, 36),
        "Agent Video Engine stub. Scene: " + parsed.scene.slice(0, 200),
        aspect,
        parsed.mode
      );
      renderMedia();
    } catch (_) {}
    toast("Video Engine: free stub (pending note saved)");
  } catch (err) {
    const msg = (err && err.message) || "Video Engine failed";
    toast(msg);
    const next = getAgentChat(chatMode);
    next.push({
      role: "assistant",
      content: "Video Engine: " + msg,
      ts: Date.now(),
    });
    setAgentChat(chatMode, next);
  } finally {
    state.agentLoading = false;
    state.agentStatusText = "";
    if (!state.genLoading && !state.storyboardRunning) clearHordeQueueStatus();
    syncAgentGenBtn();
    renderAgentChat();
  }
}


async function sendAgentMessage() {
  if (state.agentLoading || state.genLoading) return;
  const input = $("#agentInput");
  const text = ((input && input.value) || "").trim();
  if (!text) return;
  if (looksLikeAnimateRequest(text)) {
    const motion = text
      .replace(/^.*?animate\s+(this|that|it|last|the\s+still|the\s+image)\s*[:\-]?\s*/i, "")
      .trim();
    return animateLastStill(motion || text, { fromAgent: true });
  }
  if (looksLikeAgenticEdit(text)) {
    return applyAgenticEdit(text, { fromAgent: true });
  }
  if (looksLikeVideoRequest(text)) {
    return generateAgentVideo();
  }
  if (looksLikeGenerateRequest(text)) {
    return generateAgentImage();
  }
  const mode = getAgentMode();
  const history = getAgentChat(mode);
  history.push({ role: "user", content: text, ts: Date.now() });
  setAgentChat(mode, history);
  if (input) input.value = "";
  state.agentLoading = true;
  state.agentStatusText = "Thinking…";
  syncAgentGenBtn();
  renderAgentChat();
  try {
    const reply = await agentAsk(text);
    const next = getAgentChat(mode);
    next.push({ role: "assistant", content: reply, ts: Date.now() });
    setAgentChat(mode, next);
  } catch (err) {
    const msg = friendlyTextApiError(err, "Agent") || "Agent failed — try again";
    toast(msg);
    const next = getAgentChat(mode);
    next.push({
      role: "assistant",
      content: "Couldn't reply right now. " + msg,
      ts: Date.now(),
    });
    setAgentChat(mode, next);
  } finally {
    state.agentLoading = false;
    state.agentStatusText = "";
    if (!state.genLoading && !state.storyboardRunning) clearHordeQueueStatus();
    syncAgentGenBtn();
    renderAgentChat();
  }
}

function wireAgent() {
  ensureAgentSkills();
  const modeSeg = $("#agentModeSeg");
  if (modeSeg) {
    modeSeg.addEventListener("click", (e) => {
      const btn = e.target.closest("button[data-v]");
      if (!btn) return;
      setAgentMode(btn.dataset.v);
      syncAgentModeSeg();
      renderAgentChat();
      renderAgentSkills();
    });
  }
  const sendBtn = $("#agentSendBtn");
  if (sendBtn) sendBtn.addEventListener("click", () => sendAgentMessage());
  const genBtn = $("#agentGenBtn");
  if (genBtn) genBtn.addEventListener("click", () => generateAgentImage());
  const videoBtn = $("#agentVideoBtn");
  if (videoBtn) videoBtn.addEventListener("click", () => generateAgentVideo());
  const agentEditBtn = $("#agentEditBtn");
  if (agentEditBtn) {
    agentEditBtn.addEventListener("click", () => {
      const inp = $("#agentEditInput") || $("#agentInput");
      const v = ((inp && inp.value) || "").trim();
      if (!v) {
        toast("Type an edit (outfit / light / angle)");
        if (inp) inp.focus();
        return;
      }
      applyAgenticEdit(v, { fromAgent: true });
      if ($("#agentEditInput")) $("#agentEditInput").value = "";
    });
  }
  const agentAnimateBtn = $("#agentAnimateBtn");
  if (agentAnimateBtn) {
    agentAnimateBtn.addEventListener("click", () => {
      const inp = $("#agentEditInput") || $("#agentInput");
      const v = ((inp && inp.value) || "").trim();
      animateLastStill(v, { fromAgent: true });
    });
  }
  syncAgentGenBtn();
  renderAgentEnginesPanel();
  const input = $("#agentInput");
  if (input) {
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey && !e.isComposing) {
        // desktop: Enter sends; on narrow phones allow newline via soft keyboard without force
        const narrow = window.matchMedia && window.matchMedia("(max-width: 520px)").matches;
        if (!narrow) {
          e.preventDefault();
          sendAgentMessage();
        }
      }
    });
  }
  const clearBtn = $("#agentClearBtn");
  if (clearBtn) {
    clearBtn.addEventListener("click", () => {
      const mode = getAgentMode();
      if (!confirm("Clear " + mode + " chat?")) return;
      clearAgentChat(mode);
      renderAgentChat();
      toast("Chat cleared");
    });
  }
  const addSkill = $("#btn-add-skill");
  if (addSkill) addSkill.addEventListener("click", () => openSkillDialog(null));
  const cancel = $("#skill-cancel");
  if (cancel) {
    cancel.addEventListener("click", () => {
      const dlg = $("#skill-dialog");
      if (dlg.close) dlg.close();
      else dlg.removeAttribute("open");
    });
  }
  const form = $("#skill-form");
  if (form) {
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const name = $("#skill-name").value.trim();
      const description = $("#skill-desc").value.trim();
      const body = $("#skill-body").value.trim();
      const modeVal = $("#skill-modes").value || "both";
      if (!name || !body) return;
      ensureAgentSkills();
      let skills = getAgentSkills() || [];
      if (state.editingSkillId) {
        skills = skills.map((s) =>
          s.id === state.editingSkillId
            ? { ...s, name, description, body, modes: [modeVal] }
            : s
        );
      } else {
        skills.push({
          id: uid("skill"),
          name,
          description,
          body,
          enabled: true,
          modes: [modeVal],
        });
      }
      setAgentSkills(skills);
      const dlg = $("#skill-dialog");
      if (dlg.close) dlg.close();
      else dlg.removeAttribute("open");
      renderAgentSkills();
      toast(state.editingSkillId ? "Skill updated" : "Skill added");
      state.editingSkillId = null;
    });
  }
  const listEl = $("#agentSkillsList");
  if (listEl) {
    listEl.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-act]");
      if (!btn) return;
      const card = btn.closest("[data-id]");
      if (!card) return;
      const id = card.dataset.id;
      ensureAgentSkills();
      let skills = getAgentSkills() || [];
      const skill = skills.find((s) => s.id === id);
      if (!skill) return;
      const act = btn.dataset.act;
      if (act === "toggle") {
        const checked = btn.checked;
        skills = skills.map((s) => (s.id === id ? { ...s, enabled: !!checked } : s));
        setAgentSkills(skills);
        return;
      }
      if (act === "edit") {
        openSkillDialog(skill);
        return;
      }
      if (act === "delete") {
        if (!confirm('Delete skill "' + skill.name + '"?')) return;
        setAgentSkills(skills.filter((s) => s.id !== id));
        renderAgentSkills();
        toast("Skill deleted");
      }
    });
    listEl.addEventListener("change", (e) => {
      const cb = e.target.closest('input[data-act="toggle"]');
      if (!cb) return;
      const card = cb.closest("[data-id]");
      if (!card) return;
      ensureAgentSkills();
      let skills = getAgentSkills() || [];
      skills = skills.map((s) =>
        s.id === card.dataset.id ? { ...s, enabled: !!cb.checked } : s
      );
      setAgentSkills(skills);
    });
  }
}


