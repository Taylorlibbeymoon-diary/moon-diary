/*
  Moon Diary — check-in choices
  ==============================
  This is YOUR file. These are the little tap-able words you see after
  keeping a recording. Change, add or remove any of them.

  Each group looks like this:

    {
      id: "mood",                     // a short name the app uses; don't change it once you've used it
      label: "How are you feeling?",  // the question you see
      pick: "many",                   // "many" = tap as many as you like, "one" = just one
      chips: ["calm", "tender"],      // the words to tap
    },

  Your past check-ins keep the words they were saved with, so renaming
  a chip won't change older entries.
*/

window.MOON_CHECKIN = [
  {
    id: "mood",
    label: "How are you feeling?",
    pick: "many",
    chips: ["calm", "content", "tender", "joyful", "grateful", "hopeful", "creative",
            "tired", "heavy", "sad", "anxious", "irritable", "restless", "numb"],
  },
  {
    id: "energy",
    label: "Your energy",
    pick: "one",
    chips: ["depleted", "low", "steady", "bright", "buzzing"],
  },
  {
    id: "body",
    label: "In your body",
    pick: "many",
    chips: ["relaxed", "light", "strong", "warm", "cold", "achy", "tense shoulders",
            "headache", "cramps", "bloated", "tender breasts", "fluttery"],
  },
  {
    id: "sleep",
    label: "Last night's sleep",
    pick: "one",
    chips: ["barely", "restless", "okay", "rested", "deeply rested"],
  },
  {
    id: "digestion",
    label: "Digestion & appetite",
    pick: "many",
    chips: ["settled", "light", "heavy", "bloated", "sluggish", "hungry", "low appetite", "cravings"],
  },
  {
    id: "did",
    label: "What filled your day?",
    pick: "many",
    chips: ["rested", "walked", "yoga", "moved", "oil massage", "meditated", "nature",
            "cooked", "created", "read", "worked", "friends", "family", "time alone"],
  },
];
