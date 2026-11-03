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

// `today` is { season, phase, doshas }. A prompt fits if each of its tags
// matches today (untagged prompts fit any day). The more of its tags
// match, the more often it's chosen, so questions made for exactly
// this moment come up most.
function promptWeight(prompt, today) {
  const seasons = prompt.seasons || [];
  const phases = prompt.phases || [];
  const doshas = prompt.doshas || [];
  if (seasons.length && !seasons.includes(today.season)) return 0;
  if (phases.length && !phases.includes(today.phase)) return 0;
  if (doshas.length && !doshas.some((d) => today.doshas.includes(d))) return 0;
  return 1 + (seasons.length ? 1 : 0) + (phases.length ? 1 : 0) + (doshas.length ? 1 : 0);
}

function promptsForToday(today) {
  const all = window.MOON_PROMPTS || [];
  // If you've switched on "questions adapt to me", gently lean toward
  // questions you answer and away from ones you often pass over.
  const learned = MoonSettings.load().learning.adaptPrompts ? MoonLearning.known() : null;
  const weighted = [];
  for (const prompt of all) {
    let weight = promptWeight(prompt, today) * 2;
    if (weight && learned) weight = Math.max(1, Math.round(weight * MoonLearning.promptMultiplier(prompt.text, learned)));
    for (let i = 0; i < weight; i++) weighted.push(prompt);
  }
  return weighted.length ? weighted : all;
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
  if (name === "settings") renderSettings();
  if (name === "today") renderToday();
  if (name === "home") refreshIfCalm();
}

// Any button with data-go="somewhere" takes you there.
document.addEventListener("click", (event) => {
  const button = event.target.closest("[data-go]");
  if (button) showView(button.dataset.go);
});

// ── Putting it all on the page ────────────────────────────

// The question you're seeing now, so the recording can keep it with it.
let currentPrompt = "";
// Today's prompt list and how far "another question" has moved along it.
let homePrompts = [];
let homeKey = "";
let homeOffset = 0;

const promptEl = document.getElementById("prompt-text");
const placeWrap = document.getElementById("place-wrap");
const placeButton = document.getElementById("place-button");
const placeSwitcher = document.getElementById("place-switcher");
const weatherLine = document.getElementById("weather-line");
const cycleLine = document.getElementById("cycle-line");

// Everything about right now: time, place, season, cycle, doshas and
// (if it's on and already fetched today) the weather.
function currentMoment() {
  const now = new Date();
  const settings = MoonSettings.load();
  const place = MoonSettings.currentPlace(settings);
  const cycle = MoonRhythms.cycleToday(settings.cycle, now);
  return {
    now,
    settings,
    place,
    cycle,
    season: MoonRhythms.seasonFor(place, now),
    phase: cycle ? cycle.phase : null,
    doshas: settings.doshas,
    weather: settings.weather.enabled ? MoonWeather.known(place, todayKey(now)) : null,
  };
}

// The gentle ayurvedic invitation at the bottom of the home screen.
function renderInvitation(moment) {
  const card = document.getElementById("invitation-card");
  const invitation = moment.settings.ayurveda.show && MoonAyurveda.invitationFor(moment, todayKey(moment.now));
  card.hidden = !invitation;
  if (!invitation) return;
  document.getElementById("invitation-why").textContent = `An invitation ${invitation.why}`;
  document.getElementById("invitation-text").textContent = invitation.text;
}

// Everything that can change with the day, your place, cycle or doshas.
// Runs when the app opens and whenever you change something.
function refreshHome() {
  const moment = currentMoment();
  const { now, settings, place, season, cycle } = moment;
  renderInvitation(moment);

  document.getElementById("today-date").textContent = now.toLocaleDateString(undefined, {
    weekday: "long", month: "long", day: "numeric",
  });
  document.getElementById("greeting").textContent = greetingFor(now);

  // "Tulum · the dry season, breezy and bright"
  placeWrap.hidden = !place;
  if (place) placeButton.textContent = place.name;
  document.getElementById("season-line").textContent = window.MOON_RHYTHMS.seasons[season] || "";
  renderPlaceSwitcher(settings);

  // "day 9 · follicular, inner spring"
  cycleLine.hidden = !(cycle && settings.cycle.show);
  if (cycle) {
    cycleLine.textContent = `day ${cycle.day} · ${cycle.phase}, ${window.MOON_RHYTHMS.phases[cycle.phase].season}`;
  }

  // Weather only if you've switched it on.
  weatherLine.hidden = true;
  if (settings.weather.enabled && place) {
    MoonWeather.today(place, todayKey(now))
      .then((weather) => {
        if (!weather) return;
        weatherLine.textContent = MoonWeather.describe(weather);
        weatherLine.hidden = false;
      })
      .catch(() => {});
  }

  // Today's question, chosen from your season, phase and doshas.
  homeKey = todayKey(now);
  homePrompts = promptsForToday({ season, phase: cycle ? cycle.phase : null, doshas: settings.doshas });
  homeOffset = loadShuffle(homeKey);
  currentPrompt = pickPrompt(homePrompts, homeKey, homeOffset);
  promptEl.textContent = currentPrompt;
}

