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

// ── Moving between screens ────────────────────────────────

let currentView = "home";

function showView(name) {
  if (currentView === "record" && name !== "record") leaveRecord();
  if (currentView === "review" && name !== "review") clearReview();
  currentView = name;
  document.querySelectorAll(".view").forEach((view) => {
    view.classList.toggle("is-active", view.id === `view-${name}`);
  });
  window.scrollTo(0, 0);
  if (name === "record") enterRecord();
  if (name === "garden") renderGarden();
}

// Any button with data-go="somewhere" takes you there.
document.addEventListener("click", (event) => {
  const button = event.target.closest("[data-go]");
  if (button) showView(button.dataset.go);
});

// ── Putting it all on the page ────────────────────────────

// The question you're seeing now, so the recording can keep it with it.
let currentPrompt = "";

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
  currentPrompt = pickPrompt(list, key, offset);
  promptEl.textContent = currentPrompt;

  document.getElementById("another-prompt").addEventListener("click", () => {
    offset += 1;
    remember("moon.promptShuffle", { date: key, offset });
    currentPrompt = pickPrompt(list, key, offset);
    // Fade out, swap the words, fade back in.
    promptEl.classList.add("is-changing");
    setTimeout(() => {
      promptEl.textContent = currentPrompt;
      promptEl.classList.remove("is-changing");
    }, 500);
  });

  document.getElementById("begin").addEventListener("click", () => showView("record"));
}

renderHome();

// ── Recording screen ──────────────────────────────────────

const recordView = document.getElementById("view-record");
const preview = document.getElementById("preview");
const recordButton = document.getElementById("record-button");
const recordLabel = document.getElementById("record-label");
const recordTime = document.getElementById("record-time");
const stageMessage = document.getElementById("stage-message");

// Camera or voice. Your last choice is remembered.
let recordMode = recall("moon.recordMode") === "voice" ? "voice" : "video";
let timeTicker;

