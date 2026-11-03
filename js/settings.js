/*
  Moon Diary — settings
  ======================
  Your cycle, doshas, places and weather choice. Kept only on your phone.
*/

const MoonSettings = (() => {
  const KEY = "moon.settings";

  const DEFAULTS = {
    // history: earlier period start dates, so past entries keep the right phase
    cycle: { lastStart: "", length: 28, periodLength: 5, show: true, history: [] },
    doshas: [],
    places: [],          // { id, name, climate, hemisphere, lat, lon }
    currentPlaceId: null,
    weather: { enabled: false },
    ayurveda: { show: true },
  };

  function load() {
    let saved = null;
    try { saved = JSON.parse(localStorage.getItem(KEY)); } catch (e) {}
    saved = saved || {};
    return {
      ...DEFAULTS,
      ...saved,
      cycle: { ...DEFAULTS.cycle, ...(saved.cycle || {}), history: [...((saved.cycle || {}).history || [])] },
      weather: { ...DEFAULTS.weather, ...(saved.weather || {}) },
      ayurveda: { ...DEFAULTS.ayurveda, ...(saved.ayurveda || {}) },
    };
  }

  function save(settings) {
    try { localStorage.setItem(KEY, JSON.stringify(settings)); } catch (e) {}
  }

  // Load, change something, save, all in one go.
  function update(change) {
    const settings = load();
    change(settings);
    save(settings);
    return settings;
  }

  function currentPlace(settings = load()) {
    return settings.places.find((place) => place.id === settings.currentPlaceId) || null;
  }

  return { load, save, update, currentPlace };
})();
