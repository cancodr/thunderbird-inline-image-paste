/* background.js */

//console.log("background.js loaded");

let reg = null;

async function ensureComposeScriptRegistered() {
  if (reg) return;

  reg = await browser.composeScripts.register({
    js: [{ file: "compose.js" }]
  });

  console.log("compose script registered");
}

ensureComposeScriptRegistered().catch(console.error);

const DEFAULTS = {
  // Default mode for new compose windows:
  // "off" | "auto" | "png" | "jpeg"
  modeByDefault: "auto",

  // If clipboard image is bigger than this, we do not inline it.
  maxBytes: 2_500_000,

  // Resize constraints
  maxWidth: 1600,
  maxHeight: 1600,

  // JPEG quality (used when mode is "jpeg", or when auto selects jpeg)
  jpegQuality: 0.85,

  // What to do if image is too large:
  // "insert_link" | "do_nothing"
  oversizedBehavior: "insert_link"
};

async function getSettings() {
  const got = await browser.storage.local.get(DEFAULTS);
  return { ...DEFAULTS, ...got };
}

// Per compose tab mode state.
// Key: tabId, Value: "off" | "auto" | "png" | "jpeg"
const tabMode = new Map();

function modeLabel(mode) {
  if (mode === "off") return "OFF";
  if (mode === "png") return "PNG";
  if (mode === "jpeg") return "JPG";
  return "Auto";
}

async function refreshComposeAction(tabId) {
  const settings = await getSettings();
  const mode = tabMode.has(tabId) ? tabMode.get(tabId) : settings.modeByDefault;

  await browser.composeAction.setTitle({
    tabId,
    title: `Inline Paste, ${modeLabel(mode)}`
  });
}

// Initialize per-tab title once a compose tab exists.
// There is no perfect "on compose created" event in all cases,
// so we lazily update whenever the content asks for state.
async function ensureTabInitialized(tabId) {
  const settings = await getSettings();
  if (!tabMode.has(tabId)) {
    tabMode.set(tabId, settings.modeByDefault);
  }
  await refreshComposeAction(tabId);
}

browser.runtime.onMessage.addListener((msg, sender) => {
  if (!msg || !msg.type) return;

  if (msg.type === "INLINE_PASTE_GET_STATE") {
    return (async () => {
      const settings = await getSettings();
      const tabId = (msg.tabId != null) ? msg.tabId : (sender.tab && sender.tab.id);

      if (tabId != null) {
        await ensureTabInitialized(tabId);
      }

      const mode = tabId != null
        ? (tabMode.has(tabId) ? tabMode.get(tabId) : settings.modeByDefault)
        : settings.modeByDefault;

      return { mode, settings };
    })();
  }

  if (msg.type === "INLINE_PASTE_SET_MODE") {
    return (async () => {
      const settings = await getSettings();
      const tabId = msg.tabId != null ? msg.tabId : (sender.tab && sender.tab.id);
      if (tabId == null) return;

      const mode = msg.mode || "auto";
      tabMode.set(tabId, mode);
      await refreshComposeAction(tabId);

      browser.tabs.sendMessage(tabId, {
        type: "INLINE_PASTE_SET_MODE",
        mode
      }).catch(() => {});

      return { ok: true };
    })();
  }
});