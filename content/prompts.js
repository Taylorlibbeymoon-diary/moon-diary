/*
  Moon Diary — daily soft prompts
  ================================
  This is YOUR file. Add, remove, or rewrite any question you like.

  Each prompt looks like this:

    {
      text: "The question you'll see on the home screen",
      seasons: ["autumn", "winter"],   // optional: spring, summer, autumn, winter
      phases:  ["luteal"],             // optional: menstrual, follicular, ovulatory, luteal
      doshas:  ["vata"],               // optional: vata, pitta, kapha
    },

  Leave out seasons / phases / doshas (or leave them empty) and the
  question can appear any day.

  Small rules so nothing breaks:
  - Keep the comma after each closing } brace.
  - If your question has a " in it, use ’ or “ ” instead, or write \".
  - Cycle phase and dosha matching switch on in a later phase. Until
    then they're simply saved for later, so tag them now if you like.
*/

window.MOON_PROMPTS = [
  // ── Any day ───────────────────────────────────────────
  { text: "What does your body want to tell you this morning?" },
  { text: "What felt gentle today, even if it was small?" },
  { text: "If today had a colour, what would it be?" },
  { text: "Where in your body are you holding the day right now?" },
  { text: "What are you ready to set down for tonight?" },
  { text: "Who or what made you feel a little more at home today?" },
  { text: "What would feel like kindness toward yourself right now?" },
  { text: "Describe one thing you noticed today with all your senses." },
  { text: "What is asking for your attention, softly?" },
  { text: "What did you nourish yourself with today: food, rest, people, beauty?" },
  { text: "What would you say to a dear friend who had your day?" },
  { text: "Is there anything you'd like to simply say out loud and let go?" },

  // ── Seasons ───────────────────────────────────────────
  { text: "What is beginning to sprout in you this spring?", seasons: ["spring"] },
  { text: "What feels heavy that you’d love to lighten as the days warm?", seasons: ["spring"], doshas: ["kapha"] },
  { text: "What is ripening in your life right now?", seasons: ["summer"] },
  { text: "Where could you find a little more coolness and shade today?", seasons: ["summer"], doshas: ["pitta"] },
  { text: "What are you gathering in, and what are you ready to release, like the trees?", seasons: ["autumn"] },
  { text: "What helps you feel grounded when the wind picks up?", seasons: ["autumn"], doshas: ["vata"] },
  { text: "Which warm, slow ritual is calling to you this week?", seasons: ["autumn", "winter"] },
  { text: "What does rest look like for you in this darker season?", seasons: ["winter"] },
  { text: "What small light are you keeping lit right now?", seasons: ["winter"] },

  // ── Cycle phases (used from Phase 4) ──────────────────
  { text: "What does your body need most from you today?", phases: ["menstrual"] },
  { text: "What could you let be undone today?", phases: ["menstrual"] },
  { text: "What new idea has been tugging at you lately?", phases: ["follicular"] },
  { text: "What would you love to try, just for the joy of it?", phases: ["follicular"] },
  { text: "Who would you love to connect with, or share something with?", phases: ["ovulatory"] },
  { text: "What do you feel bold enough to say today?", phases: ["ovulatory"] },
  { text: "What feels tender right now, and how can you hold it?", phases: ["luteal"] },
  { text: "What boundaries would feel caring this week?", phases: ["luteal"] },

  // ── Doshas (used from Phase 4) ────────────────────────
  { text: "What would help you feel warm, held, and unhurried today?", doshas: ["vata"] },
  { text: "Where could you soften your edges a little today?", doshas: ["pitta"] },
  { text: "What would bring a little lightness and movement into your day?", doshas: ["kapha"] },
];
