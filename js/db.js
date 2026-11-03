/*
  Moon Diary — on-phone storage
  ==============================
  Your entries live in IndexedDB, a private storage space inside your
  phone's browser. Nothing here ever goes to the internet.

  There are two "drawers":
  - entries: small notes about each recording (date, kind, length, prompt)
  - media:   the recordings themselves, kept separately so the garden can
             list everything quickly without loading every video
*/

const MoonDB = (() => {
  const DB_NAME = "moon-diary";
  const VERSION = 1;
  let dbPromise;

  // Turns IndexedDB's old-style callbacks into something we can "await".
  function request(req) {
    return new Promise((resolve, reject) => {
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  function finished(tx) {
    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  }

  function open() {
    if (!dbPromise) {
      dbPromise = new Promise((resolve, reject) => {
        const req = indexedDB.open(DB_NAME, VERSION);
        // Runs the very first time (and whenever VERSION goes up).
        req.onupgradeneeded = () => {
          const db = req.result;
          if (!db.objectStoreNames.contains("entries")) {
            const entries = db.createObjectStore("entries", { keyPath: "id" });
            entries.createIndex("createdAt", "createdAt");
          }
          if (!db.objectStoreNames.contains("media")) {
            db.createObjectStore("media", { keyPath: "id" });
          }
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      });
    }
    return dbPromise;
  }

  async function saveEntry(entry, blob) {
    // Read the recording into plain data first. (Stored as plain data
    // rather than a Blob because that works reliably on every iPhone.)
    const data = await blob.arrayBuffer();
    const db = await open();
    const tx = db.transaction(["entries", "media"], "readwrite");
    tx.objectStore("entries").put(entry);
    tx.objectStore("media").put({ id: entry.id, type: blob.type, data });
    await finished(tx);
  }

  // Newest first.
  async function listEntries() {
    const db = await open();
    const all = await request(db.transaction("entries").objectStore("entries").getAll());
    return all.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async function getMedia(id) {
    const db = await open();
    const record = await request(db.transaction("media").objectStore("media").get(id));
    return record ? new Blob([record.data], { type: record.type }) : null;
  }

  // Adds or changes details on an entry (like its check-in),
  // without touching the recording itself.
  async function updateEntry(id, changes) {
    const db = await open();
    const tx = db.transaction("entries", "readwrite");
    const store = tx.objectStore("entries");
    const req = store.get(id);
    req.onsuccess = () => {
      if (req.result) store.put({ ...req.result, ...changes });
    };
    await finished(tx);
  }

  async function deleteEntry(id) {
    const db = await open();
    const tx = db.transaction(["entries", "media"], "readwrite");
    tx.objectStore("entries").delete(id);
    tx.objectStore("media").delete(id);
    await finished(tx);
  }

  // Asks the phone to treat this storage as precious and not tidy it
  // away when space runs low. Quietly does nothing where unsupported.
  async function askToKeepStorage() {
    try {
      if (navigator.storage && navigator.storage.persist) {
        return await navigator.storage.persist();
      }
    } catch (e) {}
    return false;
  }

  return { saveEntry, updateEntry, listEntries, getMedia, deleteEntry, askToKeepStorage };
})();
