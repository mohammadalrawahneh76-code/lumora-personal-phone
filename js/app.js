/**
 * Lumora Personal — offline multi-character AI influencer studio
 * Storage prefix: aips_  (local only, no backend)
 *
 * Entry module. Data (starters, presets, agent skills, wizard) lives under ./js/.
 */
import { KEYS } from "./config.js";
import {
  STARTER_CHARACTER,
  STARTER_PROMPTS,
  STARTER_WEEK,
} from "./starters/lila-bloom.js";
import {
  CHECKLIST_ITEMS,
  CAPTION_TEMPLATES,
  TEMPLATE_DISPLAY,
} from "./data/captions.js";
import {
  SCENE_PRESETS,
  PRESET_TILES,
  PROMPT_PILLS,
  DIRECTOR_SHOT_PILLS,
} from "./data/presets.js";
import {
  STARTER_AGENT_SKILLS,
  APOB_AGENT_SKILLS,
  AGENT_ENGINES_SKILLS,
  STEAL_LIST_AGENT_SKILLS,
  GROK_NSFW_AGENT_SKILLS,
} from "./data/agent-skills.js";
import { WIZARD_GROUPS, PERSONALITY_VIBE_TEXT } from "./data/wizard.js";

const __lumoraParts = await Promise.all(
  [1, 2, 3, 4].map((n) =>
    fetch(new URL(`./app-body-${n}.js?v=20260928f`, import.meta.url)).then((r) => {
      if (!r.ok) throw new Error(`Failed to load app-body-${n}.js (${r.status})`);
      return r.text();
    })
  )
);
const __lumoraBody = __lumoraParts.join("");
const __lumoraRun = new Function(
"KEYS", "STARTER_CHARACTER", "STARTER_PROMPTS", "STARTER_WEEK", "CHECKLIST_ITEMS", "CAPTION_TEMPLATES", "TEMPLATE_DISPLAY", "SCENE_PRESETS", "PRESET_TILES", "PROMPT_PILLS", "DIRECTOR_SHOT_PILLS", "STARTER_AGENT_SKILLS", "APOB_AGENT_SKILLS", "AGENT_ENGINES_SKILLS", "STEAL_LIST_AGENT_SKILLS", "GROK_NSFW_AGENT_SKILLS", "WIZARD_GROUPS", "PERSONALITY_VIBE_TEXT",
  __lumoraBody
);
__lumoraRun(
KEYS, STARTER_CHARACTER, STARTER_PROMPTS, STARTER_WEEK, CHECKLIST_ITEMS, CAPTION_TEMPLATES, TEMPLATE_DISPLAY, SCENE_PRESETS, PRESET_TILES, PROMPT_PILLS, DIRECTOR_SHOT_PILLS, STARTER_AGENT_SKILLS, APOB_AGENT_SKILLS, AGENT_ENGINES_SKILLS, STEAL_LIST_AGENT_SKILLS, GROK_NSFW_AGENT_SKILLS, WIZARD_GROUPS, PERSONALITY_VIBE_TEXT
);
