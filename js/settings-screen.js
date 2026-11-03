/*
  Moon Diary — "your rhythms" screen
  ===================================
  Every change saves straight away, only on your phone.
*/

const settingsEls = {
  cycleStart: document.getElementById("cycle-start"),
  cycleLength: document.getElementById("cycle-length"),
  periodLength: document.getElementById("period-length"),
  cycleShow: document.getElementById("cycle-show"),
  cyclePreview: document.getElementById("cycle-preview"),
  doshaOptions: document.getElementById("dosha-options"),
  placeList: document.getElementById("place-list"),
  placesEmpty: document.getElementById("places-empty"),
  addPlace: document.getElementById("add-place"),
  placeName: document.getElementById("place-name"),
  placeLocated: document.getElementById("place-located"),
  placeClimate: document.getElementById("place-climate"),
  placeHemisphere: document.getElementById("place-hemisphere"),
  ayurvedaShow: document.getElementById("ayurveda-show"),
  learnPrompts: document.getElementById("learn-prompts"),
  learnPatterns: document.getElementById("learn-patterns"),
  weatherOn: document.getElementById("weather-on"),
  weatherHint: document.getElementById("weather-hint"),
  weatherConsent: document.getElementById("weather-consent"),
  consentCoords: document.getElementById("consent-coords"),
};

// ── Building the choices once ─────────────────────────────

function fillNumberSelect(select, from, to, unit) {
  for (let n = from; n <= to; n++) {
    const option = document.createElement("option");
    option.value = n;
    option.textContent = `${n} ${unit}`;
    select.appendChild(option);
  }
}
fillNumberSelect(settingsEls.cycleLength, 21, 45, "days");
fillNumberSelect(settingsEls.periodLength, 2, 10, "days");
settingsEls.cycleStart.max = todayKey();

for (const [name, description] of Object.entries(window.MOON_RHYTHMS.doshas)) {
  const option = document.createElement("button");
  option.type = "button";
  option.className = "dosha-option";
  option.dataset.dosha = name;
  option.innerHTML = "<strong></strong><span></span>";
  option.querySelector("strong").textContent = name;
  option.querySelector("span").textContent = description;
  settingsEls.doshaOptions.appendChild(option);
}

for (const [name, climate] of Object.entries(window.MOON_RHYTHMS.climates)) {
  const chip = makeChip(`${climate.label} (${climate.example})`);
  chip.dataset.value = name;
  settingsEls.placeClimate.appendChild(chip);
}

// ── Showing your current settings ─────────────────────────

function describeCycle(settings) {
  const today = MoonRhythms.cycleToday(settings.cycle);
  if (!today) return "";
  const phase = window.MOON_RHYTHMS.phases[today.phase];
  let text = `Today is about day ${today.day} of ${today.length}: ${today.phase}, ${phase.season}.`;
  if (today.estimated) text += " This is a gentle estimate. Whenever your period begins, you can tap “my period started today”.";
  return text;
}

function renderSettings() {
  const settings = MoonSettings.load();

  settingsEls.cycleStart.value = settings.cycle.lastStart;
  settingsEls.cycleLength.value = settings.cycle.length;
  settingsEls.periodLength.value = settings.cycle.periodLength;
  settingsEls.cycleShow.checked = settings.cycle.show;
  settingsEls.cyclePreview.textContent = describeCycle(settings);

  settingsEls.doshaOptions.querySelectorAll(".dosha-option").forEach((option) => {
    option.setAttribute("aria-pressed", String(settings.doshas.includes(option.dataset.dosha)));
  });

  renderPlaceList(settings);

  settingsEls.ayurvedaShow.checked = settings.ayurveda.show;
  settingsEls.learnPrompts.checked = settings.learning.adaptPrompts;
  settingsEls.learnPatterns.checked = settings.learning.patterns;

  renderClaudeKey();

  settingsEls.weatherOn.checked = settings.weather.enabled;
  settingsEls.weatherConsent.hidden = true;
  settingsEls.weatherHint.textContent = settings.weather.enabled
    ? "On. Once a day, only your place's rough location is sent to Open-Meteo."
    : "Off. Your climate and seasons work without it.";
}

function placeSummary(place) {
  const climate = window.MOON_RHYTHMS.climates[place.climate];
  const season = MoonRhythms.seasonFor(place);
  return `${climate ? climate.label : ""} · ${season}${place.hemisphere === "south" ? " · south" : ""}`;
}

