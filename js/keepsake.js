/*
  Moon Diary — keepsakes (export and import)
  ===========================================
  A keepsake is one .zip file holding your moments, check-ins, letters
  and settings, plus a lovely page you can read anywhere. Save it to the
  Files app or iCloud Drive, and bring it back to Moon Diary any time.

  Never automatic and never nagging: once a month a quiet card offers to
  tuck the month away. "Not now" means it won't ask about that month again.
  Your Claude key is never included.
*/

const KEEPSAKE_STORE = "moon.keepsakes";   // which months you've saved or passed on

function keepsakeRecord() {
  return recall(KEEPSAKE_STORE) || { months: {}, dismissed: [], everythingAt: null };
}
function saveKeepsakeRecord(record) {
  remember(KEEPSAKE_STORE, record);
}

const keepsakeEls = {
  title: document.getElementById("keepsake-title"),
  status: document.getElementById("keepsake-status"),
  save: document.getElementById("keepsake-save"),
  bring: document.getElementById("keepsake-bring"),
  hint: document.getElementById("keepsake-hint"),
};

// ── Small helpers ─────────────────────────────────────────

function escapeHtml(text) {
  return String(text == null ? "" : text)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function friendlySize(bytes) {
  const mb = bytes / (1024 * 1024);
  return mb < 1 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${mb < 10 ? mb.toFixed(1) : Math.round(mb)} MB`;
}

function mediaExtension(entry) {
  const type = entry.mimeType || "";
  if (type.includes("webm")) return "webm";
  return entry.kind === "video" ? "mp4" : "m4a";
}

function mediaFileName(entry) {
  return `media/${entry.dayKey}-${entry.kind}-${String(entry.id).slice(0, 8)}.${mediaExtension(entry)}`;
}

// ── The readable page inside each keepsake ────────────────

function keepsakePage(title, entries, letters, settings) {
  const oldestFirst = [...entries].reverse();
  const moments = oldestFirst.map((entry) => {
    const cycle = entryCycle(entry, settings);
    const context = [
      cycle ? `day ${cycle.day} · ${cycle.phase}` : "",
      entry.place || "",
    ].filter(Boolean).join(" · ");
    const tags = checkinTags(entry.checkin).map((tag) => `<span>${escapeHtml(tag)}</span>`).join("");
    const note = entry.checkin && entry.checkin.note ? `<p class="note">${escapeHtml(entry.checkin.note)}</p>` : "";
    return `
      <article>
        <p class="when">${escapeHtml(describeWhen(entry.createdAt))}${context ? ` · ${escapeHtml(context)}` : ""}</p>
        <p class="prompt">${escapeHtml(entry.prompt)}</p>
        ${tags ? `<p class="tags">${tags}</p>` : ""}
        ${note}
        <p><a href="${escapeHtml(mediaFileName(entry))}">${entry.kind === "video" ? "watch" : "listen"} (${escapeHtml(formatDuration(entry.durationMs))})</a></p>
      </article>`;
  }).join("");
  const letterPages = letters.map((letter) => `
      <article class="letter">
        <h2>${escapeHtml(letter.title)}</h2>
        <p class="tags">${(letter.themes || []).map((t) => `<span>${escapeHtml(t)}</span>`).join("")}</p>
        <p class="letter-text">${escapeHtml(letter.letter)}</p>
      </article>`).join("");

  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)}</title>
<style>
  body { margin: 0; background: #f1e6d6; color: #503447; font-family: "Iowan Old Style", Palatino, Georgia, serif; line-height: 1.6; }
  main { max-width: 640px; margin: 0 auto; padding: 32px 18px 64px; }
  h1 { font-weight: 400; text-align: center; margin: 0 0 4px; }
  .sub { text-align: center; color: #684f5c; font-style: italic; margin: 0 0 28px; }
  article { background: #f6efe6; border: 1px solid #e0cbc7; border-radius: 22px; padding: 16px 18px; margin: 0 0 14px; }
  .when { margin: 0; font-size: 14px; color: #684f5c; }
  .prompt { font-style: italic; font-size: 17px; margin: 6px 0; }
  .tags span { display: inline-block; background: #e0cbc7; border-radius: 999px; padding: 2px 10px; margin: 0 4px 4px 0; font-size: 14px; }
  .note, .letter-text { white-space: pre-wrap; }
  a { color: #862c4d; }
  .letter { border-color: #b25074; }
  .letter h2 { font-weight: 400; margin: 0 0 6px; }
</style></head>
<body><main>
  <h1>${escapeHtml(title)}</h1>
  <p class="sub">A keepsake from your Moon Diary</p>
  ${letterPages}
  ${moments || "<p class='sub'>No moments in this keepsake.</p>"}
</main></body></html>`;
}

// The keepsake page's "back" returns to wherever you came from.
let keepsakeReturnTo = "garden";
function showKeepsakeView() {
  if (currentView !== "keepsake") keepsakeReturnTo = currentView;
  showView("keepsake");
}
document.getElementById("keepsake-back").addEventListener("click", () => showView(keepsakeReturnTo));

// ── Preparing a keepsake ──────────────────────────────────

let preparedKeepsake = null;   // { file, scope } once it's ready to save

// scope: { kind: "month", month: "2026-10" } or { kind: "everything" }
async function prepareKeepsake(scope) {
  preparedKeepsake = null;
  const isMonth = scope.kind === "month";
  const title = isMonth ? `Moon Diary · ${monthTitle(scope.month)}` : "Moon Diary · everything";
  keepsakeEls.title.textContent = isMonth ? `Keepsake for ${monthTitle(scope.month)}` : "Keepsake of everything";
  keepsakeEls.status.textContent = "Gathering your moments…";
  keepsakeEls.save.hidden = true;
  keepsakeEls.bring.hidden = true;
  keepsakeEls.hint.textContent = "";
  showKeepsakeView();

  try {
    const settings = MoonSettings.load();
    const allEntries = await MoonDB.listEntries();
    const entries = isMonth ? allEntries.filter((entry) => monthKeyOf(entry.dayKey) === scope.month) : allEntries;
    const allLetters = await MoonDB.listLetters();
    const letters = isMonth ? allLetters.filter((letter) => letter.id === `month:${scope.month}`) : allLetters;

    const diary = {
      app: "Moon Diary",
      format: 1,
      exportedAt: new Date().toISOString(),
      scope,
      settings,          // your rhythms (your Claude key is never part of these)
      entries: entries.map((entry) => ({ ...entry, mediaFile: mediaFileName(entry) })),
      letters,
    };

    const files = [
      { name: "keepsake.html", data: keepsakePage(title, entries, letters, settings) },
      { name: "diary.json", data: JSON.stringify(diary, null, 2) },
    ];
    for (const entry of entries) {
      const blob = await MoonDB.getMedia(entry.id);
      if (blob) files.push({ name: mediaFileName(entry), data: blob });
    }

    const zip = await MoonZip.make(files, (done, total) => {
      keepsakeEls.status.textContent = `Gathering your moments… ${done} of ${total}`;
    });
    const fileName = isMonth ? `Moon Diary – ${monthTitle(scope.month)}.zip` : `Moon Diary – everything – ${todayKey()}.zip`;
    preparedKeepsake = { file: new File([zip], fileName, { type: "application/zip" }), scope };

    keepsakeEls.status.textContent = `Your keepsake is ready: ${entries.length === 1 ? "1 moment" : `${entries.length} moments`}` +
      `${letters.length ? ` and ${letters.length === 1 ? "1 letter" : `${letters.length} letters`}` : ""}, ${friendlySize(zip.size)}.`;
    keepsakeEls.save.hidden = false;
    keepsakeEls.hint.textContent = "In the share sheet, choose “Save to Files”. Saving to iCloud Drive keeps a copy safe even if something happens to your phone.";
  } catch (error) {
    keepsakeEls.status.textContent = "This keepsake couldn't be gathered. Your phone may be low on memory. Saving one month at a time can help.";
  }
}

function markKeepsakeSaved(scope) {
  const record = keepsakeRecord();
  if (scope.kind === "month") record.months[scope.month] = new Date().toISOString();
  else record.everythingAt = new Date().toISOString();
  saveKeepsakeRecord(record);
}

// Saving needs its own tap, because iPhone only opens the share sheet
// straight after you touch something.
keepsakeEls.save.addEventListener("click", async () => {
  if (!preparedKeepsake) return;
  const { file, scope } = preparedKeepsake;
  try {
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({ files: [file], title: file.name });
    } else {
      const link = document.createElement("a");
      link.href = URL.createObjectURL(file);
      link.download = file.name;
      link.click();
      setTimeout(() => URL.revokeObjectURL(link.href), 60000);
    }
    markKeepsakeSaved(scope);
    showToast("Your keepsake is tucked away.");
  } catch (error) {
    // Closing the share sheet is fine; nothing is lost.
    if (error.name !== "AbortError") keepsakeEls.hint.textContent = "Saving didn't work this time. Please try again.";
  }
});

