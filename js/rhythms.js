/*
  Moon Diary — cycle and season maths
  ====================================
  Worked out entirely on your phone. Nothing is sent anywhere.
*/

const MoonRhythms = (() => {
  const DAY_MS = 24 * 60 * 60 * 1000;

  function clamp(value, low, high) {
    return Math.min(high, Math.max(low, Number(value) || low));
  }

  // "2026-10-20" → a date at local midnight.
  function dayFromKey(key) {
    const [y, m, d] = key.split("-").map(Number);
    return new Date(y, m - 1, d);
  }

  // ── Cycle ───────────────────────────────────────────
  // Ovulation is estimated at about 14 days before your next period.
  // A three-day window around it is "ovulatory".

  function cycleToday(cycle, now = new Date()) {
    if (!cycle || !cycle.lastStart) return null;
    const start = dayFromKey(cycle.lastStart);
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const daysSince = Math.round((today - start) / DAY_MS);
    if (daysSince < 0) return null;

    const length = clamp(cycle.length, 20, 45);
    const periodLength = clamp(cycle.periodLength, 2, 10);
    const day = (daysSince % length) + 1;
    const ovulationDay = length - 14;

    let phase;
    if (day <= periodLength) phase = "menstrual";
    else if (day < ovulationDay - 1) phase = "follicular";
    else if (day <= ovulationDay + 1) phase = "ovulatory";
    else phase = "luteal";

    // If more than a whole cycle has passed since the date you entered,
    // this is a best guess until you note your next period.
    return { day, phase, length, estimated: daysSince >= length };
  }

  // ── Seasons ─────────────────────────────────────────

  function seasonFor(place, now = new Date()) {
    const climates = window.MOON_RHYTHMS.climates;
    const climate = place && climates[place.climate] ? place.climate : "temperate";
    let month = now.getMonth() + 1;
    if (place && place.hemisphere === "south") month = ((month + 5) % 12) + 1;
    const seasons = climates[climate].seasons;
    return Object.keys(seasons).find((name) => seasons[name].includes(month)) || Object.keys(seasons)[0];
  }

  // A first guess from where you are. You can always change it.
  function guessClimate(lat) {
    return Math.abs(lat) < 23.5 ? "tropical" : "temperate";
  }

  return { cycleToday, seasonFor, guessClimate };
})();
