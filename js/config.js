/** Storage keys — keep aips_ prefix for localStorage compatibility */
export const PREFIX = "aips_";
export const KEYS = {
  characters: PREFIX + "characters",
  migrated: PREFIX + "migrated_v1",
  genMode: PREFIX + "gen_mode",
  hordeKey: PREFIX + "horde_key",
  xaiKey: PREFIX + "xai_key",
  groqKey: PREFIX + "groq_key",
  nvidiaKey: PREFIX + "nvidia_key",
  nvidiaModel: PREFIX + "nvidia_model",
  nvidiaProxy: PREFIX + "nvidia_proxy",
  featherlessKey: PREFIX + "featherless_key",
  openrouterKey: PREFIX + "openrouter_key",
  bluesmindsKey: PREFIX + "bluesminds_key",
  bluesmindsModel: PREFIX + "bluesminds_model",
  bluesmindsImageModel: PREFIX + "bluesminds_image_model",
  cfAiWorker: PREFIX + "cf_ai_worker",
  genProvider: PREFIX + "gen_provider",
  fluxModel: PREFIX + "flux_model",
  agentSkills: PREFIX + "agent_skills",
  hordeSoftSkillsV1: PREFIX + "horde_soft_skills_v1",
  groqSkillsV1: PREFIX + "groq_skills_v1",
  agentChatStudio: PREFIX + "agent_chat_studio",
  agentChatLila: PREFIX + "agent_chat_lila",
  agentMode: PREFIX + "agent_mode",
  stylePack: PREFIX + "style_pack",
  stealListSkillsV1: PREFIX + "steal_list_skills_v1",
  stealListSkillsV2: PREFIX + "steal_list_skills_v2",
  stealListSkillsV3: PREFIX + "steal_list_skills_v3",
  bluesmindsImageSkillsV1: PREFIX + "bluesminds_image_skills_v1",
  bluesmindsImageModelV2: PREFIX + "bluesminds_image_model_v2",
  bluesmindsImageModelV3: PREFIX + "bluesminds_image_model_v3",
};

/** Public browser DSN (safe in frontend). Org: lumora-i0 / project: lumora-personal-phone */
export const SENTRY_DSN =
  "https://466326c5da046fdc672078432ca11a3f@o4512166492176384.ingest.us.sentry.io/4512166515179520";
export const APP_VERSION = "20260929b";

/**
 * PostHog public project API key (safe in frontend — not a personal/secret key).
 * Init: js/posthog-init.js via CDN array.js. autocapture off; pageviews on.
 */
export const POSTHOG_KEY = "phc_qiG8K2L6reTurDdnSzkrJMtvuB6VYc9uQUKXSkdEM4As";

