/*
  Moon Diary — your letters
  ==========================
  Monthly and seasonal letters, written by Claude from your words.

  Nothing is ever sent on its own. Every time, you first see exactly what
  would leave your phone and choose "Send to Claude" or "not now".
  Only text is sent: your questions, check-in words and notes, and the
  rhythms around each entry. Never recordings, pictures or coordinates.
*/

const lettersEls = {
  list: document.getElementById("letters-list"),
  needKey: document.getElementById("letters-need-key"),
  consentTitle: document.getElementById("consent-title"),
  consentPreview: document.getElementById("consent-preview"),
  consentInstructions: document.getElementById("consent-instructions"),
  consentMessage: document.getElementById("consent-message"),
  consentSend: document.getElementById("consent-send"),
  consentActions: document.getElementById("consent-actions"),
  letterTitle: document.getElementById("letter-title"),
  letterThemes: document.getElementById("letter-themes"),
  letterSummary: document.getElementById("letter-summary"),
  letterText: document.getElementById("letter-text"),
  letterFooter: document.getElementById("letter-footer"),
  letterRemove: document.getElementById("letter-remove"),
};

// ── Months and seasons that have entries ──────────────────

function shortMonth(dayKey) {
  const [y, m] = dayKey.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString(undefined, { month: "short", year: "numeric" });
}

function capitalise(text) {
  return text ? text[0].toUpperCase() + text.slice(1) : text;
}

// The season each entry belongs to: remembered, or worked out from your place.
function entrySeason(entry, settings) {
  return entry.season || MoonRhythms.seasonFor(MoonSettings.currentPlace(settings), new Date(entry.createdAt));
}

// Every month and season with at least one entry, newest first.
function letterPeriods(entries, settings) {
  const oldestFirst = [...entries].reverse();

  const months = {};
  oldestFirst.forEach((entry) => {
    const key = monthKeyOf(entry.dayKey);
    (months[key] = months[key] || []).push(entry);
  });
  const monthly = Object.entries(months).map(([key, list]) => ({
    id: `month:${key}`,
    kind: "monthly",
    title: monthTitle(key),
    entries: list,
  }));

  // A season is a run of entries in the same season, without a long gap.
  const seasonal = [];
  oldestFirst.forEach((entry) => {
    const season = entrySeason(entry, settings);
    const last = seasonal[seasonal.length - 1];
    const lastEntry = last && last.entries[last.entries.length - 1];
    const longGap = lastEntry && new Date(entry.createdAt) - new Date(lastEntry.createdAt) > 120 * 24 * 3600 * 1000;
    if (last && last.season === season && !longGap) {
      last.entries.push(entry);
    } else {
      seasonal.push({ id: `season:${season}:${entry.dayKey}`, kind: "seasonal", season, entries: [entry] });
    }
  });
  seasonal.forEach((period) => {
    const first = shortMonth(period.entries[0].dayKey);
    const last = shortMonth(period.entries[period.entries.length - 1].dayKey);
    period.title = `${capitalise(MoonAyurveda.seasonName(period.season))} · ${first === last ? first : `${first} – ${last}`}`;
  });

  return { monthly: monthly.reverse(), seasonal: seasonal.reverse() };
}

// ── The exact words that would be sent ────────────────────

// Short names for check-in groups, for the letter's notes.
const CHECKIN_NAMES = {
  mood: "Feelings", energy: "Energy", body: "Body", sleep: "Sleep",
  digestion: "Digestion & appetite", did: "What filled my day",
};

function partOfDayName(date) {
  const hour = date.getHours();
  if (hour < 5) return "night";
  if (hour < 12) return "morning";
  if (hour < 17) return "afternoon";
  if (hour < 21) return "evening";
  return "night";
}

function describeEntryForLetter(entry, settings) {
  const date = new Date(entry.createdAt);
  const cycle = entryCycle(entry, settings);
  const heading = [
    `${date.toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" })}, ${partOfDayName(date)}`,
    cycle ? `day ${cycle.day} of my cycle (${cycle.phase})` : null,
    MoonAyurveda.seasonName(entrySeason(entry, settings)),
    entry.place,
  ].filter(Boolean).join(" · ");

  const minutes = Math.max(1, Math.round(entry.durationMs / 60000));
  const lines = [heading];
  if (entry.prompt) lines.push(`Question: ${entry.prompt}`);
  lines.push(`I recorded a ${minutes}-minute ${entry.kind === "video" ? "video" : "voice"} entry.`);

  const checkin = entry.checkin || {};
  const tapped = (window.MOON_CHECKIN || [])
    .filter((group) => checkin[group.id] && [].concat(checkin[group.id]).length)
    .map((group) => `${CHECKIN_NAMES[group.id] || group.id}: ${[].concat(checkin[group.id]).join(", ")}`);
  if (tapped.length) lines.push(tapped.join(" · "));
  if (checkin.note) lines.push(`My note: ${checkin.note}`);
  return lines.join("\n");
}

function wordsForLetter(period, settings) {
  const ask = window.MOON_LETTERS[period.kind];
  const about = settings.doshas.length ? `Doshas I lean toward: ${settings.doshas.join(", ")}.` : null;
  const entries = period.entries.map((entry) => describeEntryForLetter(entry, settings)).join("\n\n");
  return [ask, `This letter is for: ${period.title}.`, about, "My diary entries, oldest first:", entries]
    .filter(Boolean).join("\n\n");
}

