/*
  Moon Diary — talking to Claude
  ===============================
  Only ever runs when you tap "Send to Claude" after seeing exactly what
  will be sent. It sends text only, straight from your phone to Anthropic
  (the makers of Claude), using your own API key. There's no server in
  between.

  Your key is kept only on this phone.
*/

const MoonClaude = (() => {
  const KEY_STORE = "moon.claudeKey";
  const MODEL = "claude-opus-5-5";

  // ── Your key ────────────────────────────────────────────

  function getKey() {
    try { return localStorage.getItem(KEY_STORE) || ""; } catch (e) { return ""; }
  }
  function hasKey() {
    return getKey().startsWith("sk-ant-");
  }
  function saveKey(key) {
    try { localStorage.setItem(KEY_STORE, key.trim()); } catch (e) {}
  }
  function forgetKey() {
    try { localStorage.removeItem(KEY_STORE); } catch (e) {}
  }

  // ── What Claude sends back ──────────────────────────────
  // Asking for this exact shape means the letter always arrives tidy.

  const LETTER_SHAPE = {
    type: "object",
    properties: {
      letter: { type: "string" },
      themes: { type: "array", items: { type: "string" } },
      mood: { type: "string" },
      days: { type: "string" },
    },
    required: ["letter", "themes", "mood", "days"],
    additionalProperties: false,
  };

  // A gentle error with the technical detail kept underneath.
  function gentleError(message, detail) {
    const error = new Error(message);
    error.detail = detail || "";
    return error;
  }

  // ── Writing a letter ────────────────────────────────────

  async function writeLetter(instructions, words) {
    if (!hasKey()) throw gentleError("Add your Claude key in “your rhythms” first.");
    if (!navigator.onLine) throw gentleError("You're offline right now. Your letter can be written whenever you're connected again.");

    // Letters can take a minute or two; give up kindly after three.
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 180000);

    let response;
    try {
      response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        signal: controller.signal,
        headers: {
          "content-type": "application/json",
          "x-api-key": getKey(),
          "anthropic-version": "2026-10-21",
          // Lets a web page talk to Claude directly (no server in between).
          "anthropic-dangerous-direct-browser-access": "true",
          // If Claude's safety checks ever decline by mistake, quietly try
          // the model Anthropic recommends instead.
          "anthropic-beta": "server-side-fallback-2026-07-01",
        },
        body: JSON.stringify({
          model: MODEL,
          max_tokens: 16000,
          system: instructions,
          messages: [{ role: "user", content: words }],
          output_config: {
            effort: "medium",
            format: { type: "json_schema", schema: LETTER_SHAPE },
          },
          fallbacks: "default",
        }),
      });
    } catch (error) {
      if (error.name === "AbortError") throw gentleError("Claude took too long this time. Please try again in a little while.");
      throw gentleError("Moon Diary couldn't reach Claude. Check your connection and try again.", error.message);
    } finally {
      clearTimeout(timer);
    }

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      const detail = data && data.error ? `${response.status} ${data.error.type}: ${data.error.message}` : `${response.status}`;
      if (response.status === 401) throw gentleError("Your Claude key wasn't accepted. It may have expired, or been copied with a missing piece. You can paste it again in “your rhythms”.", detail);
      if (response.status === 403) throw gentleError("Your Claude key isn't allowed to do this. Check its permissions in the Anthropic Console.", detail);
      if (response.status === 429) throw gentleError("Claude is busy just now. Please try again in a few minutes.", detail);
      if (response.status >= 500) throw gentleError("Claude is resting for a moment. Please try again a little later.", detail);
      throw gentleError("Claude couldn't write this letter. The details below may help, for example if your account needs more credit.", detail);
    }

    if (data.stop_reason === "refusal") {
      throw gentleError("Claude wasn't able to write this letter. You can try again, or gently edit a note in the garden.", "stop_reason: refusal");
    }

    const text = (data.content || []).find((block) => block.type === "text");
    try {
      const letter = JSON.parse(text.text);
      return { ...letter, model: data.model };
    } catch (error) {
      throw gentleError("The letter didn't arrive whole. Please try again.", `stop_reason: ${data.stop_reason}`);
    }
  }

  return { hasKey, saveKey, forgetKey, writeLetter, MODEL };
})();
