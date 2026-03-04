/* options.js */

const DEFAULTS = {
  enabledByDefault: true,
  maxBytes: 2_500_000,
  maxWidth: 1600,
  maxHeight: 1600,
  convertToJpeg: true,
  jpegQuality: 0.85,
  oversizedBehavior: "insert_link"
};

function byId(id) {
  return document.getElementById(id);
}

async function load() {
  const got = await browser.storage.local.get(DEFAULTS);

  byId("enabledByDefault").checked = !!got.enabledByDefault;
  byId("maxBytes").value = got.maxBytes;
  byId("maxWidth").value = got.maxWidth;
  byId("maxHeight").value = got.maxHeight;
  byId("convertToJpeg").checked = !!got.convertToJpeg;
  byId("jpegQuality").value = got.jpegQuality;
  byId("oversizedBehavior").value = got.oversizedBehavior;
}

async function save() {
  const val = {
    enabledByDefault: !!byId("enabledByDefault").checked,
    maxBytes: parseInt(byId("maxBytes").value, 10),
    maxWidth: parseInt(byId("maxWidth").value, 10),
    maxHeight: parseInt(byId("maxHeight").value, 10),
    convertToJpeg: !!byId("convertToJpeg").checked,
    jpegQuality: parseFloat(byId("jpegQuality").value),
    oversizedBehavior: byId("oversizedBehavior").value
  };

  await browser.storage.local.set(val);

  const status = byId("status");
  status.textContent = "Saved";
  setTimeout(() => status.textContent = "", 1200);
}

byId("save").addEventListener("click", () => save().catch(console.error));
load().catch(console.error);