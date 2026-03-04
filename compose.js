/* compose.js */
console.log("Inline Image Paste (compose.js) loaded", location.href);

let mode = "auto";
let settings = null;

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = () => reject(new Error("FileReader failed"));
    r.readAsDataURL(blob);
  });
}

function dataUrlToBlob(dataUrl) {
  const [meta, b64] = dataUrl.split(",", 2);
  const mime = (meta.match(/data:([^;]+)/) || [])[1] || "application/octet-stream";
  const bin = atob(b64);
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return new Blob([arr], { type: mime });
}

function getClipboardImageBlob(e) {
  const cd = e.clipboardData;
  if (!cd || !cd.items) return null;

  for (const item of cd.items) {
    if (!item || !item.type) continue;
    if (item.type.toLowerCase().startsWith("image/")) {
      const file = item.getAsFile();
      if (file && file.size > 0) return file;
    }
  }
  return null;
}

function extractUrlTextFromClipboard(e) {
  const cd = e.clipboardData;
  if (!cd) return null;

  const text = (cd.getData("text/plain") || "").trim();
  if (/^https?:\/\/\S+$/i.test(text)) return text;

  const html = cd.getData("text/html");
  if (html) {
    try {
      const doc = new DOMParser().parseFromString(html, "text/html");
      const img = doc.querySelector("img[src]");
      const src = img && img.getAttribute("src");
      if (src && /^https?:\/\//i.test(src)) return src;
    } catch {}
  }

  return null;
}

async function insertImageDataUrlAtCaret(dataUrl) {
  const ok = document.execCommand("insertImage", false, dataUrl);
  if (ok) return;
  document.execCommand("insertHTML", false, `<img src="${dataUrl}">`);
}

function canvasHasAlpha(ctx, w, h) {
  const step = Math.max(1, Math.floor(Math.min(w, h) / 50));
  const data = ctx.getImageData(0, 0, w, h).data;

  for (let y = 0; y < h; y += step) {
    for (let x = 0; x < w; x += step) {
      const i = (y * w + x) * 4 + 3;
      if (data[i] < 255) return true;
    }
  }
  return false;
}

async function resizeAndConvert(blob) {
  const objectUrl = URL.createObjectURL(blob);

  try {
    const img = await new Promise((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error("Failed to load image"));
      el.src = objectUrl;
    });

    let w = img.naturalWidth || img.width;
    let h = img.naturalHeight || img.height;
    if (!w || !h) throw new Error("Invalid image dimensions");

    const maxW = settings.maxWidth;
    const maxH = settings.maxHeight;

    const scale = Math.min(1, maxW / w, maxH / h);
    const outW = Math.round(w * scale);
    const outH = Math.round(h * scale);

    const canvas = document.createElement("canvas");
    canvas.width = outW;
    canvas.height = outH;

    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, outW, outH);
    ctx.drawImage(img, 0, 0, outW, outH);

    const hasAlpha = canvasHasAlpha(ctx, outW, outH);

    let outType = "image/png";
    if (mode === "png") {
      outType = "image/png";
    } else if (mode === "jpeg") {
      outType = "image/jpeg";
    } else if (mode === "auto") {
      outType = hasAlpha ? "image/png" : "image/jpeg";
    } else {
      // off handled earlier, but keep safe default
      outType = "image/png";
    }

    if (outType === "image/jpeg") {
      const tmp = document.createElement("canvas");
      tmp.width = outW;
      tmp.height = outH;

      const tctx = tmp.getContext("2d");
      tctx.fillStyle = "#ffffff";
      tctx.fillRect(0, 0, outW, outH);
      tctx.drawImage(canvas, 0, 0);

      const quality = clamp(settings.jpegQuality ?? 0.85, 0.1, 0.95);
      const dataUrl = tmp.toDataURL("image/jpeg", quality);
      return dataUrlToBlob(dataUrl);
    }

    const dataUrl = canvas.toDataURL("image/png");
    return dataUrlToBlob(dataUrl);
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

async function init() {
  const resp = await browser.runtime.sendMessage({ type: "INLINE_PASTE_GET_STATE" });
  mode = resp.mode || "auto";
  settings = resp.settings;

  browser.runtime.onMessage.addListener((msg) => {
    if (msg && msg.type === "INLINE_PASTE_SET_MODE") {
      mode = msg.mode || "auto";
    }
  });
}

document.addEventListener("paste", async (e) => {
  try {
    if (!settings) return;
    if (mode === "off") return;

    const imgBlob = getClipboardImageBlob(e);
    if (!imgBlob) return;

    e.preventDefault();

    if (imgBlob.size > settings.maxBytes) {
      const url = extractUrlTextFromClipboard(e);
      if (settings.oversizedBehavior === "insert_link" && url) {
        document.execCommand("insertText", false, url);
      }
      return;
    }

    const processed = await resizeAndConvert(imgBlob);

    if (processed.size > settings.maxBytes) {
      const url = extractUrlTextFromClipboard(e);
      if (settings.oversizedBehavior === "insert_link" && url) {
        document.execCommand("insertText", false, url);
      }
      return;
    }

    const dataUrl = await blobToDataUrl(processed);
    await insertImageDataUrlAtCaret(dataUrl);
  } catch (err) {
    console.error("Inline paste error:", err);
  }
}, true);

init().catch((e) => console.error("Init failed:", e));