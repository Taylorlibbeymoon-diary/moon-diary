/*
  Moon Diary — home screen
  =========================
  Everything here runs on your phone. Nothing is sent anywhere.
*/

// ── Small helpers ──────────────────────────────────────────

// Today's date as "2026-11-03", using your phone's local time.
function todayKey(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

// Turns any text into a steady number. The same day always gives the
// same number, so your question stays the same all day.
function hashText(text) {
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    hash = (hash * 31 + text.charCodeAt(i)) >>> 0;
  }
  return hash;
}

// Phone storage can be unavailable (for example in a private tab),
// so these never let a hiccup break the page.
function remember(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) {}
}
function recall(key) {
  try { return JSON.parse(localStorage.getItem(key)); } catch (e) { return null; }
}

// ── Season ────────────────────────────────────────────────
// Northern hemisphere for now. A setting for this comes later.

function currentSeason(date = new Date()) {
  const month = date.getMonth(); // 0 = January
  if (month >= 2 && month <= 4) return "spring";
  if (month >= 5 && month <= 7) return "summer";
  if (month >= 8 && month <= 10) return "autumn";
  return "winter";
}

const SEASON_LINES = {
  spring: "spring is stirring",
  summer: "the long light of summer",
  autumn: "autumn, the season of letting go",
  winter: "the quiet hush of winter",
};

// ── Greeting ──────────────────────────────────────────────

function greetingFor(date = new Date()) {
  const hour = date.getHours();
  if (hour < 5) return "Hello, night owl";
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  if (hour < 21) return "Good evening";
  return "Softly, good night";
}

// ── Choosing today's prompt ───────────────────────────────

// A prompt fits today if it has no season tags, or one of its seasons
// is today's season. (Cycle phase and dosha join in Phase 4.)
function fitsToday(prompt, season) {
  const seasons = prompt.seasons || [];
  if (seasons.length && !seasons.includes(season)) return false;
  // Phase and dosha prompts wait until the app knows those things.
  if ((prompt.phases || []).length) return false;
  if ((prompt.doshas || []).length && !seasons.length) return false;
  return true;
}

function promptsForToday(season) {
  const all = window.MOON_PROMPTS || [];
  const fitting = all.filter((p) => fitsToday(p, season));
  return fitting.length ? fitting : all;
}

// "another question" moves along the list. We remember how far you
// moved today, so it doesn't jump back if you close and reopen.
function loadShuffle(key) {
  const saved = recall("moon.promptShuffle");
  return saved && saved.date === key ? saved.offset : 0;
}

function pickPrompt(list, key, offset) {
  if (!list.length) return "What would you like to remember about today?";
  const index = (hashText(key) + offset) % list.length;
  return list[index].text;
}

// ── Gentle toast message ──────────────────────────────────

let toastTimer;
function showToast(message) {
  const toast = document.getElementById("toast");
  toast.textContent = message;
  toast.classList.add("is-visible");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("is-visible"), 3600);
}

// ── Putting it all on the page ────────────────────────────

function renderHome() {
  const now = new Date();
  const key = todayKey(now);
  const season = currentSeason(now);

  document.getElementById("today-date").textContent = now.toLocaleDateString(undefined, {
    weekday: "long", month: "long", day: "numeric",
  });
  document.getElementById("greeting").textContent = greetingFor(now);
  document.getElementById("season-line").textContent = SEASON_LINES[season];

  const list = promptsForToday(season);
  let offset = loadShuffle(key);
  const promptEl = document.getElementById("prompt-text");
  promptEl.textContent = pickPrompt(list, key, offset);

  document.getElementById("another-prompt").addEventListener("click", () => {
    offset += 1;
    remember("moon.promptShuffle", { date: key, offset });
    // Fade out, swap the words, fade back in.
    promptEl.classList.add("is-changing");
    setTimeout(() => {
      promptEl.textContent = pickPrompt(list, key, offset);
      promptEl.classList.remove("is-changing");
    }, 500);
  });

  document.getElementById("begin").addEventListener("click", () => {
    showToast("Recording blooms in the next step. Thank you for being here.");
  });
}

renderHome();

// ── Offline support ───────────────────────────────────────
// The service worker keeps a copy of the app on your phone so it opens
// even without signal. It only stores the app's own files.

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js").catch(() => {});
  });
}
