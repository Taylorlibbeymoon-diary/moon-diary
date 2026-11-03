/*
  Moon Diary — ayurvedic wisdom
  ==============================
  This is YOUR file. Everything the app says about ayurveda lives here.
  Rewrite, add or remove any line so it feels true to you.

  These are gentle invitations from ayurvedic tradition, never rules,
  and never medical advice.

  Small rules so nothing breaks:
  - Keep the quotes "" around words, and the commas at the ends of lines.
  - Don't rename the short names on the left (like kapha: or dry:).
  - Each "invitations" list can be as long or short as you like.
*/

window.MOON_AYURVEDA = {
  note: "Gentle invitations from ayurvedic tradition, not medical advice. Take what nourishes you and leave the rest.",

  // ── The rhythm of the day (dinacharya) ────────────────
  // Hours use a 24-hour clock. Each part of the day carries the
  // qualities of a dosha.
  day: [
    {
      from: 6, to: 10, dosha: "kapha",
      name: "Morning · kapha time",
      line: "Steady, earthy energy. Moving a little now helps the whole day feel lighter.",
      invitations: [
        "Scrape your tongue and sip a cup of warm water",
        "A few minutes of warm oil massage (abhyanga) before you bathe",
        "Move gently: a walk, a stretch, a few sun salutations",
        "Step outside and let the morning light reach your eyes",
      ],
    },
    {
      from: 10, to: 14, dosha: "pitta",
      name: "Midday · pitta time",
      line: "Your digestive fire (agni) is at its brightest. A lovely time for your main meal.",
      invitations: [
        "Make lunch your most nourishing meal of the day",
        "Eat sitting down, without rushing, if you can",
        "A short, slow walk after eating",
        "Notice if you're running hot, and soften where you can",
      ],
    },
    {
      from: 14, to: 18, dosha: "vata",
      name: "Afternoon · vata time",
      line: "Airy, creative and sometimes scattered. A warm, grounding pause helps.",
      invitations: [
        "A warm drink, like ginger or fennel tea",
        "Three slow breaths with your feet on the ground",
        "A good time for creative work, or simply daydreaming",
        "A small handful of something nourishing if you're flagging",
      ],
    },
    {
      from: 18, to: 22, dosha: "kapha",
      name: "Evening · kapha time",
      line: "Things slow and settle. A gentle time to wind down.",
      invitations: [
        "A lighter supper, ideally a few hours before sleep",
        "Dim the lights and let screens rest",
        "Warm oil on your feet before bed",
        "Aim to be resting by around ten, when sleep comes most easily",
      ],
    },
    {
      from: 22, to: 2, dosha: "pitta",
      name: "Late night · pitta time",
      line: "While you sleep, the body quietly tidies and restores.",
      invitations: [
        "Let yourself go to sleep, even if the day feels unfinished",
        "If you're awake and wired, a few sips of warm milk or water",
        "Put down the phone; everything can wait until morning",
      ],
    },
    {
      from: 2, to: 6, dosha: "vata",
      name: "Before dawn · vata time",
      line: "The subtle hours. The time just before sunrise is traditionally held for stillness.",
      invitations: [
        "If you're awake, try lying still and following your breath",
        "Rising a little before the sun can feel clear and spacious",
        "A few quiet minutes of meditation or prayer",
      ],
    },
  ],

  // ── Seasons (ritucharya) ──────────────────────────────
  // `doshas` are the ones that tend to rise in this season.
  seasons: {
    winter: {
      doshas: ["vata", "kapha"],
      line: "Cold and still. A season for warmth, rest, and slow nourishment.",
      invitations: [
        "Warm, cooked, gently spiced meals: stews, soups, porridge",
        "Warm oil massage, especially on cold days",
        "Go to bed a little earlier and let yourself rest more",
        "Keep your neck, ears and feet warm",
      ],
    },
    spring: {
      doshas: ["kapha"],
      line: "Things thaw and soften. A season for lightness and fresh movement.",
      invitations: [
        "Lighter meals with fresh greens and bitter flavours",
        "A little more brisk movement to shake off heaviness",
        "Try a dry brush massage (garshana) before bathing",
        "Warm water with ginger or a squeeze of lemon",
      ],
    },
    summer: {
      doshas: ["pitta"],
      line: "Long, bright and hot. A season for coolness and ease.",
      invitations: [
        "Cooling foods: cucumber, melon, coconut, leafy greens",
        "Rest in the shade during the hottest hours",
        "Coconut oil for massage instead of warming oils",
        "Moonlit evening walks",
      ],
    },
    autumn: {
      doshas: ["vata"],
      line: "Wind, dryness and change. A season for grounding and routine.",
      invitations: [
        "Warm, oily, grounding foods: root vegetables, ghee, soups",
        "Keep a steady rhythm for sleep and meals",
        "Daily warm oil massage, especially sesame oil",
        "Layers and scarves against the wind",
      ],
    },
    dry: {
      doshas: ["vata"],
      line: "Breezy, sunny and drier. A season to stay moist, warm and grounded.",
      invitations: [
        "Warm oil on your skin after the ocean or a shower",
        "Plenty of water, and warm drinks in the cooler evenings",
        "Moist, cooked foods, with a little ghee or coconut",
        "A steady daily rhythm to balance the restless breeze",
      ],
    },
    hot: {
      doshas: ["pitta"],
      line: "The hottest stretch of the year. A season to slow down and stay cool.",
      invitations: [
        "Coconut water, fresh fruit and cooling greens",
        "Rest in the shade through the middle of the day",
        "Swim, or cool your feet and wrists in water",
        "Go gently with spicy, fried and fermented foods",
      ],
    },
    rainy: {
      doshas: ["vata", "kapha"],
      line: "Lush, humid and heavy. A season to keep your inner fire gently lit.",
      invitations: [
        "Freshly cooked, warm, light meals",
        "Ginger, cumin or black pepper to help digestion",
        "Keep dry and warm after the rain",
        "Gentle daily movement to keep things flowing",
      ],
    },
  },

  // ── Your doshas ───────────────────────────────────────
  // `soothedBy` finishes the sentence "…is soothed by…".
  // `invitations` are general ones that suit this dosha any time.
  doshas: {
    vata: {
      soothedBy: "warmth, oil, routine and grounding foods",
      invitations: [
        "Keep regular times for meals and sleep",
        "Choose warm, moist, cooked foods over raw and cold",
        "A warm bath or oil massage when you feel scattered",
      ],
    },
    pitta: {
      soothedBy: "coolness, sweetness, softness and play",
      invitations: [
        "Leave a little unscheduled space in your day",
        "Cooling, sweet and fresh foods",
        "Time near water or under the moon",
      ],
    },
    kapha: {
      soothedBy: "warmth, lightness, movement and something new",
      invitations: [
        "Move in a way that gently gets your heart going",
        "Light, warm, well-spiced meals",
        "Try something new, even something small",
      ],
    },
  },

  // ── Your cycle ────────────────────────────────────────
  phases: {
    menstrual: {
      line: "Downward, releasing energy (apana vata). A time to rest and receive.",
      invitations: [
        "Warm, soft, easy-to-digest foods",
        "Rest more, and let yourself do less",
        "Warmth on your belly or lower back",
        "Many traditions pause oil massage and strong exercise while you bleed",
      ],
    },
    follicular: {
      line: "Fresh, rising energy, like spring inside you.",
      invitations: [
        "Try something new, or begin something you've been dreaming of",
        "Lighter, fresher foods",
        "Move with a little more energy if it feels good",
      ],
    },
    ovulatory: {
      line: "Bright, warm and outward. Pitta can run high.",
      invitations: [
        "Connect with people you love",
        "Cooling foods if you're feeling heated",
        "Say the thing you've been wanting to say",
      ],
    },
    luteal: {
      line: "Turning inward, like autumn. Vata and kapha can both stir.",
      invitations: [
        "Grounding, warm, nourishing meals",
        "Gentle boundaries and a little more rest",
        "Warm oil massage, especially in the evening",
        "Fewer plans, more softness",
      ],
    },
  },

  // ── Today's weather (only if weather is on) ───────────
  weather: {
    hot: "A hot day: cool drinks, shade, and a slower pace soothe pitta.",
    cold: "A cold day: warm layers, warm food and warm oil soothe vata.",
    humid: "A humid day: light, warm meals and gentle movement keep kapha flowing.",
    dryair: "Dry air today: a little oil on your skin and plenty of warm water.",
    windy: "A windy day: wrap up, stay grounded, and keep your routine steady.",
    rain: "A rainy day: something warm and freshly cooked, and a cosy pause.",
  },
};
