/*
  Moon Diary — rhythms
  =====================
  This is YOUR file. The words for your cycle phases, doshas, climates
  and seasons live here. Rewrite anything so it sounds like you.

  Small rules so nothing breaks:
  - Keep the quotes "" around words, and the commas at the ends of lines.
  - Don't rename the short names on the left (like menstrual: or dry:),
    because the app and your prompts use them.
*/

window.MOON_RHYTHMS = {
  // ── Cycle phases ─────────────────────────────────────
  // Shown softly on the home screen, e.g. "day 9 · follicular, inner spring"
  phases: {
    menstrual:  { season: "inner winter", line: "a time to rest and go gently" },
    follicular: { season: "inner spring", line: "fresh energy rising" },
    ovulatory:  { season: "inner summer", line: "open, bright and connected" },
    luteal:     { season: "inner autumn", line: "a turning inward" },
  },

  // ── Doshas ───────────────────────────────────────────
  doshas: {
    vata:  "air & space · light, creative, quick-moving",
    pitta: "fire & water · warm, focused, bright",
    kapha: "earth & water · steady, nurturing, calm",
  },

  // ── Climates ─────────────────────────────────────────
  // Which months belong to which season, for the NORTHERN hemisphere.
  // (For southern places the app shifts everything by six months.)
  climates: {
    tropical: {
      label: "tropical",
      example: "like Tulum",
      seasons: { dry: [11, 12, 1, 2, 3], hot: [4, 5], rainy: [6, 7, 8, 9, 10] },
    },
    temperate: {
      label: "four seasons",
      example: "like Canada",
      seasons: { winter: [12, 1, 2], spring: [3, 4, 5], summer: [6, 7, 8], autumn: [9, 10, 11] },
    },
  },

  // ── Seasons ──────────────────────────────────────────
  // The gentle line under your greeting.
  seasons: {
    winter: "the quiet hush of winter",
    spring: "spring is stirring",
    summer: "the long light of summer",
    autumn: "autumn, the season of letting go",
    dry:    "the dry season, breezy and bright",
    hot:    "the hot season, slow and shaded",
    rainy:  "the rainy season, lush and green",
  },
};