// ── The quiet monthly card in your garden ─────────────────

function renderKeepsakeNudge(entries) {
  const lastMonth = shiftMonth(monthKeyOf(todayKey()), -1);
  const record = keepsakeRecord();
  const hasMoments = entries.some((entry) => monthKeyOf(entry.dayKey) === lastMonth);
  if (!hasMoments || record.months[lastMonth] || record.dismissed.includes(lastMonth)) return;

  const card = makeEl("section", "noticings keepsake-nudge");
  card.appendChild(makeEl("p", "eyebrow", "A keepsake"));
  card.appendChild(makeEl("p", "rhythm-line", `${monthTitle(lastMonth)} is complete. Would you like to tuck it away?`));
  const actions = makeEl("div", "review-actions");
  const yes = makeEl("button", "soft-button small", "tuck it away");
  yes.type = "button";
  yes.addEventListener("click", () => prepareKeepsake({ kind: "month", month: lastMonth }));
  const notNow = makeEl("button", "link-button", "not now");
  notNow.type = "button";
  notNow.addEventListener("click", () => {
    const updated = keepsakeRecord();
    updated.dismissed.push(lastMonth);
    saveKeepsakeRecord(updated);
    card.remove();
  });
  actions.append(yes, notNow);
  card.appendChild(actions);
  gardenBody.appendChild(card);
}

