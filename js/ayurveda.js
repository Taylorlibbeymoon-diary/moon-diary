/*
  Moon Diary — choosing ayurvedic invitations
  ============================================
  Reads your words from content/ayurveda.js and picks what suits this
  moment. Worked out on your phone.

  `moment` looks like:
    { now, season, place, phase, doshas, weather }
*/

const MoonAyurveda = (() => {
  const wisdom = () => window.MOON_AYURVEDA;

  // Which part of the day it is (some parts cross midnight, like 10pm–2am).
  function partOfDay(now) {
    const hour = now.getHours();
    return wisdom().day.find((part) =>
      part.from < part.to
        ? hour >= part.from && hour < part.to
        : hour >= part.from || hour < part.to
    ) || wisdom().day[0];
  }

  // "the dry season" for tropical seasons, plain "autumn" for the others.
  function seasonName(season) {
    return ["dry", "hot", "rainy"].includes(season) ? `the ${season} season` : season;
  }

  // A sentence about one of your doshas in this season.
  function doshaInSeason(dosha, season) {
    const info = wisdom().doshas[dosha];
    const seasonInfo = wisdom().seasons[season];
    if (!info) return "";
    if (seasonInfo && seasonInfo.doshas.includes(dosha)) {
      return `${seasonName(season)[0].toUpperCase()}${seasonName(season).slice(1)} shares qualities with your ${dosha} nature, so ${info.soothedBy} are especially kind to you now.`;
    }
    return `Your ${dosha} nature is soothed by ${info.soothedBy}.`;
  }

  function weatherNotes(weather) {
    return MoonWeather.qualities(weather)
      .map((quality) => wisdom().weather[quality])
      .filter(Boolean);
  }

  // Every invitation that suits this moment, each with where it came from.
  function gather(moment) {
    const found = [];
    const add = (texts, why) => (texts || []).forEach((text) => found.push({ text, why }));

    const part = partOfDay(moment.now);
    add(part.invitations, `for ${part.dosha} time`);

    const season = wisdom().seasons[moment.season];
    if (season) add(season.invitations, `for ${seasonName(moment.season)}`);

    for (const dosha of moment.doshas || []) {
      const info = wisdom().doshas[dosha];
      if (info) add(info.invitations, `for your ${dosha} nature`);
    }

    const phase = moment.phase && wisdom().phases[moment.phase];
    if (phase) add(phase.invitations, `for your ${moment.phase} days`);

    add(weatherNotes(moment.weather), "for today's weather");
    return found;
  }

  // One invitation for the home screen. It stays the same through each
  // part of the day, then gently changes.
  function invitationFor(moment, dayKey) {
    const all = gather(moment);
    if (!all.length) return null;
    const part = partOfDay(moment.now);
    return all[hashText(`${dayKey} ${part.from}`) % all.length];
  }

  return { partOfDay, seasonName, doshaInSeason, weatherNotes, invitationFor };
})();
