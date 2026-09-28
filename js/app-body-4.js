// ——— Export / Import ———
function doExport() {
  ensureAgentSkills();
  const payload = {
    _app: "lumora-personal",
    _version: 1,
    exportedAt: new Date().toISOString(),
    characters: getCharacters(),
    agentSkills: getAgentSkills() || [],
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "lumora-personal-backup-" + todayKey() + ".json";
  a.click();
  URL.revokeObjectURL(a.href);
  toast("Exported JSON backup");
}

function doImport(file) {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const data = JSON.parse(reader.result);
      if (Array.isArray(data.characters)) {
        setCharacters(data.characters);
      } else if (data.character) {
        // legacy single-character backup from ai-influencer-personal
        const migrated = emptyCharData({
          name: data.character.name,
          age: data.character.age,
          personality: data.character.personality,
          backstory: data.character.backstory,
          speakingStyle: data.character.speakingStyle,
          masterAppearance: data.character.masterAppearance,
          prompts: data.prompts,
          captionFavorites: data.captionFavorites,
          calendar: data.calendar,
          checklist: data.checklist,
          niche: "Soft aesthetic / NSFW",
        });
        const list = getCharacters();
        list.push(migrated);
        setCharacters(list);
      } else {
        toast("Import failed — unrecognized format");
        return;
      }
      if (Array.isArray(data.agentSkills) && data.agentSkills.length) {
        setAgentSkills(data.agentSkills);
      }
      toast("Import complete");
      if (curPath() === "/app") renderDashboard();
      else if (curPath().startsWith("/i/")) loadWorkspace(curPath().slice(3));
      else go("/app");
    } catch {
      toast("Import failed — invalid JSON");
    }
  };
  reader.readAsText(file);
}