// ── Bringing a keepsake back ──────────────────────────────

let keepsakeToBring = null;   // { diary, files }

async function openKeepsakeFile(file) {
  keepsakeToBring = null;
  keepsakeEls.title.textContent = "Bring back a keepsake";
  keepsakeEls.status.textContent = "Opening your keepsake…";
  keepsakeEls.save.hidden = true;
  keepsakeEls.bring.hidden = true;
  keepsakeEls.hint.textContent = "";
  showKeepsakeView();

  try {
    const files = await MoonZip.read(file);
    if (!files["diary.json"]) throw new Error("no diary");
    const diary = JSON.parse(await files["diary.json"].text());
    if (diary.app !== "Moon Diary") throw new Error("not ours");

    const here = new Set((await MoonDB.listEntries()).map((entry) => entry.id));
    const lettersHere = new Set((await MoonDB.listLetters()).map((letter) => letter.id));
    const newEntries = diary.entries.filter((entry) => !here.has(entry.id));
    const newLetters = (diary.letters || []).filter((letter) => !lettersHere.has(letter.id));
    keepsakeToBring = { diary, files, newEntries, newLetters };

    const what = diary.scope && diary.scope.kind === "month" ? monthTitle(diary.scope.month) : "everything";
    keepsakeEls.status.textContent = `This keepsake holds ${diary.entries.length === 1 ? "1 moment" : `${diary.entries.length} moments`}` +
      ` and ${(diary.letters || []).length === 1 ? "1 letter" : `${(diary.letters || []).length} letters`} (${what}).`;
    if (newEntries.length || newLetters.length) {
      keepsakeEls.hint.textContent = `${newEntries.length} ${newEntries.length === 1 ? "moment is" : "moments are"} new to this phone` +
        `${newLetters.length ? `, and ${newLetters.length} ${newLetters.length === 1 ? "letter" : "letters"}` : ""}. Anything already here stays just as it is.`;
      keepsakeEls.bring.hidden = false;
    } else {
      keepsakeEls.hint.textContent = "Everything in it is already here on your phone.";
    }
  } catch (error) {
    keepsakeEls.status.textContent = "This file couldn't be opened as a Moon Diary keepsake.";
  }
}

keepsakeEls.bring.addEventListener("click", async () => {
  if (!keepsakeToBring) return;
  const { diary, files, newEntries, newLetters } = keepsakeToBring;
  keepsakeEls.bring.hidden = true;
  let brought = 0;
  try {
    for (const entry of newEntries) {
      const media = files[entry.mediaFile];
      if (!media) continue;
      const { mediaFile, ...saved } = entry;
      keepsakeEls.status.textContent = `Bringing your moments home… ${brought + 1} of ${newEntries.length}`;
      await MoonDB.saveEntry(saved, new Blob([media], { type: entry.mimeType }));
      brought++;
    }
    for (const letter of newLetters) await MoonDB.saveLetter(letter);

    // Your rhythms come back too, but only if this phone has none set yet.
    const current = MoonSettings.load();
    const untouched = !current.cycle.lastStart && !current.places.length && !current.doshas.length;
    if (untouched && diary.settings) {
      MoonSettings.save(diary.settings);
      refreshHome();
    }

    MoonDB.askToKeepStorage();
    keepsakeEls.status.textContent = `Welcome home: ${brought === 1 ? "1 moment" : `${brought} moments`}` +
      `${newLetters.length ? ` and ${newLetters.length === 1 ? "1 letter" : `${newLetters.length} letters`}` : ""}.`;
    keepsakeEls.hint.textContent = untouched && diary.settings ? "Your rhythms came back too." : "";
    keepsakeToBring = null;
  } catch (error) {
    keepsakeEls.status.textContent = `Some moments came home (${brought}), but your phone may be low on space. You can try again with the same file; nothing will be doubled.`;
    keepsakeEls.bring.hidden = false;
  }
});

document.getElementById("keepsake-file").addEventListener("change", (event) => {
  const file = event.target.files[0];
  event.target.value = "";
  if (file) openKeepsakeFile(file);
});

document.getElementById("keepsake-everything").addEventListener("click", () => prepareKeepsake({ kind: "everything" }));

function renderKeepsakeSettings() {
  const record = keepsakeRecord();
  const last = [record.everythingAt, ...Object.values(record.months)].filter(Boolean).sort().pop();
  document.getElementById("keepsake-last").textContent = last
    ? `Last keepsake saved ${new Date(last).toLocaleDateString(undefined, { day: "numeric", month: "long" })}.`
    : "No keepsakes saved yet.";
}
