/*
  Moon Diary — optional weather
  ==============================
  Only runs if you switch weather on in "your rhythms".

  What leaves your phone: your current place's rough location (rounded
  to about 10 km, e.g. 20.2, -87.5), sent to Open-Meteo at most once a
  day per place. Never your entries, name, or anything else.
*/

const MoonWeather = (() => {
  const KEY = "moon.weather";

  function readCache() {
    try { return JSON.parse(localStorage.getItem(KEY)); } catch (e) { return null; }
  }
  function writeCache(value) {
    try { localStorage.setItem(KEY, JSON.stringify(value)); } catch (e) {}
  }

  // Today's weather for a place, or null. Asks the internet at most once
  // a day per place; otherwise uses what it already knows.
  async function today(place, dayKey) {
    if (!place || place.lat == null || place.lon == null) return null;
    const cached = readCache();
    const sameplace = cached && cached.placeId === place.id;
    if (sameplace && cached.dayKey === dayKey) return cached.data;
    if (!navigator.onLine) return null;

    const url = "https://api.open-meteo.com/v1/forecast" +
      `?latitude=${place.lat}&longitude=${place.lon}` +
      "&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m&timezone=auto";
    const response = await fetch(url);
    if (!response.ok) return null;
    const current = (await response.json()).current;
    const data = {
      temp: Math.round(current.temperature_2m),
      humidity: current.relative_humidity_2m,
      code: current.weather_code,
      wind: current.wind_speed_10m,
    };
    writeCache({ placeId: place.id, dayKey, data });
    return data;
  }

  // Weather codes → soft words. (These codes are a world standard.)
  function skyWords(code) {
    if (code === 0) return "clear skies";
    if (code <= 2) return "a few clouds";
    if (code === 3) return "cloudy";
    if (code === 45 || code === 48) return "misty";
    if (code >= 51 && code <= 57) return "drizzle";
    if (code >= 61 && code <= 67) return "rain";
    if ((code >= 71 && code <= 77) || code === 85 || code === 86) return "snow";
    if (code >= 80 && code <= 82) return "showers";
    if (code >= 95) return "storms";
    return "";
  }

  // e.g. "30° · clear skies · humid · a soft breeze"
  function describe(weather) {
    const words = [`${weather.temp}°`, skyWords(weather.code)];
    if (weather.humidity >= 75) words.push("humid");
    else if (weather.humidity <= 35) words.push("dry air");
    if (weather.wind >= 25) words.push("windy");
    else if (weather.wind >= 12) words.push("a soft breeze");
    return words.filter(Boolean).join(" · ");
  }

  function forget() {
    try { localStorage.removeItem(KEY); } catch (e) {}
  }

  return { today, describe, forget };
})();