function renderPlaceList(settings) {
  settingsEls.placeList.innerHTML = "";
  settingsEls.placesEmpty.hidden = settings.places.length > 0;

  for (const place of settings.places) {
    const item = document.createElement("li");
    item.className = "place";
    item.innerHTML = `
      <button class="place-pick" type="button"><span></span><small></small></button>
      <button class="link-button" type="button">remove</button>`;
    const pick = item.querySelector(".place-pick");
    pick.setAttribute("aria-pressed", String(place.id === settings.currentPlaceId));
    pick.querySelector("span").textContent = place.name;
    pick.querySelector("small").textContent = place.id === settings.currentPlaceId
      ? `here now · ${placeSummary(place)}`
      : placeSummary(place);

    pick.addEventListener("click", () => {
      MoonSettings.update((s) => { s.currentPlaceId = place.id; });
      renderSettings();
      refreshHome();
    });

    const remove = item.querySelector(".link-button");
    remove.addEventListener("click", () => {
      if (remove.textContent === "remove") {
        remove.textContent = "tap again to remove";
        return;
      }
      MoonSettings.update((s) => {
        s.places = s.places.filter((p) => p.id !== place.id);
        if (s.currentPlaceId === place.id) s.currentPlaceId = s.places[0] ? s.places[0].id : null;
      });
      renderSettings();
      refreshHome();
    });

    settingsEls.placeList.appendChild(item);
  }
}

// ── Cycle ─────────────────────────────────────────────────

function saveCycle() {
  MoonSettings.update((s) => {
    const previous = s.cycle.lastStart;
    const next = settingsEls.cycleStart.value;
    // A newer period: remember the old date, so past entries keep their phase.
    // (An earlier date is treated as a correction, not a new period.)
    if (previous && next > previous && !s.cycle.history.includes(previous)) {
      s.cycle.history.push(previous);
    }
    s.cycle.lastStart = next;
    s.cycle.length = Number(settingsEls.cycleLength.value);
    s.cycle.periodLength = Number(settingsEls.periodLength.value);
    s.cycle.show = settingsEls.cycleShow.checked;
  });
  settingsEls.cyclePreview.textContent = describeCycle(MoonSettings.load());
  refreshHome();
}

[settingsEls.cycleStart, settingsEls.cycleLength, settingsEls.periodLength, settingsEls.cycleShow]
  .forEach((el) => el.addEventListener("change", saveCycle));

document.getElementById("period-today").addEventListener("click", () => {
  settingsEls.cycleStart.value = todayKey();
  saveCycle();
  showToast("Noted. Be extra gentle with yourself today.");
});

// ── Doshas ────────────────────────────────────────────────

settingsEls.doshaOptions.addEventListener("click", (event) => {
  const option = event.target.closest(".dosha-option");
  if (!option) return;
  const turningOn = option.getAttribute("aria-pressed") !== "true";
  option.setAttribute("aria-pressed", String(turningOn));
  MoonSettings.update((s) => {
    s.doshas = s.doshas.filter((d) => d !== option.dataset.dosha);
    if (turningOn) s.doshas.push(option.dataset.dosha);
  });
  refreshHome();
});

// ── Ayurveda ──────────────────────────────────────────────

settingsEls.ayurvedaShow.addEventListener("change", () => {
  MoonSettings.update((s) => { s.ayurveda.show = settingsEls.ayurvedaShow.checked; });
  refreshHome();
});

// ── Learning ──────────────────────────────────────────────

settingsEls.learnPrompts.addEventListener("change", () => {
  const on = settingsEls.learnPrompts.checked;
  MoonSettings.update((s) => { s.learning.adaptPrompts = on; });
  // Switching off also lets go of what it had learned.
  if (!on) MoonLearning.forget();
  refreshHome();
});

settingsEls.learnPatterns.addEventListener("change", () => {
  MoonSettings.update((s) => { s.learning.patterns = settingsEls.learnPatterns.checked; });
});

// ── Claude letters: your key ──────────────────────────────

const claudeKeyInput = document.getElementById("claude-key");
const claudeKeyHint = document.getElementById("claude-key-hint");

function renderClaudeKey() {
  const saved = MoonClaude.hasKey();
  document.getElementById("claude-key-status").textContent = saved
    ? "Your key is saved on this phone."
    : "No key yet. Letters stay off until you add one.";
  document.getElementById("claude-key-form").hidden = saved;
  document.getElementById("claude-key-remove").hidden = !saved;
  document.getElementById("claude-key-remove").textContent = "remove my key from this phone";
  claudeKeyInput.value = "";
}

document.getElementById("claude-key-save").addEventListener("click", () => {
  const key = claudeKeyInput.value.trim();
  if (!key.startsWith("sk-ant-")) {
    claudeKeyHint.textContent = "That doesn't look like an Anthropic key yet. Keys begin with “sk-ant-”.";
    return;
  }
  MoonClaude.saveKey(key);
  claudeKeyHint.textContent = "Kept only on this phone, and used only when you tap “Send to Claude”.";
  renderClaudeKey();
  showToast("Your key is saved on this phone.");
});

