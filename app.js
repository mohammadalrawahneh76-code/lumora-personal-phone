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
    genProvider: PREFIX + "gen_provider",
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
    objectUrls: [], // revoke on navigate
    lastGenUrl: null,
    genLoading: false,
    grokNsfwWarned: false,
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
      prompts: (base.prompts || STARTER_PROMPTS).map((p) => ({ ...p })),
      captionFavorites: base.captionFavorites || [],
      calendar: (base.calendar || STARTER_WEEK).map((x) => ({ ...x })),
      checklist: base.checklist || null,
      media: base.media || [],
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
      if (added) {
        updateCharacter(lila.id, { prompts });
      }
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
      if (added) updateCharacter(c.id, { prompts });
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
  }

  function readBibleForm() {
    let age = parseInt($("#char-age").value, 10);
    if (isNaN(age) || age < 21) age = 21;
    return {
      name: $("#char-name").value.trim() || "Unnamed",
      age,
      niche: $("#char-niche").value.trim() || "Lifestyle",
      personality: $("#char-personality").value.trim(),
      backstory: $("#char-backstory").value.trim(),
      speakingStyle: $("#char-speaking").value.trim(),
      masterAppearance: $("#char-master").value.trim(),
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

  function mediaSrc(m) {
    return (m && (m.imageDataUrl || m.imageUrl)) || "";
  }

  const NSFW_LOCK = "Adult fictional 21+ characters only. Explicit NSFW allowed.";
  const HORDE_ANON_KEY = "0000000000";
  const HORDE_API = "https://stablehorde.net/api/v2";
  const XAI_API = "https://api.x.ai/v1/images/generations";
  const XAI_DEFAULT_MODEL = "grok-imagine-image-2.0";
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

    const sceneText = String(scene || "").trim();
    let prompt =
      "Identity lock (keep consistent):\n" +
      compact +
      (masterBit ? "\n\n" + masterBit : "") +
      "\n\nScene:\n" +
      sceneText;

    const m = mode === "suggestive" || mode === "nsfw" ? mode : "soft";
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
    if (el && (el.value === "grok" || el.value === "horde" || el.value === "pollinations")) {
      return el.value;
    }
    const v = load(KEYS.genProvider, "pollinations") || "pollinations";
    if (v === "grok" || v === "horde") return v;
    return "pollinations";
  }

  function setGenProvider(provider) {
    const p = provider === "grok" || provider === "horde" ? provider : "pollinations";
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
    if (mode === "nsfw") {
      // Prefer AI Horde for NSFW (Pollinations often filters / URL limits)
      // Honor explicit Grok choice
      if (getGenProvider() !== "grok") {
        setGenProvider("horde");
      } else {
        syncUseHordeBtn();
        syncHordeKeyVisibility();
      }
    } else {
      syncUseHordeBtn();
      syncHordeKeyVisibility();
    }
  }

  function prepareGenPrompt(full, mode) {
    if (mode === "nsfw") return NSFW_LOCK + "\n\n" + full;
    return full;
  }

  function resolveGenProvider(mode, imagePrompt) {
    const selected = getGenProvider();
    if (selected === "grok") return "grok";
    if (selected === "horde") return "horde";
    if (mode === "nsfw") return "horde";
    const len = (imagePrompt || "").length;
    const enc = encodeURIComponent(imagePrompt || "").length;
    if (len > IMAGE_PROMPT_MAX || enc > POLLINATIONS_URL_SAFE) return "horde";
    return "pollinations";
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

  function getXaiKey() {
    const el = $("#genXaiKey");
    const fromInput = el ? el.value.trim() : "";
    if (fromInput) return fromInput;
    return load(KEYS.xaiKey, "") || "";
  }

  function mapGrokAspectRatio(aspect) {
    if (aspect === "1:1" || aspect === "9:16" || aspect === "3:4") return aspect;
    return "3:4";
  }

  function grokErrorMessage(status, json) {
    const err = json && json.error;
    const msg =
      (err && (typeof err === "string" ? err : err.message || err.code)) ||
      (json && (json.message || json.detail)) ||
      "";
    const text = typeof msg === "string" ? msg : JSON.stringify(msg || "");
    const lower = (text + " " + JSON.stringify(json || {})).toLowerCase();
    if (status === 401 || status === 403) {
      return "Invalid xAI API key — check the key from console.x.ai.";
    }
    if (status === 429) {
      return "xAI rate limit — wait a moment and try again.";
    }
    if (
      /moderat|content.?filter|safety|refus|blocked|violat|inappropriate|nsfw|rejected/i.test(
        lower
      )
    ) {
      return "Grok filtered this content — try Soft/Suggestive, or use AI Horde for NSFW.";
    }
    if (status >= 500) {
      return "xAI is temporarily unavailable (" + status + "). Try again shortly.";
    }
    return text || ("xAI error (" + status + ")");
  }

  async function generateWithGrok(prompt, aspect, mode) {
    const key = getXaiKey();
    if (!key) {
      throw new Error(
        "Paste your xAI API key from https://console.x.ai (Advanced) to use Grok Imagine."
      );
    }
    const modelEl = $("#genModel");
    let model = modelEl ? modelEl.value.trim() : "";
    if (!model || !model.startsWith("grok-")) {
      model = XAI_DEFAULT_MODEL;
    }
    const body = {
      model,
      prompt,
      n: 1,
      aspect_ratio: mapGrokAspectRatio(aspect),
      response_format: "b64_json",
      quality: "low",
    };
    let res;
    try {
      res = await fetch(XAI_API, {
        method: "POST",
        headers: {
          Authorization: "Bearer " + key,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });
    } catch (_) {
      throw new Error("Could not reach xAI — check your connection and try again.");
    }
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(grokErrorMessage(res.status, json));
    }
    const item = json.data && json.data[0];
    if (!item) throw new Error("xAI returned no image.");
    if (item.b64_json) {
      const b64 = String(item.b64_json);
      let mime = "image/jpeg";
      if (b64.startsWith("iVBOR")) mime = "image/png";
      else if (b64.startsWith("UklGR")) mime = "image/webp";
      else if (b64.startsWith("/9j/")) mime = "image/jpeg";
      return "data:" + mime + ";base64," + b64;
    }
    if (item.url) return item.url;
    throw new Error("xAI returned no image data.");
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

  async function generateWithHorde(prompt, aspect, mode) {
    const { width, height } = aspectSize(aspect);
    const seedEl = $("#genSeed");
    const modelEl = $("#genModel");
    const seedRaw = seedEl ? seedEl.value.trim() : "";
    const model = modelEl ? modelEl.value.trim() : "";
    const allowNsfw = mode === "suggestive" || mode === "nsfw";
    const params = {
      width,
      height,
      n: 1,
      steps: 25,
      cfg_scale: 7,
    };
    if (seedRaw && /^\d+$/.test(seedRaw)) params.seed = seedRaw;
    const body = {
      prompt,
      nsfw: allowNsfw,
      censor_nsfw: !allowNsfw,
      r2: true,
      shared: false,
      params,
    };
    if (model) body.models = [model];
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
    const deadline = Date.now() + 300000; // 5 min — NSFW/anonymous queues can be slow
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
    if (!btn) return;
    btn.disabled = !!on;
    btn.classList.toggle("is-loading", !!on);
    btn.textContent = on ? "Generating…" : "Generate image";
    const sk = $("#genPreviewSkeleton");
    if (sk) sk.hidden = !on;
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

  function softenGenFailToast(extra) {
    toast(
      extra ||
        "Couldn't load the image. Try Grok Imagine, AI Horde, soften the scene, or generate again."
    );
  }

  async function runHordeAndShow(imagePrompt, aspect, mode) {
    prepareGenPreviewFrame();
    setGenLoading(true);
    try {
      const url = await generateWithHorde(imagePrompt, aspect, mode);
      await showGenPreview(url, { allowHordeFallback: false });
    } catch (err) {
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
                "Couldn't load the image. Try Grok Imagine, AI Horde, or soften the scene."
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

  async function generateSceneImage() {
    const c = current();
    if (!c) return;
    if (state.genLoading) return;
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

    if (provider === "grok") {
      if (mode === "nsfw" && !state.grokNsfwWarned) {
        state.grokNsfwWarned = true;
        toast("Grok may filter explicit NSFW — AI Horde is more reliable for that.");
      }
      prepareGenPreviewFrame();
      setGenLoading(true);
      try {
        const url = await generateWithGrok(imagePrompt, aspect, mode);
        await showGenPreview(url, { allowHordeFallback: false });
      } catch (err) {
        setGenLoading(false);
        state.lastGenUrl = null;
        toast((err && err.message) || "Grok Imagine generation failed");
      }
      return;
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
    const provider = getGenProvider();
    const hordeField = $("#genHordeKeyField");
    const xaiField = $("#genXaiKeyField");
    if (hordeField) hordeField.hidden = provider !== "horde";
    if (xaiField) xaiField.hidden = provider !== "grok";
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
            (m.imageUrl ? "Gen" : "Note") +
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

  // ——— Export / Import ———
  function doExport() {
    const payload = {
      _app: "lumora-personal",
      _version: 1,
      exportedAt: new Date().toISOString(),
      characters: getCharacters(),
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

    // presets
    $("#presets").innerHTML = SCENE_PRESETS.map(
      ([l], i) => '<button type="button" class="chip" data-p="' + i + '">' + esc(l) + "</button>"
    ).join("");

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
      renderInfHead(getCharacter(c.id));
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
      const [, p] = SCENE_PRESETS[+chip.dataset.p];
      $("#sceneInput").value = p;
      updateFullPreview();
    });
    $("#sceneInput").addEventListener("input", () => {
      $$("#presets .chip").forEach((x) => x.classList.remove("on"));
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
    });
    const providerEl = $("#genProvider");
    if (providerEl) {
      const storedProvider = load(KEYS.genProvider, "pollinations");
      const initialMode = load(KEYS.genMode, "soft");
      // Restore Grok if saved; NSFW defaults to Horde otherwise
      if (storedProvider === "grok") {
        providerEl.value = "grok";
      } else if (initialMode === "nsfw") {
        providerEl.value = "horde";
      } else if (storedProvider === "horde") {
        providerEl.value = "horde";
      } else {
        providerEl.value = "pollinations";
      }
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
      hordeKeyEl.addEventListener("change", () => {
        save(KEYS.hordeKey, hordeKeyEl.value.trim());
      });
      hordeKeyEl.addEventListener("blur", () => {
        save(KEYS.hordeKey, hordeKeyEl.value.trim());
      });
    }
    const xaiKeyEl = $("#genXaiKey");
    if (xaiKeyEl) {
      const storedXai = load(KEYS.xaiKey, "");
      if (storedXai) xaiKeyEl.value = storedXai;
      xaiKeyEl.addEventListener("change", () => {
        save(KEYS.xaiKey, xaiKeyEl.value.trim());
      });
      xaiKeyEl.addEventListener("blur", () => {
        save(KEYS.xaiKey, xaiKeyEl.value.trim());
      });
    }
    setGenMode(load(KEYS.genMode, "soft"));
    syncHordeKeyVisibility();
    $("#generateImageBtn").addEventListener("click", () => generateSceneImage());
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
