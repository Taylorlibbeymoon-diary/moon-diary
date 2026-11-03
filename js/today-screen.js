/*
  Moon Diary — "today's rhythm" screen
  =====================================
  Your season, doshas, cycle, weather and the rhythm of the day, built
  from content/ayurveda.js.
*/

const todaySections = document.getElementById("today-sections");

// 6 → "6am", 14 → "2pm", 0 → "12am"
function hourLabel(hour) {
  const h = hour % 12 === 0 ? 12 : hour % 12;
  return `${h}${hour < 12 ? "am" : "pm"}`;
}

function makeEl(tag, className, text) {
  const el = document.createElement(tag);
  if (className) el.className = className;
  if (text != null) el.textContent = text;
  return el;
}

function makeList(items) {
  const list = makeEl("ul", "invitations");
  items.forEach((text) => list.appendChild(makeEl("li", null, text)));
  return list;
}

// A card with a small heading, an optional italic line, and a list.
function makeCard(heading, line, items) {
  const card = makeEl("section", "settings-card");
  card.appendChild(makeEl("h3", "checkin-label", heading));
  if (line) card.appendChild(makeEl("p", "rhythm-line", line));
  if (items && items.length) card.appendChild(makeList(items));
  return card;
}

function renderToday() {
  const wisdom = window.MOON_AYURVEDA;
  const moment = currentMoment();
  document.getElementById("today-note").textContent = wisdom.note;
  todaySections.innerHTML = "";

  // The season, where you are
  const season = wisdom.seasons[moment.season];
  if (season) {
    const where = moment.place ? ` in ${moment.place.name}` : "";
    const name = MoonAyurveda.seasonName(moment.season);
    todaySections.appendChild(makeCard(`${name}${where}`, season.line, season.invitations));
  }

  // Your doshas in this season
  if (moment.doshas.length) {
    const card = makeCard("Your doshas this season");
    moment.doshas.forEach((dosha) => {
      card.appendChild(makeEl("p", "rhythm-line", MoonAyurveda.doshaInSeason(dosha, moment.season)));
    });
    todaySections.appendChild(card);
  }

  // Today's weather (only if weather is on and known)
  const weatherNotes = MoonAyurveda.weatherNotes(moment.weather);
  if (moment.weather) {
    todaySections.appendChild(makeCard(`Today's weather · ${MoonWeather.describe(moment.weather)}`, null, weatherNotes));
  }

  // Your cycle
  if (moment.cycle) {
    const phase = wisdom.phases[moment.cycle.phase];
    if (phase) {
      todaySections.appendChild(makeCard(
        `Day ${moment.cycle.day} · your ${moment.cycle.phase} days`,
        phase.line,
        phase.invitations
      ));
    }
  }

  // The rhythm of the day, with now softly highlighted
  const nowPart = MoonAyurveda.partOfDay(moment.now);
  const dayCard = makeCard("The rhythm of the day");
  const parts = makeEl("ol", "day-parts");
  for (const part of wisdom.day) {
    const item = makeEl("li", "day-part");
    const head = makeEl("div", "day-part-head");
    const title = makeEl("span", null, part.name);
    head.append(title, makeEl("small", null, `${hourLabel(part.from)}–${hourLabel(part.to)}`));
    item.append(head, makeEl("p", null, part.line));
    if (part === nowPart) {
      item.classList.add("is-now");
      title.appendChild(makeEl("span", "now-mark", "now"));
      item.appendChild(makeList(part.invitations));
    }
    parts.appendChild(item);
  }
  dayCard.appendChild(parts);
  todaySections.appendChild(dayCard);
}