// ——— Boot / events ———
function boot() {
  ensureStarter();

  // presets + APOB-lite quick sets / pills
  $("#presets").innerHTML = SCENE_PRESETS.map(
    ([l], i) => '<button type="button" class="chip" data-p="' + i + '">' + esc(l) + "</button>"
  ).join("");
  renderQuickSets();
  renderPromptPills();
  ensureAgentSkills();
  wireAgent();

  // routing
  window.addEventListener("hashchange", route);
  window.addEventListener(
    "scroll",
    () => {
      if (!$("#view-home").hidden) $("#topbar").classList.toggle("solid", window.scrollY > 40);
    },
    { passive: true }
  );

  document.addEventListener("click", (e) => {
    const g = e.target.closest("[data-go]");
    if (g) {
      e.preventDefault();
      go(g.dataset.go);
      return;
    }
  });

  // drawer
  $("#menuBtn").addEventListener("click", () => {
    const open = !$("#drawer").classList.contains("open");
    $("#drawer").classList.toggle("open", open);
    $("#menuBtn").setAttribute("aria-expanded", String(open));
    if (open) $("#topbar").classList.add("solid");
  });
  $("#drawerExport").addEventListener("click", () => {
    closeDrawer();
    doExport();
  });
  $("#drawerImport").addEventListener("click", () => {
    closeDrawer();
    $("#importFile").click();
  });

  // chips
  document.addEventListener("click", (e) => {
    const chip = e.target.closest(".chips[data-name] .chip");
    if (!chip) return;
    const group = chip.parentElement;
    const was = chip.classList.contains("on");
    $$(".chip", group).forEach((c) => c.classList.remove("on"));
    if (!was || ["gender", "ethnicity", "niche"].includes(group.dataset.name)) chip.classList.add("on");
  });

  // age
  $("#ageRange").addEventListener("input", (e) => ($("#ageOut").textContent = e.target.value));

  // create
  $("#createForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const f = e.target;
    const name = f.elements.name.value.trim();
    if (!name) {
      f.elements.name.focus();
      toast("Give your character a name");
      return;
    }
    let age = parseInt(f.elements.age.value, 10);
    if (isNaN(age) || age < 21) age = 21;
    const { attrs, niche } = collectCreateAttrs(f);
    const personality = f.elements.personality.value.trim();
    const master = buildMasterFromAttrs(name, age, attrs, niche);
    const char = emptyCharData({
      name,
      age,
      niche,
      attrs,
      personality,
      masterAppearance: master,
      prompts: [],
      calendar: STARTER_WEEK.map((x) => ({ ...x, id: uid("c") })),
    });
    const list = getCharacters();
    list.unshift(char);
    setCharacters(list);
    f.reset();
    $("#ageOut").textContent = "22";
    toast("Character saved");
    go("/i/" + char.id);
  });

  // workspace groups + tabs
  const wsGroups = $("#wsGroups");
  if (wsGroups) {
    wsGroups.addEventListener("click", (e) => {
      const g = e.target.closest(".ws-group");
      if (!g) return;
      setGroup(g.dataset.group);
    });
  }
  $("#wsTabs").addEventListener("click", (e) => {
    const tab = e.target.closest(".ws-tab");
    if (!tab || tab.hidden) return;
    setTab(tab.dataset.tab);
  });

  // bible
  $("#btn-save-character").addEventListener("click", () => {
    const c = current();
    if (!c) return;
    const patch = readBibleForm();
    updateCharacter(c.id, patch);
    const fresh = getCharacter(c.id);
    renderInfHead(fresh);
    syncFaceLockGenUI(fresh);
    toast("Bible saved");
  });
  $("#btn-copy-master").addEventListener("click", async () => {
    const ok = await copyText($("#char-master").value);
    toast(ok ? "Master description copied" : "Copy failed");
  });
  $("#btn-rebuild-master").addEventListener("click", () => {
    const c = current();
    if (!c) return;
    const name = $("#char-name").value.trim() || c.name;
    let age = parseInt($("#char-age").value, 10);
    if (isNaN(age) || age < 21) age = c.age || 22;
    const niche = $("#char-niche").value.trim() || c.niche;
    $("#char-master").value = buildMasterFromAttrs(name, age, c.attrs, niche);
    toast("Master rebuilt from look attrs — save to keep");
  });

  $("#infHead").addEventListener("click", (e) => {
    if (!e.target.closest("#delCharBtn")) return;
    const c = current();
    if (!c) return;
    if (!confirm('Delete character "' + c.name + '"? This cannot be undone.')) return;
    deleteCharacter(c.id);
    toast("Character deleted");
    go("/app");
  });

  // prompts
  $("#prompt-filter").addEventListener("change", renderPrompts);
  $("#btn-add-prompt").addEventListener("click", () => openPromptDialog(null));
  $("#prompt-cancel").addEventListener("click", () => $("#prompt-dialog").close());
  $("#prompt-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const c = current();
    if (!c) return;
    const title = $("#prompt-title").value.trim();
    const mood = $("#prompt-mood").value;
    const scene = $("#prompt-scene").value.trim();
    const notes = $("#prompt-notes").value.trim();
    if (!title || !scene) return;
    let prompts = [...(c.prompts || [])];
    if (state.editingPromptId) {
      prompts = prompts.map((p) =>
        p.id === state.editingPromptId ? { ...p, title, mood, scene, notes } : p
      );
    } else {
      prompts.push({ id: uid("p"), title, mood, scene, notes });
    }
    updateCharacter(c.id, { prompts });
    $("#prompt-dialog").close();
    renderPrompts();
    toast(state.editingPromptId ? "Prompt updated" : "Prompt added");
  });
  $("#prompt-list").addEventListener("click", async (e) => {
    const btn = e.target.closest("[data-act]");
    if (!btn) return;
    const c = current();
    if (!c) return;
    const card = btn.closest("[data-id]");
    const id = card.dataset.id;
    const prompts = c.prompts || [];
    const prompt = prompts.find((p) => p.id === id);
    if (!prompt) return;
    if (btn.dataset.act === "copy") {
      const full = buildFullPrompt(c, prompt.scene);
      const ok = await copyText(full);
      toast(ok ? "Full prompt copied (master + scene)" : "Copy failed");
    } else if (btn.dataset.act === "use") {
      $("#sceneInput").value = prompt.scene;
      setTab("generate");
      updateFullPreview();
      toast("Scene loaded");
    } else if (btn.dataset.act === "edit") {
      openPromptDialog(prompt);
    } else if (btn.dataset.act === "delete") {
      if (confirm('Delete prompt "' + prompt.title + '"?')) {
        updateCharacter(c.id, { prompts: prompts.filter((p) => p.id !== id) });
        renderPrompts();
        toast("Prompt deleted");
      }
    }
  });

  // generate scene
  $("#presets").addEventListener("click", (e) => {
    const chip = e.target.closest(".chip");
    if (!chip) return;
    $$("#presets .chip").forEach((x) => x.classList.remove("on"));
    chip.classList.add("on");
    $$(".preset-tile").forEach((x) => x.classList.remove("on"));
    const [, p] = SCENE_PRESETS[+chip.dataset.p];
    $("#sceneInput").value = p;
    updateFullPreview();
  });
  const quickSetsEl = $("#quickSets");
  if (quickSetsEl) {
    quickSetsEl.addEventListener("click", (e) => {
      const tile = e.target.closest(".preset-tile, .quick-set-card, [data-pt], [data-qs]");
      if (!tile) return;
      const id = tile.dataset.pt || tile.dataset.qs;
      // One-tap: fill scene + start generate
      applyPresetTile(id, true);
    });
  }
  const pillsEl = $("#promptPills");
  if (pillsEl) {
    pillsEl.addEventListener("click", (e) => {
      const pill = e.target.closest(".prompt-pill");
      if (!pill) return;
      appendScenePill(pill.dataset.pill);
    });
  }
  const genFaceToggle = $("#genFaceLockToggle");
  if (genFaceToggle) {
    genFaceToggle.addEventListener("change", () => {
      persistFaceLockFromGen(genFaceToggle.checked);
      toast(genFaceToggle.checked ? "Face-lock ON — scene-only prompts" : "Face-lock off");
    });
  }
  const rebuildGenBtn = $("#btnRebuildFaceLockGen");
  if (rebuildGenBtn) {
    rebuildGenBtn.addEventListener("click", () => {
      const s = rebuildFaceLockForCurrent();
      toast(s ? "Short lock rebuilt from master" : "No character");
    });
  }
  const rebuildBibleBtn = $("#btn-rebuild-face-lock");
  if (rebuildBibleBtn) {
    rebuildBibleBtn.addEventListener("click", () => {
      const s = rebuildFaceLockForCurrent();
      toast(s ? "Short lock rebuilt — save bible to keep" : "No character");
    });
  }
  const bibleFaceEn = $("#char-face-lock-enabled");
  if (bibleFaceEn) {
    bibleFaceEn.addEventListener("change", () => {
      const c = current();
      if (!c) return;
      const fl = normalizeFaceLock({
        enabled: bibleFaceEn.checked,
        shortIdentity: ($("#char-face-lock-identity") && $("#char-face-lock-identity").value) || "",
        notes: ($("#char-face-lock-notes") && $("#char-face-lock-notes").value) || "",
      });
      if (fl.enabled && !fl.shortIdentity) {
        fl.shortIdentity = compressMasterToShortIdentity({
          ...c,
          masterAppearance: ($("#char-master") && $("#char-master").value) || c.masterAppearance,
        });
        if ($("#char-face-lock-identity")) $("#char-face-lock-identity").value = fl.shortIdentity;
      }
      updateCharacter(c.id, { faceLock: fl });
      syncFaceLockGenUI(getCharacter(c.id));
    });
  }
  $("#sceneInput").addEventListener("input", () => {
    $$("#presets .chip").forEach((x) => x.classList.remove("on"));
    $$(".preset-tile").forEach((x) => x.classList.remove("on"));
    updateFullPreview();
  });
  $("#aspectSeg").addEventListener("click", (e) => {
    const b = e.target.closest("button");
    if (!b) return;
    $$("#aspectSeg button").forEach((x) => x.classList.remove("on"));
    b.classList.add("on");
  });
  $("#modeSeg").addEventListener("click", (e) => {
    const b = e.target.closest("button");
    if (!b) return;
    setGenMode(b.dataset.v);
    renderQuickSets();
  });
  const stylePackSeg = $("#stylePackSeg");
  if (stylePackSeg) {
    setStylePack(load(KEYS.stylePack, "photoreal") || "photoreal");
    stylePackSeg.addEventListener("click", (e) => {
      const b = e.target.closest("button");
      if (!b) return;
      setStylePack(b.dataset.v);
      toast("Style pack: " + (getStylePack().label || b.dataset.v));
    });
  }
  const agentStylePackSeg = $("#agentStylePackSeg");
  if (agentStylePackSeg) {
    setStylePack(load(KEYS.stylePack, "photoreal") || "photoreal");
    agentStylePackSeg.addEventListener("click", (e) => {
      const b = e.target.closest("button");
      if (!b) return;
      setStylePack(b.dataset.v);
      toast("Style pack: " + (getStylePack().label || b.dataset.v));
    });
  }
  const storyboardBtn = $("#storyboardBtn");
  if (storyboardBtn) {
    storyboardBtn.addEventListener("click", () => runStoryboardSet());
  }
  const providerEl = $("#genProvider");
  {
    let storedProvider = load(KEYS.genProvider, "horde") || "horde";
    const initialMode = load(KEYS.genMode, "soft");
    if (storedProvider === "grok") storedProvider = "horde";
    // No provider picker: Flux only if NIM key already stored; else Horde (or Pollinations Soft/Suggestive if previously stored)
    const hasNvidia =
      typeof getNvidiaKey === "function" ? !!getNvidiaKey() : !!(load(KEYS.nvidiaKey, "") || "");
    let initial =
      storedProvider === "flux" && hasNvidia
        ? "flux"
        : storedProvider === "pollinations" && initialMode !== "nsfw"
          ? "pollinations"
          : "horde";
    if (providerEl) {
      providerEl.value = initial;
      providerEl.addEventListener("change", () => {
        setGenProvider(providerEl.value);
      });
    }
    // Provider picker UI removed — silent default (Horde / stored) until Cloudflare.
    setGenProvider(initial);
  }
  const fluxSeg = $("#genFluxModelSeg");
  if (fluxSeg && !fluxSeg.dataset.bound) {
    fluxSeg.dataset.bound = "1";
    if (typeof setFluxModel === "function") {
      setFluxModel(load(KEYS.fluxModel, "schnell") || "schnell");
    }
    fluxSeg.addEventListener("click", (e) => {
      const b = e.target.closest("button");
      if (!b || !b.dataset.v) return;
      if (typeof setFluxModel === "function") setFluxModel(b.dataset.v);
      toast("Flux model: " + (b.dataset.v === "kontext" ? "Kontext" : "Schnell"));
    });
  }
  if (typeof syncFluxModelVisibility === "function") syncFluxModelVisibility();
  const useHordeBtn = $("#useHordeBtn");
  if (useHordeBtn) {
    useHordeBtn.addEventListener("click", () => {
      setGenProvider("horde");
      toast("Using AI Horde for generation");
    });
  }
  const hordeKeyEl = $("#genHordeKey");
  if (hordeKeyEl) {
    const storedKey = load(KEYS.hordeKey, "");
    if (storedKey) hordeKeyEl.value = storedKey;
    const persistHordeKey = () => {
      save(KEYS.hordeKey, hordeKeyEl.value.trim());
      if (typeof renderAgentEnginesPanel === "function") renderAgentEnginesPanel();
    };
    hordeKeyEl.addEventListener("change", persistHordeKey);
    hordeKeyEl.addEventListener("blur", persistHordeKey);
  }
  setGenMode(load(KEYS.genMode, "soft"));
  syncHordeKeyVisibility();
  $("#generateImageBtn").addEventListener("click", () => generateSceneImage());
  // Steal List W3: agentic edit + animate on Generate preview
  const genEditBtn = $("#agenticEditBtn");
  if (genEditBtn && !genEditBtn.dataset.bound) {
    genEditBtn.dataset.bound = "1";
    genEditBtn.addEventListener("click", () => {
      const inp = $("#agenticEditInput");
      applyAgenticEdit(((inp && inp.value) || "").trim(), { fromAgent: false });
    });
  }
  const genAnimateBtn = $("#animateStillBtn");
  if (genAnimateBtn && !genAnimateBtn.dataset.bound) {
    genAnimateBtn.dataset.bound = "1";
    genAnimateBtn.addEventListener("click", () => {
      const inp = $("#agenticEditInput");
      animateLastStill(((inp && inp.value) || "").trim(), { fromAgent: false });
    });
  }
  document.body.dataset.agenticEditBoxBound = "1";
  // Steal List W5–6
  (function wireStealW56() {
    if (document.body.dataset.stealW56Bound === "1") return;
    document.body.dataset.stealW56Bound = "1";
    const dressFile = $("#dressRefFile");
    if (dressFile) {
      dressFile.addEventListener("change", () => {
        if (dressFile.files && dressFile.files[0]) {
          setDressRefFromFile(dressFile.files[0]).finally(() => {
            dressFile.value = "";
          });
        }
      });
    }
    const agentDressFile = $("#agentDressRefFile");
    if (agentDressFile) {
      agentDressFile.addEventListener("change", () => {
        if (agentDressFile.files && agentDressFile.files[0]) {
          setDressRefFromFile(agentDressFile.files[0]).finally(() => {
            agentDressFile.value = "";
          });
        }
      });
    }
    const dressApply = $("#dressRefApplyBtn");
    if (dressApply) dressApply.addEventListener("click", () => applyDressFromRef());
    const agentDressApply = $("#agentDressRefApplyBtn");
    if (agentDressApply)
      agentDressApply.addEventListener("click", () => applyDressFromRef());
    document.body.addEventListener("click", (e) => {
      if (e.target.closest("[data-dress-clear]")) {
        clearDressRef();
        return;
      }
      const dir = e.target.closest("[data-director]");
      if (dir) {
        applyDirectorPill(dir.getAttribute("data-director"));
        return;
      }
      const mgen = e.target.closest("[data-movie-gen]");
      if (mgen) {
        generateMovieBeat(mgen.getAttribute("data-movie-gen"));
        return;
      }
      if (e.target.closest("[data-movie-clear]")) {
        clearMoviePack();
      }
    });
    document.body.addEventListener("change", (e) => {
      const done = e.target.closest("[data-movie-done]");
      if (done) {
        toggleMovieBeatDone(done.getAttribute("data-movie-done"));
        return;
      }
      if (
        e.target.id === "duoCastEnabled" ||
        e.target.id === "agentDuoCastEnabled" ||
        e.target.id === "duoCastPick" ||
        e.target.id === "agentDuoCastPick"
      ) {
        if (e.target.id === "duoCastEnabled" && $("#agentDuoCastEnabled")) {
          $("#agentDuoCastEnabled").checked = e.target.checked;
        }
        if (e.target.id === "agentDuoCastEnabled" && $("#duoCastEnabled")) {
          $("#duoCastEnabled").checked = e.target.checked;
        }
        saveDuoCastFromUI();
        return;
      }
      if (e.target.id === "dressRefVibe" || e.target.id === "agentDressRefVibe") {
        const c = current();
        if (!c) return;
        const dr = getDressRef(c);
        dr.vibe = String(e.target.value || "").trim().slice(0, 200);
        updateCharacter(c.id, { dressRef: dr });
        if (e.target.id === "dressRefVibe" && $("#agentDressRefVibe")) {
          $("#agentDressRefVibe").value = dr.vibe;
        }
        if (e.target.id === "agentDressRefVibe" && $("#dressRefVibe")) {
          $("#dressRefVibe").value = dr.vibe;
        }
      }
    });
    ["duoCastName", "duoCastIdentity", "agentDuoCastName", "agentDuoCastIdentity"].forEach(
      (id) => {
        const el = $("#" + id);
        if (!el) return;
        el.addEventListener("change", () => saveDuoCastFromUI());
        el.addEventListener("blur", () => saveDuoCastFromUI());
      }
    );
    const movieBtn = $("#moviePackBtn");
    if (movieBtn) movieBtn.addEventListener("click", () => createMoviePack());
    renderDressRefUI(current());
    renderDuoCastUI(current());
    renderMoviePackUI(current());
    renderDirectorPills();
  })();

  // Steal List W4: character wizard chips + hero face pack
  const wiz = $("#characterWizard");
  if (wiz && !wiz.dataset.bound) {
    wiz.dataset.bound = "1";
    wiz.addEventListener("click", (e) => {
      const chip = e.target.closest(".chip[data-wv]");
      if (!chip) return;
      const group = chip.closest(".wizard-group");
      if (!group) return;
      applyWizardSelection(group.dataset.wg, chip.dataset.wv);
    });
  }
  const heroRoot = $("#heroFacePack");
  if (heroRoot && !heroRoot.dataset.bound) {
    heroRoot.dataset.bound = "1";
    heroRoot.addEventListener("change", (e) => {
      const fileInput = e.target.closest("#heroFaceFile");
      if (!fileInput || !fileInput.files || !fileInput.files[0]) return;
      addHeroFaceFromFile(fileInput.files[0]).finally(() => {
        fileInput.value = "";
      });
    });
    heroRoot.addEventListener("click", (e) => {
      const del = e.target.closest("[data-hf-del]");
      if (del) {
        removeHeroFace(del.getAttribute("data-hf-del"));
        return;
      }
      const thumb = e.target.closest("[data-hf]");
      if (thumb) setPrimaryHeroFace(thumb.getAttribute("data-hf"));
    });
  }
  $("#copyFullPromptBtn").addEventListener("click", async () => {
    const c = current();
    if (!c) return;
    const scene = $("#sceneInput").value.trim();
    if (!scene) {
      toast("Describe a scene first");
      $("#sceneInput").focus();
      return;
    }
    const full = prepareGenPrompt(buildFullPrompt(c, scene), getGenMode());
    const ok = await copyText(full);
    toast(ok ? "Full prompt copied" : "Copy failed");
  });
  $("#btn-save-gen").addEventListener("click", async () => {
    const c = current();
    if (!c) return;
    const label = $("#genNoteLabel").value.trim() || $("#sceneInput").value.trim().slice(0, 60) || "Untitled generation";
    const notes = $("#genNoteBody").value.trim() || $("#sceneInput").value.trim();
    const aspect = $("#aspectSeg .on").dataset.v;
    let imageDataUrl = null;
    try {
      imageDataUrl = await fileToDataUrl($("#genImageFile").files[0]);
    } catch (err) {
      toast(err.message);
      return;
    }
    const imageUrl = !imageDataUrl && state.lastGenUrl ? state.lastGenUrl : null;
    if (!imageDataUrl && !imageUrl && !notes && !$("#genNoteLabel").value.trim()) {
      toast("Generate an image, attach a file, or add a label/notes first");
      return;
    }
    const media = [
      {
        id: uid("m"),
        label,
        notes,
        aspect,
        imageDataUrl,
        imageUrl,
        createdAt: new Date().toISOString(),
      },
      ...(c.media || []),
    ];
    updateCharacter(c.id, { media });
    $("#genNoteLabel").value = "";
    $("#genNoteBody").value = "";
    $("#genImageFile").value = "";
    renderMedia();
    renderInfHead(getCharacter(c.id));
    toast("Saved to media library");
    setTab("media");
  });

  // captions
  $("#btn-gen-caption").addEventListener("click", () => {
    const c = current();
    if (!c) return;
    $("#caption-draft").value = composeCaption(
      $("#caption-mood").value,
      $("#caption-topic").value,
      c.name
    );
  });
  $("#btn-copy-caption").addEventListener("click", async () => {
    const text = $("#caption-draft").value;
    if (!text.trim()) {
      toast("Nothing to copy yet");
      return;
    }
    const ok = await copyText(text);
    toast(ok ? "Caption copied" : "Copy failed");
  });
  $("#btn-save-fav").addEventListener("click", () => {
    const c = current();
    if (!c) return;
    const text = $("#caption-draft").value.trim();
    if (!text) {
      toast("Draft a caption first");
      return;
    }
    const favs = [{ id: uid("f"), text, savedAt: new Date().toISOString() }, ...(c.captionFavorites || [])].slice(0, 50);
    updateCharacter(c.id, { captionFavorites: favs });
    renderCaptions();
    toast("Saved to favorites");
  });
  $("#caption-favs").addEventListener("click", async (e) => {
    const btn = e.target.closest("[data-fact]");
    if (!btn) return;
    const c = current();
    if (!c) return;
    const id = btn.closest("[data-fid]").dataset.fid;
    const favs = c.captionFavorites || [];
    const item = favs.find((f) => f.id === id);
    if (!item) return;
    if (btn.dataset.fact === "copy") {
      const ok = await copyText(item.text);
      toast(ok ? "Copied" : "Copy failed");
    } else if (btn.dataset.fact === "delete") {
      updateCharacter(c.id, { captionFavorites: favs.filter((f) => f.id !== id) });
      renderCaptions();
      toast("Removed");
    }
  });

  // calendar
  $("#btn-add-idea").addEventListener("click", () => {
    const c = current();
    if (!c) return;
    const calendar = [...(c.calendar || []), { id: uid("c"), day: "Monday", idea: "New soft idea…", status: "idea" }];
    updateCharacter(c.id, { calendar });
    renderCalendar();
    toast("Idea added");
  });
  $("#btn-reset-week").addEventListener("click", () => {
    const c = current();
    if (!c) return;
    if (!confirm("Replace calendar with the starter week of ideas?")) return;
    updateCharacter(c.id, { calendar: STARTER_WEEK.map((x) => ({ ...x, id: uid("c") })) });
    renderCalendar();
    toast("Starter week loaded");
  });
  $("#calendar-list").addEventListener("change", (e) => {
    const field = e.target.dataset.field;
    if (!field) return;
    const c = current();
    if (!c) return;
    const id = e.target.closest("[data-cid]").dataset.cid;
    const calendar = (c.calendar || []).map((item) =>
      item.id === id ? { ...item, [field]: e.target.value } : item
    );
    updateCharacter(c.id, { calendar });
    if (field === "status" || field === "day") renderCalendar();
  });
  $("#calendar-list").addEventListener("input", (e) => {
    if (e.target.dataset.field !== "idea") return;
    const c = current();
    if (!c) return;
    const id = e.target.closest("[data-cid]").dataset.cid;
    const calendar = (c.calendar || []).map((item) =>
      item.id === id ? { ...item, idea: e.target.value } : item
    );
    updateCharacter(c.id, { calendar });
  });
  $("#calendar-list").addEventListener("click", (e) => {
    const btn = e.target.closest("[data-cact]");
    if (!btn || btn.dataset.cact !== "delete") return;
    const c = current();
    if (!c) return;
    const id = btn.closest("[data-cid]").dataset.cid;
    updateCharacter(c.id, { calendar: (c.calendar || []).filter((x) => x.id !== id) });
    renderCalendar();
    toast("Idea removed");
  });

  // checklist
  $("#checklist-items").addEventListener("change", (e) => {
    const id = e.target.dataset.chk;
    if (!id) return;
    const c = current();
    if (!c) return;
    const st = getChecklistState(c);
    st.checked[id] = e.target.checked;
    updateCharacter(c.id, { checklist: st });
    renderChecklist();
  });
  $("#btn-reset-checklist").addEventListener("click", () => {
    const c = current();
    if (!c) return;
    const fresh = {
      date: todayKey(),
      checked: Object.fromEntries(CHECKLIST_ITEMS.map((i) => [i.id, false])),
    };
    updateCharacter(c.id, { checklist: fresh });
    renderChecklist();
    toast("Checklist reset");
  });

  // media
  $("#btn-add-media-note").addEventListener("click", () => {
    $("#media-label").value = "";
    $("#media-notes").value = "";
    $("#media-aspect").value = "3:4";
    $("#media-file").value = "";
    $("#media-dialog").showModal();
  });
  $("#media-cancel").addEventListener("click", () => $("#media-dialog").close());
  $("#media-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const c = current();
    if (!c) return;
    const label = $("#media-label").value.trim();
    if (!label) return;
    let imageDataUrl = null;
    try {
      imageDataUrl = await fileToDataUrl($("#media-file").files[0]);
    } catch (err) {
      toast(err.message);
      return;
    }
    const media = [
      {
        id: uid("m"),
        label,
        notes: $("#media-notes").value.trim(),
        aspect: $("#media-aspect").value,
        imageDataUrl,
        createdAt: new Date().toISOString(),
      },
      ...(c.media || []),
    ];
    updateCharacter(c.id, { media });
    $("#media-dialog").close();
    renderMedia();
    renderInfHead(getCharacter(c.id));
    toast("Media note saved");
  });
  $("#mediaGrid").addEventListener("click", (e) => {
    const t = e.target.closest("[data-open]");
    if (t) openMediaViewer(t.dataset.open);
  });
  $("#viewerClose").addEventListener("click", closeViewer);
  $("#viewer").addEventListener("click", (e) => {
    if (e.target.id === "viewer") closeViewer();
    const b = e.target.closest("[data-act]");
    if (!b || b.dataset.act !== "delete-media") return;
    const c = current();
    if (!c || !state.viewing) return;
    if (!confirm("Delete this media note?")) return;
    updateCharacter(c.id, { media: (c.media || []).filter((m) => m.id !== state.viewing.id) });
    closeViewer();
    renderMedia();
    renderInfHead(getCharacter(c.id));
    toast("Deleted");
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeViewer();
  });

  // export / import
  $("#btnExport").addEventListener("click", doExport);
  $("#btnImport").addEventListener("click", () => $("#importFile").click());
  $("#importFile").addEventListener("change", (e) => {
    const file = e.target.files && e.target.files[0];
    e.target.value = "";
    if (file) doImport(file);
  });

  route();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", boot);
} else {
  boot();
}