// ── The letters page ──────────────────────────────────────

let lettersCache = { periods: null, letters: {} };

function makeLetterRow(period) {
  const saved = lettersCache.letters[period.id];
  const row = makeEl("li", "letter-row");
  const text = makeEl("div");
  text.appendChild(makeEl("p", "letter-row-title", period.title));
  text.appendChild(makeEl("p", "hint", saved
    ? `kept ${new Date(saved.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}`
    : `${period.entries.length === 1 ? "1 moment" : `${period.entries.length} moments`} to draw from`));
  const button = makeEl("button", "soft-button small", saved ? "read" : "write");
  button.type = "button";
  button.addEventListener("click", () => (saved ? openLetter(saved) : openConsent(period)));
  row.append(text, button);
  return row;
}

async function renderLetters() {
  let entries = [];
  let letters = [];
  try {
    [entries, letters] = await Promise.all([MoonDB.listEntries(), MoonDB.listLetters()]);
  } catch (error) {}
  const settings = MoonSettings.load();
  lettersCache = {
    periods: letterPeriods(entries, settings),
    letters: Object.fromEntries(letters.map((letter) => [letter.id, letter])),
  };

  lettersEls.needKey.hidden = MoonClaude.hasKey();
  lettersEls.list.innerHTML = "";
  if (!entries.length) {
    lettersEls.list.appendChild(gentleNote("When you've kept a few moments, your letters can be written here."));
    return;
  }
  for (const [kind, heading] of [["monthly", "Monthly letters"], ["seasonal", "Seasonal letters"]]) {
    const card = makeEl("section", "settings-card");
    card.appendChild(makeEl("h3", "checkin-label", heading));
    const list = makeEl("ul", "letter-rows");
    lettersCache.periods[kind].forEach((period) => list.appendChild(makeLetterRow(period)));
    card.appendChild(list);
    lettersEls.list.appendChild(card);
  }
}

// ── Before anything leaves your phone ─────────────────────

let consentPeriod = null;
let consentWords = "";

function openConsent(period) {
  if (!MoonClaude.hasKey()) {
    showToast("Add your Claude key in “your rhythms” first.");
    showView("settings");
    return;
  }
  consentPeriod = period;
  consentWords = wordsForLetter(period, MoonSettings.load());
  lettersEls.consentTitle.textContent = `To write your letter for ${period.title}, Moon Diary would send exactly these words to Claude, made by Anthropic.`;
  lettersEls.consentPreview.textContent = consentWords;
  lettersEls.consentInstructions.textContent = window.MOON_LETTERS.instructions;
  lettersEls.consentMessage.textContent = "";
  lettersEls.consentMessage.classList.remove("is-writing");
  lettersEls.consentActions.hidden = false;
  lettersEls.consentSend.disabled = false;
  lettersEls.consentSend.textContent = "Send to Claude";
  showView("consent");
}

lettersEls.consentSend.addEventListener("click", async () => {
  if (!consentPeriod) return;
  const period = consentPeriod;
  lettersEls.consentSend.disabled = true;
  lettersEls.consentActions.hidden = true;
  lettersEls.consentMessage.classList.add("is-writing");
  lettersEls.consentMessage.textContent = "Claude is writing your letter. This can take a minute or two, so feel free to breathe.";
  try {
    const written = await MoonClaude.writeLetter(window.MOON_LETTERS.instructions, consentWords);
    const letter = {
      id: period.id,
      kind: period.kind,
      title: period.title,
      createdAt: new Date().toISOString(),
      letter: written.letter,
      themes: written.themes,
      mood: written.mood,
      days: written.days,
      model: written.model,
      moments: period.entries.length,
    };
    await MoonDB.saveLetter(letter);
    consentPeriod = null;
    openLetter(letter);
  } catch (error) {
    lettersEls.consentMessage.classList.remove("is-writing");
    lettersEls.consentMessage.textContent = error.message;
    if (error.detail) lettersEls.consentMessage.appendChild(makeEl("small", "error-detail", error.detail));
    lettersEls.consentActions.hidden = false;
    lettersEls.consentSend.disabled = false;
    lettersEls.consentSend.textContent = "Try again";
  }
});

document.getElementById("consent-not-now").addEventListener("click", () => {
  consentPeriod = null;
  showView("letters");
});

// ── Reading a letter ──────────────────────────────────────

let openLetterId = null;

function openLetter(letter) {
  openLetterId = letter.id;
  lettersEls.letterTitle.textContent = letter.title;
  lettersEls.letterThemes.innerHTML = "";
  (letter.themes || []).forEach((theme) => lettersEls.letterThemes.appendChild(makeEl("span", null, theme)));
  lettersEls.letterSummary.innerHTML = "";
  [letter.mood, letter.days].filter(Boolean)
    .forEach((line) => lettersEls.letterSummary.appendChild(makeEl("p", "rhythm-line", line)));
  lettersEls.letterText.textContent = letter.letter;
  lettersEls.letterFooter.textContent = `Written with Claude · ${new Date(letter.createdAt).toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" })}`;
  lettersEls.letterRemove.textContent = "let this letter go";
  showView("letter");
}

lettersEls.letterRemove.addEventListener("click", async () => {
  if (lettersEls.letterRemove.textContent === "let this letter go") {
    lettersEls.letterRemove.textContent = "tap again to let it go";
    return;
  }
  await MoonDB.deleteLetter(openLetterId);
  showView("letters");
});
