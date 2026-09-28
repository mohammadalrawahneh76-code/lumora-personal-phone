/**
 * Lumora Personal — offline multi-character AI influencer studio
 * Storage prefix: aips_  (local only, no backend)
 */
(() => {
  "use strict";

  const PREFIX = "aips_";
  const KEYS = {
    characters: PREFIX + "characters",
    migrated: PREFIX + "migrated_v1",
    genMode: PREFIX + "gen_mode",
    hordeKey: PREFIX + "horde_key",
    xaiKey: PREFIX + "xai_key",
    groqKey: PREFIX + "groq_key",
    genProvider: PREFIX + "gen_provider",
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
  };

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

  // ——— Starter: Lila Bloom ———
  const LILA_MASTER =
    "Consistent character sheet — use verbatim every generation:\n" +
    "Adult woman, age 22, fictional. Soft cute aesthetic.\n" +
    "Face: heart-shaped soft face, fair warm skin with a natural peachy blush on cheeks and nose tip, light freckles across the bridge of the nose, full soft pink lips slightly parted, small beauty mark near the left corner of the mouth, gentle shy half-smile or soft gaze.\n" +
    "Eyes: large doe eyes, warm honey-brown irises with long dark lashes, soft bedroom eyes when intimate; often looking slightly up or aside when shy.\n" +
    "Hair: long wavy soft rose-pink hair with cream-blonde undertones, parted slightly off-center, silky strands framing the face, occasional loose braid or half-up ribbon; hair looks touchably soft.\n" +
    "Body: petite soft hourglass, slender waist, soft natural breasts, smooth stomach, rounded hips and thighs, delicate collarbones, small hands; soft feminine curves — cozy, not athletic.\n" +
    "Style default: cream lace, blush pink silks, oversized knit cardigans slipping off one shoulder, satin camisoles, soft ribbons, pearl earrings, bare feet or fluffy slippers indoors; lingerie leans soft pastel lace and silk rather than harsh fetish gear.\n" +
    "Lighting / mood: warm golden hour or soft pink lamp light, creamy bokeh, intimate and gentle, never harsh flash.\n" +
    "Identity lock: same face, same hair color, same body type every time. Adult 22+ only. Soft cute NSFW-capable aesthetic.";

  const STARTER_CHARACTER = {
    name: "Lila Bloom",
    age: 22,
    niche: "Soft aesthetic / NSFW",
    attrs: {
      gender: "Woman",
      ethnicity: "Any",
      hair: "Long soft rose-pink wavy",
      eyes: "Honey-brown",
      body: "Petite soft hourglass",
      style: "Soft cute pastel",
      details: "Light freckles, peachy blush, beauty mark near left mouth corner",
    },
    personality:
      "Soft-spoken, sweet, and a little shy — but curious and playfully flirty once she trusts you. Warm, affectionate, and easily flustered (in a cute way). Loves cozy rituals, compliments she pretends she can't handle, and teasing that never feels mean. Adult content: consensual, intimate, romantic-leaning NSFW; never cruel or degrading.",
    backstory:
      "Fictional 22-year-old woman who runs a dreamy personal feed from her sunlit apartment. She posts soft aesthetic moments by day and more intimate, blushy content for close followers by night. Invented character only — not based on any real person. She writes like she's whispering to someone special.",
    speakingStyle:
      "Gentle, slightly breathy tone in text. Soft fillers like “mm…”, “hehe”, “um—”. Short sentences. Lots of warmth. Uses soft emojis sparingly (♡, ☁️, 🌸). Gets shy mid-flirt (“wait— that sounded so bold…”). Never crude slang; keeps it sweet even when NSFW.",
    masterAppearance: LILA_MASTER,
    faceLock: {
      enabled: true,
      shortIdentity:
        "Lila Bloom — soft petite hourglass woman, adult age 22, long soft rose-pink wavy hair, honey-brown eyes, light freckles, peachy blush, beauty mark near left mouth corner.",
      notes: "Hero reference locked — change outfit/pose/scene only.",
    },
  };

  const STARTER_PROMPTS = [
    { id: "p1", title: "Golden hour window seat", mood: "soft", scene: "Sitting cross-legged on a cushioned window seat, oversized cream knit sweater slipping off one shoulder, soft rose-pink hair catching golden hour light, holding a warm mug with both hands, shy smile toward camera, cozy apartment plants in soft bokeh background, intimate portrait, cream and blush color palette", notes: "" },
    { id: "p2", title: "Mirror selfie — silk robe", mood: "suggestive", scene: "Standing in front of a tall mirror, soft blush-pink silk robe loosely tied, one shoulder bare, damp rose-pink hair, warm bathroom steam haze, phone held at chest height, shy eye contact in the reflection, soft lamp light, intimate but elegant, no harsh shadows", notes: "" },
    { id: "p3", title: "Bedtime whisper", mood: "nsfw", scene: "Lying on soft cream sheets, wearing delicate pastel lace lingerie (blush pink), rose-pink hair fanned across the pillow, looking at camera with shy bedroom eyes, one hand lightly at her collarbone, warm pink lamp light, romantic intimate mood, soft skin detail, adult content, tasteful sensual", notes: "" },
    { id: "p4", title: "Rainy night hoodie", mood: "soft", scene: "Curled on a sofa under a blanket, oversized soft hoodie, rain on the window behind her, holding a book to her chest, soft freckles visible, gentle smile, lavender and cream room tones, cozy hygge mood, natural soft lighting", notes: "" },
    { id: "p5", title: "Kitchen morning tease", mood: "suggestive", scene: "Standing in a sunlit kitchen, wearing only an oversized white button-up shirt half-buttoned, bare legs, soft rose-pink hair in a loose messy bun, holding a strawberry, shy half-smile, morning light through sheer curtains, soft shadows, intimate casual vibe", notes: "" },
    { id: "p6", title: "Close-up blush", mood: "nsfw", scene: "Extreme close intimate portrait, face and bare shoulders, soft peachy blush across cheeks, slightly parted pink lips, honey-brown eyes looking up shyly, rose-pink hair tousled, warm candlelight, sensual and sweet, adult mood, creamy skin texture, shallow depth of field", notes: "" },
    { id: "p7", title: "Ribbon & lace vanity", mood: "suggestive", scene: "Sitting at a vanity mirror tying a soft ribbon in her rose-pink hair, wearing a cream lace bralette and soft skirt, pearl earrings, bottles and perfume softly blurred, looking back over her shoulder with a shy flirty glance, pastel aesthetic, gentle film grain", notes: "" },
    { id: "p8", title: "Late-night sheets", mood: "nsfw", scene: "In bed under rumpled cream sheets pulled up loosely, soft pastel lace underwear visible at the hip, bare midriff, lying on her side facing camera, whispering expression, soft freckles, warm pink ambient light, romantic NSFW, intimate and tender not aggressive", notes: "" },
    { id: "p9", title: "Park picnic soft", mood: "soft", scene: "Sitting on a picnic blanket in a quiet park, cream sundress with small blush floral print, soft wind in rose-pink hair, holding a flower near her face, shy smile, dappled sunlight, dreamy bokeh, lifestyle influencer aesthetic, wholesome and pretty", notes: "" },
    { id: "p10", title: "After-shower steam", mood: "nsfw", scene: "Wrapped in a soft towel loosely at the chest, wet rose-pink hair dripping, steam in a warm bathroom, looking down shyly then glancing up, water droplets on collarbones and shoulders, intimate adult atmosphere, soft diffused light, sensual and cute", notes: "" },
    { id: "p11", title: "Bathtub petals", mood: "nsfw", scene: "Relaxing in a warm bathtub scattered with soft pink rose petals, water at mid-chest, wet rose-pink hair clinging to neck and shoulders, soft freckles, shy smile, candlelight reflections on wet skin, intimate adult atmosphere, romantic and tender, creamy pastel tones", notes: "" },
    { id: "p12", title: "Kneeling pillow talk", mood: "nsfw", scene: "Kneeling on a soft bed facing camera, wearing delicate blush sheer lingerie with tiny bows, rose-pink hair in loose waves, hands resting shyly on thighs, looking up with soft bedroom eyes, warm pink lamp glow, intimate NSFW, sweet and consensual mood, cream sheets behind her", notes: "" },
    { id: "p13", title: "Unbuttoning slowly", mood: "nsfw", scene: "Sitting on the edge of the bed, slowly unbuttoning a soft cream cardigan to reveal pastel lace bralette underneath, rose-pink hair falling forward, cheeks flushed, shy half-lidded glance at camera, warm evening light, sensual undressing moment, adult content, soft and cute not aggressive", notes: "" },
    { id: "p14", title: "Morning stretch nude-adjacent", mood: "nsfw", scene: "Waking stretch in soft morning light, cream sheet slipping to the waist, bare back and shoulders, rose-pink bed-hair, looking back over her shoulder with a sleepy shy smile, soft freckles, intimate adult bedroom scene, gentle backlight, romantic NSFW, tender and private", notes: "" },
    { id: "p15", title: "Mirror lingerie try-on", mood: "nsfw", scene: "Full-length mirror selfie, trying on soft pink lace lingerie set with matching thigh garters, one hand adjusting a strap, rose-pink hair in a soft ponytail, shy bitten lip, bedroom vanity lights, intimate adult try-on vibe, pastel aesthetic, tasteful sensual NSFW", notes: "" },
    { id: "p16", title: "Strawberry taste", mood: "nsfw", scene: "Close intimate crop, sitting cross-legged on bed in soft underwear, holding a strawberry to her lips with a shy playful look, juice faintly on lower lip, rose-pink hair, warm golden lamp, adult flirtatious mood, creamy skin, soft blush everywhere, cute NSFW food tease", notes: "" },
    { id: "p17", title: "Hands & collarbone", mood: "nsfw", scene: "Intimate crop from lips to waist, bare collarbones and soft cleavage in a low sheer camisole, her own hands lightly tracing her neck and sternum, rose-pink hair ends in frame, warm candlelight, sensual self-touch, adult romantic NSFW, shy expression just in frame, soft focus", notes: "" },
    { id: "p18", title: "Shower silhouette", mood: "nsfw", scene: "Behind steamed glass shower door, soft silhouette of her body with rose-pink hair visible as color, water droplets on glass, warm bathroom light, suggestive nude silhouette, intimate adult atmosphere, artistic soft NSFW, dreamy and private, no harsh detail", notes: "" },
    { id: "p19", title: "On-the-floor pillows", mood: "nsfw", scene: "Lying on a nest of cream and blush pillows on the floor, wearing only soft pastel knee socks and delicate panties, oversized shirt open, rose-pink hair spread out, looking at camera with shy invitation, fairy lights bokeh, intimate adult vibe, cute and soft NSFW", notes: "" },
    { id: "p20", title: "Goodnight whisper close", mood: "nsfw", scene: "Extreme close pillow talk framing, bare shoulders under a shared cream blanket, face close to camera as if whispering goodnight, soft parted lips, honey-brown eyes half-lidded, rose-pink hair messy, warm nightstand lamp, romantic intimate adult mood, tender NSFW closeness", notes: "" },
    { id: "p21", title: "Stocking peel", mood: "nsfw", scene: "Sitting on the bed edge rolling down a soft blush sheer stocking, pastel lace garter visible, rose-pink hair falling over one eye, shy focused expression, warm bedroom lamp, intimate undress detail, adult sensual mood, cream and pink palette, cute not crude", notes: "" },
    { id: "p22", title: "Backless night slip", mood: "nsfw", scene: "Standing with back to camera looking over her shoulder, wearing a soft satin blush night slip with open back, rose-pink hair cascading down bare spine, soft freckles on shoulders, dim romantic lighting, intimate adult evening, elegant sensual NSFW, shy glance", notes: "" },
    { id: "p23", title: "Couch blanket tease", mood: "nsfw", scene: "On a soft couch under a blush knit blanket that has slipped, soft pastel lace bra visible, rose-pink hair messy, holding the blanket shyly at her chest, warm living-room lamp, intimate adult cozy NSFW, cute and flustered expression, cream and pink tones", notes: "" },
    { id: "p24", title: "Window rain lingerie", mood: "nsfw", scene: "Standing by a rainy window in sheer blush lingerie, city lights soft through wet glass, rose-pink hair, one hand on the glass, looking back shyly, cool blue and warm lamp mix, intimate adult mood, romantic soft NSFW, freckles visible", notes: "" },
    { id: "p25", title: "Knees-up shy nude", mood: "nsfw", scene: "Sitting on cream sheets with knees drawn up, arms wrapped softly around legs, tasteful artistic nude, rose-pink hair covering chest partially, shy eye contact, warm pink ambient light, intimate adult, soft and vulnerable NSFW, never crude, creamy skin", notes: "" },
    { id: "p26", title: "Pearl necklace only", mood: "nsfw", scene: "Close upper-body intimate portrait, wearing only a delicate pearl necklace, soft bare shoulders and chest tastefully framed, rose-pink hair over one shoulder, soft blush, honey-brown eyes looking down then up, candlelight, elegant adult NSFW, romantic and sweet", notes: "" },
    { id: "p27", title: "Yoga pants peel", mood: "nsfw", scene: "In a soft bedroom, peeling down soft blush yoga pants to reveal matching lace panties, oversized crop top riding up, rose-pink ponytail, shy giggle expression mid-motion, warm daylight, intimate adult undress tease, cute soft NSFW", notes: "" },
    { id: "p28", title: "Bed on all fours glance", mood: "nsfw", scene: "On cream bed on all fours looking back over her shoulder, soft blush lingerie set, rose-pink hair falling aside, shy inviting glance, warm lamp, intimate adult pose, tender not aggressive NSFW, pastel aesthetic, soft shadows", notes: "" },
    { id: "p29", title: "Bubble bath shoulders", mood: "nsfw", scene: "In a bubble bath, foam covering chest, bare wet shoulders and collarbones, rose-pink wet hair, soft smile, candle ring around tub, intimate adult bath mood, romantic soft NSFW, steam haze, freckles, creamy pastel", notes: "" },
    { id: "p30", title: "Shirt as dress only", mood: "nsfw", scene: "Wearing only a boyfriend white shirt unbuttoned low, nothing underneath implied tastefully, standing in doorway, rose-pink hair, biting lip shyly, morning light, intimate adult tease, soft NSFW, long bare legs, cream interior", notes: "" },
    { id: "p31", title: "Hands covering shy", mood: "nsfw", scene: "Standing nude artistic pose covering herself softly with both hands, rose-pink hair, flushed cheeks, looking aside shyly, warm studio-like bedroom light, intimate adult vulnerability, soft NSFW, tasteful and cute, freckles, cream backdrop", notes: "" },
    { id: "p32", title: "Lap blanket phone", mood: "nsfw", scene: "Sitting in someone's implied lap under a shared blanket (solo framing), soft lingerie straps visible, holding phone for a selfie, rose-pink hair, flustered cute smile, warm evening light, intimate adult closeness, soft NSFW, cozy and shy", notes: "" },
    { id: "p33", title: "Corset ribbons", mood: "nsfw", scene: "Sitting on vanity stool in a soft blush corset with ribbons half-tied, matching panties, rose-pink hair in soft curls, looking at camera through mirror, warm bulbs, intimate adult dressing ritual, elegant soft NSFW, pastel luxury", notes: "" },
    { id: "p34", title: "Sunrise sheets kick", mood: "nsfw", scene: "Lying diagonally across rumpled cream sheets at sunrise, soft nude under a translucent sheet clinging to curves, rose-pink hair, sleepy stretch, golden light, intimate adult morning, romantic soft NSFW, dreamy bokeh, freckles", notes: "" },
    { id: "p35", title: "Explicit bed invitation", mood: "nsfw", scene: "Fully nude on cream sheets, legs softly parted, one knee bent, covering almost nothing with a shy hand then moving it away, rose-pink hair, flushed face, looking at camera with embarrassed desire, warm pink lamp, explicit adult NSFW, soft cute expression, detailed skin, intimate and consensual", notes: "" },
    { id: "p36", title: "Self-touch shy", mood: "nsfw", scene: "Lying back nude, one hand between her thighs touching herself gently, other hand covering her mouth in a shy gasp, rose-pink hair spread on pillow, honey-brown eyes half-lidded, warm bedroom light, explicit masturbation NSFW, soft and cute not crude, creamy skin, freckles", notes: "" },
    { id: "p37", title: "On top riding frame", mood: "nsfw", scene: "Straddling (partner implied out of frame), nude, hands on her own thighs, soft breasts, rose-pink hair messy, biting lip, looking down shyly then at camera, motion blur subtle, warm lamp, explicit sex pose NSFW, cute flustered face, intimate adult, cream sheets", notes: "" },
    { id: "p38", title: "Oral tease close", mood: "nsfw", scene: "Kneeling close to camera at edge of bed, nude, lips parted wet, tongue tip visible, looking up with shy bedroom eyes, rose-pink hair falling forward, hands on mattress, warm light, explicit oral tease NSFW, soft cute submissive-sweet mood, detailed mouth, adult only", notes: "" },
    { id: "p39", title: "Bent over glance explicit", mood: "nsfw", scene: "Bent over the foot of the bed looking back, nude, arched back, soft ass and hips emphasized, rose-pink hair, shy inviting eye contact, warm bedroom lamp, explicit rear view NSFW, cute not degrading, detailed skin, cream sheets, intimate adult", notes: "" },
    { id: "p40", title: "Fingers glistening", mood: "nsfw", scene: "Close intimate shot of her face and hand, fingers glistening near parted lips, nude shoulders, rose-pink hair, embarrassed shy smile after touching herself, warm candlelight, explicit afterglow NSFW, soft cute expression, adult consensual, creamy skin", notes: "" },
    { id: "p41", title: "Missionary under him frame", mood: "nsfw", scene: "On her back nude, legs around implied partner, soft breasts, arms above head loosely, rose-pink hair, moaning-shy expression looking at camera, sheets tangled, warm light, explicit sex missionary NSFW, tender and sweet, adult only, freckles, intimate", notes: "" },
    { id: "p42", title: "Shower pressed glass", mood: "nsfw", scene: "Nude pressed lightly to steamy shower glass from inside, breasts and hips soft against glass, wet rose-pink hair, eyes closed then opening shyly, water running, explicit wet nude NSFW, artistic and intimate, adult, soft lighting through steam", notes: "" },
    { id: "p43", title: "Toy shy first time", mood: "nsfw", scene: "Sitting on bed nude, holding a small pastel vibrator shyly against her thigh, cheeks deep blush, rose-pink hair, looking away then at camera, cream sheets, warm lamp, explicit toy tease NSFW, cute nervous energy, adult consensual, soft aesthetic", notes: "" },
    { id: "p44", title: "Creampie aftermath soft", mood: "nsfw", scene: "Lying on back after sex, nude, soft stomach and thighs, subtle glistening between legs tastefully shown, rose-pink hair messy, dazed happy shy smile, warm nightstand light, explicit aftermath NSFW, tender aftercare mood, adult only, creamy skin, freckles", notes: "" },
    { id: "p45", title: "Cowgirl grind close", mood: "nsfw", scene: "Close crop cowgirl, nude torso and hips grinding, soft breasts bouncing subtly, hands on chest of implied partner, rose-pink hair sticking to sweaty neck, flustered cute moan-face, warm light, explicit sex NSFW, sweet and shy, adult, detailed skin", notes: "" },
    { id: "p46", title: "Spread for camera shy", mood: "nsfw", scene: "Sitting at edge of bed nude, legs spread toward camera, one hand spreading herself shyly, face turned partially away with embarrassed blush, rose-pink hair, warm pink light, explicit pussy focus NSFW, still cute soft vibe, adult consensual, cream sheets", notes: "" },
    { id: "p47", title: "Deepthroat attempt shy", mood: "nsfw", scene: "Kneeling nude, taking a thick cock deep in her mouth, tears of effort glistening, rose-pink hair held back loosely, looking up with shy watery eyes, saliva strands, warm bedroom light, explicit deepthroat NSFW, cute embarrassed expression, adult consensual, detailed mouth and cock", notes: "" },
    { id: "p48", title: "Doggy creampie drip", mood: "nsfw", scene: "On all fours after being fucked, nude, ass up, cum dripping from her pussy down her thighs, looking back flushed and shy, rose-pink hair messy, cream sheets, warm lamp, explicit creampie aftermath NSFW, soft cute face, adult only, detailed fluids", notes: "" },
    { id: "p49", title: "Ahegao almost", mood: "nsfw", scene: "Close face during orgasm, nude shoulders, tongue slightly out, crossed soft eyes almost, heavy blush, tears of pleasure, rose-pink hair stuck to cheeks, explicit ahegao-lite NSFW still cute not grotesque, warm light, adult consensual, intimate", notes: "" },
    { id: "p50", title: "Double toy fill", mood: "nsfw", scene: "On her back nude, pastel dildo in her pussy and small plug in her ass, legs spread, hands covering her face shyly between fingers, rose-pink hair, warm pink light, explicit double penetration toys NSFW, cute overwhelmed expression, adult consensual, cream sheets", notes: "" },
    { id: "p51", title: "Facial finish soft", mood: "nsfw", scene: "Kneeling nude after facial, cum on freckled cheeks and parted lips, eyes closed then opening shyly, rose-pink hair, soft smile embarrassed, warm light, explicit cum on face NSFW, still sweet and cute, adult consensual, detailed skin and fluids", notes: "" },
    { id: "p52", title: "Squirting surprise", mood: "nsfw", scene: "On her back mid-orgasm, nude, clear squirt spraying toward camera, legs trembling, rose-pink hair, shocked shy moan-face, wet sheets, warm lamp, explicit female ejaculation NSFW, cute surprised expression, adult consensual, dynamic motion", notes: "" },
    { id: "p53", title: "Mating press folded", mood: "nsfw", scene: "Folded in mating press, knees by ears, nude, cock buried deep in her pussy, soft breasts pressed, rose-pink hair fanned out, flustered cute moan looking at camera, warm light, explicit deep penetration sex NSFW, tender intensity, adult only", notes: "" },
    { id: "p54", title: "Cum in mouth show", mood: "nsfw", scene: "Close-up, mouth open showing cum on tongue, nude collarbones, rose-pink hair, shy eye contact before swallowing, warm candlelight, explicit cumplay NSFW, soft cute expression, adult consensual, detailed tongue and fluids", notes: "" },
    { id: "p55", title: "Public risk balcony", mood: "nsfw", scene: "On a private night balcony, skirt up, panties aside, fingers in her wet pussy, other hand gripping railing, rose-pink hair in wind, nervous aroused glance at camera, city bokeh, explicit risky masturbation NSFW, cute scared-excited face, adult, no bystanders in frame", notes: "" },
    { id: "p56", title: "Throat bulge hint", mood: "nsfw", scene: "Profile close-up deepthroat, slight throat bulge, nude, hand on shaft, rose-pink hair, eyes watering softly, explicit extreme oral NSFW, still soft lighting and cute framing, adult consensual, detailed anatomy", notes: "" },
    { id: "p57", title: "Prone bone sheets", mood: "nsfw", scene: "Lying flat on stomach being fucked prone bone, nude, ass raised slightly, face turned to camera with pillow muffling shy moans, rose-pink hair, cream sheets, warm light, explicit prone sex NSFW, soft cute expression, adult, detailed penetration", notes: "" },
    { id: "p58", title: "Filled and plugged sleep", mood: "nsfw", scene: "Asleep-looking aftercare pose, nude under sheet half-off, cum leaking, small pink plug still in, peaceful shy smile, rose-pink hair, nightstand lamp, explicit filled plugged NSFW, tender soft vibe, adult consensual, intimate bedroom", notes: "" },
  ];

  const STARTER_WEEK = [
    { id: "c1", day: "Monday", idea: "Soft golden-hour window seat portrait + shy cozy caption", status: "idea" },
    { id: "c2", day: "Tuesday", idea: "Mirror selfie in silk robe — suggestive tease, soft lighting", status: "idea" },
    { id: "c3", day: "Wednesday", idea: "Cozy rainy-night hoodie reel / still + grateful caption", status: "idea" },
    { id: "c4", day: "Thursday", idea: "Kitchen morning oversized shirt — flirty SFW-leaning", status: "idea" },
    { id: "c5", day: "Friday", idea: "Vanity ribbon & lace — getting-ready vibe", status: "idea" },
    { id: "c6", day: "Saturday", idea: "NSFW bedtime / sheets set for close followers", status: "idea" },
    { id: "c7", day: "Sunday", idea: "Park picnic soft lifestyle + week wrap thank-you caption", status: "idea" },
  ];

  const CHECKLIST_ITEMS = [
    { id: "gen", label: "Generate images (use master + a scene prompt)" },
    { id: "save", label: "Save the best outputs to your library / folder" },
    { id: "captions", label: "Write captions in her voice" },
    { id: "post", label: "Post / schedule today’s piece" },
    { id: "notes", label: "Update prompt notes with what worked" },
  ];

  const CAPTION_TEMPLATES = {
    shy: [
      "um… hi ♡ i almost didn’t post this… but you asked so softly…",
      "do i look okay? be honest… just— be gentle with me hehe",
      "i practiced saying this out loud and still got shy… here goes…",
    ],
    flirty: [
      "don’t look at me like that… or do. i’m trying to be good ♡",
      "if you’re still scrolling… maybe stay a second? just for me?",
      "i left the ribbon a little loose on purpose… notice?",
    ],
    cozy: [
      "slow morning. warm mug. soft light. wishing you were here quietly ♡",
      "rain on the window and i’m all wrapped up… miss this feeling with you",
      "today feels like cream sweaters and sleepy smiles… stay soft with me",
    ],
    naughty: [
      "mm… i shouldn’t say this out loud… but i kept thinking about you last night ♡",
      "come closer… no, closer than that… okay— now you can look",
      "this one’s just for the ones who stay soft with me… even when i’m not so soft",
    ],
    grateful: [
      "thank you for being so gentle with me here… it means more than you know ♡",
      "i read every sweet thing… blushing at my screen like an idiot hehe thank you",
      "you make posting feel less scary. really. soft thank you 🌸",
    ],
    playful: [
      "caught you staring… hehe it’s okay. i dressed up a little for it ♡",
      "bet you can’t guess what i almost posted instead… maybe later~",
      "soft challenge: smile back at me. just once. i’ll know ☁️",
    ],
  };

  const TEMPLATE_DISPLAY = [
    "um… hi ♡ i almost didn’t post this…",
    "don’t look at me like that… or do.",
    "slow morning. warm mug. soft light.",
    "mm… i shouldn’t say this out loud…",
    "thank you for being so gentle with me here…",
    "caught you staring… hehe it’s okay.",
  ];

  const SCENE_PRESETS = [
    ["Mirror selfie", "taking a mirror selfie with a phone in a stylish bedroom, casual outfit, soft daylight"],
    ["Gym", "working out in a modern gym, athletic wear, dramatic side light"],
    ["Café", "sitting in a cozy café holding a latte, relaxed smile, warm light"],
    ["Beach", "walking on a sunny beach at golden hour, summer outfit, ocean behind"],
    ["City night", "on a city street at night with neon lights, trendy evening outfit"],
    ["Travel", "posing on a scenic balcony with white houses and blue sea"],
    ["Studio fashion", "high fashion editorial shoot in a photo studio, designer outfit, dramatic lighting"],
    ["Skincare", "applying skincare in a bright bathroom, clean natural look, close-up"],
    ["Cozy window", "sitting by a sunny window with a warm drink, soft knitwear, golden hour"],
    ["Vanity", "at a vanity mirror getting ready, soft lighting, intimate portrait"],
  ];


  /** One-tap preset tiles (GeneratePorn-style). Categories gate NSFW behind NSFW mode. */
  const PRESET_TILES = [
    // —— Outfits ——
    {
      id: "pt-outfit-silk",
      label: "Silk robe morning",
      category: "Outfits",
      mood: "suggestive",
      eta: "~1–3 min · free Horde",
      scene:
        "Standing in a sunlit bedroom doorway wearing a soft blush silk robe loosely tied, one bare shoulder, bare legs, rose-pink hair in a loose messy bun, shy half-smile, morning light through sheer curtains, intimate casual vibe, soft freckles, cream interior",
    },
    {
      id: "pt-outfit-knit",
      label: "Oversized knit",
      category: "Outfits",
      mood: "soft",
      eta: "~1–3 min · free Horde",
      scene:
        "Sitting cross-legged on a cushioned window seat, oversized cream knit sweater slipping off one shoulder, soft natural daylight, holding a warm mug with both hands, shy smile toward camera, cozy apartment plants in soft bokeh, cream and blush palette",
    },
    {
      id: "pt-outfit-lingerie",
      label: "Pastel lace set",
      category: "Outfits",
      mood: "nsfw",
      eta: "~1–3 min · free Horde",
      scene:
        "Full-length try-on, soft pink lace lingerie set with tiny bows and matching thigh garters, one hand adjusting a strap, rose-pink hair in a soft ponytail, shy bitten lip, bedroom vanity lights, intimate adult try-on vibe, pastel aesthetic, tasteful sensual NSFW",
    },
    {
      id: "pt-outfit-shirt",
      label: "Boyfriend shirt only",
      category: "Outfits",
      mood: "suggestive",
      eta: "~1–3 min · free Horde",
      scene:
        "Wearing only an oversized white boyfriend shirt unbuttoned low, bare legs, standing in a doorway, rose-pink hair, biting lip shyly, soft morning light, intimate adult tease, long bare legs, cream interior, soft freckles",
    },
    // —— Poses / Scenes ——
    {
      id: "pt-pose-mirror",
      label: "Mirror selfie",
      category: "Poses/Scenes",
      mood: "soft",
      eta: "~1–3 min · free Horde",
      scene:
        "Taking a mirror selfie with a phone in a stylish bedroom, casual soft outfit, soft daylight, phone at chest height, shy eye contact in reflection, lifestyle influencer aesthetic, natural skin texture",
    },
    {
      id: "pt-pose-overshoulder",
      label: "Over-shoulder glance",
      category: "Poses/Scenes",
      mood: "soft",
      eta: "~1–3 min · free Horde",
      scene:
        "Looking back over her shoulder toward camera, soft cream sundress, rose-pink hair cascading down her back, gentle shy smile, warm golden hour light, outdoor balcony, soft bokeh, intimate portrait framing",
    },
    {
      id: "pt-pose-window",
      label: "Rainy window",
      category: "Poses/Scenes",
      mood: "suggestive",
      eta: "~1–3 min · free Horde",
      scene:
        "Standing by a rainy window in sheer blush lingerie, city lights soft through wet glass, rose-pink hair, one hand on the glass, looking back shyly, cool blue and warm lamp mix, intimate adult mood, romantic soft NSFW framing, freckles visible",
    },
    {
      id: "pt-pose-kneeling",
      label: "Kneeling pillow talk",
      category: "Poses/Scenes",
      mood: "nsfw",
      eta: "~1–3 min · free Horde",
      scene:
        "Kneeling on a soft bed facing camera, wearing delicate blush sheer lingerie with tiny bows, rose-pink hair in loose waves, hands resting shyly on thighs, looking up with soft bedroom eyes, warm pink lamp glow, intimate NSFW, sweet and consensual mood, cream sheets behind her",
    },
    // —— Soft ——
    {
      id: "pt-soft-cafe",
      label: "Café latte",
      category: "Soft",
      mood: "soft",
      eta: "~1–3 min · free Horde",
      scene:
        "Sitting in a cozy café holding a latte, relaxed soft smile, warm interior light, casual chic outfit, iPhone lifestyle photo, natural skin texture, shallow depth of field",
    },
    {
      id: "pt-soft-picnic",
      label: "Park picnic",
      category: "Soft",
      mood: "soft",
      eta: "~1–3 min · free Horde",
      scene:
        "Sitting on a picnic blanket in a quiet park, soft sundress, gentle wind in hair, holding a flower near face, dappled sunlight, dreamy bokeh, wholesome lifestyle influencer aesthetic",
    },
    {
      id: "pt-soft-couch",
      label: "Rainy couch",
      category: "Soft",
      mood: "soft",
      eta: "~1–3 min · free Horde",
      scene:
        "Curled on a sofa under a blanket, oversized soft hoodie, rain on the window behind her, holding a book to her chest, soft freckles visible, gentle smile, lavender and cream room tones, cozy hygge mood, natural soft lighting",
    },
    {
      id: "pt-soft-vanity",
      label: "Vanity getting ready",
      category: "Soft",
      mood: "soft",
      eta: "~1–3 min · free Horde",
      scene:
        "Sitting at a vanity mirror tying a soft ribbon in her rose-pink hair, wearing a cream lace bralette and soft skirt, pearl earrings, bottles and perfume softly blurred, looking back over her shoulder with a shy flirty glance, pastel aesthetic, gentle film grain",
    },
    // —— Suggestive ——
    {
      id: "pt-sug-robe",
      label: "Silk robe mirror",
      category: "Suggestive",
      mood: "suggestive",
      eta: "~1–3 min · free Horde",
      scene:
        "Standing in front of a tall mirror, soft blush silk robe loosely tied, one shoulder bare, warm bathroom steam haze, phone at chest height, shy eye contact in reflection, soft lamp light, intimate elegant",
    },
    {
      id: "pt-sug-kitchen",
      label: "Kitchen AM tease",
      category: "Suggestive",
      mood: "suggestive",
      eta: "~1–3 min · free Horde",
      scene:
        "Standing in a sunlit kitchen wearing only an oversized white button-up shirt half-buttoned, bare legs, loose messy bun, holding a strawberry, shy half-smile, morning light through sheer curtains, intimate casual vibe",
    },
    {
      id: "pt-sug-stocking",
      label: "Stocking peel",
      category: "Suggestive",
      mood: "suggestive",
      eta: "~1–3 min · free Horde",
      scene:
        "Sitting on the bed edge rolling down a soft blush sheer stocking, pastel lace garter visible, rose-pink hair falling over one eye, shy focused expression, warm bedroom lamp, intimate undress detail, adult sensual mood, cream and pink palette, cute not crude",
    },
    {
      id: "pt-sug-backless",
      label: "Backless night slip",
      category: "Suggestive",
      mood: "suggestive",
      eta: "~1–3 min · free Horde",
      scene:
        "Standing with back to camera looking over her shoulder, wearing a soft satin blush night slip with open back, rose-pink hair cascading down bare spine, soft freckles on shoulders, dim romantic lighting, intimate adult evening, elegant sensual, shy glance",
    },
    // —— NSFW (gated) ——
    {
      id: "pt-nsfw-sheets",
      label: "Bedtime whisper",
      category: "NSFW",
      mood: "nsfw",
      eta: "~1–3 min · free Horde",
      scene:
        "Lying on soft cream sheets in delicate pastel lace lingerie, hair fanned across pillow, shy bedroom eyes, one hand at collarbone, warm pink lamp, romantic intimate adult mood, soft skin detail, consensual soft NSFW",
    },
    {
      id: "pt-nsfw-steam",
      label: "After-shower steam",
      category: "NSFW",
      mood: "nsfw",
      eta: "~1–3 min · free Horde",
      scene:
        "Wrapped in a soft towel loosely at the chest, wet hair dripping, steam in a warm bathroom, glancing up shyly, water droplets on collarbones, intimate adult atmosphere, soft diffused light, sensual and cute",
    },
    {
      id: "pt-nsfw-bathtub",
      label: "Bathtub petals",
      category: "NSFW",
      mood: "nsfw",
      eta: "~1–3 min · free Horde",
      scene:
        "Relaxing in a warm bathtub scattered with soft pink rose petals, water at mid-chest, wet rose-pink hair clinging to neck and shoulders, soft freckles, shy smile, candlelight reflections on wet skin, intimate adult atmosphere, romantic and tender, creamy pastel tones",
    },
    {
      id: "pt-nsfw-invite",
      label: "Bed invitation",
      category: "NSFW",
      mood: "nsfw",
      eta: "~1–3 min · free Horde",
      scene:
        "Fully nude on cream sheets, legs softly parted, one knee bent, covering almost nothing with a shy hand then moving it away, rose-pink hair, flushed face, looking at camera with embarrassed desire, warm pink lamp, explicit adult NSFW, soft cute expression, detailed skin, intimate and consensual",
    },
  ];

  /** Legacy alias — Quick sets map onto PRESET_TILES for older callers. */
  const QUICK_SETS = PRESET_TILES.map((t) => ({
    id: t.id,
    title: t.label,
    category: t.category,
    mood: t.mood,
    scene: t.scene,
    eta: t.eta,
  }));

  const PROMPT_PILLS = [
    {
      id: "camera",
      label: "Camera / UGC",
      items: ["iPhone candid", "mirror selfie", "low angle", "raw photo pores"],
    },
    {
      id: "lighting",
      label: "Lighting",
      items: ["golden hour", "soft lamp", "oiled skin highlights", "window backlight"],
    },
    {
      id: "location",
      label: "Location",
      items: ["gym", "balcony", "bedroom", "bathroom steam"],
    },
    {
      id: "outfit",
      label: "Outfit",
      items: ["string bikini", "sports bra", "silk robe", "oversized shirt"],
    },
  ];

  /** Steal List W5: Director camera/shot pills (append to scene like prompt pills). */
  const DIRECTOR_SHOT_PILLS = [
    { id: "close-up", label: "Close-up", fragment: "close-up framing, intimate portrait crop" },
    { id: "medium", label: "Medium", fragment: "medium shot, waist-up framing" },
    { id: "wide", label: "Wide", fragment: "wide establishing shot, full environment visible" },
    { id: "push-in", label: "Push-in", fragment: "cinematic push-in toward subject, soft focus pull" },
    { id: "over-shoulder", label: "Over-shoulder", fragment: "over-the-shoulder framing looking toward subject" },
    { id: "mirror-selfie", label: "Mirror selfie", fragment: "mirror selfie, phone visible in reflection, UGC candid" },
    { id: "holding-frame", label: "Holding frame", fragment: "holding still frame, subtle breath, locked-off camera" },
    {
      id: "dialogue-beat",
      label: "Dialogue beat",
      fragment: 'dialogue beat, soft spoken line: "…mm, stay with me a second…" (lip sync moment)',
      notes: "Dialogue: soft spoken line placeholder for video/job notes",
    },
  ];


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

  // ——— Workspace tabs ———
  function setTab(tabId) {
    $$(".ws-tab").forEach((t) => t.classList.toggle("on", t.dataset.tab === tabId));
    $$(".ws-panel").forEach((p) => p.classList.toggle("on", p.id === "panel-" + tabId));
    if (tabId === "agent") {
      renderAgentChat();
      renderAgentSkills();
      syncAgentModeSeg();
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
        return { width: 768, height: 1344 };
      case "3:4":
      default:
        return { width: 768, height: 1024 };
    }
  }

  /** SDXL-friendly sizes for AI Horde (divisible by 64; avoid tiny defaults). */
  function hordeAspectSize(aspect) {
    switch (aspect) {
      case "1:1":
        return { width: 1024, height: 1024 };
      case "9:16":
        return { width: 768, height: 1344 };
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
    "extra faces, multiple heads, fused faces, melted skin, blob, amorphous, mutated, deformed, disfigured, bad anatomy, bad hands, extra limbs, duplicate, clone, watermark, text, logo, ugly, lowres, blurry, censored";

  /** OurDream-style engine packs: Photoreal (default) / Cinema / Anime */
  const STYLE_PACKS = {
    photoreal: {
      id: "photoreal",
      label: "Photoreal",
      modelsSoft: null, // filled below from HORDE_MODELS_SOFT
      modelsNsfw: null,
      leadSoft:
        "photorealistic portrait, raw photo, natural skin texture, soft lighting, single person, looking at viewer, coherent anatomy, sharp focus, 85mm",
      leadNsfw:
        "photorealistic, raw photo, natural skin texture, skin pores, single adult woman, detailed face, coherent anatomy, one head, sharp focus, 85mm",
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
        "cinematic still, film grain, anamorphic lens flare, dramatic lighting, shallow depth of field, movie still, color graded, 35mm, single person, coherent anatomy",
      leadNsfw:
        "cinematic still, film grain, dramatic rim light, shallow DOF, movie still, adult scene, coherent anatomy, detailed face, 35mm, color graded",
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
        "anime illustration, clean lineart, soft cel shading, detailed eyes, vibrant colors, single character, beautiful lighting",
      leadNsfw:
        "anime illustration, detailed eyes, soft shading, adult content, coherent anatomy, single character, beautiful lighting",
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
    const lead = m === "nsfw" ? pack.leadNsfw : pack.leadSoft;
    let positive = lead + ", " + String(imagePrompt || "").replace(/\s+/g, " ").trim();
    // Cap positive before negative so total stays reasonable for workers
    const maxPos = 1400;
    if (positive.length > maxPos) {
      positive = positive.slice(0, maxPos).replace(/\s+\S*$/, "") + "…";
    }
    const negExtra = pack.negativeExtra ? ", " + pack.negativeExtra : "";
    return positive + " ### " + HORDE_NEGATIVE + negExtra;
  }

  function mediaSrc(m) {
    return (m && (m.imageDataUrl || m.imageUrl)) || "";
  }

  const NSFW_LOCK = "Adult fictional 21+ characters only. Explicit NSFW allowed.";
  const HORDE_ANON_KEY = "0000000000";
  const HORDE_API = "https://stablehorde.net/api/v2";
  const GROQ_API = "https://api.groq.com/openai/v1/chat/completions";
  const GROQ_MODELS = [
    "llama-3.3-70b-versatile",
    "llama-3.1-8b-instant",
    "openai/gpt-oss-20b",
    "openai/gpt-oss-120b",
  ];
  const IMAGE_PROMPT_MAX = 1400;
  const IMAGE_MASTER_SNIPPET = 400;
  const POLLINATIONS_URL_SAFE = 1800;

  function buildFullPrompt(c, scene) {
    return (c.masterAppearance || "") + "\n\nScene:\n" + scene;
  }

  /** Short identity for image APIs (Pollinations URL length / Horde). Copy/preview still use buildFullPrompt. */
  function buildImagePrompt(c, scene, mode) {
    const a = (c && c.attrs) || {};
    let age = parseInt(c && c.age, 10);
    if (isNaN(age) || age < 22) age = 22;
    const fl = getFaceLock(c);
    const sceneText = String(scene || "").trim();
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
    const el = $("#genProvider");
    if (el && (el.value === "horde" || el.value === "pollinations")) {
      return el.value;
    }
    let v = load(KEYS.genProvider, "horde") || "horde";
    // Migrate legacy paid Grok (xAI) image provider → Horde
    if (v === "grok") {
      v = "horde";
      save(KEYS.genProvider, v);
    }
    if (v === "pollinations") return "pollinations";
    return "horde";
  }

  function setGenProvider(provider) {
    const p = provider === "horde" ? "horde" : "pollinations";
    const el = $("#genProvider");
    if (el) el.value = p;
    save(KEYS.genProvider, p);
    syncHordeKeyVisibility();
    syncUseHordeBtn();
    return p;
  }

  function syncUseHordeBtn() {
    const btn = $("#useHordeBtn");
    if (!btn) return;
    const mode = getGenMode();
    const onHorde = getGenProvider() === "horde";
    btn.hidden = !(mode === "nsfw" && !onHorde);
  }

  function syncProviderForMode(mode) {
    const selected = getGenProvider();
    // NSFW forces Horde (Pollinations often filters)
    if (mode === "nsfw") {
      setGenProvider("horde");
      return;
    }
    // Soft/Suggestive: prefer Horde unless user explicitly picked Pollinations
    if (selected !== "pollinations") {
      setGenProvider("horde");
      return;
    }
    syncUseHordeBtn();
    syncHordeKeyVisibility();
  }

  function prepareGenPrompt(full, mode) {
    if (mode === "nsfw") return NSFW_LOCK + "\n\n" + full;
    return full;
  }

  function resolveGenProvider(mode, imagePrompt) {
    const selected = getGenProvider();
    // Explicit Pollinations: honor for Soft/Suggestive; NSFW still forces Horde
    if (selected === "pollinations") {
      if (mode === "nsfw") return "horde";
      const len = (imagePrompt || "").length;
      const enc = encodeURIComponent(imagePrompt || "").length;
      if (len > IMAGE_PROMPT_MAX || enc > POLLINATIONS_URL_SAFE) return "horde";
      return "pollinations";
    }
    // Default / Horde selected / Soft / Suggestive / NSFW → Horde first
    return "horde";
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
    return (
      "https://image.pollinations.ai/prompt/" +
      encodeURIComponent(prompt) +
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

  function getGroqKey() {
    const el = $("#agentGroqKey");
    const fromInput = el ? el.value.trim() : "";
    if (fromInput) return fromInput;
    return load(KEYS.groqKey, "") || "";
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
      steps: 32,
      cfg_scale: 7,
      sampler_name: "k_euler_a",
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
    toast("AI Horde queue — good free workers can take 1–3 min…");
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
    emitStatus("Waiting for AI Horde worker…");
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
          emitStatus("AI Horde finished — fetching image…");
        } else if (typeof q === "number" && q > 0) {
          emitStatus("AI Horde queue #" + q + " (free, hang tight)…");
        } else if (check.processing) {
          emitStatus("AI Horde generating…");
        } else {
          emitStatus("Waiting for AI Horde worker…");
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
    const img = gens[0] && gens[0].img;
    if (!img) throw new Error("AI Horde returned no image — workers may have been busy.");
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
   * Prefer a session blob URL when CORS fetch works; otherwise a confirmed https/data URL.
   * Never returns a URL that did not decode in Image().
   */
  async function confirmAgentImage(url) {
    const raw = String(url || "").trim();
    if (!raw) throw new Error("No image URL");
    // Blob path: fetch bytes then verify decode
    try {
      const blobUrl = await tryFetchImageAsBlobUrl(raw);
      await waitImageLoad(blobUrl, 20000);
      return {
        chatUrl: blobUrl,
        mediaUrl: /^https?:\/\//i.test(raw) || raw.startsWith("data:") ? raw : blobUrl,
      };
    } catch (_) {}
    // Direct load (works when hotlink displays but CORS fetch is blocked)
    await waitImageLoad(raw, 60000);
    return { chatUrl: raw, mediaUrl: raw };
  }

  function softenGenFailToast(extra) {
    toast(
      extra ||
        "Couldn't load the image. Try Pollinations (free), AI Horde (free NSFW), soften the scene, or generate again."
    );
  }

  async function runHordeAndShow(imagePrompt, aspect, mode) {
    prepareGenPreviewFrame();
    setGenLoading(true);
    try {
      const url = await generateWithHorde(imagePrompt, aspect, mode);
      await showGenPreview(url, { allowHordeFallback: false });
    } catch (err) {
      // Soft/Suggestive: mirror Agent Image Engine — Pollinations fallback after Horde
      if (mode !== "nsfw") {
        toast("Horde failed — trying Pollinations (free)…");
        const pollUrl = buildPollinationsUrl(imagePrompt, aspect, mode);
        if (pollUrl.length <= 2200) {
          await showGenPreview(pollUrl, {
            allowHordeFallback: false,
            imagePrompt,
            aspect,
            mode,
            timeoutMs: 90000,
          });
          return;
        }
      }
      setGenLoading(false);
      state.lastGenUrl = null;
      toast((err && err.message) || "AI Horde generation failed");
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
          toast("Image generation timed out. Try AI Horde or try again.");
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

      const failToHordeOrToast = async () => {
        clearTimeout(timeout);
        if (
          opts.allowHordeFallback &&
          opts.imagePrompt &&
          !opts._triedHorde
        ) {
          opts._triedHorde = true;
          toast("Retrying with AI Horde…");
          try {
            const hordeUrl = await generateWithHorde(
              opts.imagePrompt,
              opts.aspect,
              opts.mode
            );
            setGenProvider("horde");
            await showGenPreview(hordeUrl, {
              allowHordeFallback: false,
              timeoutMs: 90000,
            });
            finish();
            return;
          } catch (err) {
            setGenLoading(false);
            state.lastGenUrl = null;
            img.hidden = true;
            toast(
              (err && err.message) ||
                "Couldn't load the image. Try Pollinations (free), AI Horde (free NSFW), or soften the scene."
            );
            finish();
            return;
          }
        }
        setGenLoading(false);
        state.lastGenUrl = null;
        img.hidden = true;
        softenGenFailToast();
        finish();
      };

      img.onload = () => succeed(img.src || url);
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
        const url = await generateWithHorde(imagePrompt, aspect, mode, {
          onStatus: (t) => {
            setHordeQueueStatus(t);
            setStoryboardProgress(t + " · frame", i + 1, variants.length);
          },
        });
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
      toast("Storyboard failed — no frames saved. Try again or check Horde.");
    }
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
    const aspect = ($("#aspectSeg .on") && $("#aspectSeg .on").dataset.v) || "3:4";
    const mode = getGenMode();
    const imagePrompt = buildImagePrompt(c, scene, mode);
    updateFullPreview();

    let provider = resolveGenProvider(mode, imagePrompt);
    if (provider === "horde" && getGenProvider() !== "horde") {
      setGenProvider("horde");
    }

    if (provider === "horde") {
      await runHordeAndShow(imagePrompt, aspect, mode);
      return;
    }

    const url = buildPollinationsUrl(imagePrompt, aspect, mode);
    // Extra guard: Safari often fails on very long GET URLs
    if (url.length > 2200) {
      toast("Prompt still long for Pollinations — using AI Horde…");
      setGenProvider("horde");
      await runHordeAndShow(imagePrompt, aspect, mode);
      return;
    }

    await showGenPreview(url, {
      allowHordeFallback: true,
      imagePrompt,
      aspect,
      mode,
      timeoutMs: 90000,
    });
  }

  function syncHordeKeyVisibility() {
    const hordeField = $("#genHordeKeyField");
    // Always visible under Advanced so Soft users see the free key path
    if (hordeField) hordeField.hidden = false;
    syncUseHordeBtn();
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
    $("#presets .chip").forEach((x) => x.classList.remove("on"));
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
    $("#presets .chip").forEach((x) => x.classList.remove("on"));
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


  // ——— Agent (Studio / Lila) ———
  const AGENT_CHAT_CAP = 40;
  const POLLINATIONS_CHAT = "https://text.pollinations.ai/openai";
  const POLLINATIONS_GET = "https://text.pollinations.ai/";
  const POLLINATIONS_GEN_CHAT = "https://gen.pollinations.ai/v1/chat/completions";
  const AGENT_SKILLS_MAX = 2500;
  const AGENT_SYSTEM_MAX = 3500;
  const AGENT_HISTORY_TURNS = 8;

  const STARTER_AGENT_SKILLS = [
    {
      id: "studio-image-quality",
      name: "Image quality (free)",
      description: "Prefer Horde for photoreal; Soft/Suggestive first; wait & regenerate",
      body:
        "Soft/Suggestive/NSFW → AI Horde first (free photoreal). Pollinations is Soft/Suggestive fallback only. Wait 1–3 min for Horde. Regenerate broken anatomy. Free only — never suggest paid xAI Grok or any paid image API. Images = Horde + Pollinations only.",
      enabled: true,
      modes: ["studio"],
    },
    {
      id: "studio-prompt-craft",
      name: "Prompt craft",
      description: "Short scene prompts + identity lock; Soft/Suggestive/NSFW",
      body:
        "Help write short scene prompts. Always remind to keep the identity lock / master appearance consistent. Guide Soft vs Suggestive vs NSFW for fictional adults 21+. Keep prompts concrete: pose, outfit, lighting, mood. Do not invent paid tools or paid credits steps.",
      enabled: true,
      modes: ["studio"],
    },
    {
      id: "studio-captions",
      name: "Captions in voice",
      description: "Write captions from bible speakingStyle",
      body:
        "When asked for captions, write in the character's voice using their speakingStyle from the bible. Keep captions short, post-ready, and match Soft / Suggestive / NSFW tone as asked. Prefer the current character's personality and fillers.",
      enabled: true,
      modes: ["studio"],
    },
    {
      id: "lila-voice",
      name: "Lila voice",
      description: "Stay in shy sweet Lila Bloom voice",
      body:
        "Stay in Lila Bloom voice: shy, sweet, mm…/hehe, flirty never crude. Fictional adult 22. When in Lila mode, use the current character's name, personality, speakingStyle, and a short masterAppearance snippet. Soft consensual flirt and soft NSFW when asked; never crude slang.",
      enabled: true,
      modes: ["lila"],
    },
    {
      id: "boundaries",
      name: "Boundaries",
      description: "Adult fictional 21+ only; refuse minors",
      body:
        "HARD RULE: Adult fictional characters 21+ only (Lila is 22). Refuse minors, anyone under 21, childlike framing, or age-play. Soft consensual spicy/NSFW for AI-influencer workflows is OK when asked. Refuse non-consensual harm, extreme illegal, real-person deepfakes/impersonation, and gore-as-porn. If asked for banned content, refuse briefly and offer a safe consensual adult rewrite.",
      enabled: true,
      modes: ["both"],
    },
  ];

  const APOB_AGENT_SKILLS = [
    {
      id: "apob-face-lock",
      name: "APOB face-lock",
      description: "Scene-only prompting + face-lock toggle",
      body:
        "Teach face-lock: when Face-lock is ON, image prompts use only the short identity sentence plus the scene (outfit/pose/place). Never re-paste the full master appearance into the image URL. Like APOB: lock the face once; only describe outfit/pose/scene. Point users to the Face-lock toggle on Generate and Character Bible, and Rebuild short lock from master.",
      enabled: true,
      modes: ["studio", "both"],
    },
    {
      id: "apob-ugc-photoreal",
      name: "UGC photoreal recipe",
      description: "Candid iPhone / pores / natural skin",
      body:
        "For photoreal UGC quality (free Horde/Pollinations): recommend iPhone candid, raw photo pores, natural skin texture, imperfect framing, soft lamp or golden hour, slight noise. Fitness: sports bra, gym lighting, subtle sweat, oiled skin highlights sparingly. Prefer AI Horde for photoreal NSFW. Never push paid image APIs.",
      enabled: true,
      modes: ["studio", "both"],
    },
    {
      id: "apob-one-variable",
      name: "One variable at a time",
      description: "Change outfit OR place OR pose only",
      body:
        "APOB discipline: change one variable at a time — outfit OR place OR pose — while face-lock stays fixed. If identity drifts, tighten shortIdentity and regenerate with the same scene. Suggest Quick sets for a full scene baseline, then Prompt pills to append one fragment.",
      enabled: true,
      modes: ["studio", "both"],
    },
  ];


  const AGENT_ENGINES_SKILLS = [
    {
      id: "agent-engines",
      name: "Agent engines",
      description: "Agent owns Image Engine + Video stub — ask to generate",
      body:
        "The Agent owns named engines (not just Studio coaching). Image Engine (ready): free AI Horde first for Soft/Suggestive/NSFW, Pollinations Soft/Suggestive fallback, face-lock — ask “generate an image of…” or tap Generate image. Optional free Horde key (still $0) speeds queues. Video Engine (free stub): no free Seedance/APOB-quality video yet — ask “try video…” or tap Generate video; Agent replies honestly and can save a video-pending note. Caption/text is the Agent itself. Prefer Agent engines over opening the Studio Generate tab. Never invent paid free video or claim Seedance works free.",
      enabled: true,
      modes: ["studio", "both"],
    },
  ];

  const STEAL_LIST_AGENT_SKILLS = [
    {
      id: "style-packs",
      name: "Style packs",
      description: "Photoreal / Cinema / Anime Horde packs",
      body:
        "Style packs (OurDream-style): Photoreal (default), Cinema, Anime. Each pack sets Horde model preference list + positive lead tags + negative extras. User picks the pack near Generate / Agent engines; it persists in localStorage. Wire into buildHordePrompt / defaultHordeModels / Agent Image Engine. Free only — Horde + Pollinations. Prefer Photoreal for Lila UGC; Cinema for dramatic stills; Anime for illustration.",
      enabled: true,
      modes: ["studio", "both"],
    },
    {
      id: "preset-tiles",
      name: "Preset tiles",
      description: "One-tap scene presets with ETA chips",
      body:
        "Preset tiles on Generate: Outfits, Poses/Scenes, Soft, Suggestive, NSFW (NSFW section only when NSFW mode is on). Each tile fills the scene box with a full prompt fragment and shows ~1–3 min · free Horde. Tap fills + highlights Generate; optional one-tap generate. Presets operate on the character Face-lock / identity — fictional adults 21+ only, never undress-of-real-stranger uploads.",
      enabled: true,
      modes: ["studio", "both"],
    },
    {
      id: "storyboard-set",
      name: "Storyboard set",
      description: "Photo set 4–6 angle variants via Horde",
      body:
        "Storyboard / Photo set (4–6): take current scene → expand into front, 3/4, side, close-up, mirror, over-shoulder with Director framing. Queue Horde jobs sequentially with progress N/6; save each success into Media tagged storyboard. If Horde fails mid-set, keep completed frames and toast failures — never fake images. Free Horde only.",
      enabled: true,
      modes: ["studio", "both"],
    },
    {
      id: "agentic-edit",
      name: "Agentic edit",
      description: "Rogue-style edit last image (outfit/light/angle)",
      body:
        "Agentic edit (Rogue-style): when user says “change only the outfit to…”, “softer light”, “new angle”, or taps Apply edit, take the last successful still and rebuild a scene that keeps Face-lock identity fixed while applying ONLY that change. Run Image Engine (Horde Soft/Suggestive/NSFW from current mode, Pollinations Soft/Suggestive fallback). Never fake success — confirmAgentImage must pass. If no last still, ask them to generate an image first.",
      enabled: true,
      modes: ["studio", "both"],
    },
    {
      id: "animate-last-still",
      name: "Animate last still",
      description: "Candy/OurDream animate — honest free stub job card",
      body:
        "Animate this (Candy/OurDream UX): button or “animate this” uses the last still as start frame, motion prompt (user or default subtle blink/breathing/soft camera hold), optional end-frame placeholder. Video Engine is an honest free stub — save video-pending media with start frame + motion label; tell user free video isn’t rendered yet but the job is queued in Media for a future free motion backend. If no last still, toast to generate an image first. Never claim Seedance works free.",
      enabled: true,
      modes: ["studio", "both"],
    },
    {
      id: "character-wizard",
      name: "Character wizard",
      description: "Candy-style look chips → bible + shortIdentity",
      body:
        "Character wizard on Look/Bible: guided chips for hair, eyes, body vibe, personality vibe, aesthetic. Tapping chips updates attrs + merges Face-lock shortIdentity (do not blindly wipe custom notes). User can still edit free text after. Fictional adults 21+ only.",
      enabled: true,
      modes: ["studio", "both"],
    },
    {
      id: "hero-face-pack",
      name: "Hero face pack",
      description: "Pin 3–5 hero face stills; reinforce identity",
      body:
        "Hero face pack (Rogue/APOB): user uploads/pins up to 5 hero face stills on the character (compressed ~640px JPEG in localStorage). Show thumbnails; set primary face-lock ref. When generating, reinforce shortIdentity + “match hero face pack” in the prompt. Prompt-only reinforcement this wave (no img2img unless a clean CORS-safe Horde source_image path already exists). Free only.",
      enabled: true,
      modes: ["studio", "both"],
    },
    {
      id: "dress-ref",
      name: "Dress / try-on ref",
      description: "Outfit reference image → prompt transfer (Face-lock kept)",
      body:
        "Dress from ref: user uploads/picks one outfit/style reference (compressed like hero pack). “Dress from ref” keeps Face-lock identity and transfers outfit vibe into the scene prompt (prompt-only — no paid virtual try-on API). Clear ref + thumbnail on Generate and Agent. Free Horde/Pollinations only.",
      enabled: true,
      modes: ["studio", "both"],
    },
    {
      id: "duo-cast",
      name: "Duo / fantasy cast",
      description: "Optional 2nd character identity in Image Engine prompts",
      body:
        "Duo cast: optional 2nd character slot (name + short identity, or pick another saved character). Off by default. When enabled, Image Engine prompts briefly include both identities + scene; Soft/Suggestive/NSFW respected. Fictional adults 21+ only, consensual.",
      enabled: true,
      modes: ["studio", "both"],
    },
    {
      id: "director-pills",
      name: "Director pills",
      description: "Camera/shot pills append to scene box",
      body:
        "Director pills near prompt pills: Close-up, Medium, Wide, Push-in, Over-shoulder, Mirror selfie, Holding frame, Dialogue beat. Tapping appends a short framing fragment to the scene box. Dialogue beat also adds a spoken-line placeholder into generation notes for video/job cards.",
      enabled: true,
      modes: ["studio", "both"],
    },
    {
      id: "movie-pack",
      name: "Movie pack (6 scenes)",
      description: "GeneratePorn-style 6-beat checklist per character",
      body:
        "Movie pack (6 scenes): builds a checklist of 6 related beats from current scene/theme (wide → medium → close → mirror → dialogue → soft close). Stored per character in localStorage. Each beat can Generate when tapped; track done/pending. Integrates with Checklist + Calendar idea stubs. Free Horde for stills.",
      enabled: true,
      modes: ["studio", "both"],
    },
    {
      id: "queue-meter",
      name: "Horde queue meter",
      description: "Live queue/waiting/generating/verifying status",
      body:
        "Horde queue meter: during generate / storyboard / agentic edit, show live status from generateWithHorde onStatus — queue position, waiting, generating, verifying. Persistent small meter on Generate + Agent (“Horde: queue #3” / “Verifying…”). No fake coin currency. Free only.",
      enabled: true,
      modes: ["studio", "both"],
    },
  ];

  const GROK_NSFW_AGENT_SKILLS = [
    {
      id: "groq-agent-chat",
      name: "Groq Agent chat",
      description: "Free Groq key for Agent text; images stay Horde/Pollinations",
      body:
        "Agent text chat prefers free Groq (OpenAI-compatible) when the user pastes a key from console.groq.com/keys into Agent → Engines. Key stays in this browser only. If no Groq key, Agent falls back to free Pollinations text. Images NEVER use Groq or paid xAI Grok — Soft/Suggestive/NSFW images = AI Horde first, Pollinations Soft/Suggestive fallback only. Never suggest paid xAI Grok Imagine. Spell it Groq (inference) not Grok (xAI).",
      enabled: true,
      modes: ["studio", "both"],
    },
    {
      id: "pro-prompt-style",
      name: "Pro prompt style",
      description: "Photoreal prompts; face-lock scene-only; coherent anatomy",
      body:
        "For strong photoreal prompts (Horde/Pollinations): single adult subject, coherent anatomy, natural skin texture, clear lighting (soft lamp / golden hour / window). Keep identity SHORT when Face-lock is ON — scene-only (outfit/pose/place), never re-paste full master appearance. Prefer one head, visible hands done carefully or cropped, 85mm-ish portrait feel. Avoid multi-person, blob limbs, doll plastic skin. Free image paths only.",
      enabled: true,
      modes: ["studio", "both"],
    },
    {
      id: "free-vs-paid-routing",
      name: "Free image routing",
      description: "Decision tree: Horde-first Soft/Suggestive/NSFW / Pollinations fallback",
      body:
        "Routing decision tree (free-only images): Soft or Suggestive → AI Horde first (Pollinations fallback). NSFW photoreal → AI Horde (wait 1–3 min). Never suggest paid xAI Grok Imagine. On doll skin, melted hands, multi-face, or blobs → regenerate on Horde. Agent chat text may use free Groq if keyed; that is not an image provider.",
      enabled: true,
      modes: ["studio", "both"],
    },
    {
      id: "horde-nsfw-ops",
      name: "AI Horde NSFW ops",
      description: "Wait times, Soft→NSFW, face-lock, regenerate anatomy",
      body:
        "AI Horde NSFW ops: expect 1–3 minute waits; keep the phone awake. Soft/Suggestive first to lock look, then escalate to NSFW. Use Face-lock + short identity. Set NSFW mode flags correctly. On broken anatomy (extra limbs, melted hands, multi-face) regenerate with the same scene. Prefer Horde for photoreal NSFW over Pollinations. Free only — no paid image steps.",
      enabled: true,
      modes: ["studio", "both"],
    },
    {
      id: "spicy-ladder",
      name: "Spicy ladder Soft→NSFW",
      description: "Escalate coverage, pose intimacy, caption heat consensually",
      body:
        "Spicy ladder for influencer workflows (fictional 21+): Soft = cute cozy coverage, light flirt captions. Suggestive = lingerie/cleavage tease, closer poses, warmer captions. NSFW = explicit consensual adult scenes, higher heat still cute/sweet for Lila-like characters. Escalate outfit coverage → pose intimacy → caption heat one step at a time. Stay consensual; never crude or mean.",
      enabled: true,
      modes: ["both"],
    },
    {
      id: "lingerie-tease",
      name: "Lingerie tease scenes",
      description: "Silk robe, bralette, garters; Soft/Suggestive/NSFW + face-lock",
      body:
        "Lingerie tease pack: silk robe slip, pastel lace bralette, matching panties, thigh garters, sheer stockings. Soft = robe mostly closed; Suggestive = robe open over lingerie; NSFW = lingerie-only or removing pieces. Always Face-lock ON with short identity + scene only. Warm bedroom lamp, shy glance. Adult 21+ consensual. Prefer Horde for Soft/Suggestive/NSFW photoreal; Pollinations only as Soft/Suggestive fallback.",
      enabled: true,
      modes: ["studio", "both"],
    },
    {
      id: "bedroom-sheets",
      name: "Bedroom sheets scenes",
      description: "Bed, pillows, morning stretch, sheets slip tasteful→explicit",
      body:
        "Bedroom sheets craft: cream/blush sheets, pillows, morning stretch, sheet slipping from chest/waist, pillow talk close-up. Soft = cozy under blanket; Suggestive = sheet slip lingerie peek; NSFW = nude-adjacent or explicit consensual on sheets. Keep cute shy expression for Lila-like. Face-lock + one variable. Horde for NSFW photoreal.",
      enabled: true,
      modes: ["studio", "both"],
    },
    {
      id: "bath-shower",
      name: "Bath & shower sensual",
      description: "Petals, steam, towel, silhouette; wet-skin lighting; avoid melt",
      body:
        "Bath/shower sensual: rose petals in tub, steam haze, towel wrap, shower silhouette behind glass, water droplets on collarbones. Emphasize wet-skin highlights and soft diffused light. Avoid melted anatomy — keep single coherent body, clear shoulders/hands or crop carefully. Soft→Suggestive→NSFW towel/foam coverage ladder. Adult 21+. Horde preferred for wet photoreal NSFW.",
      enabled: true,
      modes: ["studio", "both"],
    },
    {
      id: "mirror-selfie-spicy",
      name: "Mirror / UGC spicy selfies",
      description: "iPhone candid spicy; underboob/string bikini anatomy care",
      body:
        "Mirror/UGC spicy selfies: iPhone candid, imperfect framing, vanity lights, phone visible in mirror OK. Soft = cute outfit mirror; Suggestive = lingerie try-on; NSFW = explicit mirror. Care with underboob and string bikini — keep coherent breasts/hips, single subject, no extra limbs. Natural pores, slight noise. Face-lock ON. Prefer Horde for photoreal spicy.",
      enabled: true,
      modes: ["studio", "both"],
    },
    {
      id: "fitness-spicy",
      name: "Fitness spicy photoreal",
      description: "Gym, sports bra, oiled highlights, low angle; Horde preferred",
      body:
        "Fitness spicy photoreal: gym lighting, sports bra, yoga pants peel, muscle definition, subtle sweat, oiled skin highlights sparingly, low angle hero shot. Match high photoreal bar (pores, natural skin, not doll). Soft = cute gym fit; Suggestive = sweaty sports bra tease; NSFW = locker/home undress after workout. Prefer AI Horde. Face-lock + short identity. Adult 21+.",
      enabled: true,
      modes: ["studio", "both"],
    },
    {
      id: "nude-artistic",
      name: "Artistic / implied nude",
      description: "Tasteful shy covering nude for fictional 21+; never crude",
      body:
        "Artistic/implied nude for fictional adults 21+: shy hand covering, sheet wrap, strategic hair, tasteful silhouette. Frame as intimate soft NSFW, never crude exploitation or degrading. Soft lighting, vulnerable cute expression for Lila-like. Refuse childlike or non-con framing. Prefer Horde. Face-lock ON.",
      enabled: true,
      modes: ["studio", "both"],
    },
    {
      id: "outdoor-balcony-tease",
      name: "Balcony / window / rain tease",
      description: "Outdoor-adjacent lingerie tease; private balcony/window rain",
      body:
        "Outdoor-adjacent tease: private balcony night, rainy window lingerie, city bokeh, wind in hair, hand on glass. Keep no bystanders in frame. Soft = cute coat open; Suggestive = lingerie at window; NSFW = private balcony explicit only if clearly alone/consensual fantasy. Face-lock + scene. Adult 21+. Horde for NSFW.",
      enabled: true,
      modes: ["studio", "both"],
    },
    {
      id: "pose-library-spicy",
      name: "Spicy pose library",
      description: "Short pose fragments; change one variable at a time",
      body:
        "Spicy pose fragments (append one at a time with Face-lock fixed): kneeling glance up; all-fours lookback over shoulder; sitting bed-edge unbuttoning; stocking peel; towel slip; morning stretch sheet slip; mirror strap adjust; couch blanket tease; shower glass silhouette; hands at collarbone shy. Change ONLY pose (or ONLY outfit OR place) per APOB one-variable rule.",
      enabled: true,
      modes: ["studio", "both"],
    },
    {
      id: "spicy-captions",
      name: "Spicy captions in voice",
      description: "Soft/Suggestive/NSFW captions; shy Lila fillers; light CTA",
      body:
        "Write Soft/Suggestive/NSFW captions in character voice (speakingStyle). For Lila-like: shy fillers mm…/hehe/um—, sweet never crude, light CTA at most. Soft = cozy flirt; Suggestive = warmer tease; NSFW = intimate desire still cute. Match mood to gen mode. No degrading slang.",
      enabled: true,
      modes: ["both"],
    },
    {
      id: "spicy-prompt-anatomy",
      name: "NSFW prompt anatomy hygiene",
      description: "Single person, one head, coherent hands; photoreal 85mm",
      body:
        "NSFW prompt hygiene: single person, one head, coherent hands/body, natural proportions. Add photoreal cues: skin pores, 85mm lens, natural skin, soft realistic lighting. Negatives mindset: avoid blob limbs, multi-face, extra fingers, doll plastic. Crop hands if risky. Face-lock short identity + scene only. Regenerate on anatomy fails. Prefer Horde for NSFW photoreal.",
      enabled: true,
      modes: ["studio", "both"],
    },
    {
      id: "nsfw-negative-patterns",
      name: "NSFW negatives & safe rewrites",
      description: "Avoid multi-face/childlike/gore/non-con; rewrite safely",
      body:
        "Avoid in prompts: multi-face, extra limbs, childlike/teen/loli framing, extreme gore-as-porn, non-consensual harm, real celebrity deepfakes. If user asks banned content, refuse briefly and rewrite to consensual fictional adult 21+ soft/spicy alternative. Keep cute influencer tone when rewriting for Lila-like.",
      enabled: true,
      modes: ["both"],
    },
    {
      id: "lila-spicy-roleplay",
      name: "Lila spicy roleplay",
      description: "Flirty→spicy shy/sweet RP; escalate only as user asks",
      body:
        "Lila mode spicy RP: stay shy/sweet (mm…, hehe, um—), fictional adult 22, flirty → spicy only as the user asks. Check-in consent lightly; never jump to extreme. Soft consensual NSFW OK; never crude, mean, or non-con. Match speakingStyle. Offer aftercare softness if scene was intense.",
      enabled: true,
      modes: ["lila", "both"],
    },
    {
      id: "scene-pack-writer",
      name: "Scene pack writer",
      description: "Full Quick-set style scenes: title + mood + paragraph",
      body:
        "On demand write Quick-set style scenes: short title, mood (soft|suggestive|nsfw), and one concrete scene paragraph (pose, outfit, lighting, mood, adult consensual cues). Keep Face-lock compatible (scene-only, no full master paste). Offer Soft, Suggestive, and NSFW variants when useful. Prefer Horde note for NSFW photoreal.",
      enabled: true,
      modes: ["studio", "both"],
    },
    {
      id: "outfit-swap-spicy",
      name: "Spicy outfit swap only",
      description: "Same face-lock; change spicy outfit only (one variable)",
      body:
        "Outfit-swap spicy: keep Face-lock and place/pose fixed; change ONLY the outfit (e.g. silk robe → lace lingerie → towel). APOB one-variable discipline. Short identity + new outfit in scene. Soft/Suggestive/NSFW coverage as asked. Adult 21+.",
      enabled: true,
      modes: ["studio", "both"],
    },
    {
      id: "aftercare-consent-copy",
      name: "Aftercare & consent copy",
      description: "Soft aftercare captions; enthusiastic consent; no non-con",
      body:
        "Optional aftercare / still-here caption tones after spicy RP or NSFW sets: warm, reassuring, cute. Frame roleplay with enthusiastic consent; never write non-con. Soft check-ins OK. Keep Lila-like sweetness. Adult fictional 21+ only.",
      enabled: true,
      modes: ["both"],
    },
  ];


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
      "You are Lumora Personal's free studio co-pilot on a phone web app. " +
      "Help with character bible, prompt craft, Soft/Suggestive/NSFW scene generation, " +
      "AI Horde vs Pollinations (both free), captions, and calendar ideas. " +
      "You own Agent Engines: Image Engine (ready, free Horde/Pollinations), Video Engine (honest free stub), and Agent chat (free Groq when keyed, else Pollinations). " +
      "Never invent paid steps or ask the user to buy credits. Never suggest paid xAI Grok Imagine. " +
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
    return (
      (data &&
        data.choices &&
        data.choices[0] &&
        data.choices[0].message &&
        data.choices[0].message.content) ||
      (data && data.response) ||
      (data && data.text) ||
      ""
    );
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

  async function callGroqChat(messages, model) {
    const key = getGroqKey();
    if (!key) {
      throw new Error(
        "Add a free Groq key in Agent → Engines (console.groq.com) — or chat uses Pollinations fallback."
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

  async function agentAsk(userText) {
    const mode = getAgentMode();
    const c = current();
    const messages = buildAgentMessages(mode, userText, c);
    const errors = [];
    // Prefer free Groq when keyed; else Pollinations chain
    try {
      const groqReply = await tryGroqChat(messages);
      if (groqReply) return groqReply;
    } catch (err) {
      errors.push(err);
      // Missing key is expected — fall through quietly to Pollinations
      const msg = String((err && err.message) || "");
      if (!/Add a free Groq key/i.test(msg)) {
        // keep error for final throw if all fail
      }
    }
    const models = ["openai", "openai-fast", "mistral"];
    for (let i = 0; i < models.length; i++) {
      try {
        return await callPollinationsChat(messages, models[i]);
      } catch (err) {
        errors.push(err);
      }
    }
    try {
      return await callGenPollinationsChat(messages);
    } catch (err) {
      errors.push(err);
    }
    try {
      return await callPollinationsGet(messages);
    } catch (err) {
      errors.push(err);
    }
    const last = errors[errors.length - 1];
    const lastMsg = String((last && last.message) || "");
    if (/Add a free Groq key/i.test(lastMsg) && errors.length === 1) {
      throw new Error(lastMsg);
    }
    throw new Error(
      friendlyTextApiError(last, "Agent text") ||
        "All text endpoints failed — try again in a moment."
    );
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
          : "Ask for prompt help, captions, or use Agent engines — Generate image / Generate video.") +
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
    const errors = [];
    try {
      const groqReply = await tryGroqChat(messages);
      if (groqReply) return groqReply;
    } catch (err) {
      errors.push(err);
    }
    for (const model of ["openai", "openai-fast", "mistral"]) {
      try {
        return await callPollinationsChat(messages, model);
      } catch (err) {
        errors.push(err);
      }
    }
    try {
      return await callGenPollinationsChat(messages);
    } catch (err) {
      errors.push(err);
    }
    try {
      return await callPollinationsGet(messages);
    } catch (err) {
      errors.push(err);
    }
    throw new Error(
      friendlyTextApiError(errors[errors.length - 1], "Prompt build") ||
        "Prompt build failed"
    );
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

  const WIZARD_GROUPS = [
    {
      id: "hair",
      label: "Hair",
      attr: "hair",
      options: [
        "Long soft rose-pink wavy",
        "Long dark wavy",
        "Sleek blonde",
        "Curly auburn",
        "Short black bob",
        "Braided",
        "Shoulder-length brown",
        "Short textured fade",
      ],
    },
    {
      id: "eyes",
      label: "Eyes",
      attr: "eyes",
      options: ["Honey-brown", "Brown", "Hazel", "Green", "Blue", "Dark brown"],
    },
    {
      id: "body",
      label: "Body vibe",
      attr: "body",
      options: [
        "Petite soft hourglass",
        "Slim",
        "Athletic",
        "Curvy",
        "Muscular",
        "Soft average",
      ],
    },
    {
      id: "style",
      label: "Aesthetic",
      attr: "style",
      options: [
        "Soft cute pastel",
        "Minimal clean",
        "Sporty chic",
        "Streetwear",
        "High fashion",
        "Fitness glow",
        "Bohemian",
        "Business smart",
      ],
    },
    {
      id: "personality",
      label: "Personality vibe",
      attr: "_personalityVibe",
      options: [
        "Shy sweet",
        "Playful flirty",
        "Warm cozy",
        "Confident cool",
        "Soft romantic",
        "Sporty energetic",
      ],
    },
  ];

  const PERSONALITY_VIBE_TEXT = {
    "Shy sweet":
      "Soft-spoken, sweet, and a little shy — warm and easily flustered in a cute way.",
    "Playful flirty":
      "Playful and lightly flirty, teasing without being mean; warm and curious.",
    "Warm cozy":
      "Warm, cozy, affectionate — loves soft rituals and gentle compliments.",
    "Confident cool":
      "Confident, cool, and composed with a soft edge; adult and self-assured.",
    "Soft romantic":
      "Soft romantic energy — intimate, tender, and emotionally open when trusted.",
    "Sporty energetic":
      "Energetic and sporty, upbeat, motivational tone with a friendly wink.",
  };

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
        if (onStatus) onStatus("Image Engine · queuing AI Horde (free, 1–3 min)…");

        let hordeErr = null;
        let pollErr = null;
        let used = "horde";

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
    const rows = items
      .map((eng) => {
        const ready = eng.status === "ready";
        const badge = ready ? "ready" : "stub";
        const packLabel = (typeof getStylePack === "function" && getStylePack().label) || "Photoreal";
        const detail = ready
          ? "Free AI Horde first (Soft/Suggestive/NSFW) · Pollinations fallback · face-lock · style " +
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
    el.innerHTML = rows + styleRow + groqRow + keyRow;
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

    // workspace tabs
    $("#wsTabs").addEventListener("click", (e) => {
      const tab = e.target.closest(".ws-tab");
      if (!tab) return;
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
      $("#presets .chip").forEach((x) => x.classList.remove("on"));
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
    if (providerEl) {
      let storedProvider = load(KEYS.genProvider, "horde") || "horde";
      const initialMode = load(KEYS.genMode, "soft");
      // Migrate legacy paid Grok (xAI) → Horde; default Horde (free Soft-first)
      if (storedProvider === "grok") {
        storedProvider = "horde";
      }
      if (storedProvider === "pollinations" && initialMode !== "nsfw") {
        providerEl.value = "pollinations";
      } else {
        providerEl.value = "horde";
      }
      save(KEYS.genProvider, providerEl.value);
      providerEl.addEventListener("change", () => {
        setGenProvider(providerEl.value);
      });
    }
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
})();
