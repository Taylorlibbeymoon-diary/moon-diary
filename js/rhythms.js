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

  function phaseOfDay(day, length, periodLength) {
    const ovulationDay = length - 14;
    if (day <= periodLength) return "menstrual";
    if (day < ovulationDay - 1) return "follicular";
    if (day <= ovulationDay + 1) return "ovulatory";
    return "luteal";
  }

  // Your cycle day and phase on any date (today, or the day of an old
  // entry). Uses the period start just before that date.
  function cycleOn(cycle, when = new Date()) {
    if (!cycle || !cycle.lastStart) return null;
    const date = new Date(when.getFullYear(), when.getMonth(), when.getDate());
    const length = clamp(cycle.length, 20, 45);
    const periodLength = clamp(cycle.periodLength, 2, 10);

    const starts = [...(cycle.history || []), cycle.lastStart].filter(Boolean).sort();
    const before = starts.filter((key) => dayFromKey(key) <= date).pop();
    // Before any date you've noted, count backwards from the earliest one.
    const start = dayFromKey(before || starts[0]);
    const daysSince = Math.round((date - start) / DAY_MS);
    const day = (((daysSince % length) + length) % length) + 1;

    // A best guess if it's more than a cycle past the start, or before it.
    return { day, phase: phaseOfDay(day, length, periodLength), length, estimated: !before || daysSince >= length };
  }

  // Today's cycle day. Nothing if your last period date is in the future.
  function cycleToday(cycle, now = new Date()) {
    if (!cycle || !cycle.lastStart || dayFromKey(cycle.lastStart) > now) return null;
    return cycleOn(cycle, now);
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

  return { cycleOn, cycleToday, seasonFor, guessClimate };
})();
