/*
  Moon Diary — zip files
  =======================
  Makes and reads simple .zip files, so your keepsake is one file that
  your phone's Files app can open. Files are stored as they are (not
  squeezed), which suits videos, since they're already compact.

  Written by hand, so there's no extra library. Works on your phone.
*/

const MoonZip = (() => {
  // ── A checksum zip files use to spot damage ─────────────

  const CRC_TABLE = (() => {
    const table = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      table[n] = c >>> 0;
    }
    return table;
  })();

  function crc32(bytes) {
    let crc = 0xffffffff;
    for (let i = 0; i < bytes.length; i++) crc = CRC_TABLE[(crc ^ bytes[i]) & 0xff] ^ (crc >>> 8);
    return (crc ^ 0xffffffff) >>> 0;
  }

  // Dates in zip files use an old-fashioned format.
  function dosDateTime(date) {
    const time = (date.getHours() << 11) | (date.getMinutes() << 5) | Math.floor(date.getSeconds() / 2);
    const day = ((date.getFullYear() - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate();
    return { time, day };
  }

  // ── Making a zip ────────────────────────────────────────
  // `files` is a list of { name, data } where data is text, bytes or a Blob.
  // `onProgress(done, total)` is called as each file is added.

  async function make(files, onProgress = () => {}) {
    const encoder = new TextEncoder();
    const { time, day } = dosDateTime(new Date());
    const parts = [];
    const directory = [];
    let offset = 0;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const name = encoder.encode(file.name);
      let bytes;
      if (typeof file.data === "string") bytes = encoder.encode(file.data);
      else if (file.data instanceof Blob) bytes = new Uint8Array(await file.data.arrayBuffer());
      else bytes = new Uint8Array(file.data);
      const crc = crc32(bytes);

      const local = new DataView(new ArrayBuffer(30));
      local.setUint32(0, 0x04034b50, true);   // "a file starts here"
      local.setUint16(4, 20, true);           // zip version needed
      local.setUint16(6, 0x0800, true);       // names are UTF-8
      local.setUint16(8, 0, true);            // stored, not squeezed
      local.setUint16(10, time, true);
      local.setUint16(12, day, true);
      local.setUint32(14, crc, true);
      local.setUint32(18, bytes.length, true);
      local.setUint32(22, bytes.length, true);
      local.setUint16(26, name.length, true);
      local.setUint16(28, 0, true);
      // Reuse a recording as it is, rather than keeping a second copy in memory.
      parts.push(local.buffer, name, file.data instanceof Blob ? file.data : new Blob([bytes]));

      const central = new DataView(new ArrayBuffer(46));
      central.setUint32(0, 0x02014b50, true); // "directory entry"
      central.setUint16(4, 20, true);
      central.setUint16(6, 20, true);
      central.setUint16(8, 0x0800, true);
      central.setUint16(10, 0, true);
      central.setUint16(12, time, true);
      central.setUint16(14, day, true);
      central.setUint32(16, crc, true);
      central.setUint32(20, bytes.length, true);
      central.setUint32(24, bytes.length, true);
      central.setUint16(28, name.length, true);
      central.setUint32(42, offset, true);    // where this file starts
      directory.push(central.buffer, name);

      offset += 30 + name.length + bytes.length;
      bytes = null;
      onProgress(i + 1, files.length);
    }

    const directorySize = directory.reduce((size, part) => size + part.byteLength, 0);
    const end = new DataView(new ArrayBuffer(22));
    end.setUint32(0, 0x06054b50, true);       // "end of the zip"
    end.setUint16(8, files.length, true);
    end.setUint16(10, files.length, true);
    end.setUint32(12, directorySize, true);
    end.setUint32(16, offset, true);

    return new Blob([...parts, ...directory, end.buffer], { type: "application/zip" });
  }

  // ── Reading a zip ───────────────────────────────────────
  // Returns { name: Blob } without loading big files into memory.

  async function read(zipBlob) {
    const tailSize = Math.min(zipBlob.size, 65557);
    const tail = new DataView(await zipBlob.slice(zipBlob.size - tailSize).arrayBuffer());
    let endAt = -1;
    for (let i = tail.byteLength - 22; i >= 0; i--) {
      if (tail.getUint32(i, true) === 0x06054b50) { endAt = i; break; }
    }
    if (endAt < 0) throw new Error("This doesn't look like a Moon Diary keepsake.");

    const count = tail.getUint16(endAt + 10, true);
    const directorySize = tail.getUint32(endAt + 12, true);
    const directoryStart = tail.getUint32(endAt + 16, true);
    const directory = new DataView(await zipBlob.slice(directoryStart, directoryStart + directorySize).arrayBuffer());
    const decoder = new TextDecoder();
    const files = {};

    let at = 0;
    for (let i = 0; i < count; i++) {
      if (directory.getUint32(at, true) !== 0x02014b50) throw new Error("This keepsake seems to be damaged.");
      const method = directory.getUint16(at + 10, true);
      const size = directory.getUint32(at + 20, true);
      const nameLength = directory.getUint16(at + 28, true);
      const extraLength = directory.getUint16(at + 30, true);
      const commentLength = directory.getUint16(at + 32, true);
      const localStart = directory.getUint32(at + 42, true);
      const name = decoder.decode(new Uint8Array(directory.buffer, at + 46, nameLength));
      at += 46 + nameLength + extraLength + commentLength;
      if (method !== 0) continue;   // only files stored the way Moon Diary stores them

      const local = new DataView(await zipBlob.slice(localStart, localStart + 30).arrayBuffer());
      const dataStart = localStart + 30 + local.getUint16(26, true) + local.getUint16(28, true);
      files[name] = zipBlob.slice(dataStart, dataStart + size);
    }
    return files;
  }

  return { make, read };
})();
