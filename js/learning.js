/*
  Moon Diary — gentle learning (on your phone)
  =============================================
  Both parts are off unless you switch them on in "your rhythms", and
  everything here is worked out on your phone. Nothing is sent anywhere.

  1. Questions that adapt: questions you often pass over come up a little
     less, and ones you answer come up a little more.
  2. Gentle noticings: soft patterns in your check-ins, like a feeling that
     visits more in one cycle phase. Only shared when a pattern has shown
     up at least 3 times and clearly stands out from your usual.
*/

const MoonLearning = (() => {
  const KEY = "moon.promptLearning";

  // ── Questions that adapt ────────────────────────────────

  function known() {
    try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { return {}; }
  }

  function note(text, what) {
    if (!text) return;
    const data = known();
    data[text] = data[text] || { skips: 0, answers: 0 };
    data[text][what] += 1;
    try { localStorage.setItem(KEY, JSON.stringify(data)); } catch (e) {}
  }

  const recordSkip = (text) => note(text, "skips");
  const recordAnswer = (text) => note(text, "answers");

  // 1 means "as usual". Each answer adds a little, each pass-over takes a
  // little away, but a question never disappears completely.
  function promptMultiplier(text, data = known()) {
    const seen = data[text];
    if (!seen) return 1;
    const multiplier = (1 + 0.25 * Math.min(seen.answers, 4)) * Math.pow(0.75, Math.min(seen.skips, 5));
    return Math.max(0.25, multiplier);
  }

  function forget() {
    try { localStorage.removeItem(KEY); } catch (e) {}
  }

  // ── Gentle noticings ────────────────────────────────────

  const MIN_CHECKINS = 6;   // say nothing until there are this many check-ins
  const MIN_TIMES = 3;      // a pattern must show up at least this often
  const MIN_GROUP = 4;      // and in a group of at least this many entries

  function phaseOf(entry, cycle) {
    if (entry.cycle) return entry.cycle.phase;
    const worked = MoonRhythms.cycleOn(cycle, new Date(entry.createdAt));
    return worked ? worked.phase : null;
  }

  function countUp(list) {
    const counts = {};
    list.forEach((item) => { counts[item] = (counts[item] || 0) + 1; });
    return counts;
  }

  function groupBy(entries, keysOf) {
    const groups = {};
    entries.forEach((entry) => {
      [].concat(keysOf(entry) || []).forEach((key) => { (groups[key] = groups[key] || []).push(entry); });
    });
    return groups;
  }

  function noticePatterns(entries, settings) {
    const checkedIn = entries.filter((entry) => entry.checkin);
    if (checkedIn.length < MIN_CHECKINS) return [];

    const moodsOf = (entry) => entry.checkin.mood || [];
    const overall = countUp(checkedIn.flatMap(moodsOf));
    const found = [];

    // Feelings that turn up clearly more often within one group
    // (a phase, a place, an activity) than they do overall.
    function standOut(groups, sentence) {
      for (const [group, list] of Object.entries(groups)) {
        if (list.length < MIN_GROUP) continue;
        for (const [mood, times] of Object.entries(countUp(list.flatMap(moodsOf)))) {
          const share = times / list.length;
          const usual = overall[mood] / checkedIn.length;
          const lift = share / usual;
          if (times >= MIN_TIMES && share >= 0.4 && lift >= 1.4) {
            found.push({ text: sentence(mood, group), strength: lift * times });
          }
        }
      }
    }

    const byPhase = groupBy(checkedIn, (entry) => phaseOf(entry, settings.cycle));
    standOut(byPhase, (mood, phase) => `You often feel ${mood} in your ${phase} phase.`);

    const byPlace = groupBy(checkedIn, (entry) => entry.place);
    if (Object.keys(byPlace).length > 1) {
      standOut(byPlace, (mood, place) => `In ${place}, you often feel ${mood}.`);
    }

    const byActivity = groupBy(checkedIn, (entry) => entry.checkin.did);
    standOut(byActivity, (mood, activity) => `On days with “${activity}”, you often feel ${mood} too.`);

    // Energy that's usually the same in one phase
    for (const [phase, list] of Object.entries(byPhase)) {
      const energies = list.map((entry) => entry.checkin.energy).filter(Boolean);
      if (energies.length < MIN_TIMES) continue;
      const [energy, times] = Object.entries(countUp(energies)).sort((a, b) => b[1] - a[1])[0];
      if (times >= MIN_TIMES && times / energies.length >= 0.6) {
        found.push({ text: `Your energy often feels ${energy} in your ${phase} phase.`, strength: times });
      }
    }

    // Just the three clearest.
    return found.sort((a, b) => b.strength - a.strength).slice(0, 3).map((pattern) => pattern.text);
  }

  return { known, recordSkip, recordAnswer, promptMultiplier, forget, noticePatterns };
})();