function formatDuration(ms) {
  const totalSeconds = Math.round(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = String(totalSeconds % 60).padStart(2, "0");
  return `${minutes}:${seconds}`;
}

function showRecordMode() {
  recordView.classList.toggle("mode-voice", recordMode === "voice");
  document.querySelectorAll(".mode-chip").forEach((chip) => {
    chip.setAttribute("aria-pressed", String(chip.dataset.mode === recordMode));
  });
}

// Kind words for when the camera or microphone can't be reached.
function gentleMediaError(error) {
  const what = recordMode === "video" ? "camera and microphone" : "microphone";
  if (!MoonRecorder.isSupported()) {
    return "Recording needs the secure (https) version of Moon Diary, opened in Safari or Chrome.";
  }
  if (error && error.name === "NotAllowedError") {
    return `Moon Diary needs permission to use your ${what}. You can allow it in your iPhone's Settings, under Safari, then come back.` +
      (recordMode === "video" ? " Or try voice only." : "");
  }
  if (error && error.name === "NotFoundError") {
    return `Moon Diary couldn't find a ${recordMode === "video" ? "camera" : "microphone"} on this device.`;
  }
  return `Your ${what} seems busy right now. Close other apps using it and try again.`;
}

async function prepareStream() {
  recordButton.disabled = true;
  stageMessage.textContent = "";
  preview.srcObject = null;
  if (!MoonRecorder.isSupported()) {
    stageMessage.textContent = gentleMediaError();
    return;
  }
  try {
    const stream = await MoonRecorder.openStream(recordMode);
    // You may have left the screen while the phone was asking permission.
    if (currentView !== "record") return MoonRecorder.closeStream();
    if (recordMode === "video") {
      preview.srcObject = stream;
      preview.play().catch(() => {});
    }
    recordButton.disabled = false;
  } catch (error) {
    stageMessage.textContent = gentleMediaError(error);
  }
}

function enterRecord() {
  document.getElementById("record-prompt").textContent = currentPrompt;
  recordTime.innerHTML = "&nbsp;";
  recordLabel.textContent = "Start";
  showRecordMode();
  prepareStream();
}

function leaveRecord() {
  clearInterval(timeTicker);
  recordView.classList.remove("is-recording");
  preview.srcObject = null;
  MoonRecorder.closeStream();
}

document.querySelectorAll(".mode-chip").forEach((chip) => {
  chip.addEventListener("click", () => {
    if (MoonRecorder.isRecording() || chip.dataset.mode === recordMode) return;
    recordMode = chip.dataset.mode;
    remember("moon.recordMode", recordMode);
    showRecordMode();
    prepareStream();
  });
});

recordButton.addEventListener("click", () => {
  if (MoonRecorder.isRecording()) {
    MoonRecorder.stop();
    return;
  }
  try {
    MoonRecorder.start(recordMode, finishedRecording);
  } catch (error) {
    stageMessage.textContent = gentleMediaError(error);
    return;
  }
  recordView.classList.add("is-recording");
  recordLabel.textContent = "Stop";
  recordTime.textContent = "0:00";
  timeTicker = setInterval(() => {
    recordTime.textContent = formatDuration(MoonRecorder.elapsedMs());
  }, 1000);
});

// If you switch apps or the phone locks while recording, stop and keep
// what you have. When you come back, the camera wakes up again.
document.addEventListener("visibilitychange", () => {
  if (document.hidden && MoonRecorder.isRecording()) MoonRecorder.stop();
  if (!document.hidden && currentView === "record" && !MoonRecorder.isRecording()) prepareStream();
});

// ── Review screen ─────────────────────────────────────────

const reviewVideo = document.getElementById("review-video");
const reviewAudio = document.getElementById("review-audio");
const reviewMessage = document.getElementById("review-message");
const keepButton = document.getElementById("keep");
const letGoButton = document.getElementById("let-go");

let pending = null;      // the recording waiting for "keep" or "let go"
let pendingUrl = null;

function finishedRecording(recording) {
  pending = { ...recording, prompt: currentPrompt, recordedAt: new Date() };
  showView("review");

  pendingUrl = URL.createObjectURL(recording.blob);
  const isVideo = recording.mode === "video";
  reviewVideo.hidden = !isVideo;
  reviewAudio.hidden = isVideo;
  (isVideo ? reviewVideo : reviewAudio).src = pendingUrl;
  document.getElementById("review-hint").textContent = isVideo
    ? "Watch it back if you like, or simply keep it."
    : "Listen back if you like, or simply keep it.";
  reviewMessage.textContent = "";
  keepButton.disabled = false;
  letGoButton.textContent = "let it go";
}

function clearReview() {
  reviewVideo.pause();
  reviewAudio.pause();
  reviewVideo.removeAttribute("src");
  reviewAudio.removeAttribute("src");
  if (pendingUrl) URL.revokeObjectURL(pendingUrl);
  pendingUrl = null;
  pending = null;
}

keepButton.addEventListener("click", async () => {
  if (!pending) return;
  keepButton.disabled = true;
  const at = pending.recordedAt;
  const entry = {
    id: (crypto.randomUUID && crypto.randomUUID()) || `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    createdAt: at.toISOString(),
    dayKey: todayKey(at),
    kind: pending.mode,
    mimeType: pending.blob.type,
    durationMs: pending.durationMs,
    size: pending.blob.size,
    prompt: pending.prompt,
  };
  try {
    await MoonDB.saveEntry(entry, pending.blob);
    MoonDB.askToKeepStorage();
    // The recording is already safe; the check-in is a gentle extra.
    openCheckin(entry, "home");
  } catch (error) {
    keepButton.disabled = false;
    reviewMessage.textContent = "This couldn't be kept just now. Your phone may be low on space. Your recording is still here, so you can try again.";
  }
});

// Letting go asks twice, so a stray tap never loses anything.
letGoButton.addEventListener("click", () => {
  if (letGoButton.textContent === "let it go") {
    letGoButton.textContent = "tap again to let it go";
    return;
  }
  showView("home");
  showToast("Let go. That's okay too.");
});

// ── Check-in ──────────────────────────────────────────────

const checkinGroupsEl = document.getElementById("checkin-groups");
const checkinNote = document.getElementById("checkin-note");
let checkinEntryId = null;
let checkinReturnTo = "home";

function makeChip(word) {
  const chip = document.createElement("button");
  chip.type = "button";
  chip.className = "chip";
  chip.textContent = word;
  chip.setAttribute("aria-pressed", "false");
  return chip;
}

// Builds the chips once, from your content/checkin.js file.
function buildCheckinGroups() {
  for (const group of window.MOON_CHECKIN || []) {
    const section = document.createElement("div");
    section.className = "checkin-group";
    section.dataset.group = group.id;
    section.dataset.pick = group.pick;

    const label = document.createElement("p");
    label.className = "checkin-label";
    label.id = `checkin-label-${group.id}`;
    label.textContent = group.label;

    const row = document.createElement("div");
    row.className = "chip-row";
    row.setAttribute("role", "group");
    row.setAttribute("aria-labelledby", label.id);
    group.chips.forEach((word) => row.appendChild(makeChip(word)));

    section.append(label, row);
    checkinGroupsEl.appendChild(section);
  }
}
buildCheckinGroups();

// Tap a chip to choose it, tap again to unchoose. In "one" groups,
// choosing a chip unchooses the others.
checkinGroupsEl.addEventListener("click", (event) => {
  const chip = event.target.closest(".chip");
  if (!chip) return;
  const group = chip.closest(".checkin-group");
  const turningOn = chip.getAttribute("aria-pressed") !== "true";
  if (group.dataset.pick === "one") {
    group.querySelectorAll(".chip").forEach((other) => other.setAttribute("aria-pressed", "false"));
  }
  chip.setAttribute("aria-pressed", String(turningOn));
});

function openCheckin(entry, returnTo) {
  checkinEntryId = entry.id;
  checkinReturnTo = returnTo;
  const saved = entry.checkin || {};

  checkinGroupsEl.querySelectorAll(".chip-extra").forEach((chip) => chip.remove());
  checkinGroupsEl.querySelectorAll(".checkin-group").forEach((group) => {
    const chosen = [].concat(saved[group.dataset.group] || []);
    const chips = [...group.querySelectorAll(".chip")];
    chips.forEach((chip) => chip.setAttribute("aria-pressed", String(chosen.includes(chip.textContent))));
    // A word you chose before but later renamed in checkin.js still shows,
    // so editing an old check-in never quietly loses it.
    chosen
      .filter((word) => !chips.some((chip) => chip.textContent === word))
      .forEach((word) => {
        const chip = makeChip(word);
        chip.classList.add("chip-extra");
        chip.setAttribute("aria-pressed", "true");
        group.querySelector(".chip-row").appendChild(chip);
      });
  });
  checkinNote.value = saved.note || "";
  showView("checkin");
}

// Gathers what you tapped and wrote. Untouched groups are left out.
function collectCheckin() {
  const checkin = {};
  checkinGroupsEl.querySelectorAll(".checkin-group").forEach((group) => {
    const chosen = [...group.querySelectorAll('.chip[aria-pressed="true"]')].map((chip) => chip.textContent);
    if (chosen.length) checkin[group.dataset.group] = group.dataset.pick === "one" ? chosen[0] : chosen;
  });
  const note = checkinNote.value.trim();
  if (note) checkin.note = note;
  return checkin;
}

function leaveCheckin(message) {
  showView(checkinReturnTo);
  if (checkinReturnTo === "home") showToast(message);
}

document.getElementById("checkin-skip").addEventListener("click", () => {
  leaveCheckin("Kept safely on your phone.");
});

document.getElementById("checkin-done").addEventListener("click", async () => {
  const checkin = collectCheckin();
  const hasAnything = Object.keys(checkin).length > 0;
  try {
    await MoonDB.updateEntry(checkinEntryId, {
      checkin: hasAnything ? { ...checkin, updatedAt: new Date().toISOString() } : null,
    });
  } catch (error) {
    showToast("That check-in couldn't be saved just now. Your recording is safe.");
  }
  leaveCheckin(hasAnything ? "Kept, with care." : "Kept safely on your phone.");
});

// ── Garden (simple list) ──────────────────────────────────

// Check-in words as little tags, in the same order as checkin.js.
function checkinTags(checkin) {
  if (!checkin) return [];
  const tags = [];
  for (const group of window.MOON_CHECKIN || []) {
    const value = checkin[group.id];
    if (!value) continue;
    if (group.pick === "one") tags.push(`${group.id} · ${value}`);
    else tags.push(...value);
  }
  return tags;
}

const entryList = document.getElementById("entry-list");

function describeWhen(iso) {
  const date = new Date(iso);
  const day = date.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
  const time = date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  return `${day} · ${time}`;
}

async function renderGarden() {
  let entries = [];
  try {
    entries = await MoonDB.listEntries();
  } catch (error) {}

  entryList.innerHTML = "";
  if (!entries.length) {
    entryList.innerHTML = '<li class="empty-garden">Your garden is resting. When you keep a recording, it will grow here.</li>';
    return;
  }

  for (const entry of entries) {
    const item = document.createElement("li");
    item.className = "entry";
    item.innerHTML = `
      <div class="entry-meta">
        <span></span>
        <span>${entry.kind === "video" ? "video" : "voice"} · ${formatDuration(entry.durationMs)}</span>
      </div>
      <p class="entry-prompt"></p>
      <div class="entry-checkin"></div>
      <p class="entry-note"></p>
      <div class="entry-player"></div>
      <div class="entry-actions">
        <button class="link-button" type="button" data-action="play">${entry.kind === "video" ? "watch" : "listen"}</button>
        <button class="link-button" type="button" data-action="checkin">${entry.checkin ? "edit check-in" : "check in"}</button>
        <button class="link-button" type="button" data-action="remove">let go</button>
      </div>`;
    // Your words go in as plain text, never as code.
    item.querySelector(".entry-meta span").textContent = describeWhen(entry.createdAt);
    item.querySelector(".entry-prompt").textContent = entry.prompt || "";
    const tagsEl = item.querySelector(".entry-checkin");
    checkinTags(entry.checkin).forEach((word) => {
      const tag = document.createElement("span");
      tag.textContent = word;
      tagsEl.appendChild(tag);
    });
    item.querySelector(".entry-note").textContent = (entry.checkin && entry.checkin.note) || "";

    item.querySelector('[data-action="checkin"]').addEventListener("click", () => openCheckin(entry, "garden"));

    item.querySelector('[data-action="play"]').addEventListener("click", async (event) => {
      const player = item.querySelector(".entry-player");
      if (player.firstChild) return;
      const blob = await MoonDB.getMedia(entry.id);
      if (!blob) return;
      const media = document.createElement(entry.kind === "video" ? "video" : "audio");
      media.controls = true;
      media.playsInline = true;
      media.src = URL.createObjectURL(blob);
      player.appendChild(media);
      media.play().catch(() => {});
      event.target.hidden = true;
    });

    const removeButton = item.querySelector('[data-action="remove"]');
    removeButton.addEventListener("click", async () => {
      if (removeButton.textContent === "let go") {
        removeButton.textContent = "tap again to let go";
        return;
      }
      await MoonDB.deleteEntry(entry.id);
      renderGarden();
    });

    entryList.appendChild(item);
  }
}

// ── Offline support ───────────────────────────────────────
// The service worker keeps a copy of the app on your phone so it opens
// even without signal. It only stores the app's own files.

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js").catch(() => {});
  });
}