const claudeKeyRemove = document.getElementById("claude-key-remove");
claudeKeyRemove.addEventListener("click", () => {
  if (claudeKeyRemove.textContent === "remove my key from this phone") {
    claudeKeyRemove.textContent = "tap again to remove it";
    return;
  }
  MoonClaude.forgetKey();
  renderClaudeKey();
});

// ── Adding a place ────────────────────────────────────────

let newPlace = { lat: null, lon: null };

function chooseChip(row, value) {
  row.querySelectorAll(".chip").forEach((chip) => {
    chip.setAttribute("aria-pressed", String(chip.dataset.value === value));
  });
}
function chosenChip(row) {
  const chip = row.querySelector('.chip[aria-pressed="true"]');
  return chip ? chip.dataset.value : null;
}

// Climate and hemisphere are pick-one rows.
[settingsEls.placeClimate, settingsEls.placeHemisphere].forEach((row) => {
  row.addEventListener("click", (event) => {
    const chip = event.target.closest(".chip");
    if (chip) chooseChip(row, chip.dataset.value);
  });
});

function resetNewPlace() {
  newPlace = { lat: null, lon: null };
  settingsEls.placeName.value = "";
  settingsEls.placeLocated.textContent = "Optional. Helps with weather and finding your climate. Saved only on your phone, rounded to about 10 km.";
  chooseChip(settingsEls.placeClimate, null);
  chooseChip(settingsEls.placeHemisphere, "north");
}
resetNewPlace();

document.getElementById("place-locate").addEventListener("click", () => {
  if (!navigator.geolocation) {
    settingsEls.placeLocated.textContent = "This phone can't share its location here. You can just choose a climate below.";
    return;
  }
  settingsEls.placeLocated.textContent = "Finding where you are…";
  navigator.geolocation.getCurrentPosition(
    (position) => {
      // Rounded to one decimal place (about 10 km), so it's never exact.
      newPlace.lat = Math.round(position.coords.latitude * 10) / 10;
      newPlace.lon = Math.round(position.coords.longitude * 10) / 10;
      chooseChip(settingsEls.placeClimate, MoonRhythms.guessClimate(newPlace.lat));
      chooseChip(settingsEls.placeHemisphere, newPlace.lat < 0 ? "south" : "north");
      settingsEls.placeLocated.textContent = `Found you near ${newPlace.lat}, ${newPlace.lon}. I've guessed the climate below. Change it if it doesn't feel right.`;
    },
    () => {
      settingsEls.placeLocated.textContent = "Moon Diary couldn't find your location. That's okay, just choose a climate below.";
    },
    { enableHighAccuracy: false, timeout: 15000, maximumAge: 600000 }
  );
});

document.getElementById("place-save").addEventListener("click", () => {
  const climate = chosenChip(settingsEls.placeClimate);
  if (!climate) {
    settingsEls.placeLocated.textContent = "Choose a climate first (or tap “use where I am now”).";
    return;
  }
  const place = {
    id: `${Date.now()}`,
    name: settingsEls.placeName.value.trim() || "My place",
    climate,
    hemisphere: chosenChip(settingsEls.placeHemisphere) || "north",
    lat: newPlace.lat,
    lon: newPlace.lon,
  };
  MoonSettings.update((s) => {
    s.places.push(place);
    s.currentPlaceId = place.id;
  });
  settingsEls.addPlace.open = false;
  resetNewPlace();
  renderSettings();
  refreshHome();
  showToast(`${place.name} is saved, and it's where you are now.`);
});

// ── Weather (asks clearly before switching on) ────────────

settingsEls.weatherOn.addEventListener("change", () => {
  if (!settingsEls.weatherOn.checked) {
    MoonSettings.update((s) => { s.weather.enabled = false; });
    MoonWeather.forget();
    renderSettings();
    refreshHome();
    return;
  }
  // Not on yet. First explain exactly what would leave the phone.
  settingsEls.weatherOn.checked = false;
  const place = MoonSettings.currentPlace();
  if (!place || place.lat == null) {
    settingsEls.weatherHint.textContent = "Weather needs a place saved with “use where I am now”, so it knows roughly where to look.";
    return;
  }
  settingsEls.consentCoords.textContent = `${place.name}: ${place.lat}, ${place.lon}`;
  settingsEls.weatherConsent.hidden = false;
});

document.getElementById("weather-yes").addEventListener("click", () => {
  MoonSettings.update((s) => { s.weather.enabled = true; s.weather.agreedAt = new Date().toISOString(); });
  renderSettings();
  refreshHome();
});

document.getElementById("weather-no").addEventListener("click", () => {
  settingsEls.weatherConsent.hidden = true;
});