// Your places as chips under the greeting. Tap one to move there.
function renderPlaceSwitcher(settings) {
  placeSwitcher.innerHTML = "";
  for (const place of settings.places) {
    const chip = makeChip(place.name);
    chip.setAttribute("aria-pressed", String(place.id === settings.currentPlaceId));
    chip.addEventListener("click", () => {
      MoonSettings.update((s) => { s.currentPlaceId = place.id; });
      closePlaceSwitcher();
      refreshHome();
    });
    placeSwitcher.appendChild(chip);
  }
  const add = document.createElement("button");
  add.type = "button";
  add.className = "link-button";
  add.textContent = "add a place";
  add.addEventListener("click", () => {
    closePlaceSwitcher();
    showView("settings");
    document.getElementById("add-place").open = true;
  });
  placeSwitcher.appendChild(add);
}

function closePlaceSwitcher() {
  placeSwitcher.hidden = true;
  placeButton.setAttribute("aria-expanded", "false");
}

placeButton.addEventListener("click", () => {
  const opening = placeSwitcher.hidden;
  placeSwitcher.hidden = !opening;
  placeButton.setAttribute("aria-expanded", String(opening));
});

document.getElementById("another-prompt").addEventListener("click", () => {
  // Move along until the words actually change (a question can appear
  // more than once in the list when it suits today especially well).
  const before = currentPrompt;
  if (MoonSettings.load().learning.adaptPrompts) MoonLearning.recordSkip(before);
  for (let i = 0; i < homePrompts.length && currentPrompt === before; i++) {
    homeOffset += 1;
    currentPrompt = pickPrompt(homePrompts, homeKey, homeOffset);
  }
  remember("moon.promptShuffle", { date: homeKey, offset: homeOffset });
  // Fade out, swap the words, fade back in.
  promptEl.classList.add("is-changing");
  setTimeout(() => {
    promptEl.textContent = currentPrompt;
    promptEl.classList.remove("is-changing");
  }, 500);
});

document.getElementById("begin").addEventListener("click", () => showView("record"));

// Coming back to the app on a new day (or after midnight) freshens the home screen.
document.addEventListener("visibilitychange", () => {
  if (!document.hidden && currentView === "home") refreshHome();
});

refreshHome();

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
  // About a second and a half in, take a soft still for the garden.
  liveStill = null;
  if (recordMode === "video") {
    setTimeout(() => {
      if (MoonRecorder.isRecording()) liveStill = stillFromPreview();
    }, 1500);
  }
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
let liveStill = null;    // a small picture taken from the camera while recording

// A small, soft picture from the camera preview, for the garden.
// (Taken from the live camera view, which works reliably on iPhone.)
function stillFromPreview() {
  if (!preview.videoWidth) return null;
  try {
    const width = 240;
    const height = Math.round(width * (preview.videoHeight / preview.videoWidth));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    canvas.getContext("2d").drawImage(preview, 0, 0, width, height);
    return canvas.toDataURL("image/jpeg", 0.72);
  } catch (error) {
    return null;
  }
}

// What this moment was: cycle day and phase, season, and place.
// Kept with the entry so the garden stays true even if settings change.
function momentSnapshot() {
  const moment = currentMoment();
  return {
    cycle: moment.cycle ? { day: moment.cycle.day, phase: moment.cycle.phase } : null,
    season: moment.season,
    place: moment.place ? moment.place.name : null,
  };
}

function finishedRecording(recording) {
  // If the recording was too short for the still, take one now, while
  // the camera is still on.
  const still = recording.mode === "video" ? (liveStill || stillFromPreview()) : null;
  liveStill = null;
  pending = { ...recording, prompt: currentPrompt, recordedAt: new Date(), still, moment: momentSnapshot() };
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
    still: pending.still,
    ...pending.moment,
  };
  try {
    await MoonDB.saveEntry(entry, pending.blob);
    MoonDB.askToKeepStorage();
    if (MoonSettings.load().learning.adaptPrompts) MoonLearning.recordAnswer(entry.prompt);
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

// ── Offline support and updates ───────────────────────────
// The service worker keeps a copy of the app on your phone so it opens
// even without signal. It only stores the app's own files.

// Which version this is, shown quietly at the bottom of the garden.
// Keep it the same as the number in sw.js.
const APP_VERSION = 9;
document.getElementById("app-version").textContent = APP_VERSION;

let updateWaiting = false;

// A newer version has arrived. Refresh at a calm moment: on the home
// screen, never in the middle of recording or a check-in.
function refreshIfCalm() {
  if (updateWaiting && currentView === "home" && !MoonRecorder.isRecording()) {
    location.reload();
  }
}

if ("serviceWorker" in navigator) {
  window.addEventListener("load", async () => {
    try {
      const registration = await navigator.serviceWorker.register("sw.js", { updateViaCache: "none" });
      // iPhone often resumes the app instead of reopening it, so check
      // for a newer version each time you come back.
      document.addEventListener("visibilitychange", () => {
        if (!document.hidden) registration.update().catch(() => {});
      });
    } catch (e) {}
  });

  let hadController = !!navigator.serviceWorker.controller;
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    // The very first install isn't an update, so there's nothing to refresh.
    if (!hadController) {
      hadController = true;
      return;
    }
    updateWaiting = true;
    refreshIfCalm();
  });
}
