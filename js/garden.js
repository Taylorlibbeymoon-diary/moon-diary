/*
  Moon Diary — your garden
  =========================
  Browse every moment you've kept: by month, by cycle phase, or by mood.
  Everything is read from your phone's own storage.
*/

const gardenBody = document.getElementById("garden-body");

// What you were last looking at, so coming back feels continuous.
const gardenState = {
  mode: "month",           // "month", "phase" or "mood"
  month: null,             // e.g. "2026-11"
  day: null,               // e.g. "2026-11-03" when a day is tapped
  mood: null,
};

// ── Small helpers ─────────────────────────────────────────

function monthKeyOf(dayKey) {
  return dayKey.slice(0, 7);
}

function monthTitle(monthKey) {
  const [y, m] = monthKey.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString(undefined, { month: "long", year: "numeric" });
}

function shiftMonth(monthKey, by) {
  const [y, m] = monthKey.split("-").map(Number);
  const date = new Date(y, m - 1 + by, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function describeWhen(iso) {
  const date = new Date(iso);
  const day = date.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
  const time = date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  return `${day} · ${time}`;
}

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

// The cycle day and phase an entry was recorded in. Newer entries
// remember it; older ones are worked out from your period dates.
function entryCycle(entry, settings) {
  if (entry.cycle) return entry.cycle;
  return MoonRhythms.cycleOn(settings.cycle, new Date(entry.createdAt));
}

function entryMoods(entry) {
  return (entry.checkin && entry.checkin.mood) || [];
}

function gentleNote(text) {
  return makeEl("p", "empty-garden", text);
}

// ── One entry ─────────────────────────────────────────────

function makeEntryCard(entry, settings) {
  const item = makeEl("li", "entry");
  item.innerHTML = `
    <div class="entry-top">
      <button class="entry-still" type="button"></button>
      <div class="entry-heading">
        <p class="entry-when"></p>
        <p class="entry-context"></p>
        <p class="entry-kind"></p>
      </div>
    </div>
    <p class="entry-prompt"></p>
    <div class="entry-checkin"></div>
    <p class="entry-note"></p>
    <div class="entry-player"></div>
    <div class="entry-actions">
      <button class="link-button" type="button" data-action="play"></button>
      <button class="link-button" type="button" data-action="checkin"></button>
      <button class="link-button" type="button" data-action="remove">let go</button>
    </div>`;

  const isVideo = entry.kind === "video";
  const still = item.querySelector(".entry-still");
  still.setAttribute("aria-label", isVideo ? "Watch this moment" : "Listen to this moment");
  if (isVideo && entry.still) {
    const img = document.createElement("img");
    img.src = entry.still;
    img.alt = "";
    still.appendChild(img);
  } else {
    still.classList.add(isVideo ? "still-video" : "still-voice");
  }

  // Your words go in as plain text, never as code.
  item.querySelector(".entry-when").textContent = describeWhen(entry.createdAt);
  const cycle = entryCycle(entry, settings);
  item.querySelector(".entry-context").textContent = [
    cycle ? `day ${cycle.day} · ${cycle.phase}` : null,
    entry.place,
  ].filter(Boolean).join(" · ");
  item.querySelector(".entry-kind").textContent = `${isVideo ? "video" : "voice"} · ${formatDuration(entry.durationMs)}`;
  item.querySelector(".entry-prompt").textContent = entry.prompt || "";

  const tagsEl = item.querySelector(".entry-checkin");
  checkinTags(entry.checkin).forEach((word) => tagsEl.appendChild(makeEl("span", null, word)));
  item.querySelector(".entry-note").textContent = (entry.checkin && entry.checkin.note) || "";

  const playButton = item.querySelector('[data-action="play"]');
  playButton.textContent = isVideo ? "watch" : "listen";
  const play = async () => {
    const player = item.querySelector(".entry-player");
    if (player.firstChild) return;
    const blob = await MoonDB.getMedia(entry.id);
    if (!blob) return;
    const media = document.createElement(isVideo ? "video" : "audio");
    media.controls = true;
    media.playsInline = true;
    media.src = URL.createObjectURL(blob);
    player.appendChild(media);
    media.play().catch(() => {});
    playButton.hidden = true;
  };
  playButton.addEventListener("click", play);
  still.addEventListener("click", play);

  const checkinButton = item.querySelector('[data-action="checkin"]');
  checkinButton.textContent = entry.checkin ? "edit check-in" : "check in";
  checkinButton.addEventListener("click", () => openCheckin(entry, "garden"));

  const removeButton = item.querySelector('[data-action="remove"]');
  removeButton.addEventListener("click", async () => {
    if (removeButton.textContent === "let go") {
      removeButton.textContent = "tap again to let go";
      return;
    }
    await MoonDB.deleteEntry(entry.id);
    renderGarden();
  });

  return item;
}

function makeEntryList(entries, settings) {
  const list = makeEl("ul", "entry-list");
  entries.forEach((entry) => list.appendChild(makeEntryCard(entry, settings)));
  return list;
}

// ── By month ──────────────────────────────────────────────

function renderMonth(entries, settings) {
  const thisMonth = monthKeyOf(todayKey());
  const earliest = entries.length ? monthKeyOf(entries[entries.length - 1].dayKey) : thisMonth;
  if (!gardenState.month || gardenState.month > thisMonth) gardenState.month = thisMonth;
  if (gardenState.month < earliest) gardenState.month = earliest;
  const month = gardenState.month;

  // ‹ November 2026 ›
  const nav = makeEl("div", "month-nav");
  const back = makeEl("button", "month-step", "‹");
  back.type = "button";
  back.setAttribute("aria-label", "Earlier month");
  back.disabled = month <= earliest;
  const next = makeEl("button", "month-step", "›");
  next.type = "button";
  next.setAttribute("aria-label", "Later month");
  next.disabled = month >= thisMonth;
  back.addEventListener("click", () => { gardenState.month = shiftMonth(month, -1); gardenState.day = null; renderGarden(); });
  next.addEventListener("click", () => { gardenState.month = shiftMonth(month, 1); gardenState.day = null; renderGarden(); });
  nav.append(back, makeEl("h3", "month-title", monthTitle(month)), next);
  gardenBody.appendChild(nav);

  // The calendar: days with entries hold a little bloom.
  const inMonth = entries.filter((entry) => monthKeyOf(entry.dayKey) === month);
  const byDay = {};
  inMonth.forEach((entry) => { (byDay[entry.dayKey] = byDay[entry.dayKey] || []).push(entry); });

  const [y, m] = month.split("-").map(Number);
  const calendar = makeEl("div", "calendar");
  ["S", "M", "T", "W", "T", "F", "S"].forEach((d) => calendar.appendChild(makeEl("span", "weekday", d)));
  const firstWeekday = new Date(y, m - 1, 1).getDay();
  for (let i = 0; i < firstWeekday; i++) calendar.appendChild(makeEl("span", "day-cell empty"));

  const daysInMonth = new Date(y, m, 0).getDate();
  const today = todayKey();
  for (let d = 1; d <= daysInMonth; d++) {
    const key = `${month}-${String(d).padStart(2, "0")}`;
    const dayEntries = byDay[key];
    const cell = makeEl(dayEntries ? "button" : "span", "day-cell");
    if (key === today) cell.classList.add("is-today");
    cell.appendChild(makeEl("span", "day-number", String(d)));
    if (dayEntries) {
      cell.type = "button";
      cell.classList.add("has-bloom");
      if (dayEntries.length > 1) cell.classList.add("many");
      if (key === gardenState.day) cell.classList.add("is-chosen");
      cell.appendChild(makeEl("span", "bloom"));
      cell.setAttribute("aria-label", `${d}: ${dayEntries.length} ${dayEntries.length === 1 ? "moment" : "moments"}`);
      cell.addEventListener("click", () => {
        gardenState.day = gardenState.day === key ? null : key;
        renderGarden();
      });
    }
    calendar.appendChild(cell);
  }
  gardenBody.appendChild(calendar);

  // The entries underneath (just one day's, if you tapped a day).
  if (!inMonth.length) {
    gardenBody.appendChild(gentleNote(entries.length
      ? "Nothing kept this month, and that's perfectly okay."
      : "Your garden is resting. When you keep a recording, it will grow here."));
    return;
  }
  if (gardenState.day && byDay[gardenState.day]) {
    const showAll = makeEl("button", "link-button", "show the whole month");
    showAll.type = "button";
    showAll.addEventListener("click", () => { gardenState.day = null; renderGarden(); });
    const row = makeEl("p", "garden-filter-row");
    row.appendChild(showAll);
    gardenBody.appendChild(row);
    gardenBody.appendChild(makeEntryList(byDay[gardenState.day], settings));
  } else {
    gardenBody.appendChild(makeEntryList(inMonth, settings));
  }
}

// ── By cycle phase ────────────────────────────────────────

function renderPhase(entries, settings) {
  const phases = window.MOON_RHYTHMS.phases;
  const grouped = { menstrual: [], follicular: [], ovulatory: [], luteal: [] };
  let placed = 0;
  entries.forEach((entry) => {
    const cycle = entryCycle(entry, settings);
    if (cycle && grouped[cycle.phase]) {
      grouped[cycle.phase].push(entry);
      placed++;
    }
  });

  if (!entries.length) {
    gardenBody.appendChild(gentleNote("Your garden is resting. When you keep a recording, it will grow here."));
    return;
  }
  if (!placed) {
    gardenBody.appendChild(gentleNote("Add your last period date in “your rhythms”, and your moments will gather by phase here."));
    return;
  }

  for (const [name, list] of Object.entries(grouped)) {
    const section = makeEl("details", "phase-group");
    if (list.length) section.open = gardenState.openPhases ? gardenState.openPhases.includes(name) : true;
    const summary = makeEl("summary");
    summary.appendChild(makeEl("span", "phase-name", `${name} · ${phases[name].season}`));
    if (list.length) summary.appendChild(makeEl("small", null, list.length === 1 ? "1 moment" : `${list.length} moments`));
    section.appendChild(summary);
    section.appendChild(makeEl("p", "rhythm-line", phases[name].line));
    if (list.length) section.appendChild(makeEntryList(list, settings));
    else section.appendChild(makeEl("p", "hint", "Nothing here yet."));
    section.addEventListener("toggle", () => {
      gardenState.openPhases = [...gardenBody.querySelectorAll(".phase-group")]
        .filter((group) => group.open)
        .map((group) => group.dataset.phase);
    });
    section.dataset.phase = name;
    gardenBody.appendChild(section);
  }
}

// ── By mood ───────────────────────────────────────────────

function renderMood(entries, settings) {
  // Feelings in the order of checkin.js, then any older ones you've renamed.
  const moodGroup = (window.MOON_CHECKIN || []).find((group) => group.id === "mood");
  const felt = new Set(entries.flatMap(entryMoods));
  const order = [...(moodGroup ? moodGroup.chips : []), ...felt];
  const moods = [...new Set(order)].filter((mood) => felt.has(mood));

  if (!moods.length) {
    gardenBody.appendChild(gentleNote("As you add check-ins, the feelings you name will gather here."));
    return;
  }
  if (!moods.includes(gardenState.mood)) gardenState.mood = null;

  const row = makeEl("div", "chip-row mood-row");
  moods.forEach((mood) => {
    const chip = makeChip(mood);
    chip.setAttribute("aria-pressed", String(mood === gardenState.mood));
    chip.addEventListener("click", () => {
      gardenState.mood = gardenState.mood === mood ? null : mood;
      renderGarden();
    });
    row.appendChild(chip);
  });
  gardenBody.appendChild(row);

  if (!gardenState.mood) {
    gardenBody.appendChild(gentleNote("Tap a feeling to see the moments that carried it."));
    return;
  }
  gardenBody.appendChild(makeEntryList(entries.filter((entry) => entryMoods(entry).includes(gardenState.mood)), settings));
}

// ── Putting the garden together ───────────────────────────

document.querySelectorAll("[data-garden]").forEach((tab) => {
  tab.addEventListener("click", () => {
    gardenState.mode = tab.dataset.garden;
    renderGarden();
  });
});

// "Your diary uses about 120 MB on this phone"
async function showStorageNote() {
  const note = document.getElementById("storage-note");
  note.textContent = "";
  try {
    const { usage } = await navigator.storage.estimate();
    if (!usage) return;
    const mb = usage / (1024 * 1024);
    note.textContent = `Your diary uses about ${mb < 10 ? mb.toFixed(1) : Math.round(mb)} MB on this phone · `;
  } catch (error) {}
}

// Each redraw gets a number; if a newer one starts while an older one is
// still reading your entries, the older one quietly steps aside.
let gardenDrawing = 0;

async function renderGarden() {
  const drawing = ++gardenDrawing;
  let entries = [];
  try {
    entries = await MoonDB.listEntries();
  } catch (error) {}
  if (drawing !== gardenDrawing) return;
  const settings = MoonSettings.load();

  document.querySelectorAll("[data-garden]").forEach((tab) => {
    tab.setAttribute("aria-pressed", String(tab.dataset.garden === gardenState.mode));
  });

  gardenBody.innerHTML = "";
  if (gardenState.mode === "phase") renderPhase(entries, settings);
  else if (gardenState.mode === "mood") renderMood(entries, settings);
  else renderMonth(entries, settings);

  showStorageNote();
}
