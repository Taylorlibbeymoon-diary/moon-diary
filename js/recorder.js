/*
  Moon Diary — recorder
  ======================
  Uses the phone's camera and microphone through MediaRecorder.
  Recordings stay in memory until you choose to keep them.
*/

const MoonRecorder = (() => {
  // Formats to try, best first. iPhones record MP4; Chrome often uses WebM.
  const FORMATS = {
    video: ["video/mp4;codecs=avc1,mp4a", "video/mp4", "video/webm;codecs=vp9,opus", "video/webm"],
    voice: ["audio/mp4", "audio/webm;codecs=opus", "audio/webm"],
  };

  let stream = null;
  let recorder = null;
  let chunks = [];
  let startedAt = 0;
  let wakeLock = null;

  function isSupported() {
    return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia && window.MediaRecorder);
  }

  function pickFormat(mode) {
    return FORMATS[mode].find((type) => MediaRecorder.isTypeSupported(type)) || "";
  }

  // Turns on the camera and/or microphone. Your phone asks permission.
  async function openStream(mode) {
    closeStream();
    const audio = { echoCancellation: true, noiseSuppression: true };
    const video = mode === "video"
      // 720p keeps videos a kinder size on your phone's storage.
      ? { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } }
      : false;
    stream = await navigator.mediaDevices.getUserMedia({ audio, video });
    return stream;
  }

  // Turns the camera and microphone fully off (the green/orange dot goes away).
  function closeStream() {
    if (stream) stream.getTracks().forEach((track) => track.stop());
    stream = null;
  }

  // Keeps the screen from sleeping mid-walk, where the phone allows it.
  async function holdScreenAwake() {
    try {
      if ("wakeLock" in navigator) wakeLock = await navigator.wakeLock.request("screen");
    } catch (e) {}
  }
  function letScreenSleep() {
    if (wakeLock) wakeLock.release().catch(() => {});
    wakeLock = null;
  }

  // Starts recording. `whenDone` receives { blob, durationMs, mode }.
  function start(mode, whenDone) {
    if (!stream) throw new Error("No camera or microphone yet");
    const format = pickFormat(mode);
    const options = { audioBitsPerSecond: 96000 };
    if (format) options.mimeType = format;
    if (mode === "video") options.videoBitsPerSecond = 1500000;

    chunks = [];
    const rec = new MediaRecorder(stream, options);
    rec.ondataavailable = (event) => {
      if (event.data && event.data.size) chunks.push(event.data);
    };
    rec.onstop = () => {
      const type = rec.mimeType || format || (mode === "video" ? "video/mp4" : "audio/mp4");
      const blob = new Blob(chunks, { type });
      const durationMs = Date.now() - startedAt;
      chunks = [];
      recorder = null;
      letScreenSleep();
      whenDone({ blob, durationMs, mode });
    };

    // If the phone cuts the camera off (for example the screen locks),
    // stop cleanly so nothing already recorded is lost.
    stream.getTracks().forEach((track) => track.addEventListener("ended", stop));

    // Save a piece every second, so even a sudden stop keeps what was said.
    rec.start(1000);
    recorder = rec;
    startedAt = Date.now();
    holdScreenAwake();
  }

  function stop() {
    if (recorder && recorder.state !== "inactive") recorder.stop();
  }

  function isRecording() {
    return !!recorder && recorder.state === "recording";
  }

  function elapsedMs() {
    return isRecording() ? Date.now() - startedAt : 0;
  }

  return { isSupported, openStream, closeStream, start, stop, isRecording, elapsedMs };
})();
